---
name: aspire-branding
description: Apply Aspire Investments & Insurance Ltd. branding to any web page, tool, form, document, or UI. Use when asked to "apply Aspire branding", "restyle to Aspire brand", "make this look like Aspire", or when building any Aspire internal tool that needs company colours, fonts, or logos.
---

# Aspire Branding Skill

Complete, self-contained brand reference for Aspire Investments & Insurance Ltd. Apply these tokens exactly. Do not invent new brand colours or substitute fonts. Source: official brand guideline (September 2021, Amplo Media), Pantone values confirmed by Aspire.

## Colour Tokens

### Logo colours (use for print, logo reproduction, and strong brand moments)

| Token | HEX | RGB | Pantone | Use |
|---|---|---|---|---|
| Logo dark green | `#10574C` | 16, 87, 76 | 5477 C | Headers, page chrome, dark backgrounds, footer bars |
| Logo gold | `#BE903E` | 190, 144, 62 | 465 C | Sparing accent only: highlights, small icons, dividers. Never large fills |

### Web colours (primary palette for tools and websites)

| Token | HEX | Use |
|---|---|---|
| Primary web green | `#157566` | Primary buttons, links, active states, key accents |
| Lighter green accent | `#308D7F` | Hover states, secondary accents, charts |
| Pale green tint | `#E6F1EF` | Panel backgrounds, table stripes, callout boxes |
| Near-black ink | `#292C34` | All body text (do not use pure #000) |
| Light neutral | `#F2F2F2` | Page background |

Default recipe for a new tool: `#F2F2F2` or white page background, `#292C34` text, `#10574C` header or chrome, `#157566` interactive elements, `#E6F1EF` panels, `#BE903E` as a rare accent.

Contrast notes: `#10574C` and `#157566` both pass WCAG AA with white text. `#BE903E` does not reliably pass with white text at body sizes; use it on white or `#E6F1EF` with dark text, or for decorative elements only.

## Typography

Both fonts are free on Google Fonts.

| Use | Font and weight |
|---|---|
| H1, H2 | Work Sans SemiBold (600) |
| H3 | Work Sans Regular (400) |
| Body text | Open Sans Regular (400) |
| Logo tagline | Open Sans Italic (do not retype the tagline; it is part of the logo files) |

Font stacks:

```css
--font-heading: "Work Sans", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
--font-body: "Open Sans", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
```

Google Fonts load (put in `<head>`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;1,400&family=Work+Sans:wght@400;600&display=swap" rel="stylesheet">
```

For offline or intranet tools, self-host the font files instead; the system-ui fallbacks keep things readable if the fonts fail to load.

## Logo Usage Rules

- Minimum size: 100 px wide on web (52 px for a no-text mark); 46 mm in print (24 mm no-text).
- Keep generous clear space on all sides of the logo. Nothing should crowd it.
- Approved variants: full colour, black, white. Use the white version on dark green (`#10574C`) or other dark backgrounds.
- Never skew, rotate, mirror, stretch, compress, recolour, add effects to, or replace parts of the logo.
- Every released internal tool shows the Aspire logo, a version number, and a date.

## Logo Assets (in `assets/`)

| File | When to use |
|---|---|
| `Aspire_Logo_Colour.png` | Primary stacked full-colour logo. Default choice on white or light backgrounds |
| `Aspire_Logo_Colour_Horizontal.png` | Full-colour horizontal layout. Use in headers, nav bars, and other wide, short spaces |
| `Aspire_Logo_White.png` | White stacked logo for dark green or dark backgrounds |
| `Aspire_Logo_White_Horizontal.png` | White horizontal logo for dark headers and footer bars |

## Usage Recipes

### 1. CSS custom properties (framework-agnostic)

```css
:root {
  /* Logo colours */
  --aspire-green-dark: #10574C;
  --aspire-gold: #BE903E;
  /* Web palette */
  --aspire-green: #157566;
  --aspire-green-light: #308D7F;
  --aspire-tint: #E6F1EF;
  --aspire-ink: #292C34;
  --aspire-neutral: #F2F2F2;
  /* Typography */
  --font-heading: "Work Sans", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  --font-body: "Open Sans", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
}

body {
  background: var(--aspire-neutral);
  color: var(--aspire-ink);
  font-family: var(--font-body);
}
h1, h2 { font-family: var(--font-heading); font-weight: 600; }
h3 { font-family: var(--font-heading); font-weight: 400; }
a, .link { color: var(--aspire-green); }
.btn-primary {
  background: var(--aspire-green);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-family: var(--font-body);
  font-weight: 600;
}
.btn-primary:hover { background: var(--aspire-green-light); }
.panel { background: var(--aspire-tint); border-radius: 8px; padding: 1rem; }
.site-header { background: var(--aspire-green-dark); color: #fff; }
```

### 2. Tailwind CSS v4 `@theme` block

Drop into the main CSS file (the file that has `@import "tailwindcss";`). Utilities become available as `bg-aspire`, `text-aspire-ink`, `bg-aspire-tint`, `font-heading`, etc.

```css
@import "tailwindcss";

@theme {
  --color-aspire: #157566;
  --color-aspire-dark: #10574C;
  --color-aspire-light: #308D7F;
  --color-aspire-tint: #E6F1EF;
  --color-aspire-gold: #BE903E;
  --color-aspire-ink: #292C34;
  --color-aspire-neutral: #F2F2F2;
  --font-heading: "Work Sans", system-ui, sans-serif;
  --font-body: "Open Sans", system-ui, sans-serif;
}

@layer base {
  body {
    @apply bg-aspire-neutral text-aspire-ink min-h-screen;
    font-family: var(--font-body);
  }
  h1, h2 { font-family: var(--font-heading); font-weight: 600; }
  h3 { font-family: var(--font-heading); font-weight: 400; }
}
```

For Tailwind v3, put the same colours under `theme.extend.colors.aspire` in `tailwind.config.js` instead.

### 3. Plain HTML tools (single-file forms, calculators, reports)

- Put the Google Fonts `<link>` tags and the CSS variables block from recipe 1 in the `<head>` inside a `<style>` tag.
- Header bar: `background: #10574C`, white text, white horizontal logo on the left at 100 px or wider.
- Content area: white or `#F2F2F2` background, `#292C34` text, headings in Work Sans.
- Primary action buttons in `#157566`; secondary buttons outlined in `#157566` on white.
- Group related fields in `#E6F1EF` panels.
- Footer: tool name, version number, and date (required on every released Aspire tool), in small `#292C34` or muted text.
- Use `#BE903E` at most once or twice per page: an icon, a thin rule, a badge. It is an accent, never a theme.

### 4. Documents and non-web outputs (Word, PDF, slides, email)

- Headings: Work Sans SemiBold in `#10574C`. Body: Open Sans in `#292C34`.
- Full-colour logo top-left on white pages; white logo only on dark green fills.
- Table header rows: `#10574C` fill with white text; alternate row shading `#E6F1EF`.

## Do Not

- Do not use em dashes in any Aspire-branded copy.
- Do not use pure black `#000000` for text; use `#292C34`.
- Do not use gold `#BE903E` for large areas, page backgrounds, or body text.
- Do not substitute similar fonts (Lato, Roboto, Inter) when Work Sans and Open Sans are available.
- Do not modify, recolour, or distort the logo files in any way.
