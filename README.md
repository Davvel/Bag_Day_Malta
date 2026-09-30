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
Donation_Visible=true
Donation_Text=Finding Bag Day useful?
Donation_Text_MT=Bag Day qed jgħinek?
Donation_Detail=Help us keep developing Bag Day.
Donation_Detail_MT=Għinna nkomplu niżviluppaw Bag Day.
Donation_Button=Support
Donation_Button_MT=Appoġġ
Donation_Link=https://buy.stripe.com/14A3cv6yGbINgZDdEg6sw00
```

`Donation_Visible` is case-insensitive. When it is false, the whole support strip is absent. The visible strip opens the support panel. Device preferences can also hide it. UTF-8/Unicode text is supported.

The configuration is deliberately fetched with a changing query string and `cache: no-store`, and the service worker never caches it, so changing the file on GitHub Pages does not require rebuilding the PWA. GitHub Pages/CDN propagation can still take a short time after a deployment.

### Google Analytics 4
Edit `analytics_config.txt`:

```text
Analytics_Enabled=false
Measurement_ID=G-XXXXXXXXXX
```

Google Analytics 4 works on GitHub Pages; Firebase Hosting is not required. Once enabled with a valid GA4 Measurement ID, the app records these custom events: `donation_click`, `locality_changed`, `gps_used`, `follow_location_enabled`, `current_locality_viewed`, and `language_changed`.

No precise GPS coordinates, names, email addresses, or payment details are sent as custom analytics event parameters by Bag Day Malta.


## v13 mobile cache/layout fix
- CSS and JavaScript are referenced with a release version so installed PWAs do not mix old and new files.
- The service-worker cache was bumped to v13 and old caches are deleted on activation.
- Mobile devices no longer auto-focus the locality search field when Settings opens, avoiding an unwanted keyboard popup.
- The Settings dialog remains scrollable and usable if the on-screen keyboard is opened manually.


## v18 settings and optional support panel
- Settings has distinct Home locality, Location when travelling and Support Bag Day sections. The saved home locality is shown separately from the candidate being searched. The home-save button is in the home section; travel and support choices save immediately. The support checkbox is labelled “Show the Donate/Support us button”.
- The support strip opens a panel only after a tap. It never opens checkout directly or shows itself as a popup.
- The panel thanks the user, explains voluntary support, and offers “Buy us a coffee”. It shows the suggested €2 amount and explains that Stripe requires a separate payment confirmation.
- The coffee button requires both the unchecked cardholder/permission confirmation and the correct answer to a fresh addition sum. Each operand is 1–9, the operator is always +, and the previous pair is excluded each time the panel reopens. The sum stays unchanged while typing or changing language. The answer and permission reset each time the panel opens/closes. The explanation states this helps prevent accidental donations. Wrong or cleared answers immediately disable checkout, and the click handler also verifies both conditions. This reduces accidental taps; children who can solve the sum can still proceed. It does not verify age or identity and cannot guarantee child-proof payments.
- “Hide the support message” saves a preference in localStorage on this browser/device. It can be reversed with “Show the support message” in Settings. These changes save immediately, even if locality settings are cancelled. Clearing browser data resets the preference. Contributions are not tracked or inferred.
- English and Maltese text, Escape/backdrop dismissal, keyboard focus containment and focus restoration are included. Hiding does not require donating.
- The configured Stripe link remains unchanged. Suggested amount, actual limits and checkout fields are managed in Stripe. If the preset changes, update supportPaymentNote in both language dictionaries in app.js.
- donation_prompt_open measures panel opens; donation_click measures checkout opens, never successful payments. Analytics remains off by default.
- Config failure/offline access hides the strip; the cached waste timetable remains available. Donation_Visible=false overrides all device preferences.
- v18 shell/cache references preserve existing language, locality and location preferences while updating the installed PWA.
- Strong customer authentication is controlled by Stripe/banks. Ask Stripe what authentication options apply to this Managed Payments link; app-side confirmation is not a substitute.
- Stripe Managed Payments eligibility for optional tips still needs confirmation from Stripe. Hide the strip using Donation_Visible=false while checking if needed.

### Update on GitHub Pages
Extract this ZIP into your existing project folder, replacing the matching files. Commit and push using GitHub Desktop. Once deployment finishes, reopen or refresh the app with internet access. No build step is needed.
