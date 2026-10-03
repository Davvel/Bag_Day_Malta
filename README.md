# Bag Day Malta

A static, installable PWA for Malta and Gozo household kerbside waste collection. Upload all files in this folder to any HTTPS web host; `index.html` must be accessible at the deployment URL. No build step, database server, or API key is required. The service worker and device location require HTTPS (localhost works for local development).

On first use, the app starts in English and asks for location access to select an initial home locality when no home is saved. Manual selection always works. The app is English only. The chosen locality is kept in the browser. Open Settings (the cog) to change locality. The phone's GPS can suggest a change, but never changes the saved locality automatically. Offline, the saved timetable still displays. The app includes black bag PNG home-screen icons for Android and Apple devices.

If a different locality is detected with follow mode off, tapping View temporarily displays its schedule without changing home. The prompt is dismissed for 24 hours.

Swipe or use the arrows to view up to 30 days ahead. The display returns to today after one minute without another day change. On the first and third Fridays, the card shows both the organic waste bag and a reusable carrier with glass bottles.

Source: [Waste Collection Malta](https://www.wastecollection.mt/) national collection schedule and September 2026 locality timetable. `data.js` contains the transcribed times for 68 councils. Friday glass collection occurs on the first and third Friday of each month. Put bags out no earlier than four hours before the published collection time. Sunday has no national collection. Times are displayed in Malta time. The timetable is a snapshot: check the official source periodically and update `data.js`, then increase the cache name in `service-worker.js` when publishing changes. Special holiday arrangements or later council notices are not included.

GPS uses a single OpenStreetMap Nominatim reverse lookup when the app opens (and again when re-opened after at least a minute). It needs an internet connection and depends on browser permission and approximate map boundaries. GPS only establishes a home when none is saved; manual home selections save immediately. If your usage grows, use a hosted geocoding service under its own usage agreement instead of relying on the public Nominatim endpoint. Maps and geocoding data © OpenStreetMap contributors: https://www.openstreetmap.org/copyright

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
Donation_Detail=Help us keep developing Bag Day.
Donation_Button=Support
Donation_Link=https://buy.stripe.com/9B6dR9bT08wB6kZ7fS6sw01
```

`Donation_Visible` is case-insensitive. When it is false, the whole support strip is absent. The visible strip opens the support panel. Device preferences can also hide it. UTF-8/Unicode text is supported.

The configuration is deliberately fetched with a changing query string and `cache: no-store`, and the service worker never caches it, so changing the file on GitHub Pages does not require rebuilding the PWA. GitHub Pages/CDN propagation can still take a short time after a deployment.

### Google Analytics 4
Edit `analytics_config.txt`:

```text
Analytics_Enabled=false
Measurement_ID=G-XXXXXXXXXX
```

Google Analytics 4 works on GitHub Pages; Firebase Hosting is not required. Once enabled with a valid GA4 Measurement ID, the app records these custom events: `donation_click`, `locality_changed`, `gps_used`, `follow_location_enabled`, `current_locality_viewed`.

No precise GPS coordinates, names, email addresses, or payment details are sent as custom analytics event parameters by Bag Day Malta.


## v13 mobile cache/layout fix
- CSS and JavaScript are referenced with a release version so installed PWAs do not mix old and new files.
- The service-worker cache was bumped to v13 and old caches are deleted on activation.
- Mobile devices no longer auto-focus the locality search field when Settings opens, avoiding an unwanted keyboard popup.
- The Settings dialog remains scrollable and usable if the on-screen keyboard is opened manually.


## v23 circular tip choices
- Settings has Home locality, Location when travelling and Support Bag Day sections. Home locality is a single native dropdown, with no repeated saved-home/GPS text or save button. Selecting a locality saves immediately and leaves Settings open. GPS selects the initial home only if none has been saved; manual choices made during GPS lookup take priority, and later GPS detections never replace the saved home. If GPS is unavailable, choose from the dropdown. Travel and support choices also save immediately. The support checkbox is labelled “Show the Donate/Support us button”.
- The support strip opens a panel only after a tap. It never opens checkout directly or shows itself as a popup.
- The panel uses “Glad you found this app useful.”, a small coffee cup with “Buy us a Coffee”, the sum explanation and four circular tip buttons (€2/€5/€10/€20). “Thank you for your tip.” appears underneath. “Hide the Donate Button” sits at the bottom; preference/settings and payment confirmation helper text is removed. Each amount opens the configured Stripe link with prefilled_amount in euro cents (200/500/1000/2000). Customers can still change it on Stripe. The link must use customer-chooses-what-to-pay pricing in EUR and allow all four amounts. No API keys or server are required.
- All four tip buttons require only the correct answer to a fresh addition sum. The cardholder/permission checkbox is removed, and the panel text is shortened. Each operand is 1–9, the operator is always +, and the previous pair is excluded each time the panel reopens. The sum stays unchanged while typing. The answer resets each time the panel opens/closes. The explanation states this helps prevent accidental donations. Wrong or cleared answers immediately disable checkout, and the click handler also verifies the answer. This reduces accidental taps; children who can solve the sum can still proceed. It does not verify age or identity and cannot guarantee child-proof payments.
- “Hide the support message” saves a preference in localStorage on this browser/device. It can be reversed with “Show the support message” in Settings. These changes save immediately, even if locality settings are cancelled. Clearing browser data resets the preference. Contributions are not tracked or inferred.
- English and Maltese text, Escape/backdrop dismissal, keyboard focus containment and focus restoration are included. Hiding does not require donating.
- The configured Stripe link remains unchanged. Suggested amount, actual limits and checkout fields are managed in Stripe. If the preset changes, update the relevant English text in app.js.
- donation_prompt_open measures panel opens; donation_click measures checkout opens, never successful payments. Analytics remains off by default.
- Config failure/offline access hides the strip; the cached waste timetable remains available. Donation_Visible=false overrides all device preferences.
- v24 shell/cache references preserve existing locality and location preferences while updating the installed PWA.
- Strong customer authentication is controlled by Stripe/banks. Ask Stripe what authentication options apply to this Managed Payments link; app-side confirmation is not a substitute.
- Stripe Managed Payments eligibility for optional tips still needs confirmation from Stripe. Hide the strip using Donation_Visible=false while checking if needed.

### Update on GitHub Pages
Extract this ZIP into your existing project folder, replacing the matching files. Commit and push using GitHub Desktop. Once deployment finishes, reopen or refresh the app with internet access. No build step is needed.

## v24 English only

- All interface text and dates use English, including for visitors who previously selected Maltese.
- Removed both language flags, the language picker, Maltese interface translations and unused flag assets.
- Updated offline cache and shell asset versions consistently to v24.

## v27 splash — app version 1.0.2

The splash uses a dark navy background, a prominent blue border and thick light outlines on all three bags. The larger, shorter text asks “Which waste bag goes out today?” and explains “See your locality’s collection time.” It displays for 6 seconds in total, including a 0.6-second fade with a gentle zoom and blur. Touch/click dismisses it instantly, including during the fade. It appears only once per browser tab session; refreshing goes straight to the app. Opening a new tab/session shows it again. Reduced-motion preferences disable animation.

## v28 illustrated bags — app version 1.0.3

Original SVG bag illustrations show common contents on the splash and homepage. The white bag shows food scraps, the grey bag shows packaging, and a printed example panel on the opaque black bag shows residual waste. Tap any scheduled bag or glass container for an animated, scrollable sorting guide. Close with the cross, a tap outside or Escape. The close button remains visible during scrolling. Keyboard focus stays in the dialog and returns to the bag on close.

Common examples are summarised from https://www.wsm.com.mt/en/newguide and checked on 1 October 2026. The lists are not exhaustive; the popup links to WasteServ’s full current guidance. All guide data and illustrations are precached for offline use.

## v29 simpler artwork — app version 1.0.4

Each bag now has one large illustration drawn directly onto its surface: a yellow banana peel on the white bag, a plastic bottle on the grey bag and a nappy on the black bag. No inset panel or cutaway. Glass collection shows one glass bottle in a reusable container. Splash, homepage and sorting panels use the same updated assets.

## v30 rounded bags and full lists — app version 1.0.5

Rounder bag silhouettes. Large green recycling arrows on the grey bag. A visibly dirty takeaway carton on the black bag, because clean milk and juice cartons are recyclable. The deeper reusable glass container holds three intact bottles; broken glass is excluded from that collection. The organic bag retains the yellow banana peel.

The sorting panels include every item from the four waste-type lists at https://www.wastecollection.mt/, grouped for reading. Duplicate plastic bottle and sanitary item entries appear once. Food-soiled paper wording follows WasteServ’s guidance. Lists checked 1 October 2026.

## v31 milk-carton artwork — app version 1.0.6

The mixed-waste bag uses the requested milk-carton symbol. Sorting lists retain the official classification: milk and juice cartons belong in recycling.

## v32 compact homepage — app version 1.0.7

The homepage uses the available viewport height and scales the collection artwork to fit. Locality, Home/Auto mode, abbreviated date and Today share a compact row. Long locality names shorten visually, with the full name available in Settings and the time-info popup. All bag labels remain visible. A circled i on each bag opens its full guide.

Collection time, AM/PM and earliest put-out time share one line. Tap the circled i beside the time for full-date information, the four-hour rule, notices and the official schedule link. Glass-container guidance stays in the glass popup. Navigation arrows and a gentle nudge every 30 seconds replace swipe instructions. The nudge is suppressed while a dialog is open and for reduced-motion users. Settings contains © 2026 ZejtunSoft and the version.

## v33 gestures — app version 1.0.8

- Closely grouped pictures, “Click Bag for Info”, and waste labels; bag info badges removed.
- Larger responsive locality, mode, date and day badge.
- Every ten seconds the bags jiggle and a drawn hand taps the first picture. Reduced motion disables this cue.
- Drag the white day panel sideways to navigate. Short drags spring back, and Today / day 30 resist further dragging.
- Pull down about 100–150 pixels on the homepage to open Settings; a coloured Settings cue appears during the pull.
- Settings slides down on opening. A substantial swipe on its header dismisses it upward or downward. The body scrolls normally; pulling outward at either scroll boundary also dismisses it.
- Settings keeps its X / Done controls and keyboard focus handling.
- Six-second, once-per-tab splash and existing sorting guides retained.

Replace the app files in your GitHub Pages repository and retain your existing CNAME file for bagdaymalta.eu.

## v34 support update — app version 1.0.9

- The support panel automatically opens once per 30 days when the app is used, after the splash and locality setup. Manual opening also starts a fresh 30-day reminder period.
- Settings → Support button and monthly reminder: turning this off hides both for 30 days. The date they return is displayed. Turning it on clears the pause immediately and allows the reminder again after Settings closes.
- The previous permanent hide preference becomes a 30-day pause on update.
- No maths question or hide option appears in the support modal.
- €2 / €5 / €10 / €20 buttons open an animated confirmation panel. Drag the slider handle fully right and release to open Stripe with that amount. A partial drag resets; tapping the track does not confirm.
- Cancel, the X, tapping outside, or Escape closes the panel and returns home.
- Keyboard access: focus the slider, use arrow keys to move it, and press Enter at the end.
- Preferences and reminder dates are saved on this device/browser. Existing bag guides, gestures, and once-per-tab splash remain.


## v35 — app version 1.0.10
- Centred SVG close crosses in all panels.
- The full support heading stays on one line with a font size matched to the panel width.
- Added a small code icon beside ZejtunSoft in both support steps.

- Configured GA4 Measurement ID G-2P58GJJQT8. Optional Google Analytics consent blocks tag loading before acceptance and after decline. Revoke from Settings; withdrawal clears Analytics cookies and reloads. Google Signals and ads personalization are disabled. GPS coordinates, locality names and payment details are not sent by custom events. Donation events measure intent, not successful Stripe payment.


## v36 — app version 1.0.11
- Use the supplied original ZejtunSoft artwork as a compact icon before the name. CSS frames the Z portion; the source artwork is unchanged.
- Centre the single-line support heading in both donation steps.

## Version 1.0.12 — clearer collection instructions
Mixed-waste artwork now shows a grease-stained pizza box. The day and date are centred above the bag. The bottom panel reads “Put your bag outside between [earliest time] and [collection time]”, then “Collection starts at [time]”. Times continue to use the locality timetable, including Saturday overrides and the existing four-hour window. The existing collection information popup remains available. Assets and the offline cache are updated to v37.

## Version 1.0.13 — a single sliding card
Locality and location-mode chip are centred inside the card above the day and date. The whole heading moves with the bag and collection times during touch swipes and day transitions. The location-mode chip remains interactive. The app header, navigation arrows and support banner stay fixed. Offline assets use cache v38.

## Version 1.0.14 — larger, clearer text
Compared with v1.0.13, locality text increases 25%; the location chip, day, date, put-out instruction, collection line and information icon increase 10%; the permitted time window increases 15%. Waste label, bag artwork and support banner stay the same. The hint now reads “Tap bag for info”. Compact screen sizes receive the same proportional increases. The heading still moves with the card and the existing information popup remains available. Offline cache and shell assets use v39.

## Version 1.0.15 — alphabetical locality picker
The home-locality picker now lists all Malta and Gozo localities together in alphabetical order, using accent-insensitive sorting for Maltese characters. Stored selections and locality timetable rows remain unchanged. Offline cache and shell assets use v40.

## Version 1.0.16 — larger locality headings
Locality headings are another 25% larger than v1.0.15. Long names fit the available width beside the unchanged Home/Auto/Away chip, with font size reduced only when needed to prevent clipping. The title refits when the locality or viewport changes. All other text sizes remain unchanged. Offline cache and assets use v41.

## Version 1.0.17 — complete cumulative release
This ZIP contains the entire project, including all illustrated icons, timetable and sorting-guide data, live donation and analytics configuration, and the offline service worker. Includes alphabetical localities, the dirty pizza box, larger text and locality headings, the sliding locality/day/date heading, and the collection window wording with the existing information popup. The splash screen, Settings credit, shell asset URLs, offline cache and ZIP filename all identify version 1.0.17.

To install this release: extract the ZIP, copy all files and the icons folder into the existing repository root, and replace existing files. Commit and push with GitHub Desktop. After GitHub Pages completes deployment, reopen or refresh the app.

## Version 1.0.18 — considerate support invitations
Automatic support invitations require at least 72 hours since first use and use on three distinct Malta calendar dates, stored locally. An eligible invitation is scheduled two seconds after bag information closes or the user navigates from a future day back to Today. It is skipped if the user is interacting, another dialog is open, or the page is hidden; no launch or idle timer forces an invitation. Automatic display and completing the Stripe confirmation slide each pause automatic invitations for 30 days. Manual Support remains available during that pause and from first use. Settings disables both the button and invitations until re-enabled. Active earlier hide preferences are preserved on upgrade. Usage records are local only and private browsing sessions may forget them. Splash, Settings, cache and shell URLs identify 1.0.18.

## Version 1.0.19 — support preference analytics
Settings emits `support_disabled` when Support is switched off and `support_enabled` when switched on. Events include the interface language and are sent only on actual preference changes, with Analytics consent and Analytics loaded. Opening Settings, rendering and restoring saved preferences do not emit these events. Existing support invitation timing and cooldowns are preserved. Splash, Settings, cache and shell URLs identify 1.0.19.

## Version 1.0.20 — first-use welcome wizard
New installs use a three-step animated modal: confirm home locality (GPS suggestion or alphabetical picker), choose Auto/Home using homepage chip colours and typography, and actively allow or decline optional Google Analytics. The analytics step explains the shared benefit and includes cookie, data and privacy-policy details. Analytics stays off until accepted. Draft selections and step progress survive refreshes; a late GPS response never replaces an existing selection. Existing installs with a saved locality skip the wizard and retain their preferences. Completed setup briefly confirms success and opens the dashboard. Settings still edits all choices. Keyboard focus stays within the wizard, small screens can scroll, and reduced-motion preferences remove transition animations. Splash, Settings, cache and shell URLs identify 1.0.20.

## Version 1.0.21 — one analytics consent prompt
Removed the old analytics consent banner, its click handlers and its styles. First-use analytics consent is requested only in step 3 of the welcome wizard. No thanks appears on the left and Allow analytics on the right, with equal visual prominence. Either answer is saved and remains editable in Settings. No separate analytics migration prompt is shown. Splash, Settings, cache and shell URLs identify 1.0.21.

## Version 1.0.22 — clearer day navigation
Navigation buttons now sit beneath the date and show the full names of the neighbouring weekdays, alongside directional arrows. Their accessible labels include the destination date. Today and the 30-day limit remain enforced. A first-use callout highlights the next-day button and explains how to see tomorrow’s bag; the first successful day change by button, swipe or keyboard dismisses it permanently in local storage. It appears after the welcome wizard or splash, and honours reduced-motion preferences. Header spacing is measured to avoid overlap; short landscape screens show the heading and navigation beside the bag. Splash, Settings, cache and shell URLs identify 1.0.22.

## Version 1.0.23 — date bar and calendar
A softly coloured date bar groups previous day, the full date button, and next day. The entire centre date area opens a matching calendar modal. Selectable dates run from Malta Today through Today + 30 days inclusive; past dates and dates beyond that range are disabled. The viewed day is highlighted, Today has a shortcut, and month navigation is limited to relevant months. Calendar keyboard arrows move between valid dates, Tab stays within the modal, and Escape restores focus to the date button. Day selection uses the existing slide animation; side navigation controls hide and are disabled during both swiping and transitions, then return with updated labels. The first-use navigation hint is removed. Long weekday/month labels fit small widths. Splash, Settings, cache and shell URLs identify 1.0.23.

## Version 1.0.24 — clearer controls and refined cards
The selected weekday appears once above the date bar, with a small Today/Tomorrow marker when applicable. The centre calendar button shows the day and month, with a subtle border, white surface and larger calendar icon. Neighbouring day labels are 20% larger, with responsive layout for long names. Future days offer a Back to Today shortcut, disabled during transitions. On taller screens the bag group moves slightly closer to the date bar. The main collection card has a fine border, soft layered shadow and rounded corners; the Support card receives matching corner and shadow refinements. Calendar range, swiping, keyboard controls and transition behaviour are preserved. Splash, Settings, cache and shell URLs identify 1.0.24.

## Version 1.0.25 — simple day headings and guided setup choices
The main heading shows Today for today, and just the weekday for other dates. Small relative-day labels and the homepage return button are removed. No-collection messages name the selected weekday (for example, No collection on Sunday); existing spacing remains unchanged and no extra explanatory text is added. The calendar now has a prominent full-width Go Back to Today button.
Step 2 of setup explicitly asks users to tap one option. Both full-card choices show circular selection indicators and a checkmark, stronger border and tinted background when selected. Next requires a choice. After three seconds without a choice, a white-glove cue demonstrates tapping Auto then Home once, without changing the selection. Choosing or leaving the step cancels it immediately; saved choices do not get a cue. Reduced-motion users get a still hand beside the instruction. Splash, Settings, cache and shell URLs identify 1.0.25.

## Version 1.0.26 — recognisable day buttons and repeating setup cue
Previous and next day buttons now have distinct rounded surfaces, blue-grey borders and a subtle shadow, with visible hover/press feedback. Unavailable buttons use muted colours and no shadow. Narrow-screen column spacing preserves long weekday labels. The setup glove first appears after three seconds without a choice, demonstrates Auto then Home, and repeats five seconds after each animation ends while no choice is made. Selection or leaving the step cancels both the animation and pending repeats; hiding the app pauses the cue and returning resumes it. Reduced-motion users retain the still-hand cue. Splash, Settings, cache and shell URLs identify 1.0.26.

## Version 1.0.27 — locality picker and quieter Support reminders
Tap the locality heading to open a searchable, alphabetically sorted locality picker. Selecting a locality immediately displays its schedule without changing the saved home or Auto/Home setting. A manual view takes priority over automatic GPS updates until the mode chip is tapped or a Settings locality/mode change is made. The displayed chip is Home for the saved home, Auto for the GPS locality, and Away otherwise. The picker supports keyboard focus, Escape, background dismissal, and reduced motion.

This release replaces earlier Support hiding and reminder rules: the Support button is always available when donation configuration is enabled, and its hiding setting is removed. Automatic invitations require five days since first use, the last automatic invitation, or a manual Support opening, followed by about one minute of visible app use. Completing the donation slide records an attempted donation locally and changes the interval to 30 days; payment completion is not inferred. Later manual openings, automatic invitations, and slides restart the applicable interval. Background time does not count, and invitations wait until other dialogs and day transitions finish. Settings analytics consent is unchanged; obsolete support on/off events no longer occur. These local timestamps/preferences can be forgotten when browser data is cleared. Splash, Settings, cache and shell URLs identify 1.0.27.

## Version 1.0.28 — whole-card swiping and appearance choices
The day card owns its rounded surface, thin border and shadow, so all three move with its locality, date navigation, bag and collection timing. The stationary stage is transparent and has no border/shadow. Swiping exposes the contrasting page background beneath the card. Previous/next controls remain visible on the moving card; repeated navigation is blocked until the transition settles. Finger drags follow the card, short/cancelled drags settle back, and bounds remain Today through Today + 30 days. Reduced-motion users get a brief fade between days.

Settings → Appearance offers System (default), Light and Dark, remembered locally. System follows device preference changes; explicit Light/Dark choices override them. An early theme selection avoids flashing a light page on dark launches. Dark colours cover the main card, date controls, settings, locality picker, calendar, waste/time information, support/slider and welcome wizard while preserving waste illustration colours. The dark navy page and lighter slate card remain visually distinct during swiping. Splash, Settings, cache and shell URLs identify 1.0.28.

## Version 1.0.29 — clearer dark modals and Dark/Light appearance
Dark-mode Support, Settings, calendar, locality, waste/time and welcome panels have a brighter slate surface (#2a3b50), a thin defined border and a deeper soft shadow. The backdrop colour/blur and all light-mode colours are unchanged. Appearance now offers only Dark and Light. Unset or former System preferences default to Dark independently of device appearance; an explicit Light or Dark choice remains remembered. The initial theme selection and app state agree. Splash, Settings, cache and shell URLs identify 1.0.29.

## Version 1.0.30 — concise donation slide confirmation
The first Support step retains its existing brand, invitation, amount circles and text. Only the second step changes: it shows the brand/close control, Your tip amount, a short explanation of preventing accidental donations, and “Slide to go to card payment page” without repeating the amount. The separate Cancel button and repeated invitation/Stripe explanation are removed from this step. The close cross or Escape dismisses it. Reopening Support restores the first step, and the dialog accessible title/description follows the current step. The slider, Stripe handoff, analytics and 30-day attempt countdown remain intact. Splash, Settings, cache and shell URLs identify 1.0.30.
