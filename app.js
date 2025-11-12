/* Fire Parts Lookup v5.2.1 — manual quote lines, grouped email quotes, supplier cleanup, controls */

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
    boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
    zIndex: '9999',
    fontSize: '14px'
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ---------- Tabs & elements ---------- */

const els = {
  q: document.getElementById('q'),
  csv: document.getElementById('csv'),
  tbl: document.getElementById('tbl').querySelector('tbody'),
  count: document.getElementById('count'),
  copyArea: document.getElementById('copyArea'),
  copyPartLine: document.getElementById('copyPartLine'),
  clearCache: document.getElementById('clearCache'),
  loadShared: document.getElementById('loadShared'),
  partsPage: document.getElementById('partsPage'),
  quotePage: document.getElementById('quotePage'),
  tabParts: document.getElementById('tabParts'),
  tabQuote: document.getElementById('tabQuote'),
  addToQuote: document.getElementById('addToQuote'),
  copyQuote: document.getElementById('copyQuote'),
  copyQuoteRaw: document.getElementById('copyQuoteRaw'),
  copyQuoteEmail: document.getElementById('copyQuoteEmail'),
  jobNumber: document.getElementById('jobNumber'),
  deliveryAddress: document.getElementById('deliveryAddress'),
  // Manual line inputs
  manualSupplier: document.getElementById('manualSupplier'),
  manualDescription: document.getElementById('manualDescription'),
  manualPart: document.getElementById('manualPart'),
  manualPrice: document.getElementById('manualPrice'),
  manualQty: document.getElementById('manualQty'),
  manualAddBtn: document.getElementById('manualAddBtn')
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

/* ---------- Helpers ---------- */

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

function fmtPrice(n) { return '$' + (n || 0).toFixed(2); }
function cleanSupplierName(name) {
  return (name || 'SUPPLIER').replace(/\s*2025\s*$/i, '').trim() || 'SUPPLIER';
}

function updateAddToQuoteState() {
  const b = els.addToQuote;
  if (!b) return;
  if (state.selected) {
    b.disabled = false;
    Object.assign(b.style, {
      opacity: '1', cursor: 'pointer',
      borderColor: '#22c55e', background: '#ecfdf5', color: '#166534'
    });
  } else {
    b.disabled = true;
    Object.assign(b.style, {
      opacity: '0.5', cursor: 'not-allowed',
      borderColor: '#d1d5db', background: '#f3f4f6', color: '#9ca3af'
    });
  }
}

/* ---------- Load cached CSV ---------- */
const cachedCsv = localStorage.getItem('parts_csv');
if (cachedCsv) {
  try { parseCSV(cachedCsv); } catch {}
}

/* ---------- CSV controls ---------- */

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
      toast('Loaded shared CSV.', true);
    })
    .catch(() => toast('Error loading shared file', false));
});

els.clearCache.addEventListener('click', () => {
  localStorage.removeItem('parts_csv');
  state.rows = [];
  state.quote = [];
  state.selected = null;
  render();
  renderQuote();
  updateAddToQuoteState();
  toast('Cache cleared.', true);
});

/* ---------- Quote: add selected from parts ---------- */

