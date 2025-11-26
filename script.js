// === URL Google Apps Script ===
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyYGOOLjwOAShlPnhtvn-0Zlmsmt5nyCFNY8QVqXGN4bTwDr9E5SZsndJtIOwzGBt-8kA/exec";

// ====== NAVIGASI HALAMAN ======
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
  }
}

// ====== TAMPILKAN/SEMBUNYIKAN SIDEBAR ======
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const container = document.querySelector('.container');

  if (!sidebar || !container) return;

  const isCollapsed = container.classList.toggle('sidebar-collapsed');
  sidebar.classList.toggle('hidden-sidebar', isCollapsed);
}

// ====== TAMPILKAN/SEMBUNYIKAN FORM "DIAMANKAN" ======
function toggleDiamankan() {
  const box = document.getElementById('diamankanSection');
  if (!box) return;
  box.classList.toggle('hidden');
}

// ====== DATA PENYIMPANAN (sementara di browser) ======
let dataBarang = [];
let selectedBarangIndex = null;

// ====== HANDLER FORM BARANG DIAMANKAN ======
function handleLostFormSubmit(e) {
  e.preventDefault();

  const waktuDiamankan = document.getElementById("waktuDiamankan").value;
  const shift = document.getElementById("shift").value;
  const supervisor = document.getElementById("supervisor").value;
  const namaBarang = document.getElementById("namaBarang").value;
  const spesifikasi = document.getElementById("spesifikasi").value;
  const fotoInput = document.getElementById("fotoBarang");

  let fotoURL = "";
  if (fotoInput && fotoInput.files && fotoInput.files[0]) {
    fotoURL = URL.createObjectURL(fotoInput.files[0]);
  }

  const data = {
    waktuDiamankan,
    shift,
    supervisor,
    namaBarang,
    spesifikasi,
    fotoURL,
    status: "Diamankan",
    waktuSerah: "",
    supervisorSerah: "",
    fotoSerah: ""
  };

  dataBarang.push(data);

  fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "barangDiamankan",
      waktuDiamankan,
      shift,
      supervisor,
      namaBarang,
      spesifikasi,
      fotoBarang: fotoURL,
      status: "Diamankan"
    }),
  });

  e.target.reset();
  tampilkanData();
}

