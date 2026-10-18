/**
 * Extracts text from an uploaded file in the browser, so documents are searchable without
 * sending them anywhere first. PDF (pdf.js) and DOCX (mammoth) libraries load only when needed.
 * Returns '' for files with no extractable text (images, scanned PDFs) - those are transcribed
 * by the assistant (/api/ingest) when it is configured.
 */
const TEXT_TYPES = /^(text\/|application\/(json|xml|csv|x-ndjson))/;
const TEXT_EXTENSIONS = /\.(txt|md|csv|tsv|json|xml|html?|log|rtf)$/i;

export const ACCEPTED_FILES =
  '.pdf,.docx,.txt,.md,.csv,.tsv,.json,.xml,.html,.png,.jpg,.jpeg,.gif,.webp,application/pdf,image/*,text/*';

export async function extractText(file: File): Promise<string> {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return extractPdf(file);
  if (/\.docx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value.trim();
  }
  if (TEXT_TYPES.test(file.type) || TEXT_EXTENSIONS.test(file.name)) {
    const text = await file.text();
    return /\.html?$/i.test(file.name) ? new DOMParser().parseFromString(text, 'text/html').body.innerText.trim() : text.trim();
  }
  return '';
}

async function extractPdf(file: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdf = await task.promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
      .join('')
      .replace(/[ \t]+/g, ' ')
      .trim();
    if (text) pages.push(`[Page ${i}]\n${text}`);
  }
  const numPages = pdf.numPages;
  await task.destroy();
  // Scanned PDFs have no text layer (at most a few stray characters per page)
  const visible = pages.join('').replace(/\[Page \d+\]/g, '').replace(/\s/g, '').length;
  return visible < 10 * numPages ? '' : pages.join('\n\n');
}
