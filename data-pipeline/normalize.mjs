#!/usr/bin/env node
/**
 * Normalizes neutral intermediate question objects (e.g. from
 * parsers/ncvec_pool.py) into the app's canonical schema.
 *
 * Pools carry no explanations or tags, and the historical `explanation` was
 * just a copy of the correct answer. So we CARRY FORWARD explanation/tags/image
 * from an existing dataset (matched by normalized question text) and fall back
 * to the correct-answer text for explanation — never inventing content.
 *
 * Exposed as a function (used by import-pool.mjs) and runnable standalone:
 *   node normalize.mjs intermediate.json --category ham-radio --subcategory Technician \
 *        [--carry-from src/datasets/ham-radio/technician.json] [--out path]
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const normKey = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
export const questionId = (subcategory, question, choices, correct) => {
  const basis = [question, ...[...choices].sort(), correct].join('␟');
  return `${slug(subcategory)}-${crypto.createHash('sha1').update(basis).digest('hex').slice(0, 10)}`;
};

const KEY_ORDER = ['id', 'question', 'choices', 'correct', 'explanation', 'category',
  'subcategory', 'topic_id', 'topic_label', 'topic', 'total_topic_questions', 'type', 'image', 'tags'];
const ordered = (o) => Object.fromEntries(KEY_ORDER.filter((k) => k in o).map((k) => [k, o[k]]));

function buildCarryMap(carryFromPath) {
  const map = new Map();
  if (!carryFromPath || !fs.existsSync(carryFromPath)) return map;
  for (const q of JSON.parse(fs.readFileSync(carryFromPath, 'utf8'))) {
    map.set(normKey(q.question), { explanation: q.explanation, tags: q.tags, image: q.image });
  }
  return map;
}

/** intermediate[] + opts -> {questions, report} */
export function normalize(intermediate, opts) {
  const { category, subcategory } = opts;
  const carry = buildCarryMap(opts.carryFrom);
  const errors = [];
  const out = intermediate.map((q, i) => {
    const choices = (q.choices || []).map((c) => String(c).trim());
    const li = 'ABCD'.indexOf(q.correct_letter);
    const correct = choices[li];
    if (li < 0 || correct == null) errors.push(`#${i} ${q.native_id || ''}: bad correct_letter '${q.correct_letter}' for ${choices.length} choices`);
    const c = carry.get(normKey(q.question)) || {};
    const figureImage = q.figure ? `./images/${slug(category)}/${q.figure}.jpg` : '';
    return ordered({
      id: questionId(subcategory, q.question, choices, correct || ''),
      question: String(q.question).trim(),
      choices,
      correct: correct || '',
      explanation: (c.explanation && c.explanation.trim()) ? c.explanation : (correct || ''),
      category,
      subcategory,
      topic_id: q.group || '',
      topic_label: q.subelement || '',
      topic: q.group_desc || q.subelement_title || '',
      total_topic_questions: 0, // filled below
      type: 'multiple',
      image: c.image || figureImage,
      tags: Array.isArray(c.tags) ? c.tags : [],
    });
  });

  // total_topic_questions = count per topic_label (subelement)
  const perLabel = {};
  for (const q of out) perLabel[q.topic_label] = (perLabel[q.topic_label] || 0) + 1;
  for (const q of out) q.total_topic_questions = perLabel[q.topic_label];

  const report = {
    total: out.length,
    placeholderExplanations: out.filter((q) => normKey(q.explanation) === normKey(q.correct)).length,
    untagged: out.filter((q) => !q.tags.length).length,
    withImages: out.filter((q) => q.image).length,
    carriedFrom: opts.carryFrom || null,
    subelements: perLabel,
    errors,
  };
  return { questions: out, report };
}

// --- standalone CLI ---
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) a[argv[i].slice(2)] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
    else a._.push(argv[i]);
  }
  return a;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = parseArgs(process.argv.slice(2));
  if (!a._[0] || !a.category || !a.subcategory) {
    console.error('Usage: node normalize.mjs <intermediate.json> --category <c> --subcategory <Label> [--carry-from <path>] [--out <path>]');
    process.exit(1);
  }
  const intermediate = JSON.parse(fs.readFileSync(a._[0], 'utf8'));
  const { questions, report } = normalize(intermediate, { category: a.category, subcategory: a.subcategory, carryFrom: a['carry-from'] });
  const json = JSON.stringify(questions, null, 2) + '\n';
  if (a.out) { fs.writeFileSync(a.out, json); console.error(`wrote ${questions.length} questions -> ${a.out}`); }
  else process.stdout.write(json);
  console.error('report:', JSON.stringify(report));
  if (report.errors.length) process.exit(1);
}
