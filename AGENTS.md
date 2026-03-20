# AGENTS.md

## Purpose

This project prefers direct code, clear domain boundaries, and very little ceremony.

Future agents should optimize for:
- correctness
- readability
- low indirection
- preserving one clear implementation path

If a change makes the code feel more abstract, configurable, defensive, or framework-like, it is probably a bad change.

## Architecture

- The app has three layers: Svelte UI, Tauri command boundary, Rust backend.
- The Rust side, especially `libhalbu`, is the authority on save structure, parsing, serialization, compatibility, and domain invariants.
- The frontend is an editor for trusted data, not a second parser or schema engine.
- Frontend code should focus on editing, presentation, and straightforward UI state.
- Domain logic should live near the domain it edits. Do not move domain behavior into generic utility layers unless there is a real shared concept.

## Core Invariants

- `libhalbu` is the source of truth whenever possible.
- The frontend should match backend contracts, not compensate for them.
- Parsing in TypeScript must stay thin.
- Once trusted data crosses the backend boundary, assume it is valid.
- Fail fast on impossible states.
- Keep one implementation per behavior. Do not leave old and new paths in parallel.
- Delete dead code, dead files, and compatibility leftovers during refactors.

## Data And Parsing Rules

- Check the backend contract before changing payload handling, save conversion, compatibility, or anything format-sensitive.
- Only adapt data in TypeScript when the frontend representation truly differs from the backend representation.
- Do not re-validate the full payload tree in the frontend.
- Do not rebuild backend serializers in TypeScript.
- Do not introduce schema validation frameworks.
- Do not add defensive compatibility logic unless there is a proven backend boundary reason.

## State Rules

- Keep editor state direct.
- Prefer a single obvious state flow over mirrored state, sync layers, or derived shadow copies.
- If a value belongs to the save, update the save.
- If a value is purely display state, keep it local and simple.
- Do not create manager/controller/service layers around component state.

## Style Rules

- Prefer direct code over abstraction.
- Inline simple logic.
- Do not add helpers that only rename a condition, forward parameters, or wrap a single assignment.
- Remove ceremony: wrappers, trivial setters, descriptor arrays, config-driven rendering, handler layers, and one-use utilities.
- Large components are acceptable if they remain easy to read.
- A real abstraction must do at least one of these:
  - model a real domain concept
  - remove meaningful duplication
  - protect a real boundary
  - make the code materially easier to follow

## Naming

- Use direct domain names.
- Prefer explicit names, but do not bloat them.
- Avoid architecture-flavored names unless they are truly accurate.
- Avoid filler names such as:
  - `effective`
  - `resolved`
  - `computed`
  - `handler`
  - `manager`
  - `controller`
  - `processor`
- Avoid overly short names unless the scope is tiny and obvious.

## UI Rules

- UI code should read like UI code.
- Prefer direct event handlers over indirection layers.
- Prefer direct markup over descriptor/config objects for normal screens and forms.
- Do not split components just to make files smaller.
- Keep display logic close to where it is rendered.

## Utilities, Constants, And Files

- Shared utilities should be few and obvious.
- Keep constants only when they represent real domain values or remove real duplication.
- Do not create lookup tables or config objects used once.
- Fold tiny one-use files into their caller when that makes the project easier to follow.
- Keep small files only if they represent a real boundary.
- Generated files, entry files, and build/config files may be small and should not be folded just because they are short.

## Error Handling And Types

- Throw simple, direct errors.
- Do not build error hierarchies unless there is a real need.
- Do not add null checks for states that should not happen.
- Use types to clarify runtime behavior, not to create type-level architecture.
- Avoid deep utility types, elaborate generic plumbing, and unnecessary casts.

## Refactoring Rules

- Simplify. Do not reshuffle complexity into different files.
- Replace old patterns instead of layering new ones on top.
- Remove unused code as part of the same change.
- Do not leave migration scaffolding behind unless it is actively required.
- Reorganize and rename files freely when it makes the project simpler.
- Do not preserve abstractions out of caution.

## Things Agents Must Not Introduce

- schema validation frameworks
- clean-architecture layering
- service / manager / controller patterns
- command / handler layers for ordinary UI code
- generic action systems
- state libraries for simple local state
- over-generalized helpers
- abstraction cascades
- configuration-driven UI where direct code is clearer

## Working Rules

- Start by identifying the real boundary you are changing.
- Prefer editing existing code over adding new files.
- When touching save logic, inspect the Rust side first.
- When refactoring, finish the refactor. Do not leave parallel implementations.
- Do not revert unrelated user changes.
- Run TypeScript and Svelte checks after meaningful changes when possible.

## Decision Rule

When unsure:
- keep `libhalbu` authoritative
- choose the simpler implementation
- prefer fewer moving parts
- prefer code that reads straight through without helper-hopping
