# Own streaming container parsers, not ffmpeg.wasm

Extracting subtitles from video uses our own parsers in `src/engine/containers/`: MKV/WebM (EBML) first, MP4 (`mov_text`/tx3g) second. They read the file in chunks with `File.slice`, so there is no size limit and nothing is loaded whole into memory. They list tracks (codec, language, name, default/forced); text tracks are written in their own format, image tracks (PGS, VobSub) go to OCR on the same page.

We rejected ffmpeg.wasm: about 30 MB to download, a ~2 GB file limit, and far more than we need, since subtitle tracks only need demuxing, not decoding. AVI and MPEG-TS are out of scope.
