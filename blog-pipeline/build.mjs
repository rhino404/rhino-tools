#!/usr/bin/env node
// blog-pipeline/build.mjs
// Compiles Markdown drafts → static HTML posts + blog index + RSS feed.
// Idempotent: re-running produces no diff if drafts haven't changed.
// Only edits managed regions (<!-- blog:start -->…<!-- blog:end -->) in shared files.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { injectChrome } from '../data-pipeline/sync-chrome.mjs';
import { bumpServiceWorkerVersion } from '../data-pipeline/chrome/sw-version.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRAFTS_DIR = join(ROOT, 'blog-pipeline', 'drafts');
const TEMPLATES_DIR = join(ROOT, 'blog-pipeline', 'templates');
const SRC_BLOG_DIR = join(ROOT, 'src', 'blog');
const CSS_DIR = join(ROOT, 'src', 'css');
const POSTS_JSON = join(ROOT, 'blog-pipeline', 'posts.json');
const SITEMAP = join(ROOT, 'src', 'sitemap.xml');
const LLMS_TXT = join(ROOT, 'src', 'llms.txt');
const LLMS_FULL_TXT = join(ROOT, 'src', 'llms-full.txt');

// ── Track config ──────────────────────────────────────────────────────────────
// heroImage/heroAlt: the WebP wallpaper shown behind the gradient on post heroes,
// blog cards, and the featured block. Keyed per-track (NOT by slug) so cybersecurity
// can map to the security-plus art while keeping its own CSS/track slug.
const HAM_ALT    = 'Ham radio transceiver and antenna equipment — Ryno Tools ham radio license exam prep';
const FALC_ALT   = 'Falconer with a trained bird of prey in flight — Ryno Tools falconry apprentice exam prep';
const CYBER_ALT  = 'Cybersecurity digital lock visualization — Ryno Tools CompTIA Security+ SY0-701 exam prep';
const DEVOPS_ALT = 'Software engineering and DevOps workflow diagram — Ryno Tools DevOps interview prep';

const TRACK_META = {
  'ham-radio/technician': { label: 'Ham Radio — Technician', icon: '📻', slug: 'ham-radio', category: 'ham-radio', subcategory: 'technician', heroImage: '/images/blog/ham-radio-blog-hero.webp', heroAlt: HAM_ALT },
  'ham-radio/general':    { label: 'Ham Radio — General',    icon: '📻', slug: 'ham-radio', category: 'ham-radio', subcategory: 'general', heroImage: '/images/blog/ham-radio-blog-hero.webp', heroAlt: HAM_ALT },
  'ham-radio/extra':      { label: 'Ham Radio — Extra',      icon: '📻', slug: 'ham-radio', category: 'ham-radio', subcategory: 'extra', heroImage: '/images/blog/ham-radio-blog-hero.webp', heroAlt: HAM_ALT },
  'falconry/apprentice':  { label: 'Falconry — Apprentice',  icon: '🦅', slug: 'falconry',  category: 'falconry',  subcategory: 'apprentice', heroImage: '/images/blog/falconry-blog-hero.webp', heroAlt: FALC_ALT },
  'cybersecurity/sy0-701':{ label: 'Security+ SY0-701',      icon: '🔒', slug: 'cybersecurity', category: 'cybersecurity', subcategory: 'security+ sy0-701', heroImage: '/images/blog/security-plus-blog-hero.webp', heroAlt: CYBER_ALT },
  'devops/core-concepts': { label: 'DevOps — Core Concepts', icon: '⚙️', slug: 'devops', category: 'devops', subcategory: 'core-concepts', heroImage: '/images/blog/devops-blog-hero.webp', heroAlt: DEVOPS_ALT },
  'devops/containers-k8s':{ label: 'DevOps — Containers & Kubernetes', icon: '⚙️', slug: 'devops', category: 'devops', subcategory: 'containers-k8s', heroImage: '/images/blog/devops-blog-hero.webp', heroAlt: DEVOPS_ALT },
  'japanese/foundations': { label: 'Japanese — Foundations', icon: '🇯🇵', slug: 'japanese', category: 'japanese', subcategory: 'foundations', heroImage: '/images/blog/japanese-blog-hero.jpeg', heroAlt: 'Hiragana chart and Japanese text on a dark background — Ryno Tools Japanese learning' },
  'japanese/grammar':     { label: 'Japanese — Grammar',     icon: '🇯🇵', slug: 'japanese', category: 'japanese', subcategory: 'grammar',     heroImage: '/images/blog/japanese-blog-hero.jpeg', heroAlt: 'Japanese grammar particles and sentence patterns — Ryno Tools Japanese learning' },
};

