/**
 * generate-pages.mjs
 *
 * Generates category hub pages and injects markers in index.html,
 * sitemap.xml, llms.txt, and llms-full.txt from:
 *   src/datasets/index.json       (catalog — run generate-manifest.mjs first)
 *   data-pipeline/category-content.json  (editorial copy, hand-edited)
 *   src/blog/feed.xml             (blog posts — parsed for featured + related)
 *
 * Output (committed):
 *   src/<slug>/index.html         one per category
 *   src/index.html                marker blocks updated (track-grid, whats-new, featured, home-jsonld)
 *   src/sitemap.xml               hubs:start/end block updated
 *   src/llms.txt                  quizzes:start/end block updated
 *   src/llms-full.txt             quizzes:start/end block updated
 *
 * Deterministic: same inputs → same output. Re-running with unchanged inputs
 * produces no git diff. Dates come from category-content.json, not new Date().
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectChrome } from './sync-chrome.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const SRC   = join(ROOT, 'src');

// --check: generate in-memory, compare to disk, exit 1 on any diff — write nothing.
const CHECK = process.argv.includes('--check');
const log   = CHECK ? () => {} : console.log.bind(console);
const drifted = [];

function write(filePath, content) {
  if (CHECK) {
    const rel = filePath.startsWith(ROOT + '/') ? filePath.slice(ROOT.length + 1) : filePath;
    let existing;
    try { existing = readFileSync(filePath, 'utf8'); } catch { existing = null; }
    if (existing !== content) {
      drifted.push(rel);
      console.error(`  drift: ${rel}`);
    }
    return;
  }
  writeFileSync(filePath, content, 'utf8');
}

// ── Load inputs ─────────────────────────────────────────────

const catalog = JSON.parse(readFileSync(join(SRC, 'datasets/index.json'), 'utf8'));
const content = JSON.parse(readFileSync(join(__dir, 'category-content.json'), 'utf8'));
const feedXml = readFileSync(join(SRC, 'blog/feed.xml'), 'utf8');

// ── Validate: every catalog category needs a content entry ──

const catalogCategories = [...new Set(catalog.datasets.map(d => d.category))];
const missing = catalogCategories.filter(c => !content[c]);
if (missing.length) {
  console.error(`[generate-pages] ERROR: Missing content entries for: ${missing.join(', ')}`);
  console.error('  Add entries to data-pipeline/category-content.json and re-run.');
  process.exit(1);
}

// ── Feed parsing ─────────────────────────────────────────────

function extractCdata(block, tag) {
  const m = block.match(new RegExp(`<${tag}>[\\s\\S]*?<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>[\\s\\S]*?</${tag}>`));
  return m ? m[1].trim() : null;
}
function extractText(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1].trim() : null;
}

function parseFeed(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const title       = extractCdata(block, 'title');
    const link        = extractText(block, 'link');
    const description = extractCdata(block, 'description');
    const pubDate     = extractText(block, 'pubDate');
    const feedCat     = extractCdata(block, 'category');
    if (title && link) items.push({ title, link, description, pubDate, feedCat });
  }
  return items;
}

const posts = parseFeed(feedXml);

// Map feed <category> → category-content key. Most slug-match by coincidence
// (e.g. "Ham Radio — Technician" → "ham-radio"); aliases handle the rest, where
// the slug can't be derived (Security+ hub key is "cybersecurity", slug "security-plus").
const FEED_CAT_ALIASES = { 'Security+ SY0-701': 'cybersecurity' };

function feedCatToValue(feedCat) {
  if (!feedCat) return null;
  if (FEED_CAT_ALIASES[feedCat]) return FEED_CAT_ALIASES[feedCat];
  const base = feedCat.split(/\s*[—–\-]\s*/)[0].trim();
  return base.toLowerCase().replace(/\s+/g, '-');
}

// ── Marker injection ─────────────────────────────────────────

