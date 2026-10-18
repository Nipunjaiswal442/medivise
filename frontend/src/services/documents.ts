/** Upload pipeline: extract text in the browser, store the original in Convex, index the text. */
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '@/convex/api';
import { convex } from '@/convex/client';
import { extractText } from '@/lib/extractText';
import { transcribeDocument } from './assistant';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export interface UploadedDocument {
  id: Id<'documents'>;
  name: string;
  status: 'ready' | 'needs-transcription' | 'failed';
  truncated: boolean;
  note?: string;
}

export async function uploadDocument(args: {
  file: File;
  patientId?: Id<'patients'>;
  token: string | null;
  llmConfigured: boolean;
  /**
   * Transcribe images / scanned PDFs before returning (default). The chat passes false: the
   * assistant reads such files inline for that question, and transcription runs afterwards.
   */
  waitForTranscription?: boolean;
  onStage?: (stage: 'reading' | 'uploading' | 'indexing' | 'transcribing') => void;
}): Promise<UploadedDocument> {
  const { file } = args;
  if (!convex) throw new Error('Backend not configured');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is larger than 20 MB`);

  args.onStage?.('reading');
  const text = await extractText(file).catch(() => '');

  args.onStage?.('uploading');
  const uploadUrl = await convex.mutation(api.functions.documents.generateUploadUrl, {});
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) throw new Error(`Uploading ${file.name} failed`);
  const { storageId } = (await res.json()) as { storageId: Id<'_storage'> };

  args.onStage?.('indexing');
  const created = await convex.mutation(api.functions.documents.create, {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    storageId,
    text: text || undefined,
    patientId: args.patientId,
  });

  let status = created.status as UploadedDocument['status'];
  let note: string | undefined;
  if (status === 'needs-transcription') {
    if (args.waitForTranscription === false) {
      note = 'No text layer - the assistant will read the file directly.';
    } else if (args.llmConfigured && args.token) {
      args.onStage?.('transcribing');
      try {
        await transcribeDocument(args.token, created.id);
        status = 'ready';
      } catch (err) {
        note = err instanceof Error ? err.message : 'Transcription failed';
      }
    } else {
      note = 'No text found. It will be readable by the assistant once ANTHROPIC_API_KEY is configured.';
    }
  }
  return { id: created.id, name: file.name, status, truncated: created.truncated, note };
}
