# data-pipeline

Offline data engineering for Ryno Tools. **Tracked in git but never deployed** —
the Pages workflow (`static.yml`) only uploads `./src`. This directory treats the
quiz datasets as a database:

| Database concept | Here |
|---|---|
| Schema / DDL | `schema/question.schema.json`, `schema/exam.schema.json` |
| Tables | `src/datasets/**/*.json` (question banks) |
| Catalog / index | `src/datasets/index.json` (generated) |
| Constraints | `validate.mjs` |
| ETL | `parsers/*.py` + `normalize.mjs` + `import-pool.mjs` |
| Source/version registry | `pools.json` |

The browser runtime stays a static PWA and is unchanged by any of this; new
fields (e.g. `id`) are additive and ignored by the app.

## Contract

`schema/question.schema.json` is the single source of truth for a question.
Key rule the schema can't express: **`correct` is matched as TEXT, not an
index**, because the app shuffles choices at render time. The validator enforces
`correct ∈ choices`, unique `id`s, no duplicate content, and the exam.json
`distribution ↔ topic_label` coupling. Tags outside `taxonomy.json` and untagged
questions are warnings.

Stable id = `<subcategory-slug>-<sha1(question + sorted choices + correct)[:10]>`.

## Commands

```bash
node data-pipeline/validate.mjs            # validate all datasets (CI gate)
node data-pipeline/generate-manifest.mjs   # rebuild src/datasets/index.json (deterministic)
```

## Importing / refreshing a pool

NCVEC publishes the amateur pools as plain text on fixed 4-year cycles. To
refresh one (the **Technician 2026-2030** pool is effective 2026-07-01; the
current 2022-2026 pool expires 2026-06-30):

```bash
# 1. dry-run first — writes to /tmp, validates nothing tracked, prints a report
node data-pipeline/import-pool.mjs \
  --pool ~/Downloads/2026-technician-pool.txt \
  --category ham-radio --subcategory technician --label Technician \
  --version 2026-2030 --effective 2026-07-01 --expiry 2030-06-30 --dry-run

# 2. real run — writes src/datasets/ham-radio/technician.json, updates pools.json,
#    regenerates the manifest, and validates
node data-pipeline/import-pool.mjs \
  --pool ~/Downloads/2026-technician-pool.txt \
  --category ham-radio --subcategory technician --label Technician \
  --version 2026-2030 --effective 2026-07-01 --expiry 2030-06-30
```

Pipeline stages: `ncvec_pool.py` parses the text into neutral intermediate JSON
→ `normalize.mjs` maps to the canonical schema, **carrying forward**
explanations/tags/images from the existing dataset (matched by question text)
since pools contain none → emit → manifest → validate.

The coverage report flags what still needs human/curator work: placeholder
explanations (defaulted to the correct answer), untagged questions, and figure
references whose image assets must be verified.

## Provenance by domain

- **Ham radio** — authoritative public NCVEC pools, versioned with hard expiry
  dates (see `pools.json`). Fully pipeline-driven.
- **Security+** — CompTIA publishes no item pool; questions are authored against
  SY0-701 objectives. Pipeline validates; authoring is curator work.
- **Falconry** — state-by-state, no national pool; authored.
