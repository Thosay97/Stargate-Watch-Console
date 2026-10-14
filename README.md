# Stargate Watch Console

A single-page checklist for the SG-1/Atlantis/Universe crossover watch order
(148 entries, including the optional Stargate Origins web series), with
per-episode progress tracking, spoiler hiding, synthesized sound and music,
a glassmorphism design with light and dark themes, a Stargate-style gate
cursor with stardust trails, an interactive warp-speed background,
cross-device sync, and basic SEO. It is ad-free.

## What's new in this version

- **Soundtrack picker**: seven options (a synthesized ambient drone plus six
  MP3s in `music/`: EDM, hybrid EDM, epic cinematic, epic dubstep and an
  action trailer), each with a Stargate name, a volume slider and a Next
  button. Only the selected track downloads. Tracks come from Pixabay
  (Pixabay Content License, credited in the footer). The standalone single
  HTML file needs the `music/` folder next to it, or it falls back to the
  ambient drone.

- **Glassmorphism UI** with a Light/Dark toggle (remembers your choice,
  defaults to your system setting). Colors live in CSS variables at the top
  of the second half of the stylesheet, so retheming is easy.
- **Gate cursor**: a spinning nine-chevron ring that grows over clickable
  things and locks in on click. Only on mouse devices, never on touch.
- **Stardust and comet trails** follow the pointer; clicks fire an event
  horizon shockwave that pushes the dust and sends the background into warp.
  The starfield also reacts to mouse speed and scrolling.
- **Stargate Origins** added as phase 6 (entries 139 to 148).
- **Episode descriptions rewritten** as short paraphrases from public episode
  guides (Wikipedia season pages). IMDb forbids automated access, so it was
  not scraped. Origins episodes are untitled "Episode N" on Wikipedia, so
  their notes are intentionally minimal.
- Everyone's `prefers-reduced-motion` setting is respected.

Design approach was inspired by open source glass UI kits (MIT-licensed
projects such as GlassKit), reimplemented from scratch. No code was copied.


## Files in this project

```
index.html        the whole app
api/progress.js    serverless function for cross-device sync
package.json        one dependency (@upstash/redis)
robots.txt          tells search engines what to crawl
sitemap.xml          list of pages for search engines
privacy.html         minimal privacy page (linked in the footer)
README.md            this file
```

---

## Part 1: Go live on Vercel (step by step)

You need a free GitHub account and a free Vercel account. Vercel signs up
with GitHub directly, so this is quick.

1. **Create a GitHub repo.**
   - Go to github.com, click **New repository**.
   - Name it something like `stargate-watch-console`, keep it Public (or
     Private, either works), don't add a README (you already have one).
   - Click **Create repository**.

2. **Upload these files to the repo.**
   The easiest way with no command line: on the new repo's page, click
   **"uploading an existing file"**, drag in every file from this folder
   (keeping the `api/` folder structure intact), and commit.
   (If you're comfortable with git, this is just `git init`, `git add .`,
   `git commit -m "initial commit"`, `git remote add origin <repo url>`,
   `git push -u origin main`.)

3. **Import the repo into Vercel.**
   - Go to vercel.com, sign in with GitHub.
   - Click **Add New -> Project**.
   - Select your `stargate-watch-console` repo and click **Import**.
   - Leave the default settings (Vercel auto-detects a static site with an
     `api/` folder) and click **Deploy**.
   - After a minute you'll get a live URL like
     `stargate-watch-console-yourname.vercel.app`. The site works right
     now, minus cross-device sync (next step).

4. **Attach a Redis database for the sync feature.**
   - In your Vercel project, open the **Storage** tab.
   - Click **Marketplace Database Providers**, choose **Upstash**, and
     create a Redis database (their free tier, 500K commands/month, is
     far more than this app needs).
   - Connect it to this project. Vercel automatically adds the
     `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` environment
     variables that `api/progress.js` reads. No code changes needed.
   - Go to **Deployments** and redeploy (env vars only apply to
     deployments made after they're added). Click the three-dot menu on
     the latest deployment -> **Redeploy**.
   - Reload the live site. The sync panel at the bottom of the console
     should now say "Synced just now" instead of "Running locally."

5. **(Optional) Add a custom domain.**
   - In the Vercel project, go to **Settings -> Domains**.
   - Buy a domain anywhere (Namecheap, Google Domains successor, Vercel's
     own domain registration, etc.) or keep the free `.vercel.app` one.
   - Follow Vercel's on-screen instructions to point your domain's DNS at
     Vercel (usually one CNAME or A record). HTTPS is automatic.

Your site is now live and updates every time you push to the `main`
branch on GitHub.

---

## Part 2: SEO, what's already in place

`index.html` now includes:

- A descriptive `<title>` and meta description targeting terms like
  "Stargate watch order" and "SG-1 Atlantis chronological order"
- Open Graph and Twitter Card tags, so links posted on social media or
  Discord show a proper preview card
- JSON-LD structured data describing the site as a free web application
- `robots.txt` and `sitemap.xml` so search engines know what to crawl
- A plain-text intro paragraph above the checklist, so search engines
  (and anyone with JavaScript disabled) see real descriptive content, not
  just an empty container

**What you still need to do:**

1. **Replace every `stargate-watch-console.vercel.app` placeholder** in `index.html`,
   `robots.txt`, and `sitemap.xml` with your actual live domain once you
   know it.
2. **Add a real preview image.** Take a screenshot of the site (1200x630px
   works best), save it as `og-image.png` in this same folder, upload it
   alongside the other files, and it'll be picked up by the `og:image`
   and `twitter:image` tags already in place.
3. **Submit your site to Google Search Console** (search.google.com/search-console,
   free). Add your domain, verify ownership (Vercel makes this easy via a
   DNS TXT record or HTML file), then submit
   `https://your-domain.com/sitemap.xml` so Google indexes it faster.
4. Fill in the "Last updated" date on `privacy.html`.

---

## Why sync doesn't use fingerprinting

FingerprintJS only answers "have I seen this browser before," it doesn't
store anything itself, so you'd still need a backend and database either
way. It's also less reliable than it sounds (fingerprints shift across
browser updates and incognito mode) and raises consent requirements
under GDPR/ePrivacy in the EU since it identifies people without them
opting in.

Instead, this uses a **sync code**: each browser generates a random ID
and stores it locally. That ID is the key for a small JSON blob in
Redis. Copy the code shown in the app to another device, hit "Load," and
it pulls the same progress down. If the API isn't reachable, the app
just keeps working off local storage alone.
