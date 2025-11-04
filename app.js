/* v5.1.2 +highlight +sortable headers */
const state = {
  rows: [],
  fuse: null,
  sort: { key: 'SUPPLIER', asc: true } // default: Supplier A→Z
};

function toast(msg, ok=false){
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.position='fixed'; t.style.bottom='16px'; t.style.left='50%'; t.style.transform='translateX(-50%)';
  t.style.padding='10px 14px'; t.style.borderRadius='8px';
  t.style.border='1px solid ' + (ok?'#10b981':'#f59e0b');
  t.style.background='#fff'; t.style.boxShadow='0 6px 20px rgba(0,0,0,0.12)';
  t.style.zIndex='9999'; t.style.fontSize='14px';
  document.body.appendChild(t); setTimeout(()=>t.remove(), 2600);
}
toast('Loaded v5.1.2', true);

const els = {
  q: document.getElementById('q'),
  csv: document.getElementById('csv'),
  tbl: document.getElementById('tbl').querySelector('tbody'),
  count: document.getElementById('count'),
  supplierFilter: document.getElementById('supplierFilter'),
  typeFilter: document.getElementById('typeFilter'),
  copyArea: document.getElementById('copyArea'),
  clearCache: document.getElementById('clearCache'),
  h: {
    SUPPLIER:   document.getElementById('h-supplier'),
    DESCRIPTION:document.getElementById('h-description'),
    PARTNUMBER: document.getElementById('h-partnumber'),
    PRICE:      document.getElementById('h-price'),
    NOTES:      document.getElementById('h-notes'),
  }
};

// Load cached CSV if present
const cached = localStorage.getItem('parts_csv');
if (cached) parseCSV(cached);

// Inputs
els.csv.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.csv')) { toast('Please choose a .csv file (not Excel .xlsx)', false); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    localStorage.setItem('parts_csv', text);
    parseCSV(text);
  };
  reader.readAsText(file);
});

els.q.addEventListener('input', render);
els.supplierFilter.addEventListener('input', render);
els.typeFilter.addEventListener('input', render);
els.clearCache.addEventListener('click', () => {
  localStorage.removeItem('parts_csv');
  state.rows = []; state.fuse = null;
  render();
  toast('Cleared cached data.', true);
});

// Sorting header clicks
Object.entries(els.h).forEach(([key, el]) => {
  el.addEventListener('click', () => setSort(key));
});

function setSort(key){
  if (state.sort.key === key) {
    state.sort.asc = !state.sort.asc; // toggle
  } else {
    state.sort.key = key;
    state.sort.asc = true; // new key defaults to ascending
  }
  render();
}

function parseCSV(text) {
  const res = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
  if (!res || !res.data) { toast('Could not parse CSV', false); return; }
  const headers = (res.meta.fields || []).map(h => (h||'').toString().trim());
  const find = (name) => headers.find(h => h.toLowerCase() === name.toLowerCase()) || null;
  const map = {
    supplier: find('SUPPLIER'),
    type: find('TYPE'),
    description: find('DESCRIPTION'),
    partnumber: find('PARTNUMBER'),
    price: find('PRICE'),
    notes: find('NOTES'),
  };
  const required = ['supplier','description','partnumber','price'];
  const missing = required.filter(k => !map[k]);
  if (missing.length) { toast('Missing headers: ' + missing.join(', '), false); return; }

  state.rows = res.data.map((r) => ({
    SUPPLIER: (r[map.supplier] ?? '').toString().trim(),
    TYPE: (map.type ? (r[map.type] ?? '').toString().trim() : ''),
    DESCRIPTION: (r[map.description] ?? '').toString().trim(),
    PARTNUMBER: (r[map.partnumber] ?? '').toString().trim(),
    PRICE: parsePrice(r[map.price]),
    NOTES: (map.notes ? (r[map.notes] ?? '').toString().trim() : ''),
  }));

  if (!state.rows.length) { toast('CSV loaded but contained 0 rows.', false); render(); return; }
  state.fuse = new Fuse(state.rows, {
    threshold: 0.35,
    ignoreLocation: true,
    keys: ['DESCRIPTION','PARTNUMBER','SUPPLIER','TYPE','NOTES']
  });
  render();
}

