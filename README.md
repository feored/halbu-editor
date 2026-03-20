# Halbu Editor

<img src="static/assets/screenshots/library.png" />

<p float="left">
  <img src="static/assets/screenshots/reviewchanges.png" width="49%" />
  <img src="static/assets/screenshots/skills.png" width="49%" />
</p>

A native save editor for **Diablo II: Resurrected**.

[Download the latest release](../../releases/latest) · [Changelog](CHANGELOG.md)

---

## About

Halbu Editor started as a Rust learning project and grew into a full-featured hero editor for D2R.

The design goals: a **fully offline** native editor, graceful handling of mangled saves, compatibility with the latest patches, validation checks to prevent broken save states, and zero reliance on copyrighted assets (no Exocet font or ripped skill icons).

Save file parsing and writing is handled by [halbu](https://github.com/feored/halbu) — a dedicated Rust library that the editor frontend is built directly on top of.

## Features


- Edit your character information, skills, waypoints, quests and mercenary data
- Built-in skill calculator
- Per-quest flag editing, including advanced states and unused quests
- Bulk controls for waypoints/quests
- Validate saves before writing, with compatibility checks and force-convert support
- Review full list of changes before committing to disk, grouped by section with old → new values
- Inspect save metadata and parse issues in the Status tab
- Restore workflow for reverting changes
- Open saves directly from the character library once your save folder is configured
- New character creation from built-in templates
- Automatic backups for each character with configurable retention

## Limitations

- D2R only. Saves from 1.10+ classic D2 may parse correctly, but will be written back in D2R format. Do not overwrite non-D2R saves.
- No item editing
- Some minion skills (primarily Necromancer skeletons and golems) are unsupported and some rounding errors may occur in the skill calculator.

> D2R must be relaunched after saving for changes to take effect.

## Development

Halbu Editor is a [Tauri](https://v2.tauri.app/) application with a [Svelte](https://svelte.dev) frontend. Save file parsing and serialization lives in the [halbu](https://github.com/feored/halbu) Rust library — changes to `.d2s` format handling should be made there.

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
- Node.js / npm

### Setup

Initialize the `halbu` submodule and install dependencies:

```sh
git submodule update --init --recursive
npm install
```

### Running

```sh
npm run tauri dev
```

### Testing

Frontend tests currently use Vitest and are focused on quest logic and game-rules-sensitive quest behavior.

Run them with:

```sh
npm test
```

### Building

```sh
npm run tauri build
```

## Skill Data Preprocessing

The skill calculator is backed by versioned JSON files generated from D2's data text files. The preprocessor lives in `/static/tools/preprocess/` and outputs files like:

- `static/data/generated/skills/v99/skills_complete.json`
- `static/data/generated/skills/v105/skills_complete.json`

To regenerate all supported version datasets:

```sh
npm run preprocess:skills
```
