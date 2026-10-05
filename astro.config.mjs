import { defineConfig } from 'astro/config';
import { site } from './src/site.ts';

// Google hosts that GA4 loads from and reports to once the visitor accepts (ADR 0003).
const google = ['https://*.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com'];

// format 'file' builds /contact.html, which Cloudflare serves at /contact with no redirect, matching the canonical URLs.
// csp puts a <meta> policy with hashes of Astro's inline scripts and styles on every page.
export default defineConfig({
  site: site.url,
  build: { format: 'file' },
  // No markdown pages; Shiki's inline styles would only trigger a CSP warning.
  markdown: { syntaxHighlight: false },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        `img-src 'self' data: ${google.join(' ')}`,
        // lrclib.net: the timed lyrics editor's "Find lyrics online". blob: plays the visitor's own audio file.
        `connect-src 'self' https://lrclib.net ${google.join(' ')}`,
        "media-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: { resources: ["'self'", 'https://*.googletagmanager.com'] },
      // The header menu staggers its items with a style="--i: n" attribute.
      styleDirective: { resources: [{ resource: "'self'", kind: 'element' }, { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
});
