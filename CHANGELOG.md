# Changelog

Each release is tagged `vN` on GitHub; HACS offers the newest release as the update.

## v45

Contributed by Justin (pull request 1), merged onto the photo scene and day/night styles.

- New `entities` option replaces any entity the card reads, or hides its item with `false`, so the card can work with other inverters and integrations. A wrong key or value is reported as a configuration error.
- Every reading and chart converts W, kW and MW (and Wh, kWh and MWh) to kW and kWh using the entity's unit.
- New `battery_power_invert` option for battery power sensors that are positive while discharging.
- Plant sensors are the primary source for battery power, battery level and today's totals, with the inverter sensors as the fallback.
- PV strings can be objects with their own entities. A string with none of its entities is hidden, the Total row uses the system PV sensors when present, and a Third-party PV row appears when those sensors exist.
- The phase power mode is shown under GRID; the AC charger shows energy consumed, and both chargers show lifetime energy charged and discharged. The DC charger's gear icon is hidden without a limit entity.
- Battery level is shown to one decimal.
- The Modbus utility scripts stay in the repository.

## v44

- The scene is now a photo of the house (day and night versions, embedded in the card), with the readings placed around it. The card shows the photo at full size and crops its sides as it narrows, so the house always stays in view.
- Home flow redrawn as level and upright lines with small rounded corners: it runs level from the gateway, climbs beside the glass doors and follows the band above them to HOME's leader. A short branch crosses to the doors.
- The branch continues the home flow's animation from the fork, at the same speed, instead of animating on its own.
- Level and upright flow lines now glow like the diagonal ones (their blur area was empty).
- New `style` option: `auto` (default), `day` or `night`. The day style uses a light theme with pale aqua background, white panels and dark text; night keeps the dark theme.
- Documentation screenshots regenerated, and the README describes the style option and the flow animation speed.

## v42

- Clicks keep working while Home Assistant updates the card: unchanged text is no longer rewritten, and the HOME list updates in place.

## v41

- Artwork embedded in the card, so it is a single file installable through HACS.
