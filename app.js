/* Fire Parts Lookup v5.2.5
   - Step 2: hour inputs made compact (bc-input--tiny)
   - Quote actions: unified 2×2 grid, consistent styled buttons incl. Clear Quote there
   - Keeps all previous behaviour (clear returns to Parts)
*/

const state = {
  rows: [],
  selected: null,
  quote: [],
  buildcase: {
    notesCustomer: '',
    notesEstimator: '',
    routineVisit: null,     // 'yes' | 'no'
    labourHoursNormal: '',
    numTechsNormal: '',
    labourHoursAfter: '',
    numTechsAfter: ''
  }
};
const ACCESS_CODE = 'FP2025';

/* ---------- Utils ---------- */
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
function fmtPrice(n) { return '$' + (n || 0).toFixed(2); }
function cleanSupplierName(name) {
  return (name || 'SUPPLIER').replace(/\s*2025\s*$/i, '').trim() || 'SUPPLIER';
}

/* Build items text for notes */
function buildLineItemsText() {
  if (!state.quote.length) return '';
  return state.quote.map(i => {
    const qty = i.qty || 1;
    return `${qty} x ${i.DESCRIPTION} — ${i.PARTNUMBER} — ${fmtPrice(i.PRICE)} each`;
  }).join('\n');
}

/* Labour summary */
function buildLabourSummary() {
  const nh = parseFloat(state.buildcase.labourHoursNormal || '0') || 0;
  const nm = parseInt(state.buildcase.numTechsNormal || '0', 10) || 0;
  const ah = parseFloat(state.buildcase.labourHoursAfter || '0') || 0;
  const am = parseInt(state.buildcase.numTechsAfter || '0', 10) || 0;

  const lines = [];
  let total = 0;

  if (nh > 0 && nm > 0) {
    lines.push(`${nh} hours ${nm} ${nm === 1 ? 'man' : 'men'} NT`);
    total += nh * nm;
  }
  if (ah > 0 && am > 0) {
    lines.push(`${ah} hours ${am} ${am === 1 ? 'man' : 'men'} AH`);
    total += ah * am;
  }
  if (lines.length) lines.push(`Total labour: ${total} hours`);
  if (state.buildcase.routineVisit === 'yes') lines.push('Can be completed on next routine visit');
  return lines.join('\n');
}

