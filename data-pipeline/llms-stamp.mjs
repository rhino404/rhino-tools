/**
 * llms-stamp.mjs
 *
 * Keeps the "Last updated:" line in llms.txt / llms-full.txt honest.
 * Both pipelines mutate these files (build.mjs → blog-articles region,
 * generate-pages.mjs → quizzes region), so both call this after injecting.
 *
 * Rule: bump the stamp to today ONLY when the file content (ignoring the
 * stamp itself) actually changed; otherwise preserve the existing stamp so
 * re-runs stay byte-identical (idempotency / --check safe).
 */

const STAMP_RE = /^(>? ?Last updated: )(\d{4}-\d{2}-\d{2})/m;

export function refreshLlmsStamp(existing, updated, today = new Date().toISOString().slice(0, 10)) {
  if (existing == null || !STAMP_RE.test(updated)) return updated;
  const strip = (s) => s.replace(STAMP_RE, '$1STAMP');
  if (strip(existing) === strip(updated)) {
    const m = existing.match(STAMP_RE);
    return m ? updated.replace(STAMP_RE, `$1${m[2]}`) : updated;
  }
  return updated.replace(STAMP_RE, `$1${today}`);
}
