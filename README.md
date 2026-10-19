# Sigenergy Flow Card

A standalone Home Assistant Lovelace card that recreates the SigenCloud / mySigen power-flow dashboard for a Sigenergy installation (solar, SigenStor battery, Sigen Gateway, grid, and optional AC/DC EV chargers).

- Animated power flow between the solar panels, SigenStor, gateway, home and grid. Each highlight moves in the direction power is flowing, faster at higher power, and stops when idle.
- Power readings for solar, home, SigenStor (with battery state of charge), grid, and the AC and DC chargers when present.
- Today's energy statistics and a battery level panel.
- Power metrics chart from midnight to now, with sunrise and sunset times for your Home Assistant location. Hover (or tap) the chart to see every value at that time.
- Tap **SOLAR** for per-string PV details (voltage, current, power, today's and lifetime production) and a chart of each string's power today.
- Tap **HOME** for a live breakdown of power usage across the entities you list, sorted from highest to lowest.
- Tap **DC CHARGER** to adjust the DC charger's maximum charging power.

No other custom cards (button-card, card-mod, Mushroom) are needed.

## Screenshots

### Desktop

Main view, with the power metrics overlay shown by hovering over the chart:

![Desktop main view](docs/screenshots/desktop-main.png)

Tapping **SOLAR**:

![Desktop PV strings](docs/screenshots/desktop-solar.png)

Tapping **HOME**:

![Desktop home power usage](docs/screenshots/desktop-home.png)

### iPhone (portrait)

<table>
  <tr>
    <th>Main view</th>
    <th>SOLAR</th>
    <th>HOME</th>
  </tr>
  <tr>
    <td><img src="docs/screenshots/iphone-main.png" alt="iPhone main view" width="260"></td>
    <td valign="top"><img src="docs/screenshots/iphone-solar.png" alt="iPhone PV strings" width="260"></td>
    <td valign="top"><img src="docs/screenshots/iphone-home.png" alt="iPhone home power usage" width="260"></td>
  </tr>
</table>

## Requirements

All data is read locally over Modbus by the [Sigenergy Local Modbus](https://github.com/TypQxQ/Sigenergy-Local-Modbus) integration. Install and configure it first; the card uses its default entity IDs (`sensor.sigen_plant_*`, `sensor.sigen_inverter_*`, `sensor.sigen_ac_charger_*`).

## Installation

1. Copy the artwork to `/config/www/Sigenergy/` on your Home Assistant instance. The card uses these four files from `images/`:

   ```
   bg_villa_pv.png
   ac_charger_bg.png
   bg_sigenstor.png
   bg_gateway.png
   ```

   Copying the whole `images/` directory also works.

2. Copy `sigenergy-flow-card.js` to `/config/www/sigenergy-flow-card.js`.

   For example, over SSH:

   ```sh
   scp images/bg_villa_pv.png images/ac_charger_bg.png images/bg_sigenstor.png images/bg_gateway.png root@homeassistant.local:/config/www/Sigenergy/
   scp sigenergy-flow-card.js root@homeassistant.local:/config/www/
   ```

3. Register the card as a dashboard resource: **Settings → Dashboards → ⋮ → Resources → Add resource**
   - URL: `/local/sigenergy-flow-card.js?v=1`
   - Resource type: **JavaScript module**

4. Add the card to a dashboard (**Edit dashboard → Add card → Manual**):

   ```yaml
   type: custom:sigenergy-flow-card
   ```

5. Hard-refresh the browser. On the Home Assistant companion app, you may need to reset the app's frontend cache from its settings.

### Updating

Copy the new `sigenergy-flow-card.js` over the old one, then increase the `?v=` number in the resource URL (for example `?v=2`). The browser keeps using its cached copy until that URL changes.

## Configuration

All options are optional.

| Option | Default | Description |
| --- | --- | --- |
| `image_base` | `/local/Sigenergy` | URL of the directory holding the artwork. |
| `pv_strings` | `[PV1, PV2, PV3, PV4]` | Display names for the PV strings, in order. The number of names sets how many strings are shown. |
| `home_entities` | `[]` | Power entities listed when tapping **HOME**. Without it, HOME is a plain label. |
| `ac_charger_soc` | none | Battery level entity of the vehicle on the AC charger. |
| `ac_charger_range` | none | Range entity of that vehicle. Only shown together with `ac_charger_soc`. |

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

## Utilities

Small Python scripts that query the system directly over Modbus TCP (port 502). They need [pymodbus](https://github.com/pymodbus-dev/pymodbus) and take the address of the Sigenergy system as their only argument, e.g. `./sigen_soc.py 192.168.1.50`.

- `sigen_soc.py`: prints the battery state of charge.
- `sigen_powermode.py`: reports whether Independent Phase Control is active.
- `sigen_evac.py`: scans Modbus device IDs to find the AC charger (EVAC) and prints its total energy consumed.

## Acknowledgements

The original YAML version of this dashboard came from [this gist](https://gist.github.com/fbradyirl/08fef90bd11d7bdddf588a56e668d879).
