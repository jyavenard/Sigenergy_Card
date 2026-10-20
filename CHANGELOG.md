# Changelog

Each release is tagged `vN` on GitHub; HACS offers the newest release as the update.

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
