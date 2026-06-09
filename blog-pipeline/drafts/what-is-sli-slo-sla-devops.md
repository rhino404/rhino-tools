---
title: "What Is an SLI, SLO, and SLA? A Plain-English Guide for DevOps Beginners"
slug: what-is-sli-slo-sla-devops
description: "SLI, SLO, SLA, and error budgets explained in plain English for DevOps beginners — with concrete examples and interview Q&A on reliability concepts."
track: devops/core-concepts
tags: [reliability, observability, culture]
datePublished: 2026-06-09
readingTime: 8
excerpt: "SLI, SLO, and SLA sound similar but play very different roles. Learn what each one means, how error budgets connect them, and why high-performing teams use them to balance reliability and velocity."
sources_json: [{"title":"Site Reliability Engineering — Chapter 4: Service Level Objectives","url":"https://sre.google/sre-book/service-level-objectives/","publisher":"Google","accessed":"2026-06-09"},{"title":"The Site Reliability Workbook — Chapter 2: Implementing SLOs","url":"https://sre.google/workbook/implementing-slos/","publisher":"Google","accessed":"2026-06-09"},{"title":"Accelerate: The Science of Lean Software and DevOps","url":"https://itrevolution.com/product/accelerate/","publisher":"IT Revolution Press","accessed":"2026-06-09"}]
status: ready
---

Reliability engineering gives teams a shared language for describing how well a service is performing, what the team has promised, and how much runway remains before things get serious. **SLI**, **SLO**, and **SLA** are the three terms at the center of that language, and they confuse almost every developer entering DevOps — not because the concepts are hard, but because the abbreviations look nearly identical and the differences are subtle.

> **TL;DR:** An SLI measures how your service is actually behaving. An SLO is the internal target your team sets for that measurement. An SLA is the contractual promise you make to customers, backed by financial consequences. The error budget is the breathing room between your SLO and perfect reliability — and it governs how fast your team can ship.

## Why These Three Terms Confuse Everyone

The confusion is understandable: all three share the SL prefix and all three involve some notion of a service performing well. The key is to think of them as operating at three different layers.

The **measurement layer** tells you what is happening right now — raw data about your system. The **target layer** tells you what your team has decided is good enough. The **contract layer** tells you what you have legally promised to customers and what happens when you fall short. SLI lives at the measurement layer, SLO at the target layer, and SLA at the contract layer. Once that hierarchy clicks, the definitions follow naturally.

## What Is an SLI (Service Level Indicator)?

An **SLI** is a quantitative measurement of some aspect of how your service is behaving. The Google SRE Book describes it as a carefully defined quantitative measure of some aspect of the level of service being provided.

In practice, SLIs are almost always expressed as ratios: successful events divided by total events, multiplied by 100 to give a percentage. That formulation keeps every SLI on a consistent 0–100% scale, which makes setting targets straightforward.

Two concrete examples:

- **Availability SLI:** (successful HTTP requests / total HTTP requests) × 100%. A value of 99.95% means that 99.95% of all requests received a non-error response.
- **Latency SLI:** (requests completing under 200ms / total requests) × 100%. A value of 97% means 97% of requests finished within your latency threshold.

Other common SLIs cover error rate, throughput, and durability (for storage systems). The SRE Book advises choosing SLIs that reflect actual user experience, not just what's easiest to instrument. If users feel pain when the API is slow, latency is a better SLI than CPU utilization.

## What Is an SLO (Service Level Objective)?

An **SLO** is a target value for an SLI — a promise your team makes to itself. Where the SLI tells you what is happening, the SLO tells you what your team has agreed is acceptable.

The SRE Book defines an SLO as a target value or range of values for a service level measured by an SLI. In plain English: you pick an SLI, then decide how good it needs to be. For example:

- 99.9% of requests will succeed — an availability SLO
- 95% of requests will complete under 200ms — a latency SLO

A critical point: SLOs are **internal targets**. They are not customer contracts. They live in runbooks, dashboards, and team agreements — not in customer-facing legal documents. This distinction matters because it gives your team room to act before a customer is harmed.

Setting SLOs too high is a trap that the SRE Workbook addresses directly. A 100% SLO sounds appealing, but it is operationally impossible: any dependency outside your control — a cloud provider, a DNS resolver, a certificate authority — can cause a failure you cannot prevent. More practically, a 100% SLO leaves zero room for deployments, maintenance, or experimentation. High-performing teams deliberately set SLOs below 100% to preserve that room, which the SRE literature calls the **error budget**.