function inject(fileStr, markerName, newContent) {
  const startTag = `<!-- ${markerName}:start -->`;
  const endTag   = `<!-- ${markerName}:end -->`;
  const si = fileStr.indexOf(startTag);
  const ei = fileStr.indexOf(endTag);
  if (si === -1 || ei === -1) {
    throw new Error(`[generate-pages] Markers not found in file: <!-- ${markerName}:start/end -->`);
  }
  return fileStr.slice(0, si + startTag.length) + '\n' + newContent + '\n' + fileStr.slice(ei);
}

// ── HTML helpers ─────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escJson(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// ── Hub page template ────────────────────────────────────────

const CSS_VER = '20260607j';

function hubPage(catValue, cat, datasets, relatedPosts) {
  const baseUrl = `https://ryno.tools/${cat.slug}/`;
  const totalQ  = datasets.reduce((s, d) => s + d.count, 0);

  // ── BreadcrumbList LD ──────────────────────────────────
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ryno Tools', item: 'https://ryno.tools/' },
      { '@type': 'ListItem', position: 2, name: cat.label, item: baseUrl }
    ]
  };

  // ── CollectionPage LD ──────────────────────────────────
  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${baseUrl}#page`,
    name: cat.hubTitle,
    description: cat.metaDescription,
    url: baseUrl,
    dateModified: cat.lastModified || cat.added,
    about: {
      '@type': 'Thing',
      name: `${cat.label} Exam Prep`,
      sameAs: cat.sameAs
    },
    publisher: { '@id': 'https://ryno.tools/#org' }
  };

  // ── FAQPage LD ─────────────────────────────────────────
  const faqLd = cat.faq.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: cat.faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: esc(q),
      acceptedAnswer: { '@type': 'Answer', text: esc(a) }
    }))
  } : null;

  // ── Course list LD ─────────────────────────────────────
  const courseLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${cat.label} Practice Tracks`,
    itemListElement: datasets.map((ds, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Course',
        name: `${ds.label} Exam Prep`,
        description: cat.subcategoryBlurbs?.[ds.subcategory] || `${ds.count} practice questions for ${ds.label}.`,
        url: `https://ryno.tools/?category=${encodeURIComponent(catValue)}&subcategory=${encodeURIComponent(ds.subcategory)}`,
        provider: { '@type': 'Organization', name: 'Ryno Tools', url: 'https://ryno.tools' },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
      }
    }))
  };

  // ── Track cards HTML ───────────────────────────────────
  const trackCards = datasets.map(ds => {
    const blurb = cat.subcategoryBlurbs?.[ds.subcategory] || '';
    const href  = `/?category=${encodeURIComponent(catValue)}&subcategory=${encodeURIComponent(ds.subcategory)}`;
    return `    <a href="${href}" class="hub-track-card">
      <span class="hub-track-name">${esc(ds.label)}</span>
      <span class="hub-track-blurb">${esc(blurb)}</span>
      <div class="hub-track-meta">
        <span class="hub-track-count">${ds.count} questions</span>
        <span class="hub-track-cta">Practice →</span>
      </div>
    </a>`;
  }).join('\n');

  // ── Intro paragraphs HTML ──────────────────────────────
  const introParagraphs = (cat.intro || []).map(p => `  <p>${p}</p>`).join('\n');

  // ── FAQ HTML ───────────────────────────────────────────
  const faqHtml = (cat.faq || []).map(({ q, a }) => `    <details>
      <summary>${esc(q)}</summary>
      <p>${esc(a)}</p>
    </details>`).join('\n');

  // ── Related posts HTML ─────────────────────────────────
  const relatedHtml = relatedPosts.length ? `
  <section class="hub-blog" id="blog">
    <h2 class="hub-section-title">Study Guides</h2>
    <ul class="hub-post-list">
${relatedPosts.map(p => `      <li>
        <a href="${esc(p.link)}" class="hub-post-card">
          <p class="hub-post-title">${esc(p.title)}</p>
          <p class="hub-post-desc">${esc(p.description || '')}</p>
        </a>
      </li>`).join('\n')}
    </ul>
  </section>` : '';

  // ── JSON-LD blocks ─────────────────────────────────────
  const ldBlocks = [breadcrumbLd, collectionLd];
  if (faqLd) ldBlocks.push(faqLd);
  ldBlocks.push(courseLd);
  const ldHtml = ldBlocks.map(ld =>
    `  <script type="application/ld+json">\n  ${JSON.stringify(ld, null, 2).replace(/\n/g, '\n  ')}\n  </script>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5" />

  <title>${esc(cat.hubTitle)}</title>
  <meta name="description" content="${esc(cat.metaDescription)}" />
  <meta name="keywords" content="${esc(cat.keywords.join(', '))}" />
  <meta name="author" content="Ryno Tools" />
  <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
  <link rel="canonical" href="${baseUrl}" />

  <link rel="alternate" type="application/rss+xml" title="Ryno Tools Blog" href="https://ryno.tools/blog/feed.xml" />

  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
  <link rel="preload" as="image" href="/images/logo.webp" fetchpriority="high" type="image/webp" />

  <link rel="icon" type="image/png" href="/images/favicon-96x96.png" sizes="96x96" />
  <link rel="shortcut icon" href="/images/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="Ryno Tools" />
  <link rel="manifest" href="/manifest.json?v=20250915" />
  <meta name="theme-color" content="#0f1115" />

  <meta property="og:site_name" content="Ryno Tools" />
  <meta property="og:title" content="${esc(cat.hubTitle)}" />
  <meta property="og:description" content="${esc(cat.metaDescription)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${baseUrl}" />
  <meta property="og:image" content="${esc(cat.ogImage)}" />
  <meta property="og:image:alt" content="Ryno Tools — ${esc(cat.label)} exam prep" />
  <meta property="og:locale" content="en_US" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(cat.hubTitle)}" />
  <meta name="twitter:description" content="${esc(cat.metaDescription)}" />
  <meta name="twitter:image" content="${esc(cat.ogImage)}" />

  <meta name="google-adsense-account" content="ca-pub-5854133806080130" />
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-WCJFB67G3V"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag("js", new Date());
    gtag("config", "G-WCJFB67G3V");
  </script>

<!-- chrome-assets:start -->
<!-- chrome-assets:end -->
  <link rel="stylesheet" href="/css/hub.css?v=${CSS_VER}" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />

${ldHtml}
</head>

<body class="dark-mode">
  <script>
    try {
      const t = localStorage.getItem('theme');
      const d = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = t || (d ? 'dark' : 'light');
      document.body.classList.remove('dark-mode', 'light-mode');
      document.body.classList.add(theme === 'dark' ? 'dark-mode' : 'light-mode');
    } catch(e) {}
  </script>

  <a class="skip-link" href="#main">Skip to content</a>

<!-- chrome-header:start active="${catValue}" -->
<!-- chrome-header:end -->

  <main id="main" class="hub-page">

    <nav class="hub-breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="/">Ryno Tools</a></li>
        <li aria-current="page">${esc(cat.label)}</li>
      </ol>
    </nav>

    <section class="hub-hero">
      <span class="hub-hero-icon" role="img" aria-label="${esc(cat.label)}">${cat.icon}</span>
      <h1>${esc(cat.headline)}</h1>
      <p class="hub-hero-tagline">${esc(cat.tagline)}</p>
      <p class="hub-answer">${esc(cat.answerSummary)}</p>
      <a href="/?category=${encodeURIComponent(catValue)}" class="hub-cta">Start practicing — free, no login</a>
    </section>

    <section class="hub-tracks" id="tracks">
      <h2 class="hub-section-title">Practice Tracks</h2>
      <div class="hub-track-grid">
${trackCards}
      </div>
    </section>

    <section class="hub-content" id="about">
      <h2 class="hub-section-title">About ${esc(cat.label)} Exam Prep on Ryno Tools</h2>
${introParagraphs}
    </section>

    <section class="hub-faq" id="faq">
      <h2 class="hub-section-title">Frequently Asked Questions</h2>
${faqHtml}
    </section>
${relatedHtml}

    <div class="hub-back">
      <a href="/">← All study tracks</a>
    </div>

  </main>

<!-- chrome-footer:start -->
<!-- chrome-footer:end -->

</body>
</html>`;
}

