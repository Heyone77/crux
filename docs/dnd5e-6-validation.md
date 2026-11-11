# dnd5e 6 compatibility validation

## Automated regressions

Run with Node.js 24 (no dependencies to install):

```sh
node --test
```

These tests exercise Crux modules with host API stubs. They cover status click
options, the level-zero decrement guard, dialog configuration arguments, new and
legacy movement data, and ActiveEffect flyout refreshes. They do not run Foundry,
Midi-QOL, Tidy 5e, document migrations, or template placement.

## In-world checks still required

Use a test world on Foundry 14 with dnd5e 6.0.6. Test the native system first,
then repeat with the compatible Midi-QOL/DAE versions and Tidy 5e enabled. The
Midi-QOL 14.6.1 manifest requires Foundry 14.369, dnd5e 6.0.6, and DAE 14.6.1.

- Exhaustion: click to increase; right-click to decrease. Decrease from 1 to 0,
  then right-click again and confirm that no effect is created. Check that
  ordinary conditions still use right-click to toggle the overlay.
- Leave the Crux status flyout open. Apply and remove a condition from the actor
  sheet, and allow a timed effect to expire. Confirm that the flyout updates.
  With multiple actors selected, changes to another actor must not switch it.
- Use an item normally, through an explicit activity, and with automatic first
  activity selection. Repeat with the configured skip-dialog keys and confirm
  normal, advantage, and disadvantage behavior. Check that a single use creates
  one workflow and consumes the expected charges or spell slot.
- Check tray and movement flyout speeds for walking, flying, swimming, climbing,
  and a configured custom movement type. Repeat after applying exhaustion or a
  speed-modifying effect. Check NPC speed summaries.
- Place a spell area, cancel placement, and place a Region-based area. Confirm
  token selection recovery and the system's target/consumption behavior.
- With Tidy sections enabled in Crux, check custom inventory, feature, and spell
  sections, item activation, and opening the item sheet.

Reference sources:

- [dnd5e 6.0 release notes](https://github.com/foundryvtt/dnd5e/releases/tag/release-6.0.0)
- [Midi-QOL 14.6.1 manifest](https://gitlab.com/tposney/midi-qol/-/blob/v14.6.1/module.json)
- [Tidy 5e 14.1.2 release for dnd5e 6.0.x](https://github.com/kgar/foundry-vtt-tidy-5e-sheets/releases/tag/v14.1.2)
