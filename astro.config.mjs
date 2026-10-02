import { defineConfig } from 'astro/config';
import { site } from './src/site.ts';

// format 'file' builds /contact.html, which Cloudflare serves at /contact with no redirect, matching the canonical URLs.
export default defineConfig({ site: site.url, build: { format: 'file' } });
