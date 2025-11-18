/* Fire Parts Lookup v5.3.9
   - Battery calculator fixed to match index.html IDs
   - Required Capacity = Age Factor (x1.25)
   - Tq buttons synced (24h / 72h)
   - Home navigation restored
*/

const APP_VERSION = '5.3.9';

const state = {
  rows: [],
  selected: null,
  quote: [],
  buildcase: {
    notesCustomer: '',
    notesEstimator: '',
    routineVisit: null,
    accomNights: '',
    labourHoursNormal: '',
    numTechsNormal: '',
    travelHoursNormal: '',
    labourHoursAfter: '',
    numTechsAfter: '',
    travelHoursAfter: ''
  },
  csvMeta: {
    source: 'None loaded',
    loadedAt: null
  },
  battery: {
    Tq: 24
  }
};

const ACCESS_CODE = 'FP2025';

const LS_KEYS = {
  CSV: 'parts_csv',
  CSV_META: 'csv_meta_v1',
  QUOTE: 'quote_data_v1',
  BUILDCASE: 'buildcase_state_v1',
  ACCESS: 'hasAccess'
};

/* -------------------------------------------------- */
/* Toast */
function toast(msg, ok = false) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 14px',
    borderRadius: '8px',
    background: '#fff',
    border: `1px solid ${ok ? '#10b981' : '#f59e0b'}`,
    boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
    zIndex: '9999',
    fontSize: '14px'
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* Helpers */
function fmtPrice(n) {
  return '$' + (n || 0).toFixed(2);
}
function fmtPriceNum(raw) {
  return parseFloat((raw || '').toString().replace(/[^0-9.]/g, '')) || 0;
}
function supplierKey(name) {
  if (!name) return 'UNKNOWN';
  const noYear = name.replace(/\b20\d{2}\b/g, '');
  const match = noYear.match(/[A-Za-z]+/);
  const firstToken = match ? match[0] : 'UNKNOWN';
  return firstToken.toUpperCase();
}
function displaySupplierName(name) {
  if (!name) return 'SUPPLIER';
  const key = supplierKey(name);
  return key.charAt(0) + key.slice(1).toLowerCase();
}
function formatLastLoaded(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/* -------------------------------------------------- */
/* CSV parsing */
function updateCsvMeta(sourceLabel) {
  const meta = {
    source: sourceLabel,
    loadedAt: new Date().toISOString()
  };
  state.csvMeta = meta;
  try { localStorage.setItem(LS_KEYS.CSV_META, JSON.stringify(meta)); } catch {}
}

function parseCSV(txt, sourceLabel) {
  const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
  state.rows = res.data.map(r => ({
    SUPPLIER: r.SUPPLIER || '',
    TYPE: r.TYPE || '',
    DESCRIPTION: r.DESCRIPTION || '',
    PARTNUMBER: r.PARTNUMBER || '',
    PRICE: fmtPriceNum(r.PRICE),
    NOTES: r.NOTES || ''
  }));
  if (sourceLabel) updateCsvMeta(sourceLabel);
  renderParts();
  renderDiagnostics();
}

/* Load saved state */
function loadSavedState() {
  try {
    const m = JSON.parse(localStorage.getItem(LS_KEYS.CSV_META));
    if (m) state.csvMeta = m;
  } catch {}

  try {
    const q = JSON.parse(localStorage.getItem(LS_KEYS.QUOTE));
    if (Array.isArray(q)) {
      state.quote = q.map(i => ({
        SUPPLIER: i.SUPPLIER || '',
        DESCRIPTION: i.DESCRIPTION || '',
        PARTNUMBER: i.PARTNUMBER || '',
        PRICE: typeof i.PRICE === 'number' ? i.PRICE : fmtPriceNum(i.PRICE),
        qty: i.qty || 1
      }));
    }
  } catch {}

  try {
    const b = JSON.parse(localStorage.getItem(LS_KEYS.BUILDCASE));
    if (b) Object.assign(state.buildcase, b);
  } catch {}
}

loadSavedState();

/* -------------------------------------------------- */
/* DOM refs */

const els = {

  /* Pages */
  homePage: document.getElementById('homePage'),
  partsPage: document.getElementById('partsPage'),
  quotePage: document.getElementById('quotePage'),
  settingsPage: document.getElementById('settingsPage'),
  buildcase1Page: document.getElementById('buildcase1Page'),
  buildcase2Page: document.getElementById('buildcase2Page'),
  buildcase3Page: document.getElementById('buildcase3Page'),
  batteryPage: document.getElementById('batteryPage'),

  /* Tabs */
  tabParts: document.getElementById('tabParts'),
  tabQuote: document.getElementById('tabQuote'),
  tabSettings: document.getElementById('tabSettings'),

  /* Home buttons */
  btnHomeParts: document.getElementById('btnHomeParts'),
  btnHomeBattery: document.getElementById('btnHomeBattery'),
  goHomeFromParts: document.getElementById('goHomeFromParts'),

  /* Parts */
  q: document.getElementById('q'),
  tbl: document.querySelector('#tbl tbody'),
  count: document.getElementById('count'),
  copyArea: document.getElementById('copyArea'),
  copyPartLine: document.getElementById('copyPartLine'),
  addToQuote: document.getElementById('addToQuote'),
  csv: document.getElementById('csv'),
  loadShared: document.getElementById('loadShared'),
  clearCache: document.getElementById('clearCache'),
  partsCsvSummary: document.getElementById('partsCsvSummary'),

  /* Quote */
  quoteTableBody: document.querySelector('#quoteTable tbody'),
  quoteSummary: document.getElementById('quoteSummary'),
  copyQuote: document.getElementById('copyQuote'),
  copyQuoteRaw: document.getElementById('copyQuoteRaw'),
  copyQuoteEmail: document.getElementById('copyQuoteEmail'),
  btnClearQuote: document.getElementById('btnClearQuote'),
  jobNumber: document.getElementById('jobNumber'),
  deliveryAddress: document.getElementById('deliveryAddress'),
  btnBuildCase: document.getElementById('btnBuildCase'),

  /* Manual item */
  manualToggle: document.getElementById('manualToggle'),
  manualSection: document.getElementById('manualSection'),
  manualSupplier: document.getElementById('manualSupplier'),
  manualDescription: document.getElementById('manualDescription'),
  manualPart: document.getElementById('manualPart'),
  manualPrice: document.getElementById('manualPrice'),
  manualQty: document.getElementById('manualQty'),
  manualAddBtn: document.getElementById('manualAddBtn'),

  /* Battery calculator */
  battIq: document.getElementById('battIq'),
  battIa: document.getElementById('battIa'),
  battTqDisplay: document.getElementById('battTqDisplay'),
  battTaDisplay: document.getElementById('battTaDisplay'),
  battCap20: document.getElementById('battCap20'),
  battAgeCap: document.getElementById('battAgeCap'),
  battRequired: document.getElementById('battRequired'),
  battBtnTq24: document.getElementById('battBtnTq24'),
  battBtnTq72: document.getElementById('battBtnTq72'),

  /* Diagnostics */
  diagCsvSource: document.getElementById('diagCsvSource'),
  diagLastLoaded: document.getElementById('diagLastLoaded'),
  diagPartsRows: document.getElementById('diagPartsRows'),
  diagQuoteItems: document.getElementById('diagQuoteItems'),
  diagRoutine: document.getElementById('diagRoutine'),
  diagSwStatus: document.getElementById('diagSwStatus')
};

/* -------------------------------------------------- */
/* Parts page rendering */

function renderParts() {
  const q = els.q.value.trim().toLowerCase();
  const body = els.tbl;
  body.innerHTML = '';

  const rows = state.rows.filter(r =>
    !q || Object.values(r).join(' ').toLowerCase().includes(q)
  );

  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.SUPPLIER}</td>
      <td>${r.TYPE}</td>
      <td>${r.DESCRIPTION}</td>
      <td><span class="badge">${r.PARTNUMBER}</span></td>
      <td>${fmtPrice(r.PRICE)}</td>
      <td class="notes">${r.NOTES}</td>`;
    tr.addEventListener('click', () => {
      state.selected = r;
      els.copyArea.textContent = `${r.SUPPLIER} — ${r.DESCRIPTION} — ${r.PARTNUMBER} — ${fmtPrice(r.PRICE)} each`;
      updateAddToQuoteState();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    body.appendChild(tr);
  });

  els.count.textContent = rows.length;
  const src = state.csvMeta.source || 'None loaded';
  const when = state.csvMeta.loadedAt ? formatLastLoaded(state.csvMeta.loadedAt) : null;
  els.partsCsvSummary.textContent = when
    ? `CSV: ${src} • Last loaded: ${when}`
    : `CSV: ${src}`;

  renderDiagnostics();
}

if (els.q) els.q.addEventListener('input', renderParts);

/* Enable/disable Add to Quote */
function updateAddToQuoteState() {
  const b = els.addToQuote;
  if (state.selected) {
    b.disabled = false;
    b.style.opacity = '1';
    b.style.cursor = 'pointer';
    b.style.borderColor = '#22c55e';
    b.style.background = '#ecfdf5';
    b.style.color = '#166534';
  } else {
    b.disabled = true;
    b.style.opacity = '0.5';
    b.style.cursor = 'not-allowed';
    b.style.borderColor = '#d1d5db';
    b.style.background = '#f3f4f6';
    b.style.color = '#9ca3af';
  }
}

/* -------------------------------------------------- */
/* Quote system */

function renderQuote() {
  const body = els.quoteTableBody;
  const sum = els.quoteSummary;
  body.innerHTML = '';
  let total = 0;

  state.quote.forEach((i, idx) => {
    const qty = i.qty || 1;
    const lineTotal = i.PRICE * qty;
    total += lineTotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="number" min="1" value="${qty}" style="width:60px; text-align:right;"></td>
      <td>${i.SUPPLIER}</td>
      <td>${i.DESCRIPTION}</td>
      <td style="text-align:right;">${i.PARTNUMBER}</td>
      <td style="text-align:right;">${fmtPrice(lineTotal)}</td>
      <td><button data-i="${idx}" style="border:none;background:#fee2e2;color:#b91c1c;border-radius:6px;padding:2px 6px;cursor:pointer;">✖</button></td>
    `;

    tr.querySelector('input').addEventListener('change', e => {
      i.qty = Math.max(1, parseInt(e.target.value, 10) || 1);
      saveQuote();
      renderQuote();
    });
    tr.querySelector('button').addEventListener('click', e => {
      const i2 = parseInt(e.target.dataset.i);
      if (confirm('Remove this item?')) {
        state.quote.splice(i2, 1);
        saveQuote();
        renderQuote();
      }
    });

    body.appendChild(tr);
  });

  sum.textContent = 'Total: ' + fmtPrice(total);

  els.btnClearQuote.disabled = state.quote.length === 0;
  renderDiagnostics();
}

