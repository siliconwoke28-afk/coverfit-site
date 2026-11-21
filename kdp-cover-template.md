# KDP cover template: dimensions, bleed, and spine math

> A KDP paperback cover is one wrap: back cover, spine, and front cover on a single sheet, plus bleed. The only variables are trim size, page count, and paper stock. If the spine is wrong, the whole file is wrong.

Canonical HTML: https://coverfit.app/kdp-cover-template

## Full-wrap formula

| Property | Value |
| --- | --- |
| Width | 2 × trim width + spine + 0.25 in |
| Height | trim height + 0.25 in |
| Bleed | 0.125 in per edge |
| Safe area | 0.25 in inside trim |
| Resolution | 300 DPI |

## What the template contains

| Zone | Where it sits | What belongs there |
| --- | --- | --- |
| Bleed | 0.125 in outside the trim on all four sides | Background art that should run off the page |
| Trim | The final cut line | Nothing critical, because cutting drifts |
| Safe area | 0.25 in inside the trim | Type, logos, and anything that must survive the knife |
| Barcode zone | Lower-right of the back cover | Keep it quiet; KDP prints the barcode there |

## Dimensions by page count (6 × 9 in)

| Pages | Spine (cream) | Full wrap (cream) | Spine (white) | Full wrap (white) |
| --- | --- | --- | --- | --- |
| 120 | 0.300 | 12.550 × 9.250 | 0.270 | 12.520 × 9.250 |
| 200 | 0.500 | 12.750 × 9.250 | 0.450 | 12.700 × 9.250 |
| 280 | 0.700 | 12.950 × 9.250 | 0.631 | 12.881 × 9.250 |
| 320 | 0.800 | 13.050 × 9.250 | 0.721 | 12.971 × 9.250 |
| 400 | 1.000 | 13.250 × 9.250 | 0.901 | 13.151 × 9.250 |
| 500 | 1.250 | 13.500 × 9.250 | 1.126 | 13.376 × 9.250 |

## Build it without a template file

1. Open the cover maker and set trim size and page count: https://coverfit.app/#cover-tool
2. Turn on guides to see bleed, trim, and the safe area.
3. Place artwork so it crosses the bleed on every side.
4. Keep all type inside the safe area, and leave the barcode corner empty.
5. Export the PDF and run it through KDP's previewer before uploading the interior.

## Template mistakes that get files rejected

- Using a template from a different page count. A 20-page difference moves the spine by 0.05 in.
- Putting type in the bleed. It looks fine on screen and gets trimmed on paper.
- Designing at 72 DPI. A 13 in wrap at 72 DPI is 936 px wide; KDP wants roughly 3,900 px.
- Ignoring the barcode. A busy back cover with a barcode dropped on top reads as amateur.

## Related pages

- [Spine width calculator](https://coverfit.app/spine-width-calculator)
- [Printing cost calculator](https://coverfit.app/printing-cost-calculator)
- [Book cover design guide](https://coverfit.app/book-cover-design)
