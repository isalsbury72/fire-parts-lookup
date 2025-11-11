/* Fire Parts Lookup v5.2.1 — Clear Quote only when items exist, supplier price list label */

const state = { rows: [], selected: null, quote: [] };
const ACCESS_CODE = 'FP2025';

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
    boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
    zIndex: '9999',
    fontSize: '14px'
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ---------- Tabs ---------- */

const els = {
  q: document.getElementById('q'),
  csv: document.getElementById('csv'),
  tbl: document.getElementById('tbl').querySelector('tbody'),
  count: document.getElementById('count'),
  copyArea: document.getElementById('copyArea'),
  clearCache: document.getElementById('clearCache'),
  loadShared: document.getElementById('loadShared'),
  partsPage: document.getElementById('partsPage'),
  quotePage: document.getElementById('quotePage'),
  tabParts: document.getElementById('tabParts'),
  tabQuote: document.getElementById('tabQuote'),
  addToQuote: document.getElementById('addToQuote'),
  copyQuote: document.getElementById('copyQuote'),
  copyQuoteRaw: document.getElementById('copyQuoteRaw')
};

function showPartsPage() {
  els.partsPage.style.display = 'block';
  els.quotePage.style.display = 'none';
  els.tabParts.style.background = '#3b82f6';
  els.tabParts.style.color = '#fff';
  els.tabQuote.style.background = '#fff';
  els.tabQuote.style.color = '#111';
}

function showQuotePage() {
  els.partsPage.style.display = 'none';
  els.quotePage.style.display = 'block';
  els.tabQuote.style.background = '#3b82f6';
  els.tabQuote.style.color = '#fff';
  els.tabParts.style.background = '#fff';
  els.tabParts.style.color = '#111';
}

els.tabParts.addEventListener('click', showPartsPage);
els.tabQuote.addEventListener('click', showQuotePage);
showPartsPage();

/* ---------- Access ---------- */

function ensureAccess() {
  const ok = localStorage.getItem('hasAccess');
  if (ok === 'yes') return true;
  const code = prompt('Enter access code:');
  if (code === ACCESS_CODE) {
    localStorage.setItem('hasAccess', 'yes');
    toast('Access granted.', true);
    return true;
  }
  toast('Access denied.', false);
  return false;
}

/* ---------- Load cached CSV ---------- */

const cachedCsv = localStorage.getItem('parts_csv');
if (cachedCsv) {
  try {
    parseCSV(cachedCsv);
  } catch (e) {
    console.error('Error parsing cached CSV:', e);
  }
}

/* ---------- CSV load ---------- */

els.csv.addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    localStorage.setItem('parts_csv', r.result);
    parseCSV(r.result);
    toast('Loaded local CSV', true);
  };
  r.readAsText(f);
});

els.loadShared.addEventListener('click', () => {
  if (!ensureAccess()) return;
  fetch('Parts.csv')
    .then(r => r.text())
    .then(t => {
      localStorage.setItem('parts_csv', t);
      parseCSV(t);
      toast('Loaded shared CSV', true);
    })
    .catch(() => toast('Error loading shared file', false));
});

els.clearCache.addEventListener('click', () => {
  localStorage.removeItem('parts_csv');
  state.rows = [];
  state.quote = [];
  render();
  renderQuote();
  toast('Cache cleared.', true);
});

/* ---------- Quote Buttons ---------- */

if (els.addToQuote) {
  els.addToQuote.addEventListener('click', () => {
    if (!state.selected) return toast('Select a part first.', false);
    state.quote.push({
      SUPPLIER: state.selected.SUPPLIER,
      DESCRIPTION: state.selected.DESCRIPTION,
      PARTNUMBER: state.selected.PARTNUMBER,
      PRICE: state.selected.PRICE,
      qty: 1
    });
    renderQuote();
    showQuotePage();
  });
}

/* Copy quote (with total, no heading) */
if (els.copyQuote) {
  els.copyQuote.addEventListener('click', () => {
    if (!state.quote.length) return toast('No items to copy.', false);
    let total = 0;
    const lines = [];
    state.quote.forEach(i => {
      const qty = i.qty || 1;
      total += i.PRICE * qty;
      lines.push(
        `${qty} x ${i.DESCRIPTION} — ${i.PARTNUMBER} — ${fmtPrice(i.PRICE)} each (${i.SUPPLIER} price list)`
      );
    });
    lines.push('', 'Total: ' + fmtPrice(total));
    copyText(lines.join('\n'), 'Quote copied.');
  });
}