function saveQuote() {
  try { localStorage.setItem(LS_KEYS.QUOTE, JSON.stringify(state.quote)); } catch {}
}

/* -------------------------------------------------- */
/* Manual item */

function manualInputsValid() {
  const sup = els.manualSupplier.value.trim();
  const desc = els.manualDescription.value.trim();
  const pn = els.manualPart.value.trim();
  const price = parseFloat((els.manualPrice.value || '').toString().replace(/[^0-9.]/g, ''));
  return !!(sup && desc && pn && !isNaN(price));
}

function setManualBtnEnabled(on) {
  const b = els.manualAddBtn;
  b.disabled = !on;
  if (on) {
    b.style.borderColor = '#22c55e';
    b.style.background = '#ecfdf5';
    b.style.color = '#166534';
    b.style.opacity = '1';
    b.style.cursor = 'pointer';
  } else {
    b.style.borderColor = '#d1d5db';
    b.style.background = '#f3f4f6';
    b.style.color = '#9ca3af';
    b.style.opacity = '0.6';
    b.style.cursor = 'not-allowed';
  }
}

['manualSupplier','manualDescription','manualPart','manualPrice','manualQty'].forEach(id => {
  const el = els[id];
  if (el) el.addEventListener('input', () => setManualBtnEnabled(manualInputsValid()));
});