// ── Tiny Markdown renderer (constrained subset) ────────────────────────────────
// Supported: headings (#-######), paragraphs, **bold**, *italic*, `code`,
// [link](url), > blockquote, - / * unordered list, 1. ordered list, blank lines.
// FAILS LOUDLY on fenced code blocks (```), tables, HTML passthrough — tell the
// author to simplify. Use npx marked if richer Markdown is needed.
function renderMarkdown(md) {
  const lines = md.split('\n');
  const html = [];
  let inUl = false, inOl = false, inBlockquote = false;

  function closeOpenBlocks() {
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (inOl) { html.push('</ol>'); inOl = false; }
    if (inBlockquote) { html.push('</blockquote>'); inBlockquote = false; }
  }

  function inline(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks — fail loudly
    if (/^```/.test(line)) {
      throw new Error(`Unsupported Markdown syntax on line ${i + 1}: fenced code blocks (\`\`\`) are not supported. Use inline \`code\` or simplify.`);
    }
    // Tables — fail loudly
    if (/^\|.+\|/.test(line)) {
      throw new Error(`Unsupported Markdown syntax on line ${i + 1}: tables are not supported. Use a list instead.`);
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      closeOpenBlocks();
      const level = hMatch[1].length;
      html.push(`<h${level}>${inline(hMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const text = line.replace(/^>\s?/, '');
      if (!inBlockquote) { html.push('<blockquote>'); inBlockquote = true; }
      html.push(`<p>${inline(text)}</p>`);
      continue;
    } else if (inBlockquote && line.trim() === '') {
      closeOpenBlocks();
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      if (inOl) { html.push('</ol>'); inOl = false; }
      if (!inUl) { html.push('<ul>'); inUl = true; }
      html.push(`<li>${inline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (inUl) { html.push('</ul>'); inUl = false; }
      if (!inOl) { html.push('<ol>'); inOl = true; }
      html.push(`<li>${inline(olMatch[1])}</li>`);
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      closeOpenBlocks();
      continue;
    }

    // Paragraph
    closeOpenBlocks();
    html.push(`<p>${inline(line)}</p>`);
  }

  closeOpenBlocks();
  return html.join('\n');
}

// ── Front-matter parser ────────────────────────────────────────────────────────
function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Missing or malformed front-matter (expected --- delimiters).');
  const yaml = match[1];
  const body = match[2].trim();
  const meta = {};
  for (const line of yaml.split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim().replace(/^["']|["']$/g, '');
    // Handle simple inline arrays: [a, b, c] — but NOT JSON arrays like [{...}]
    if (val.startsWith('[') && !val.includes('{')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    }
    meta[key] = val;
  }
  // sources is a special multi-line array — handled by JSON block in YAML
  return { meta, body };
}

// ── Date formatter ─────────────────────────────────────────────────────────────
function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Template fill helper ───────────────────────────────────────────────────────
function fill(template, vars) {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    if (!(key in vars)) throw new Error(`Template placeholder {{${key}}} not filled.`);
    return vars[key] ?? '';
  });
}

// ── Managed region replacement ─────────────────────────────────────────────────
function replaceManagedRegion(fileContent, regionId, newContent) {
  const start = `<!-- ${regionId}:start -->`;
  const end = `<!-- ${regionId}:end -->`;
  const pattern = new RegExp(`${escapeRe(start)}[\\s\\S]*?${escapeRe(end)}`, 'g');
  const replacement = `${start}\n${newContent}\n${end}`;
  if (pattern.test(fileContent)) {
    return fileContent.replace(new RegExp(`${escapeRe(start)}[\\s\\S]*?${escapeRe(end)}`), replacement);
  }
  // If region doesn't exist yet, append before </urlset> or at end
  return fileContent.replace(/<\/urlset>/, `${replacement}\n</urlset>`) || fileContent + '\n' + replacement;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Load templates ─────────────────────────────────────────────────────────────
const postTemplate = readFileSync(join(TEMPLATES_DIR, 'post.html'), 'utf8');
const indexTemplate = readFileSync(join(TEMPLATES_DIR, 'index.html'), 'utf8');
const cardTemplate = readFileSync(join(TEMPLATES_DIR, 'card.html'), 'utf8');

// ── Collect drafts ─────────────────────────────────────────────────────────────
const draftFiles = readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));
if (draftFiles.length === 0) {
  console.log('No drafts found in blog-pipeline/drafts/. Nothing to build.');
  process.exit(0);
}