/* De-duplicate lines (preserve order, keep blank separators) */
function dedupeLines(text) {
  const seen = new Set();
  const out = [];
  text.split('\n').forEach(line => {
    const k = line.trim();
    if (!k) { out.push(line); return; }
    if (!seen.has(k)) { seen.add(k); out.push(line); }
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/* ---------- Elements ---------- */
const els = {
  // Parts
  q: document.getElementById('q'),
  csv: document.getElementById('csv'),
  tbl: document.getElementById('tbl')?.querySelector('tbody'),
  count: document.getElementById('count'),
  copyArea: document.getElementById('copyArea'),
  copyPartLine: document.getElementById('copyPartLine'),
  clearCache: document.getElementById('clearCache'),
  loadShared: document.getElementById('loadShared'),
  partsPage: document.getElementById('partsPage'),
  // Tabs & pages
  quotePage: document.getElementById('quotePage'),
  buildcase1Page: document.getElementById('buildcase1Page'),
  buildcase2Page: document.getElementById('buildcase2Page'),
  buildcase3Page: document.getElementById('buildcase3Page'),
  tabParts: document.getElementById('tabParts'),
  tabQuote: document.getElementById('tabQuote'),
  // Quote controls
  addToQuote: document.getElementById('addToQuote'),
  copyQuote: document.getElementById('copyQuote'),
  copyQuoteRaw: document.getElementById('copyQuoteRaw'),
  copyQuoteEmail: document.getElementById('copyQuoteEmail'),
  btnClearQuote: document.getElementById('btnClearQuote'),
  jobNumber: document.getElementById('jobNumber'),
  deliveryAddress: document.getElementById('deliveryAddress'),
  quoteTableBody: document.querySelector('#quoteTable tbody'),
  quoteSummary: document.getElementById('quoteSummary'),
  btnBuildCase: document.getElementById('btnBuildCase'),
  // Manual line inputs
  manualSupplier: document.getElementById('manualSupplier'),
  manualDescription: document.getElementById('manualDescription'),
  manualPart: document.getElementById('manualPart'),
  manualPrice: document.getElementById('manualPrice'),
  manualQty: document.getElementById('manualQty'),
  manualAddBtn: document.getElementById('manualAddBtn'),
  // Buildcase buttons + fields
  btnBackToQuote: document.getElementById('btnBackToQuote'),
  btnToBuild2: document.getElementById('btnToBuild2'),
  btnBackToBuild1: document.getElementById('btnBackToBuild1'),
  btnToBuild3: document.getElementById('btnToBuild3'),
  btnBackToBuild2: document.getElementById('btnBackToBuild2'),
  btnBackToQuoteFrom3: document.getElementById('btnBackToQuoteFrom3'),
  // Buildcase textareas/fields
  notesCustomer: document.getElementById('notesCustomer'),
  notesEstimator: document.getElementById('notesEstimator'),
  bc1ItemsCount: document.getElementById('bc1ItemsCount'),
  notesCustomer3: document.getElementById('notesCustomer3'),
  notesEstimator3: document.getElementById('notesEstimator3'),
  bc3ItemsCount: document.getElementById('bc3ItemsCount'),
  routineYes: document.getElementById('routineYes'),
  routineNo: document.getElementById('routineNo'),
  labourHoursNormal: document.getElementById('labourHoursNormal'),
  numTechsNormal: document.getElementById('numTechsNormal'),
  labourHoursAfter: document.getElementById('labourHoursAfter'),
  numTechsAfter: document.getElementById('numTechsAfter'),
  // Step 3 copy buttons
  btnCopyNC3: document.getElementById('btnCopyNC3'),
  btnCopyNE3: document.getElementById('btnCopyNE3')
};

/* ---------- Navigation ---------- */
function showPartsPage() {
  els.partsPage.style.display = 'block';
  els.quotePage.style.display = 'none';
  els.buildcase1Page.style.display = 'none';
  els.buildcase2Page.style.display = 'none';
  els.buildcase3Page.style.display = 'none';
  els.tabParts.style.background = '#3b82f6'; els.tabParts.style.color = '#fff';
  els.tabQuote.style.background = '#fff'; els.tabQuote.style.color = '#111';
}
function showQuotePage() {
  els.partsPage.style.display = 'none';
  els.quotePage.style.display = 'block';
  els.buildcase1Page.style.display = 'none';
  els.buildcase2Page.style.display = 'none';
  els.buildcase3Page.style.display = 'none';
  els.tabQuote.style.background = '#3b82f6'; els.tabQuote.style.color = '#fff';
  els.tabParts.style.background = '#fff'; els.tabParts.style.color = '#111';
}
function showBuild1() {
  els.partsPage.style.display = 'none';
  els.quotePage.style.display = 'none';
  els.buildcase1Page.style.display = 'block';
  els.buildcase2Page.style.display = 'none';
  els.buildcase3Page.style.display = 'none';
  els.tabQuote.style.background = '#3b82f6'; els.tabQuote.style.color = '#fff';
  els.tabParts.style.background = '#fff'; els.tabParts.style.color = '#111';

  const itemsTxt = buildLineItemsText();
  els.notesEstimator.value = itemsTxt;
  state.buildcase.notesEstimator = itemsTxt;
  els.notesCustomer.value = state.buildcase.notesCustomer || '';
  els.bc1ItemsCount.textContent = `Items: ${state.quote.length}`;
}
function showBuild2() {
  els.partsPage.style.display = 'none';
  els.quotePage.style.display = 'none';
  els.buildcase1Page.style.display = 'none';
  els.buildcase2Page.style.display = 'block';
  els.buildcase3Page.style.display = 'none';
  els.tabQuote.style.background = '#3b82f6'; els.tabQuote.style.color = '#fff';
  els.tabParts.style.background = '#fff'; els.tabParts.style.color = '#111';

  if (state.buildcase.routineVisit === 'yes') els.routineYes.checked = true;
  else if (state.buildcase.routineVisit === 'no') els.routineNo.checked = true;

  els.labourHoursNormal.value = state.buildcase.labourHoursNormal || '';
  els.numTechsNormal.value = state.buildcase.numTechsNormal || '';
  els.labourHoursAfter.value = state.buildcase.labourHoursAfter || '';
  els.numTechsAfter.value = state.buildcase.numTechsAfter || '';
}
function showBuild3() {
  els.partsPage.style.display = 'none';
  els.quotePage.style.display = 'none';
  els.buildcase1Page.style.display = 'none';
  els.buildcase2Page.style.display = 'none';
  els.buildcase3Page.style.display = 'block';
  els.tabQuote.style.background = '#3b82f6'; els.tabQuote.style.color = '#fff';
  els.tabParts.style.background = '#fff'; els.tabParts.style.color = '#111';

  const base = dedupeLines(state.buildcase.notesEstimator || '');
  const labour = buildLabourSummary();
  els.notesEstimator3.value = labour ? `${base}\n\n${labour}` : base;

  els.notesCustomer3.value = state.buildcase.notesCustomer || '';
  els.bc3ItemsCount.textContent = `Items: ${state.quote.length}`;
}

/* Tab clicks and buttons */
els.tabParts.addEventListener('click', showPartsPage);
els.tabQuote.addEventListener('click', showQuotePage);
if (els.btnBuildCase) els.btnBuildCase.addEventListener('click', showBuild1);
if (els.btnBackToQuote) els.btnBackToQuote.addEventListener('click', showQuotePage);
if (els.btnBackToQuoteFrom3) els.btnBackToQuoteFrom3.addEventListener('click', showQuotePage);
if (els.btnBackToBuild1) els.btnBackToBuild1.addEventListener('click', showBuild1);
if (els.btnBackToBuild2) els.btnBackToBuild2.addEventListener('click', showBuild2);

/* Continue buttons */
if (els.btnToBuild2) els.btnToBuild2.addEventListener('click', () => {
  state.buildcase.notesCustomer = (els.notesCustomer?.value || '').trim();
  state.buildcase.notesEstimator = dedupeLines((els.notesEstimator?.value || '').trim());
  showBuild2();
});
if (els.btnToBuild3) els.btnToBuild3.addEventListener('click', () => {
  state.buildcase.routineVisit = els.routineYes?.checked ? 'yes' : (els.routineNo?.checked ? 'no' : null);
  state.buildcase.labourHoursNormal = (els.labourHoursNormal?.value || '').trim();
  state.buildcase.numTechsNormal = (els.numTechsNormal?.value || '').trim();
  state.buildcase.labourHoursAfter = (els.labourHoursAfter?.value || '').trim();
  state.buildcase.numTechsAfter = (els.numTechsAfter?.value || '').trim();
  showBuild3();
});

/* Step 3 copy buttons */
if (els.btnCopyNC3) els.btnCopyNC3.addEventListener('click', () => {
  const txt = (els.notesCustomer3?.value || '').trim();
  if (!txt) return toast('Nothing to copy.', false);
  navigator.clipboard.writeText(txt).then(() => toast('Copied.', true)).catch(() => {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('Copied.', true);
  });
});
if (els.btnCopyNE3) els.btnCopyNE3.addEventListener('click', () => {
  const txt = (els.notesEstimator3?.value || '').trim();
  if (!txt) return toast('Nothing to copy.', false);
  navigator.clipboard.writeText(txt).then(() => toast('Copied.', true)).catch(() => {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('Copied.', true);
  });
});

/* ---------- Access control ---------- */
function ensureAccess() {
  const ok = localStorage.getItem('hasAccess');
  if (ok === 'yes') return true;
  const code = prompt('Enter access code:');
  if (code === ACCESS_CODE) { localStorage.setItem('hasAccess', 'yes'); toast('Access granted.', true); return true; }
  toast('Access denied.', false); return false;
}

/* ---------- CSV parse & render ---------- */
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
  renderParts();
}

/* ---------- Parts UI ---------- */
function updateAddToQuoteState() {
  const b = els.addToQuote;
  if (!b) return;
  if (state.selected) {
    b.disabled = false;
    Object.assign(b.style, { opacity:'1', cursor:'pointer', borderColor:'#22c55e', background:'#ecfdf5', color:'#166534' });
  } else {
    b.disabled = true;
    Object.assign(b.style, { opacity:'0.5', cursor:'not-allowed', borderColor:'#d1d5db', background:'#f3f4f6', color:'#9ca3af' });
  }
}
function renderParts() {
  const q = els.q.value.trim().toLowerCase();
  const body = els.tbl; body.innerHTML = '';
  const rows = state.rows.filter(r => !q || Object.values(r).join(' ').toLowerCase().includes(q));
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
    });
    body.appendChild(tr);
  });
  els.count.textContent = rows.length;
}
els.q.addEventListener('input', renderParts);

