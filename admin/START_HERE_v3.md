# Update instructions

Replace the existing admin folder contents in your Bag Day GitHub repository with this ZIP's admin folder. Commit and push. No CNAME file is included. This release is Admin v1.0.2, distributed as ZIP v3.

Close all admin tabs and the installed Admin PWA, then reopen https://bagdaymalta.eu/admin/ after GitHub Pages deploys. If necessary, refresh with Ctrl+F5. Confirm v1.0.2 appears on the screen. The new Generate sponsor CSVs button is in the top header after login.

If you configured Google login in your local assets/config.mjs, carry your real googleClientId into the new config before uploading. Keep any intentionally changed API/exporter addresses too; do not copy an older config wholesale over the new file's version and exporter setting.

# Bag Day Admin PWA v3

17 October 2026. A static admin PWA for GitHub Pages, connected to the deployed API at https://bagday-admin-api.davvel.workers.dev. This replaces the earlier browser-local demo. It contains no password or Cloudflare secret.

## Upload into your existing Bag Day project

This package is prepared for **https://bagdaymalta.eu/admin/**. No separate repository, new domain or DNS change is needed. There is no CNAME file in this package.

1. Create an `admin` folder in the existing Bag Day repository.
2. Copy the contents of this extracted folder into `admin`, so the file is `admin/index.html`, not `admin/Bag_Day_Admin_PWA_v3/index.html`.
3. Commit and push using GitHub Desktop.
4. Wait for GitHub Pages to finish publishing, then open https://bagdaymalta.eu/admin/.

Keep all existing root files and the public application's root CNAME unchanged. Do not replace the public site's index.html, manifest or service worker; these new files belong inside admin.

The API already allows https://bagdaymalta.eu. No API origin update is required for this address. The /admin/ path is not part of the origin.

All asset paths, manifest start/scope and service-worker registration are relative. The admin service worker is scoped to /admin/ and its cache uses an admin-specific name. An existing public app service worker scoped to / can still affect requests to /admin/; if you see the public app instead of the admin screen, check that root worker's navigation fallback and exclude /admin/ as needed. Do not remove the public worker blindly.

## 4 Sign in and start small

Open https://bagdaymalta.eu/admin/. Sign in with emergency ADMIN and the password you provisioned. The password is not in this ZIP.

1. Add one locality.
2. Add one sponsor with advert text and an optional hosted image URL.
3. Allocate one month in one locality and confirm the preview.
4. Refresh the list and confirm the saved record.
5. Repeat the same allocation to see the duplicate report.

These are real D1 writes. Bulk cancellation and deletion have confirmation steps. Sponsors/localities with slot history are protected from deletion; deactivate them instead.

## Available screens

- Overview: counts and quick navigation.
- Localities: manual add/edit/delete, selection, CSV template/import preview/upsert and export.
- Sponsors: private contacts, text/banner preview, manual editing, CSV upserts and selected deletion.
- Slot allocations: one sponsor, selected/all active localities, inclusive month range, fixed or first-free position, approval status, preview and detailed outcomes.
- Existing slots: filter by sponsor/month/status, edit individual slots, delete selected or all active slots for one sponsor. Delete retains cancellation history.
- Access: view verified pending Google users and approve/block/reject individually.
- Settings: monthly capacity and emergency ADMIN password change.

The first release renders table records in scrollable tables and wraps forms on mobile. It starts at the capacity supplied by the API, not a hardcoded three-position ceiling.

## Bulk rules and limits

One record represents a whole calendar month. Five localities over one month mean five candidates. No daily windows, prorating or partial-month positions.

An already assigned sponsor/locality/month is skipped. A selected position held by another sponsor is a conflict. Valid available candidates are inserted and every candidate receives an outcome. A concurrent conflict can reject the transaction; refresh preview and retry.

CSV imports: maximum 200 data rows and a file below 200 KB, constrained also by the API's 256 KiB JSON limit. Allocations: maximum 200 locality-month candidates per request; split bigger selections. Selected locality/sponsor deletion: maximum 200 per request. Large slot cancellations are automatically divided into API batches of 90, with progress retained within the confirmation dialog if interrupted. Each database batch is atomic; a multi-batch cancellation can partially finish before an interruption and tells you so.