mkdirSync(SRC_BLOG_DIR, { recursive: true });

const publishedPosts = [];
const bodyHtmlBySlug = new Map(); // used for RSS content:encoded

for (const file of draftFiles) {
  const raw = readFileSync(join(DRAFTS_DIR, file), 'utf8');
  let meta, bodyMd;
  try {
    ({ meta, body: bodyMd } = parseFrontMatter(raw));
  } catch (e) {
    console.error(`❌ ${file}: ${e.message}`);
    process.exit(1);
  }

  if (meta.status === 'draft') {
    console.log(`⏭  Skipping draft: ${file} (status=draft — set to "ready" to build)`);
    continue;
  }

  const slug = meta.slug;
  if (!slug) { console.error(`❌ ${file}: missing slug`); process.exit(1); }

  const track = TRACK_META[meta.track];
  if (!track) { console.error(`❌ ${file}: unknown track "${meta.track}"`); process.exit(1); }

  // Render body
  let bodyHtml;
  try {
    bodyHtml = renderMarkdown(bodyMd);
  } catch (e) {
    console.error(`❌ ${file}: ${e.message}`);
    process.exit(1);
  }

  // Parse sources (stored as JSON array in front-matter under sources key)
  let sources = [];
  try {
    const rawSources = meta.sources_json || meta.sources;
    sources = typeof rawSources === 'string' ? JSON.parse(rawSources) : (Array.isArray(rawSources) ? rawSources : []);
  } catch { sources = []; }

  // Parse faq_json for FAQPage schema + HTML H3 structure
  let faqItems = [];
  try {
    const rawFaq = meta.faq_json;
    faqItems = typeof rawFaq === 'string' ? JSON.parse(rawFaq) : (Array.isArray(rawFaq) ? rawFaq : []);
  } catch { faqItems = []; }

  const faqSchemaJson = faqItems.length
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }, null, 2)
    : '';

  const sourcesHtml = sources.map(s =>
    `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title}</a>${s.publisher ? ` — ${s.publisher}` : ''}${s.accessed ? ` (accessed ${s.accessed})` : ''}</li>`
  ).join('\n          ');

  // CTA URL: /?category=...&subcategory=... (URL-encoded)
  const ctaUrl = `/?category=${encodeURIComponent(track.category)}&subcategory=${encodeURIComponent(track.subcategory)}`;

  // Share URLs
  const postUrl = `https://ryno.tools/blog/${slug}/`;
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedTitle = encodeURIComponent(meta.title);

  const vars = {
    POST_TITLE: meta.title,
    POST_SLUG: slug,
    POST_DESCRIPTION: meta.description,
    POST_TRACK_SLUG: track.slug,
    POST_TRACK_LABEL: track.label,
    POST_TRACK_ICON: track.icon,
    POST_TRACK_IMAGE: track.heroImage,
    POST_TRACK_IMAGE_ALT: track.heroAlt,
    POST_OG_IMAGE: `https://ryno.tools${track.heroImage}`,
    POST_DATE_PUBLISHED: meta.datePublished,
    POST_DATE_MODIFIED: meta.dateModified || meta.datePublished,
    POST_DATE_FORMATTED: formatDate(meta.datePublished),
    POST_READING_TIME: meta.readingTime || '5',
    POST_BODY_HTML: bodyHtml,
    POST_SOURCES_SECTION: sourcesHtml
      ? `<section class="blog-sources" aria-label="Sources">\n        <h2>Sources</h2>\n        <ul>\n          ${sourcesHtml}\n        </ul>\n      </section>`
      : '',
    POST_QUIZ_CTA_URL: ctaUrl,
    POST_FAQ_SCHEMA: faqSchemaJson
      ? `\n  <script type="application/ld+json">\n  ${faqSchemaJson}\n  </script>`
      : '',
    POST_RELATED_HTML: '', // populated post-build once multiple posts exist
    SHARE_TWITTER_URL: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    SHARE_LINKEDIN_URL: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    SHARE_FACEBOOK_URL: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };

  const outDir = join(SRC_BLOG_DIR, slug);
  const { html: postHtml } = injectChrome(fill(postTemplate, vars), join(outDir, 'index.html'));
  bodyHtmlBySlug.set(slug, bodyHtml);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), postHtml);
  console.log(`✅ Built: src/blog/${slug}/index.html`);

  publishedPosts.push({
    slug,
    title: meta.title,
    description: meta.description,
    excerpt: meta.excerpt || meta.description,
    track: meta.track,
    trackLabel: track.label,
    trackIcon: track.icon,
    trackSlug: track.slug,
    trackCategory: track.category,
    trackImage: track.heroImage,
    trackImageAlt: track.heroAlt,
    tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    datePublished: meta.datePublished,
    dateModified: meta.dateModified || meta.datePublished,
    readingTime: parseInt(meta.readingTime, 10) || 5,
    url: `/blog/${slug}/`,
  });
}

