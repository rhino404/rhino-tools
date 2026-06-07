---
title: "Ohm's Law Made Simple for the Ham Radio Technician Exam"
slug: ohms-law-technician-exam
description: "Learn Ohm's Law for the ham radio Technician exam: V=IR explained with examples, memory tricks, and the exact question types the FCC tests."
track: ham-radio/technician
tags: [voltage, resistance, current, power]
datePublished: 2026-06-08
dateModified: 2026-06-08
readingTime: 6
excerpt: "Ohm's Law — V = IR — appears on every Technician license exam. Master the formula, the units, and the common exam scenarios in one focused read."
sources_json: [{"title":"FCC Part 97 Amateur Radio Rules","url":"https://www.ecfr.gov/current/title-47/chapter-I/subchapter-D/part-97","publisher":"FCC","accessed":"2026-06-08"},{"title":"ARRL Ham Radio License Manual","url":"https://www.arrl.org/ham-radio-license-manual","publisher":"ARRL","accessed":"2026-06-08"},{"title":"NCVEC Technician Class Question Pool (2022–2026)","url":"https://ncvec.org/page/2022-2026-technician-class-question-pool","publisher":"NCVEC","accessed":"2026-06-08"}]
faq_json: [{"q":"What does electromotive force (EMF) mean on the ham radio exam?","a":"EMF is another term for voltage — the force that causes electrons to flow. On the Technician exam the question asks for the electrical term for EMF that causes electron flow; the answer is voltage."},{"q":"What is the name for the flow of electrons in a circuit?","a":"The flow of electrons in a circuit is called current, measured in amperes. This is a standalone definition question in the T5 subelement."},{"q":"Why does amateur radio care about Ohm's Law?","a":"Every RF circuit, feedline, antenna system, and power supply obeys Ohm's Law. It lets you calculate impedance, size fuses, troubleshoot power supplies, and match transmitter output to antennas."}]
status: ready
---

Ohm's Law is the single most important formula in basic electronics, and it appears on every FCC Technician class license exam. The law describes the relationship between three quantities — voltage, current, and resistance — and mastering it will help you answer a solid block of T5 subelement questions correctly.

> **TL;DR:** Voltage (V) = Current (I) × Resistance (R). Know this triangle, the units (volts, amperes, ohms), and how to rearrange it for current (I = V/R) and resistance (R = V/I). That covers the bulk of Ohm's Law questions on the Technician exam.

## What is Ohm's Law?

Ohm's Law states that the voltage across a conductor is directly proportional to the current flowing through it, as long as temperature remains constant. The formula is:

**V = I × R**

Where:
- **V** is voltage, measured in *volts* (V)
- **I** is current, measured in *amperes* (A) — often shortened to "amps"
- **R** is resistance, measured in *ohms* (Ω)

The law was formulated by German physicist Georg Simon Ohm in 1827 and remains foundational to every branch of electronics, including amateur radio.

## What do voltage, current, and resistance actually mean?

Understanding what each term represents makes the math stick.

**Voltage** is electrical pressure — the force that pushes electrons through a circuit. Think of it like water pressure in a pipe. Higher voltage means more push. A 12-volt car battery provides more push than a 1.5-volt AA cell.

**Current** is the flow of electrons — how many pass a given point per second. Continuing the water analogy, current is the flow rate. More current means more electrons moving. Current is what does work: it lights LEDs, drives speakers, and transmits RF signals.

**Resistance** is opposition to current flow. Every wire, component, and connection has some resistance. A resistor is a component specifically designed to limit current. Higher resistance means less current flows for a given voltage.

## How to use the Ohm's Law triangle

A common memory aid is the **Ohm's Law triangle**: imagine a triangle divided into three sections. Put *V* on top, and *I × R* on the bottom (I on the left, R on the right). Cover the quantity you want to find, and the remaining two show the operation:

- **Cover V:** V = I × R
- **Cover I:** I = V ÷ R
- **Cover R:** R = V ÷ I

This works for every rearrangement. For the Technician exam, you need all three.

## Exam question types you will see

The NCVEC Technician question pool (T5D subelement) tests Ohm's Law directly. You will be asked to calculate one of the three quantities given the other two. Here are the patterns:

**Calculate current:** "What is the current in a circuit with 12 volts and 4 ohms resistance?"
I = V ÷ R = 12 ÷ 4 = **3 amperes**

**Calculate resistance:** "What resistance is needed to limit current to 0.5 A from a 12 V source?"
R = V ÷ I = 12 ÷ 0.5 = **24 ohms**

**Calculate voltage:** "What voltage is across a 10 Ω resistor carrying 2 A?"
V = I × R = 2 × 10 = **20 volts**

> **Exam tip:** Always watch the units. The exam uses volts, amperes (amps), and ohms — not milliamps or kilohms unless stated. If a value is given in milliamps (mA), convert to amps first by dividing by 1,000 (e.g., 500 mA = 0.5 A).

## Power: the fourth quantity

The Technician exam also tests **electrical power**, which uses Ohm's Law as a building block. Power is measured in *watts* (W) and uses the formula:

**P = V × I**

Combined with Ohm's Law, this gives additional forms:
- P = I² × R
- P = V² ÷ R

A typical question: "What is the power consumed by a 50 Ω load fed 100 V?"
P = V² ÷ R = 10,000 ÷ 50 = **200 watts**

## The units you must know

Memorize these cold — the exam will test the units separately from the formulas:

- **Voltage** — Volt (V)
- **Current** — Ampere (A)
- **Resistance** — Ohm (Ω)
- **Power** — Watt (W)

Electrical current is measured in **amperes**. Electrical power is measured in **watts**. These are standalone T5 questions that don't require calculation.

## Frequently asked

### What does "electromotive force (EMF)" mean on the exam?

EMF is another term for voltage — the force that causes electrons to flow. The Technician pool asks: *"What is the electrical term for the electromotive force (EMF) that causes electron flow?"* The answer is **voltage**.

### What is the name for the flow of electrons in a circuit?

The flow of electrons is called **current**. This is tested directly in the T5 subelement as a standalone definition question.

### Why does amateur radio care about Ohm's Law?

Every RF circuit, feedline, antenna system, and power supply in your station obeys Ohm's Law. Understanding it lets you calculate antenna feedpoint impedance, size fuses correctly, troubleshoot power supply issues, and match transmitter output to antenna systems. It's not just an exam topic — it's the foundation of every hands-on radio project.
