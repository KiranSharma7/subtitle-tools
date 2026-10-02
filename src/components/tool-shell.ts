import type { ParseResult } from '../engine/formats.ts';
import type { Format } from '../engine/types.ts';
import { track } from './analytics.ts';

const formatNames: Record<Format, string> = { srt: 'SRT', vtt: 'VTT', ass: 'ASS', ssa: 'SSA', sami: 'SAMI', microdvd: 'MicroDVD', mpl2: 'MPL2', txt: 'TXT' };

export type Row = { cells: string[]; flag?: boolean };
export type ViewOptions = { previewLimit?: number };

export type Tool = {
  // Tool-specific warnings (parser problems are added by the shell) and preview rows.
  // summary replaces the "name: N cues, SRT." line. result is the bold line next to Download.
  view: (parsed: ParseResult, options?: ViewOptions) => { warnings: string[]; rows: Row[]; summary?: string; result?: string; total?: number };
  output: (parsed: ParseResult) => string;
  filename?: (name: string) => string; // download name; defaults to the uploaded name
  parse?: (text: string) => ParseResult; // for tools that take any text, not only subtitles
};

const PREVIEW_LIMIT = 200;
const LARGE_FILE_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Wires up the markup from ToolShell.astro. Call the returned render() when the tool's own controls change.
export function mountTool(tool: Tool): () => void {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const fileInput = $<HTMLInputElement>('file');
  const drop = $('drop');
  const error = $('error');
  const processing = $('processing');
  const processingPhase = $('processing-phase');
  const processingDetail = $('processing-detail');
  const progress = $<HTMLProgressElement>('progress');
  const cancel = $<HTMLButtonElement>('cancel');
  const loaded = $('loaded');
  const largeWarning = $('large-warning');
  const replace = $<HTMLButtonElement>('replace');
  const encoding = $<HTMLSelectElement>('encoding');
  const warnings = $('warnings');
  const rows = $('rows');
  const previewNote = $('preview-note');
  // Mobile shows these next to each value, since the header row is hidden there.
  // The first column and a Text column need no label; neither do two-column lists.
  const headers = [...document.querySelectorAll('.preview th')].map((th) => th.textContent ?? '');
  const labels = headers.map((h, i) => (i === 0 || h === 'Text' || headers.length < 3 ? '' : h));

  const fps = $<HTMLSelectElement>('fps');

  let sourceFile: File | null = null;
  let name = '';
  let text = '';
  let parsed: ParseResult | null = null;
  let worker: Worker | null = null;
  let request = 0;

  // The drop box only shows while there's no file. After that, Replace file and dropping on the panel take over.
  function setProcessing(active: boolean) {
    processing.hidden = !active;
    drop.setAttribute('aria-busy', String(active));
    if (active) loaded.hidden = true;
    drop.hidden = active;
  }

  function fail(message: string, token: number) {
    if (token !== request) return;
    worker?.terminate();
    worker = null;
    setProcessing(false);
    loaded.hidden = true;
    error.textContent = message;
    error.hidden = false;
  }

  function finish(t: string, enc: string, result: ParseResult | undefined, token: number) {
    if (token !== request) return;
    try {
      text = t;
      encoding.value = enc;
      parsed = tool.parse ? tool.parse(text) : result ?? null;
      if (!parsed) throw new Error('The file could not be parsed.');
      error.hidden = true;
      setProcessing(false);
      loaded.hidden = false;
      drop.hidden = true;
      render();
      if (parsed) track('file_loaded', { tool: location.pathname.slice(1), input_format: parsed.file.format });
    } catch (e) {
      fail((e as Error).message, token);
    }
  }

  function open(file: File, requestedEncoding?: string) {
    request += 1;
    const token = request;
    worker?.terminate();
    sourceFile = file;
    name = file.name;
    parsed = null;
    text = '';
    error.hidden = true;
    setProcessing(true);
    processingPhase.textContent = 'Reading file…';
    processingDetail.textContent = `${name} · ${formatBytes(file.size)}. Your file stays in this browser.`;
    progress.value = 0;

    try {
      worker = new Worker(new URL('./file-worker.ts', import.meta.url), { type: 'module' });
    } catch {
      fail('This browser could not start the file processor.', token);
      return;
    }

    worker.onmessage = (event: MessageEvent<{ type: string; phase?: string; progress?: number; text?: string; encoding?: string; parsed?: ParseResult; message?: string }>) => {
      if (token !== request) return;
      const message = event.data;
      if (message.type === 'progress') {
        progress.value = message.progress ?? 0;
        processingPhase.textContent = message.phase === 'reading' ? 'Reading file…' : message.phase === 'decoding' ? 'Decoding text…' : 'Parsing cues…';
        return;
      }
      if (message.type === 'error') {
        fail(message.message ?? 'The file could not be processed.', token);
        return;
      }
      if (message.type === 'result' && message.encoding && (message.text != null || message.parsed)) {
        finish(message.text ?? '', message.encoding, message.parsed, token);
        worker?.terminate();
        worker = null;
      }
    };
    worker.onerror = () => fail('The file could not be processed. Try a smaller file or another encoding.', token);
    worker.postMessage({ file, encoding: requestedEncoding, parseSubtitle: !tool.parse, fps: +fps.value });
  }

  function render() {
    if (!parsed) return;
    try {
      const { file, problems } = parsed;
      const view = tool.view(parsed, { previewLimit: PREVIEW_LIMIT });
      const fromFile = file.format === 'microdvd' && file.header ? `, ${file.fps} fps from the file` : '';
      $('fps-picker').hidden = file.format !== 'microdvd' || !!file.header;
      $('summary').textContent = view.summary ?? `${name}: ${file.cues.length} cues, ${formatNames[file.format]}${fromFile}.`;
      largeWarning.textContent = sourceFile && sourceFile.size >= LARGE_FILE_BYTES
        ? `This is a large file (${formatBytes(sourceFile.size)}). Processing may use extra memory.`
        : '';
      largeWarning.hidden = !sourceFile || sourceFile.size < LARGE_FILE_BYTES;

      $('result').textContent = view.result ?? 'Ready to download.';

      const notes = [...problems, ...view.warnings];
      warnings.replaceChildren(...notes.map((n) => Object.assign(document.createElement('p'), { textContent: n })));
      warnings.hidden = !notes.length;

      const visibleRows = view.rows.slice(0, PREVIEW_LIMIT);
      rows.replaceChildren(
        ...visibleRows.map((r) => {
          const tr = document.createElement('tr');
          r.cells.forEach((v, i) => {
            const td = Object.assign(document.createElement('td'), { textContent: v });
            if (labels[i]) td.dataset.label = labels[i];
            tr.append(td);
          });
          if (r.flag) tr.className = 'flag';
          return tr;
        }),
      );
      const totalRows = view.total ?? view.rows.length;
      const truncated = view.total !== undefined ? totalRows > PREVIEW_LIMIT : view.rows.length >= PREVIEW_LIMIT;
      previewNote.hidden = !truncated;
      previewNote.textContent = view.total !== undefined
        ? `Showing the first ${PREVIEW_LIMIT} of ${totalRows.toLocaleString()} rows. The download includes the whole file.`
        : `Showing the first ${PREVIEW_LIMIT} rows. The download includes the whole file.`;
    } catch (e) {
      fail((e as Error).message, request);
    }
  }

  fileInput.addEventListener('change', () => fileInput.files?.[0] && open(fileInput.files[0]));
  replace.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });
  cancel.addEventListener('click', () => {
    request += 1;
    worker?.terminate();
    worker = null;
    sourceFile = null;
    parsed = null;
    setProcessing(false);
    loaded.hidden = true;
    error.textContent = 'Processing cancelled.';
    error.hidden = false;
  });
  const panel = drop.closest('.tool') as HTMLElement;
  panel.addEventListener('dragover', (e) => (e.preventDefault(), panel.classList.add('over')));
  panel.addEventListener('dragleave', (e) => !panel.contains(e.relatedTarget as Node) && panel.classList.remove('over'));
  panel.addEventListener('drop', (e) => {
    e.preventDefault();
    panel.classList.remove('over');
    const f = e.dataTransfer?.files[0];
    if (f) open(f);
  });
  fps.addEventListener('change', () => sourceFile && open(sourceFile, encoding.value));
  encoding.addEventListener('change', () => {
    if (sourceFile) open(sourceFile, encoding.value);
  });

  let doneTimer = 0;
  $('download').addEventListener('click', (e) => {
    if (!parsed) return;
    const button = e.currentTarget as HTMLElement;
    button.classList.add('done');
    clearTimeout(doneTimer);
    doneTimer = window.setTimeout(() => button.classList.remove('done'), 1500);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([tool.output(parsed)], { type: 'text/plain;charset=utf-8' }));
    a.download = tool.filename?.(name) ?? name;
    // Only converters rename the file, and their extension is the output format.
    const output_format = tool.filename ? a.download.split('.').pop()! : parsed.file.format;
    track('download', { tool: location.pathname.slice(1), input_format: parsed.file.format, output_format });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  return render;
}
