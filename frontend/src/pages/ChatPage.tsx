import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { api } from '@/convex/api';
import { errorMessage } from '@/convex/client';
import { useAuth } from '@/context/AuthContext';
import PatientPicker from '@/components/PatientPicker';
import Markdown from '@/components/ui/Markdown';
import { CheckIcon, FileIcon, PaperclipIcon, PlusCircleIcon, SendIcon, SparklesIcon, StopIcon, TrashIcon, XIcon } from '@/components/ui/Icons';
import { useAssistantStatus } from '@/hooks/useAssistantStatus';
import { ACCEPTED_FILES } from '@/lib/extractText';
import { AssistantError, streamChat, transcribeDocument, type ChatTurn } from '@/services/assistant';
import { uploadDocument } from '@/services/documents';
import styles from './ChatPage.module.css';

interface ToolActivity {
  id: string;
  summary: string;
  state: 'running' | 'ok' | 'error';
}

interface UiMessage {
  key: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: { documentId: Id<'documents'>; name: string }[];
  tools?: ToolActivity[];
  error?: string;
  streaming?: boolean;
}

interface PendingFile {
  key: string;
  name: string;
  stage: string;
  documentId?: Id<'documents'>;
  needsTranscription?: boolean;
  error?: string;
}

const SUGGESTIONS = [
  "Summarise today's clinic and flag who needs extra preparation",
  'Prepare a pre-visit brief for my next appointment',
  'Which patients have an HbA1c above target, and what are they on?',
  'Screen Michael Davis\'s current medications for interactions',
  'Differential for fever, cough and shortness of breath in a 67-year-old man',
  'Which patients have abnormal kidney function, and do any of their medicines need adjusting?',
];

let counter = 0;
const key = () => `m${++counter}`;