// ====== TAMPILKAN DATA KE TABEL ======
function tampilkanData(filteredData = dataBarang) {
  const tbody = document.querySelector("#tabelBarang tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  filteredData.forEach((barang, index) => {
    const tr = document.createElement("tr");
    const tglTeks = barang.waktuDiamankan
      ? barang.waktuDiamankan.split("T").join(" ")
      : "";

    tr.innerHTML = `
      <td>${tglTeks}</td>
      <td>${barang.shift || ""}</td>
      <td>${barang.namaBarang || ""}</td>
      <td>${barang.status || ""}</td>
      <td>
        ${barang.status === "Diamankan"
          ? `<button type="button" onclick="bukaSerahTerima(${index})">Serah Terima</button>`
          : ""
        }
        <button type="button" onclick="viewDetail(${index})">View</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ====== FILTER DATA BERDASARKAN TANGGAL & SHIFT ======
function filterData() {
  const tgl = document.getElementById("filterTanggal")?.value || "";
  const shift = document.getElementById("filterShift")?.value || "";

  const hasil = dataBarang.filter(item => {
    const cocokTanggal = tgl
      ? (item.waktuDiamankan || "").startsWith(tgl)
      : true;
    const cocokShift = shift ? item.shift === shift : true;
    return cocokTanggal && cocokShift;
  });

  tampilkanData(hasil);
}

// ====== FORM SERAHTERIMA ======
function bukaSerahTerima(index) {
  selectedBarangIndex = index;
  const box = document.getElementById("serahTerimaBox");
  if (box) {
    box.classList.remove("hidden");
  }
}

function batalSerah() {
  const box = document.getElementById("serahTerimaBox");
  if (box) {
    box.classList.add("hidden");
  }
  selectedBarangIndex = null;
}

function handleSerahFormSubmit(e) {
  e.preventDefault();
  if (selectedBarangIndex === null) return;

  const waktuSerah = document.getElementById("waktuSerah").value;
  const supervisorSerah = document.getElementById("supervisorSerah").value;
  const fotoInput = document.getElementById("fotoSerah");

  let fotoSerah = "";
  if (fotoInput && fotoInput.files && fotoInput.files[0]) {
    fotoSerah = URL.createObjectURL(fotoInput.files[0]);
  }

  const barang = dataBarang[selectedBarangIndex];
  barang.waktuSerah = waktuSerah;
  barang.supervisorSerah = supervisorSerah;
  barang.fotoSerah = fotoSerah;
  barang.status = "Diserahkan";

  fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "serahTerima",
      waktuDiamankan: barang.waktuDiamankan,
      shift: barang.shift,
      supervisor: barang.supervisor,
      namaBarang: barang.namaBarang,
      spesifikasi: barang.spesifikasi,
      fotoBarang: barang.fotoURL,
      waktuSerah,
      supervisorSerah,
      fotoSerah,
      status: "Diserahkan"
    }),
  });

  tampilkanData();
  batalSerah();
  e.target.reset();
}

// ====== VIEW DETAIL BARANG ======
function viewDetail(index) {
  const b = dataBarang[index];
  if (!b) return;

  const modal = document.createElement("div");
  modal.classList.add("modal-overlay");

  modal.innerHTML = `
    <div class="modal-box">
      <h2>Detail Barang Diamankan</h2>
      <p><b>Tanggal & Waktu Diamankan:</b> ${b.waktuDiamankan || "-"}</p>
      <p><b>Shift:</b> ${b.shift || "-"}</p>
      <p><b>Supervisor:</b> ${b.supervisor || "-"}</p>
      <p><b>Nama Barang:</b> ${b.namaBarang || "-"}</p>
      <p><b>Spesifikasi Barang:</b> ${b.spesifikasi || "-"}</p>
      <p><b>Foto Barang:</b><br>${b.fotoURL ? `<img src="${b.fotoURL}" width="200">` : "-"}</p>
      <p><b>Status:</b> ${b.status || "-"}</p>
      ${b.status === "Diserahkan" ? `
        <hr>
        <p><b>Tanggal & Waktu Serah:</b> ${b.waktuSerah || "-"}</p>
        <p><b>Supervisor Serah:</b> ${b.supervisorSerah || "-"}</p>
        <p><b>Foto Serah:</b><br>${b.fotoSerah ? `<img src="${b.fotoSerah}" width="200">` : "-"}</p>
      ` : ""}
      <button type="button" onclick="this.closest('.modal-overlay').remove()">Tutup</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// ====== MUAT DATA DARI GOOGLE SHEETS ======
async function muatData() {
  try {
    const res = await fetch(SCRIPT_URL);
    const data = await res.json();
    dataBarang = Array.isArray(data) ? data : [];
    tampilkanData();
  } catch (err) {
    console.error("Gagal memuat data:", err);
  }
}

// ====== INIT SETELAH HALAMAN SIAP ======
window.addEventListener("DOMContentLoaded", () => {
  const lostForm = document.getElementById("lostForm");
  if (lostForm) {
    lostForm.addEventListener("submit", handleLostFormSubmit);
  }

  const serahForm = document.getElementById("serahForm");
  if (serahForm) {
    serahForm.addEventListener("submit", handleSerahFormSubmit);
  }

  // sembunyikan sidebar otomatis di layar kecil
  const sidebar = document.querySelector('.sidebar');
  const container = document.querySelector('.container');

  if (window.innerWidth <= 768 && sidebar && container) {
    sidebar.classList.add('hidden-sidebar');
    container.classList.add('sidebar-collapsed');
  }

  muatData();
});
