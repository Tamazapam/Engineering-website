# Team Projects Inc. — Website

A single-page, scroll-driven brutalist site for Team Projects Inc. Plain HTML/CSS/JS,
no build step, no framework — ready to serve as static files from any host
(GitHub Pages, Cloudflare Pages, Netlify, S3, etc.).

## Structure

```
EngineeringWebsite/
├── index.html          — markup only, links to css/ and js/
├── css/
│   └── styles.css       — all site styling
├── js/
│   └── script.js        — scroll-progress engine (background zoom/crossfade,
│                          section fades, HUD readouts, nav dots)
├── images/
│   ├── image-1.jpg       — background plate 01 (structural envelope)
│   ├── image-1-mobile.jpg — smaller variant served under 820px viewports
│   ├── image-2.jpg       — background plate 02 (interior fit-out)
│   ├── image-2-mobile.jpg — smaller variant served under 820px viewports
│   ├── logo.png         — Team Projects Inc. logo (transparent PNG)
│   └── noise.svg         — fractal-noise film-grain texture used as a CSS background
└── README.md
```

## How it works

- The page scroll position (0–100%) drives everything: `js/script.js` reads
  `window.scrollY` each animation frame, smooths it, and uses that single
  progress value to:
  - crossfade + "punch zoom" between `images/image-1.jpg` and `images/image-2.jpg`
  - fade the four content sections (Hero, Services, Projects, Contact) in and out
  - update the HUD (scroll %, depth readout, progress rail, active nav dot)
- There's no video and no canvas frame sequence in this build — just the two
  background images.

## Local testing

1. Open the folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.
4. Confirm images, fonts (Google Fonts, loaded via CDN `<link>` tags), and the
   scroll animation all work, on both desktop and mobile widths.

## Deploying (Cloudflare Pages example)

1. Push this folder as-is to a GitHub repo (e.g. `engineering-website`).
2. In Cloudflare → **Workers & Pages** → **Create Application** → **Pages** →
   **Connect to Git** → select the repo.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave blank)*
   - Output directory: `/`
4. Deploy. Cloudflare will give you a `*.pages.dev` URL immediately.
5. Optional: add a custom domain under **Custom Domains** and update your DNS
   as instructed.

## Making future changes

When asking Claude (or anyone) to update the site, ask for **only the files
that changed**, and confirm the same folder structure is kept — don't let it
collapse back into a single HTML file. Then just replace the changed files in
the repo; Cloudflare Pages auto-redeploys on push.
