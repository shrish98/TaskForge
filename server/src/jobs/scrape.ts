import { UnrecoverableError } from 'bullmq';
import * as cheerio from 'cheerio';
import { safeFetch } from '../lib/safeFetch.js';
import { JobHandler } from './types.js';

const MAX_ITEMS = 50;

export function parsePage(html: string, pageUrl: string, selector?: string) {
  const $ = cheerio.load(html);
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

  const links = new Set<string>();
  $('a[href]').each((_, el) => {
    try {
      const href = new URL($(el).attr('href')!, pageUrl);
      if (href.protocol === 'http:' || href.protocol === 'https:') links.add(href.toString());
    } catch {
      // Ignore hrefs that aren't URLs (javascript:, malformed).
    }
  });

  $('script, style, noscript, template').remove();
  const bodyText = clean($('body').text());

  return {
    title: clean($('title').first().text()) || null,
    description: $('meta[name="description"]').attr('content')?.trim() || null,
    headings: $('h1, h2')
      .map((_, el) => clean($(el).text()))
      .get()
      .filter(Boolean)
      .slice(0, MAX_ITEMS),
    wordCount: bodyText ? bodyText.split(' ').length : 0,
    linkCount: links.size,
    links: [...links].slice(0, MAX_ITEMS),
    ...(selector
      ? {
          selector,
          matches: $(selector)
            .map((_, el) => clean($(el).text()))
            .get()
            .filter(Boolean)
            .slice(0, MAX_ITEMS),
        }
      : {}),
  };
}

export const runScrape: JobHandler = async (ctx) => {
  const { url, selector } = ctx.payload;

  await ctx.progress(20, `Fetching ${url}`);
  const res = await safeFetch(url, { maxBytes: 3 * 1024 * 1024, signal: ctx.signal });
  // A 404 won't fix itself on retry; a 503 might.
  if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
    throw new UnrecoverableError(`${url} returned HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  if (!/html/i.test(res.contentType)) {
    throw new UnrecoverableError(`Expected an HTML page but got "${res.contentType || 'no content type'}"`);
  }

  await ctx.progress(60, `Parsing ${(res.body.length / 1024).toFixed(0)} KB of HTML`);
  let page: ReturnType<typeof parsePage>;
  try {
    page = parsePage(res.body.toString('utf8'), url, selector);
  } catch (err: any) {
    // cheerio throws on an invalid CSS selector, which retrying won't change.
    throw new UnrecoverableError(`Could not parse the page: ${err.message}`);
  }

  return {
    output: { url, httpStatus: res.status, ...page },
    message: `Scraped "${page.title ?? url}": ${page.wordCount} words, ${page.linkCount} links${
      selector ? `, ${page.matches?.length ?? 0} matches for ${selector}` : ''
    }.`,
  };
};
