# Sponsors

Export both files from Sponsor Manager and upload them together to `data/`:

- `sponsors.csv`: SponsorID,SponsorName,DisplayText,ImageURL,URL
- `sponsor_slots.csv`: Month,Year,Locality,Slot,SponsorID

SponsorID links each monthly locality booking to its advert. Names can change without changing bookings. The selected collection date determines the month and year. Up to three matching sponsors appear in slot order; gaps in slot numbers are supported.

DisplayText appears when ImageURL is empty. When an HTTP/HTTPS ImageURL is supplied, its banner fills the entire advert area (44 CSS pixels high) and stretches to fit the width, including distortion. No external-link arrow overlays the image. A failed image falls back to DisplayText. Both text and image adverts link to URL.

Contacts and comments remain in Excel and are not published.

Hosted pages fetch the CSV files; the PWA caches them for offline use. Opening index.html directly uses the bundled preview snapshot, which does not automatically track later CSV edits.
