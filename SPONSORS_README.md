Bag Day Malta v1.0.82

Upload all ZIP contents to the existing GitHub Pages repository, retaining CNAME.

sponsors.csv is the live public schedule. It starts empty to avoid publishing fictional adverts. Copy desired rows from sponsors.example.csv to preview three example slots for Żejtun in October 2026; replace example names and URLs before publishing.
Columns: Month,Year,Locality,Slot,SponsorName,URL
Month: 1–12 (also accepts 'Month 1'); Year: four digits; Locality: use names in data.js (aliases supported); Slot: 1, 2 or 3. Each row represents a full calendar month. Use one row per locality/month/slot. First valid duplicate wins. Invalid URLs and rows are ignored. Only absolute http/https URLs accepted. Names are rendered as text, never HTML. Save UTF-8 CSV; quote fields containing commas.

Sponsors match the date being viewed and selected locality, including when navigating across a month/year boundary. Missing slots are omitted; remaining slots retain their own fixed pastel colours. With no bookings, the heading and whole sponsored section disappear, releasing space to the bag. Small screens and landscape may scroll to preserve readable content.

councils.csv is a separate, independently replaceable public council directory. It now includes all 68 council websites and telephone numbers gathered from official council contact pages (Marsaxlokk main number cross-checked with the Local Councils Association). council_sources.csv records sources, dates, alternative published numbers and notes. Numbers are publication-checked, not called. Tarxien uses its second official number because the first has a country-code typo.

Council columns: Locality,CouncilName,Website,Phone,WhatsApp,WhatsAppMode.
WhatsApp is hidden by default by the BAG_DAY_WHATSAPP_VISIBLE master gate. Retained CSV modes apply only if this gate is explicitly enabled later. WhatsApp fields are blank; do not infer WhatsApp availability from telephone numbers. Replace councils.csv alone via GitHub Desktop without changing sponsorships. Sponsor CSV remains separate and unchanged.

Both CSV files are fetched network-first with cached offline fallback. Replace CSVs via GitHub Desktop when bookings change. Installed PWAs receive the updated version through the service worker; reopen once after update if needed.

This release implements the display engine and CSV schedule, not the public booking/payment/moderation portal. Publish only approved sponsor rows; keep private applicant/payment information out of these public CSVs.

The donation strip is disabled in donation_config.txt for this sponsorship layout.
Validation: JavaScript syntax and sponsor engine behavior checks passed. Browser checks passed for hosted and direct-file preview, sponsor/no-sponsor layouts, small portrait screens and landscape.

Donation_Visible=false is now a master switch. It hides every support entry point, blocks automatic invitations and checkout, and closes an open support dialog when switched off. Missing/unreadable configuration stays disabled. The brand mark remains visible as a non-clickable symbol.


v1.0.82 visual redesign and direct-file preview:
- New realistic organic, mixed and recyclable bag graphics; themed collection cards; dates above the card; clear put-out and start times; compact council contact row and text sponsors.
- Open index.html directly to preview without publishing. Bundled local-preview-data.js contains snapshots of the two CSVs and config files. The game starts locally without fetch preflight; parent/iframe messages support opaque local-file origins while still checking the sending frame.
- To test edited CSVs locally: Settings > Local preview data > Council CSV or Sponsor CSV. Selections are saved in this browser only. Use bundled CSVs resets these imports. On GitHub Pages the app reads the separate real CSVs normally; local imports never affect the hosted version.
- Live sponsors.csv remains empty. sponsors.demo.csv and sponsors.example.csv contain Sponsor 1, 2 and 3 for all 68 localities in October–December 2026, linking to https://www.wsm.com.mt/. Direct-file preview uses these automatically and displays 1, 2, 3 slots cyclically by day (October 12=3, 13=1, 14=2). This is a labelled demo display rule; bookings remain monthly. Importing a sponsor CSV bypasses the demo rotation and displays the actual monthly bookings. Reset local imports to return to the demo. Do not publish fictitious sponsor bookings.
- Donations stay off. For direct-file preview, config snapshots in local-preview-data.js control the switch; on hosting donation_config.txt controls it. Both currently have Donation_Visible=false. The top-left bag mark is non-clickable.
- WhatsApp is hidden. Council and sponsor CSVs remain independently replaceable.

1.0.82: AM/PM suffixes, botanical organic card, realistic glass bottles in a reusable teal container, enhanced council identity and Free bulky refuse call label. Phone defaults to the council contact number; an optional BulkyTelephone column takes precedence for dedicated booking numbers.

v1.0.82: Bulky Refuse Collection opens an accessible panel with household service guidance, selected council/locality, a visible selectable phone number and a blue tel: button. Close with X, Escape, outside tap or browser/phone Back. Contact comes from councils.csv; optional BulkyTelephone overrides Phone, otherwise the panel accurately describes it as the council number. Shared council-neighbourhood artwork appears below the council buttons. WhatsApp and donations remain hidden.
Guidance sources checked 11 October 2026: https://www.wsm.com.mt/en/bulky-waste and https://zejtunlc.gov.mt/en/contact-us/ . Dates, accepted items and placement instructions must be confirmed with the council; no council-specific limits have been invented.

The bulky panel also links directly to https://localgovernment.gov.mt/articles/bulky-refuse-collection-from-your-doorstep/ (checked 11 October 2026).

v1.0.82: Shared council skyline backdrop replaces the separate picture strip, saving 57px. On glass days, bag and reusable glass container occupy one row in the same card height, with collection timings below.

v1.0.82: Consistent sponsored card height calculated with a reserved three-slot footprint, regardless of actual sponsor count or bag type. No-sponsor days still reclaim space. Absolute contained artwork cannot stretch the card. Verified equal card heights for organic, mixed and glass days and sponsor bottom within a 390x844 viewport. Very short screens retain scrolling for readable controls.

v1.0.82: The 1 Minute Sorting Game has a shared stopwatch/three-bin SVG identity and a two-line lobby title. Bulky refuse panel shortened to booking contact, visible number, call button, three concise steps and a single icon-link row. Verified no internal scrolling at 390x844 and 320x568, local game title/startup, Back/X close, CSV import, consistent day cards and sponsor visibility.

v1.0.82: Free Bulky Refuse Collection title, redundant contact/free-service/dial-yourself captions removed. Call To Book with Local Council button; larger 16px instructions and 13px icon-link labels (15px instructions on short screens). Local phone, Back/X and no-scroll panel verified at 390x844 and 320x568.

v1.0.82 supersedes local CSV import instructions above: public Settings contains no import/reset controls. Stored preview CSV overrides are ignored. Direct-file preview uses bundled snapshots; hosted app continues reading independent councils.csv and sponsors.csv. Demo sponsors remain in the local snapshot.

v1.0.82 supersedes demo rotation and empty-live-CSV notes: sponsors.csv contains 18 rows for October–December 2026: Żejtun slots 1–3, Kalkara slots 1–2, San Pawl il-Baħar slot 1, no other locality. Each row is one sponsor/locality/calendar month. Names Sponsor 1/2/3 and links https://www.wsm.com.mt/. Same data bundled for local-file preview. Heading is Sponsored; no daily rotation.