// ── Generate hub pages ────────────────────────────────────────

log('[generate-pages] Generating hub pages...');
for (const [catValue, cat] of Object.entries(content)) {
  if (catValue.startsWith('_')) continue;
  if (cat.handAuthored) continue; // hand-authored hub (e.g. Japanese) — page is maintained by hand, not generated
  const datasets     = catalog.datasets.filter(d => d.category === catValue);
  const relatedPosts = posts.filter(p => feedCatToValue(p.feedCat) === catValue);
  const raw          = hubPage(catValue, cat, datasets, relatedPosts);
  const { html }     = injectChrome(raw, join(SRC, cat.slug, 'index.html'));
  const dir          = join(SRC, cat.slug);
  if (!CHECK) mkdirSync(dir, { recursive: true });
  write(join(dir, 'index.html'), html);
  log(`  → src/${cat.slug}/index.html  (${datasets.length} track${datasets.length !== 1 ? 's' : ''}, ${relatedPosts.length} post${relatedPosts.length !== 1 ? 's' : ''})`);
}

// ── Generate home track-grid (injection into index.html) ──────

log('[generate-pages] Injecting into src/index.html...');

let indexHtml = readFileSync(join(SRC, 'index.html'), 'utf8');

// Track grid
// Featured = any dataset whose pool carries a `featured` block.
// comingSoon: true  → "Coming Soon" section (announced but not yet live)
// comingSoon: false/absent → "What's New" section (already live)
// Presence-based so generation stays deterministic; prune-featured.mjs handles expiry.
const featuredDatasets   = catalog.datasets.filter(d => d.pool?.featured);
const comingSoonDatasets = featuredDatasets.filter(d => d.pool.featured.comingSoon);
const newDatasets        = featuredDatasets.filter(d => !d.pool.featured.comingSoon);