/* ---------- Quote table ---------- */
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
      if (confirm('Remove this item?')) { state.quote.splice(idx2, 1); renderQuote(); }
    });
    body.appendChild(tr);
  });

  sum.textContent = 'Total: ' + fmtPrice(total);

  // Enable/disable Clear button in grid
  if (els.btnClearQuote) {
    if (state.quote.length) {
      els.btnClearQuote.disabled = false;
      els.btnClearQuote.style.opacity = '1';
      els.btnClearQuote.style.cursor = 'pointer';
    } else {
      els.btnClearQuote.disabled = true;
      els.btnClearQuote.style.opacity = '0.6';
      els.btnClearQuote.style.cursor = 'not-allowed';
    }
  }
}

/* ---------- CSV on start ---------- */
const cachedCsv = localStorage.getItem('parts_csv');
if (cachedCsv) { try { parseCSV(cachedCsv); } catch {} }

/* ---------- Loaders ---------- */
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
    .then(t => { localStorage.setItem('parts_csv', t); parseCSV(t); toast('Loaded shared CSV.', true); })
    .catch(() => toast('Error loading shared file', false));
});
els.clearCache.addEventListener('click', () => {
  localStorage.removeItem('parts_csv');
  state.rows = []; state.quote = []; state.selected = null;
  renderParts(); renderQuote(); updateAddToQuoteState();
  toast('Cache cleared.', true);
});

