#!/usr/bin/env node
// blog-pipeline/ideate.mjs
// Scans datasets + taxonomy + existing posts to rank under-covered topics.
// Writes blog-pipeline/queue.json with prioritized topic ideas.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASETS_DIR = join(ROOT, 'src', 'datasets');
const TAXONOMY_FILE = join(ROOT, 'data-pipeline', 'taxonomy.json');
const POSTS_FILE = join(ROOT, 'blog-pipeline', 'posts.json');
const BACKLOG_FILE = join(ROOT, 'blog-pipeline', 'backlog.json');
const QUEUE_FILE = join(ROOT, 'blog-pipeline', 'queue.json');

// A topic_label that is just a subelement code (T7, E9, G4, F8, **) makes a weak
// blog title ("T7 — Study Guide"). The backlog holds the real, intent-driven
// topics; these auto rows are raw signal only, so we flag and sink them.
const LOW_VALUE_TOPIC = /^[*]+$|^[A-Z]{1,2}\d+$/;

// Track config: maps dataset paths to blog metadata
const TRACKS = [
  { category: 'ham-radio', subcategory: 'technician', trackKey: 'ham-radio/technician', label: 'Ham Radio — Technician', icon: '📻' },
  { category: 'ham-radio', subcategory: 'general',    trackKey: 'ham-radio/general',    label: 'Ham Radio — General',    icon: '📻' },
  { category: 'ham-radio', subcategory: 'extra',      trackKey: 'ham-radio/extra',       label: 'Ham Radio — Extra',      icon: '📻' },
  { category: 'falconry',  subcategory: 'apprentice', trackKey: 'falconry/apprentice',   label: 'Falconry — Apprentice',  icon: '🦅' },
  { category: 'cybersecurity', subcategory: 'sy0-701', trackKey: 'cybersecurity/sy0-701', label: 'Security+ SY0-701',         icon: '🔒' },
  { category: 'devops', subcategory: 'core-concepts',  trackKey: 'devops/core-concepts',  label: 'DevOps — Core Concepts & Culture',      icon: '⚙️' },
  { category: 'devops', subcategory: 'containers-k8s', trackKey: 'devops/containers-k8s', label: 'DevOps — Containers & Kubernetes',       icon: '⚙️' },
  { category: 'devops', subcategory: 'linux',          trackKey: 'devops/linux',          label: 'DevOps — Linux Fundamentals',            icon: '⚙️' },
  { category: 'devops', subcategory: 'networking',     trackKey: 'devops/networking',     label: 'DevOps — Networking for DevOps',         icon: '⚙️' },
  { category: 'devops', subcategory: 'cicd',           trackKey: 'devops/cicd',           label: 'DevOps — CI/CD Pipelines',               icon: '⚙️' },
  { category: 'devops', subcategory: 'iac',            trackKey: 'devops/iac',            label: 'DevOps — Infrastructure as Code',        icon: '⚙️' },
  { category: 'devops', subcategory: 'cloud',          trackKey: 'devops/cloud',          label: 'DevOps — Cloud Platforms',               icon: '⚙️' },
  { category: 'devops', subcategory: 'observability',  trackKey: 'devops/observability',  label: 'DevOps — Monitoring & Observability',    icon: '⚙️' },
  { category: 'japanese', subcategory: 'foundations', trackKey: 'japanese/foundations', label: 'Japanese — Foundations', icon: '🇯🇵' },
  { category: 'japanese', subcategory: 'grammar',     trackKey: 'japanese/grammar',     label: 'Japanese — Grammar',     icon: '🇯🇵' },
];

function loadJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return null; }
}

// Load existing published/ready posts to avoid re-suggesting covered topics
const existingPosts = loadJson(POSTS_FILE) || [];
const coveredTopics = new Set(existingPosts.flatMap(p => p.tags || []));

// Load the curated backlog: it is the editorial source of truth. Count how many
// rows already target each track so ideate can surface UNDER-served tracks
// instead of re-suggesting topics a human already lined up.
const backlog = loadJson(BACKLOG_FILE) || [];
const backlogByTrack = {};
const backlogSlugs = new Set(backlog.map(r => r.slug));
for (const row of backlog) backlogByTrack[row.track] = (backlogByTrack[row.track] || 0) + 1;

// Load taxonomy for tag vocabulary reference
const taxonomy = loadJson(TAXONOMY_FILE);