if (els.manualToggle) {
  els.manualToggle.addEventListener('change', e => {
    const on = e.target.checked;
    els.manualSection.style.display = on ? 'block' : 'none';
    if (!on) {
      els.manualSupplier.value = '';
      els.manualDescription.value = '';
      els.manualPart.value = '';
      els.manualPrice.value = '';
      els.manualQty.value = '1';
    }
    setManualBtnEnabled(on && manualInputsValid());
  });
}

/* -------------------------------------------------- */
/* Home + navigation */

function hideAllPages() {
  els.homePage.style.display = 'none';
  els.partsPage.style.display = 'none';
  els.quotePage.style.display = 'none';
  els.settingsPage.style.display = 'none';
  els.batteryPage.style.display = 'none';
  els.buildcase1Page.style.display = 'none';
  els.buildcase2Page.style.display = 'none';
  els.buildcase3Page.style.display = 'none';
}

function showHomePage() {
  hideAllPages();
  els.homePage.style.display = 'block';
}

function showPartsPage() {
  hideAllPages();
  els.partsPage.style.display = 'block';
}

function showQuotePage() {
  hideAllPages();
  els.quotePage.style.display = 'block';
}

function showSettingsPage() {
  hideAllPages();
  els.settingsPage.style.display = 'block';
}

function showBatteryPage() {
  hideAllPages();
  els.batteryPage.style.display = 'block';
}

