/* Fire Parts Lookup v5.2.2 — Build Case steps, carry-over line items, routine visit & labour fields, manual lines, email PO */

const state = {
  rows: [],
  selected: null,
  quote: [],
  buildcase: {
    notesCustomer: '',
    notesEstimator: '',
    routineVisit: null, // 'yes' | 'no'
    labourHours: '',
    numTechs: '',
    timeType: null // 'normal' | 'afterhours'
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
function buildLineItemsText() {
  if (!state.quote.length) return '';
  return state.quote.map(i => {
    const qty = i.qty || 1;
    return `${qty} x ${i.DESCRIPTION} — ${i.PARTNUMBER} — ${fmtPrice(i.PRICE)} each`;
  }).join('\n');
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
  // Buildcase step buttons + fields
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
  labourHours: document.getElementById('labourHours'),
  numTechs: document.getElementById('numTechs'),
  timeNormal: document.getElementById('timeNormal'),
  timeAfter: document.getElementById('timeAfter')
};

/* ---------- Navigation ---------- */
function showPartsPage() {
  els.partsPage.style.display = 'block';
  els.quotePage.style.display = 'none';
  els.buildcase1Page.style.display = 'none';
  els.buildcase2Page.style.display = 'none';
  els.buildcase3Page.style.display = 'none';
  els.tabParts.style.background = '#3b82f6';
  els.tabParts.style.color = '#fff';
  els.tabQuote.style.background = '#fff';
  els.tabQuote.style.color = '#111';
}
function showQuotePage() {
  els.partsPage.style.display = 'none';
  els.quotePage.style.display = 'block';
  els.buildcase1Page.style.display = 'none';
  els.buildcase2Page.style.display = 'none';
  els.buildcase3Page.style.display = 'none';
  els.tabQuote.style.background = '#3b82f6';
  els.tabQuote.style.color = '#fff';
  els.tabParts.style.background = '#fff';
  els.tabParts.style.color = '#111';
}
function showBuild1() {
  els.partsPage.style.display = 'none';
  els.quotePage.style.display = 'none';
  els.buildcase1Page.style.display = 'block';
  els.buildcase2Page.style.display = 'none';
  els.buildcase3Page.style.display = 'none';
  els.tabQuote.style.background = '#3b82f6';
  els.tabQuote.style.color = '#fff';
  els.tabParts.style.background = '#fff';
  els.tabParts.style.color = '#111';

  // Prefill: notes to estimator with line items, notes to customer from state
  const itemsTxt = buildLineItemsText();
  if (els.notesEstimator) {
    els.notesEstimator.value = itemsTxt;
    state.buildcase.notesEstimator = itemsTxt;
  }
  if (els.bc1ItemsCount) {
    els.bc1ItemsCount.textContent = `Items: ${state.quote.length}`;
  }
  if (els.notesCustomer) {
    els.notesCustomer.value = state.buildcase.notesCustomer || '';
  }
}
function showBuild2() {
  els.partsPage.style.display = 'none';
  els.quotePage.style.display = 'none';
  els.buildcase1Page.style.display = 'none';
  els.buildcase2Page.style.display = 'block';
  els.buildcase3Page.style.display = 'none';
  els.tabQuote.style.background = '#3b82f6';
  els.tabQuote.style.color = '#fff';
  els.tabParts.style.background = '#fff';
  els.tabParts.style.color = '#111';

  // Restore previous selections if any
  if (state.buildcase.routineVisit === 'yes') els.routineYes.checked = true;
  else if (state.buildcase.routineVisit === 'no') els.routineNo.checked = true;

  els.labourHours.value = state.buildcase.labourHours || '';
  els.numTechs.value = state.buildcase.numTechs || '';

  if (state.buildcase.timeType === 'normal') els.timeNormal.checked = true;
  else if (state.buildcase.timeType === 'afterhours') els.timeAfter.checked = true;
}
function showBuild3() {
  els.partsPage.style.display = 'none';
  els.quotePage.style.display = 'none';
  els.buildcase1Page.style.display = 'none';
  els.buildcase2Page.style.display = 'none';
  els.buildcase3Page.style.display = 'block';
  els.tabQuote.style.background = '#3b82f6';
  els.tabQuote.style.color = '#fff';
  els.tabParts.style.background = '#fff';
  els.tabParts.style.color = '#111';

  // Prefill from state + include line items again
  if (els.notesCustomer3) {
    els.notesCustomer3.value = state.buildcase.notesCustomer || '';
  }
  const itemsTxt = buildLineItemsText();
  if (els.notesEstimator3) {
    const base = state.buildcase.notesEstimator || '';
    els.notesEstimator3.value = base ? `${base}\n\n${itemsTxt}` : itemsTxt;
  }
  if (els.bc3ItemsCount) {
    els.bc3ItemsCount.textContent = `Items: ${state.quote.length}`;
  }
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
  // Save step 1 notes
  state.buildcase.notesCustomer = (els.notesCustomer?.value || '').trim();
  state.buildcase.notesEstimator = (els.notesEstimator?.value || '').trim();
  showBuild2();
});
if (els.btnToBuild3) els.btnToBuild3.addEventListener('click', () => {
  // Save step 2 selections
  state.buildcase.routineVisit = els.routineYes?.checked ? 'yes' : (els.routineNo?.checked ? 'no' : null);
  state.buildcase.labourHours = (els.labourHours?.value || '').trim();
  state.buildcase.numTechs = (els.numTechs?.value || '').trim();
  state.buildcase.timeType = els.timeNormal?.checked ? 'normal' : (els.timeAfter?.checked ? 'afterhours' : null);
  showBuild3();
});

/* ---------- Access control ---------- */
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

/* ---------- Clipboard ---------- */
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
      els.copyArea.textContent =
        `${r.SUPPLIER} — ${r.DESCRIPTION} — ${r.PARTNUMBER} — ${fmtPrice(r.PRICE)} each`;
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
      if (confirm('Remove this item?')) {
        state.quote.splice(idx2, 1);
        renderQuote();
      }
    });
    body.appendChild(tr);
  });

  sum.textContent = 'Total: ' + fmtPrice(total);

  // Clear Quote button (dynamic)
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
  } else if (!state.quote.length && btnClear) btnClear.remove();
}

