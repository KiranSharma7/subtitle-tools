import { decode, decodeAs } from '../engine/decode.ts';
import { parse, type ParseResult } from '../engine/formats.ts';

type Request = {
  file: File;
  encoding?: string;
  parseSubtitle: boolean;
  fps?: number;
};

type ProgressMessage = {
  type: 'progress';
  phase: 'reading' | 'decoding' | 'parsing';
  progress: number;
};

type ResultMessage = {
  type: 'result';
  text?: string;
  encoding: string;
  parsed?: ParseResult;
};

type ErrorMessage = { type: 'error'; message: string };

const send = (message: ProgressMessage | ResultMessage | ErrorMessage) => self.postMessage(message);

async function readFile(file: File): Promise<Uint8Array> {
  const reader = file.stream().getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    total += value.byteLength;
    send({ type: 'progress', phase: 'reading', progress: file.size ? (total / file.size) * 0.55 : 0.55 });
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function process(request: Request) {
  try {
    const bytes = await readFile(request.file);
    send({ type: 'progress', phase: 'decoding', progress: 0.68 });
    const decoded = request.encoding ? decodeAs(bytes, request.encoding) : await decode(bytes);

    let parsed: ParseResult | undefined;
    if (request.parseSubtitle) {
      send({ type: 'progress', phase: 'parsing', progress: 0.8 });
      parsed = parse(decoded.text, { fps: request.fps });
    }

    send({ type: 'progress', phase: 'parsing', progress: 0.98 });
    // Subtitle tools only need the parsed model. Avoid copying the full decoded
    // string back to the page for large files. Custom text tools still receive it.
    send({ type: 'result', text: request.parseSubtitle ? undefined : decoded.text, encoding: decoded.encoding, parsed });
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : 'The file could not be read.' });
  }
}

self.onmessage = (event: MessageEvent<Request>) => void process(event.data);
