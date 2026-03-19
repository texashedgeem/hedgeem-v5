# Session Summary — 18 Mar 2026
## Project: hedgeem-v5 / HEDGE Jira Project

---

## Session Overview

Two-day session (17–18 Mar 2026) establishing the full re-engineering plan for Texas Hedge'Em. Started from scratch — no memory, no tickets, no cloned repos. Ended with a complete architecture, 27 HEDGE tickets, 12 project memory directories, deep-dive analysis of both the server and client codebases, and HEDGE-27 in progress.

---

## What Was Accomplished

### Memory & Infrastructure
1. Memory directories created for hedgeem-v5, HedgeEmJavaScriptClient, server, DotNetHedgeEmClient — 12 total across all projects
2. $JIRA_TOKEN confirmed working (old token had been overwritten — new token provided by Simon, ~/.zshrc update outstanding)
3. Token separation rule enforced globally: $JIRA_TOKEN = open-banking.atlassian.net, $JIRA_ZODIA = lydia.atlassian.net — NEVER mix
4. Global feedback rules propagated to all 12 projects: priority column on ticket listings, all projects need Jira, never delete descriptions, always Edit not Write
5. Architecture correction locked in: 3 clients exist — only DotNetHedgeEmClient called the server — gameClient (hedgeem-v5) is the TARGET
6. project_hedgeem_architecture.md created in all 12 memory directories

### Repos
7. DotNetHedgeEmClient cloned → `/Users/simonhewins/repo_git/DotNetHedgeEmClient`
8. server (hedgeem_server) cloned → `/Users/simonhewins/repo_git/server`
9. CLAUDE.md created in all repos (HedgeEmJavaScriptClient, node-poker-odds-calculator, personal-site, hedgeem-v5, server, DotNetHedgeEmClient)

### Analysis
10. **Deep-dive: hedgeem_server** — complete analysis of all classes, methods, SOAP endpoints, data models, enums, DB schema, business logic (RTP margin, hand status rules, payout calculation, betting strategies)
11. **Deep-dive: DotNetHedgeEmClient** — complete analysis of all pages, controls, JavaScript, server calls, game state management, UI feature set, card asset format

### Jira Tickets
12. HEDGE-9 Done — CLAUDE.md files created across all repos
13. HEDGE-4 In Progress, High — C# re-engineering epic
14. HEDGE-21 In Progress, Medium — Supabase data persistence
15. HEDGE-25 In Progress, High — Get C# server working (full analysis + re-engineering plan documented in ticket)
16. HEDGE-26 updated — DotNetHedgeEmClient deep-dive findings documented, corrected to reflect it's the feature reference for gameClient
17. HEDGE-27 through HEDGE-37 created as sub-tasks of HEDGE-25 — full porting roadmap
18. HEDGE-27 In Progress — project scaffold (next action)

---

## Current HEDGE Ticket State

| Key | Type | Status | Priority | Summary |
|---|---|---|---|---|
| HEDGE-4 | Epic | In Progress | High | Get C# version of poker game working |
| HEDGE-9 | Epic | Done | — | Add CLAUDE.md files to all repos |
| HEDGE-21 | Epic | In Progress | Medium | Data persistence: Supabase (Postgres + Auth) |
| HEDGE-25 | Story | In Progress | High | Get C# server working — re-engineer to REST API |
| HEDGE-26 | Story | Backlog | Low | Get client working — DotNetHedgeEmClient feature reference |
| HEDGE-27 | Sub-task | In Progress | High | Set up Node.js/Express/TypeScript REST API scaffold |
| HEDGE-28 | Sub-task | Backlog | High | Create Mintlify documentation for HedgeEm v5 REST API |
| HEDGE-29 | Sub-task | Backlog | High | Provide SQLite DB file for schema reverse engineering |
| HEDGE-30 | Sub-task | Backlog | High | Port Phase 1 — Utility methods |
| HEDGE-31 | Sub-task | Backlog | Medium | Port Phase 2 — Auth endpoints |
| HEDGE-32 | Sub-task | Backlog | Medium | Port Phase 3 — Table management |
| HEDGE-33 | Sub-task | Backlog | Medium | Port Phase 4 — Game engine |
| HEDGE-34 | Sub-task | Backlog | Medium | Port Phase 5 — Betting endpoints |
| HEDGE-35 | Sub-task | Backlog | Low | Port Phase 6 — AutoPlay advice engine |
| HEDGE-36 | Sub-task | Backlog | Low | Port Phase 7 — Admin endpoints |
| HEDGE-37 | Sub-task | Backlog | High | Unit testing and CI/CD pipeline |

---

## Architecture Summary

### Three Clients — Roles Clarified
| Client | Role |
|---|---|
| DotNetHedgeEmClient | ONLY client that called hedgeem_server via SOAP. Feature reference. Not a deployment target. |
| HedgeEmJavaScriptClient | Standalone, no server. Live at hedgeem.qeetoto.com. Secondary visual reference. |
| gameClient (hedgeem-v5) | **TARGET** — most professional version. Wire to new REST API. |

### New Stack
- **API**: Node.js + Express + TypeScript → Vercel serverless
- **Auth**: Supabase Auth JWTs (replacing stateful session_id)
- **DB**: Supabase Postgres (replacing SQLite/MySQL/MSSQL)
- **Docs**: Mintlify at docs.qeetoto.com
- **Hand evaluation**: node-poker-odds-calculator (already owned)
- **Client**: gameClient in hedgeem-v5 (Phaser 3 + TypeScript)

### Porting Order
1. HEDGE-27 — Project scaffold ← **IN PROGRESS**
2. HEDGE-28 — Mintlify docs (design-first, stub all endpoints)
3. HEDGE-37 — CI/CD skeleton
4. HEDGE-30 — Utility methods (pure functions, no DB/auth)
5. HEDGE-31–36 — Auth, Tables, Game engine, Betting, AutoPlay, Admin

---

## Key Decisions Made

1. **Mintlify-first approach** — design the full API surface before any implementation. Documented in HEDGE-25 comment.
2. **Stubs allowed** — all endpoints implemented with realistic dummy data where DB not yet wired. Stubs replaced incrementally as Supabase is connected.
3. **Game engine and betting logic can be real from day one** — no DB dependency for core calculations
4. **6 REST endpoints drive the entire game** — /state, /advance, /bet, /topup, /sit, /players/:id
5. **RTP margin calculation must be preserved exactly** — core commercial IP
6. **gameClient is the target** — not hedgeem-v5 frontend generically but specifically the gameClient/ directory

---

## Outstanding Action Items (for Simon)

1. **Update $JIRA_TOKEN in ~/.zshrc** — old token was overwritten, new token used this session but not yet saved to shell config
2. **Provide SQLite DB file** (HEDGE-29) — needed for schema reverse engineering → Supabase migration

---

## Next Session Start Prompt

**Ready to start HEDGE-27 (project scaffold)?**

Create Node.js + Express + TypeScript project in hedgeem-v5/api/, following node-poker-odds-calculator pattern. Folder structure: auth/, tables/, players/, admin/. Shared types from hedgeem_client_class_library. Shared enums from HedgeEmEnumerations.cs. Health-check endpoint GET /health. Vercel config. CI/CD hook for HEDGE-37.