// Count = sum of dataset question counts, or — for hand-authored modules with no
// quiz datasets (e.g. Japanese) — the live item count read from their data manifest.
function trackCount(catValue, cat) {
  if (cat.countFrom) {
    const manifest = JSON.parse(readFileSync(join(SRC, cat.countFrom), 'utf8'));
    return (manifest.levels || [])
      .filter(l => l.status === 'available')
      .flatMap(l => l.skills || [])
      .reduce((s, sk) => s + (sk.count || 0), 0);
  }
  return catalog.datasets
    .filter(d => d.category === catValue)
    .reduce((s, d) => s + d.count, 0);
}

const trackGridHtml = Object.entries(content)
  .filter(([k]) => !k.startsWith('_'))
  .map(([catValue, cat]) => {
    const totalQ = trackCount(catValue, cat);
    const noun   = cat.countNoun || 'questions';
    return `    <a href="/${esc(cat.slug)}/" class="track-card">
      <span class="track-card-icon">${cat.icon}</span>
      <span class="track-card-title">${esc(cat.label)}</span>
      <span class="track-card-count">${totalQ.toLocaleString()} ${esc(noun)}</span>
    </a>`;
  }).join('\n');

indexHtml = inject(indexHtml, 'track-grid', trackGridHtml);

// What's new — entries marked isNew or the 2 most recently added
const sortedContent = Object.entries(content)
  .filter(([k]) => !k.startsWith('_'))
  .sort(([, a], [, b]) => (b.added || '').localeCompare(a.added || ''));

const newEntries = sortedContent.filter(([, c]) => c.isNew);
const whatsNewItems = newEntries.length
  ? newEntries
  : sortedContent.slice(0, 2);

// ── Coming Soon section ───────────────────────────────────────
const comingSoonHtml = comingSoonDatasets.length ? `  <section id="coming-soon" class="landing-block landing-coming-soon">
    <h2>Coming Soon</h2>
    <ul class="whats-new-list">
${comingSoonDatasets.map(d => {
  const cat = content[d.category];
  const f = d.pool.featured;
  return `      <li>
        <a href="/${esc(cat.slug)}/" class="whats-new-item is-coming-soon">
          <span class="whats-new-icon">${cat.icon}</span>
          <span>
            <strong>${esc(cat.label)} — ${esc(d.label)}</strong>
            <span class="whats-new-date">${esc(f.headline)}</span>
          </span>
          <span class="whats-new-badge coming-soon-badge">Live ${esc(f.from)}</span>
        </a>
      </li>`;
}).join('\n')}
    </ul>
  </section>` : '';