> **Exam tip:** When an interviewer asks about the difference between an SLO and an SLA, the key word is *internal*. An SLO is a target your team sets for itself — not a contractual commitment to customers. That distinction separates SLO from SLA.

## What Is an SLA (Service Level Agreement)?

An **SLA** is a business contract between a service provider and its customers that specifies reliability expectations and the consequences — typically financial penalties or service credits — when those expectations are not met. The SRE Workbook puts it plainly: an SLA is the agreement that comes into effect when users are unhappy enough that compensation is required.

The structural relationship between SLA and SLO is deliberate: your SLA should always be set *below* your SLO. If your internal SLO is 99.9% availability, a reasonable SLA commitment to customers might be 99.5%. Why? Because that gap gives your team time to detect an SLO breach, investigate, and recover before the SLA threshold is crossed. If your SLO and SLA are identical, any SLO breach immediately triggers a contractual violation — you have no buffer.

In short: you hold yourself to a higher standard internally (SLO) than the floor you commit to externally (SLA). Customers see the SLA; your dashboards track the SLO.

## What Is an Error Budget?

An **error budget** is the amount of unreliability your service is allowed to have before it violates its SLO. The formula is simple:

**Error budget = 100% − SLO**

If your SLO is 99.9% availability, your error budget is 0.1% of all requests. Over a 30-day month with roughly 43,800 minutes of service time, 0.1% translates to about 43.8 minutes of allowable downtime. Every failing request or slow response draws down this budget.

The SRE Workbook offers a concrete illustration of how quickly budget can be consumed: in one example, a service with 3,663,253 API calls over four weeks and a 99.9% SLO has roughly 3,663 allowable failures. A single incident that causes 1,500 errors burns through about 40% of the entire period's budget in one shot.

Error budgets create a **shared incentive** between development and operations. When the budget is healthy — most of it still unspent — the team has data-backed permission to ship new features, take on technical risk, and run experiments. When the budget is depleted, the policy is clear: pause new releases, freeze risky deployments, and focus entirely on reliability work until the budget recovers. According to the Google SRE Book, this is what makes error budgets a cultural tool, not just a metric: both the team that wants to ship and the team that wants stability are working from the same number.

## How SLI, SLO, SLA, and Error Budget Work Together

Imagine a team running a web API. They define an **SLI** as their request success rate: (non-5xx responses / total responses) × 100%. After reviewing historical data and user impact, they set an **SLO** of 99.9% — meaning they target at most one failed request in every thousand. Their customer contract, the **SLA**, guarantees 99.5% — well below the SLO, giving them a 0.4-percentage-point buffer before a contractual violation occurs.

With a 99.9% SLO and roughly 2 million requests per month, the **error budget** is 0.1%, or about 2,000 allowable failures. In week two of the month, a deployment bug causes a configuration error that produces 900 failed requests over four hours. The team patches it quickly. Afterward, they check their budget: 900 of their 2,000 allowable failures are gone — 45% consumed in one incident, with three weeks still remaining.

The team now has clear guidance from the data. With 55% of the error budget remaining and three weeks left, they can continue shipping — but with awareness that another incident of similar size would trigger the error budget policy and require a feature freeze. The SLO breach did not breach the SLA (they stayed well above 99.5%), but it changed how the team plans the rest of the month. That is exactly what this framework is designed to do: make reliability visible, shared, and actionable.

## Common Interview Questions (and How to Answer Them)

**What is the difference between an SLO and an SLA?**

An SLO is an internal target — a number your team agrees to hold itself to. An SLA is an external contract with a customer, backed by financial consequences if violated. Teams always set their SLO higher than their SLA so that an internal target breach can be caught and addressed before a contractual breach occurs.

**Why would a team deliberately set an SLO below 100%?**

Because 100% reliability is both impossible and counterproductive. No service operates in complete isolation — cloud providers, DNS resolvers, and network paths all introduce failure modes outside the team's control. More importantly, a 100% SLO means zero error budget, which means no room for deployments, experiments, or maintenance. A well-chosen SLO acknowledges that some small amount of failure is acceptable in exchange for the ability to keep shipping.

**What happens when an error budget is exhausted?**

When the error budget runs out, the team's error budget policy kicks in. Typically this means halting new feature releases, freezing risky deployments, and redirecting engineering effort toward reliability improvements until the budget recovers in the next measurement window. This policy creates a natural, data-driven mechanism for prioritizing stability over velocity when reliability is genuinely at risk — without requiring a manager to make a judgment call in the middle of an incident.
