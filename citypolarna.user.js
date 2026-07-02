// ==UserScript==
// @name         Citypolarna - Optimized
// @namespace    https://citypolarna.se
// @version      1.3
// @description  Grupperar "Mina aktiviteter" + färgmarkerar plus/open/private/tips/draft + OLED-black + separata mobilfärger + grupperingstoggle
// @author       Jörgen
// @match        https://www.citypolarna.se/*
// @updateURL    https://raw.githubusercontent.com/iJorgen/Citypolarna/refs/heads/main/citypolarna.user.js
// @downloadURL  https://raw.githubusercontent.com/iJorgen/Citypolarna/refs/heads/main/citypolarna.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ── OLED-tröskelvärden — justera fritt ──────────────────────────────────
  const OLED_WHITE_THRESHOLD = 180;
  const OLED_BLACK_THRESHOLD = 30;

  // ── Persisterat tillstånd för gruppering ─────────────────────────────────
  const STORAGE_KEY = 'citypolarna_grouping';
  let groupingEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';

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
    tips: {
      anmald:      { bg: '#5a3e00', left: '#5a3e00', date: '#222222' },
      reserv:      { bg: '#5a3e00', left: '#5a3e00', date: '#222222' },
      intresserad: { bg: '#5a3e00', left: '#5a3e00', date: '#222222' },
      default:     { bg: '#5a3e00', left: '#5a3e00', date: '#222222' },
    },
    draft: {
      anmald:      { bg: '#2e2e2e', left: '#2e2e2e', date: '#222222' },
      reserv:      { bg: '#2e2e2e', left: '#2e2e2e', date: '#222222' },
      intresserad: { bg: '#2e2e2e', left: '#2e2e2e', date: '#222222' },
      default:     { bg: '#2e2e2e', left: '#2e2e2e', date: '#222222' },
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
      anmald:      { bg: '#115511', left: '#115511', date: '#115511' },
      reserv:      { bg: '#115511', left: '#115511', date: '#115511' },
      intresserad: { bg: '#115511', left: '#115511', date: '#115511' },
      default:     { bg: '#115511', left: '#115511', date: '#115511' },
    },
    private: {
      anmald:      { bg: '#771111', left: '#771111', date: '#771111' },
      reserv:      { bg: '#771111', left: '#771111', date: '#771111' },
      intresserad: { bg: '#771111', left: '#771111', date: '#771111' },
      default:     { bg: '#771111', left: '#771111', date: '#771111' },
    },
    tips: {
      anmald:      { bg: '#5a3e00', left: '#5a3e00', date: '#5a3e00' },
      reserv:      { bg: '#5a3e00', left: '#5a3e00', date: '#5a3e00' },
      intresserad: { bg: '#5a3e00', left: '#5a3e00', date: '#5a3e00' },
      default:     { bg: '#5a3e00', left: '#5a3e00', date: '#5a3e00' },
    },
    draft: {
      anmald:      { bg: '#2e2e2e', left: '#2e2e2e', date: '#2e2e2e' },
      reserv:      { bg: '#2e2e2e', left: '#2e2e2e', date: '#2e2e2e' },
      intresserad: { bg: '#2e2e2e', left: '#2e2e2e', date: '#2e2e2e' },
      default:     { bg: '#2e2e2e', left: '#2e2e2e', date: '#2e2e2e' },
    },
  };

  const DATE_CLASSES = [
    'event_row__primary_date',
    'event_row__secondary_date',
    'row__date_filler',
    'event_row__date',
  ];

  // ── Spara originalordningen innan vi rör DOM ──────────────────────────────
  let savedOriginalRows = null;

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
    if (table.classList.contains('tips_event')) return scheme.tips[cat];
    if (table.classList.contains('draft')) return scheme.draft[cat];
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
    // row = wrapper-<div> som har ALLA typ-klasser (plus_event, draft, tips_event osv.)
    // De inre <table>-elementen saknar tips_event/draft — läs därför alltid från diven
    const tables = row.querySelectorAll('table.event_row_table');
    if (!tables.length) return;

    tables.forEach(table => {
      const isMobile = table.classList.contains('mobile');
      const palette = getPalette(row, cat, isMobile); // <-- row istället för tables[0]
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
    h.dataset.groupHeader = '1';
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
  function applyGrouped(wrapperDiv) {
    const rows = [...wrapperDiv.querySelectorAll(':scope > div.event_row_table')];
    if (!rows.length) return;

    if (!savedOriginalRows) {
      savedOriginalRows = rows.slice();
    }

    const groups = { anmald: [], reserv: [], intresserad: [], default: [] };

    for (const row of rows) {
      const cat = classifyRow(row);
      groups[cat].push(row);
    }

    for (const [cat, rowList] of Object.entries(groups)) {
      for (const row of rowList) colorRowTables(row, cat);
    }

    wrapperDiv.innerHTML = '';

    const sections = [
      { key: 'anmald', label: '✅ Anmäld', color: '#2a7a2a' },
      { key: 'reserv', label: '🟡 Reserv', color: '#b07800' },
      { key: 'intresserad', label: '👁 Intresserad', color: '#aa0000' },
    ];

    for (const { key, label, color } of sections) {
      if (groups[key].length === 0) continue;
      wrapperDiv.appendChild(makeSectionHeader(`${label} (${groups[key].length})`, color));
      for (const row of groups[key]) wrapperDiv.appendChild(row);
    }

    for (const row of groups.default) wrapperDiv.appendChild(row);
  }

  // ── Återställ originalordning + färglägg utan gruppering ─────────────────
  function applyUngrouped(wrapperDiv) {
    wrapperDiv.querySelectorAll('[data-group-header]').forEach(h => h.remove());

    if (savedOriginalRows) {
      savedOriginalRows.forEach(row => wrapperDiv.appendChild(row));
    }

    colorSection(wrapperDiv);
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

  // ── OLED-black ───────────────────────────────────────────────────────────
  function isNearlyWhite(rgb) {
    const m = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!m) return false;
    return parseInt(m[1]) >= OLED_WHITE_THRESHOLD &&
           parseInt(m[2]) >= OLED_WHITE_THRESHOLD &&
           parseInt(m[3]) >= OLED_WHITE_THRESHOLD;
  }

  function isNearlyBlack(rgb) {
    const m = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!m) return false;
    return parseInt(m[1]) <= OLED_BLACK_THRESHOLD &&
           parseInt(m[2]) <= OLED_BLACK_THRESHOLD &&
           parseInt(m[3]) <= OLED_BLACK_THRESHOLD;
  }

  function applyOled(root = document) {
    root.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (isNearlyBlack(cs.backgroundColor)) {
        el.style.setProperty('background-color', '#000000', 'important');
      }
      if (isNearlyWhite(cs.color)) {
        el.style.setProperty('color', '#ffffff', 'important');
      }
    });
  }

  // ── Observera dynamiskt injicerat innehåll och applicera OLED direkt ─────
  let oledObserver = null;

  function applyOledToNode(node) {
    if (node.nodeType !== 1) return;
    const cs = getComputedStyle(node);
    if (isNearlyBlack(cs.backgroundColor)) {
      node.style.setProperty('background-color', '#000000', 'important');
    }
    if (isNearlyWhite(cs.color)) {
      node.style.setProperty('color', '#ffffff', 'important');
    }
    node.querySelectorAll('*').forEach(el => {
      const s = getComputedStyle(el);
      if (isNearlyBlack(s.backgroundColor)) {
        el.style.setProperty('background-color', '#000000', 'important');
      }
      if (isNearlyWhite(s.color)) {
        el.style.setProperty('color', '#ffffff', 'important');
      }
    });
  }

  function observeOled() {
    if (oledObserver) return;

    oledObserver = new MutationObserver(mutations => {
      const added = new Set();
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) added.add(node);
        }
        if (mutation.type === 'attributes' && mutation.target.nodeType === 1) {
          added.add(mutation.target);
        }
      }
      if (added.size === 0) return;
      Promise.resolve().then(() => {
        added.forEach(applyOledToNode);
      });
    });

    oledObserver.observe(document.body, {
      childList:       true,
      subtree:         true,
      attributes:      true,
      attributeFilter: ['style', 'class'],
    });
  }

  // ── Applicera rätt läge på "Mina aktiviteter"-wrappern ───────────────────
  function applyMinaWrapper() {
    const minaWrapper = findWrapper('calendar_list_my', 'my_event_list');
    if (!minaWrapper) return;
    if (groupingEnabled) {
      applyGrouped(minaWrapper);
    } else {
      applyUngrouped(minaWrapper);
    }
  }

  // ── Toggle-knapp ─────────────────────────────────────────────────────────
  function createToggleButton() {
    if (document.getElementById('cp-group-toggle')) return;

    const btn = document.createElement('button');
    btn.id = 'cp-group-toggle';

    function updateBtn() {
      btn.textContent = groupingEnabled ? '📋 Visa som lista' : '🗂 Visa grupperat';
      btn.title = groupingEnabled
        ? 'Stäng av gruppering — visa aktiviteter i standardordning'
        : 'Slå på gruppering — sortera i Anmäld / Reserv / Intresserad';
    }

    btn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999;
      padding: 8px 14px;
      background: #1a1a2e;
      color: #fff;
      border: 1px solid #444;
      border-radius: 8px;
      font-size: 0.9em;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.6);
      transition: background 0.2s;
    `;

    btn.addEventListener('mouseenter', () => { btn.style.background = '#2e2e50'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#1a1a2e'; });

    btn.addEventListener('click', () => {
      groupingEnabled = !groupingEnabled;
      localStorage.setItem(STORAGE_KEY, groupingEnabled);
      updateBtn();
      applyMinaWrapper();
    });

    updateBtn();
    document.body.appendChild(btn);
  }

  // ── Huvudfunktion ────────────────────────────────────────────────────────
  function run() {
    applyMinaWrapper();

    const invWrapper = findWrapper('calendar_list_my_invitations', null);
    if (invWrapper) colorSection(invWrapper);

    const newWrapper = findWrapper('calendar_list_new', 'new_event_list');
    if (newWrapper) colorSection(newWrapper);

    const weekWrapper = findWrapper('calendar_list_week', null);
    if (weekWrapper) colorSection(weekWrapper);

    applyOled();
    createToggleButton();
  }

  // ── Deterministisk trigger — väntar på att sidans JS satt typ-klasserna ──
  function isReady() {
    const wrapper = document.querySelector('#my_event_list');
    if (!wrapper) return false;
    return wrapper.querySelector(
      'table.event_row_table.open, ' +
      'table.event_row_table.plus_event, ' +
      'table.event_row_table.private, ' +
      'table.event_row_table.tips_event, ' +
      'table.event_row_table.draft'
    ) !== null;
  }

  // ── Kör OLED direkt — fungerar på alla sidor, även utan kalendervy ───────
  function runOledImmediate() {
    applyOled();
    observeOled();
  }

  let triggered = false;

  function tryRun() {
    if (triggered) return;
    if (!isReady()) return;
    triggered = true;
    observer.disconnect();
    Promise.resolve().then(run);
  }

  const observer = new MutationObserver(tryRun);

  observer.observe(document.body, {
    childList:       true,
    subtree:         true,
    attributes:      true,
    attributeFilter: ['class'],
  });

  // OLED körs alltid direkt — oavsett om kalendervy finns eller ej
  runOledImmediate();

  // Fallback: om sidan redan var redo när skriptet laddades
  tryRun();

})();