indexHtml = inject(indexHtml, 'coming-soon', comingSoonHtml);

// Featured pool refreshes lead the list (subcategory-level, with a cycle badge),
// followed by category-level "new track" entries.
const featuredLis = newDatasets.map(d => {
  const cat = content[d.category];
  const f = d.pool.featured;
  return `      <li>
        <a href="/${esc(cat.slug)}/" class="whats-new-item is-featured">
          <span class="whats-new-icon">${cat.icon}</span>
          <span>
            <strong>${esc(cat.label)} — ${esc(d.label)}</strong>
            <span class="whats-new-date">${esc(f.headline)}</span>
          </span>
          <span class="whats-new-badge">${esc(f.badge)}</span>
        </a>
      </li>`;
});
// Exclude categories that already appear in Coming Soon or What's New (featured).
const featuredCats = new Set(featuredDatasets.map(d => d.category));
const categoryLis = whatsNewItems
  .filter(([k]) => !featuredCats.has(k))
  .map(([, c]) => `      <li>
        <a href="/${esc(c.slug)}/" class="whats-new-item">
          <span class="whats-new-icon">${c.icon}</span>
          <span>
            <strong>${esc(c.label)}</strong>
            <span class="whats-new-date">Added ${c.added}</span>
          </span>
        </a>
      </li>`);
const whatsNewLis = [...featuredLis, ...categoryLis];

const whatsNewHtml = whatsNewLis.length ? `  <section id="whats-new" class="landing-block landing-whats-new">
    <h2>What's New</h2>
    <ul class="whats-new-list">
${whatsNewLis.join('\n')}
    </ul>
  </section>` : '';

indexHtml = inject(indexHtml, 'whats-new', whatsNewHtml);

// Featured — newest blog post
const featured = posts[0];
const featuredHtml = featured ? `  <section class="landing-block landing-featured" id="blog">
    <h2>From the Blog</h2>
    <a href="${esc(featured.link)}" class="featured-post-card">
      <p class="featured-post-title">${esc(featured.title)}</p>
      <p class="featured-post-desc">${esc(featured.description || '')}</p>
      <span class="featured-post-read">Read article →</span>
    </a>
    <a href="/blog/" class="featured-all-link">All study guides →</a>
  </section>` : '';

indexHtml = inject(indexHtml, 'featured', featuredHtml);

// Home JSON-LD — slim, generation-owned schema
const orgLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://ryno.tools/#org',
      name: 'Ryno Tools',
      url: 'https://ryno.tools/',
      logo: 'https://ryno.tools/images/logo.webp',
      description: 'Ryno Tools is a free microlearning platform for certification and licensing exam preparation. No login, no paywall, works offline.',
      email: 'rhino404@pm.me',
      sameAs: ['https://github.com/rhino404'],
      member: { '@id': 'https://ryno.tools/#ask-ryno' }
    },
    {
      '@type': 'Person',
      '@id': 'https://ryno.tools/#ask-ryno',
      name: 'Ask Ryno',
      description: 'Ask Ryno is the editorial persona of Ryno Tools. Articles are drafted with AI assistance and reviewed by a human before publishing.',
      worksFor: { '@id': 'https://ryno.tools/#org' },
      knowsAbout: ['Amateur Radio Licensing', 'FCC Part 97 Regulations', 'Falconry Apprentice Certification', 'Raptor Biology', 'CompTIA Security+ SY0-701', 'Cybersecurity', 'DevOps', 'Kubernetes', 'Site Reliability Engineering'],
      url: 'https://ryno.tools/pages/about.html'
    },
    {
      '@type': 'WebSite',
      '@id': 'https://ryno.tools/#site',
      url: 'https://ryno.tools/',
      name: 'Ryno Tools',
      publisher: { '@id': 'https://ryno.tools/#org' },
      inLanguage: 'en'
    },
    {
      '@type': 'WebApplication',
      name: 'Ryno Tools',
      url: 'https://ryno.tools',
      description: 'Free microlearning platform for certification exam prep. No login required. Works offline.',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Organization', name: 'Ryno Tools', url: 'https://ryno.tools' }
    },
    {
      '@type': 'CollectionPage',
      '@id': 'https://ryno.tools/#catalog',
      name: 'Certification Exam Prep Tracks',
      url: 'https://ryno.tools/',
      publisher: { '@id': 'https://ryno.tools/#org' },
      hasPart: Object.entries(content)
        .filter(([k]) => !k.startsWith('_'))
        .map(([, c]) => ({
          '@type': 'WebPage',
          name: c.hubTitle,
          url: `https://ryno.tools/${c.slug}/`
        }))
    }
  ]
};

