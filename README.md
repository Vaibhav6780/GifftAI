# GIFFT AI — Website

Premium marketing site for **GIFFT AI** (`gifftai.com`) — a software engineering
and product studio. Built with Next.js (App Router), TypeScript and Tailwind CSS,
with two independently art-directed light and dark themes.

## Stack

- **Next.js 14** (App Router, RSC, Metadata API)
- **TypeScript**
- **Tailwind CSS** — theme tokens in `src/app/globals.css`
- **Framer Motion** — reveals, marquee, magnetic buttons, page micro-interactions
- Google Fonts via `next/font`: Bricolage Grotesque (display), Inter (text),
  Newsreader (editorial italics), JetBrains Mono (technical annotations)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the build
npm run lint
```

## Routes

| Route                | Page                                        |
| -------------------- | ------------------------------------------- |
| `/`                  | Home — hero, capabilities, selected work    |
| `/projects`          | Filterable work index                       |
| `/projects/[slug]`   | Case study (statically generated)           |
| `/services`          | Services + process                          |
| `/about`             | Philosophy, values, timeline, team          |
| `/technologies`      | Engineering map                             |
| `/contact`           | Contact form + details                      |
| `/privacy`, `/terms` | Legal (placeholder copy)                    |

`sitemap.xml` and `robots.txt` are generated from `src/app/sitemap.ts` /
`src/app/robots.ts`. The OG image is generated at `src/app/opengraph-image.tsx`.

## Editing content

All content lives in plain TypeScript files under `src/data/` — no CMS required.

- **`src/data/projects.ts`** — the portfolio. Each `Project` has `slug`, `title`,
  `category`/`categories`, `description`, `challenge`, `solution`, `features`,
  `architecture`, `tech`, `results` and `gallery`. Add an object to the array and
  a case study is generated automatically (route, metadata, sitemap entry).
- **`src/data/services.ts`** — services and the 5-step process.
- **`src/data/technologies.ts`** — the technology map.
- **`src/data/about.ts`** — company story, values, timeline, team. Placeholder
  strings are prefixed with `//` — replace them; **do not invent facts**.
- **`src/lib/site.ts`** — company name, domain, and all contact / social links.

## Design tokens

Both themes are defined as CSS custom properties in `src/app/globals.css`
(`:root` for light, `.dark` for dark). The single accent (warm ember) is
`--accent`; change it in both blocks to re-skin the site.

## The contact form

`ContactForm` posts JSON to `POST /api/contact` (`src/app/api/contact/route.ts`),
which currently validates and logs. Wire it to your inbox / CRM / email provider
(Resend, Postmark, a Slack webhook, …) where the `TODO` is marked.

## Accessibility & performance

- Semantic landmarks, skip link, visible focus rings, labelled form controls
- `prefers-reduced-motion` respected globally (CSS) and per-component
- Static generation for all content routes; fonts self-hosted via `next/font`
- No stock imagery — the visual identity is generated (`SystemPreview`)
