# hedgeem-v5 — CLAUDE.md

## Project Overview

- **Repo**: `texashedgeem/hedgeem-v5` (GitHub)
- **Local path**: `/Users/simonhewins/repo_git/hedgeem-v5`
- **Planned domain**: https://hedgeem-v5.qeetoto.com
- **Tech stack**: Phaser 3 + Vite + TypeScript (frontend), Node.js or .NET REST API (TBD), Supabase (Postgres + Auth)
- **Purpose**: The definitive modern rewrite of Texas Hedge'Em — consolidating the best of v1 (JS), v2 (C#), and v3 (UMA) into one codebase.

## Repo Structure

```
src/                — game source (Phaser 3 / TypeScript)
gameClient/         — game client files
source/             — additional source
supabase/           — Supabase migrations and config
index.html          — entry point
vercel.json         — Vercel deployment config
package.json
```

## Status

Planning and early development phase. Three prior versions being revived and analysed before v5 is built:

| Version | Repo | Stack | Status |
|---|---|---|---|
| v1 (JS) | HedgeEmJavaScriptClient | Phaser / plain JS | Live at hedgeem.qeetoto.com |
| v2 (C#) | DotNetHedgeEmClient + server | .NET | Being revived (HEDGE-4) |
| v3 (UMA) | — | Node + C++ | Being revived (HEDGE-5) |

## Jira

- **Instance**: https://open-banking.atlassian.net
- **Project**: HEDGE (Texas Hedge'Em)
- **Auth**: simon.hewins@gmail.com + $JIRA_TOKEN (NOT $JIRA_ZODIA)
- **API**: POST `/rest/api/3/search/jql`
- **Transition IDs**: Backlog=11, Selected=21, In Progress=31, Done=41
- **Account ID**: 557058:b4cd85f9-758b-4198-9eaa-0123bc538f7a

## Key HEDGE Tickets

| Key | Summary |
|---|---|
| HEDGE-1 | Review and clean up HedgeEm JavaScript game |
| HEDGE-6 | Modernise HedgeEm JavaScript client to latest tech stack |
| HEDGE-21 | Data persistence: Supabase as platform datastore |
| HEDGE-23 | Create Supabase project and run initial migrations |
| HEDGE-24 | Implement Supabase auth and game session persistence |

## Current Focus

**Next: HEDGE-50** — Betting UI (chips, denomination cycling, bet placement, cancel)
Last done (2026-03-20): standalone_reference_client rendering sprint — correct table/cards/positions, WIN/DEAD display, odds updating per stage, API disabled (HEDGE-83), hand descriptions hidden (HEDGE-85). 9 Playwright smoke tests passing.
Simon actions pending: (1) Provide SQLite DB file (HEDGE-29).
Mintlify: live at https://hedgeem-api.qeetoto.com/introduction — dashboard.mintlify.com/qeetoto/qeetoto — monorepo path: mintlify-docs/

### Outstanding UI tickets (always show in session-start report)
| Key | Priority | Summary |
|---|---|---|
| HEDGE-50 | High | Betting UI — chips, denomination cycling, bet placement, cancel |
| HEDGE-78 | Medium | Menu and help screens — top-right navigation |
| HEDGE-79 | Medium | Config button — fix on JS site first, then port |
| HEDGE-82 | Medium | Config options page (parent of HEDGE-83, HEDGE-85) |
| HEDGE-73 | Medium | 3D card perspective (skewX) |
| HEDGE-80 | Medium | Configurable hand count (2–4 UI, 23 backend max) |
| HEDGE-70 | Low | Portrait/landscape responsive layout |
| HEDGE-84 | Low | Restore handfont bitmap styling for odds |

## Claude Behaviour Standards

- **Session start**: Read this "Current Focus" section and MEMORY.md. Announce next action. List In Progress HEDGE tickets. Ask Simon if he wants to continue. Do this before anything else, without being asked.
- Show Jira preview before creating/updating tickets
- Add Jira comments at: start of work, description enhancement, Done transition
- Never delete descriptions — only update or append
- Before closing any ticket: ask Simon if he wants to test first; capture response/evidence as a Jira comment before transitioning to Done
- $JIRA_TOKEN = open-banking.atlassian.net — do NOT use $JIRA_ZODIA here
- Always Edit files — never Write/overwrite