/* ---------- Load cached CSV on start ---------- */
const cachedCsv = localStorage.getItem('parts_csv');
if (cachedCsv) { try { parseCSV(cachedCsv); } catch {} }

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
  renderParts();
  renderQuote();
  updateAddToQuoteState();
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

if (els.btnBuildCase) els.btnBuildCase.addEventListener('click', showBuild1);

/* Manual line controls */
function setManualBtnEnabled(enabled) {
  if (!els.manualAddBtn) return;
  els.manualAddBtn.disabled = !enabled;
  if (enabled) {
    els.manualAddBtn.style.borderColor = '#22c55e';
    els.manualAddBtn.style.background = '#ecfdf5';
    els.manualAddBtn.style.color = '#166534';
    els.manualAddBtn.style.opacity = '1';
    els.manualAddBtn.style.cursor = 'pointer';
  } else {
    els.manualAddBtn.style.borderColor = '#d1d5db';
    els.manualAddBtn.style.background = '#f3f4f6';
    els.manualAddBtn.style.color = '#9ca3af';
    els.manualAddBtn.style.opacity = '0.6';
    els.manualAddBtn.style.cursor = 'not-allowed';
  }
}
function manualInputsValid() {
  const sup = (els.manualSupplier.value || '').trim();
  const desc = (els.manualDescription.value || '').trim();
  const pn = (els.manualPart.value || '').trim();
  const priceEach = parseFloat((els.manualPrice.value || '').toString().replace(/[^0-9.]/g, ''));
  return !!(sup && desc && pn && !isNaN(priceEach));
}
['manualSupplier','manualDescription','manualPart','manualPrice','manualQty'].forEach(id => {
  const input = els[id];
  if (input) input.addEventListener('input', () => setManualBtnEnabled(manualInputsValid()));
});
setManualBtnEnabled(manualInputsValid());

if (els.manualAddBtn) {
  els.manualAddBtn.addEventListener('click', () => {
    const sup = (els.manualSupplier.value || '').trim();
    const desc = (els.manualDescription.value || '').trim();
    const pn = (els.manualPart.value || '').trim();
    const qty = Math.max(1, parseInt(els.manualQty.value, 10) || 1);
    const priceEach = parseFloat((els.manualPrice.value || '').toString().replace(/[^0-9.]/g, ''));

    if (!sup || !desc || !pn || isNaN(priceEach)) {
      return toast('Please fill Supplier, Description, Part # and Price.', false);
    }

    state.quote.push({ SUPPLIER: sup, DESCRIPTION: desc, PARTNUMBER: pn, PRICE: priceEach || 0, qty });
    renderQuote();
    toast('Manual line added.', true);

    // Clear + disable
    els.manualSupplier.value = '';
    els.manualDescription.value = '';
    els.manualPart.value = '';
    els.manualPrice.value = '';
    els.manualQty.value = '1';
    setManualBtnEnabled(false);
  });
}

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

/* Copy for Email PO — grouped by supplier (no price-list suffix, 2025 cleaned) */
els.copyQuoteEmail.addEventListener('click', () => {
  if (!state.quote.length) return toast('No items to copy.', false);
  const job = els.jobNumber?.value.trim() || '';
  const delivery = els.deliveryAddress?.value.trim() || '';

  // group by supplier
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
    if (delivery) {
      lines.push('');
      lines.push(delivery);
    }
    lines.push(''); // blank line between groups
  });
  copyText(lines.join('\n').trimEnd(), 'Email PO copied.');
});

/* Copy yellow line */
if (els.copyPartLine) {
  els.copyPartLine.addEventListener('click', () => {
    const txt = els.copyArea?.textContent.trim() || '';
    if (!txt) return toast('No part selected.', false);
    copyText(txt, 'Part line copied.');
  });
}

/* ---------- Start-up ---------- */
function start() {
  renderParts();
  renderQuote();
  updateAddToQuoteState();
  showPartsPage();
}
start();
