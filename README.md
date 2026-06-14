# Ryno.Tools

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![website](https://img.shields.io/website?url=https%3A%2F%2Fryno.tools)](https://ryno.tools)

Free, no-login, offline-capable exam prep for licensing and certification. Adaptive quizzes and timed exam simulations — no paywall, works offline, installs as a PWA.

👉 **[ryno.tools](https://ryno.tools)**

---

## Quiz Tracks

<!-- TRACKS-START -->
| Track | Subcategories |
| --- | --- |
| Ham Radio | Technician · General · Extra |
| Falconry | Apprentice |
| CompTIA Security+ | SY0-701 |
| DevOps | Core Concepts · Containers & K8s · Linux · Networking · CI/CD · IaC · Cloud · Observability |
<!-- TRACKS-END -->

---

## Features

- **Adaptive quizzes** — tag-based filtering for focused study on weak spots
- **Timed exam mode** — full simulated exams with pass/fail scoring
- **Light/dark theme** — persisted to `localStorage`
- **PWA** — installable, works offline, no app store required
- **No login, no paywall** — 100% free, progress saved in the browser

---

## Blog

Exam-focused study guides at [ryno.tools/blog/](https://ryno.tools/blog/), authored by Ask Ryno and cited to authoritative sources.

---

## Dev Setup

```bash
cd src
python3 -m http.server 8080
```

Visit <http://localhost:8080>. No build step — raw ES6 modules served as-is. Hard-refresh (`Ctrl+Shift+R`) to bypass the service worker cache after changes.

**One-time after cloning** — activate the pre-push hook:

```bash
git config --local core.hooksPath data-pipeline/hooks
```

---

## Deployment

`main` auto-deploys to production via GitHub Actions (`.github/workflows/static.yml`). **Treat `main` as production.** Branch for non-trivial work; PR to merge.

---

## License

MIT — see [LICENSE](LICENSE).
