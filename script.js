// === IMPORT FIREBASE (WAJIB type="module" di HTML) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 IMPORT AUTH
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// === KONFIGURASI FIREBASE (PUNYA KAMU) ===
const firebaseConfig = {
  apiKey: "AIzaSyDaZgJs2CnoRoZ0YkeBpGnrbcQiTJFf0pA",
  authDomain: "avsecpnk.firebaseapp.com",
  projectId: "avsecpnk",
  // catatan: biasanya storageBucket = "avsecpnk.appspot.com"
  storageBucket: "avsecpnk.firebasestorage.app",
  messagingSenderId: "426515134862",
  appId: "1:426515134862:web:466729d66540376a9bccdf",
  measurementId: "G-K2GNG50ZYZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;

// ====== NAVIGASI HALAMAN ======
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add("active");
  }
}

// ====== TAMPILKAN/SEMBUNYIKAN SIDEBAR ======
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const container = document.querySelector(".container");

  if (!sidebar || !container) return;

  const isCollapsed = container.classList.toggle("sidebar-collapsed");
  sidebar.classList.toggle("hidden-sidebar", isCollapsed);
}

// ====== TAMPILKAN/SEMBUNYIKAN FORM "DIAMANKAN" ======
function toggleDiamankan() {
  const box = document.getElementById("diamankanSection");
  if (!box) return;
  box.classList.toggle("hidden");
}

// ====== DATA LOKAL (CACHE DARI FIRESTORE) ======
let dataBarang = [];
let selectedBarangId = null;

// ====== LOGIN / LOGOUT ======
async function handleLoginSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById("loginEmail");
  const passInput  = document.getElementById("loginPassword");
  const errorBox   = document.getElementById("loginError");

  if (!emailInput || !passInput) return;
  if (errorBox) errorBox.textContent = "";

  try {
    const email = emailInput.value;
    const password = passInput.value;

    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log("Login sukses:", cred.user);
    // Tidak perlu panggil showPage di sini, akan di-handle onAuthStateChanged
    e.target.reset();
  } catch (err) {
    console.error("Login gagal:", err);
    if (errorBox) {
      errorBox.textContent = "Login gagal: " + (err.code || "cek email/password");
    }
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    console.log("Logout sukses");
  } catch (err) {
    console.error("Logout gagal:", err);
  }
}

// ====== HANDLER FORM BARANG DIAMANKAN ======
async function handleLostFormSubmit(e) {
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

  await addDoc(collection(db, "barang"), {
    waktuDiamankan,
    shift,
    supervisor,
    namaBarang,
    spesifikasi,
    fotoURL,          // hanya untuk sesi ini, bukan file asli
    status: "Diamankan",
    waktuSerah: "",
    supervisorSerah: "",
    fotoSerah: "",
    createdAt: serverTimestamp()
  });

  e.target.reset();
  muatData();
}

// ====== TAMPILKAN DATA KE TABEL ======
function tampilkanData(filteredData = dataBarang) {
  const tbody = document.querySelector("#tabelBarang tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  filteredData.forEach((barang) => {
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
          ? `<button type="button" onclick="bukaSerahTerima('${barang.id}')">Serah Terima</button>`
          : ""
        }
        <button type="button" onclick="viewDetail('${barang.id}')">View</button>
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
function bukaSerahTerima(id) {
  selectedBarangId = id;
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
  selectedBarangId = null;
}

async function handleSerahFormSubmit(e) {
  e.preventDefault();
  if (!selectedBarangId) return;

  const waktuSerah = document.getElementById("waktuSerah").value;
  const supervisorSerah = document.getElementById("supervisorSerah").value;

  const fotoInput = document.getElementById("fotoSerah");
  let fotoSerah = "";
  if (fotoInput && fotoInput.files && fotoInput.files[0]) {
    fotoSerah = URL.createObjectURL(fotoInput.files[0]);
  }

  await updateDoc(doc(db, "barang", selectedBarangId), {
    waktuSerah,
    supervisorSerah,
    fotoSerah,
    status: "Diserahkan"
  });

  tampilkanData();
  batalSerah();
  e.target.reset();
}

// ====== VIEW DETAIL BARANG ======
function viewDetail(id) {
  const b = dataBarang.find(x => x.id === id);
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

// ====== MUAT DATA DARI FIRESTORE ======
async function muatData() {
  try {
    const res = await getDocs(collection(db, "barang"));
    dataBarang = res.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    tampilkanData();
  } catch (err) {
    console.error("Gagal memuat data:", err);
  }
}

// ====== INIT SETELAH HALAMAN SIAP ======
window.addEventListener("DOMContentLoaded", () => {
  const lostForm    = document.getElementById("lostForm");
  const serahForm   = document.getElementById("serahForm");
  const loginForm   = document.getElementById("loginForm");
  const btnLogout   = document.getElementById("btnLogout");
  const profileBox  = document.getElementById("profileBox");
  const profileEmail = document.getElementById("profileEmail");
  const profileName  = document.getElementById("profileName");

  if (lostForm) {
    lostForm.addEventListener("submit", handleLostFormSubmit);
  }

  if (serahForm) {
    serahForm.addEventListener("submit", handleSerahFormSubmit);
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", handleLogout);
  }

  // sembunyikan sidebar otomatis di layar kecil
  const sidebar = document.querySelector(".sidebar");
  const container = document.querySelector(".container");

  if (window.innerWidth <= 768 && sidebar && container) {
    sidebar.classList.add("hidden-sidebar");
    container.classList.add("sidebar-collapsed");
  }

  // 🔥 Pantau status login
  onAuthStateChanged(auth, (user) => {
    currentUser = user;

    if (user) {
      console.log("User login:", user.email);

      if (btnLogout) btnLogout.classList.remove("hidden");
      if (profileBox) profileBox.classList.remove("hidden");
      if (profileEmail) profileEmail.textContent = user.email || "-";
      if (profileName) profileName.textContent  = user.displayName || "-";

      // setelah login, arahkan ke dashboard/home
      showPage("home");
      muatData();
    } else {
      console.log("Belum login / sudah logout");

      if (btnLogout) btnLogout.classList.add("hidden");
      if (profileBox) profileBox.classList.add("hidden");

      // paksa ke halaman login
      showPage("Login");
    }
  });
});

// ====== EXPOSE FUNGSI KE GLOBAL UNTUK onClick DI HTML ======
window.showPage = showPage;
window.toggleSidebar = toggleSidebar;
window.toggleDiamankan = toggleDiamankan;
window.filterData = filterData;
window.bukaSerahTerima = bukaSerahTerima;
window.batalSerah = batalSerah;
window.viewDetail = viewDetail;
