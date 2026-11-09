(() => {
  const $ = id => document.getElementById(id);
  const el = {};
  ['drop','file','dropTitle','dropNote','fileinfo','fn','fm','reset','demo','rule','from','to','kw','name','dl','dlLabel',
   'step1','step3','selAll','invert','selNone','master','stTotal','stSel','stOut','tbody','empty','tbl','pv','pvName','pvNote','pvTbl','toast','stepper']
    .forEach(k => el[k] = $(k));
  let wb = null, picked = new Set(), meta = [], viewing = -1, tt;

  const toast = (t, err) => { el.toast.textContent = t; el.toast.className = 'toast show' + (err ? ' err' : ''); clearTimeout(tt); tt = setTimeout(() => el.toast.classList.remove('show'), 3200); };
  const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  function setStep(s) {
    el.stepper.querySelectorAll('li').forEach(li => {
      const n = +li.dataset.s; li.classList.toggle('active', n === s); li.classList.toggle('done', n < s);
    });
  }

  function load(buf, name, size) {
    let w;
    try { w = XLSX.read(buf, {type:'array', cellStyles:true}); }
    catch (e) { toast('File tidak dapat dibaca: ' + e.message, true); return; }
    if (!w.SheetNames.length) { toast('File tidak memiliki sheet.', true); return; }
    wb = w;
    meta = wb.SheetNames.map(n => {
      const ref = wb.Sheets[n]['!ref'];
      if (!ref) return {rows:0, cols:0};
      const r = XLSX.utils.decode_range(ref);
      return {rows:r.e.r - r.s.r + 1, cols:r.e.c - r.s.c + 1};
    });
    const n = wb.SheetNames.length;
    el.drop.hidden = true; el.fileinfo.hidden = false; el.demo.hidden = true;
    el.fn.textContent = name; el.fn.title = name;
    el.fm.textContent = n + ' sheet' + (size ? ' · ' + fmtSize(size) : '');
    el.from.value = 1; el.to.value = n; el.kw.value = '';
    el.name.value = name.replace(/\.[^.]+$/, '') + '_terfilter';
    el.step1.disabled = el.step3.disabled = false;
    [el.selAll, el.invert, el.selNone, el.master].forEach(b => b.disabled = false);
    el.empty.hidden = true; viewing = -1; el.pv.hidden = true;
    applyRule();
    toast('✔ ' + n + ' sheet berhasil dimuat');
  }

  function applyRule() {
    if (!wb) return;
    const n = wb.SheetNames.length;
    const lo = Math.max(1, parseInt(el.from.value) || 1);
    const hi = Math.min(n, parseInt(el.to.value) || n);
    const kw = el.kw.value.trim().toLowerCase();
    picked = new Set();
    wb.SheetNames.forEach((nm, i) => {
      const no = i + 1;
      const ok = no >= lo && no <= hi &&
        (el.rule.value === 'all' || (el.rule.value === 'even') === (no % 2 === 0)) &&
        (!kw || nm.toLowerCase().includes(kw));
      if (ok) picked.add(i);
    });
    render();
  }

  function render() {
    el.tbody.innerHTML = '';
    wb.SheetNames.forEach((nm, i) => {
      const tr = document.createElement('tr');
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.setAttribute('aria-label', 'Pilih ' + nm);
      cb.onclick = e => { e.stopPropagation(); cb.checked ? picked.add(i) : picked.delete(i); refresh(); };
      const mk = (txt, cls) => { const td = document.createElement('td'); if (cls) td.className = cls; td.textContent = txt; return td; };
      const tdc = document.createElement('td'); tdc.className = 'c'; tdc.append(cb);
      tr.append(tdc, mk(i + 1, 'c'), mk(nm), mk(meta[i].rows, 'r'), mk(meta[i].cols, 'r col-h'));
      tr.title = 'Klik untuk pratinjau';
      tr.onclick = () => preview(i);
      el.tbody.append(tr);
    });
    refresh();
  }

  function refresh() {
    const n = wb.SheetNames.length;
    [...el.tbody.rows].forEach((tr, i) => {
      tr.querySelector('input').checked = picked.has(i);
      tr.classList.toggle('sel', picked.has(i));
      tr.classList.toggle('view', i === viewing);
    });
    el.stTotal.textContent = n; el.stSel.textContent = picked.size; el.stOut.textContent = n - picked.size;
    el.master.checked = picked.size === n; el.master.indeterminate = picked.size > 0 && picked.size < n;
    el.dl.disabled = picked.size === 0;
    el.dlLabel.textContent = picked.size ? 'Unduh Excel baru (' + picked.size + ' sheet)' : 'Pilih minimal 1 sheet';
    setStep(picked.size ? 3 : 2);
  }

  function preview(i) {
    viewing = i;
    const nm = wb.SheetNames[i];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[nm], {header:1, defval:'', blankrows:false});
    const R = rows.slice(0, 8), C = Math.min(8, Math.max(0, ...R.map(r => r.length)));
    el.pvName.textContent = nm;
    el.pvNote.textContent = rows.length ? 'Menampilkan ' + R.length + ' baris × ' + C + ' kolom pertama' : 'Sheet kosong';
    el.pvTbl.innerHTML = '';
    R.forEach((r, ri) => {
      const tr = document.createElement('tr');
      const h = document.createElement('td'); h.textContent = ri + 1; tr.append(h);
      for (let c = 0; c < C; c++) { const td = document.createElement('td'); td.textContent = r[c] ?? ''; tr.append(td); }
      el.pvTbl.append(tr);
    });
    el.pv.hidden = false; refresh();
  }

  function setPicked(fn) { picked = new Set(wb.SheetNames.map((_, i) => i).filter(fn)); refresh(); }

  function download() {
    const out = XLSX.utils.book_new();
    [...picked].sort((a, b) => a - b).forEach(i => XLSX.utils.book_append_sheet(out, wb.Sheets[wb.SheetNames[i]], wb.SheetNames[i]));
    let fn = (el.name.value.trim() || 'hasil').replace(/\.xlsx$/i, '').replace(/[\\/:*?"<>|]/g, '_') + '.xlsx';
    XLSX.writeFile(out, fn);
    toast('✔ ' + fn + ' berisi ' + picked.size + ' sheet');
  }

  function demoBook() {
    const w = XLSX.utils.book_new();
    const bln = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober'];
    bln.forEach((b, i) => {
      const rows = [['No','Uraian','Jumlah','Status']];
      for (let r = 1; r <= 5 + i; r++) rows.push([r, 'Kegiatan ' + b + ' #' + r, (i + 1) * r * 10, r % 2 ? 'Selesai' : 'Proses']);
      XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet(rows), 'Laporan ' + b);
    });
    return XLSX.write(w, {type:'array', bookType:'xlsx'});
  }

  function reset() {
    wb = null; picked = new Set(); meta = []; el.file.value = '';
    el.drop.hidden = false; el.fileinfo.hidden = true; el.demo.hidden = false;
    el.tbody.innerHTML = ''; el.empty.hidden = false; el.pv.hidden = true;
    el.step1.disabled = el.step3.disabled = true;
    [el.selAll, el.invert, el.selNone, el.master].forEach(b => b.disabled = true);
    el.master.checked = false; el.master.indeterminate = false;
    el.stTotal.textContent = el.stSel.textContent = el.stOut.textContent = 0;
    el.dlLabel.textContent = 'Unduh Excel baru'; setStep(1);
  }

  const readFile = f => { if (f) f.arrayBuffer().then(b => load(b, f.name, f.size)); };
  el.file.onchange = () => readFile(el.file.files[0]);
  el.drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.file.click(); } };
  ['dragover','dragenter'].forEach(ev => el.drop.addEventListener(ev, e => { e.preventDefault(); el.drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => el.drop.addEventListener(ev, e => { e.preventDefault(); el.drop.classList.remove('over'); }));
  el.drop.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));
  el.demo.onclick = () => load(demoBook(), 'contoh.xlsx');
  el.reset.onclick = reset;
  [el.rule, el.from, el.to, el.kw].forEach(x => x.addEventListener('input', applyRule));
  el.selAll.onclick = () => setPicked(() => true);
  el.selNone.onclick = () => setPicked(() => false);
  el.invert.onclick = () => setPicked(i => !picked.has(i));
  el.master.onchange = () => setPicked(() => el.master.checked);
  el.dl.onclick = download;
})();
