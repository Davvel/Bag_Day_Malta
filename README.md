# Bag Day Malta

A static, installable PWA for Malta and Gozo household kerbside waste collection. Upload all files in this folder to any HTTPS web host; `index.html` must be accessible at the deployment URL. No build step, database server, or API key is required. The service worker and device location require HTTPS (localhost works for local development).

On first use, choose Maltese or English, then allow location access to prefill a suggested locality and confirm it. Manual selection always works. The chosen language and locality are kept in the browser. Tap either flag to change language, or open Settings (the cog) to change locality. The phone's GPS can suggest a change, but never changes the saved locality automatically. Offline, the saved timetable still displays.

If a different locality is detected, tapping Yes opens Settings with that locality preselected. The prompt for that selected/detected pair disappears immediately and does not reappear for 24 hours, even if Settings is cancelled.

Swipe or use the arrows to view upcoming days. The display returns to today after one minute without another day change.

Source: [Waste Collection Malta](https://www.wastecollection.mt/) national collection schedule and September 2026 locality timetable. `data.js` contains the transcribed times for 68 councils. Friday glass collection occurs on the first and third Friday of each month. Put bags out no earlier than four hours before the published collection time. Sunday has no national collection. Times are displayed in Malta time. The timetable is a snapshot: check the official source periodically and update `data.js`, then increase the cache name in `service-worker.js` when publishing changes. Special holiday arrangements or later council notices are not included.

GPS uses a single OpenStreetMap Nominatim reverse lookup when the app opens (and again when re-opened after at least a minute). It needs an internet connection and depends on browser permission and approximate map boundaries. The user confirms all changes. If your usage grows, use a hosted geocoding service under its own usage agreement instead of relying on the public Nominatim endpoint. Maps and geocoding data © OpenStreetMap contributors: https://www.openstreetmap.org/copyright