export default function ChatPage() {
  const { token } = useAuth();
  const status = useAssistantStatus();
  const [params, setParams] = useSearchParams();
  const threadId = params.get('thread') as Id<'chatThreads'> | null;
  const threads = useQuery(api.functions.chat.listThreads, {});
  const thread = useQuery(api.functions.chat.getThread, threadId ? { id: threadId } : 'skip');
  const documents = useQuery(api.functions.documents.list, {});
  const createThread = useMutation(api.functions.chat.createThread);
  const addMessage = useMutation(api.functions.chat.addMessage);
  const deleteThread = useMutation(api.functions.chat.deleteThread);

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [focus, setFocus] = useState<Doc<'patients'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const loadedThread = useRef<string | null>(null);

  // Focus patient from ?patient= (e.g. "Ask the assistant" on a patient page)
  const patientParam = params.get('patient');
  const patientRecord = useQuery(api.functions.patients.getPatientRecord, patientParam && !focus ? { patient: patientParam } : 'skip');
  useEffect(() => {
    if (patientRecord?.patient) setFocus(patientRecord.patient as Doc<'patients'>);
  }, [patientRecord]);

  // Load a saved conversation once when it is selected (local state then follows the stream)
  useEffect(() => {
    if (!threadId) {
      if (loadedThread.current !== null) setMessages([]);
      loadedThread.current = null;
      return;
    }
    if (!thread || loadedThread.current === threadId || busy) return;
    loadedThread.current = threadId;
    setMessages(
      thread.messages.map((m) => ({
        key: m._id,
        role: m.role,
        content: m.content,
        attachments: m.attachments,
        tools: m.toolCalls?.map((t, i) => ({ id: `${m._id}-${i}`, summary: t.summary, state: 'ok' as const })),
      })),
    );
  }, [thread, threadId, busy]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const llmReady = Boolean(status?.llmConfigured && token);

  const attach = async (list: FileList | File[] | null) => {
    if (!list) return;
    for (const file of Array.from(list).slice(0, 5)) {
      const k = key();
      setFiles((prev) => [...prev, { key: k, name: file.name, stage: 'reading' }]);
      try {
        const doc = await uploadDocument({
          file,
          patientId: focus?._id,
          token,
          llmConfigured: llmReady,
          waitForTranscription: false,
          onStage: (stage) => setFiles((prev) => prev.map((f) => (f.key === k ? { ...f, stage } : f))),
        });
        setFiles((prev) =>
          prev.map((f) => (f.key === k ? { ...f, stage: 'ready', documentId: doc.id, needsTranscription: doc.status === 'needs-transcription' } : f)),
        );
      } catch (err) {
        setFiles((prev) => prev.map((f) => (f.key === k ? { ...f, stage: 'failed', error: err instanceof Error ? err.message : 'Upload failed' } : f)));
      }
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy || !token) return;
    if (files.some((f) => f.stage !== 'ready' && f.stage !== 'failed')) {
      setNotice('Wait for the attachments to finish uploading.');
      return;
    }
    setNotice('');
    const ready = files.filter((f) => f.documentId);
    const attachments = ready.map((f) => ({ documentId: f.documentId!, name: f.name }));
    const history: ChatTurn[] = messages.filter((m) => m.content && !m.error).map((m) => ({ role: m.role, content: m.content }));
    const userMsg: UiMessage = { key: key(), role: 'user', content: question, attachments };
    const assistantKey = key();
    setMessages((prev) => [...prev, userMsg, { key: assistantKey, role: 'assistant', content: '', tools: [], streaming: true }]);
    setInput('');
    setFiles([]);
    setBusy(true);

    const update = (fn: (m: UiMessage) => UiMessage) =>
      setMessages((prev) => prev.map((m) => (m.key === assistantKey ? fn(m) : m)));

    let activeThread = threadId;
    try {
      if (!activeThread) {
        activeThread = await createThread({ title: question.slice(0, 70), patientId: focus?._id });
        loadedThread.current = activeThread;
        setParams((p) => {
          const next = new URLSearchParams(p);
          next.set('thread', activeThread!);
          return next;
        });
      }
      await addMessage({ threadId: activeThread, role: 'user', content: question, attachments: attachments.length ? attachments : undefined });
    } catch (err) {
      update((m) => ({ ...m, streaming: false, error: `Could not save the conversation: ${errorMessage(err)}` }));
      setBusy(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    let answer = '';
    const tools: ToolActivity[] = [];
    try {
      await streamChat({
        token,
        messages: [...history, { role: 'user', content: question }],
        attachments: attachments.map((a) => a.documentId),
        patientId: focus?._id,
        signal: controller.signal,
        onEvent: (e) => {
          if (e.type === 'text') {
            answer += e.text;
            update((m) => ({ ...m, content: answer }));
          } else if (e.type === 'tool') {
            tools.push({ id: e.id, summary: e.summary, state: 'running' });
            update((m) => ({ ...m, tools: [...tools] }));
          } else if (e.type === 'tool_result') {
            const t = tools.find((x) => x.id === e.id);
            if (t) {
              t.state = e.ok ? 'ok' : 'error';
              t.summary = e.summary || t.summary;
            }
            update((m) => ({ ...m, tools: [...tools] }));
          } else if (e.type === 'error') {
            update((m) => ({ ...m, error: e.message }));
          }
        },
      });
    } catch (err) {
      const message = controller.signal.aborted
        ? 'Stopped.'
        : err instanceof AssistantError
          ? err.message
          : 'The assistant could not be reached. Check your connection and try again.';
      update((m) => ({ ...m, error: message }));
    } finally {
      update((m) => ({ ...m, streaming: false }));
      setBusy(false);
      abortRef.current = null;
    }

    if (answer.trim()) {
      await addMessage({
        threadId: activeThread,
        role: 'assistant',
        content: answer,
        toolCalls: tools.length ? tools.map((t) => ({ name: 'tool', summary: t.summary })) : undefined,
      }).catch(() => undefined);
    }
    // Make image / scanned uploads searchable for later questions
    for (const f of ready) if (f.needsTranscription && llmReady) void transcribeDocument(token, f.documentId!).catch(() => undefined);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (llmReady) void attach(e.dataTransfer.files);
  };

  const newConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    loadedThread.current = null;
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.delete('thread');
      return next;
    });
  };

  const openThread = (id: Id<'chatThreads'>) => {
    if (busy) return;
    loadedThread.current = null;
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set('thread', id);
      return next;
    });
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <button className="ui-btn ui-btn-primary" style={{ width: '100%' }} onClick={newConversation}>
          <PlusCircleIcon size={15} /> New conversation
        </button>
        <div className={styles.sideSection}>
          <h3 className={styles.sideTitle}>Conversations</h3>
          {threads === undefined ? (
            <p className="ui-muted">Loading…</p>
          ) : threads.length === 0 ? (
            <p className="ui-muted" style={{ fontSize: '0.78rem' }}>No saved conversations yet.</p>
          ) : (
            <ul className={styles.threadList}>
              {threads.map((t) => (
                <li key={t._id} className={t._id === threadId ? styles.threadActive : undefined}>
                  <button className={styles.threadBtn} onClick={() => openThread(t._id)} title={t.title}>{t.title}</button>
                  <button
                    className={styles.threadDelete}
                    aria-label={`Delete ${t.title}`}
                    onClick={() => {
                      if (!confirm('Delete this conversation?')) return;
                      void deleteThread({ id: t._id });
                      if (t._id === threadId) newConversation();
                    }}
                  >
                    <TrashIcon size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.sideSection}>
          <h3 className={styles.sideTitle}>Knowledge base</h3>
          <p className="ui-muted" style={{ fontSize: '0.75rem', marginBottom: 6 }}>
            The assistant searches every patient record, consultation and uploaded document.
          </p>
          {documents && documents.length > 0 && (
            <ul className={styles.docList}>
              {documents.slice(0, 12).map((d) => (
                <li key={d._id} title={d.patientName ? `Linked to ${d.patientName}` : undefined}>
                  <FileIcon size={12} /> <span>{d.name}</span>
                  <span className={d.status === 'ready' ? styles.dotOk : styles.dotWait} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className={styles.main} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
        <header className={styles.header}>
          <div>
            <h1 className="ui-title" style={{ fontSize: '1.25rem' }}>AI Clinical Assistant</h1>
            <p className="ui-subtitle" style={{ marginTop: 0 }}>
              {status === null ? 'Checking…' : status.llmConfigured ? `Connected · ${status.model}` : 'Not configured'}
              {' · '}reads your patient database, schedule and uploads; runs the prediction model
            </p>
          </div>
          <div className={styles.focus}>
            <label className="ui-label" htmlFor="focus-patient">Focus patient</label>
            <PatientPicker id="focus-patient" value={focus?._id ?? null} onChange={setFocus} placeholder="Any patient" />
          </div>
        </header>

        {status && !status.llmConfigured && (
          <div className="ui-alert ui-alert-warning" style={{ margin: '0 1.25rem 0.75rem' }}>
            <span>
              {status.unreachable ? (
                <>The assistant API is not reachable. Locally, run <code>npm run dev:api</code> next to <code>npm run dev</code>.</>
              ) : (
                <>
                  <strong>Add your API key to activate the assistant:</strong> in Vercel open Project &rarr; Settings &rarr; Environment Variables, add{' '}
                  <code>ANTHROPIC_API_KEY</code> (Production and Preview), then redeploy. Locally, put it in the repository's <code>.env</code> file and restart{' '}
                  <code>npm run dev:api</code>.
                </>
              )}
            </span>
          </div>
        )}

        <div className={`${styles.messages} ${dragging ? styles.dragging : ''}`}>
          {messages.length === 0 && (
            <div className={styles.empty}>
              <SparklesIcon size={30} />
              <p className={styles.emptyTitle}>How can I help with your patients today?</p>
              <p className="ui-muted">Ask about anyone on your panel, your schedule, results, medicines or a differential. Attach lab reports, letters or images to discuss them.</p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className={styles.suggestion} onClick={() => void send(s)} disabled={!llmReady || busy}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.key} className={`${styles.message} ${m.role === 'user' ? styles.user : styles.assistant}`}>
              <div className={styles.bubble}>
                {m.attachments && m.attachments.length > 0 && (
                  <div className={styles.attachments}>
                    {m.attachments.map((a) => <span key={a.documentId} className={styles.attachment}><FileIcon size={12} /> {a.name}</span>)}
                  </div>
                )}
                {m.tools && m.tools.length > 0 && (
                  <ul className={styles.tools}>
                    {m.tools.map((t) => (
                      <li key={t.id} className={t.state === 'error' ? styles.toolError : undefined}>
                        {t.state === 'running' ? <span className="ui-spin" style={{ width: 10, height: 10 }} /> : t.state === 'ok' ? <CheckIcon size={12} /> : <XIcon size={12} />}
                        {t.summary}
                      </li>
                    ))}
                  </ul>
                )}
                {m.role === 'assistant' ? (
                  m.content ? <Markdown>{m.content}</Markdown> : m.streaming && !m.error && <div className={styles.typing}><span /><span /><span /></div>
                ) : (
                  <p className={styles.userText}>{m.content}</p>
                )}
                {m.error && <div className="ui-alert ui-alert-error" style={{ marginTop: m.content ? 8 : 0 }}>{m.error}</div>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className={styles.composer}>
          {files.length > 0 && (
            <div className={styles.pending}>
              {files.map((f) => (
                <span key={f.key} className={`${styles.pendingFile} ${f.error ? styles.pendingError : ''}`} title={f.error}>
                  {f.stage === 'ready' ? <CheckIcon size={12} /> : f.error ? <XIcon size={12} /> : <span className="ui-spin" style={{ width: 10, height: 10 }} />}
                  {f.name}
                  <span className="ui-muted">{f.error ? 'failed' : f.stage === 'ready' ? (f.needsTranscription ? 'image / scan' : 'indexed') : `${f.stage}…`}</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((x) => x.key !== f.key))} aria-label={`Remove ${f.name}`}><XIcon size={11} /></button>
                </span>
              ))}
            </div>
          )}
          {notice && <p className="ui-muted" style={{ fontSize: '0.78rem', marginBottom: 6 }}>{notice}</p>}
          <div className={styles.inputRow}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => fileInput.current?.click()}
              disabled={!llmReady}
              title="Attach PDF, Word, text or image files (or drop them here)"
              aria-label="Attach files"
            >
              <PaperclipIcon size={18} />
            </button>
            <input ref={fileInput} type="file" multiple hidden accept={ACCEPTED_FILES} onChange={(e) => void attach(e.target.files)} />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={llmReady ? (focus ? `Ask about ${focus.name}…` : 'Ask about a patient, your schedule, results or medicines…') : 'The assistant is not configured yet'}
              className={styles.input}
              rows={1}
              disabled={!llmReady}
            />
            {busy ? (
              <button type="button" className={styles.sendBtn} onClick={() => abortRef.current?.abort()} aria-label="Stop"><StopIcon size={16} /></button>
            ) : (
              <button type="submit" disabled={!input.trim() || !llmReady} className={styles.sendBtn} aria-label="Send"><SendIcon size={16} /></button>
            )}
          </div>
          <p className={styles.disclaimer}>AI-generated decision support. It can be wrong - verify against the record before acting.</p>
        </form>
      </section>
    </div>
  );
}
