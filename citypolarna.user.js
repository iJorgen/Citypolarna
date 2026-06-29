// ==UserScript==
// @name         Citypolarna - Optimized
// @namespace    https://citypolarna.se
// @version      1.0
// @description  Grupperar "Mina aktiviteter" + färgmarkerar plus/open/private + OLED-black + separata mobilfärger
// @author       Jörgen
// @match        https://www.citypolarna.se/*
// @updateURL    https://raw.githubusercontent.com/iJorgen/Citypolarna/refs/heads/main/citypolarna.user.js
// @downloadURL  https://raw.githubusercontent.com/iJorgen/Citypolarna/refs/heads/main/citypolarna.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ── Färgtabell Desktop — justera fritt ──────────────────────────────────
  const colorsDesktop = {
    plus: {
      anmald:      { bg: '#2e157a', left: '#2e157a', date: '#222222' },
      reserv:      { bg: '#2e157a', left: '#2e157a', date: '#222222' },
      intresserad: { bg: '#2e157a', left: '#2e157a', date: '#222222' },
      default:     { bg: '#2e157a', left: '#2e157a', date: '#222222' },
    },
    open: {
      anmald:      { bg: '#084408', left: '#084408', date: '#222222' },
      reserv:      { bg: '#084408', left: '#084408', date: '#222222' },
      intresserad: { bg: '#084408', left: '#084408', date: '#222222' },
      default:     { bg: '#084408', left: '#084408', date: '#222222' },
    },
    private: {
      anmald:      { bg: '#770808', left: '#770808', date: '#222222' },
      reserv:      { bg: '#770808', left: '#770808', date: '#222222' },
      intresserad: { bg: '#770808', left: '#770808', date: '#222222' },
      default:     { bg: '#770808', left: '#770808', date: '#222222' },
    },
  };

  // ── Färgtabell Mobil — justera fritt ────────────────────────────────────
  const colorsMobile = {
    plus: {
      anmald:      { bg: '#2e157a', left: '#2e157a', date: '#2e157a' },
      reserv:      { bg: '#2e157a', left: '#2e157a', date: '#2e157a' },
      intresserad: { bg: '#2e157a', left: '#2e157a', date: '#2e157a' },
      default:     { bg: '#2e157a', left: '#2e157a', date: '#2e157a' },
    },
    open: {
      anmald:      { bg: '#084408', left: '#084408', date: '#084408' },
      reserv:      { bg: '#084408', left: '#084408', date: '#084408' },
      intresserad: { bg: '#084408', left: '#084408', date: '#084408' },
      default:     { bg: '#084408', left: '#084408', date: '#084408' },
    },
    private: {
      anmald:      { bg: '#770808', left: '#770808', date: '#770808' },
      reserv:      { bg: '#770808', left: '#770808', date: '#770808' },
      intresserad: { bg: '#770808', left: '#770808', date: '#770808' },
      default:     { bg: '#770808', left: '#770808', date: '#770808' },
    },
  };

  // ── OLED-black — justera fritt ───────────────────────────────────────────
  const oled = {
    bgReplace:   ['rgb(17, 17, 17)'],
    textReplace: ['rgb(221, 221, 221)', 'rgb(247, 247, 247)', 'rgb(250, 250, 250)'],
  };

  const DATE_CLASSES = [
    'event_row__primary_date',
    'event_row__secondary_date',
    'row__date_filler',
    'event_row__date',
  ];

  // ── Klassificera en rad baserat på SVG-id ────────────────────────────────
  function classifyRow(row) {
    const svgId = row.querySelector('td.event_row__status svg')?.id ?? '';
    if (svgId === 'icon_coming') return 'anmald';
    if (svgId === 'icon_reserv') return 'reserv';
    if (svgId === 'icon_unbooked') return 'intresserad';
    return 'default';
  }

  // ── Välj palett baserat på aktivitetstyp och desktop/mobil ───────────────
  function getPalette(table, cat, isMobile) {
    const scheme = isMobile ? colorsMobile : colorsDesktop;
    if (table.classList.contains('plus_event')) return scheme.plus[cat];
    if (table.classList.contains('private')) return scheme.private[cat];
    return scheme.open[cat];
  }

  // ── Färglägg en enskild tabell med given färguppsättning ─────────────────
  function colorRow(table, c) {
    table.style.setProperty('background-color', c.bg, 'important');
    table.querySelectorAll('tr').forEach(tr =>
      tr.style.setProperty('background-color', c.bg, 'important'));

    table.querySelectorAll('td').forEach(td => {
      if (td.classList.contains('row__left_bar') ||
          td.classList.contains('row__right_bar')) {
        td.style.setProperty('background-color', c.left, 'important');
      } else if (DATE_CLASSES.some(cls => td.classList.contains(cls))) {
        td.style.setProperty('background-color', c.date, 'important');
      } else {
        td.style.setProperty('background-color', c.bg, 'important');
      }
    });

    // Fixa barn-element med computed lila bakgrund (t.ex. a.nolink)
    table.querySelectorAll('*').forEach(el => {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg === 'rgb(151, 132, 223)' || bg === 'rgb(111, 86, 209)') {
        el.style.setProperty('background-color', c.bg, 'important');
      }
    });
  }

  // ── Färglägg alla tabeller i en rad (desktop + mobile med rätt palett) ───
  function colorRowTables(row, cat) {
    const tables = row.querySelectorAll('table.event_row_table');
    if (!tables.length) return;

    // plus_event/private-klass sitter alltid på desktop-tabellen (index 0)
    const typeTable = tables[0];

    tables.forEach(table => {
      const isMobile = table.classList.contains('mobile');
      const palette = getPalette(typeTable, cat, isMobile);
      colorRow(table, palette);
    });
  }

  // ── Färglägg alla rader i en wrapper (ingen gruppering) ──────────────────
  function colorSection(wrapperEl) {
    const rows = wrapperEl.querySelectorAll('div.event_row_table');
    for (const row of rows) {
      const cat = classifyRow(row);
      colorRowTables(row, cat);
    }
  }

  // ── Skapa sektionsrubrik ─────────────────────────────────────────────────
  function makeSectionHeader(text, color) {
    const h = document.createElement('div');
    h.style.cssText = `
      font-size: 1.1em;
      font-weight: bold;
      padding: 8px 12px;
      margin: 12px 0 4px 0;
      background: ${color};
      border-radius: 6px;
      color: #fff;
    `;
    h.textContent = text;
    return h;
  }

  // ── Gruppera + färglägg "Mina aktiviteter" ───────────────────────────────
  function groupAndColor(wrapperDiv) {
    const rows = [...wrapperDiv.querySelectorAll(':scope > div.event_row_table')];
    if (!rows.length) return;

    const groups = { anmald: [], reserv: [], intresserad: [] };

    for (const row of rows) {
      const cat = classifyRow(row);
      if (cat === 'default') continue;
      groups[cat].push(row);
    }

    // Färglägg
    for (const [cat, rowList] of Object.entries(groups)) {
      for (const row of rowList) {
        colorRowTables(row, cat);
      }
    }

    // Bygg om DOM med sektionsrubriker
    wrapperDiv.innerHTML = '';

    const sections = [
      { key: 'anmald', label: '✅ Anmäld', color: '#2a7a2a' },
      { key: 'reserv', label: '🟡 Reserv', color: '#b07800' },
      { key: 'intresserad', label: '👁 Intresserad', color: '#aa0000' },
    ];

    for (const { key, label, color } of sections) {
      if (groups[key].length === 0) continue;
      wrapperDiv.appendChild(makeSectionHeader(`${label} (${groups[key].length})`, color));
      for (const row of groups[key]) {
        wrapperDiv.appendChild(row);
      }
    }
  }

  // ── Hitta wrapper för en given sektion ───────────────────────────────────
  function findWrapper(sectionDivId, eventListId) {
    if (eventListId) {
      const el = document.querySelector(`#${eventListId}`);
      if (el) return el;
    }
    const outer = document.querySelector(`#${sectionDivId}`);
    if (!outer) return null;
    return outer.querySelector('.calendar_list_box > div')
      ?? outer.querySelector('.weekview')
      ?? null;
  }

  // ── OLED-black: ersätt nästan-svart bakgrund och nästan-vit text ─────────
  function applyOled() {
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (oled.bgReplace.includes(cs.backgroundColor)) {
        el.style.setProperty('background-color', '#000000', 'important');
      }
      if (oled.textReplace.includes(cs.color)) {
        el.style.setProperty('color', '#ffffff', 'important');
      }
    });
  }

  // ── Huvudfunktion ────────────────────────────────────────────────────────
  function run() {
    const minaWrapper = findWrapper('calendar_list_my', 'my_event_list');
    if (minaWrapper) groupAndColor(minaWrapper);

    const invWrapper = findWrapper('calendar_list_my_invitations', null);
    if (invWrapper) colorSection(invWrapper);

    const newWrapper = findWrapper('calendar_list_new', 'new_event_list');
    if (newWrapper) colorSection(newWrapper);

    const weekWrapper = findWrapper('calendar_list_week', null);
    if (weekWrapper) colorSection(weekWrapper);

    applyOled();
  }

  // ── Deterministisk trigger — väntar på att sidans JS satt typ-klasserna ──
  //
  // Sidans JS sätter open/plus_event/private på table.event_row_table
  // som sista steg. Vi observerar tills minst EN sådan tabell finns,
  // kör sedan i en microtask (Promise.resolve) för att säkerställa att
  // hela mutations-batchen är processad — ingen fast setTimeout-gissning.

  function isReady() {
    const wrapper = document.querySelector('#my_event_list');
    if (!wrapper) return false;
    return wrapper.querySelector(
      'table.event_row_table.open, ' +
      'table.event_row_table.plus_event, ' +
      'table.event_row_table.private'
    ) !== null;
  }

  let triggered = false;

  function tryRun() {
    if (triggered) return;
    if (!isReady()) return;
    triggered = true;
    observer.disconnect();
    // Microtask: kör efter att hela mutations-batchen är klar
    Promise.resolve().then(run);
  }

  const observer = new MutationObserver(tryRun);

  observer.observe(document.body, {
    childList:       true,
    subtree:         true,
    attributes:      true,
    attributeFilter: ['class'],
  });

  // Fallback: om sidan redan var redo när skriptet laddades
  tryRun();

})();