const homeJsonLd = `  <script type="application/ld+json">\n  ${JSON.stringify(orgLd, null, 2).replace(/\n/g, '\n  ')}\n  </script>`;
indexHtml = inject(indexHtml, 'home-jsonld', homeJsonLd);

write(join(SRC, 'index.html'), indexHtml);
log('  → src/index.html');

// ── Sitemap injection ─────────────────────────────────────────

log('[generate-pages] Injecting into src/sitemap.xml...');
let sitemapXml = readFileSync(join(SRC, 'sitemap.xml'), 'utf8');

const hubSitemapEntries = Object.entries(content)
  .filter(([k]) => !k.startsWith('_'))
  .map(([, c]) => `  <url>
    <loc>https://ryno.tools/${c.slug}/</loc>
    <lastmod>${c.lastModified || c.added}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`).join('\n');

sitemapXml = inject(sitemapXml, 'hubs', hubSitemapEntries);
write(join(SRC, 'sitemap.xml'), sitemapXml);
log('  → src/sitemap.xml');

// ── llms.txt injection ────────────────────────────────────────

log('[generate-pages] Injecting into src/llms.txt...');
let llmsTxt = readFileSync(join(SRC, 'llms.txt'), 'utf8');

const llmsQuizLines = Object.entries(content)
  .filter(([k, c]) => !k.startsWith('_') && !c.handAuthored)
  .flatMap(([catValue, cat]) => {
    const datasets = catalog.datasets.filter(d => d.category === catValue);
    return datasets.map(ds => {
      const blurb = cat.subcategoryBlurbs?.[ds.subcategory] || `${ds.count} practice questions.`;
      return `- [${ds.label}](https://ryno.tools/${cat.slug}/): ${ds.count}+ questions — ${blurb}`;
    });
  }).join('\n');

llmsTxt = inject(llmsTxt, 'quizzes', llmsQuizLines);
write(join(SRC, 'llms.txt'), llmsTxt);
log('  → src/llms.txt');

// ── llms-full.txt injection ───────────────────────────────────

log('[generate-pages] Injecting into src/llms-full.txt...');
let llmsFullTxt = readFileSync(join(SRC, 'llms-full.txt'), 'utf8');

const llmsFullQuizLines = Object.entries(content)
  .filter(([k, c]) => !k.startsWith('_') && !c.handAuthored)
  .map(([catValue, cat]) => {
    const datasets = catalog.datasets.filter(d => d.category === catValue);
    const tracks = datasets.map(ds => {
      const blurb = cat.subcategoryBlurbs?.[ds.subcategory] || '';
      return `  - **${ds.label}** (${ds.count}+ questions): ${blurb}`;
    }).join('\n');
    return `### ${cat.label}\n\nHub: https://ryno.tools/${cat.slug}/\n\n${tracks}`;
  }).join('\n\n');

llmsFullTxt = inject(llmsFullTxt, 'quizzes', llmsFullQuizLines);
write(join(SRC, 'llms-full.txt'), llmsFullTxt);
log('  → src/llms-full.txt');

if (CHECK) {
  if (drifted.length) {
    console.error(`\n✗ ${drifted.length} file(s) are stale. Run 'node data-pipeline/generate-pages.mjs' and commit the result.`);
    process.exit(1);
  }
  console.log(`✓ All generated pages are up to date`);
} else {
  console.log('[generate-pages] All done.');
}
