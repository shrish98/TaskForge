import dns from 'dns/promises';
import net from 'net';

// Jobs fetch URLs that users type in, so without a guard a task could make the worker read
// internal services (cloud metadata at 169.254.169.254, Redis, the database). Every outbound
// request goes through here: http(s) only, public addresses only, a timeout and a size cap.

export class UnsafeUrlError extends Error {}

const PRIVATE_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const toInt = (ip: string) => ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const value = toInt(ip);
    return PRIVATE_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (value & mask) === (toInt(base) & mask);
    });
  }
  const lower = ip.toLowerCase();
  if (lower.startsWith('::ffff:')) return isPrivateAddress(lower.slice(7));
  return lower === '::' || lower === '::1' || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
}

// Tests and the load test serve fixtures from localhost, so they switch the address check off.
const allowPrivate = () => process.env.ALLOW_PRIVATE_URLS === 'true';

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError(`Not a valid URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError(`Only http and https URLs are allowed, got ${url.protocol}`);
  }
  if (allowPrivate()) return url;

  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new UnsafeUrlError(`Refusing to fetch ${url.hostname}: it resolves to a private or reserved address`);
  }
  return url;
}

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxBytes?: number;
  /** Cancels the request early, on top of the timeout (e.g. when the job is aborted). */
  signal?: AbortSignal;
}

export interface SafeFetchResult {
  status: number;
  ok: boolean;
  contentType: string;
  body: Buffer;
}

const MAX_REDIRECTS = 3;

export async function safeFetch(raw: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const { timeoutMs = 15_000, maxBytes = 5 * 1024 * 1024, signal: cancel, ...init } = options;
  let target = raw;

  // Follow redirects by hand so every hop is checked, not just the first URL.
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(target);
    const res = await fetch(url, {
      ...init,
      redirect: 'manual',
      signal: cancel ? AbortSignal.any([AbortSignal.timeout(timeoutMs), cancel]) : AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': 'TaskForge/1.0 (+https://github.com/shrish98/TaskForge)', ...init.headers },
    });

    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      target = new URL(location, url).toString();
      continue;
    }

    return {
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get('content-type') || '',
      body: await readCapped(res, maxBytes),
    };
  }
  throw new UnsafeUrlError(`Too many redirects (more than ${MAX_REDIRECTS})`);
}

async function readCapped(res: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(res.headers.get('content-length'));
  if (declared > maxBytes) {
    throw new Error(`Response is ${declared} bytes, over the ${maxBytes}-byte limit`);
  }
  if (!res.body) return Buffer.alloc(0);

  const chunks: Buffer[] = [];
  let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Response is over the ${maxBytes}-byte limit`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}
