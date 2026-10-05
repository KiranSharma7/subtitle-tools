# Browser OCR first, optional server OCR for image subtitles only

Amends ADR 0001 ("all processing in the browser").

SUP and SUB/IDX to SRT run OCR in the browser by default: tesseract.js in a Web Worker, with its core and language files hosted on our own domain so the CSP is unchanged. Only the chosen language's file is loaded (taken from the track or `.idx` language tag, otherwise picked by the user).

A clearly labelled, opt-in "process on our server" button can send the **image subtitle file only** to `api.subtitlemate.com` on our VPS (Node + PaddleOCR/Tesseract), mainly for better Chinese, Japanese and Korean results. Limits: 100 MB, rate limited per IP, file kept in memory or a temp folder and deleted as soon as the response is sent, no logging of contents. Results come back into the same OCR correction screen. Adding it means `connect-src api.subtitlemate.com` in the CSP and a server section on the Privacy page.

Video files are never uploaded: extraction reads only the parts it needs in the browser (ADR 0005), so uploading a multi-GB video to get a few KB back would be slower and worse for privacy.

The server is built only after browser OCR ships and its CJK quality gap is confirmed. We rejected server-only OCR because the local-processing promise is the site's main advantage over competitors.