if (publishedPosts.length === 0) {
  console.log('No posts with status=ready found. Set status to "ready" in a draft to build it.');
  process.exit(0);
}

// ── Write posts.json ───────────────────────────────────────────────────────────
publishedPosts.sort((a, b) => b.datePublished.localeCompare(a.datePublished));
writeFileSync(POSTS_JSON, JSON.stringify(publishedPosts, null, 2));
console.log(`✅ Updated blog-pipeline/posts.json (${publishedPosts.length} posts)`);

// ── Build blog index ───────────────────────────────────────────────────────────
function buildCardHtml(post, featured = false) {
  return fill(cardTemplate, {
    CARD_SLUG: post.slug,
    CARD_TITLE: post.title,
    CARD_EXCERPT: post.excerpt,
    CARD_TRACK_SLUG: post.trackSlug,
    CARD_TRACK_LABEL: post.trackLabel,
    CARD_TRACK_ICON: post.trackIcon,
    CARD_TRACK_IMAGE: post.trackImage,
    CARD_TRACK_IMAGE_ALT: post.trackImageAlt,
    CARD_TRACK_CATEGORY: post.trackCategory,
    CARD_DATE_PUBLISHED: post.datePublished,
    CARD_DATE_FORMATTED: formatDate(post.datePublished),
    CARD_READING_TIME: String(post.readingTime),
  });
}

const [featuredPost, ...restPosts] = publishedPosts;

const featuredHtml = featuredPost ? `
<section class="blog-featured" aria-label="Featured post">
  <h2 class="blog-featured-label">Featured</h2>
  <div class="blog-featured-inner blog-hero--${featuredPost.trackSlug}">
    <img src="${featuredPost.trackImage}" alt="${featuredPost.trackImageAlt}" class="blog-featured-img" width="1200" height="630" loading="lazy" decoding="async" />
    <span class="blog-card-track-badge">${featuredPost.trackLabel}</span>
    <div class="blog-featured-body">
      <h2 class="blog-featured-title"><a href="/blog/${featuredPost.slug}/">${featuredPost.title}</a></h2>
      <p class="blog-featured-excerpt">${featuredPost.excerpt}</p>
      <div class="blog-card-meta">
        <time datetime="${featuredPost.datePublished}">${formatDate(featuredPost.datePublished)}</time>
        <span class="blog-sep">·</span>
        <span>${featuredPost.readingTime} min read</span>
      </div>
    </div>
  </div>
</section>` : '';