/* ---------- Quote actions ---------- */
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

/* Manual line */
function setManualBtnEnabled(enabled) {
  const b = els.manualAddBtn;
  b.disabled = !enabled;
  if (enabled) { b.style.borderColor='#22c55e'; b.style.background='#ecfdf5'; b.style.color='#166534'; b.style.opacity='1'; b.style.cursor='pointer'; }
  else { b.style.borderColor='#d1d5db'; b.style.background='#f3f4f6'; b.style.color='#9ca3af'; b.style.opacity='0.6'; b.style.cursor='not-allowed'; }
}
function manualInputsValid() {
  const sup = (els.manualSupplier.value || '').trim();
  const desc = (els.manualDescription.value || '').trim();
  const pn = (els.manualPart.value || '').trim();
  const priceEach = parseFloat((els.manualPrice.value || '').toString().replace(/[^0-9.]/g, ''));
  return !!(sup && desc && pn && !isNaN(priceEach));
}
['manualSupplier','manualDescription','manualPart','manualPrice','manualQty'].forEach(id => {
  const input = els[id]; if (input) input.addEventListener('input', () => setManualBtnEnabled(manualInputsValid()));
});
setManualBtnEnabled(manualInputsValid());

els.manualAddBtn.addEventListener('click', () => {
  const sup = (els.manualSupplier.value || '').trim();
  const desc = (els.manualDescription.value || '').trim();
  const pn = (els.manualPart.value || '').trim();
  const qty = Math.max(1, parseInt(els.manualQty.value, 10) || 1);
  const priceEach = parseFloat((els.manualPrice.value || '').toString().replace(/[^0-9.]/g, ''));
  if (!sup || !desc || !pn || isNaN(priceEach)) return toast('Please fill Supplier, Description, Part # and Price.', false);

  state.quote.push({ SUPPLIER: sup, DESCRIPTION: desc, PARTNUMBER: pn, PRICE: priceEach || 0, qty });
  renderQuote(); toast('Manual line added.', true);

  els.manualSupplier.value=''; els.manualDescription.value=''; els.manualPart.value=''; els.manualPrice.value=''; els.manualQty.value='1';
  setManualBtnEnabled(false);
});