if (els.btnHomeParts) els.btnHomeParts.addEventListener('click', showPartsPage);
if (els.btnHomeBattery) els.btnHomeBattery.addEventListener('click', showBatteryPage);
if (els.goHomeFromParts) els.goHomeFromParts.addEventListener('click', showHomePage);

/* -------------------------------------------------- */
/* Battery calculator — FIXED */

function recalcBattery() {
  const Iq = parseFloat(els.battIq.value) || 0;
  const Ia = parseFloat(els.battIa.value) || 0;
  const Tq = state.battery.Tq;
  const Ta = 0.5;
  const Fc = 2;

  const base = (Iq * Tq) + (Fc * Ia * Ta);
  const aged = base * 1.25;

  els.battTqDisplay.textContent = `${Tq} h`;
  els.battTaDisplay.textContent = `0.5 h`;
  els.battCap20.textContent = base.toFixed(2) + ' Ah';
  els.battAgeCap.textContent = aged.toFixed(2) + ' Ah';
  els.battRequired.textContent = aged.toFixed(2) + ' Ah';
}

/* Tq buttons */
function updateTqButtons() {
  els.battBtnTq24.classList.toggle('active', state.battery.Tq === 24);
  els.battBtnTq72.classList.toggle('active', state.battery.Tq === 72);
}

if (els.battBtnTq24) els.battBtnTq24.addEventListener('click', () => {
  state.battery.Tq = 24;
  updateTqButtons();
  recalcBattery();
});

if (els.battBtnTq72) els.battBtnTq72.addEventListener('click', () => {
  state.battery.Tq = 72;
  updateTqButtons();
  recalcBattery();
});

if (els.battIq) els.battIq.addEventListener('input', recalcBattery);
if (els.battIa) els.battIa.addEventListener('input', recalcBattery);

/* -------------------------------------------------- */
/* Clear cache */

function clearAllData() {
  localStorage.removeItem(LS_KEYS.CSV);
  localStorage.removeItem(LS_KEYS.CSV_META);
  localStorage.removeItem(LS_KEYS.QUOTE);
  localStorage.removeItem(LS_KEYS.BUILDCASE);
  localStorage.removeItem(LS_KEYS.ACCESS);
  state.rows = [];
  state.quote = [];
  toast('All app data cleared.', true);
  renderParts();
  renderQuote();
  recalcBattery();
}
if (els.clearCache) els.clearCache.addEventListener('click', clearAllData);

/* Load shared */
async function loadSharedFromRepo() {
  const ok = ensureAccess();
  if (!ok) return;

  try {
    const res = await fetch('Parts.csv', { cache: 'no-cache' });
    const txt = await res.text();
    localStorage.setItem(LS_KEYS.CSV, txt);
    parseCSV(txt, 'GitHub Parts.csv');
    toast('Loaded shared CSV.', true);
  } catch {
    toast('Error loading CSV.', false);
  }
}
if (els.loadShared) els.loadShared.addEventListener('click', loadSharedFromRepo);

/* Access code */
function ensureAccess() {
  const ok = localStorage.getItem(LS_KEYS.ACCESS);
  if (ok === 'yes') return true;
  const code = prompt('Enter access code:');
  if (code === ACCESS_CODE) {
    localStorage.setItem(LS_KEYS.ACCESS, 'yes');
    toast('Access granted.', true);
    return true;
  }
  toast('Access denied.', false);
  return false;
}

/* -------------------------------------------------- */
/* Diagnostics */

function renderDiagnostics() {
  if (els.diagCsvSource) els.diagCsvSource.textContent = state.csvMeta.source;
  if (els.diagLastLoaded) els.diagLastLoaded.textContent = formatLastLoaded(state.csvMeta.loadedAt);
  if (els.diagPartsRows) els.diagPartsRows.textContent = state.rows.length;
  if (els.diagQuoteItems) els.diagQuoteItems.textContent = state.quote.length;
  if (els.diagRoutine) els.diagRoutine.textContent = state.buildcase.routineVisit || 'Not set';
  if (els.diagSwStatus) {
    if (!('serviceWorker' in navigator)) els.diagSwStatus.textContent = 'Not supported';
    else if (navigator.serviceWorker.controller) els.diagSwStatus.textContent = 'Active';
    else els.diagSwStatus.textContent = 'Registered/waiting';
  }
}

/* -------------------------------------------------- */
/* Start */

function start() {
  renderParts();
  renderQuote();
  updateTqButtons();
  recalcBattery();
  showHomePage();     // DEFAULT: Home page first
}

start();
