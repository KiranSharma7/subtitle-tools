import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { tools, conversions } from '../../src/tools.ts';
import { guides } from '../../src/guides.ts';

test('the homepage lists every tool and the footer links resolve', async ({ page, request }) => {
  await page.goto('/');
  for (const t of [...tools, ...conversions]) await expect(page.getByRole('main').getByRole('link', { name: t.name, exact: true })).toHaveAttribute('href', t.href);

  const footer = page.getByRole('navigation', { name: 'Site' });
  for (const name of ['About', 'Privacy', 'Terms', 'Contact']) {
    const href = await footer.getByRole('link', { name }).getAttribute('href');
    expect((await request.get(href!)).ok()).toBe(true);
  }
});

test('every page has a unique title and description, and is in the sitemap', async ({ page, request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  expect(paths).toEqual(expect.arrayContaining(['/', '/about', '/privacy', '/terms', '/contact', ...tools.map((t) => t.href), ...conversions.map((t) => t.href)]));

  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const p of paths) {
    await page.goto(p);
    const title = await page.title();
    const description = (await page.locator('meta[name="description"]').getAttribute('content'))!;
    // Google cuts titles at about 60 characters and descriptions at about 160.
    expect(title.length, `${p} title: ${title}`).toBeLessThanOrEqual(60);
    expect(description.length, `${p} description`).toBeLessThanOrEqual(160);
    titles.add(title);
    descriptions.add(description);
  }
  expect(titles.size).toBe(paths.length);
  expect(descriptions.size).toBe(paths.length);
});

test('nothing breaks the content security policy, with GA, the menu and a file loaded', async ({ page }) => {
  const violations: string[] = [];
  await page.exposeFunction('cspViolation', (v: string) => violations.push(v));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) =>
    (window as unknown as { cspViolation: (v: string) => void }).cspViolation(`${e.violatedDirective} ${e.blockedURI}`)));
  await page.route(/google(tagmanager|-analytics)\.com/, (route) => route.fulfill({ body: '' }));

  await page.goto('/subtitle-shifter');
  await page.getByRole('button', { name: 'Accept' }).click();
  await page.getByRole('button', { name: 'All tools' }).click();
  await page.getByLabel('Choose a subtitle file').setInputFiles(fileURLToPath(new URL('../fixtures/sample.srt', import.meta.url)));
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await page.goto('/');
  expect(violations).toEqual([]);
});

test('every internal link on every page resolves, and every guide is listed', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const pages = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  expect(pages).toEqual(expect.arrayContaining(['/guides', ...guides.map((g) => g.href)]));
  const links = new Set<string>();
  for (const p of pages) {
    const html = await (await request.get(p)).text();
    for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) links.add(href);
  }
  const broken = [];
  for (const href of links) if (!(await request.get(href)).ok()) broken.push(href);
  expect(broken).toEqual([]);
});

test('guides carry Article and breadcrumb structured data', async ({ page }) => {
  await page.goto(guides[0].href);
  const data = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = data.map((d) => JSON.parse(d)['@type']);
  expect(types).toEqual(expect.arrayContaining(['TechArticle', 'BreadcrumbList']));
  const crumbs = JSON.parse(data[types.indexOf('BreadcrumbList')]).itemListElement.map((i: { name: string }) => i.name);
  expect(crumbs).toEqual(['SubtitleMate', 'Guides', 'What is an SRT file?']);
});