/* Copy quote (with total) */
els.copyQuote.addEventListener('click', () => {
  if (!state.quote.length) return toast('No items to copy.', false);
  let total = 0;
  const lines = state.quote.map(i => {
    const qty = i.qty || 1; total += i.PRICE * qty;
    return `${qty} x ${i.DESCRIPTION} — ${i.PARTNUMBER} — ${fmtPrice(i.PRICE)} each (${i.SUPPLIER} price)`;
  });
  lines.push('', 'Total: ' + fmtPrice(total));
  copyText(lines.join('\n'), 'Quote copied.');
});

/* Copy items only */
els.copyQuoteRaw.addEventListener('click', () => {
  if (!state.quote.length) return toast('No items to copy.', false);
  const lines = state.quote.map(i => {
    const qty = i.qty || 1;
    return `${qty} x ${i.DESCRIPTION} — ${i.PARTNUMBER} — ${fmtPrice(i.PRICE)} each (${i.SUPPLIER} price)`;
  });
  copyText(lines.join('\n'), 'Items copied.');
});

/* Copy for Email PO — grouped by supplier */
els.copyQuoteEmail.addEventListener('click', () => {
  if (!state.quote.length) return toast('No items to copy.', false);
  const job = els.jobNumber?.value.trim() || '';
  const delivery = els.deliveryAddress?.value.trim() || '';

  const groups = new Map();
  state.quote.forEach(item => {
    const clean = cleanSupplierName(item.SUPPLIER);
    if (!groups.has(clean)) groups.set(clean, []);
    groups.get(clean).push(item);
  });

  const lines = [];
  groups.forEach((items, supplier) => {
    const supName = supplier || 'SUPPLIER';
    lines.push(job ? `Please forward a PO to ${supName} for job ${job}` : `Please forward a PO to ${supName} for this job`);
    lines.push('');
    items.forEach(i => {
      const qty = i.qty || 1;
      lines.push(`${qty} x ${i.DESCRIPTION} — ${i.PARTNUMBER} — ${fmtPrice(i.PRICE)} each`);
    });
    if (delivery) { lines.push(''); lines.push(delivery); }
    lines.push('');
  });
  copyText(lines.join('\n').trimEnd(), 'Email PO copied.');
});

/* Clear quote (now in the 2×2 grid) */
els.btnClearQuote.addEventListener('click', () => {
  if (!state.quote.length) return;
  if (confirm('Clear all items?')) {
    state.quote = [];
    renderQuote();
    toast('Quote cleared.', true);
    showPartsPage();
  }
});

/* Clipboard helper */
function copyText(txt, msg) {
  navigator.clipboard?.writeText(txt).then(() => toast(msg, true)).catch(() => {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    toast(msg, true);
  });
}

/* ---------- Start ---------- */
function start() {
  const cachedCsv = localStorage.getItem('parts_csv');
  if (cachedCsv) { try { parseCSV(cachedCsv); } catch {} }
  renderParts();
  renderQuote();
  updateAddToQuoteState();
  showPartsPage();
}
start();
