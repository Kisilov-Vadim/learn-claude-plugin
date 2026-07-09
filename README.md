# 📚 learn

> Adaptive learning assistant for Claude Code. Spaced repetition + 5 teaching methods that personalize to how you actually retain things.

![version](https://img.shields.io/badge/version-1.0.0-blue) ![platform](https://img.shields.io/badge/Claude_Code-plugin-8A2BE2)

---

## What it does

`/learn` runs a study session that decides automatically what to do — review due topics, practice shaky ones, or introduce new material. You pick a subject, it picks the method and pace.

Progress is tracked with a 0–5 score per topic and a spaced repetition schedule. The system learns which teaching method works best for you in each subject and adapts over time. Multiple subjects run in parallel independently.

---

## How it works

**Session flow** — fully automatic, no mode-picking:

```
Topics due for review?  →  Review phase (Active Recall, weakest first)
Shaky topic in progress?  →  Practice phase (Feynman)
Ready for something new?  →  Learn phase (Socratic or Reading+Socratic)
Everything solid?  →  "Next review due: [date]"
```

**5 teaching methods:**

| Method | When used | What happens |
|---|---|---|
| **Socratic** | New topic (score 0–1) | Teach from first principles through questions, never unprompted lecture |
| **Reading + Socratic** | Dense or nuanced topics | Hook question → assign a resource → debrief with 3–4 questions |
| **Active Recall** | Consolidating (score 2–5) | 3–5 reasoning questions from memory, no hints, one at a time |
| **Feynman** | Shaky understanding (score 2–4) | Explain it to a junior dev — gaps get named, vague answers get challenged |
| **Deep Dive** | Solid knowledge (score 4) | Open-ended design challenge, guided Socratically |

The system tracks method effectiveness per subject and retires methods that aren't helping. Active Recall is never retired.

**Scoring:**

| Score | Meaning | Next review |
|---|---|---|
| 0 | Never seen | — |
| 1 | Barely remember | +1 day |
| 2 | Partial understanding | +3 days |
| 3 | Understood but shaky | +7 days |
| 4 | Solid, minor gaps | +14 days |
| 5 | Mastered | +30 days |

Score changes are always explained aloud with specific reasoning.

---

## Commands

| Command | Description |
|---|---|
| `/learn` | Start a study session — dashboard, subject selection, and learning in one flow |
| `/learn-dashboard` | Open the progress dashboard in the browser |

---

## Install

```bash
claude plugin marketplace add github:Kisilov-Vadim/learn-claude-plugin
claude plugin install learn@learn-marketplace
```

Restart Claude Code — `/learn` is ready.

**First run:** you'll be asked what subject to add, your current level, and your goal. A 10–15 min diagnostic conversation maps what you already know, then generates a full curriculum and starts your first session.

---

## Update

```bash
claude plugin update learn
```

Your progress data lives in a Supabase backend, not in the plugin directory — completely separate from the plugin and never touched by updates.
