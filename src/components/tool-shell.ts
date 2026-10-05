import type { ParseResult } from '../engine/formats.ts';
import type { Format } from '../engine/types.ts';
import { track } from './analytics.ts';
import { makeZip, readZip } from './zip.ts';

const formatNames: Record<Format, string> = { srt: 'SRT', vtt: 'VTT', ass: 'ASS', ssa: 'SSA', sami: 'SAMI', microdvd: 'MicroDVD', mpl2: 'MPL2', txt: 'TXT' };

export type Row = { cells: string[]; flag?: boolean };
export type ViewOptions = { previewLimit?: number; encoding?: string; name?: string }; // name: the uploaded file's name

export type Tool = {
  // Tool-specific warnings (parser problems are added by the shell) and preview rows.
  // summary replaces the "name: N cues, SRT." line. result is the bold line next to Download.
  // In a batch, view and output run once per file, so keep per-file state in the ParseResult, not in the closure.
  // ready: false keeps the file from downloading (the merger before a merge file is chosen).
  view: (parsed: ParseResult, options?: ViewOptions) => { warnings: string[]; rows: Row[]; summary?: string; result?: string; total?: number; ready?: boolean };
  output: (parsed: ParseResult, name: string) => string;
  filename?: (name: string, parsed: ParseResult) => string; // download name; defaults to the uploaded name
  parse?: (text: string) => ParseResult; // for tools that take any text, not only subtitles
  loaded?: (names: string[]) => void; // after a file or batch is read, with every file name, before the first render
};

type Loaded = { parsed: ParseResult; encoding: string };
type BatchItem = { file: File; error?: string } & Partial<Loaded>;

const PREVIEW_LIMIT = 200;
const LARGE_FILE_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Zips are replaced by the files inside them that match accept. Throws when a zip can't be read.
async function unzipAll(list: File[], accept: string): Promise<File[]> {
  const files: File[] = [];
  for (const f of list) {
    if (!/\.zip$/i.test(f.name)) files.push(f);
    else files.push(...readZip(new Uint8Array(await f.arrayBuffer()), accept).map((e) => new File([e.data as BlobPart], e.name)));
  }
  return files;
}

// Reads extra subtitle files outside the shell, the way the shell reads its own: for a page's second
// file input (the merger's merge files). Each file, or the zip it came in, gets its own result.
export async function readSubtitles(list: File[], accept: string, fps: number): Promise<({ name: string; error: string } | ({ name: string } & Loaded))[]> {
  let files: File[];
  try {
    files = await unzipAll(list, accept.split(',').filter((e) => e.trim().toLowerCase() !== '.zip').join(','));
  } catch {
    return [{ name: list.find((f) => /\.zip$/i.test(f.name))?.name ?? '', error: 'This zip file could not be read.' }];
  }
  return Promise.all(files.map((file) => new Promise<{ name: string; error: string } | ({ name: string } & Loaded)>((resolve) => {
    const worker = new Worker(new URL('./file-worker.ts', import.meta.url), { type: 'module' });
    const done = (r: { error: string } | Loaded) => (worker.terminate(), resolve({ name: file.name, ...r }));
    worker.onmessage = (event: MessageEvent<{ type: string; encoding?: string; parsed?: ParseResult; message?: string }>) => {
      const m = event.data;
      if (m.type === 'error') done({ error: m.message ?? 'The file could not be processed.' });
      else if (m.type === 'result' && m.parsed && m.encoding) done({ parsed: m.parsed, encoding: m.encoding });
    };
    worker.onerror = () => done({ error: 'The file could not be processed.' });
    worker.postMessage({ file, parseSubtitle: true, fps });
  })));
}

