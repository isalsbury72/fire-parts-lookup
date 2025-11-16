/* Fire Parts Lookup v5.3.6
   - Added debounce for search input for smoother UX
*/

const APP_VERSION = '5.3.6';

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

/* ---------- Utilities ---------- */

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

function fmtPrice(n) {
  return '$' + (n || 0).toFixed(2);
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

function fmtPriceNum(raw) {
  return parseFloat((raw || '').toString().replace(/[^0-9.]/g, '')) || 0;
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

/* ---------- NEW: Debounce ---------- */
function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* CSV parsing and metadata */

function updateCsvMeta(sourceLabel) {
  if (!sourceLabel) return;
  const meta = {
    source: sourceLabel,
    loadedAt: new Date().toISOString()
  };
  state.csvMeta = meta;
  try {
    localStorage.setItem(LS_KEYS.CSV_META, JSON.stringify(meta));
  } catch {}
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

/* localStorage helpers for quote/buildcase */

function saveQuote() {
  try {
    localStorage.setItem(LS_KEYS.QUOTE, JSON.stringify(state.quote));
  } catch {}
}
function saveBuildcase() {
  try {
    localStorage.setItem(LS_KEYS.BUILDCASE, JSON.stringify(state.buildcase));
  } catch {}
}

function loadSavedState() {
  try {
    const m = localStorage.getItem(LS_KEYS.CSV_META);
    if (m) {
      const parsed = JSON.parse(m);
      if (parsed && typeof parsed === 'object') {
        state.csvMeta = {
          source: parsed.source || 'Unknown',
          loadedAt: parsed.loadedAt || null
        };
      }
    }
  } catch {}

  try {
    const q = localStorage.getItem(LS_KEYS.QUOTE);
    if (q) {
      const parsed = JSON.parse(q);
      if (Array.isArray(parsed)) {
        state.quote = parsed.map(i => ({
          SUPPLIER: i.SUPPLIER || '',
          DESCRIPTION: i.DESCRIPTION || '',
          PARTNUMBER: i.PARTNUMBER || '',
          PRICE: typeof i.PRICE === 'number' ? i.PRICE : fmtPriceNum(i.PRICE),
          qty: i.qty && i.qty > 0 ? i.qty : 1
        }));
      }
    }
  } catch {}

  try {
    const b = localStorage.getItem(LS_KEYS.BUILDCASE);
    if (b) {
      const parsed = JSON.parse(b);
      if (parsed && typeof parsed === 'object') {
        state.buildcase = Object.assign({}, state.buildcase, parsed);
      }
    }
  } catch {}
}

/* DOM refs */
const els = {
  q: document.getElementById('q'),
  csv: document.getElementById('csv'),
  tbl: document.getElementById('tbl')?.querySelector('tbody'),
  count: document.getElementById('count'),
  partsCsvSummary: document.getElementById('partsCsvSummary'),
  copyArea: document.getElementById('copyArea'),
  copyPartLine: document.getElementById('copyPartLine'),
  clearCache: document.getElementById('clearCache'),
  loadShared: document.getElementById('loadShared'),
  partsPage: document.getElementById('partsPage'),
  quotePage: document.getElementById('quotePage'),
  settingsPage: document.getElementById('settingsPage'),
  buildcase1Page: document.getElementById('buildcase1Page'),
  buildcase2Page: document.getElementById('buildcase2Page'),
  buildcase3Page: document.getElementById('buildcase3Page'),
  tabParts: document.getElementById('tabParts'),
  tabQuote: document.getElementById('tabQuote'),
  tabSettings: document.getElementById('tabSettings'),
  addToQuote: document.getElementById('addToQuote'),
  copyQuote: document.getElementById('copyQuote'),
  copyQuoteRaw: document.getElementById('copyQuoteRaw'),
  copyQuoteEmail: document.getElementById('copyQuoteEmail'),
  btnClearQuote: document.getElementById('btnClearQuote'),
  btnBuildCase: document.getElementById('btnBuildCase'),
  jobNumber: document.getElementById('jobNumber'),
  deliveryAddress: document.getElementById('deliveryAddress'),
  quoteTableBody: document.querySelector('#quoteTable tbody'),
  quoteSummary: document.getElementById('quoteSummary'),
  manualToggle: document.getElementById('manualToggle'),
  manualSection: document.getElementById('manualSection'),
  manualSupplier: document.getElementById('manualSupplier'),
  manualDescription: document.getElementById('manualDescription'),
  manualPart: document.getElementById('manualPart'),
  manualPrice: document.getElementById('manualPrice'),
  manualQty: document.getElementById('manualQty'),
  manualAddBtn: document.getElementById('manualAddBtn'),
  btnBackToQuote: document.getElementById('btnBackToQuote'),
  btnToBuild2: document.getElementById('btnToBuild2'),
  btnBackToBuild1: document.getElementById('btnBackToBuild1'),
  btnToBuild3: document.getElementById('btnToBuild3'),
  btnBackToBuild2: document.getElementById('btnBackToBuild2'),
  btnBackToQuoteFrom3: document.getElementById('btnBackToQuoteFrom3'),
  notesCustomer: document.getElementById('notesCustomer'),
  notesEstimator: document.getElementById('notesEstimator'),
  bc1ItemsCount: document.getElementById('bc1ItemsCount'),
  notesCustomer3: document.getElementById('notesCustomer3'),
  notesEstimator3: document.getElementById('notesEstimator3'),
  bc3ItemsCount: document.getElementById('bc3ItemsCount'),
  routineYes: document.getElementById('routineYes'),
  routineNo: document.getElementById('routineNo'),
  accomNights: document.getElementById('accomNights'),
  labourHoursNormal: document.getElementById('labourHoursNormal'),
  numTechsNormal: document.getElementById('numTechsNormal'),
  travelHoursNormal: document.getElementById('travelHoursNormal'),
  labourHoursAfter: document.getElementById('labourHoursAfter'),
  numTechsAfter: document.getElementById('numTechsAfter'),
  travelHoursAfter: document.getElementById('travelHoursAfter'),
  btnCopyNC3: document.getElementById('btnCopyNC3'),
  btnCopyNE3: document.getElementById('btnCopyNE3'),
  diagCsvSource: document.getElementById('diagCsvSource'),
  diagLastLoaded: document.getElementById('diagLastLoaded'),
  diagPartsRows: document.getElementById('diagPartsRows'),
  diagQuoteItems: document.getElementById('diagQuoteItems'),
  diagRoutine: document.getElementById('diagRoutine'),
  diagSwStatus: document.getElementById('diagSwStatus'),
  btnDiagClearAll: document.getElementById('btnDiagClearAll'),
  btnDiagCopy: document.getElementById('btnDiagCopy')
};

/* ---------- Parts page ---------- */

function renderParts() {
  const q = els.q ? els.q.value.trim().toLowerCase() : '';
  const body = els.tbl;
  if (!body) return;
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
      if (els.copyArea) {
        els.copyArea.textContent =
          `${r.SUPPLIER} — ${r.DESCRIPTION} — ${r.PARTNUMBER} — ${fmtPrice(r.PRICE)} each`;
      }
      updateAddToQuoteState();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    body.appendChild(tr);
  });

  if (els.count) els.count.textContent = rows.length;

  if (els.partsCsvSummary) {
    const src = state.csvMeta.source || 'None loaded';
    const when = state.csvMeta.loadedAt ? formatLastLoaded(state.csvMeta.loadedAt) : null;
    els.partsCsvSummary.textContent = when
      ? `CSV: ${src} • Last loaded: ${when}`
      : `CSV: ${src}`;
  }

  renderDiagnostics();
}

/* Apply debounce to search input */
if (els.q) els.q.addEventListener('input', debounce(renderParts));

/* ---------- Rest of original code remains unchanged ---------- */
// (Quote rendering, build case, copy helpers, etc.)

/* ---------- Start ---------- */
const cachedCsv = localStorage.getItem(LS_KEYS.CSV);
loadSavedState();
if (cachedCsv) {
  try {
    parseCSV(cachedCsv);
  } catch {}
}
function start() {
  renderParts();
  renderQuote();
  updateAddToQuoteState();
  showPartsPage();
}
start();