function parsePrice(val) {
  if (val == null) return '';
  const s = val.toString().replace(/[^0-9.,-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? '' : n;
}

function fmtPrice(n) {
  if (n === '' || n == null || isNaN(n)) return '';
  return '$' + n.toFixed(2);
}

// ---------- highlight helpers ----------
function escapeHTML(s) {
  return s == null ? '' : s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function highlightText(text, tokens) {
  let out = escapeHTML(text ?? '');
  tokens.forEach(tok => {
    if (!tok) return;
    const re = new RegExp(`(${escapeRegExp(tok)})`, 'ig');
    out = out.replace(re, '<mark class="hl">$1</mark>');
  });
  return out;
}

// ---------- sorting ----------
function applySort(rows) {
  const { key, asc } = state.sort;
  const dir = asc ? 1 : -1;
  const norm = (v) => (v ?? '').toString();

  if (key === 'PRICE') {
    return rows.sort((a,b) => {
      const A = (a.PRICE === '' || a.PRICE == null) ? Number.POSITIVE_INFINITY : a.PRICE;
      const B = (b.PRICE === '' || b.PRICE == null) ? Number.POSITIVE_INFINITY : b.PRICE;
      if (A !== B) return (A - B) * dir;
      // tie-breakers
      const s = norm(a.SUPPLIER).localeCompare(norm(b.SUPPLIER), undefined, {numeric:true, sensitivity:'base'});
      if (s !== 0) return s * dir;
      return norm(a.PARTNUMBER).localeCompare(norm(b.PARTNUMBER), undefined, {numeric:true, sensitivity:'base'}) * dir;
    });
  }

  return rows.sort((a,b) => {
    const A = norm(a[key]);
    const B = norm(b[key]);
    const cmp = A.localeCompare(B, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp * dir;
    // tie-breakers for tidy lists
    const s = norm(a.SUPPLIER).localeCompare(norm(b.SUPPLIER), undefined, {numeric:true, sensitivity:'base'});
    if (s !== 0) return s * dir;
    return norm(a.PARTNUMBER).localeCompare(norm(b.PARTNUMBER), undefined, {numeric:true, sensitivity:'base'}) * dir;
  });
}

function renderSortIndicators(){
  const arrows = { true: ' ↑', false: ' ↓' };
  Object.entries(els.h).forEach(([key, el]) => {
    const base = key; // same as header text
    if (state.sort.key === key) {
      el.textContent = base + arrows[state.sort.asc];
    } else {
      el.textContent = base;
    }
  });
}

function render() {
  let rows = state.rows.slice();
  const q = els.q.value.trim();
  const s = els.supplierFilter.value.trim().toLowerCase();
  const t = els.typeFilter.value.trim().toLowerCase();

  // exact-first search across key fields; fallback to fuzzy
  if (q) {
    const qTokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const exact = rows.filter(r => {
      const hay = (
        (r.PARTNUMBER || '') + ' ' +
        (r.DESCRIPTION || '') + ' ' +
        (r.SUPPLIER || '') + ' ' +
        (r.TYPE || '') + ' ' +
        (r.NOTES || '')
      ).toLowerCase();
      return qTokens.every(tok => hay.includes(tok));
    });
    rows = exact.length ? exact : (state.fuse ? state.fuse.search(q).map(x => x.item) : rows);
  }

  if (s) rows = rows.filter(r => r.SUPPLIER.toLowerCase().includes(s));
  if (t) rows = rows.filter(r => r.TYPE.toLowerCase().includes(t));

  // apply current sort choice
  applySort(rows);
  renderSortIndicators();

  // prepare tokens for highlighting
  const tokens = els.q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);

  els.tbl.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${highlightText(r.SUPPLIER, tokens)}</td>
      <td>${highlightText(r.DESCRIPTION, tokens)}</td>
      <td><span class="badge">${highlightText(r.PARTNUMBER, tokens)}</span></td>
      <td>${fmtPrice(r.PRICE)}</td>
      <td class="notes">${highlightText(r.NOTES || '', tokens)}</td>
    `;
    tr.addEventListener('click', () => {
      const priceText = fmtPrice(r.PRICE) ? `${fmtPrice(r.PRICE)} each` : '';
      // NOTES intentionally not included in copy bar
      els.copyArea.textContent = `${r.SUPPLIER} — ${r.DESCRIPTION} — ${r.PARTNUMBER} — ${priceText}`.trim();
      const range = document.createRange();
      range.selectNodeContents(els.copyArea);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    document.getElementById('loadShared').addEventListener('click', () => {
  // If running from GitHub Pages or local server, this will fetch parts.csv
  const url = 'Part Prices Fire App 251104';

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.text();
    })
    .then(text => {
      localStorage.setItem('parts_csv', text);
      parseCSV(text);
      toast('Loaded shared CSV', true);
    })
    .catch(err => {
      toast('Error loading shared file', false);
      console.error(err);
    });
});

    els.tbl.appendChild(tr);
  });
  els.count.textContent = rows.length.toString();
}
