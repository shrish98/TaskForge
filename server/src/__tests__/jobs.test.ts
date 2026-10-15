import crypto from 'crypto';
import { parsePage } from '../jobs/scrape';
import { csvCell, toCsvLine } from '../jobs/csvExport';
import { signBody } from '../jobs/webhook';
import { summarise, taskDurations } from '../lib/stats';

describe('scraper parsing', () => {
  const html = `<!doctype html><html><head>
      <title>  Price list </title>
      <meta name="description" content="Weekly prices">
      <style>.x{}</style></head>
    <body>
      <h1>Shop</h1><h2>Laptops</h2>
      <p class="price">₹49,999</p><p class="price">₹62,500</p>
      <a href="/item/1">One</a><a href="https://other.example/x">Two</a>
      <a href="/item/1">Duplicate</a><a href="javascript:void(0)">Bad</a>
      <script>var hidden = "do not count me";</script>
    </body></html>`;

  it('pulls out the title, description, headings and absolute links', () => {
    const page = parsePage(html, 'https://shop.example/catalog');
    expect(page.title).toBe('Price list');
    expect(page.description).toBe('Weekly prices');
    expect(page.headings).toEqual(['Shop', 'Laptops']);
    expect(page.links).toEqual(['https://shop.example/item/1', 'https://other.example/x']);
    expect(page.linkCount).toBe(2);
  });

  it('returns the text of every element matching a CSS selector', () => {
    const page = parsePage(html, 'https://shop.example/', '.price');
    expect(page.matches).toEqual(['₹49,999', '₹62,500']);
  });

  it('leaves script contents out of the word count', () => {
    const page = parsePage(html, 'https://shop.example/');
    expect(page.wordCount).toBeGreaterThan(0);
    expect(JSON.stringify(page)).not.toContain('do not count me');
  });
});

describe('CSV export', () => {
  it('quotes commas, quotes and newlines (RFC 4180)', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell(null)).toBe('');
  });

  it('defuses cells a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('formats dates as ISO strings', () => {
    expect(toCsvLine(['x', new Date('2026-01-02T03:04:05.000Z'), 3])).toBe('x,2026-01-02T03:04:05.000Z,3');
  });
});

describe('webhook signing', () => {
  it('produces an HMAC-SHA256 the receiver can verify', () => {
    const body = JSON.stringify({ event: 'test' });
    const signature = signBody(body, 'shh');
    const expected = crypto.createHmac('sha256', 'shh').update(body).digest('hex');
    expect(signature).toBe(`sha256=${expected}`);
    expect(signBody(body + ' ', 'shh')).not.toBe(signature);
  });
});

describe('timing stats', () => {
  it('summarises durations', () => {
    expect(summarise([30, 10, 20, 40])).toEqual({ count: 4, meanMs: 25, p50Ms: 20, p95Ms: 40 });
    expect(summarise([])).toEqual({ count: 0, meanMs: null, p50Ms: null, p95Ms: null });
  });

  it('measures queue wait from the scheduled time, not creation, for scheduled tasks', () => {
    const t = (s: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, s));
    expect(taskDurations({ createdAt: t(0), scheduledAt: t(10), startedAt: t(12), completedAt: t(15) })).toEqual({
      waitMs: 2000,
      runMs: 3000,
    });
    expect(taskDurations({ createdAt: t(0), scheduledAt: null, startedAt: null, completedAt: null })).toEqual({
      waitMs: null,
      runMs: null,
    });
  });
});
