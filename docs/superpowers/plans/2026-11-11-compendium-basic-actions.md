# Compendium basic actions implementation plan

> Execution: implement in this session and verify against the running Foundry world when feasible.

**Goal:** Run all six Crux basic actions using CPR 2024 without permanently adding items to actors.

**Architecture:** Prefer owned items; otherwise load CPR 2024 records and bind transient item data to the actor. Resolve grapple and shove through the Unarmed Strike activities, with an explicit shove choice. Preserve fallback and report failures.

**Tech Stack:** Foundry VTT, D&D 5e 6, JavaScript, Node test runner.

**Spec:** docs/superpowers/specs/2026-11-11-compendium-basic-actions-design.md

## Constraints and review focus

- Never silently use 2014 rules. Preserve actor-owned actions and target selection.
- Missing CPR, missing activity, permission denial, synthetic actors, and activity cancellation must not leave persistent items behind.
- Verify actor binding, effect application and expiration in the real Foundry environment where possible; mocked tests cannot prove module integration.

## Implementation

- [ ] Inspect Foundry and dnd5e supported temporary item activation, including module hooks and UUID behavior.
- [ ] Add failing behavior tests for owned item priority, all CPR action mappings, push/prone choice, and unavailable data.
- [ ] Implement compendium lookup and invocation using 2024 data only; use a transient actor-bound item if supported.
- [ ] Run targeted tests and inspect changes.
- [ ] Test real execution on an actor without the action and check effects and item persistence; report any limitation.
