// === FIREBASE MODULE IMPORT ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, updateDoc, doc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// === MASUKKAN CONFIG FIREBASE KAMU DI SINI ===
const firebaseConfig = {
  apiKey: "AIzaSyDaZgJs2CnoRoZ0YkeBpGnrbcQiTJFf0pA",
  authDomain: "avsecpnk.firebaseapp.com",
  projectId: "avsecpnk",
  storageBucket: "avsecpnk.firebasestorage.app",
  messagingSenderId: "426515134862",
  appId: "1:426515134862:web:466729d66540376a9bccdf",
  measurementId: "G-K2GNG50ZYZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====== DATA DARI FIREBASE ======
let dataBarang = [];
let selectedBarangId = null;

// ====== SIMPAN BARANG DIAMANKAN ======
async function handleLostFormSubmit(e) {
  e.preventDefault();

  const waktuDiamankan = document.getElementById("waktuDiamankan").value;
  const shift = document.getElementById("shift").value;
  const supervisor = document.getElementById("supervisor").value;
  const namaBarang = document.getElementById("namaBarang").value;
  const spesifikasi = document.getElementById("spesifikasi").value;

  const docRef = await addDoc(collection(db, "barang"), {
    waktuDiamankan,
    shift,
    supervisor,
    namaBarang,
    spesifikasi,
    status: "Diamankan",
    createdAt: serverTimestamp()
  });

  e.target.reset();
  muatData();
}

// ====== UPDATE SERAHTERIMA ======
async function handleSerahFormSubmit(e) {
  e.preventDefault();
  if (!selectedBarangId) return;

  const waktuSerah = document.getElementById("waktuSerah").value;
  const supervisorSerah = document.getElementById("supervisorSerah").value;

  await updateDoc(doc(db, "barang", selectedBarangId), {
    waktuSerah,
    supervisorSerah,
    status: "Diserahkan"
  });

  selectedBarangId = null;
  document.getElementById("serahTerimaBox")?.classList.add("hidden");

  e.target.reset();
  muatData();
}

// ====== TAMPILKAN DATA TABEL ======
function tampilkanData(list = dataBarang) {
  const tbody = document.querySelector("#tabelBarang tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  list.forEach((b, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${b.waktuDiamankan || "-"}</td>
      <td>${b.shift || "-"}</td>
      <td>${b.namaBarang || "-"}</td>
      <td>${b.status || "-"}</td>
      <td>
        ${b.status === "Diamankan"
          ? `<button onclick="bukaSerahTerima('${b.id}')">Serah Terima</button>`
          : ""
        }
        <button onclick="viewDetail('${b.id}')">View</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ====== MUAT DATA DARI FIREBASE ======
async function muatData() {
  const snap = await getDocs(collection(db, "barang"));
  dataBarang = snap.docs.map(docx => ({
    id: docx.id,
    ...docx.data()
  }));

  tampilkanData();
}

// ====== VIEW & SERAH ======
window.bukaSerahTerima = function(id) {
  selectedBarangId = id;
  document.getElementById("serahTerimaBox")?.classList.remove("hidden");
};

window.viewDetail = function(id) {
  const b = dataBarang.find(x => x.id === id);
  if (!b) return;

  const modal = document.createElement("div");
  modal.classList.add("modal-overlay");

  modal.innerHTML = `
    <div class="modal-box">
      <h2>Detail Barang</h2>
      <p><b>Tanggal Diamankan:</b> ${b.waktuDiamankan || "-"}</p>
      <p><b>Shift:</b> ${b.shift || "-"}</p>
      <p><b>Nama Barang:</b> ${b.namaBarang || "-"}</p>
      <p><b>Status:</b> ${b.status || "-"}</p>
      <button onclick="this.closest('.modal-overlay').remove()">Tutup</button>
    </div>
  `;
  document.body.appendChild(modal);
};

// ====== INIT ======
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("lostForm")?.addEventListener("submit", handleLostFormSubmit);
  document.getElementById("serahForm")?.addEventListener("submit", handleSerahFormSubmit);
  muatData();
});

