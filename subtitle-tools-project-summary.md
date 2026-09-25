# Subtitle tools website project summary

## Project decision

Build a browser-first website for fixing, converting, syncing, and editing existing subtitle files.

The first version should process normal text subtitle files locally in the visitor's browser. This keeps the service private, reduces hosting costs, and makes the basic tools fast to use.

The site should not begin as an AI subtitle generator. Users bring an existing subtitle file, audio file, or video file.

## Product position

Suggested position:

> Fast, private tools for fixing subtitle files.

Primary audiences:

- People watching movies and TV shows
- Video creators
- Subtitle editors
- Language learners
- Users preparing bilingual subtitles
- Developers who need subtitle format conversion

The main value is a group of small tools that solve specific subtitle problems quickly.

## Feature inventory

### Converters

#### Convert to SRT

Purpose: convert text-based subtitle formats to SRT.

Inputs may include:

- ASS
- SSA
- WebVTT
- SMI/SAMI
- MicroDVD SUB
- MPL2
- Plain text or transcript files

Needs:

- Format detection
- Parsers for each input format
- Timestamp conversion
- Cue numbering
- Output validation
- Clear messages when styling or positioning is lost

#### Convert to WebVTT

Purpose: convert SRT and other text subtitle formats to WebVTT.

Needs:

- Subtitle parser
- Timestamp conversion
- WEBVTT header
- Cue settings handling where supported
- Output validation

#### SUP to SRT

Purpose: convert PGS/SUP image subtitles to text SRT.

Needs:

- PGS/SUP image parser
- Image extraction
- OCR
- Subtitle language selection
- OCR progress and error handling
- Review of low-confidence results
- Server queue for large files

This is a later feature because OCR is expensive and more difficult to run reliably in a browser.

#### SUB/IDX to SRT

Purpose: convert VobSub image subtitles to text SRT.

Needs:

- SUB and IDX pair validation
- Image extraction
- OCR
- Language selection
- Handling of multiple subtitle tracks
- Processing queue

A .sub file without its matching .idx file may not be usable as VobSub. The site should explain this clearly.

#### Convert to plain text

Purpose: remove timestamps and subtitle formatting while keeping the dialogue.

Needs:

- Subtitle parser
- Formatting removal
- Options for keeping or removing line breaks
- Plain text download

#### Convert to PDF

Purpose: create a readable PDF from subtitle text.

Needs:

- Subtitle parser
- Page layout
- Unicode fonts
- Long-cue handling
- Optional timestamps
- Page numbering
- Right-to-left language support

This is a medium-complexity feature and can be added after the core converters.

### Syncing

#### Subtitle shifter

Purpose: move every cue earlier or later by a selected amount.

Needs:

- Positive and negative offset
- Millisecond and second input
- Prevention of negative timestamps
- Format preservation
- Preview and download

#### Partial subtitle shifter

Purpose: apply different timing corrections to different parts of a file.

Needs:

- Multiple From and To ranges
- Offset for each range
- Overlap validation
- Clear rule for cues crossing a range boundary
- Preview of the changed cues

### Fixing and cleaning

#### SRT cleaner

Purpose: remove unwanted formatting and subtitle clutter.

Possible options:

- Remove HTML tags
- Remove ASS formatting tags
- Remove SDH descriptions
- Remove speaker labels
- Remove watermarks
- Remove music-note cues
- Remove text inside parentheses
- Remove text inside brackets
- Remove text inside curly brackets
- Remove text between asterisks
- Remove text between hashtags
- Remove duplicate cues
- Remove empty cues
- Merge cues with identical text
- Remove unnecessary line breaks
- Change fully uppercase text to lowercase
- Preserve selected italic, bold, or font tags

The tool should show a before and after preview because some cleanup rules may remove text intentionally.

#### Convert to UTF-8

Purpose: convert text files to UTF-8.

Needs:

- Encoding detection
- Support for common legacy encodings
- Multilingual text support
- Correct download encoding
- Error handling for damaged files

### Other tools

#### Extract subtitles from video

Purpose: list and download subtitle tracks embedded in a video.

Potential containers:

- MKV
- MP4
- AVI
- MOV
- TS
- WebM

Needs:

