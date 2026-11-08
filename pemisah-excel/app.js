(() => {
  const $ = id => document.getElementById(id);
  const el = {drop:$('drop'),file:$('file'),title:$('dropTitle'),note:$('dropNote'),demo:$('demo'),
    rule:$('rule'),from:$('from'),to:$('to'),list:$('list'),count:$('count'),
    name:$('name'),dl:$('dl'),msg:$('msg'),s1:$('step1'),s2:$('step2'),s3:$('step3')};
  let wb = null, picked = new Set();   // picked = indeks 0-based sheet terpilih

  const say = (t, err) => { el.msg.textContent = t || ''; el.msg.className = 'msg' + (err ? ' err' : ''); };

  function load(buf, label) {
    try {
      wb = XLSX.read(buf, {type:'array', cellStyles:true});
    } catch (e) { wb = null; say('File tidak dapat dibaca: ' + e.message, true); return; }
    const n = wb.SheetNames.length;
    el.title.textContent = label;
    el.note.textContent = n + ' sheet ditemukan';
    el.from.value = 1; el.to.value = n; el.to.placeholder = 'Sampai (' + n + ')';
    el.name.value = label.replace(/\.[^.]+$/, '') + '_terfilter';
    [el.s1, el.s2, el.s3].forEach(f => f.disabled = false);
    say('');
    applyRule();
  }

  function applyRule() {
    if (!wb) return;
    const n = wb.SheetNames.length;
    const lo = Math.max(1, parseInt(el.from.value) || 1);
    const hi = Math.min(n, parseInt(el.to.value) || n);
    picked = new Set();
    for (let i = 1; i <= n; i++) {
      const ok = i >= lo && i <= hi &&
        (el.rule.value === 'all' || (el.rule.value === 'even') === (i % 2 === 0));
      if (ok) picked.add(i - 1);
    }
    render();
  }

  function render() {
    el.list.innerHTML = '';
    wb.SheetNames.forEach((nm, i) => {
      const lab = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = picked.has(i);
      cb.onchange = () => { cb.checked ? picked.add(i) : picked.delete(i); lab.classList.toggle('off', !cb.checked); refresh(); };
      lab.classList.toggle('off', !cb.checked);
      const t = document.createElement('span'); t.textContent = nm;
      const no = document.createElement('span'); no.className = 'num'; no.textContent = '#' + (i + 1);
      lab.append(cb, t, no);
      el.list.append(lab);
    });
    refresh();
  }

  function refresh() {
    el.count.textContent = picked.size + ' dari ' + wb.SheetNames.length + ' dipilih';
    el.dl.disabled = picked.size === 0;
    el.list.querySelectorAll('label').forEach((l, i) => l.classList.toggle('off', !picked.has(i)));
  }

  function setAll(on) {
    picked = new Set(on ? wb.SheetNames.map((_, i) => i) : []);
    el.list.querySelectorAll('input').forEach((c, i) => c.checked = picked.has(i));
    refresh();
  }

  function download() {
    const out = XLSX.utils.book_new();
    [...picked].sort((a, b) => a - b).forEach(i => {
      const nm = wb.SheetNames[i];
      XLSX.utils.book_append_sheet(out, wb.Sheets[nm], nm);
    });
    let fn = (el.name.value.trim() || 'hasil').replace(/[\\/:*?"<>|]/g, '_');
    if (!/\.xlsx$/i.test(fn)) fn += '.xlsx';
    XLSX.writeFile(out, fn);
    say('✔ ' + fn + ' berisi ' + picked.size + ' sheet.');
  }

  function demoBook() {
    const w = XLSX.utils.book_new();
    for (let i = 1; i <= 10; i++) {
      const rows = [['No','Item','Nilai']];
      for (let r = 1; r <= 5; r++) rows.push([r, 'Item ' + i + '-' + r, i * r * 10]);
      XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet(rows), 'Sheet ' + i);
    }
    return XLSX.write(w, {type:'array', bookType:'xlsx'});
  }

  const readFile = f => f && f.arrayBuffer().then(b => load(b, f.name));
  el.file.onchange = () => readFile(el.file.files[0]);
  el.drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.file.click(); } };
  ['dragover','dragenter'].forEach(ev => el.drop.addEventListener(ev, e => { e.preventDefault(); el.drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => el.drop.addEventListener(ev, e => { e.preventDefault(); el.drop.classList.remove('over'); }));
  el.drop.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));
  el.demo.onclick = () => load(demoBook(), 'contoh.xlsx');
  [el.rule, el.from, el.to].forEach(x => x.addEventListener('input', applyRule));
  $('selAll').onclick = () => wb && setAll(true);
  $('selNone').onclick = () => wb && setAll(false);
  el.dl.onclick = download;
})();
