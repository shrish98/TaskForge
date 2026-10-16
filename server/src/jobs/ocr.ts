import os from 'os';
import path from 'path';
import { UnrecoverableError } from 'bullmq';
import { createWorker, Worker as TesseractWorker } from 'tesseract.js';
import { safeFetch } from '../lib/safeFetch.js';
import { JobHandler } from './types.js';

// One Tesseract worker shared by every OCR job. Tesseract runs in its own thread, so OCR doesn't
// block the event loop, and it queues recognize() calls internally, so memory stays flat no
// matter how many OCR jobs BullMQ runs at once. The English model downloads once and is cached.
let ocrWorker: Promise<TesseractWorker> | null = null;

const getOcrWorker = () => {
  ocrWorker ??= createWorker('eng', 1, {
    cachePath: path.join(os.tmpdir(), 'taskforge-tessdata'),
  });
  return ocrWorker;
};

export async function shutdownOcr() {
  if (!ocrWorker) return;
  const worker = await ocrWorker;
  ocrWorker = null;
  await worker.terminate();
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 20_000;

export async function recognizeImage(image: Buffer) {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(image);
  const text = data.text.trim();
  return {
    text: text.slice(0, MAX_TEXT_CHARS),
    truncated: text.length > MAX_TEXT_CHARS,
    words: text ? text.split(/\s+/).length : 0,
    confidence: Math.round(data.confidence * 10) / 10,
  };
}

export const runOcr: JobHandler = async (ctx) => {
  const { imageUrl } = ctx.payload;

  await ctx.progress(15, `Downloading image from ${imageUrl}`);
  const res = await safeFetch(imageUrl, { maxBytes: MAX_IMAGE_BYTES, timeoutMs: 20_000, signal: ctx.signal });
  if (res.status >= 400 && res.status < 500) {
    throw new UnrecoverableError(`Image download failed with HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`Image download failed with HTTP ${res.status}`);
  if (!res.contentType.startsWith('image/')) {
    throw new UnrecoverableError(`Expected an image but the URL returned "${res.contentType || 'no content type'}"`);
  }

  await ctx.progress(35, `Running OCR on ${(res.body.length / 1024).toFixed(0)} KB image`);
  const started = performance.now();
  const result = await recognizeImage(res.body);
  const ocrMs = Math.round(performance.now() - started);

  await ctx.progress(95, `Recognised ${result.words} words in ${ocrMs} ms`);
  return {
    output: { imageUrl, imageBytes: res.body.length, ocrMs, ...result },
    message: `OCR finished: ${result.words} words at ${result.confidence}% mean confidence.`,
  };
};
