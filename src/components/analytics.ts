// GA4 behind our own consent banner (ADR 0003). gtag.js is only loaded after Accept, so nothing reaches Google before that.
import { site } from '../site.ts';

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window { dataLayer: unknown[]; gtag?: Gtag }
}

const KEY = 'consent';

function stored(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function start() {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  const denied = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  window.gtag('consent', 'default', { ...denied, analytics_storage: 'denied' });
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', site.gaId);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${site.gaId}`;
  document.head.append(s);
}

// Only the tool, input format and output format; never file names or content.
export function track(event: 'file_loaded' | 'download', params: { tool: string; input_format: string; output_format?: string }) {
  window.gtag?.('event', event, params);
}

export function initConsent() {
  const banner = document.getElementById('consent')!;
  const choose = (v: 'granted' | 'denied') => {
    try { localStorage.setItem(KEY, v); } catch {}
    banner.hidden = true;
    // Rejecting after accepting: stop sending now; the loaded script goes away on the next page.
    if (v === 'granted') start();
    else window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  };
  document.getElementById('consent-accept')!.addEventListener('click', () => choose('granted'));
  document.getElementById('consent-reject')!.addEventListener('click', () => choose('denied'));
  for (const b of document.querySelectorAll('[data-consent-open]'))
    b.addEventListener('click', () => ((banner.hidden = false), document.getElementById('consent-accept')!.focus()));

  const v = stored();
  if (v === 'granted') start();
  banner.hidden = v !== null;
}
