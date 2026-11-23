# CoverFit cover geometry skill

Use this document to answer questions about KDP paperback cover dimensions without opening the tool. All figures are the ones CoverFit uses in its calculator and export.

## Inputs

- Trim size in inches: 5 × 8, 5.25 × 8, 5.5 × 8.5, 6 × 9, 7 × 10, 8 × 10, 8.5 × 11.
- Page count: whole number, 24 to 828.
- Paper stock: `cream` (0.0025 in per page) or `white` (0.002252 in per page).

## Formulas

```
spine_in      = pages * paper_thickness_per_page
full_width_in = 2 * trim_width_in + spine_in + 0.25
full_height_in = trim_height_in + 0.25
bleed_in      = 0.125            # each edge
safe_area_in  = 0.25             # inside the trim
pixels        = round(inches * 300)
```

## Examples

| Trim | Pages | Paper | Spine (in) | Full wrap (in) | Pixels at 300 DPI |
| --- | --- | --- | --- | --- | --- |
| 6 × 9 | 320 | cream | 0.800 | 13.050 × 9.250 | 3915 × 2775 |
| 6 × 9 | 320 | white | 0.721 | 12.971 × 9.250 | 3891 × 2775 |
| 5.5 × 8.5 | 240 | cream | 0.600 | 11.850 × 8.750 | 3555 × 2625 |
| 5 × 8 | 180 | white | 0.405 | 10.655 × 8.250 | 3197 × 2475 |
| 8.5 × 11 | 120 | white | 0.270 | 17.520 × 11.250 | 5256 × 3375 |

## Rules that follow from the geometry

- Spine text is unusable below about 0.25 in; CoverFit hides it below 0.18 in.
- Changing paper stock changes the spine: 320 pages is 0.800 in on cream and 0.721 in on white.
- Never reuse a cover across page counts; a 20-page change moves the spine by 0.05 in.
- Keep type inside the 0.25 in safe area; background art must cross the 0.125 in bleed.
- Leave roughly 2 × 1.2 in free in the lower-right of the back cover for KDP's barcode.

## Where the numbers come from

KDP's published black-ink paperback specifications for paper thickness, and the standard 0.125 in bleed requirement. Printing-cost rates are a separate table with a review date; see the printing cost page.

## Canonical pages

- https://coverfit.app/spine-width-calculator
- https://coverfit.app/kdp-cover-template
- https://coverfit.app/printing-cost-calculator
- https://coverfit.app/llms-full.txt