CSV template headers match the API schema. Existing public sponsors.csv headers are also recognised and mapped. active accepts true/false or 1/0. Exported IDs let you update the same records on later imports. Sponsor imports with blank IDs create new records. Blank optional fields clear values; omitted fields are preserved on updates. Unknown columns and malformed CSV are rejected locally. Server previews report row-level validation issues before you confirm.

Result reports include attempted, inserted, updated, skipped, conflicted, invalid, blocked/deleted/cancelled counts where applicable. CSV row numbers shown in the screen include the header row. A downloadable report provides the underlying outcomes.

Bulk retries reuse the pending idempotency key for the same unchanged action while this page remains open. Do not refresh or close the page during an unknown write outcome: keys are kept in memory, not durable storage. If the page was closed, first inspect saved records before submitting again. Completed allocation retries remain protected by duplicate constraints. For single-record creates, a stable draft ID is reused while the form remains open; a duplicate response after a connection error means you should refresh the list rather than create another record.

## Google login later

The API is currently deployed with no Google client ID. The PWA displays that clearly and offers ADMIN login. Do not enter an invented client ID.

When ready, create the Google OAuth web client, register https://bagdaymalta.eu as an authorised JavaScript origin (without /admin/), add the same real client ID to the Worker's GOOGLE_CLIENT_ID variable AND assets/config.mjs googleClientId, and republish both configurations. A new verified account first appears as pending; ADMIN approves it in Access. This is not email-based automatic account linking. Facebook is not included in this release.

## PWA behaviour and updates

The manifest and icons support installation. On supported desktop Chromium browsers an Install PWA button appears after the browser offers installation; on iPhone use Share > Add to Home Screen. Installation availability depends on browser requirements and HTTPS. The service worker caches a fixed allowlist of interface files only, never API responses or private records.

All private reads and writes require connectivity. Login tokens stay in memory, so page refresh, app restart or closing the page requires sign-in again. No password, token or private table is put into localStorage, IndexedDB or the service-worker cache. Browser developer tools and OS/browser caches are outside the application's control; private API responses use Cache-Control: no-store.

New releases should increment CONFIG.version and the service-worker CACHE version. The new worker waits until the old app is closed, avoiding forced replacement while editing. Close all admin tabs and reopen if an update is waiting. The admin service-worker scope is /admin/; it cannot control the public app outside that path. A root-scoped public worker can still intercept initial admin requests, so test that interaction.

## Generate sponsor CSVs

A Generate sponsor CSVs button is available in the header on every signed-in screen. Click it after saving changes. It uses the current administrator session, calls the separate exporter and shows sponsor/slot counts, Malta publication time and links to both CSVs from the same version.

Install Bag_Day_Midnight_CSV_Exporter_v1 first. The default exporter address is configured as https://bagday-sponsor-export.davvel.workers.dev, matching the proposed Worker name and your existing account's workers.dev subdomain. Check the actual worker_url in the exporter's deployment_v1.json. If it differs, change exporterBase in assets/config.mjs before publishing this frontend. No password or installation secret is placed in the frontend.

This button does not redeploy the API, modify D1 tables or replace the midnight schedule. The exporter validates the existing ADMIN/Google administrator session through the API. Up to three manual rebuilds per minute are allowed by the exporter's rate limiter. A timeout is an unknown outcome; the export may still finish. Check the current manifest before retrying.

The public Bag Day app is not modified by this admin release. Published Cloudflare files only drive public sponsor display after the public app is integrated with the exporter. Until then, the two links can be used to inspect/download the generated files.

## Verification

JavaScript syntax checks and six automated frontend helper tests passed: CSV special characters/validation, month ranges, escaping/quoting, idempotent retry keys and paginated fetches. The existing API previously passed its nine automated tests and your live read/login checks.

The export-button helper additionally passed mocked authentication, path validation, success and failure checks. Browser visual testing was unavailable in this environment; end-to-end browser interaction, real Google login, custom-domain setup and real D1 writes from this new frontend still need testing after you publish it. No live records were changed while building this ZIP.

Optional local helper tests with Node.js: `node --test tests/*.test.mjs`. Opening index.html as file:// is not supported; use HTTPS GitHub Pages or a local HTTP server with the appropriate API allowed origin.

Official GitHub references:
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
