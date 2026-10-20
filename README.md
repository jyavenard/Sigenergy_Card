# Sigenergy Flow Card

A standalone Home Assistant Lovelace card that recreates the SigenCloud / mySigen power-flow dashboard for a Sigenergy installation (solar, SigenStor battery, Sigen Gateway, grid, and optional AC/DC EV chargers).

- Animated power flow between the solar panels, SigenStor, gateway, home and grid, drawn over a photo of the house. Each highlight moves in the direction power is flowing, faster at higher power, and stops when idle.
- Day and night looks: a light theme with the daytime photo between sunrise and sunset, a dark theme with the night photo otherwise. Force either with the `style` option.
- Power readings for solar, home, SigenStor (with battery state of charge), grid, and the AC and DC chargers when present.
- Today's energy statistics and a battery level panel. Tap any statistic or the battery level to open that sensor's details and history, or the stored energy (e.g. 4.4 of 40.3 kWh) for a chart of the energy held in the battery today.
- Power metrics chart from midnight to now, with sunrise and sunset times for your Home Assistant location. Hover (or tap) the chart to see every value at that time.
- Tap **SOLAR** for per-string PV details (voltage, current, power, today's and lifetime production) and a chart of each string's power today.
- Tap **HOME** for a live breakdown of power usage across the entities you list, sorted from highest to lowest.
- Tap **DC CHARGER** to adjust the DC charger's maximum charging power.

No other custom cards (button-card, card-mod, Mushroom) are needed.

## Screenshots

The screenshots show the day style.

### Desktop

Main view, with the power metrics overlay shown by hovering over the chart:

![Desktop main view](docs/screenshots/desktop-main.png)

Tapping **SOLAR**:

![Desktop PV strings](docs/screenshots/desktop-solar.png)

Tapping **HOME**:

![Desktop home power usage](docs/screenshots/desktop-home.png)

Tapping the stored energy under **Battery level**:

![Desktop battery energy](docs/screenshots/desktop-energy.png)

### iPhone (portrait)

<table>
  <tr>
    <th>Main view</th>
    <th>SOLAR</th>
    <th>HOME</th>
    <th>Battery energy</th>
  </tr>
  <tr>
    <td><img src="docs/screenshots/iphone-main.png" alt="iPhone main view" width="200"></td>
    <td valign="top"><img src="docs/screenshots/iphone-solar.png" alt="iPhone PV strings" width="200"></td>
    <td valign="top"><img src="docs/screenshots/iphone-home.png" alt="iPhone home power usage" width="200"></td>
    <td valign="top"><img src="docs/screenshots/iphone-energy.png" alt="iPhone battery energy" width="200"></td>
  </tr>
</table>

## Requirements

All data is read locally over Modbus by the [Sigenergy Local Modbus](https://github.com/TypQxQ/Sigenergy-Local-Modbus) integration. Install and configure it first; the card uses its default entity IDs (`sensor.sigen_plant_*`, `sensor.sigen_inverter_*`, `sensor.sigen_ac_charger_*`).

## Installation

The artwork is built into `sigenergy-flow-card.js`, so the card is a single file: nothing needs copying to `/config/www/Sigenergy/`.

### HACS (recommended)

1. In Home Assistant, open **HACS**, then **⋮ → Custom repositories**.
2. Add `https://github.com/jyavenard/Sigenergy_Card` with type **Dashboard**.
3. Search HACS for **Sigenergy Flow Card**, open it and select **Download**.
4. Reload the browser when HACS asks. HACS registers the dashboard resource (`/hacsfiles/Sigenergy_Card/sigenergy-flow-card.js`) for you.
5. Add the card to a dashboard (**Edit dashboard → Add card → Manual**):

   ```yaml
   type: custom:sigenergy-flow-card
   ```

HACS offers an update whenever a new release is published on GitHub (see [CHANGELOG.md](CHANGELOG.md)); download it and reload the browser.

If your dashboards are configured in YAML mode, HACS cannot register the resource; add it yourself as below, with the URL `/hacsfiles/Sigenergy_Card/sigenergy-flow-card.js`.

### Manual

1. Copy `sigenergy-flow-card.js` to `/config/www/` on your Home Assistant instance, for example over SSH:

   ```sh
   scp sigenergy-flow-card.js root@homeassistant.local:/config/www/
   ```

2. Register it as a dashboard resource: **Settings → Dashboards → ⋮ → Resources → Add resource**
   - URL: `/local/sigenergy-flow-card.js?v=1`
   - Resource type: **JavaScript module**

3. Add the card to a dashboard as above, then hard-refresh the browser. On the Home Assistant companion app, you may need to reset the app's frontend cache from its settings.

To update, copy the new file over the old one and increase the `?v=` number in the resource URL (for example `?v=2`); the browser keeps using its cached copy until that URL changes.

### Moving from a manual install to HACS

Remove the `/local/sigenergy-flow-card.js` resource and delete `/config/www/sigenergy-flow-card.js`, so only the HACS copy is loaded. The `/config/www/Sigenergy/` artwork directory is no longer used and can be deleted.

## Configuration

All options are optional.

| Option | Default | Description |
| --- | --- | --- |
| `pv_strings` | `[PV1, PV2, PV3, PV4]` | Display names for the PV strings, in order. The number of names sets how many strings are shown. |
| `home_entities` | `[]` | Power entities listed when tapping **HOME**. Without it, HOME is a plain label. |
| `ac_charger_soc` | none | Battery level entity of the vehicle on the AC charger. |
| `ac_charger_range` | none | Range entity of that vehicle. Only shown together with `ac_charger_soc`. |
| `style` | `auto` | Artwork to show: `day`, `night` or `auto` (day between sunrise and sunset). |

### Example

```yaml
type: custom:sigenergy-flow-card
pv_strings: [NE, NW, S, W]
ac_charger_soc: sensor.my_car_battery_level
ac_charger_range: sensor.my_car_battery_range
home_entities:
  - entity: sensor.sigen_ac_charger_charging_power
    name: EV
    icon: mdi:car-electric
  - entity: sensor.pool_power
    name: Pool
    icon: mdi:pool
  - sensor.hot_water_power
```

### Style

`style` selects the artwork and theme:

- `auto` (default): day between today's sunrise and sunset (as shown under the chart; `sun.sun` is used if no location is set), night otherwise.
- `day`: always the light theme with the daytime photo.
- `night`: always the dark theme with the night photo.

```yaml
type: custom:sigenergy-flow-card
style: day
```

### Flow animation

Each flow's highlight moves from its source to its destination at `60 + 35 × √kW` scene units per second, using that flow's own power, so a 5 kW flow runs about 1.6 times faster than a 0.6 kW one. A flow below 0.025 kW is idle. The short branch of the home line into the glass doors continues the home flow's animation from the point where it forks, at the same speed. With *reduce motion* enabled in the operating system, the lines are drawn without moving highlights.

### PV strings

Tapping **SOLAR** reads these entities for each string *n* (1 to the number of `pv_strings`):

```
sensor.sigen_inverter_pv<n>_voltage
sensor.sigen_inverter_pv<n>_current
sensor.sigen_inverter_pv<n>_power
sensor.sigen_inverter_pv<n>_daily_energy
sensor.sigen_inverter_pv<n>_accumulated_energy
```

### Home power usage

Each `home_entities` item is either an entity ID or an object with:

- `entity`: the power sensor (required)
- `name`: label; defaults to the entity's friendly name
- `icon`: e.g. `mdi:pool`; defaults to the entity's `icon` attribute, if any

Other keys are ignored, so a list written for [power-flow-card-plus](https://github.com/flixlix/power-flow-card-plus) `individual` entities can be pasted as-is.

The list shows only entities currently drawing power (anything that would display as more than 0.00 kW), sorted from highest to lowest. **Measured** is the sum of the listed entities, compared with the home consumption reported by Sigenergy; the remainder is shown as **Other (unmeasured)**. Avoid listing a sensor together with another sensor that already includes it (for example a circuit and the phase meter that feeds it), as it would be counted twice. Tapping an entry opens its Home Assistant details.

### AC and DC chargers

Each charger's reading, chart series and (for the AC charger) artwork only appear if its power entity exists:

- AC charger: `sensor.sigen_ac_charger_charging_power`
- DC charger: `sensor.sigen_inverter_dc_charger_output_power`

The DC charger's vehicle state of charge is hidden while the charger is idle and reports 0%.

## Changing the artwork

The scene photos `images/house_day.png` and `images/house_night.png` are embedded in the card, each extended with a band above and below for the readings. After changing either, regenerate the embedded copy (requires [Pillow](https://python-pillow.org)):

```sh
python3 tools/embed-artwork.py
```

## Utilities

Small Python scripts that query the system directly over Modbus TCP (port 502). They need [pymodbus](https://github.com/pymodbus-dev/pymodbus) and take the address of the Sigenergy system as their only argument, e.g. `./sigen_soc.py 192.168.1.50`.

- `sigen_soc.py`: prints the battery state of charge.
- `sigen_powermode.py`: reports whether Independent Phase Control is active.
- `sigen_evac.py`: scans Modbus device IDs to find the AC charger (EVAC) and prints its total energy consumed.

## Acknowledgements

The original YAML version of this dashboard came from [this gist](https://gist.github.com/fbradyirl/08fef90bd11d7bdddf588a56e668d879).
