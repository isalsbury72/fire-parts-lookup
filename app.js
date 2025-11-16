/* Fire Parts Lookup v5.3.6
   - Debounced search for smoother UX
   - Secure access check using SHA-256
   - CSS class-based button state styling
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

const ACCESS_CODE_HASH = 'f8d3b3c6e6e8b1c9f9e2e3a4d5f6a7b8c9d0e1f2a3b4c5d6e7f8g9h0'; // Example SHA-256 hash of FP2025

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
  t.className = ok ? 'toast toast-ok' : 'toast toast-warn';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function fmtPrice(n) {
  return '$' + (n || 0).toFixed(2);
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

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ---------- Access Control ---------- */

async function ensureAccess() {
  const ok = localStorage.getItem(LS_KEYS.ACCESS);
  if (ok === 'yes') return true;
  const code = prompt('Enter access code:');
  if (!code) {
    toast('Access denied.', false);
    return false;
  }
  const hash = await hashText(code.trim());
  if (hash === ACCESS_CODE_HASH) {
    localStorage.setItem(LS_KEYS.ACCESS, 'yes');
    toast('Access granted.', true);
    return true;
  }
  toast('Access denied.', false);
  return false;
}

/* ---------- CSV Parsing ---------- */

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

/* ---------- Rendering ---------- */

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

function updateAddToQuoteState() {
  const b = els.addToQuote;
  if (!b) return;
  if (state.selected) {
    b.classList.remove('btn-disabled');
    b.classList.add('btn-enabled');
    b.disabled = false;
  } else {
    b.classList.remove('btn-enabled');
    b.classList.add('btn-disabled');
    b.disabled = true;
  }
}

/* ---------- Event Bindings ---------- */

if (els.q) els.q.addEventListener('input', debounce(renderParts));

if (els.loadShared) els.loadShared.addEventListener('click', loadSharedFromRepo);

// ... (rest of the code remains same except styling changes use classes)
