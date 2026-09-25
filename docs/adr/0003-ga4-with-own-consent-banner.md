# GA4 analytics with a small in-house consent banner

We use Google Analytics 4, which sets cookies, so EEA/UK/CH visitors must consent first. Phase 1 uses a small in-house banner (Accept/Reject, saved in localStorage) driving Google Consent Mode v2, with default `denied`.

This is fine for analytics only. Before AdSense goes live, replace the banner with a Google-certified CMP, because Google requires one for ads in the EEA/UK.
