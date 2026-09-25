import { test, expect } from '@playwright/test';
import { tools } from '../../src/tools.ts';

test('the homepage lists every tool and the footer links resolve', async ({ page, request }) => {
  await page.goto('/');
  for (const t of tools) await expect(page.getByRole('main').getByRole('link', { name: t.name, exact: true })).toHaveAttribute('href', t.href);

  const footer = page.getByRole('navigation', { name: 'Site' });
  for (const name of ['Privacy', 'Terms', 'Contact']) {
    const href = await footer.getByRole('link', { name }).getAttribute('href');
    expect((await request.get(href!)).ok()).toBe(true);
  }
});

test('every page has a unique title and description, and is in the sitemap', async ({ page, request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  expect(paths).toEqual(expect.arrayContaining(['/', '/privacy', '/terms', '/contact', ...tools.map((t) => t.href)]));

  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const p of paths) {
    await page.goto(p);
    titles.add(await page.title());
    descriptions.add((await page.locator('meta[name="description"]').getAttribute('content'))!);
  }
  expect(titles.size).toBe(paths.length);
  expect(descriptions.size).toBe(paths.length);
});