// Wires up the markup from ToolShell.astro. Call the returned render() when the tool's own controls change.
// One file gets the preview table. Several files, or a zip, are a batch (ADR 0006): one row per file and a zip download.
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
  const preview = $('preview');
  const rows = $('rows');
  const previewNote = $('preview-note');
  const batchList = $('batch');
  const download = $<HTMLButtonElement>('download');
  // Mobile shows these next to each value, since the header row is hidden there.
  // The first column and a Text column need no label; neither do two-column lists.
  const headers = [...document.querySelectorAll('.preview th')].map((th) => th.textContent ?? '');
  const labels = headers.map((h, i) => (i === 0 || h === 'Text' || headers.length < 3 ? '' : h));
  // What to take out of a zip. A zip inside a zip is skipped.
  const accept = fileInput.accept.split(',').filter((e) => e.trim().toLowerCase() !== '.zip').join(',');
  const toolName = location.pathname.slice(1);

  const fps = $<HTMLSelectElement>('fps');

  let sourceFile: File | null = null;
  let name = '';
  let parsed: ParseResult | null = null;
  let batch: BatchItem[] = [];
  let batchReady: (BatchItem & { parsed: ParseResult })[] = []; // files whose view ran cleanly at the last render
  let singleLabel = '';
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

  function show() {
    error.hidden = true;
    setProcessing(false);
    loaded.hidden = false;
    drop.hidden = true;
    render();
  }

  // Reads, decodes and parses one file in the worker. Never settles once a newer request has started.
  function read(file: File, requestedEncoding: string | undefined, token: number, onProgress: (phase?: string, value?: number) => void): Promise<Loaded> {
    return new Promise((resolve, reject) => {
      worker?.terminate();
      try {
        worker = new Worker(new URL('./file-worker.ts', import.meta.url), { type: 'module' });
      } catch {
        reject(new Error('This browser could not start the file processor.'));
        return;
      }
      const done = () => {
        worker?.terminate();
        worker = null;
      };
      worker.onmessage = (event: MessageEvent<{ type: string; phase?: string; progress?: number; text?: string; encoding?: string; parsed?: ParseResult; message?: string }>) => {
        if (token !== request) return;
        const message = event.data;
        if (message.type === 'progress') {
          onProgress(message.phase, message.progress);
        } else if (message.type === 'error') {
          done();
          reject(new Error(message.message ?? 'The file could not be processed.'));
        } else if (message.type === 'result' && message.encoding && (message.text != null || message.parsed)) {
          done();
          try {
            const result = tool.parse ? tool.parse(message.text ?? '') : message.parsed;
            if (!result) throw new Error('The file could not be parsed.');
            resolve({ parsed: result, encoding: message.encoding });
          } catch (e) {
            reject(e);
          }
        }
      };
      worker.onerror = () => {
        if (token !== request) return;
        done();
        reject(new Error('The file could not be processed. Try a smaller file or another encoding.'));
      };
      worker.postMessage({ file, encoding: requestedEncoding, parseSubtitle: !tool.parse, fps: +fps.value });
    });
  }

  // Zips are opened here and replaced by the files inside them.
  async function load(list: File[]) {
    request += 1;
    const token = request;
    let files: File[];
    try {
      files = await unzipAll(list, accept);
    } catch {
      fail('This zip file could not be read.', token);
      return;
    }
    if (token !== request) return;
    if (!files.length) fail('This zip has no files this tool can open.', token);
    else if (files.length === 1) open(files[0]);
    else openBatch(files);
  }

  async function open(file: File, requestedEncoding?: string) {
    request += 1;
    const token = request;
    sourceFile = file;
    name = file.name;
    parsed = null;
    batch = [];
    error.hidden = true;
    setProcessing(true);
    processingPhase.textContent = 'Reading file...';
    processingDetail.textContent = `${name} · ${formatBytes(file.size)}. Your file stays on this device.`;
    progress.value = 0;
    try {
      const result = await read(file, requestedEncoding, token, (phase, value) => {
        progress.value = value ?? 0;
        processingPhase.textContent = phase === 'reading' ? 'Reading file...' : phase === 'decoding' ? 'Decoding text...' : 'Reading subtitle cues...';
      });
      if (token !== request) return;
      parsed = result.parsed;
      encoding.value = result.encoding;
      tool.loaded?.([name]);
      show();
      track('file_loaded', { tool: toolName, input_format: parsed.file.format });
    } catch (e) {
      fail((e as Error).message, token);
    }
  }

  // Files are read one after another. A file that fails gets its error in its row; the rest carry on.
  async function openBatch(files: File[]) {
    request += 1;
    const token = request;
    sourceFile = null;
    parsed = null;
    batch = files.map((file) => ({ file }));
    error.hidden = true;
    setProcessing(true);
    progress.value = 0;
    for (const [i, item] of batch.entries()) {
      processingPhase.textContent = `Reading file ${i + 1} of ${batch.length}...`;
      processingDetail.textContent = `${item.file.name} · ${formatBytes(item.file.size)}. Your files stay on this device.`;
      try {
        Object.assign(item, await read(item.file, undefined, token, (_, value) => (progress.value = (i + (value ?? 0)) / batch.length)));
      } catch (e) {
        item.error = (e as Error).message;
      }
      if (token !== request) return;
    }
    tool.loaded?.(batch.map((item) => item.file.name));
    show();
    for (const item of batch) if (item.parsed) track('file_loaded', { tool: toolName, input_format: item.parsed.file.format });
  }

  function render() {
    const isBatch = batch.length > 0;
    preview.hidden = isBatch;
    batchList.hidden = !isBatch;
    $('encoding-picker').hidden = isBatch;
    replace.textContent = isBatch ? 'Replace files' : 'Replace file';
    // A page may rename Download (the validator's "Fix and download"); a batch swaps the label and puts it back after.
    if (isBatch) {
      singleLabel ||= download.textContent ?? '';
      download.textContent = 'Download all (.zip)';
    } else if (singleLabel) {
      download.textContent = singleLabel;
    }
    if (isBatch) renderBatch();
    else renderSingle();
  }

  function renderSingle() {
    if (!parsed) return;
    try {
      const { file, problems } = parsed;
      const view = tool.view(parsed, { previewLimit: PREVIEW_LIMIT, encoding: encoding.value, name });
      const fromFile = file.format === 'microdvd' && file.header ? `, ${file.fps} fps from the file` : '';
      $('fps-picker').hidden = file.format !== 'microdvd' || !!file.header;
      $('summary').textContent = view.summary ?? `${name}: ${file.cues.length} cues, ${formatNames[file.format]}${fromFile}.`;
      largeWarning.textContent = sourceFile && sourceFile.size >= LARGE_FILE_BYTES
        ? `This is a large file (${formatBytes(sourceFile.size)}). Processing may use extra memory.`
        : '';
      largeWarning.hidden = !sourceFile || sourceFile.size < LARGE_FILE_BYTES;
      download.disabled = view.ready === false;

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

  // One row per file: its name, what was read and the tool's result line, then its error or warnings.
  function renderBatch() {
    const items = batch.map((item) => {
      if (!item.parsed) return { item, detail: '', notes: [] as string[], error: item.error, ready: false };
      try {
        const { file, problems } = item.parsed;
        const view = tool.view(item.parsed, { previewLimit: 0, encoding: item.encoding, name: item.file.name });
        const readAs = !tool.parse && item.encoding !== 'UTF-8' ? `, read as ${item.encoding}` : '';
        const fromFile = file.format === 'microdvd' && file.header ? `, ${file.fps} fps from the file` : '';
        const detail = [view.summary ?? `${file.cues.length} cues, ${formatNames[file.format]}${readAs}${fromFile}.`, view.result].filter(Boolean).join(' ');
        return { item, detail, notes: [...problems, ...view.warnings], error: undefined, ready: view.ready !== false };
      } catch (e) {
        return { item, detail: '', notes: [], error: (e as Error).message, ready: false };
      }
    });

    batchReady = items.flatMap(({ item, ready: ok }) => (ok && item.parsed ? [{ ...item, parsed: item.parsed }] : []));
    const ready = batchReady.length;
    const failed = items.filter((i) => i.error).length;
    $('summary').textContent = `${items.length} files${failed ? `, ${failed} could not be read` : ''}.`;
    $('fps-picker').hidden = !batch.some(({ parsed: p }) => p?.file.format === 'microdvd' && !p.file.header);
    largeWarning.hidden = true;
    warnings.hidden = true;
    previewNote.hidden = true;
    $('result').textContent = ready ? `${ready} ${ready === 1 ? 'file' : 'files'} ready to download.` : 'No files to download.';
    download.disabled = !ready;

    batchList.replaceChildren(
      ...items.map(({ item, detail, notes, error: message }) => {
        const li = document.createElement('li');
        const head = document.createElement('div');
        head.className = 'batch-head';
        head.append(Object.assign(document.createElement('strong'), { textContent: item.file.name }));
        if (detail) head.append(Object.assign(document.createElement('span'), { textContent: detail }));
        li.append(head);
        if (message) li.append(Object.assign(document.createElement('p'), { className: 'batch-error', textContent: message }));
        li.append(...notes.map((n) => Object.assign(document.createElement('p'), { textContent: n })));
        return li;
      }),
    );
  }

  const pick = (files: FileList | null | undefined) => files?.length && load([...files]);
  fileInput.addEventListener('change', () => pick(fileInput.files));
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
    batch = [];
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
    pick(e.dataTransfer?.files);
  });
  fps.addEventListener('change', () => {
    if (batch.length) openBatch(batch.map((item) => item.file));
    else if (sourceFile) open(sourceFile, encoding.value);
  });
  encoding.addEventListener('change', () => {
    if (sourceFile) open(sourceFile, encoding.value);
  });

  function save(blob: Blob, filename: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Only converters (and Save as ASS) rename the file, and their extension is the output format.
  const outputFormat = (original: string, p: ParseResult) => (tool.filename ? tool.filename(original, p).split('.').pop()! : p.file.format);

  let doneTimer = 0;
  download.addEventListener('click', () => {
    const ready = batch.length ? batchReady : [];
    if (!parsed && !ready.length) return;
    download.classList.add('done');
    clearTimeout(doneTimer);
    doneTimer = window.setTimeout(() => download.classList.remove('done'), 1500);

    if (!parsed) {
      const files = ready.map((item) => ({ name: tool.filename?.(item.file.name, item.parsed) ?? item.file.name, text: tool.output(item.parsed, item.file.name) }));
      for (const item of ready) track('download', { tool: toolName, input_format: item.parsed.file.format, output_format: outputFormat(item.file.name, item.parsed) });
      save(new Blob([makeZip(files) as BlobPart], { type: 'application/zip' }), 'subtitles.zip');
      return;
    }
    track('download', { tool: toolName, input_format: parsed.file.format, output_format: outputFormat(name, parsed) });
    save(new Blob([tool.output(parsed, name)], { type: 'text/plain;charset=utf-8' }), tool.filename?.(name, parsed) ?? name);
  });

  return render;
}