els.addToQuote.addEventListener('click', () => {
  if (!state.selected) return;
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

/* ---------- Quote: manual line ---------- */

if (els.manualAddBtn) {
  els.manualAddBtn.addEventListener('click', () => {
    const sup = (els.manualSupplier.value || '').trim();
    const desc = (els.manualDescription.value || '').trim();
    const pn = (els.manualPart.value || '').trim();
    const qty = Math.max(1, parseInt(els.manualQty.value, 10) || 1);
    const priceEach = parseFloat((els.manualPrice.value || '').toString().replace(/[^0-9.]/g, ''));

    if (!sup || !desc || !pn || !(priceEach >= 0)) {
      return toast('Please fill Supplier, Description, Part # and Price.', false);
    }

    state.quote.push({
      SUPPLIER: sup,
      DESCRIPTION: desc,
      PARTNUMBER: pn,
      PRICE: priceEach || 0,
      qty
    });

    // Optional: clear inputs after add
    // els.manualDescription.value = '';
    // els.manualPart.value = '';
    // els.manualPrice.value = '';
    // els.manualQty.value = '1';

    renderQuote();
    toast('Manual line added.', true);
  });
}

/* ---------- Copy buttons ---------- */

els.copyQuote.addEventListener('click', () => {
  if (!state.quote.length) return toast('No items to copy.', false);
  let total = 0;
  const lines = state.quote.map(i => {
    const qty = i.qty || 1;
    total += i.PRICE * qty;
    return `${qty} x ${i.DESCRIPTION} — ${i.PARTNUMBER} — ${fmtPrice(i.PRICE)} each (${i.SUPPLIER} price)`;
  });
  lines.push('', 'Total: ' + fmtPrice(total));
  copyText(lines.join('\n'), 'Quote copied.');
});

els.copyQuoteRaw.addEventListener('click', () => {
  if (!state.quote.length) return toast('No items to copy.', false);
  const lines = state.quote.map(i => {
    const qty = i.qty || 1;
    return `${qty} x ${i.DESCRIPTION} — ${i.PARTNUMBER} — ${fmtPrice(i.PRICE)} each (${i.SUPPLIER} price)`;
  });
  copyText(lines.join('\n'), 'Items copied.');
});

/* ---------- Copy for Email PO (grouped by supplier, clean names) ---------- */

els.copyQuoteEmail.addEventListener('click', () => {
  if (!state.quote.length) return toast('No items to copy.', false);

  const job = els.jobNumber?.value.trim() || '';
  const delivery = els.deliveryAddress?.value.trim() || '';

  // Group items by cleaned supplier name
  const groups = new Map();
  state.quote.forEach(item => {
    const clean = cleanSupplierName(item.SUPPLIER);
    if (!groups.has(clean)) groups.set(clean, []);
    groups.get(clean).push(item);
  });

  const lines = [];
  groups.forEach((items, supplier) => {
    const supName = supplier || 'SUPPLIER';
    lines.push(job
      ? `Please forward a PO to ${supName} for job ${job}`
      : `Please forward a PO to ${supName} for this job`
    );
    lines.push('');
    items.forEach(i => {
      const qty = i.qty || 1;
      lines.push(`${qty} x ${i.DESCRIPTION} — ${i.PARTNUMBER} — ${fmtPrice(i.PRICE)} each`);
    });
    if (delivery) {
      lines.push('');
      lines.push(delivery);
    }
    lines.push(''); // blank line between supplier groups
  });

  copyText(lines.join('\n').trimEnd(), 'Email PO copied.');
});

/* ---------- Copy yellow line ---------- */
els.copyPartLine.addEventListener('click', () => {
  const txt = els.copyArea?.textContent.trim() || '';
  if (!txt) return toast('No part selected.', false);
  copyText(txt, 'Part line copied.');
});

/* ---------- Rendering: Parts ---------- */

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
      updateAddToQuoteState();
    });
    body.appendChild(tr);
  });
  els.count.textContent = rows.length;
}

/* ---------- Rendering: Quote ---------- */

function renderQuote() {
  const body = document.querySelector('#quoteTable tbody');
  const sum = document.getElementById('quoteSummary');
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
      <td><button data-i="${idx}" style="border:none;background:#fee2e2;color:#b91c1c;border-radius:6px;padding:2px 6px;cursor:pointer;">✖</button></td>`;
    tr.querySelector('input').addEventListener('change', e => {
      i.qty = Math.max(1, parseInt(e.target.value, 10) || 1);
      renderQuote();
    });
    tr.querySelector('button').addEventListener('click', e => {
      const idx2 = parseInt(e.target.dataset.i, 10);
      if (confirm('Remove this item?')) {
        state.quote.splice(idx2, 1);
        renderQuote();
      }
    });
    body.appendChild(tr);
  });

  sum.textContent = 'Total: ' + fmtPrice(total);

  // Clear Quote button
  let btnClear = document.getElementById('clearQuoteBtn');
  if (state.quote.length && !btnClear) {
    btnClear = document.createElement('button');
    btnClear.id = 'clearQuoteBtn';
    btnClear.textContent = 'Clear Quote';
    Object.assign(btnClear.style, {
      marginLeft: '10px', padding: '4px 8px', fontSize: '12px',
      borderRadius: '6px', border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer'
    });
    btnClear.addEventListener('click', () => {
      if (confirm('Clear all items?')) {
        state.quote = [];
        renderQuote();
        toast('Quote cleared.', true);
        showPartsPage();
      }
    });
    sum.parentElement.insertBefore(btnClear, sum.nextSibling);
  } else if (!state.quote.length && btnClear) {
    btnClear.remove();
  }
}

/* ---------- Init ---------- */
updateAddToQuoteState();
