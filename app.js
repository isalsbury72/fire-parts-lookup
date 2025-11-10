  /* Fire Parts Lookup v5.2.1 — shared CSV, highlight, sorting */
const state = { rows: [], fuse: null };
let sortState = { key: 'SUPPLIER', dir: 1 }; // 1 = asc, -1 = desc

// One-time access code for loading shared data
const ACCESS_CODE = 'FP2025'; // change this if you like

function ensureAccess() {
  const ok = localStorage.getItem('hasAccess');
  if (ok === 'yes') return true;

  const entered = prompt('Enter access code to load shared data:');
  if (!entered) {
    toast('Access code required.', false);
    return false;
  }
  if (entered.trim() !== ACCESS_CODE) {
    toast('Incorrect access code.', false);
    return false;
  }

  localStorage.setItem('hasAccess', 'yes');
  toast('Access granted on this device.', true);
  return true;
}

function toast(msg, ok=false){
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', bottom:'16px', left:'50%', transform:'translateX(-50%)',
    padding:'10px 14px', borderRadius:'8px', background:'#fff',
    border:`1px solid ${ok ? '#10b981' : '#f59e0b'}`, boxShadow:'0 6px 20px rgba(0,0,0,0.12)',
    zIndex:'9999', fontSize:'14px'
  });
  document.body.appendChild(t); setTimeout(()=>t.remove(), 2600);
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
  th: {
    SUPPLIER: document.getElementById('thSUPPLIER'),
    DESCRIPTION: document.getElementById('thDESCRIPTION'),
    PARTNUMBER: document.getElementById('thPARTNUMBER'),
    PRICE: document.getElementById('thPRICE'),
    NOTES: document.getElementById('thNOTES'),
  }
};

// Load cached CSV if present
const cached = localStorage.getItem('parts_csv');
if (cached) parseCSV(cached);

const savedLastLoaded = localStorage.getItem('lastLoaded');
if (savedLastLoaded) {
  const el = document.getElementById('lastLoaded');
  if (el) el.textContent = savedLastLoaded;
}

// CSV upload from device
els.csv.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.csv')) {
    toast('Please choose a .csv file (not Excel .xlsx)', false); 
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    localStorage.setItem('parts_csv', text);
    parseCSV(text);
  };
  reader.readAsText(file);
});

// Load shared CSV (parts.csv in same folder / repo)
els.loadShared.addEventListener('click', () => {
  if (!ensureAccess()) return;

  const url = 'Parts.csv';
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.text();
    })
.then(text => {
  localStorage.setItem('parts_csv', text);
  parseCSV(text);
const now = new Date();
const formatted = now.toLocaleString('en-AU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});
document.getElementById('lastLoaded').textContent = formatted;
localStorage.setItem('lastLoaded', formatted);
  toast('Loaded shared CSV', true);
})
    .catch(err => {
      console.error(err);
      toast('Error loading shared file', false);
    });
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
Object.entries(els.th).forEach(([key, thEl]) => {
  thEl.addEventListener('click', () => {
    if (sortState.key === key) {
      sortState.dir = -sortState.dir; // toggle
    } else {
      sortState = { key, dir: 1 };
    }
    render();
  });
});

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
  if (missing.length) {
    toast('Missing headers: ' + missing.join(', '), false);
    return;
  }

  state.rows = res.data.map((r) => ({
    SUPPLIER: (r[map.supplier] ?? '').toString().trim(),
    TYPE: (map.type ? (r[map.type] ?? '').toString().trim() : ''),
    DESCRIPTION: (r[map.description] ?? '').toString().trim(),
    PARTNUMBER: (r[map.partnumber] ?? '').toString().trim(),
    PRICE: parsePrice(r[map.price]),
    NOTES: (map.notes ? (r[map.notes] ?? '').toString().trim() : ''),
  }));

  if (!state.rows.length) { toast('CSV loaded but contained 0 rows.', false); render(); return; }
  state.fuse = new Fuse(state.rows, { threshold: 0.35, ignoreLocation: true, keys: ['DESCRIPTION','PARTNUMBER','SUPPLIER','TYPE','NOTES'] });
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

function escapeHTML(s) {
  return s == null ? '' : s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function escReg(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function highlight(text, tokens){
  if (!text) return '';
  if (!tokens || !tokens.length) return escapeHTML(text);
  const pattern = tokens.map(escReg).join('|');
  const re = new RegExp(pattern, 'gi');
  let last = 0, out = '';
  for (let m; (m = re.exec(text)) !== null; ) {
    out += escapeHTML(text.slice(last, m.index));
    out += `<mark class="hl">${escapeHTML(m[0])}</mark>`;
    last = m.index + m[0].length;
  }
  out += escapeHTML(text.slice(last));
  return out;
}

function applySort(rows){
  const k = sortState.key;
  const dir = sortState.dir;
  const cmp = (a, b) => {
    const av = a?.[k], bv = b?.[k];
    if (k === 'PRICE') {
      const an = typeof av === 'number' ? av : Number.POSITIVE_INFINITY;
      const bn = typeof bv === 'number' ? bv : Number.POSITIVE_INFINITY;
      return (an - bn) * dir;
    }
    const as = (av ?? '').toString();
    const bs = (bv ?? '').toString();
    const res = as.localeCompare(bs, undefined, { numeric:true, sensitivity:'base' });
    return res * dir;
  };
  rows.sort((a,b) => {
    const primary = cmp(a,b);
    if (primary !== 0) return primary;
    const d = (a.DESCRIPTION||'').localeCompare((b.DESCRIPTION||''), undefined, { numeric:true, sensitivity:'base' });
    if (d !== 0) return d;
    return (a.PARTNUMBER||'').localeCompare((b.PARTNUMBER||'', undefined, {numeric:true, sensitivity:'base'}));
  });
}

function setHeaderArrows(){
  Object.entries(els.th).forEach(([key, thEl]) => {
    const span = thEl.querySelector('.arrow');
    if (!span) return;
    span.textContent = '';
    if (sortState.key === key) {
      span.textContent = sortState.dir === 1 ? '▲' : '▼';
    }
  });
}

function render() {
  let rows = state.rows.slice();
  const q = els.q.value.trim();
  const s = els.supplierFilter.value.trim().toLowerCase();
  const t = els.typeFilter.value.trim().toLowerCase();

  let qTokens = [];
  if (q) {
    qTokens = q.toLowerCase().split(/\s+/).filter(Boolean);
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

  applySort(rows);
  setHeaderArrows();

  els.tbl.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${highlight(r.SUPPLIER, qTokens)}</td>
      <td>${highlight(r.DESCRIPTION, qTokens)}</td>
      <td><span class="badge">${highlight(r.PARTNUMBER, qTokens)}</span></td>
      <td>${fmtPrice(r.PRICE)}</td>
      <td class="notes">${highlight(r.NOTES || '', qTokens)}</td>
    `;
    tr.addEventListener('click', () => {
      const priceText = fmtPrice(r.PRICE) ? `${fmtPrice(r.PRICE)} each` : '';
      els.copyArea.textContent = `${r.SUPPLIER} — ${r.DESCRIPTION} — ${r.PARTNUMBER} — ${priceText}`.trim();
      const range = document.createRange();
      range.selectNodeContents(els.copyArea);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    els.tbl.appendChild(tr);
  });
  els.count.textContent = rows.length.toString();
}
