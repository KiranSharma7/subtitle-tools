import { parse, type ParseResult } from '../engine/formats.ts';
import { decode, decodeAs } from '../engine/decode.ts';

export type Row = { cells: string[]; flag?: boolean };

export type Tool = {
  // Tool-specific warnings (parser problems are added by the shell) and preview rows.
  view: (parsed: ParseResult) => { warnings: string[]; rows: Row[] };
  output: (parsed: ParseResult) => string;
};

// Wires up the markup from ToolShell.astro. Call the returned render() when the tool's own controls change.
export function mountTool(tool: Tool): () => void {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const fileInput = $<HTMLInputElement>('file');
  const drop = $('drop');
  const error = $('error');
  const loaded = $('loaded');
  const encoding = $<HTMLSelectElement>('encoding');
  const warnings = $('warnings');
  const rows = $('rows');

  let bytes: Uint8Array | null = null;
  let name = '';
  let parsed: ParseResult | null = null;

  function load(text: string, enc: string) {
    encoding.value = enc;
    try {
      parsed = parse(text);
      error.hidden = true;
      loaded.hidden = false;
      render();
    } catch (e) {
      parsed = null;
      loaded.hidden = true;
      error.textContent = (e as Error).message;
      error.hidden = false;
    }
  }

  async function open(file: File) {
    name = file.name;
    bytes = new Uint8Array(await file.arrayBuffer());
    const { text, encoding: enc } = await decode(bytes);
    load(text, enc);
  }

  function render() {
    if (!parsed) return;
    const { file, problems } = parsed;
    const view = tool.view(parsed);
    $('summary').textContent = `${name}: ${file.cues.length} cues, ${file.format.toUpperCase()}.`;

    const notes = [...problems, ...view.warnings];
    warnings.replaceChildren(...notes.map((n) => Object.assign(document.createElement('p'), { textContent: n })));
    warnings.hidden = !notes.length;

    // ponytail: preview capped at 200 rows; virtualise if people want to scroll huge files.
    rows.replaceChildren(
      ...view.rows.slice(0, 200).map((r) => {
        const tr = document.createElement('tr');
        for (const v of r.cells) tr.append(Object.assign(document.createElement('td'), { textContent: v }));
        if (r.flag) tr.className = 'flag';
        return tr;
      }),
    );
  }

  fileInput.addEventListener('change', () => fileInput.files?.[0] && open(fileInput.files[0]));
  drop.addEventListener('dragover', (e) => (e.preventDefault(), drop.classList.add('over')));
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const f = e.dataTransfer?.files[0];
    if (f) open(f);
  });
  encoding.addEventListener('change', () => {
    if (!bytes) return;
    const { text, encoding: enc } = decodeAs(bytes, encoding.value);
    load(text, enc);
  });

  $('download').addEventListener('click', () => {
    if (!parsed) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([tool.output(parsed)], { type: 'text/plain;charset=utf-8' }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  return render;
}
