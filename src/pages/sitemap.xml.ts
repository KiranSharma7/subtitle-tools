import type { APIRoute } from 'astro';
import { execFileSync } from 'node:child_process';

// Every .astro page, built at build time. Add a filter here if a page should stay out.
const files = Object.keys(import.meta.glob('./**/*.astro')).filter((f) => f !== './404.astro');

// Last commit date of the page file. Left out when git has no history for it (new file, shallow clone).
const lastmod = (file: string) => {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', `src/pages/${file.slice(2)}`], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

export const GET: APIRoute = ({ site }) => {
  const urls = files
    .map((f) => ({ path: f.replace(/^\.\//, '/').replace(/(index)?\.astro$/, ''), date: lastmod(f) }))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(({ path, date }) => `<url><loc>${new URL(path, site)}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}</url>`)
    .join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
