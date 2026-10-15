// Generates watch-order.html: a static, crawlable copy of the full watch order
// (search engines and AI assistants do not run the JS that renders the app).
// Run: node scripts/build-watch-order.mjs
import fs from 'node:fs';
import vm from 'node:vm';

const SITE = 'https://stargate-watch-console.vercel.app';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const s = html.indexOf('const DATA = [');
const e = html.indexOf('\n];', s) + 3;
const DATA = vm.runInNewContext(html.slice(s, e).replace('const DATA =', 'DATA=') + ';DATA');
const FAQ = JSON.parse(fs.readFileSync(new URL('./faq.json', import.meta.url), 'utf8'));
const LABEL = { sg1: 'SG-1', sga: 'Atlantis', movie: 'Movie', sgu: 'Universe', sgo: 'Origins' };
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const total = DATA.reduce((n, p) => n + p.items.length, 0);

const phases = DATA.map(p => `
<section id="phase-${p.phase}">
  <h2>Phase ${p.phase}: ${esc(p.title)}</h2>
  <ol start="${p.items[0][0]}">
${p.items.map(([n, series, title, note, , date]) =>
    `    <li><strong>${esc(title)}</strong> <span class="tag">${LABEL[series]}</span>${date ? ` <time>${esc(date)}</time>` : ''}<br>${esc(note)}</li>`).join('\n')}
  </ol>
</section>`).join('\n');

const faqHtml = FAQ.map(f => `  <details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n');
const ld = [
  {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'Stargate Chronological Watch Order: Full Episode List (SG-1, Atlantis, Universe)',
    url: `${SITE}/watch-order.html`,
    description: `The complete Stargate watch order in chronological crossover order: ${total} movies and episodes across SG-1, Atlantis, Universe and Origins.`,
    isPartOf: { '@type': 'WebSite', name: 'Stargate Watch Console', url: `${SITE}/` },
    author: { '@type': 'Person', name: 'Thoshan Rathnayake', url: 'https://github.com/Thosay97' }
  },
  {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Stargate Watch Console', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Full watch order', item: `${SITE}/watch-order.html` }
    ]
  },
  {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  }
];

const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark light">
<title>Stargate Chronological Watch Order: Full SG-1, Atlantis and Universe Episode List</title>
<meta name="description" content="The complete Stargate watch order in chronological crossover order: ${total} movies and episodes across SG-1, Atlantis, Universe and Origins, with air dates and short spoiler-light summaries.">
<link rel="canonical" href="${SITE}/watch-order.html">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Stargate Watch Console">
<meta property="og:title" content="Stargate Chronological Watch Order: Full Episode List">
<meta property="og:description" content="Every Stargate movie and episode in chronological crossover order, with air dates.">
<meta property="og:url" content="${SITE}/watch-order.html">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
  :root{--bg:#05070c;--fg:#dbe6f2;--dim:#8fa3bd;--accent:#3ad6e6;--line:#1b2739;--card:#0d1420}
  @media (prefers-color-scheme: light){:root{--bg:#f3f7fc;--fg:#101a2b;--dim:#51627c;--accent:#0b7f90;--line:#d4deea;--card:#ffffff}}
  body{background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;margin:0}
  main{max-width:820px;margin:0 auto;padding:28px 16px 70px}
  a{color:var(--accent)} h1{font-size:1.7rem;line-height:1.2;margin:.2em 0}
  h2{font-size:1.15rem;margin:1.8em 0 .5em;border-bottom:1px solid var(--line);padding-bottom:6px}
  ol{padding-left:2.4em} li{margin:0 0 .7em} .tag{font-size:.7rem;border:1px solid var(--line);border-radius:99px;padding:1px 8px;color:var(--dim)}
  time{font-size:.8rem;color:var(--dim)} .cta{display:inline-block;margin:10px 0;padding:10px 16px;border-radius:10px;background:var(--accent);color:#04121a;font-weight:700;text-decoration:none}
  details{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin:8px 0} summary{cursor:pointer;font-weight:600}
  nav ul{columns:2;padding-left:1.2em} .dim{color:var(--dim)}
</style>
</head>
<body>
<main>
  <p><a href="/">&larr; Stargate Watch Console</a></p>
  <h1>Stargate Chronological Watch Order</h1>
  <p>This is the complete Stargate franchise in chronological crossover order: ${total} entries covering the 1994 film, every episode of Stargate SG-1 and Stargate Atlantis, the two SG-1 movies, Stargate Universe and the optional Origins web series. Where SG-1 and Atlantis overlap, episodes are interleaved by original air date. Summaries are short paraphrases and avoid major twists.</p>
  <p><a class="cta" href="/">Open the interactive checklist</a> <span class="dim">Free, no ads, saves your progress.</span></p>
  <nav aria-label="Phases"><ul>
${DATA.map(p => `    <li><a href="#phase-${p.phase}">${esc(p.title)}</a></li>`).join('\n')}
  </ul></nav>
${phases}
  <h2>Frequently asked questions</h2>
${faqHtml}
  <p class="dim">Built by <a href="https://github.com/Thosay97">Thoshan Rathnayake</a>. Fan project, not affiliated with MGM or the Stargate rights holders. <a href="/privacy.html">Privacy</a></p>
</main>
</body>
</html>
`;
fs.writeFileSync(new URL('../watch-order.html', import.meta.url), out);
console.log('watch-order.html written:', total, 'entries,', (out.length / 1024).toFixed(0), 'KB');

// Keep the FAQ in index.html (visible section + JSON-LD) in sync with faq.json.
const indexUrl = new URL('../index.html', import.meta.url);
let idx = fs.readFileSync(indexUrl, 'utf8');
const swap = (src, tag, body) => src.replace(new RegExp(`(<!-- ${tag}:START -->)[\\s\\S]*?(<!-- ${tag}:END -->)`), `$1\n${body}\n    $2`);
idx = swap(idx, 'FAQ', FAQ.map(f => `    <details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n'));
idx = swap(idx, 'FAQ-LD', `<script type="application/ld+json">${JSON.stringify(ld[2])}</script>`);
fs.writeFileSync(indexUrl, idx);
console.log('index.html FAQ synced');
