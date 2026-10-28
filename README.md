# John Anderson Portfolio

A multi-page static portfolio for a full stack developer, built with semantic HTML, modern CSS, and dependency-free JavaScript modules. It includes dedicated pages, data-driven project and article detail views, dark mode, a printable resume, and generated SEO files.

## Demo content

This is a demonstration portfolio. Projects, testimonials, career history, education, metrics, availability, social links, and contact details are illustrative. Projects and articles are labelled as samples in the interface. No verified client work, employment history, ratings, or live product claims are made.

Replace the demo content before using the site as a real portfolio.

## Requirements

- Node.js 20 or newer for the local server, SEO generator, validator, tests, and PDF script.
- A modern browser.
- Google Chrome or Microsoft Edge, only if you want to generate the CV PDF.
- Network access for Google Fonts and the Remix Icon CDN. The site remains usable with system font fallbacks if those requests fail.

There are no npm dependencies to install.

## Quick start

From the project root:

```sh
npm start
```

Open <http://127.0.0.1:4173/>.

The site must be served over HTTP. Opening `index.html` directly with `file://` will prevent the shared header, footer, and data files from loading.

To use another port:

```sh
node scripts/serve.js --port=4174
```

Or:

```sh
npm start -- --port=4174
```

Environment variables `PORT` and `HOST` are also supported. The default host is `127.0.0.1`. Use `HOST=0.0.0.0` only when you intentionally want to expose the development server on your network.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Serve the site locally at `127.0.0.1:4173`. |
| `npm run serve` | Alias for `npm start`. |
| `npm run dev` | Alias for `npm start`. |
| `npm run seo` | Regenerate static metadata, JSON-LD, `sitemap.xml`, and `robots.txt`. |
| `npm run build` | Regenerate SEO files, then validate the whole site. |
| `npm run validate` | Validate pages, data, links, assets, metadata, JSON-LD, sitemap, and robots. |
| `npm test` | Run the Node test suite. |
| `npm run check` | Run `build` followed by the test suite. Use this before deploying. |
| `npm run pdf` | Regenerate `assets/files/john-anderson-cv.pdf` from `resume.html`. |

`npm run pdf` locates Chrome or Edge automatically. Set `CHROME_PATH` to a Chromium-based browser executable if detection fails:

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run pdf
```

## Project structure

```text
.
├── *.html                     # One file per page, including 404.html and resume.html
├── components/                # Shared header, footer, breadcrumbs, scroll-top
├── assets/
│   ├── css/                   # Base, components, responsive, animation, resume styles
│   ├── data/                  # Site configuration, content, navigation, and SEO data
│   ├── files/                 # Generated CV PDF
│   ├── images/                # Portrait, project artwork, avatars, icons, social image
│   └── js/                    # ES modules for rendering and interaction
├── scripts/                   # Local server, SEO generator, validator, PDF generator
├── tests/                     # Node test suite
├── robots.txt                 # Generated
├── sitemap.xml                # Generated
└── package.json
```

## Editing content

### Site details and contact information

Edit `assets/data/site-config.json` for:

- Brand name, role, tagline, and years of experience.
- Production `url`.
- Email, phone, location, timezone, availability, and response note.
- Social links. Replace the placeholder URLs and remove `"placeholder": true`.
- Contact form endpoint.
- CV path, default social image, demo notices, and copyright start year.

### Shared navigation

Edit `assets/data/navigation.json` to change page links, dropdown items, and the header call to action. Keep destination files in sync with the matching HTML pages.

### Projects and articles

Edit `assets/data/projects.json` and `assets/data/blog.json`. Each item needs a unique `slug`; detail pages are opened with:

```text
project-details.html?slug=analytics-dashboard
blog-details.html?slug=progressive-enhancement-2026
```

Use `assets/images/project-*.svg` or replacement images with a 3:2 aspect ratio for project artwork. Keep `imageAlt` descriptive. Project and article detail pages receive runtime metadata from the `seo-manager` module and their URLs are generated into the sitemap.

### Other page data

- `assets/data/skills.json`: skill groups, toolbelt, and principles.
- `assets/data/experience.json`: roles, education, and learning notes.
- `assets/data/services.json`: service cards.
- `assets/data/testimonials.json`: demo feedback and notices.

Keep the demo notices accurate if you replace sample content.

### Static page copy and SEO

Page-level copy lives in the corresponding HTML file. Static SEO metadata is generated from `assets/data/seo.json` between these markers:

```html
<!-- SEO:START -->
<!-- SEO:END -->
```

Do not edit the generated block by hand. Edit the HTML outside the markers or update `seo.json` and run:

```sh
npm run build
```

When adding a new page:

1. Add it to `assets/data/seo.json`.
2. Add a matching `data-page` attribute to the page's `<body>`.
3. Add it to `assets/data/navigation.json` if it belongs in navigation.
4. Run `npm run build`.

`resume.html` is standalone and intentionally excluded from the shared component checks. `404.html` is excluded from the sitemap.

### Contact form

With `contactForm.endpoint` empty, the form validates inputs and prepares a `mailto:` draft with optional copy-to-clipboard. It explicitly tells the user that nothing was sent.

To connect a backend, set `contactForm.endpoint` to an absolute HTTPS URL that accepts a JSON `POST`. A successful response must be HTTP 2xx. The backend must return appropriate CORS headers. Update the demo notices and response copy to match the new behavior.

### Resume PDF

Edit `resume.html`, then regenerate the PDF:

```sh
npm run pdf
```

Commit the updated `assets/files/john-anderson-cv.pdf` alongside the HTML change.

## SEO and deployment

Before deployment:

1. Replace demo contact details, social URLs, copy, images, and project/article content.
2. Set the real production origin in `url` inside `assets/data/site-config.json`.
3. Set or remove the contact form endpoint and update the accompanying notices.
4. Replace `assets/images/og-image.png` if the social preview should change.
5. Run `npm run check`.
6. Deploy the repository as static files at the domain root.

`npm run build` writes canonical URLs, Open Graph/Twitter metadata, JSON-LD, `sitemap.xml`, and `robots.txt` using the configured origin. Re-run it whenever the domain, page list, projects, articles, or SEO descriptions change.

The site has no server-side rendering or rewrite requirements. Configure the host to serve `404.html` for missing paths. All pages must remain at the site root because the HTML pages and shared asset paths are written for a root-level deployment.

## Quality checks

```sh
npm run check
```

This regenerates SEO files, validates all pages and data, and runs the test suite. Tests cover:

- Page structure, metadata, internal links, assets, sitemap, and JSON-LD.
- Content and configuration integrity, including demo labelling.
- Accessibility basics such as skip links, form labels, button names, and safe external links.
- The contact form's no-backend fallback.

Browser QA is not part of the automated test suite.

## Behavior notes

- Theme preference is stored in `localStorage` under `john-anderson-theme`.
- `?theme=dark` and `?theme=light` override the saved theme.
- Shared header, footer, breadcrumbs, and scroll-to-top markup are loaded at runtime from `components/`.
- Project and article detail pages use query strings; their metadata is applied by JavaScript.
- The mobile navigation supports keyboard focus containment, Escape to close, and focus restoration.
- Content remains readable without JavaScript where the markup is static. Detail pages and data-driven lists require JavaScript.
- No analytics, cookies, or third-party trackers are included.

## Assets

The portrait, avatars, project artwork, and social preview are demonstration assets. Replace them with licensed media before production use. The CV PDF and all SVG project images are generated or authored for this project.
#   p o r t f o l i o 2  
 