- Media container inspection
- Subtitle track listing
- Language and metadata display
- Text track extraction
- Image track extraction where supported
- Large-file progress reporting

This may run in the browser using a WebAssembly media engine. Server processing can be added later for large videos and the API.

The tool should explain that it cannot extract subtitles permanently burned into video frames.

#### Timed lyrics editor

Purpose: create and edit synchronized LRC lyric files.

Needs:

- Import MP3, WAV, AAC, OGG, FLAC, and LRC files
- Audio playback
- Play, pause, and seeking
- Lyric editing
- Keyboard shortcuts
- Timestamping the active line
- Insert, delete, and reorder lines
- Shift all timestamps
- Nudge individual timestamps
- Preview
- Metadata fields
- Download as .lrc

This can run locally with browser audio APIs.

#### Subtitle merger

Purpose: combine two subtitle files into one.

Modes:

- Simple merge
- Nearest-cue merge
- Glue two files end-to-end

Needs:

- Two subtitle uploads
- Cue matching
- Overlap handling
- Bilingual layout
- Optional top and bottom positioning
- Optional line-break removal
- Optional color settings where the output format supports them
- Batch pairing later

#### Color changer

Purpose: change subtitle text color.

Needs:

- ASS/SSA style editing
- WebVTT styling where supported
- Clear warning that SRT has little or no styling support
- Optional conversion to a styled format

#### Position changer

Purpose: change where subtitles appear on screen.

Needs:

- ASS/SSA alignment and margin editing
- WebVTT cue positioning where supported
- Clear warning for formats that cannot store positioning
- Preview of supported output formats

#### Make Pinyin subtitles

Purpose: convert Chinese subtitle text to romanized pinyin.

Needs:

- Chinese text parsing
- Pinyin conversion
- Tone marks or tone numbers
- Punctuation preservation
- Subtitle timing preservation
- Manual review of ambiguous pronunciations
- Download of the converted subtitle

Chinese words can have different pronunciations depending on context, so the result should be editable before download.

## Browser-first architecture

### Frontend

Use a responsive web application with:

- Drag-and-drop upload
- File picker
- Tool-specific controls
- Progress indicators
- Preview area
- Download button
- Clear errors
- Accessible labels
- Keyboard support
- Mobile layout

### Shared subtitle engine

Create one reusable processing library for:

- Parsing
- Cue validation
- Timestamp conversion
- Cue editing
- Cleaning
- Merging
- Formatting
- Exporting

All tools should use the same engine so formats behave consistently.

### Local processing

Run these locally in the browser first:

- SRT and WebVTT conversion
- Timing shifts
- SRT cleaning
- UTF-8 conversion
- Plain text export
- Basic subtitle merging
- Timed lyrics editing
- Many color and position changes

Use Web Workers for heavy work so the page does not freeze during processing.

### Server processing later

Use a server for:

- SUP OCR
- SUB/IDX OCR
- Large video files
- Batch jobs
- Developer API
- Paid users with higher limits

If files are uploaded, delete them automatically after processing or after a short retention period.

## Format limitations to explain to users

- SRT is simple and cannot preserve many styling effects.
- ASS/SSA supports fonts, colors, positions, outlines, and effects.
- WebVTT supports web-focused styling and cue positioning.
- Converting styled formats to SRT may remove colors, fonts, positions, and karaoke effects.
- Image subtitles require OCR, so spelling and timing may need review.
- SRT and VTT timestamps use different separators and headers.
- A subtitle file may contain overlapping or invalid cues that need correction.

## Monetization plan

### Free advertising

Use light advertising:

- One ad above or below the tool
- One ad in related educational content
- No ad covering the upload controls
- No misleading download buttons
- No popups that block the main task

The site needs original guides and useful explanations because an upload button alone may not provide enough content for advertising approval.

### Paid plan

Possible benefits:

- Remove ads
- Batch processing
- Larger file limits
- Saved settings
- Advanced merging
- Priority OCR processing
- More export options
- API credits

A one-time purchase may suit casual users. A monthly plan may suit professionals with recurring subtitle work.

### Developer API

Later, expose paid API operations for:

- SRT conversion
- WebVTT conversion
- Timing shifts
- Cleaning
- Subtitle merging
- Validation

