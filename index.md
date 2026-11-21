# CoverFit — KDP book cover maker, free and print-ready

> Browser-based cover studio for self-publishers. It computes the full wrap from trim size, page count, and paper stock, then exports a 300 DPI PNG and a print-ready PDF. No upload, no account.

Canonical HTML: https://coverfit.app/

## What the export contains

A paperback cover is one wrap: back cover, spine, and front cover on a single sheet, with 0.125 in of bleed on every edge. CoverFit computes that sheet from three numbers: trim size, page count, and paper stock.

| Trim | Pages | Paper | Spine | Full wrap |
| --- | --- | --- | --- | --- |
| 6 × 9 in | 320 | Cream | 0.800 in | 13.050 × 9.250 in |
| 6 × 9 in | 320 | White | 0.721 in | 12.971 × 9.250 in |
| 5.5 × 8.5 in | 240 | Cream | 0.600 in | 11.850 × 8.750 in |
| 5 × 8 in | 180 | White | 0.405 in | 10.655 × 8.250 in |
| 8.5 × 11 in | 120 | White | 0.270 in | 17.520 × 11.250 in |

If the page count changes, the spine changes, and the whole wrap changes with it. The spine is not a design choice; it is a function of the interior.

## How to use it

1. Set the interior first: use the same trim size and final page count as the manuscript you upload to KDP.
2. Design inside the safe area. Keep type at least 0.25 in from the trim edge; anything in the bleed may be cut.
3. Export both files. The PNG is for mockups; the PDF is the one to send to KDP's previewer.
4. Check barcode space. KDP places a barcode in the lower-right of the back cover, roughly 2 × 1.2 in.

## FAQ

### What size should a KDP book cover be?

Full width = 2 × trim width + spine + 0.25 in. Full height = trim height + 0.25 in. For a 6 × 9 in book with 320 cream pages, that is 13.050 × 9.250 in.

### How is spine width calculated?

0.002252 in per page for white paper, 0.0025 in per page for cream. A 320-page cream book is 0.800 in.

### Does CoverFit upload my files?

No. Rendering and export happen in your browser. Nothing is sent to a server, and there is no account.

### Can I use the exported PDF for KDP?

It is a single-page wrap at 300 DPI with the dimensions you entered. KDP still has to accept it in the previewer; CoverFit cannot verify fonts, color, or account-specific requirements.

## Related pages

- [KDP cover template](https://coverfit.app/kdp-cover-template): dimensions, bleed, safe area.
- [Spine width calculator](https://coverfit.app/spine-width-calculator): inches, millimeters, pixels.
- [Printing cost calculator](https://coverfit.app/printing-cost-calculator): unit cost and royalty.
- [Book cover design guide](https://coverfit.app/book-cover-design): what works at thumbnail size.
- [Book trim sizes](https://coverfit.app/trim-sizes): which size fits your genre.
