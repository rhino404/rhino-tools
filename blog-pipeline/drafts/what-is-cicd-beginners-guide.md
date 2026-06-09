---
title: "What Is CI/CD? A Beginner's Guide to Continuous Integration and Delivery"
slug: what-is-cicd-beginners-guide
description: "CI/CD is the most asked-about DevOps concept in interviews. Learn what CI and CD mean, how pipelines work, and why trunk-based development matters."
track: devops/core-concepts
tags: [cicd, automation, culture, git]
datePublished: 2026-06-09
readingTime: 9
excerpt: "Every DevOps interview asks about CI/CD. Here's what it actually means: how continuous integration differs from continuous delivery, what a pipeline does, and why trunk-based development beats long-lived branches."
sources_json: [{"title":"Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation","url":"https://www.informit.com/store/continuous-delivery-reliable-software-releases-through-9780321601919","publisher":"Addison-Wesley","accessed":"2026-06-09"},{"title":"GitHub Actions Documentation","url":"https://docs.github.com/en/actions","publisher":"GitHub","accessed":"2026-06-09"},{"title":"DORA Research Program","url":"https://dora.dev","publisher":"DORA","accessed":"2026-06-09"},{"title":"Continuous Integration","url":"https://martinfowler.com/articles/continuousIntegration.html","publisher":"Martin Fowler","accessed":"2026-06-09"},{"title":"DORA — Trunk-Based Development Capability","url":"https://dora.dev/capabilities/trunk-based-development/","publisher":"DORA","accessed":"2026-06-09"}]
status: ready
---

**CI/CD** — short for Continuous Integration and Continuous Delivery (or Deployment) — is a set of engineering practices that lets software teams ship changes to production quickly, reliably, and repeatedly. If you've applied for any developer or DevOps role in the past five years, you've almost certainly been asked to explain it. Understanding CI/CD isn't just good for interviews; it changes how you think about writing and shipping code every day.

> **TL;DR:** CI means every developer merges code to a shared branch at least daily, and each merge triggers automated tests. CD means every passing build is release-ready (Delivery) or automatically ships to production (Deployment). A pipeline is the automated sequence of stages — build, test, scan, deploy — that every change runs through.

## The Problem CI/CD Was Invented to Solve

Before CI/CD became common practice, most software teams worked in isolation. A developer would check out the codebase, build a feature over several weeks, and then attempt to merge everything back in on a fixed release date. The same thing happened in parallel across five, ten, or twenty other developers. When all those long-running branches finally collided, teams entered what practitioners call **integration hell** — a painful, unpredictable period of resolving conflicts, tracking down broken behavior, and manually testing the whole system before anyone could ship.

The core insight behind CI/CD is simple: problems that take days to untangle at merge time take minutes to fix if you catch them the moment they're introduced. By integrating frequently and testing automatically, teams compress the feedback loop from weeks to minutes.

## What Is Continuous Integration (CI)?

**Continuous Integration** is the practice of every developer merging their code changes into a shared main branch at least once a day — often several times a day. Each merge automatically triggers a build and a suite of automated tests. If the build fails or tests go red, the team treats fixing it as the highest priority. In Martin Fowler's foundational article on the practice, he describes the goal as keeping the mainline always in a healthy, releasable state.

The discipline has two firm requirements. First, changes must be small and frequent. A branch that lives for two weeks before merging is a liability — the longer it diverges from main, the harder integration becomes. Second, the automated tests must be trustworthy. A CI system that produces false positives trains engineers to ignore failures, which defeats the whole point.

The result is that integration problems surface immediately, while the context is fresh and the diff is small. What used to take days to debug takes minutes.

> **Exam tip:** Interviewers often ask what makes CI different from simply running tests. The key distinction is the *frequency and discipline*: CI requires that every developer integrates to the shared branch daily, not just that tests exist.

## What Is Continuous Delivery vs. Continuous Deployment?

Both terms start with CD, and people use them interchangeably, but they mean different things.

**Continuous Delivery** means that every build that passes all automated tests is in a state where it *could* be deployed to production immediately. The actual deployment is a deliberate, human-triggered action — a button click or a single command. According to Jez Humble and Dave Farley in *Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation*, the goal is to make releasing software a routine, low-risk business decision rather than a high-stakes event.

**Continuous Deployment** goes one step further: every passing build automatically deploys to production without any human approval gate. This requires exceptional confidence in the automated test suite and often sophisticated monitoring and rollback capabilities. Most organizations practice Delivery; Deployment is common at mature companies — consumer web products, SaaS platforms — that ship dozens or hundreds of times per day.

The distinction matters in interviews because it shows you understand that CD isn't a single thing.

## What Is a CI/CD Pipeline?

A **pipeline** is the automated sequence of stages that a code change passes through from commit to deployment. A typical pipeline looks like this:

- **Build** — compile the code and assemble deployable artifacts
- **Unit tests** — verify individual functions and components in isolation
- **Integration tests** — verify how components interact with each other and external dependencies
- **Security scan** — check dependencies for known vulnerabilities, scan code for common flaws
- **Deploy to staging** — push the build to an environment that mirrors production
- **Deploy to production** — (in Continuous Deployment) automatically ship; (in Continuous Delivery) await manual approval

When any stage fails, the pipeline stops. The offending change doesn't advance further, and the developer who introduced it gets notified immediately. The goal of stopping early is to keep broken code away from production and to surface the failure while the change is still fresh in the developer's mind.

Pipelines are defined as code — most commonly in YAML files checked into the same repository as the application. Common filenames include `Jenkinsfile` (Jenkins), `.github/workflows/deploy.yml` (GitHub Actions), and `.gitlab-ci.yml` (GitLab CI). Storing the pipeline definition in version control means you can review, audit, and roll back pipeline changes exactly like application code.

## What Is Trunk-Based Development?

**Trunk-based development** is the branching strategy that makes CI work in practice. All engineers commit directly to a single shared branch — called `main`, `master`, or `trunk` — or merge to it via branches that live for a matter of hours, not days.

This is a sharp contrast to the old model of long-lived feature branches that exist for weeks. DORA's research on trunk-based development finds that high-performing teams maintain three or fewer active branches at any time and merge to trunk at least once a day. Teams practicing trunk-based development avoid code freezes and extended stabilization phases entirely because the codebase is always in a releasable state.

The advantage is clear once you've experienced the alternative: small diffs merge cleanly, conflicts surface immediately while the cause is obvious, and CI runs on every change rather than only at the end of a feature cycle. According to DORA's research, trunk-based development is one of the technical capabilities that distinguishes elite delivery performers from the rest.

## What Are Feature Flags?

Trunk-based development raises an obvious question: how do you deploy code for a half-built feature without exposing it to users?

The answer is **feature flags** (also called feature toggles). A feature flag wraps new or incomplete functionality in a conditional check — something like `if (featureEnabled('new-checkout-flow'))` — that is off by default in production. Developers can deploy the code at any time without the feature being visible to users. When the team is ready, they enable the flag for a small percentage of users first, observe behavior, and gradually roll out to everyone.

Feature flags decouple deployment from release. You can ship code continuously to production while controlling exactly when users see each change. This is how organizations practicing trunk-based development avoid releasing unfinished work even while merging to main multiple times a day.

## CI/CD Tools: GitHub Actions, Jenkins, and GitLab CI

**GitHub Actions** is the CI/CD platform built directly into GitHub. Pipelines are defined as YAML files stored in `.github/workflows/` and triggered by repository events — a push to main, a pull request opened, or a scheduled time. GitHub Actions is the default choice for most teams already using GitHub, and it's the dominant platform for open-source projects. Its marketplace of reusable actions makes common tasks (deploying to AWS, running security scans, publishing packages) straightforward to configure without writing custom scripts.

**Jenkins** is the longest-running CI tool in the ecosystem, first released in 2004. It is open-source, highly configurable, and has a plugin ecosystem covering almost any integration you can imagine. Jenkins is still widespread in enterprise environments, particularly at organizations that adopted CI before cloud-native alternatives existed. The tradeoff is maintenance overhead: Jenkins requires dedicated infrastructure and ongoing administration that hosted services handle for you automatically.

**GitLab CI** is built directly into GitLab, using a similar YAML approach (`.gitlab-ci.yml`). It's the natural choice for teams that use GitLab for source control, issue tracking, and code review, since the pipeline configuration, results, and deployment history all live in the same interface as the code. GitLab CI also offers a built-in container registry and environment management that make it a strong end-to-end platform.

All three tools implement the same conceptual model: trigger a pipeline on a git event, run a series of stages, report success or failure, and optionally deploy the artifact.

## How CI/CD Connects to DORA Metrics

DORA (the DevOps Research and Assessment program) has spent over a decade studying what separates high-performing engineering organizations from low-performing ones. Their research defines four key software delivery metrics: **deployment frequency** (how often you ship), **lead time for changes** (how quickly a commit reaches production), **change failure rate** (what percentage of deploys cause incidents), and **mean time to restore** (how quickly you recover from failures).

The counterintuitive finding — one worth knowing for any DevOps conversation — is that teams shipping more frequently don't have higher failure rates. Elite performers in DORA's research ship more often *and* have lower change failure rates than low performers. The reason is that CI/CD enforces small, well-tested changes. A deployment of one hundred small, individually-tested commits is far less risky than a single massive release containing six weeks of accumulated changes.

CI/CD is the technical capability that enables all four metrics to improve simultaneously. Automated pipelines reduce lead time. Frequent, small deployments reduce blast radius when something does go wrong. Fast rollback capabilities reduce time to restore. The discipline of green-before-merge keeps change failure rates low. Understanding that connection — that CI/CD is about reliability as much as speed — is what separates a surface-level definition from a real understanding of why it matters.
