/* Sigenergy Flow Card v39 — standalone Home Assistant Lovelace custom card */

// Every coordinate below (artwork, wires, label anchors) is in pixels of bg_villa_pv.png (1010x858).
// The artwork and the wires share one SVG viewBox, so they scale together at any card width.
const VIEW = { x: -340, y: -70, w: 1440, h: 1080 };

const AC_POWER = 'sensor.sigen_ac_charger_charging_power';
const DC_POWER = 'sensor.sigen_inverter_dc_charger_output_power';

// [file, x, y, width, height, id]; placement matches the SigenCloud app's composition.
const ART_BACK = [
    ['bg_villa_pv.png', 0, 0, 1010, 858],
    ['ac_charger_bg.png', -14.9, 12.5, 992.16, 857.33, 'acArt'],
];
const ART_FRONT = [
    ['bg_sigenstor.png', -35.8, -89.8, 1119.13, 958.42],
    ['bg_gateway.png', -34.0, -103.0, 1119.13, 958.42],
];

// Wires are drawn beneath SigenStor and the gateway; each end sits a few pixels inside its device.
const FLOWS = {
    solarFlow: 'M441 168 C441 200 385 200 385 240 L385 535',
    inverterFlow: 'M445 593.5 L557 629',
    homeFlow: 'M621 652 L655 652 C705 652 748 630 748 585 L748 425 C748 408 753 401 766 396 L821 373',
    gridFlow: 'M586 715 L588 775 C589 795 600 801 619 807 L788 864',
};
const LEADERS = ['M441 -60 V168', 'M810 -60 V266', 'M383 730 V1000', 'M788 864 V1000'];
const GROUND = '-700,573 598,97 1559,527 474,1231';

const FLOW_COLOR = '#63d6c1';
const CHART_SERIES = [
    { id: 'sensor.sigen_plant_pv_power', color: '#ead66c', name: 'Solar' },
    { id: 'sensor.sigen_inverter_battery_power', color: '#69d4d1', name: 'Battery' },
    { id: 'sensor.sigen_plant_grid_import_power', color: '#8d8bff', name: 'Grid' },
    { id: 'sensor.sigen_plant_grid_export_power', color: '#8d8bff', name: 'Grid', negate: true },
    { id: AC_POWER, color: '#efa66a', name: 'AC' },
    { id: DC_POWER, color: '#c28aff', name: 'DC' },
    { id: 'sensor.sigen_plant_consumed_power', color: '#c7d8df', name: 'Home' },
];
const PV_COLORS = ['#6bd36b', '#5fd4dc', '#6a78f0', '#a868f0', '#efa66a', '#ead66c'];
const COMET_LAYERS = [1, .78, .56, .36, .18];

const atX = x => `${((x - VIEW.x) / VIEW.w * 100).toFixed(3)}%`;
const atY = y => `${((y - VIEW.y) / VIEW.h * 100).toFixed(3)}%`;