/* Copy quote (raw, no total) */
if (els.copyQuoteRaw) {
  els.copyQuoteRaw.addEventListener('click', () => {
    if (!state.quote.length) return toast('No items to copy.', false);
    const lines = state.quote.map(i => {
      const qty = i.qty || 1;
      return `${qty} x ${i.DESCRIPTION} — ${i.PARTNUMBER} — ${fmtPrice(i.PRICE)} each (${i.SUPPLIER} price list)`;
    });
    copyText(lines.join('\n'), 'Items copied.');
  });
}

/* ---------- Helpers ---------- */

function copyText(txt, msg) {
  navigator.clipboard?.writeText(txt).then(() => toast(msg, true))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast(msg, true);
    });
}

function parseCSV(txt) {
  const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
  state.rows = res.data.map(r => ({
    SUPPLIER: r.SUPPLIER || '',
    TYPE: r.TYPE || '',
    DESCRIPTION: r.DESCRIPTION || '',
    PARTNUMBER: r.PARTNUMBER || '',
    PRICE: parseFloat((r.PRICE || '').toString().replace(/[^0-9.]/g, '')) || 0,
    NOTES: r.NOTES || ''
  }));
  render();
}

function fmtPrice(n) {
  return '$' + (n || 0).toFixed(2);
}

/* ---------- Rendering ---------- */

els.q.addEventListener('input', render);

function render() {
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
      els.copyArea.textContent =
        `${r.SUPPLIER} — ${r.DESCRIPTION} — ${r.PARTNUMBER} — ${fmtPrice(r.PRICE)} each`;
    });
    body.appendChild(tr);
  });
  els.count.textContent = rows.length;
}

/* ---------- Quote Rendering ---------- */

function renderQuote() {
  const tbl = document.getElementById('quoteTable');
  const sum = document.getElementById('quoteSummary');
  if (!tbl || !sum) return;
  const body = tbl.querySelector('tbody');
  body.innerHTML = '';
  let total = 0;

  state.quote.forEach((i, idx) => {
    const qty = i.qty || 1;
    const lineTotal = i.PRICE * qty;
    total += lineTotal;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="number" min="1" value="${qty}" style="width:60px"></td>
      <td>${i.SUPPLIER}</td>
      <td>${i.DESCRIPTION}</td>
      <td>${i.PARTNUMBER}</td>
      <td>${fmtPrice(lineTotal)}</td>
      <td><button data-i="${idx}" style="border:none;background:#fee2e2;color:#b91c1c;border-radius:6px;padding:2px 6px;cursor:pointer;">✖</button></td>
    `;
    tr.querySelector('input').addEventListener('change', e => {
      const v = parseInt(e.target.value, 10) || 1;
      i.qty = v;
      renderQuote();
    });
    tr.querySelector('button').addEventListener('click', e => {
      const idx2 = parseInt(e.target.dataset.i, 10);
      if (isNaN(idx2)) return;
      if (confirm('Remove this item from the quote?')) {
        state.quote.splice(idx2, 1);
        renderQuote();
      }
    });
    body.appendChild(tr);
  });

  sum.textContent = 'Total: ' + fmtPrice(total);

  // Clear Quote button logic
  let btnClear = document.getElementById('clearQuoteBtn');
  if (state.quote.length && !btnClear) {
    btnClear = document.createElement('button');
    btnClear.id = 'clearQuoteBtn';
    btnClear.textContent = 'Clear Quote';
    Object.assign(btnClear.style, {
      marginLeft: '10px',
      padding: '4px 8px',
      fontSize: '12px',
      borderRadius: '6px',
      border: '1px solid #d1d5db',
      background: '#f3f4f6',
      cursor: 'pointer'
    });
    btnClear.addEventListener('click', () => {
      if (confirm('Clear all items from the quote?')) {
        state.quote = [];
        renderQuote();
        toast('Quote cleared.', true);
      }
    });
    sum.parentElement.insertBefore(btnClear, sum.nextSibling);
  } else if (!state.quote.length && btnClear) {
    btnClear.remove();
  }
}
