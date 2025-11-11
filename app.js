/* Fire Parts Lookup v5.2.1 — now with remove confirmation + nicer copy text */

const state = { rows: [], fuse: null, selected: null, quote: [] };
let sortState = { key: 'SUPPLIER', dir: 1 };

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

toast('Loaded v5.2.1', true);

const els = {
  q: document.getElementById('q'),
  csv: document.getElementById('csv'),
  tbl: document.getElementById('tbl').querySelector('tbody'),
  count: document.getElementById('count'),
  supplierFilter: document.getElementById('supplierFilter'),
  typeFilter: document.getElementById('typeFilter'),
  copyArea: document.getElementById('copyArea'),
  clearCache: document.getElementById('clearCache'),
  loadShared: document.getElementById('loadShared'),
  partsPage: document.getElementById('partsPage'),
  quotePage: document.getElementById('quotePage'),
  tabParts: document.getElementById('tabParts'),
  tabQuote: document.getElementById('tabQuote'),
  addToQuote: document.getElementById('addToQuote'),
  copyQuote: document.getElementById('copyQuote')
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

function ensureAccess() {
  const ok = localStorage.getItem('hasAccess');
  if (ok === 'yes') {
    const b = document.getElementById('authBanner');
    if (b) b.style.display = 'inline-block';
    return true;
  }
  const code = prompt('Enter access code to load shared data:');
  if (code === ACCESS_CODE) {
    localStorage.setItem('hasAccess', 'yes');
    toast('Access granted.', true);
    const b = document.getElementById('authBanner');
    if (b) b.style.display = 'inline-block';
    return true;
  }
  toast('Access denied.', false);
  return false;
}

// CSV upload
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

// Load shared
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
  localStorage.clear();
  state.rows = [];
  state.quote = [];
  render();
  renderQuote();
  toast('Cleared cache.', true);
});

if (els.addToQuote) {
  els.addToQuote.addEventListener('click', () => {
    if (!state.selected) {
      toast('Select a part first.', false);
      return;
    }
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

if (els.copyQuote) {
  els.copyQuote.addEventListener('click', () => {
    if (!state.quote.length) {
      return toast('No items to copy.', false);
    }

    let total = 0;
    const lines = ['Fire parts quote', ''];

    state.quote.forEach((i) => {
      const qty = i.qty || 1;
      const lineTotal = i.PRICE * qty;
      total += lineTotal;

      // Format: "5 x DESCRIPTION — PARTNUMBER — $xx.xx each"
      lines.push(`${qty} x ${i.DESCRIPTION} — ${i.PARTNUMBER} — ${fmtPrice(i.PRICE)} each`);
    });

    lines.push('', 'Total: ' + fmtPrice(total));

    const text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast('Quote copied.', true);
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  });
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    toast('Quote copied.', true);
  } catch (e) {
    toast('Could not copy quote.', false);
  }
  document.body.removeChild(ta);
}

function parseCSV(txt) {
  const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
  state.rows = res.data.map(r => ({
    SUPPLIER: r.SUPPLIER || '',
    TYPE: r.TYPE || '',
    DESCRIPTION: r.DESCRIPTION || '',
    PARTNUMBER: r.PARTNUMBER || '',
    PRICE: parsePrice(r.PRICE),
    NOTES: r.NOTES || ''
  }));
  render();
}

function parsePrice(v) {
  const s = v ? v.toString().replace(/[^0-9.]/g, '') : '';
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmtPrice(n) {
  return '$' + (n || 0).toFixed(2);
}

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
      els.copyArea.textContent = `${r.SUPPLIER} — ${r.DESCRIPTION} — ${r.PARTNUMBER} — ${fmtPrice(r.PRICE)} each`;
    });
    body.appendChild(tr);
  });
  els.count.textContent = rows.length;
}

function renderQuote() {
  const tbl = document.getElementById('quoteTable');
  const sum = document.getElementById('quoteSummary');
  const body = tbl.querySelector('tbody');
  body.innerHTML = '';
  let total = 0;
  state.quote.forEach((item, i) => {
    const qty = item.qty || 1;
    const line = item.PRICE * qty;
    total += line;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.SUPPLIER}</td>
      <td>${item.DESCRIPTION}</td>
      <td>${item.PARTNUMBER}</td>
      <td><input type="number" min="1" value="${qty}" style="width:60px"></td>
      <td>${fmtPrice(line)}</td>
      <td><button data-i="${i}" style="border:none;background:#fee2e2;color:#b91c1c;border-radius:6px;padding:2px 6px;cursor:pointer;">✖</button></td>
    `;
    tr.querySelector('input').addEventListener('change', e => {
      const v = parseInt(e.target.value, 10) || 1;
      item.qty = v;
      renderQuote();
    });
    tr.querySelector('button').addEventListener('click', e => {
      const idx = parseInt(e.target.dataset.i, 10);
      if (isNaN(idx)) return;
      const confirmRemove = confirm('Remove this item from the quote?');
      if (!confirmRemove) return;
      state.quote.splice(idx, 1);
      renderQuote();
    });
    body.appendChild(tr);
  });
  sum.textContent = 'Total: ' + fmtPrice(total);
}
