# Batch input and zip output in the shared tool shell

Merge (pairs, one-into-many), PDF, color and position all take several files. Batch support is built once in `ToolShell` / `mountTool()` instead of per tool: multiple files or a zip in, a per-file result list with warnings, and "Download all (.zip)". Zip uses fflate (~8 KB). A single file keeps the existing preview flow unchanged.

## Also: LRC as a converter output

Amends ADR 0002, which limits conversion output to SRT, WebVTT and plain text. LRC is added as a fourth output; word timings and anything else LRC can't hold go in the loss report.