class SigenergyFlowCard extends HTMLElement {
    static getStubConfig() {
        return {
            type: 'custom:sigenergy-flow-card'
        };
    }
    setConfig(config) {
        this.config = {
            image_base: '/local/Sigenergy',
            pv_strings: ['PV1', 'PV2', 'PV3', 'PV4'],
            home_entities: [],
            ...config
        };
        this._build();
        if (this.isConnected && !this._flowFrame) this._startFlowAnimation();
    }
    set hass(hass) {
        const previous = this._hass;
        this._hass = hass;
        if (!this.root)
            return;
        this._update();
        this._updateSunTimes();
        const today = new Date().toLocaleDateString('en-CA');
        if (!previous || this._day !== today) {
            this._day = today;
            this._loadHistory();
        }
    }
    getCardSize() {
        return 12;
    }
    _build() {
        if (this._flowFrame) { cancelAnimationFrame(this._flowFrame); this._flowFrame = null; }
        if (!this.shadowRoot)
            this.attachShadow({
                mode: 'open'
            });
        const base = this.config.image_base.replace(/\/$/, '');
        const image = ([file, x, y, w, h, id]) => `<image${id ? ` id="${id}"` : ''} href="${base}/${file}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
        const legend = [...new Map(CHART_SERIES.map(s => [s.name, s])).values()]
            .map(s => `<span id="legend${s.name}"><i class="dot" style="background:${s.color}"></i>${s.name}</span>`).join('');
        const comets = id => COMET_LAYERS.map(() => `<path class="comet" d="${FLOWS[id]}"/>`).join('');
        const flows = Object.keys(FLOWS).map(id => `<g class="flow" id="${id}"><path class="wire" d="${FLOWS[id]}"/><path class="glow" d="${FLOWS[id]}" filter="url(#glow)"/>${comets(id)}</g>`).join('');
        this.shadowRoot.innerHTML = `<style>
      :host{display:block;color:#edf3f6;font-family:Roboto,Arial,sans-serif}
      [hidden]{display:none !important}
      ha-card{display:block;background:#11191d;border:1px solid #343b44;border-radius:16px;overflow:hidden;color:inherit;padding:16px;box-sizing:border-box}
      .header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
      .heading{font-size:20px;font-weight:650;letter-spacing:.2px}.sub{font-size:12px;color:#96a5af}
      .layout{display:grid;grid-template-columns:minmax(0,2.4fr) minmax(240px,.75fr);gap:14px}
      .scene{position:relative;display:flex;justify-content:center;background:radial-gradient(ellipse 65% 55% at 62% 3%,rgba(68,183,178,.32),transparent 75%),radial-gradient(ellipse 38% 50% at 13% 5%,rgba(193,146,43,.18),transparent 78%),linear-gradient(160deg,#1a2528,#11191d 76%);border-radius:12px;overflow:hidden}
      .stage{position:relative;width:min(100%,1040px);aspect-ratio:${VIEW.w}/${VIEW.h};container-type:inline-size;--u:calc(100cqw / ${VIEW.w})}
      .stage>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
      .ground{fill:url(#groundFill);stroke:rgba(120,190,180,.22);stroke-width:1.5}
      .leader{fill:none;stroke:rgba(174,198,199,.38);stroke-width:1.6}
      .wire{fill:none;stroke:rgba(150,170,175,.38);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;transition:stroke .4s}
      .flow.active .wire{stroke:rgba(99,214,193,.42)}
      .glow,.comet{fill:none;stroke:${FLOW_COLOR};stroke-linecap:round;stroke-linejoin:round;display:none}
      .glow{stroke-width:7;opacity:.45}.comet{stroke-width:2.6;opacity:.24}
      .flow.active.moving .glow,.flow.active.moving .comet{display:inline}
      .solar{color:#ead66c}.battery{color:#69d4d1}.grid{color:#8d8bff}.ac{color:#efa66a}.dc{color:#c28aff}.home{color:#b6d8db}
      .node{position:absolute;z-index:2;white-space:nowrap;text-shadow:0 2px 10px #000b}
      .node strong{display:block;font-size:clamp(14px,calc(34 * var(--u)),36px);font-weight:580}
      .node small{display:block;font-size:clamp(11px,calc(24 * var(--u)),24px);color:#b3c0c9;margin-top:.25em;letter-spacing:.3px}
      .node em{display:block;font-size:clamp(10px,calc(17 * var(--u)),17px);font-style:normal;color:#9dd5c5;margin-top:.3em}
      .sidecol{position:absolute;z-index:2;display:flex;flex-direction:column;justify-content:space-between;gap:max(18px,calc(30 * var(--u)))}
      .sidecol .node{position:static;border-left:1px solid rgba(174,198,199,.38);padding-left:calc(12 * var(--u))}
      .node button{all:unset;cursor:pointer;display:block}.node button:focus-visible{outline:2px solid #71d3d1}
      .sidebar{display:flex;flex-direction:column;gap:12px}.panel{background:#222831;border:1px solid #35414a;border-radius:12px;padding:13px}
      .panel h3{margin:0 0 11px;font-size:14px;font-weight:600;color:#d5e5e8}.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .stat{background:#2a323d;border-radius:8px;padding:10px}.stat small{font-size:11px;color:#aabac5;display:block}.stat b{font-size:18px;display:block;margin-top:4px}
      .socbar{height:10px;background:#45515c;border-radius:8px;overflow:hidden;margin:9px 0}.socfill{height:100%;background:linear-gradient(90deg,#49b5ac,#9ee4db);width:0%;transition:width .5s}
      .chartpanel{margin-top:14px}.charthead{display:flex;justify-content:space-between;align-items:center}.legend{font-size:11px;color:#abb9c2}
      .legend span{margin-right:12px}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
      .sun-times{display:flex;justify-content:space-between;gap:12px;margin-top:10px;padding:10px 15px;border-radius:24px;background:#343b46;color:#b8c3ce;font-size:12px}
      #chart,#pvChart{width:100%;height:170px;display:block;touch-action:pan-y}.muted{color:#8f9ea8;font-size:12px}
      .chart-wrap{position:relative}
      .tip{position:absolute;top:4px;z-index:3;pointer-events:none;background:rgba(17,25,29,.94);border:1px solid #3f4c56;border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.5;white-space:nowrap;box-shadow:0 6px 18px #0008;font-variant-numeric:tabular-nums}
      .tip b{display:block;font-size:12px;color:#d5e5e8;margin-bottom:2px}
      .tip div{display:flex;align-items:center;gap:6px}.tip span{margin-left:auto;padding-left:14px;color:#edf3f6}.tip em{font-style:normal;color:#8f9ea8}
      dialog{background:#1a2227;color:#edf3f6;border:1px solid #35414a;border-radius:16px;padding:0;width:min(760px,calc(100vw - 24px));max-height:calc(100vh - 32px);box-sizing:border-box;font-family:Roboto,Arial,sans-serif}
      dialog::backdrop{background:rgba(0,0,0,.6)}
      .dlg{padding:16px;display:flex;flex-direction:column;gap:14px}
      .dlg-head{display:flex;justify-content:space-between;align-items:center}.dlg-head h2{margin:0;font-size:18px;font-weight:600}
      .dlg-head button{all:unset;cursor:pointer;font-size:20px;line-height:1;padding:4px 8px;border-radius:8px;color:#b3c0c9}.dlg-head button:focus-visible{outline:2px solid #71d3d1}
      .pv-wrap{overflow-x:auto}
      .pv-table{width:100%;border-collapse:separate;border-spacing:6px;font-size:14px;font-variant-numeric:tabular-nums}
      .pv-table th{font-size:12px;font-weight:500;color:#9fb0bb;text-align:center;padding:0 4px}
      .pv-table td{background:#2a323d;border-radius:8px;padding:9px 8px;text-align:center;white-space:nowrap}
      .pv-table th[scope=row]{text-align:left;font-size:13px;color:#c7d3da;white-space:nowrap}
      .pv-table tfoot td{background:transparent;color:#d5e5e8;font-weight:600}
      .pv-table .dot{margin-right:6px}
      .loads{display:flex;flex-direction:column;gap:6px}
      .load{all:unset;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto 3.5em;gap:2px 12px;align-items:center;background:#2a323d;border-radius:8px;padding:9px 12px;cursor:pointer;font-size:14px;font-variant-numeric:tabular-nums}
      .load:focus-visible{outline:2px solid #71d3d1}
      .load .name{display:flex;align-items:center;gap:8px;min-width:0}.load .name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .load ha-icon{--mdc-icon-size:18px;color:#b3c0c9;flex:none}
      .load .pct{color:#8f9ea8;font-size:12px;text-align:right}
      .load .bar{grid-column:1/-1;height:4px;border-radius:2px;background:#3a4550;overflow:hidden}.load .bar i{display:block;height:100%;background:#b6d8db}
      .load.other{cursor:default;background:transparent;border:1px dashed #3f4c56}.load.other .bar i{background:#5b6872}
      .home-total{display:flex;justify-content:space-between;align-items:baseline;font-size:14px;color:#b3c0c9}.home-total b{font-size:22px;color:#edf3f6}
      @media(max-width:800px){.layout{grid-template-columns:1fr}}
    </style>
    <ha-card><div class="header"><div><div class="heading">SigenEnergy · My Home</div><div class="sub">Live power flow</div></div><div class="sub" id="stamp"></div></div>
      <div class="layout"><section class="scene"><div class="stage">
        <svg viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" aria-label="Energy flow between equipment">
          <defs>
            <linearGradient id="groundFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa096" stop-opacity=".02"/><stop offset="1" stop-color="#5aa096" stop-opacity=".2"/></linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.5"/></filter>
          </defs>
          <polygon class="ground" points="${GROUND}"/>
          ${ART_BACK.map(image).join('')}
          ${LEADERS.map(d => `<path class="leader" d="${d}"/>`).join('')}
          ${flows}
          ${ART_FRONT.map(image).join('')}
        </svg>
        <div class="node" style="left:${atX(453)};top:${atY(-62)}"><button id="pvButton" title="Show PV string details"><strong id="pv">—</strong><small>SOLAR ›</small></button></div>
        <div class="node" style="left:${atX(822)};top:${atY(-62)}">${this.config.home_entities.length
            ? `<button id="homeButton" title="Show home power usage"><strong id="home">—</strong><small>HOME ›</small></button>`
            : `<strong id="home">—</strong><small>HOME</small>`}</div>
        <div class="node below" style="left:${atX(395)};top:${atY(878)}"><strong id="battery">—</strong><small>SigenStor · <span id="soc">—</span></small><em id="battStatus"></em></div>
        <div class="node below" style="left:${atX(800)};top:${atY(878)}"><strong id="grid">—</strong><small>GRID</small><em id="gridStatus"></em></div>
        <div class="sidecol" id="chargers" style="left:${atX(-300)};top:${atY(190)};min-height:calc(370 * var(--u))">
          <div class="node" id="acNode"><strong id="ac">—</strong><small>AC CHARGER</small><em id="acSoc"></em></div>
          <div class="node" id="dcNode"><button id="dcButton" title="Adjust DC charging power limit"><strong id="dc">—</strong><small>DC CHARGER ⚙</small><em id="dcSoc"></em></button></div>
        </div>
      </div></section><aside class="sidebar">
        <section class="panel"><h3>Today's energy</h3><div class="stats">
          <div class="stat"><small>Solar produced</small><b id="dayPv">—</b></div><div class="stat"><small>Grid imported</small><b id="dayImport">—</b></div>
          <div class="stat"><small>Grid exported</small><b id="dayExport">—</b></div><div class="stat"><small>Battery charged</small><b id="dayCharge">—</b></div>
          <div class="stat"><small>Battery discharged</small><b id="dayDischarge">—</b></div><div class="stat"><small>Battery SOC</small><b id="daySoc">—</b></div>
        </div></section><section class="panel"><h3>Battery level</h3><strong id="socLarge">—</strong><div class="socbar"><div class="socfill" id="socFill"></div></div><div class="muted" id="capacity"></div></section>
      </aside></div>
      <section class="panel chartpanel"><div class="charthead"><h3>Power metrics · Today</h3><span class="muted" id="chartStatus">Loading history…</span></div>
      <div class="legend">${legend}</div>
      <div class="chart-wrap"><svg id="chart"></svg><div class="tip" id="chartTip" hidden></div></div><div class="sun-times"><span id="sunrise">Sunrise —</span><span id="sunset">Sunset —</span></div></section>
    </ha-card>
    <dialog id="pvDialog" aria-labelledby="pvTitle"><div class="dlg">
      <div class="dlg-head"><h2 id="pvTitle">PV Strings</h2><button id="pvClose" title="Close" aria-label="Close">✕</button></div>
      <section class="panel"><h3>PV real time info</h3><div class="pv-wrap"><table class="pv-table">
        <thead><tr><th></th><th>Voltage<br>(V)</th><th>Current<br>(A)</th><th>Power<br>(kW)</th><th>Today<br>(kWh)</th><th>Lifetime<br>(kWh)</th></tr></thead>
        <tbody>${this.config.pv_strings.map((name, i) => `<tr><th scope="row"><i class="dot" style="background:${PV_COLORS[i % PV_COLORS.length]}"></i>${name}</th>${['voltage', 'current', 'power', 'daily_energy', 'accumulated_energy'].map(k => `<td id="pv${i}_${k}">—</td>`).join('')}</tr>`).join('')}</tbody>
        <tfoot><tr><th scope="row">Total</th><td></td><td></td><td id="pvTotal_power">—</td><td id="pvTotal_daily_energy">—</td><td id="pvTotal_accumulated_energy">—</td></tr></tfoot>
      </table></div></section>
      <section class="panel"><div class="charthead"><h3>PV power (kW) · Today</h3><span class="muted" id="pvChartStatus"></span></div>
      <div class="legend">${this.config.pv_strings.map((name, i) => `<span><i class="dot" style="background:${PV_COLORS[i % PV_COLORS.length]}"></i>${name}</span>`).join('')}</div>
      <div class="chart-wrap"><svg id="pvChart"></svg><div class="tip" id="pvChartTip" hidden></div></div></section>
    </div></dialog>
    <dialog id="homeDialog" aria-labelledby="homeTitle"><div class="dlg">
      <div class="dlg-head"><h2 id="homeTitle">Home power usage</h2><button id="homeClose" title="Close" aria-label="Close">✕</button></div>
      <section class="panel"><div class="home-total"><span>Home consumption</span><b id="homeTotal">—</b></div><div class="muted" id="homeMeasured"></div></section>
      <section class="panel"><div class="loads" id="homeLoads"></div></section>
    </div></dialog>`;
        this.root = this.shadowRoot;
        this._flowItems = Object.keys(FLOWS).map(id => {
            const group = this._id(id);
            return { id, group, wire: group.querySelector('.wire'), length: 0, glow: group.querySelector('.glow'), comets: [...group.querySelectorAll('.comet')], pos: 0 };
        });
        const dialog = this._id('pvDialog');
        this._id('pvButton').addEventListener('click', () => {
            dialog.showModal();
            this._updatePv();
            this._loadPvHistory();
        });
        this._id('pvClose').addEventListener('click', () => dialog.close());
        const homeDialog = this._id('homeDialog');
        this._id('homeButton')?.addEventListener('click', () => {
            homeDialog.showModal();
            this._updateHome();
        });
        this._id('homeClose').addEventListener('click', () => homeDialog.close());
        // A modal dialog sits above HA's more-info dialog, so it closes first.
        this._id('homeLoads').addEventListener('click', e => {
            const entityId = e.target.closest('[data-entity]')?.dataset.entity;
            if (!entityId) return;
            homeDialog.close();
            this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId } }));
        });
        for (const d of [dialog, homeDialog]) d.addEventListener('click', e => { if (e.target === d) d.close(); });
        this._observeCharts();
        for (const [chart, tip] of [['chart', 'chartTip'], ['pvChart', 'pvChartTip']]) {
            const svg = this._id(chart), box = this._id(tip);
            const show = e => this._hoverChart(svg, box, e);
            svg.addEventListener('pointermove', show);
            svg.addEventListener('pointerdown', show);
            svg.addEventListener('pointerleave', () => this._hideHover(svg, box));
        }
        this._id('dcButton').addEventListener('click', () => {
            const ev = new CustomEvent('hass-more-info',{
                bubbles: true,
                composed: true,
                detail: {
                    entityId: 'number.sigen_inverter_dc_charger_max_charging_power_limit'
                }
            });
            this.dispatchEvent(ev);
        }
        );
        if (this._flowStates) for (const id of Object.keys(this._flowStates)) this._applyFlowClass(id);
    }
    _observeCharts() {
        if (this._chartObserver) this._chartObserver.disconnect();
        this._chartObserver = new ResizeObserver(entries => {
            for (const entry of entries) (entry.target._redraw ?? entry.target.fit)?.();
        });
        this._chartObserver.observe(this._id('chart'));
        this._chartObserver.observe(this._id('pvChart'));
        const stage = this.root.querySelector('.stage');
        stage.fit = () => this._fitStage(stage);
        this._chartObserver.observe(stage);
        for (const node of stage.querySelectorAll('.below')) {
            node.fit = stage.fit;
            this._chartObserver.observe(node);
        }
    }
    // Labels under the artwork can outgrow the stage at small widths; extend the scene to fit them.
    _fitStage(stage) {
        const bottom = stage.getBoundingClientRect().bottom;
        const overflow = Math.max(0, ...[...stage.querySelectorAll('.below')].map(n => n.getBoundingClientRect().bottom + 10 - bottom));
        stage.style.marginBottom = overflow > 0 ? `${Math.ceil(overflow)}px` : '';
    }
    _id(id) {
        return this.root.getElementById(id)
    }
    _has(id) {
        return !!this._hass?.states[id];
    }
    _num(id) {
        const s = this._hass?.states[id]?.state;
        return s === undefined || s === null || s === '' || ['unknown', 'unavailable', 'none'].includes(String(s).toLowerCase()) ? null : (Number.isFinite(Number(s)) ? Number(s) : null)
    }
    _text(id, v) {
        this._id(id).textContent = v
    }
    // Value in kW or kWh when the entity reports W, Wh, MW or MWh.
    _scaled(id) {
        const v = this._num(id);
        const factor = { W: .001, Wh: .001, MW: 1000, MWh: 1000 }[this._hass?.states[id]?.attributes?.unit_of_measurement] ?? 1;
        return v === null ? null : v * factor;
    }
    _pvEntity(i, key) {
        return `sensor.sigen_inverter_pv${i + 1}_${key}`;
    }
    _updateHome() {
        if (!this._hass || !this._id('homeDialog').open) return;
        const home = this._scaled('sensor.sigen_plant_consumed_power');
        const loads = this.config.home_entities.map(item => {
            const entity = typeof item === 'string' ? item : item.entity;
            const name = (typeof item === 'object' && item.name) || this._hass.states[entity]?.attributes?.friendly_name || entity;
            const icon = (typeof item === 'object' && item.icon) || this._hass.states[entity]?.attributes?.icon || '';
            return { entity, name, icon, kw: this._scaled(entity) };
        }).sort((a, b) => (b.kw ?? -Infinity) - (a.kw ?? -Infinity));
        const measured = loads.reduce((sum, l) => sum + Math.max(0, l.kw ?? 0), 0);
        const scale = Math.max(home ?? 0, measured, .001);
        const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
        const row = (l, other) => {
            const share = l.kw === null ? null : Math.max(0, l.kw) / scale;
            const pct = l.kw === null || home === null || home <= 0 ? '' : `${Math.round(Math.max(0, l.kw) / home * 100)}%`;
            return `<button class="load${other ? ' other' : ''}"${other ? ' tabindex="-1"' : ` data-entity="${esc(l.entity)}" title="${esc(l.entity)}"`}>
              <span class="name">${l.icon ? `<ha-icon icon="${esc(l.icon)}"></ha-icon>` : ''}<span>${esc(l.name)}</span></span><span>${l.kw === null ? '—' : `${l.kw.toFixed(2)} kW`}</span><span class="pct">${pct}</span>
              <span class="bar"><i style="width:${share === null ? 0 : (share * 100).toFixed(1)}%"></i></span></button>`;
        };
        const other = home === null ? null : home - measured;
        const drawing = loads.filter(l => l.kw !== null && l.kw >= .005);
        this._id('homeLoads').innerHTML = (drawing.length ? drawing.map(l => row(l)).join('') : '<div class="muted">No listed load is drawing power</div>')
            + (other !== null && other >= .005 ? row({ name: 'Other (unmeasured)', kw: other }, true) : '');
        this._text('homeTotal', this._power(home));
        this._text('homeMeasured', home === null || home <= 0 ? '' : `Measured ${measured.toFixed(2)} kW · ${Math.round(Math.min(measured / home, 1) * 100)}% of home consumption`);
    }
    _updatePv() {
        if (!this._hass || !this._id('pvDialog').open) return;
        const digits = { voltage: 1, current: 2, power: 2, daily_energy: 2, accumulated_energy: 2 };
        const totals = { power: null, daily_energy: null, accumulated_energy: null };
        this.config.pv_strings.forEach((_, i) => {
            for (const key of Object.keys(digits)) {
                const v = key === 'voltage' || key === 'current' ? this._num(this._pvEntity(i, key)) : this._scaled(this._pvEntity(i, key));
                this._text(`pv${i}_${key}`, v === null ? '—' : v.toFixed(digits[key]));
                if (key in totals && v !== null) totals[key] = (totals[key] ?? 0) + v;
            }
        });
        for (const [key, v] of Object.entries(totals)) this._text(`pvTotal_${key}`, v === null ? '—' : v.toFixed(2));
    }
    async _loadPvHistory() {
        if (!this._hass) return;
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        const ids = this.config.pv_strings.map((_, i) => this._pvEntity(i, 'power'));
        this._text('pvChartStatus', 'Loading history…');
        try {
            const query = `history/period/${encodeURIComponent(day.toISOString())}?filter_entity_id=${encodeURIComponent(ids.join(','))}&minimal_response&no_attributes`;
            const series = this._series(await this._hass.callApi('GET', query), ids).map((points, i) => {
                const factor = { W: .001, MW: 1000 }[this._hass.states[ids[i]]?.attributes?.unit_of_measurement] ?? 1;
                return { points: points.map(p => ({ t: p.t, v: p.v * factor })), color: PV_COLORS[i % PV_COLORS.length], name: this.config.pv_strings[i] };
            });
            const hasData = this._showChart(this._id('pvChart'), series, day.getTime(), false);
            this._text('pvChartStatus', hasData ? 'Midnight → now' : 'No recorded string history today');
        } catch (e) {
            this._text('pvChartStatus', 'Recorder history unavailable');
            this._id('pvChart').replaceChildren();
        }
    }
    _power(v) {
        return v === null ? '—' : `${Math.abs(v).toFixed(2)} kW`
    }
    _energy(v) {
        return v === null ? '—' : `${v.toFixed(2)} kWh`
    }
    // Positive power runs from the start of the flow's path to its end.
    _flow(id, power) {
        if (!this._flowStates) this._flowStates = {};
        this._flowStates[id] = { active: power !== null && Math.abs(power) >= .025, reverse: power !== null && power < 0, kw: power === null ? 0 : Math.abs(power) };
        this._applyFlowClass(id);
    }
    _applyFlowClass(id) {
        const group = this._id(id);
        if (!group) return;
        group.classList.toggle('active', !!this._flowStates[id].active);
        group.classList.toggle('moving', !matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
    connectedCallback() {
        if (!this.root) return;
        if (!this._chartObserver) this._observeCharts();
        if (!this._flowFrame) this._startFlowAnimation();
    }
    _startFlowAnimation() {
        if (this._flowFrame) cancelAnimationFrame(this._flowFrame);
        let previousFrame = null;
        const draw = (now) => {
            if (!this.isConnected) {
                this._flowFrame = null;
                return;
            }
            const dt = previousFrame === null ? 0 : Math.min(now - previousFrame, 100) / 1000;
            previousFrame = now;
            for (const item of this._flowItems) {
                const state = this._flowStates?.[item.id];
                if (!state?.active) continue;
                item.length ||= item.wire.getTotalLength();
                const comet = Math.min(240, item.length * .7);
                const span = item.length + comet;
                item.pos = (item.pos + dt * (60 + 35 * Math.sqrt(state.kw))) % span;
                const travelled = item.pos - comet / 2;
                const centre = state.reverse ? item.length - travelled : travelled;
                const gap = item.length + 2 * comet;
                const place = (el, dash) => {
                    el.setAttribute('stroke-dasharray', `${dash} ${gap}`);
                    el.setAttribute('stroke-dashoffset', `${dash / 2 - centre}`);
                };
                place(item.glow, comet * .6);
                item.comets.forEach((el, i) => place(el, comet * COMET_LAYERS[i]));
            }
            this._flowFrame = requestAnimationFrame(draw);
        };
        this._flowFrame = requestAnimationFrame(draw);
    }
    disconnectedCallback() {
        if (this._chartObserver) { this._chartObserver.disconnect(); this._chartObserver = null; }
        if (this._flowFrame) cancelAnimationFrame(this._flowFrame);
        this._flowFrame = null;
    }
    _update() {
        if (!this._hass)
            return;
        const n = x => this._num(x)
          , pv = n('sensor.sigen_plant_pv_power')
          , home = n('sensor.sigen_plant_consumed_power');
        const bat = n('sensor.sigen_inverter_battery_power') ?? n('sensor.sigen_plant_battery_power');
        const soc = n('sensor.sigen_inverter_battery_state_of_charge') ?? n('sensor.sigen_plant_battery_state_of_charge');
        const imp = n('sensor.sigen_plant_grid_import_power')
          , exp = n('sensor.sigen_plant_grid_export_power');
        const ac = n(AC_POWER)
          , dc = n(DC_POWER);
        const hasAc = this._has(AC_POWER), hasDc = this._has(DC_POWER);
        this._id('acNode').hidden = !hasAc;
        this._id('dcNode').hidden = !hasDc;
        this._id('chargers').hidden = !hasAc && !hasDc;
        this._id('acArt').setAttribute('display', hasAc ? 'inline' : 'none');
        this._id('legendAC').hidden = !hasAc;
        this._id('legendDC').hidden = !hasDc;
        const grid = imp !== null && imp > 0 ? imp : exp !== null && exp > 0 ? -exp : imp ?? (exp === null ? null : -exp);
        this._text('pv', this._power(pv));
        this._text('home', this._power(home));
        this._text('battery', this._power(bat));
        this._text('soc', soc === null ? '—' : `${soc.toFixed(0)}%`);
        this._text('battStatus', bat === null ? '' : bat > 0.025 ? 'Charging' : bat < -.025 ? 'Discharging' : 'Idle');
        this._text('grid', this._power(grid));
        this._text('gridStatus', grid === null ? '' : grid > 0.025 ? 'Importing' : grid < -.025 ? 'Exporting' : 'Idle');
        this._text('ac', this._power(ac));
        this._text('dc', this._power(dc));
        const car = this.config.ac_charger_soc ? n(this.config.ac_charger_soc) : null
          , range = this.config.ac_charger_range ? n(this.config.ac_charger_range) : null
          , dcsoc = n('sensor.sigen_inverter_dc_charger_vehicle_soc');
        const acState = this._hass.states['sensor.sigen_ac_charger_system_state']?.state?.split('-')[0];
        const carText = !this.config.ac_charger_soc ? '' : car === null ? 'Vehicle SOC unavailable' : `${car.toFixed(0)}%${range === null ? '' : ` · ${range.toFixed(0)} km`}`;
        this._text('acSoc', [acState && !['unknown', 'unavailable'].includes(acState) ? acState : '', carText].filter(Boolean).join(' · '));
        // The inverter reports 0% with no DC vehicle attached; a genuine 0% while charging is still shown.
        this._text('dcSoc', dcsoc === null || (dcsoc === 0 && (dc === null || dc < 0.025)) ? '' : `Vehicle SOC ${dcsoc.toFixed(0)}%`);
        this._text('dayPv', this._energy(n('sensor.sigen_inverter_daily_pv_energy')));
        this._text('dayImport', this._energy(n('sensor.sigen_plant_daily_grid_import_energy')));
        this._text('dayExport', this._energy(n('sensor.sigen_plant_daily_grid_export_energy')));
        this._text('dayCharge', this._energy(n('sensor.sigen_inverter_daily_charge_energy')));
        this._text('dayDischarge', this._energy(n('sensor.sigen_inverter_daily_discharge_energy')));
        this._text('daySoc', soc === null ? '—' : `${soc.toFixed(0)}%`);
        this._text('socLarge', soc === null ? '—' : `${soc.toFixed(0)}%`);
        this._id('socFill').style.width = `${Math.min(100, Math.max(0, soc ?? 0))}%`;
        const cap = n('sensor.sigen_plant_rated_energy_capacity');
        this._text('capacity', cap === null ? '' : `${((soc ?? 0) * cap / 100).toFixed(1)} of ${cap.toFixed(1)} kWh`);
        // SigenStor's AC output: solar less battery charging (positive battery power) less DC charging.
        const inverter = pv !== null && bat !== null ? pv - bat - (dc ?? 0) : home !== null && grid !== null ? home - grid : null;
        this._flow('solarFlow', pv);
        this._flow('inverterFlow', inverter);
        this._flow('homeFlow', home);
        this._flow('gridFlow', grid === null ? null : -grid);
        this._updatePv();
        this._updateHome();
        this._text('stamp', new Date().toLocaleTimeString());
    }
    _updateSunTimes() {
        // Calculate sunrise and sunset for *today* from Home Assistant's location.
        // sun.sun next_rising / next_setting refer to tomorrow after today's event.
        const lat = Number(this._hass?.config?.latitude);
        const lon = Number(this._hass?.config?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            this._text('sunrise', 'Sunrise —');
            this._text('sunset', 'Sunset —');
            return;
        }
        // SunCalc solar equations, evaluated at local noon for the selected day.
        const now = new Date();
        const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
        const rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545;
        const toJulian = d => d.valueOf() / dayMs - .5 + J1970;
        const fromJulian = j => new Date((j + .5 - J1970) * dayMs);
        const lw = -lon * rad, phi = lat * rad;
        const d = toJulian(noon) - J2000;
        const n = Math.round(d - .0009 - lw / (2 * Math.PI));
        const ds = .0009 + lw / (2 * Math.PI) + n;
        const M = rad * (357.5291 + .98560028 * ds);
        const C = rad * (1.9148 * Math.sin(M) + .02 * Math.sin(2 * M) + .0003 * Math.sin(3 * M));
        const L = M + C + rad * 102.9372 + Math.PI;
        const dec = Math.asin(Math.sin(L) * Math.sin(rad * 23.4397));
        const Jnoon = J2000 + ds + .0053 * Math.sin(M) - .0069 * Math.sin(2 * L);
        const cosH = (Math.sin(-.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
        if (cosH < -1 || cosH > 1) {
            this._text('sunrise', 'Sunrise —');
            this._text('sunset', 'Sunset —');
            return;
        }
        const h = Math.acos(cosH);
        const Jset = J2000 + (.0009 + (h + lw) / (2 * Math.PI) + n) + .0053 * Math.sin(M) - .0069 * Math.sin(2 * L);
        const Jrise = Jnoon - (Jset - Jnoon);
        const fmt = t => t.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        this._text('sunrise', `Sunrise ${fmt(fromJulian(Jrise))}`);
        this._text('sunset', `Sunset ${fmt(fromJulian(Jset))}`);
    }
    async _loadHistory() {
        if (!this._hass || this._loading)
            return;
        this._loading = true;
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        const specs = CHART_SERIES.filter(s => this._has(s.id) || (s.id !== AC_POWER && s.id !== DC_POWER));
        const ids = specs.map(s => s.id);
        try {
            const query = `history/period/${encodeURIComponent(day.toISOString())}?filter_entity_id=${encodeURIComponent(ids.join(','))}&minimal_response&no_attributes`;
            const response = await this._hass.callApi('GET', query);
            this._renderChart(response, specs, day.getTime());
            this._text('chartStatus', 'Midnight → now');
        } catch (e) {
            this._text('chartStatus', 'Recorder history unavailable');
            this._id('chart').replaceChildren();
        } finally {
            this._loading = false;
        }
    }
    _series(data, ids) {
        const rows = new Map((data || []).filter(a => a?.length).map(a => [a[0].entity_id, a]));
        return ids.map(id => (rows.get(id) || []).map(s => ({
            t: Date.parse(s.last_changed || s.last_updated),
            v: Number(s.state)
        })).filter(p => Number.isFinite(p.t) && Number.isFinite(p.v)));
    }
    _renderChart(data, specs, start) {
        const notes = {
            Battery: v => v > .005 ? 'charging' : v < -.005 ? 'discharging' : '',
            Grid: v => v > .005 ? 'import' : v < -.005 ? 'export' : '',
        };
        const series = this._series(data, specs.map(s => s.id)).map((points, i) => ({
            points: specs[i].negate ? points.map(p => ({ t: p.t, v: -p.v })) : points,
            color: specs[i].color,
            name: specs[i].name,
            note: notes[specs[i].name]
        }));
        if (!this._showChart(this._id('chart'), series, start, true))
            this._text('chartStatus', 'No recorded power history today');
    }
    // Draws now and again whenever the chart is resized; returns whether any series has data.
    _showChart(svg, series, start, signed) {
        svg._redraw = () => this._plot(svg, series, start, signed);
        svg._redraw();
        return series.some(s => s.points.length > 1);
    }
    _plot(svg, series, start, signed) {
        const end = Date.now();
        const width = Math.max(240, svg.clientWidth || 900), height = 170;
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.replaceChildren();
        const ns = 'http://www.w3.org/2000/svg';
        const add = (tag, attrs, text) => {
            const el = document.createElementNS(ns, tag);
            for (const [k, v] of Object.entries(attrs))
                el.setAttribute(k, v);
            if (text !== undefined)
                el.textContent = text;
            svg.append(el);
            return el;
        };
        const values = series.flatMap(s => s.points.map(p => Math.abs(p.v)));
        const max = signed ? Math.max(1, ...values) : Math.max(1, Math.ceil(Math.max(0, ...values)));
        const left = 38, right = width - 12;
        const x = t => left + (right - left) * (t - start) / Math.max(1, end - start);
        const y = signed ? v => 78 - 65 * v / max : v => 143 - 130 * v / max;
        for (const v of signed ? [-max, 0, max] : [0, max / 2, max]) {
            add('line', { x1: left, y1: y(v), x2: right, y2: y(v), stroke: '#43505a', 'stroke-dasharray': '3 5' });
            add('text', { x: 2, y: y(v) + 4, fill: '#a5b3bf', 'font-size': 10 }, v.toFixed(!signed && max < 10 && v % 1 ? 1 : 0));
        }
        for (let h = 0; h <= 24; h += 4) {
            const t = start + h * 3600000;
            if (t > end)
                break;
            add('text', { x: x(t), y: 162, fill: '#a5b3bf', 'font-size': 10, 'text-anchor': 'middle' }, `${String(h).padStart(2, '0')}:00`);
        }
        for (const { points, color } of series) {
            if (points.length < 2)
                continue;
            const d = points.map((p, j) => `${j ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
            add('path', { d, fill: 'none', stroke: color, 'stroke-width': 1.7, 'stroke-linejoin': 'round' });
        }
        const cursor = add('g', { display: 'none' });
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('stroke', '#9fb0bb');
        line.setAttribute('stroke-dasharray', '2 3');
        cursor.append(line);
        const dots = series.map(({ color }) => {
            const dot = document.createElementNS(ns, 'circle');
            dot.setAttribute('r', 3.5);
            dot.setAttribute('fill', color);
            dot.setAttribute('stroke', '#11191d');
            dot.setAttribute('stroke-width', 1.5);
            cursor.append(dot);
            return dot;
        });
        svg._chart = { series, start, end, width, left, right, x, y, top: y(max), bottom: y(signed ? -max : 0), cursor, line, dots };
        if (svg._lastHover !== undefined) this._hoverAt(svg, svg._tip, svg._lastHover);
    }
    // Linear interpolation between recorded states, matching the drawn line.
    _valueAt(points, t) {
        if (!points.length || t < points[0].t) return null;
        let lo = 0, hi = points.length - 1;
        if (t >= points[hi].t) return points[hi].v;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (points[mid].t <= t) lo = mid; else hi = mid;
        }
        const a = points[lo], b = points[hi];
        return a.v + (b.v - a.v) * (t - a.t) / Math.max(1, b.t - a.t);
    }
    _hoverChart(svg, tip, e) {
        const chart = svg._chart;
        if (!chart) return;
        const rect = svg.getBoundingClientRect();
        const ux = (e.clientX - rect.left) * chart.width / rect.width;
        if (ux < chart.left || ux > chart.right) return this._hideHover(svg, tip);
        svg._tip = tip;
        svg._lastHover = chart.start + (ux - chart.left) / (chart.right - chart.left) * (chart.end - chart.start);
        this._hoverAt(svg, tip, svg._lastHover);
    }
    _hoverAt(svg, tip, t) {
        const chart = svg._chart;
        const px = chart.x(t);
        chart.line.setAttribute('x1', px);
        chart.line.setAttribute('x2', px);
        chart.line.setAttribute('y1', chart.top);
        chart.line.setAttribute('y2', chart.bottom);
        const rows = new Map();
        chart.series.forEach((s, i) => {
            const v = this._valueAt(s.points, t);
            chart.dots[i].setAttribute('display', v === null ? 'none' : 'inline');
            if (v === null) return;
            chart.dots[i].setAttribute('cx', px);
            chart.dots[i].setAttribute('cy', chart.y(v));
            const row = rows.get(s.name) ?? { ...s, v: 0 };
            row.v += v;
            rows.set(s.name, row);
        });
        chart.cursor.setAttribute('display', 'inline');
        const time = new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const html = [...rows.values()].map(r => {
            const note = r.note?.(r.v);
            return `<div><i class="dot" style="background:${r.color}"></i>${r.name}${note ? ` <em>${note}</em>` : ''}<span>${Math.abs(r.v).toFixed(2)} kW</span></div>`;
        }).join('');
        tip.innerHTML = `<b>${time}</b>${html || '<em>No data</em>'}`;
        tip.hidden = false;
        const scale = svg.getBoundingClientRect().width / chart.width;
        const cssX = px * scale;
        const fitsRight = cssX + 14 + tip.offsetWidth <= svg.clientWidth;
        tip.style.left = `${fitsRight ? cssX + 14 : Math.max(0, cssX - 14 - tip.offsetWidth)}px`;
    }
    _hideHover(svg, tip) {
        svg._lastHover = undefined;
        tip.hidden = true;
        if (svg._chart) svg._chart.cursor.setAttribute('display', 'none');
    }
}
if (!customElements.get('sigenergy-flow-card'))
    customElements.define('sigenergy-flow-card', SigenergyFlowCard);
window.customCards = window.customCards || [];
window.customCards.push({
    type: 'sigenergy-flow-card',
    name: 'Sigenergy Flow Card',
    description: 'Animated Sigenergy power-flow dashboard'
});
