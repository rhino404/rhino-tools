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
const QUEUE_FILE = join(ROOT, 'blog-pipeline', 'queue.json');

// Track config: maps dataset paths to blog metadata
const TRACKS = [
  { category: 'ham-radio', subcategory: 'technician', trackKey: 'ham-radio/technician', label: 'Ham Radio — Technician', icon: '📻' },
  { category: 'ham-radio', subcategory: 'general',    trackKey: 'ham-radio/general',    label: 'Ham Radio — General',    icon: '📻' },
  { category: 'ham-radio', subcategory: 'extra',      trackKey: 'ham-radio/extra',       label: 'Ham Radio — Extra',      icon: '📻' },
  { category: 'falconry',  subcategory: 'apprentice', trackKey: 'falconry/apprentice',   label: 'Falconry — Apprentice',  icon: '🦅' },
  { category: 'cybersecurity', subcategory: 'sy0-701', trackKey: 'cybersecurity/sy0-701', label: 'Security+ SY0-701',     icon: '🔒' },
];

function loadJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return null; }
}

// Load existing published/ready posts to avoid re-suggesting covered topics
const existingPosts = loadJson(POSTS_FILE) || [];
const coveredTopics = new Set(existingPosts.flatMap(p => p.tags || []));

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

// Score topics: more questions = richer material; penalize already-covered tags
const ideas = Object.values(topicMap).map(t => {
  const tags = [...t.tags];
  const alreadyCovered = tags.filter(tag => coveredTopics.has(tag)).length;
  const novelty = tags.length > 0 ? 1 - alreadyCovered / tags.length : 1;
  const score = Math.round(t.questionCount * novelty);
  return {
    trackKey: t.trackKey,
    trackLabel: t.trackLabel,
    trackIcon: t.trackIcon,
    topic: t.topic,
    tags,
    questionCount: t.questionCount,
    noveltyScore: score,
    suggestedTitle: `${t.topic} — ${t.trackLabel} Study Guide`,
    notes: `${t.questionCount} questions covering this topic in the dataset. Tags: ${tags.join(', ') || 'none'}.`,
  };
});

// Sort by novelty score descending, then question count
ideas.sort((a, b) => b.noveltyScore - a.noveltyScore || b.questionCount - a.questionCount);

writeFileSync(QUEUE_FILE, JSON.stringify(ideas, null, 2));

console.log(`✅ Wrote ${ideas.length} topic ideas to blog-pipeline/queue.json`);
console.log('Top 10 ideas:');
ideas.slice(0, 10).forEach((idea, i) => {
  console.log(`  ${i + 1}. [${idea.trackKey}] ${idea.topic} (score: ${idea.noveltyScore}, questions: ${idea.questionCount})`);
});
