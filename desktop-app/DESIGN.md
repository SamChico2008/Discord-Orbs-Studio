# Orb Studio — Design & Orbital Library

## Direction

A graphite desktop studio to browse Discord quests, track live progression, and collect rewards. Navigation is calm and structured; game art and the orbital emblem define the identity. Periwinkle accents highlight primary actions and active selection. Warm peach accents indicate rewards and completions.

## Design References

- **Linear** (Navigation & Preferences): structured navigation hierarchy, readable groups, modular settings.
- **Raycast** (Modern UI): compact commands, refined controls, high-density clarity.
- **Arc** (Workspace Composition): harmonious spatial relationship between sidebar rail and workspace canvas.

These references inform the visual system; no proprietary code or assets from these platforms are included.

## Visual System

| Role | Value |
| --- | --- |
| Canvas Background | `#171719` |
| Workspace Background | `#1c1c1f` |
| Card Surface | `#212124` |
| Border | `#333338` |
| Primary Text | `#f4f2ee` |
| Secondary Text | `#a6a5ad` |
| Periwinkle Accent | `#b8adf2` |
| Sage / Success | `#a8cbb4` |
| Peach / Reward | `#e2b69b` |
| Error / Danger | `#ed9eaa` |

Local typography: Segoe UI Variable Text for controls, Segoe UI Variable Display for headings, Segoe UI fallback. Zero font network downloads at launch. Numerical counters use tabular figures (`font-variant-numeric: tabular-nums`).

Themes (Sage, Peach, Rose) customize the primary accent tokens while preserving surface contrast and elevation hierarchy.

## Composition Architecture

```text
┌ Window Title Bar / Quick Tools ───────────────────────────┐
│ Orb Studio   │ Breadcrumb Navigation                      │
│              │ Title & Context                            │
│ Workspace    │ Quests Overview                            │
│ Quests       │ Search / Sort / Quick Actions              │
│ Live Monitor │ Filtering                                  │
│ Rewards      │ Game Artwork / Progress / Direct Triggers  │
│              │                                            │
│ Account      │                                            │
│ Accounts     │                                            │
│ Settings     │                                            │
│ Profile Pill │                                            │
└──────────────┴────────────────────────────────────────────┘
```
