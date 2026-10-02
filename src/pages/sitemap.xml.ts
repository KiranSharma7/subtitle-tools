import type { APIRoute } from 'astro';

// Every .astro page, built at build time. Add a filter here if a page should stay out.
const pages = Object.keys(import.meta.glob('./**/*.astro')).map((p) => p.replace(/^\.\//, '/').replace(/(index)?\.astro$/, '')).filter((p) => p !== '/404');

export const GET: APIRoute = ({ site }) => {
  const urls = pages.sort().map((p) => `<url><loc>${new URL(p, site)}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