Use credit-based billing or monthly usage tiers.

### Other income

- Relevant affiliate links
- Sponsorships
- Donations
- Paid business or team plans
- Sponsored guides for subtitle-related software

The site should remain useful without requiring users to click an advertisement.

## SEO and content plan

Each important tool should have its own page with:

- A working tool
- Supported formats
- A short explanation
- Examples
- Common errors
- Download instructions
- Privacy details
- Links to related tools
- Original educational content

Potential search topics:

- Shift SRT subtitles
- Fix subtitles out of sync
- Convert SRT to VTT
- Clean an SRT file
- Merge bilingual subtitles
- Fix invalid WebVTT
- Remove HTML tags from subtitles
- Extract subtitles from MKV
- Convert SUP to SRT
- Convert SUB IDX to SRT

Avoid creating large numbers of nearly identical pages only for search keywords. Every page should solve a real user problem.

## Privacy and compliance

The browser-first design should allow this message:

> Your subtitle file is processed locally in your browser and is not uploaded.

The site still needs:

- Privacy policy
- Terms of use
- Contact page
- File-processing explanation
- Cookie and analytics explanation
- Consent controls for advertising
- Account deletion process if accounts are added
- Automatic file deletion if server uploads are introduced

For users in the EEA, UK, and Switzerland, personalized advertising requires an appropriate consent-management setup.

## Development roadmap

### Phase 1: launch version

Build:

- Convert to SRT
- Convert to WebVTT
- Convert to plain text
- Subtitle shifter
- Partial subtitle shifter
- SRT cleaner
- UTF-8 converter
- Subtitle validator

Also build:

- Homepage
- Tool navigation
- Help pages
- Privacy policy
- Terms of use
- Contact page
- Basic analytics
- Sitemap and metadata

### Phase 2: editing tools

Add:

- Subtitle merger
- PDF export
- Color changer
- Position changer
- Timed lyrics editor

### Phase 3: expensive processing

Add:

- Video subtitle extraction
- SUP to SRT
- SUB/IDX to SRT
- Batch processing
- Pinyin subtitles
- Paid accounts
- Developer API

## Testing requirements

Use real subtitle samples for:

- Multiple languages
- Long lines
- Empty cues
- Overlapping cues
- Invalid timestamps
- HTML tags
- ASS tags
- Unicode text
- Right-to-left languages
- Different subtitle frame rates
- Large files
- Multiple files in a batch

Test on:

- Desktop browsers
- Mobile browsers
- Slow devices
- Large files
- Files with unusual encodings

Important checks:

- Downloads open correctly in VLC and common media players
- Timing does not become negative
- Cue order stays correct
- Text is not silently lost
- Format limitations are explained
- Browser processing does not freeze the page

## Current recommendation

Start with a browser-first MVP focused on text subtitle files. Launch the tools that are inexpensive to run and easiest to make private.

The first release should not include OCR, large video processing, or a full account system. Add those after real usage shows which tools attract visitors and which users are willing to pay.

## Reference links

- Subtitle Tools homepage: https://subtitletools.com/
- Convert to SRT: https://subtitletools.com/convert-to-srt-online
- Convert to WebVTT: https://subtitletools.com/convert-to-vtt-online
- Subtitle shifter: https://subtitletools.com/subtitle-sync-shifter
- Partial shifter: https://subtitletools.com/partial-subtitle-sync-shifter
- SRT cleaner: https://subtitletools.com/srt-cleaner
- Subtitle merger: https://subtitletools.com/merge-subtitles-online
- Video subtitle extraction: https://subtitletools.com/extract-subtitles-from-video
- Timed lyrics editor: https://subtitletools.com/timed-lyrics-editor
- SUP to SRT: https://subtitletools.com/convert-sup-to-srt-online
- SUB/IDX to SRT: https://subtitletools.com/convert-sub-idx-to-srt-online
- Developer API: https://subtitletools.com/docs/api
- Google AdSense eligibility: https://support.google.com/adsense/answer/9724
- Google AdSense site readiness: https://support.google.com/adsense/answer/7299563
- Google Search spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- Google consent requirements: https://support.google.com/adsense/answer/13554020