const cardsHtml = publishedPosts.map(p => buildCardHtml(p)).join('\n      ');

const { html: indexHtml } = injectChrome(fill(indexTemplate, {
  BLOG_FEATURED_HTML: featuredHtml,
  BLOG_CARDS_HTML: cardsHtml,
}), join(SRC_BLOG_DIR, 'index.html'));

writeFileSync(join(SRC_BLOG_DIR, 'index.html'), indexHtml);
console.log('✅ Built: src/blog/index.html');

// ── Build RSS feed ─────────────────────────────────────────────────────────────
const rssItems = publishedPosts.map(p => {
  const fullBody = bodyHtmlBySlug.get(p.slug) || '';
  return `  <item>
    <title><![CDATA[${p.title}]]></title>
    <link>https://ryno.tools/blog/${p.slug}/</link>
    <guid isPermaLink="true">https://ryno.tools/blog/${p.slug}/</guid>
    <pubDate>${new Date(p.datePublished + 'T12:00:00Z').toUTCString()}</pubDate>
    <description><![CDATA[${p.excerpt}]]></description>
    <category><![CDATA[${p.trackLabel}]]></category>
    <author>noreply@ryno.tools (Ask Ryno)</author>
    <content:encoded><![CDATA[${fullBody}]]></content:encoded>
  </item>`;
}).join('\n');

const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Ryno Tools Blog</title>
    <link>https://ryno.tools/blog/</link>
    <description>Study guides and exam prep tips for Ham Radio, Falconry, and CompTIA Security+.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://ryno.tools/blog/feed.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>`;

writeFileSync(join(SRC_BLOG_DIR, 'feed.xml'), rssFeed);
console.log('✅ Built: src/blog/feed.xml');

// ── Update sitemap.xml (managed region) ────────────────────────────────────────
const sitemapContent = readFileSync(SITEMAP, 'utf8');
const blogSitemapEntries = [
  `  <url>
    <loc>https://ryno.tools/blog/</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
  ...publishedPosts.map(p => `  <url>
    <loc>https://ryno.tools/blog/${p.slug}/</loc>
    <lastmod>${p.dateModified || p.datePublished}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`)
].join('\n');

const newSitemap = replaceManagedRegion(sitemapContent, 'blog', blogSitemapEntries);
writeFileSync(SITEMAP, newSitemap);
console.log('✅ Updated sitemap.xml (blog region)');

// ── Update llms.txt (managed region) ──────────────────────────────────────────
function updateLlms(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  const articlesSection = publishedPosts.map(p => {
    const tagsLine = Array.isArray(p.tags) && p.tags.length ? `  tags: ${p.tags.join(', ')}` : '';
    return [
      `- [${p.title}](https://ryno.tools/blog/${p.slug}/) — ${p.excerpt}`,
      `  author: Ask Ryno`,
      `  published: ${p.datePublished}`,
      `  track: ${p.track}`,
      tagsLine,
    ].filter(Boolean).join('\n');
  }).join('\n');
  const updated = replaceManagedRegion(content, 'blog-articles', articlesSection);
  writeFileSync(filePath, updated);
  console.log(`✅ Updated ${filePath.split('/').pop()} (blog-articles region)`);
}
updateLlms(LLMS_TXT);
updateLlms(LLMS_FULL_TXT);

// ── Bump CACHE_VERSION in service-worker.js ────────────────────────────────
bumpServiceWorkerVersion(ROOT);

console.log(`\n🎉 Build complete. ${publishedPosts.length} post(s) compiled.`);
console.log('Review src/blog/ then authorize merge to main when satisfied.\n');
