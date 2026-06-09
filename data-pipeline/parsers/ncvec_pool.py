#!/usr/bin/env python3
"""
NCVEC amateur-radio question-pool parser (the Python step of the hybrid pipeline).

NCVEC publishes the Technician/General/Extra pools as a plain-text file (.txt) or
Word document (.docx) with a well-known structure:

    SUBELEMENT T1 - FCC Rules ... [6 Exam Questions - 6 Groups]

    T1A - Purpose and permissible use of the Amateur Radio Service; ...

    T1A01 (C) [97.1]
    What is the purpose of the Amateur Radio Service?
    A. Providing personal radio communications for as many citizens as possible
    B. Providing communications for international non-profit organizations
    C. Advancing skills in the technical and communication phases of the radio art
    D. All these choices are correct
    ~

This script converts that text into a neutral intermediate JSON array. It does
NOT produce the app's canonical schema (that is normalize.mjs's job) — it only
extracts what the pool actually contains. No explanations or tags exist in the
pool, so they are not invented here.

Usage:
    python3 ncvec_pool.py POOL.txt          # writes JSON to stdout
    python3 ncvec_pool.py POOL.docx         # same — .docx accepted
    python3 ncvec_pool.py POOL.txt out.json  # writes JSON to a file
"""
import json
import re
import sys

SUBELEMENT_RE = re.compile(r"^SUBELEMENT\s+([A-Z]\d)\s*[-–]\s*(.*?)\s*(?:\[.*\])?\s*$")
# Group headers: the .txt pool uses "T1A - desc"; the .docx pool drops the dash
# ("T1A desc"). The separator (dash or just whitespace) is therefore optional.
GROUP_RE = re.compile(r"^([A-Z]\d[A-Z])\s+(?:[-–]\s*)?(.+?)\s*$")
QUESTION_RE = re.compile(r"^([A-Z]\d[A-Z]\d{2})\s*\(([A-D])\)\s*(?:\[([^\]]*)\])?\s*$")
CHOICE_RE = re.compile(r"^([A-D])\.\s+(.*)$")
# Figure tokens differ by pool: Technician 2026 writes "figure T-1" (the dash is
# noise → "T1", matching T1.jpg), while General/Extra write "figure E5-1" (the
# dash is significant → "E5-1.png"). Capture both, then strip only a dash that
# directly follows the leading letter (T-1 → T1; E5-1 stays E5-1).
FIGURE_RE = re.compile(r"figure\s+([A-Z]-?\d+(?:-\d+)?\w*)", re.IGNORECASE)


def parse(text):
    questions = []
    subelement = subelement_title = group = group_desc = None
    cur = None  # question being assembled

    def flush():
        nonlocal cur
        if cur is not None:
            # choices come in as {letter: text}; emit in A-D order
            ordered = [cur["_choices"][k] for k in "ABCD" if k in cur["_choices"]]
            cur["choices"] = ordered
            del cur["_choices"]
            questions.append(cur)
            cur = None

    for raw in text.splitlines():
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("~"):
            # blank line or '~' / '~~' terminator finishes the current question
            if stripped.startswith("~"):
                flush()
            continue

        m = QUESTION_RE.match(stripped)
        if m:
            flush()
            qid, correct, ref = m.group(1), m.group(2), m.group(3)
            cur = {
                "native_id": qid,
                "subelement": subelement,
                "subelement_title": subelement_title,
                # The group is encoded in the id itself (T1A01 -> T1A); trust that
                # over header state so topic_id survives any header-format drift.
                "group": qid[:3],
                "group_desc": group_desc if (group == qid[:3]) else None,
                "correct_letter": correct,
                "fcc_ref": (ref or "").strip() or None,
                "question": "",
                "figure": None,
                "_choices": {},
            }
            continue

        if cur is not None:
            cm = CHOICE_RE.match(stripped)
            if cm:
                cur["_choices"][cm.group(1)] = cm.group(2).strip()
                continue
            if not cur["_choices"]:
                # still accumulating the question stem (may wrap across lines)
                cur["question"] = (cur["question"] + " " + stripped).strip()
                fm = FIGURE_RE.search(stripped)
                if fm and not cur["figure"]:
                    cur["figure"] = re.sub(r'^([A-Za-z])-', r'\1', fm.group(1))
                continue
            # a wrapped choice continuation: append to last choice
            last = sorted(cur["_choices"])[-1]
            cur["_choices"][last] = (cur["_choices"][last] + " " + stripped).strip()
            continue

        # outside a question: subelement or group header
        sm = SUBELEMENT_RE.match(stripped)
        if sm:
            subelement, subelement_title = sm.group(1), sm.group(2).strip()
            group = group_desc = None
            continue
        gm = GROUP_RE.match(stripped)
        if gm:
            group, group_desc = gm.group(1), gm.group(2).strip()
            continue

    flush()
    return questions


def read_docx(path):
    try:
        from docx import Document
    except ImportError:
        sys.stderr.write("ERROR: python-docx is required for .docx input: pip install python-docx\n")
        sys.exit(1)
    doc = Document(path)
    lines = []
    for p in doc.paragraphs:
        text = p.text.strip()
        if '~~~~End of question pool text~~~~' in text:
            break
        lines.append(text)
    return '\n'.join(lines)


def main(argv):
    if len(argv) < 2:
        sys.stderr.write(__doc__)
        return 1
    if argv[1].lower().endswith('.docx'):
        text = read_docx(argv[1])
    else:
        with open(argv[1], encoding="utf-8") as f:
            text = f.read()
    questions = parse(text)
    out = json.dumps(questions, ensure_ascii=False, indent=2) + "\n"
    if len(argv) >= 3:
        with open(argv[2], "w", encoding="utf-8") as f:
            f.write(out)
        sys.stderr.write(f"parsed {len(questions)} questions -> {argv[2]}\n")
    else:
        sys.stdout.write(out)
    # basic integrity to stderr (does not fail the parse)
    bad = [q["native_id"] for q in questions if len(q["choices"]) != 4]
    if bad:
        sys.stderr.write(f"WARNING: {len(bad)} question(s) without exactly 4 choices: {bad[:10]}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