// Collect topic frequency across datasets
const topicMap = {}; // topicKey → { track, topic, tags, questionCount, score }

for (const track of TRACKS) {
  const datasetPath = join(DATASETS_DIR, track.category,
    track.subcategory === 'sy0-701'
      ? 'security+ sy0-701.json'
      : `${track.subcategory}.json`
  );
  if (!existsSync(datasetPath)) continue;

  const questions = loadJson(datasetPath);
  if (!Array.isArray(questions)) continue;

  // Group by topic_label + track
  for (const q of questions) {
    const topicLabel = q.topic_label || q.topic || 'General';
    const key = `${track.trackKey}::${topicLabel}`;
    if (!topicMap[key]) {
      topicMap[key] = {
        trackKey: track.trackKey,
        trackLabel: track.label,
        trackIcon: track.icon,
        topic: topicLabel,
        tags: new Set(),
        questionCount: 0,
      };
    }
    topicMap[key].questionCount++;
    (q.tags || []).forEach(t => topicMap[key].tags.add(t));
  }
}

// Score topics: more questions = richer material; penalize already-covered tags,
// flag low-value subelement-code topics, and boost tracks the backlog under-serves.
const ideas = Object.values(topicMap).map(t => {
  const tags = [...t.tags];
  const alreadyCovered = tags.filter(tag => coveredTopics.has(tag)).length;
  const novelty = tags.length > 0 ? 1 - alreadyCovered / tags.length : 1;
  const lowValue = LOW_VALUE_TOPIC.test(t.topic.trim());
  // Under-served tracks (few/no curated backlog rows) get a gentle multiplier so
  // they float above tracks the editorial calendar already covers well.
  const backlogCount = backlogByTrack[t.trackKey] || 0;
  const demand = 1 + 1 / (1 + backlogCount);
  const score = Math.round(t.questionCount * novelty * demand);
  return {
    trackKey: t.trackKey,
    trackLabel: t.trackLabel,
    trackIcon: t.trackIcon,
    topic: t.topic,
    tags,
    questionCount: t.questionCount,
    backlogCount,
    lowValue,
    noveltyScore: score,
    suggestedTitle: `${t.topic} — ${t.trackLabel} Study Guide`,
    notes: `${t.questionCount} questions covering this topic in the dataset. Tags: ${tags.join(', ') || 'none'}.`,
  };
});

// Filter out topics whose slug is already in the curated backlog — avoids re-
// surfacing work already lined up. Slug matching is best-effort (derived from
// topic label); the backlog is the authoritative list of what's planned.
const freshIdeas = ideas.filter(i => {
  const derivedSlug = i.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return !backlogSlugs.has(derivedSlug);
});

// Real topics first; low-value subelement codes always sink to the bottom.
freshIdeas.sort((a, b) =>
  (a.lowValue ? 1 : 0) - (b.lowValue ? 1 : 0) ||
  b.noveltyScore - a.noveltyScore ||
  b.questionCount - a.questionCount);

writeFileSync(QUEUE_FILE, JSON.stringify(freshIdeas, null, 2));

const realIdeas = freshIdeas.filter(i => !i.lowValue);
const skipped = ideas.length - freshIdeas.length;
console.log(`✅ Wrote ${freshIdeas.length} topic ideas to blog-pipeline/queue.json (${realIdeas.length} usable, ${freshIdeas.length - realIdeas.length} low-value sunk, ${skipped} already in backlog).`);
console.log('\nUnder-served tracks (fewest curated backlog rows):');
Object.keys(backlogByTrack).length === 0
  ? console.log('  (backlog.json empty — every track is open)')
  : [...new Set(freshIdeas.map(i => i.trackKey))]
      .sort((a, b) => (backlogByTrack[a] || 0) - (backlogByTrack[b] || 0))
      .slice(0, 5)
      .forEach(tk => console.log(`  ${(backlogByTrack[tk] || 0).toString().padStart(2)} backlog rows — ${tk}`));
console.log('\nTop 10 usable ideas:');
realIdeas.slice(0, 10).forEach((idea, i) => {
  console.log(`  ${i + 1}. [${idea.trackKey}] ${idea.topic} (score: ${idea.noveltyScore}, questions: ${idea.questionCount})`);
});
console.log('\n→ Curate the winners into blog-pipeline/backlog.json, then: node blog-pipeline/backlog.mjs --next');
