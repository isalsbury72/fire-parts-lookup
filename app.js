// app.js v5.3.3

const APP_VERSION = '5.3.3';

// ---------- State ----------
let parts = [];          // all parts from CSV
let filtered = [];       // indices into parts after search
let selectedIndex = -1;  // index in filtered
let quoteItems = [];     // {supplier,type,description,part,price,qty,notes}

// ---------- DOM helpers ----------
function $(id) {
  return document.getElementById(id);
}

// ---------- Authorisation banner ----------
function ensureAccess() {
  const banner = $('authBanner');
  const ok = localStorage.getItem('hasAccess');
  if (ok === 'yes') {
    if (banner) banner.style.display = 'inline-flex';
    return true;
  }
  const code = prompt('Enter access code');
  if (code === 'FP2025') {
    localStorage.setItem('hasAccess', 'yes');
    if (banner) banner.style.display = 'inline-flex';
    alert('Access granted');
    return true;
  }
  alert('Access denied');
  return false;
}

// ---------- Parsing & formatting ----------
function parsePrice(raw) {
  if (!raw) return NaN;
  let s = String(raw).trim();
  s = s.replace('$', '').replace(/,/g, '');
  const v = parseFloat(s);
  return isNaN(v) ? NaN : v;
}

function fmtPrice(v) {
  if (isNaN(v)) return '';
  return v.toFixed(2);
}

// Map CSV row to our structure
function mapRow(row) {
  const supplier = (row.SUPPLIER || row.Supplier || '').trim();
  const type = (row.TYPE || row.Type || '').trim();
  const description = (row.DESCRIPTION || row.Description || '').trim();
  const part = (row.PARTNUMBER || row.PartNumber || row['PART NUMBER'] || '').trim();
  const notes = (row.NOTES || row.Notes || '').trim();
  const priceNum = parsePrice(row.PRICE || row.Price);
  return {
    supplier,
    type,
    description,
    part,
    price: priceNum,
    notes
  };
}

// For display in yellow copy area and quote lines
function formatPartLine(p) {
  const priceText = isNaN(p.price) ? '' : `$${fmtPrice(p.price)}`;
  return `${p.description} — ${p.part} — ${priceText}`;
}

