# Sponsors

Export both files from Sponsor Manager and upload them together to `data/`:

- `sponsors.csv`: SponsorID,SponsorName,DisplayText,ImageURL,URL
- `sponsor_slots.csv`: Month,Year,Locality,Slot,SponsorID

SponsorID links each monthly locality booking to its advert. Names can change without changing bookings. The selected collection date determines the month and year. Up to three matching sponsors appear in slot order; gaps in slot numbers are supported.

DisplayText appears when ImageURL is empty. When an HTTP/HTTPS ImageURL is supplied, its banner fills the entire advert area (44 CSS pixels high) and stretches to fit the width, including distortion. No external-link arrow overlays the image. A failed image falls back to DisplayText. Both text and image adverts link to URL.

Contacts and comments remain in Excel and are not published.

Hosted pages fetch the CSV files; the PWA caches them for offline use. Opening index.html directly uses the bundled preview snapshot, which does not automatically track later CSV edits.

## Sponsor click reporting in Google Analytics 4

Each text or banner click sends `sponsor_click` through the app's existing consent-controlled analytics. Middle-clicks are also tracked. No event is sent when analytics consent is denied or the analytics script is unavailable.

Parameters: sponsor_id, sponsor_name, locality, booking_month, booking_year, sponsor_slot, advert_format (text/image). Sponsor ID is the stable comparison key across sponsor name changes. These are clicks, not unique people or confirmed visits to the destination.

In Google Analytics Admin > Data display > Custom definitions, create an event-scoped custom dimension named Sponsor ID with event parameter sponsor_id. Optionally create dimensions for sponsor_name, locality and advert_format. In Explore, use Sponsor ID as rows and Event count as the metric, filtering Event name to sponsor_click. Allow 24–48 hours for custom dimensions to become available. Check incoming events in Realtime after publishing.

Keep your existing live data/sponsors.csv and data/sponsor_slots.csv when installing this version if you edited them since the previous package.
