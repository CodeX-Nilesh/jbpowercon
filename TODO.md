# TODO — replace before launch

## Source material
- [x] Brochure PDF supplied (`JBPPL Profile.pdf`, 2026-10-30) and copied into `/src/source` — company details, mission/vision, director bios, org chart, full machinery list, full test-equipment list, product descriptions and ISO/Udyam/GST certificates have been transcribed into `/src/data/*.json`.
- [x] Factory, machinery and ISO-certificate photos extracted from the brochure, converted to WebP and in use (`src/images/factory/hero.webp`, `floor.webp`, `certificates.webp`).
- [x] Product hero photos extracted from the brochure's "Product Details" pages, converted to WebP and in use (`src/images/products/*.webp`). These are brochure stock-style product shots, not JBPPL's own studio photography — fine for now, but ask the client if they'd prefer dedicated product photography later.
- Team headshots (Adesh Jain, Sumeet Kr Bansal) — brochure has no individual portrait photos, only group/factory-floor shots. Still neutral SVG placeholders (`src/images/team/*.svg`).
- Portfolio and testimonial images — brochure has no case-study or client photos. Still placeholder SVGs.

## Fonts
- [x] Sreda supplied (2026-10-31) as `Sreda.otf`, converted to `src/fonts/sreda-400.woff2` (Regular, the only weight supplied — 35KB). Licence still unverified; TODO: confirm with client before shipping to production. Fallback metrics (`Sreda Fallback` @font-face in `src/css/fonts.css`) were tuned from Sreda's real OS/2 metrics (ascent 75%, descent 25%, cap-height 70%) to minimise layout shift on swap.
- [ ] No bold Sreda file — font-weight:700 requests on "Sreda" fall back to the browser's synthetic/faux bold. Get a real Sreda Bold file if the design calls for true bold display type.
- [ ] `inter-variable.woff2` still missing — body/UI text currently falls back to system-ui (Segoe UI on Windows). Add the real Inter variable file for the intended body-type pairing with Sreda.
- [ ] `arvo-*.woff2` no longer needed in the stack (replaced by a metric-matched local-system fallback, "Sreda Fallback") — can be dropped from future TODOs unless Arvo is wanted as an actual rendered typeface somewhere.

## Data (`/src/data/*.json`) — now sourced from the brochure
- `company.json` — about/mission/vision and ISO certificate numbers (E20251034256, E20251034257) are now real. Still TODO: founded year / incorporation date (not in the brochure's About/Company-Details text), a dedicated history/timeline (brochure has none).
- `products.json` — descriptions, features and applications are now the brochure's own copy. Standards are kept exactly as printed in the brochure (`IS 3G8 (Part-II)`, `IS 70G8 (Part-I)`, `IS 14255`) — these first two are almost certainly OCR/print quirks for `IS 398 (Part 2)` and `IS 7098 (Part 1)` respectively; confirm with the client before correcting. No numeric spec tables (sizes, current ratings, breaking loads, codenames) exist in the brochure at all — still TODO, needs a separate data sheet from the client.
- `machinery.json` — full real 24-item list transcribed (pages 12-13). Kept as printed: mixture machine capacity "75 kg x1, 100 kg x2" against qty 2; compressor capacity unit printed as "PSM" (unusual — confirm with client, likely CFM or PSI).
- `tests.json` — full real 33-item list transcribed (pages 14-15). Kept as printed: item numbers 16 and 17 are absent from the brochure's own numbering (jumps 15 → 18).
- `team.json` — both directors' names, titles and full bios are now real (brochure pages 5-7). The org chart's tiers and reporting lines are confirmed exactly against the brochure's own org chart image (page 8). Still TODO: individual names for Production Manager, Quality Manager, Marketing Manager, Chartered Accountant, Production/Quality Incharge, Market Executive, Accounts Manager, both Shift Supervisors, Accounts Executive — brochure gives titles only, no names.
- `portfolio.json` — **entirely fake**, per project rules; brochure has no project/case-study section. Replace every entry with a real project/client before launch.
- `testimonials.json` — **entirely fake**, per project rules; brochure has no testimonials. Replace every entry with a real customer quote before launch. Never emit Review/AggregateRating JSON-LD from this data.

## Company facts to double-check with client
- [ ] **Udyam registration number conflict, confirmed real (not a hypothetical):** the brochure's "Company Details" text page prints `UDYAM-WB-08-0038083`, but its own Udyam Registration Certificate image prints `UDYAM-WB-08-0070734`. The site currently shows the certificate number as primary (more authoritative — government-issued, QR-coded) with the text-page number flagged alongside it on the About page. Get the client to confirm which is correct, then remove the flagged note.
- [x] ISO 9001:2015 / ISO 14001:2015 certificate numbers — confirmed from both the brochure text (page 4) and the certificate images (page 20): E20251034256 (ISO 9001:2015) and E20251034257 (ISO 14001:2015), issued by Royal Assessments Pvt. Ltd., certified 22/10/2025, valid until 21/10/2028.
- Kept OFF the public site per project rules, but present in the brochure if ever needed internally: PAN (AAGCJ326GB), IEC (AAGCJ3269B), Trade Licence No. 3567, and the Directors' DIN numbers (Adesh Jain 00854066, Sumeet Kr Bansal 02236184).

## Domain
- [ ] Domain `jbpowercon.com` not yet purchased. `SITE_URL` in `src/site.config.json` is a placeholder — update it (and nowhere else) once the real domain is live.

## Legal
- [ ] Privacy Policy content in `src/partials/privacy-dialog.html` is placeholder boilerplate — have it reviewed before launch.
