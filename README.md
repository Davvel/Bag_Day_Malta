# Bag Day Malta

A static, installable PWA for Malta and Gozo household kerbside waste collection. Upload all files in this folder to any HTTPS web host; `index.html` must be accessible at the deployment URL. No build step, database server, or API key is required. The service worker and device location require HTTPS (localhost works for local development).

On first use, the app starts in English and asks for location access to prefill a suggested locality for confirmation. Manual selection always works. The chosen language and locality are kept in the browser. Tap either flag to change language, or open Settings (the cog) to change locality. The phone's GPS can suggest a change, but never changes the saved locality automatically. Offline, the saved timetable still displays. The app includes black bag PNG home-screen icons for Android and Apple devices.

If a different locality is detected, tapping Yes opens Settings with that locality preselected. The prompt for that selected/detected pair disappears immediately and does not reappear for 24 hours, even if Settings is cancelled.

Swipe or use the arrows to view up to 30 days ahead. The display returns to today after one minute without another day change. On the first and third Fridays, the card shows both the organic waste bag and a reusable carrier with glass bottles.

Source: [Waste Collection Malta](https://www.wastecollection.mt/) national collection schedule and September 2026 locality timetable. `data.js` contains the transcribed times for 68 councils. Friday glass collection occurs on the first and third Friday of each month. Put bags out no earlier than four hours before the published collection time. Sunday has no national collection. Times are displayed in Malta time. The timetable is a snapshot: check the official source periodically and update `data.js`, then increase the cache name in `service-worker.js` when publishing changes. Special holiday arrangements or later council notices are not included.

GPS uses a single OpenStreetMap Nominatim reverse lookup when the app opens (and again when re-opened after at least a minute). It needs an internet connection and depends on browser permission and approximate map boundaries. The user confirms all changes. If your usage grows, use a hosted geocoding service under its own usage agreement instead of relying on the public Nominatim endpoint. Maps and geocoding data © OpenStreetMap contributors: https://www.openstreetmap.org/copyright

## New in this build

### Location behaviour
Settings now has two modes:
- **Keep my chosen locality** (default): travelling does not silently replace the saved locality.
- **Follow my current location automatically**: when GPS detects a different locality, the app displays that locality's schedule while preserving the saved locality.

When follow mode is off and another locality is detected, the prompt can temporarily show the detected locality without changing the saved one.

### Donation/support strip
Edit `donation_config.txt` only:

```text
Donation_Visible=false
Donation_Text=❤️ Enjoying Bag Day Malta? Buy us a coffee ☕ — it will make our day.
Donation_Link=https://www.paypal.com/
```

`Donation_Visible` is case-insensitive. When it is false, the whole support strip is absent. The entire visible strip is clickable. UTF-8/Unicode text is supported.

The configuration is deliberately fetched with a changing query string and `cache: no-store`, and the service worker never caches it, so changing the file on GitHub Pages does not require rebuilding the PWA. GitHub Pages/CDN propagation can still take a short time after a deployment.

### Google Analytics 4
Edit `analytics_config.txt`:

```text
Analytics_Enabled=false
Measurement_ID=G-XXXXXXXXXX
```

Google Analytics 4 works on GitHub Pages; Firebase Hosting is not required. Once enabled with a valid GA4 Measurement ID, the app records these custom events: `donation_click`, `locality_changed`, `gps_used`, `follow_location_enabled`, `current_locality_viewed`, and `language_changed`.

No precise GPS coordinates, names, email addresses, or PayPal details are sent as custom analytics event parameters by Bag Day Malta.


## v13 mobile cache/layout fix
- CSS and JavaScript are referenced with a release version so installed PWAs do not mix old and new files.
- The service-worker cache was bumped to v13 and old caches are deleted on activation.
- Mobile devices no longer auto-focus the locality search field when Settings opens, avoiding an unwanted keyboard popup.
- The Settings dialog remains scrollable and usable if the on-screen keyboard is opened manually.