// ---------- CSV load & cache ----------
function parseCSV(text) {
  Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      parts = res.data.map(mapRow).filter(p =>
        p.supplier || p.description || p.part
      );
      // sort by supplier then description
      parts.sort((a, b) => {
        const sa = a.supplier.toLowerCase();
        const sb = b.supplier.toLowerCase();
        if (sa < sb) return -1;
        if (sa > sb) return 1;
        const da = a.description.toLowerCase();
        const db = b.description.toLowerCase();
        if (da < db) return -1;
        if (da > db) return 1;
        return 0;
      });
      filtered = parts.map((_, i) => i);
      selectedIndex = -1;
      localStorage.setItem('parts_csv', text);

      const stamp = new Date();
      const dd = String(stamp.getDate()).padStart(2, '0');
      const mm = String(stamp.getMonth() + 1).padStart(2, '0');
      const yyyy = stamp.getFullYear();
      const hh = String(stamp.getHours()).padStart(2, '0');
      const mi = String(stamp.getMinutes()).padStart(2, '0');
      const nice = `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
      localStorage.setItem('lastLoaded', nice);
      const lastEl = $('lastLoaded');
      if (lastEl) lastEl.textContent = nice;

      renderTable();
    }
  });
}

function loadCachedCSV() {
  const cached = localStorage.getItem('parts_csv');
  if (cached) {
    parseCSV(cached);
  }
}

// ---------- Quote persistence ----------
function saveQuoteState() {
  try {
    localStorage.setItem('quote_items_v1', JSON.stringify(quoteItems));
    const jobInput = $('jobNumber');
    const delSel = $('deliveryAddress');
    if (jobInput) localStorage.setItem('quote_job', jobInput.value || '');
    if (delSel) localStorage.setItem('quote_delivery', delSel.value || '');
  } catch (e) {
    console.error('Failed to save quote state', e);
  }
}

function loadQuoteState() {
  try {
    const raw = localStorage.getItem('quote_items_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        quoteItems = parsed;
      }
    }
    const job = localStorage.getItem('quote_job');
    const del = localStorage.getItem('quote_delivery');
    if (job && $('jobNumber')) $('jobNumber').value = job;
    if (del && $('deliveryAddress')) $('deliveryAddress').value = del;
  } catch (e) {
    console.error('Failed to load quote state', e);
  }
}

// ---------- Search ----------
function applySearch() {
  const q = ($('q').value || '').trim().toLowerCase();
  if (!q) {
    filtered = parts.map((_, i) => i);
  } else {
    const tokens = q.split(/\s+/).filter(Boolean);
    filtered = parts
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => {
        const hay = [
          p.supplier,
          p.type,
          p.description,
          p.part
        ].join(' ').toLowerCase();
        // all tokens must appear
        return tokens.every(t => hay.includes(t));
      })
      .map(x => x.idx);
  }
  selectedIndex = -1;
  $('copyArea').textContent = '';
  setAddToQuoteEnabled(false);
  renderTable();
}

// ---------- Table render & selection ----------
function renderTable() {
  const tbody = $('tbl').querySelector('tbody');
  tbody.innerHTML = '';
  $('count').textContent = filtered.length;

  filtered.forEach((idx, pos) => {
    const p = parts[idx];
    const tr = document.createElement('tr');
    tr.dataset.index = String(pos);

    if (pos === selectedIndex) {
      tr.style.background = '#fef9c3'; // light yellow
    }

    function td(text, cls) {
      const cell = document.createElement('td');
      if (cls) cell.className = cls;
      cell.textContent = text || '';
      return cell;
    }

    const priceText = isNaN(p.price) ? '' : `$${fmtPrice(p.price)}`;

    tr.appendChild(td(p.supplier));
    tr.appendChild(td(p.type || ''));
    tr.appendChild(td(p.description));
    tr.appendChild(td(p.part));
    tr.appendChild(td(priceText));
    tr.appendChild(td(p.notes || '', 'notes'));

    tr.addEventListener('click', () => {
      selectedIndex = pos;
      // update highlight
      Array.from(tbody.children).forEach((row, i) => {
        row.style.background = (i === selectedIndex) ? '#fef9c3' : '';
      });
      // update yellow copy area
      const part = parts[filtered[selectedIndex]];
      $('copyArea').textContent = formatPartLine(part);
      setAddToQuoteEnabled(true);
    });

    tbody.appendChild(tr);
  });
}

function setAddToQuoteEnabled(on) {
  const btn = $('addToQuote');
  if (!btn) return;
  if (on) {
    btn.disabled = false;
    btn.style.background = '#eff6ff';
    btn.style.color = '#1d4ed8';
    btn.style.borderColor = '#2563eb';
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true;
    btn.style.background = '#f3f4f6';
    btn.style.color = '#9ca3af';
    btn.style.borderColor = '#d1d5db';
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  }
}

// ---------- Quote handling ----------
function addSelectedToQuote() {
  if (selectedIndex < 0 || selectedIndex >= filtered.length) return;
  const part = parts[filtered[selectedIndex]];
  if (!part) return;

  const existing = quoteItems.find(q =>
    q.supplier === part.supplier &&
    q.description === part.description &&
    q.part === part.part &&
    q.price === part.price
  );
  if (existing) {
    existing.qty += 1;
  } else {
    quoteItems.push({
      supplier: part.supplier,
      type: part.type,
      description: part.description,
      part: part.part,
      price: part.price,
      qty: 1,
      notes: part.notes || ''
    });
  }
  renderQuoteTable();
  showQuoteTab();
}

function renderQuoteTable() {
  const tbody = $('quoteTable').querySelector('tbody');
  tbody.innerHTML = '';

  let total = 0;

  quoteItems.forEach((item, idx) => {
    const tr = document.createElement('tr');

    const tdQty = document.createElement('td');
    const inputQty = document.createElement('input');
    inputQty.type = 'number';
    inputQty.min = '1';
    inputQty.value = String(item.qty);
    inputQty.style.width = '52px';
    inputQty.addEventListener('change', () => {
      let q = parseInt(inputQty.value, 10);
      if (!q || q < 1) q = 1;
      item.qty = q;
      renderQuoteTable();
    });
    tdQty.appendChild(inputQty);
    tr.appendChild(tdQty);

    const tdSup = document.createElement('td');
    tdSup.textContent = item.supplier || '';
    tr.appendChild(tdSup);

    const tdDesc = document.createElement('td');
    tdDesc.textContent = item.description || '';
    tr.appendChild(tdDesc);

    const tdPart = document.createElement('td');
    tdPart.textContent = item.part || '';
    tr.appendChild(tdPart);

    const tdLine = document.createElement('td');
    const line = (item.price || 0) * item.qty;
    if (!isNaN(line)) {
      tdLine.textContent = `$${fmtPrice(line)}`;
      total += line;
    } else {
      tdLine.textContent = '';
    }
    tr.appendChild(tdLine);

    const tdRemove = document.createElement('td');
    const btnRem = document.createElement('button');
    btnRem.textContent = '✕';
    btnRem.className = 'btn btn-ghost';
    btnRem.style.padding = '4px 8px';
    btnRem.addEventListener('click', () => {
      quoteItems.splice(idx, 1);
      renderQuoteTable();
    });
    tdRemove.appendChild(btnRem);
    tr.appendChild(tdRemove);

    tbody.appendChild(tr);
  });

  $('quoteSummary').textContent = `Total: $${fmtPrice(total)}`;

  const hasItems = quoteItems.length > 0;
  ['copyQuote', 'copyQuoteRaw', 'copyQuoteEmail', 'btnClearQuote', 'btnBuildCase', 'btnEmailDraft']
    .forEach(id => {
      const b = $(id);
      if (!b) return;
      b.disabled = !hasItems;
      b.classList.toggle('disabled', !hasItems && b.classList.contains('action-btn'));
    });

  saveQuoteState();
}

// ---------- Supplier helpers ----------
function baseSupplierName(s) {
  if (!s) return '';
  const trimmed = s.trim();
  if (trimmed.toLowerCase().endsWith('2025')) {
    const without = trimmed.slice(0, -4).trim();
    if (without) return without;
  }
  return trimmed;
}

function firstWord(s) {
  if (!s) return '';
  return s.trim().split(/\s+/)[0];
}

// Items-only with "(Supplier price list)" suffix
function buildItemsOnlyText() {
  return quoteItems.map(item => {
    const priceText = isNaN(item.price) ? '' : `$${fmtPrice(item.price)}`;
    const supplierLabel = baseSupplierName(item.supplier);
    return `${item.qty} x ${item.description} — ${item.part} — ${priceText} each (${supplierLabel} price list)`;
  }).join('\n');
}

// ---------- Clipboard ----------
async function copyText(text, okMsg = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    console.log(okMsg);
  } catch (e) {
    console.error('Clipboard failed', e);
    alert('Could not copy to clipboard');
  }
}

// ---------- Tabs ----------
function showPartsTab() {
  $('partsPage').style.display = '';
  $('quotePage').style.display = 'none';
  $('buildcase1Page').style.display = 'none';
  $('buildcase2Page').style.display = 'none';
  $('buildcase3Page').style.display = 'none';
  $('tabParts').style.background = '#eff6ff';
  $('tabParts').style.borderColor = '#2563eb';
  $('tabQuote').style.background = '#fff';
  $('tabQuote').style.borderColor = '#d1d5db';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showQuoteTab() {
  $('partsPage').style.display = 'none';
  $('quotePage').style.display = '';
  $('buildcase1Page').style.display = 'none';
  $('buildcase2Page').style.display = 'none';
  $('buildcase3Page').style.display = 'none';
  $('tabQuote').style.background = '#eff6ff';
  $('tabQuote').style.borderColor = '#2563eb';
  $('tabParts').style.background = '#fff';
  $('tabParts').style.borderColor = '#d1d5db';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showBuildCaseStep(step) {
  $('partsPage').style.display = 'none';
  $('quotePage').style.display = 'none';
  $('buildcase1Page').style.display = step === 1 ? '' : 'none';
  $('buildcase2Page').style.display = step === 2 ? '' : 'none';
  $('buildcase3Page').style.display = step === 3 ? '' : 'none';

  $('tabParts').style.background = '#fff';
  $('tabParts').style.borderColor = '#d1d5db';
  $('tabQuote').style.background = '#fff';
  $('tabQuote').style.borderColor = '#d1d5db';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- Build case helpers ----------
function populateBuildCaseFromQuote() {
  const itemsText = buildItemsOnlyText();
  $('notesEstimator').value = itemsText;
  $('bc1ItemsCount').textContent = `Items: ${quoteItems.length}`;
}

function buildLabourSummary() {
  const ntH = parseFloat($('labourHoursNormal').value) || 0;
  const ntT = parseInt($('numTechsNormal').value, 10) || 0;
  const ntTr = parseFloat($('travelHoursNormal').value) || 0;

  const ahH = parseFloat($('labourHoursAfter').value) || 0;
  const ahT = parseInt($('numTechsAfter').value, 10) || 0;
  const ahTr = parseFloat($('travelHoursAfter').value) || 0;

  const accom = parseInt($('accomNights').value, 10) || 0;

  const lines = [];
  let totalHours = 0;

  if (ntH && ntT) {
    lines.push(`${ntH} hours ${ntT} men NT`);
    totalHours += ntH * ntT;
  }
  if (ahH && ahT) {
    lines.push(`${ahH} hours ${ahT} men AH`);
    totalHours += ahH * ahT;
  }
  if (ntTr && ntT) {
    lines.push(`${ntTr} hours ${ntT} men NT Travel`);
    totalHours += ntTr * ntT;
  }
  if (ahTr && ahT) {
    lines.push(`${ahTr} hours ${ahT} men AH Travel`);
    totalHours += ahTr * ahT;
  }

  if (lines.length > 0) {
    lines.push('');
    lines.push(`Total labour: ${totalHours} hours`);
  }

  if (accom > 0) {
    lines.push('');
    lines.push(`${accom} x Overnight accommodation`);
  }

  const yes = $('routineYes').checked;
  const no = $('routineNo').checked;
  if (yes) {
    lines.push('Can be completed on routine visit');
  } else {
    lines.push('Not intended to be completed on routine visit');
  }

  return lines.join('\n');
}

// ---------- Email PO formats ----------
function buildGroupedEmailBlocks() {
  const groups = new Map(); // key: first word(lower) => {label, items[]}
  quoteItems.forEach(item => {
    const base = baseSupplierName(item.supplier);
    const key = firstWord(base).toLowerCase();
    if (!key) return;
    if (!groups.has(key)) {
      groups.set(key, { label: baseSupplierName(base), items: [] });
    }
    groups.get(key).items.push(item);
  });

  const job = ($('jobNumber').value || '').trim();
  const delivery = ($('deliveryAddress').value || '').trim();

  const blocks = [];

  for (const [key, group] of groups.entries()) {
    const label = baseSupplierName(group.label);
    const hasJob = job.length > 0;

    const subjectLine = hasJob
      ? `PO for job ${job}`
      : `PO request`;

    const headerLine = hasJob
      ? `Please forward a PO to ${label} for job ${job}`
      : `Please forward a PO to ${label} for the following items`;

    const itemsText = group.items.map(item => {
      const priceText = isNaN(item.price) ? '' : `$${fmtPrice(item.price)}`;
      return `${item.qty} x ${item.description} — ${item.part} — ${priceText} each`;
    }).join('\n');

    const blockParts = [
      subjectLine,
      '',
      headerLine,
      '',
      itemsText
    ];

    if (delivery) {
      blockParts.push('');
      blockParts.push(delivery);
    }

    blocks.push(blockParts.join('\n'));
  }

  return blocks;
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  ensureAccess();

  // Show existing lastLoaded if present
  const savedLast = localStorage.getItem('lastLoaded');
  if (savedLast && $('lastLoaded')) {
    $('lastLoaded').textContent = savedLast;
  }

  loadCachedCSV();
  loadQuoteState();

  // Search
  $('q').addEventListener('input', applySearch);

  // Local CSV
  $('csv').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target.result);
    reader.readAsText(file);
  });

  // Load shared CSV from same origin
  $('loadShared').addEventListener('click', () => {
    fetch('Parts.csv')
      .then(resp => {
        if (!resp.ok) throw new Error('Network not ok');
        return resp.text();
      })
      .then(text => parseCSV(text))
      .catch(() => alert('Could not load shared Parts.csv'));
  });

  // Clear cache
  $('clearCache').addEventListener('click', () => {
    if (!confirm('Clear loaded CSV and reset?')) return;
    localStorage.removeItem('parts_csv');
    localStorage.removeItem('lastLoaded');
    parts = [];
    filtered = [];
    selectedIndex = -1;
    $('copyArea').textContent = '';
    setAddToQuoteEnabled(false);
    renderTable();
    const lastEl = $('lastLoaded');
    if (lastEl) lastEl.textContent = 'never';
  });

  // Copy selected part line
  $('copyPartLine').addEventListener('click', () => {
    const text = $('copyArea').textContent || '';
    if (!text) return;
    copyText(text);
  });

  // Add to quote
  $('addToQuote').addEventListener('click', addSelectedToQuote);

  // Tabs
  $('tabParts').addEventListener('click', showPartsTab);
  $('tabQuote').addEventListener('click', showQuoteTab);

  // Manual item toggle
  $('manualToggle').addEventListener('change', () => {
    const on = $('manualToggle').checked;
    $('manualSection').style.display = on ? 'block' : 'none';
  });

  // Manual item add
  $('manualAddBtn').addEventListener('click', () => {
    const sup = $('manualSupplier').value.trim();
    const desc = $('manualDescription').value.trim();
    const part = $('manualPart').value.trim();
    const priceRaw = $('manualPrice').value.trim();
    const qtyVal = parseInt($('manualQty').value, 10) || 1;
    if (!sup || !desc || !part || !priceRaw) {
      alert('Please fill supplier, description, part and price.');
      return;
    }
    const price = parsePrice(priceRaw);
    quoteItems.push({
      supplier: sup,
      type: '',
      description: desc,
      part,
      price,
      qty: qtyVal,
      notes: ''
    });
    $('manualSupplier').value = '';
    $('manualDescription').value = '';
    $('manualPart').value = '';
    $('manualPrice').value = '';
    $('manualQty').value = '1';
    renderQuoteTable();
  });

  // Persist job / delivery changes
  $('jobNumber').addEventListener('input', saveQuoteState);
  $('deliveryAddress').addEventListener('change', saveQuoteState);

  // Copy full quote (with total)
  $('copyQuote').addEventListener('click', () => {
    if (!quoteItems.length) return;
    const itemsText = buildItemsOnlyText();
    const total = quoteItems.reduce((sum, i) =>
      sum + ((i.price || 0) * i.qty), 0
    );
    const full = `${itemsText}\n\nTotal: $${fmtPrice(total)}`;
    copyText(full);
  });

  // Copy items only
  $('copyQuoteRaw').addEventListener('click', () => {
    if (!quoteItems.length) return;
    const txt = buildItemsOnlyText();
    copyText(txt);
  });

  // Copy for Email PO (subject + body, grouped by supplier)
  $('copyQuoteEmail').addEventListener('click', () => {
    if (!quoteItems.length) return;
    const blocks = buildGroupedEmailBlocks();
    const txt = blocks.join('\n\n');
    copyText(txt);
  });

  // Clear quote & go back to parts
  $('btnClearQuote').addEventListener('click', () => {
    if (!quoteItems.length) return;
    if (!confirm('Clear all quote items?')) return;
    quoteItems = [];
    renderQuoteTable();
    showPartsTab();
  });

  // Build case
  $('btnBuildCase').addEventListener('click', () => {
    if (!quoteItems.length) return;
    populateBuildCaseFromQuote();
    showBuildCaseStep(1);
  });

  $('btnBackToQuote').addEventListener('click', showQuoteTab);
  $('btnToBuild2').addEventListener('click', () => showBuildCaseStep(2));
  $('btnBackToBuild1').addEventListener('click', () => showBuildCaseStep(1));
  $('btnToBuild3').addEventListener('click', () => {
    const nc1 = $('notesCustomer').value || '';
    const ne1 = $('notesEstimator').value || buildItemsOnlyText();
    const labour = buildLabourSummary();

    $('notesCustomer3').value = nc1;
    $('notesEstimator3').value = ne1
      ? `${ne1}\n\n${labour}`
      : labour;

    $('bc3ItemsCount').textContent = `Items: ${quoteItems.length}`;
    showBuildCaseStep(3);
  });
  $('btnBackToBuild2').addEventListener('click', () => showBuildCaseStep(2));
  $('btnBackToQuoteFrom3').addEventListener('click', showQuoteTab);

  // Copy buttons on Step 3
  $('btnCopyNC3').addEventListener('click', () => {
    const txt = $('notesCustomer3').value || '';
    if (!txt) return;
    copyText(txt);
  });
  $('btnCopyNE3').addEventListener('click', () => {
    const txt = $('notesEstimator3').value || '';
    if (!txt) return;
    copyText(txt);
  });

  // Open email draft (mailto)
  $('btnEmailDraft').addEventListener('click', () => {
    if (!quoteItems.length) return;
    const blocks = buildGroupedEmailBlocks();
    if (!blocks.length) return;

    const job = ($('jobNumber').value || '').trim();
    const hasJob = job.length > 0;
    const subject = hasJob ? `PO for job ${job}` : 'PO request';

    const body = blocks[0]; // first supplier group
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });

  // Settings / diagnostics – export debug info
  const dbgBtn = $('btnExportDebug');
  if (dbgBtn) {
    dbgBtn.addEventListener('click', () => {
      const debug = {
        version: APP_VERSION,
        lastLoaded: localStorage.getItem('lastLoaded') || null,
        hasPartsCSV: !!localStorage.getItem('parts_csv'),
        quoteItemsCount: quoteItems.length,
        jobNumber: $('jobNumber') ? $('jobNumber').value : '',
        deliveryAddress: $('deliveryAddress') ? $('deliveryAddress').value : ''
      };
      copyText(JSON.stringify(debug, null, 2), 'Debug info copied');
    });
  }

  // Initial render of quote table from loaded state
  renderQuoteTable();
});
