# Spine width calculator for KDP paperbacks

> Spine width is page count multiplied by paper thickness. KDP uses 0.002252 in per page on white and 0.0025 in per page on cream.

Canonical HTML: https://coverfit.app/spine-width-calculator

## Why it matters

| Problem | Result |
| --- | --- |
| Too narrow | Art wraps onto the spine |
| Too wide | Spine text drifts to the front |
| Tolerance | About 0.0625 in |
| Recalculate | Every page-count change |

## The formula

Spine width = page count × paper thickness. Cream is thicker than white, so the same book is wider on cream.

Example: 320 pages × 0.0025 = 0.800 in. The same book on white paper is 320 × 0.002252 = 0.721 in, a difference of 0.079 in. That is more than the usual cutting tolerance, so do not reuse a cover between paper stocks.

## Spine width by page count

| Pages | White (in) | Cream (in) | Cream (mm) |
| --- | --- | --- | --- |
| 100 | 0.225 | 0.250 | 6.35 |
| 150 | 0.338 | 0.375 | 9.53 |
| 200 | 0.450 | 0.500 | 12.70 |
| 250 | 0.563 | 0.625 | 15.88 |
| 300 | 0.676 | 0.750 | 19.05 |
| 350 | 0.788 | 0.875 | 22.23 |
| 400 | 0.901 | 1.000 | 25.40 |
| 500 | 1.126 | 1.250 | 31.75 |
| 700 | 1.576 | 1.750 | 44.45 |

## When the spine is too narrow for text

Below roughly 0.25 in there is no usable spine text: after print tolerance a vertical title looks cramped or clips. Between 0.25 and 0.5 in, reduce the type size and keep the label to the title only. CoverFit hides spine text automatically below 0.18 in.

## Related pages

- [KDP cover template](https://coverfit.app/kdp-cover-template)
- [Printing cost calculator](https://coverfit.app/printing-cost-calculator)
- [Book trim sizes](https://coverfit.app/trim-sizes)
