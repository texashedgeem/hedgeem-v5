# Texas Hedge'Em v5

> The modern, unified rewrite of Texas Hedge'Em — a player-vs-house poker odds game.

## What is this?

Texas Hedge'Em is a poker-based casino game where players bet on their hand's odds against the house rather than against each other. This repository will become the definitive version of the game, built on a modern tech stack.

## The Strategy

Three versions of Texas Hedge'Em exist across different repositories, each built with a different tech stack:

| Version | Stack | Status |
|---|---|---|
| JavaScript (v1) | HTML5 / Phaser / plain JS | Live at [hedgeem.qeetoto.com](https://hedgeem.qeetoto.com) |
| C# (v2) | .NET client + bespoke API server | Being revived |
| UMA (v3) | Node + C++ | Being revived |

The plan:
1. Get all three versions running in their own repositories
2. Document the strengths of each — game logic, UX, architecture
3. Build **v5** here — a single modern codebase that cherry-picks the best from all three

## Planned Tech Stack

- **Frontend**: Phaser 3 + Vite + TypeScript
- **Backend**: REST API (Node.js or .NET — TBD based on v2/v3 analysis)
- **Testing**: Playwright end-to-end test harness
- **Deployment**: Vercel (frontend) + TBD (backend)
- **Domain**: [hedgeem-v5.qeetoto.com](https://hedgeem-v5.qeetoto.com)

## Related Repos

- [HedgeEmJavaScriptClient](https://github.com/texashedgeem/HedgeEmJavaScriptClient) — JS version
- [DotNetHedgeEmClient](https://github.com/texashedgeem/DotNetHedgeEmClient) — C# client
- [server](https://github.com/texashedgeem/server) — C# bespoke API server
- [node-poker-odds-calculator](https://github.com/texashedgeem/node-poker-odds-calculator) — Poker odds REST API

## Status

**Coming soon.** Currently in planning and revival phase.
