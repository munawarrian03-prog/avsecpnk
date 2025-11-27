// =====================================================
// ===============   INIT SUPABASE CLIENT   ============
// =====================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://falvxitgmkbnomsghzmg.supabase.co";
// GANTI nilai di bawah dengan anon public key Supabase Anda (atau isi tajuk environment jika Anda punya cara lain)
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhbHZ4aXRnbWtibm9tc2doem1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTM2NDIsImV4cCI6MjA3OTc4OTY0Mn0.L4bmyFCHKLi4UmWvaeB2sll6-nQuvVGK1jO5hXkjLUY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel global
let dataBarang = [];
let selectedBarangId = null;
let currentUser = null;


// =====================================================
// ===============   HELPER: UPLOAD STORAGE  ===========
// =====================================================
// Paket upload akan menggunakan bucket bernama "barang" (pastikan bucket ini ada di Supabase Storage)
async function uploadImageToSupabase(file, folder) {
  try {
    if (!file) return "";

    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // upload ke bucket 'barang'
    const { error: uploadError } = await supabase.storage
      .from("barang")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Gagal upload:", uploadError);
      return "";
    }

    // ambil public url
    const { data: urlData } = supabase.storage
      .from("barang")
      .getPublicUrl(filePath);

    return urlData?.publicUrl || "";

  } catch (err) {
    console.error("Upload error:", err);
    return "";
  }
}


// =====================================================
// ===============   NAVIGASI & UI HELPERS  ============
// =====================================================

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const container = document.querySelector(".container");
  if (!sidebar || !container) return;

  const isCollapsed = container.classList.toggle("sidebar-collapsed");
  sidebar.classList.toggle("hidden-sidebar", isCollapsed);
}

function toggleDiamankan() {
  const box = document.getElementById("diamankanSection");
  if (!box) return;
  box.classList.toggle("hidden");
}


// =====================================================
// ===============   AUTH: LOGIN / LOGOUT  =============
// =====================================================

async function handleLoginSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById("loginEmail");
  const passInput = document.getElementById("loginPassword");
  const errorBox = document.getElementById("loginError");

  if (!emailInput || !passInput) return;
  if (errorBox) errorBox.textContent = "";

  const email = emailInput.value;
  const password = passInput.value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("Login gagal:", error);
      if (errorBox) errorBox.textContent = "Login gagal: " + (error.message || "cek email/password");
      return;
    }

    // sukses -> session listener akan men-trigger UI update
    emailInput.value = "";
    passInput.value = "";

  } catch (err) {
    console.error("Login error:", err);
    if (errorBox) errorBox.textContent = "Terjadi error saat login";
  }
}

async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout gagal:", error);
      return;
    }
    // session listener akan men-trigger UI
    console.log("Logout sukses");
  } catch (err) {
    console.error("Logout error:", err);
  }
}


// =====================================================
// ===============   LIT A: SIMPAN DATA   =============
// =====================================================

async function handleLostFormSubmit(e) {
  e.preventDefault();

  const waktuDiamankan = document.getElementById("waktuDiamankan")?.value || "";
  const shift = document.getElementById("shift")?.value || "";
  const supervisor = document.getElementById("supervisor")?.value || "";
  const namaBarang = document.getElementById("namaBarang")?.value || "";
  const spesifikasi = document.getElementById("spesifikasi")?.value || "";

  const fotoInput = document.getElementById("fotoBarang");
  let fotoURL = "";

  if (fotoInput && fotoInput.files && fotoInput.files[0]) {
    fotoURL = await uploadImageToSupabase(fotoInput.files[0], "barang");
  }

  try {
    const { error } = await supabase.from("barang").insert([{
      waktu_diamankan: waktuDiamankan,
      shift,
      supervisor,
      nama_barang: namaBarang,
      spesifikasi,
      foto_url: fotoURL,
      status: "Diamankan",
      waktu_serah: "",
      supervisor_serah: "",
      foto_serah: ""
    }]);

    if (error) {
      console.error("Gagal simpan ke Supabase:", error);
      alert("Gagal menyimpan data: " + (error.message || ""));
      return;
    }

    e.target.reset();
    await muatData();
    alert("Data berhasil disimpan.");

  } catch (err) {
    console.error("Exception simpan:", err);
    alert("Terjadi error saat menyimpan data.");
  }
}


// =====================================================
// ===============   TAMPILKAN DATA KE TABEL   ==========
// =====================================================

function tampilkanData(filteredData = dataBarang) {
  const tbody = document.querySelector("#tabelBarang tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  filteredData.forEach((barang) => {
    const tglTeks = barang.waktu_diamankan ? barang.waktu_diamankan.replace("T", " ") : "";
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${tglTeks}</td>
      <td>${barang.shift || ""}</td>
      <td>${barang.nama_barang || ""}</td>
      <td>${barang.status || ""}</td>
      <td>
        ${barang.status === "Diamankan" ? `<button type="button" onclick="bukaSerahTerima('${barang.id}')">Serah Terima</button>` : ""}
        <button type="button" onclick="viewDetail('${barang.id}')">View</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}


// =====================================================
// ===============   FILTER DATA (UI)   ================
// =====================================================

function filterData() {
  const tgl = document.getElementById("filterTanggal")?.value || "";
  const shift = document.getElementById("filterShift")?.value || "";

  const hasil = dataBarang.filter(item => {
    const cocokTanggal = tgl ? (item.waktu_diamankan || "").startsWith(tgl) : true;
    const cocokShift = shift ? item.shift === shift : true;
    return cocokTanggal && cocokShift;
  });

  tampilkanData(hasil);
}


// =====================================================
// ===============   SERAHTERIMA HANDLER   ==============
// =====================================================

function bukaSerahTerima(id) {
  selectedBarangId = id;
  const box = document.getElementById("serahTerimaBox");
  if (box) box.classList.remove("hidden");
}

function batalSerah() {
  const box = document.getElementById("serahTerimaBox");
  if (box) box.classList.add("hidden");
  selectedBarangId = null;
}

async function handleSerahFormSubmit(e) {
  e.preventDefault();
  if (!selectedBarangId) {
    alert("Pilih barang terlebih dahulu.");
    return;
  }

  const waktuSerah = document.getElementById("waktuSerah")?.value || "";
  const supervisorSerah = document.getElementById("supervisorSerah")?.value || "";

  const fotoInput = document.getElementById("fotoSerah");
  let fotoSerahURL = "";
  if (fotoInput && fotoInput.files && fotoInput.files[0]) {
    fotoSerahURL = await uploadImageToSupabase(fotoInput.files[0], "barang-serah");
  }

  try {
    const { error } = await supabase.from("barang").update({
      waktu_serah: waktuSerah,
      supervisor_serah: supervisorSerah,
      foto_serah: fotoSerahURL,
      status: "Diserahkan"
    }).eq("id", Number(selectedBarangId));

    if (error) {
      console.error("Gagal update serah terima:", error);
      alert("Gagal mengirim serah terima: " + (error.message || ""));
      return;
    }

    await muatData();
    batalSerah();
    e.target.reset();
    alert("Serah terima berhasil disimpan.");

  } catch (err) {
    console.error("Exception serah terima:", err);
    alert("Terjadi error saat serah terima.");
  }
}


// =====================================================
// ===============   VIEW DETAIL (MODAL)  ==============
// =====================================================

function viewDetail(id) {
  const barangIdNum = Number(id);
  const b = dataBarang.find(x => x.id === barangIdNum);
  if (!b) return;

  const modal = document.createElement("div");
  modal.classList.add("modal-overlay");

  modal.innerHTML = `
    <div class="modal-box">
      <h2>Detail Barang Diamankan</h2>
      <p><b>Tanggal & Waktu Diamankan:</b> ${b.waktu_diamankan || "-"}</p>
      <p><b>Shift:</b> ${b.shift || "-"}</p>
      <p><b>Supervisor:</b> ${b.supervisor || "-"}</p>
      <p><b>Nama Barang:</b> ${b.nama_barang || "-"}</p>
      <p><b>Spesifikasi Barang:</b> ${b.spesifikasi || "-"}</p>
      <p><b>Foto Barang:</b><br>${b.foto_url ? `<img src="${b.foto_url}" width="200">` : "-"}</p>
      <p><b>Status:</b> ${b.status || "-"}</p>
      ${b.status === "Diserahkan" ? `
        <hr>
        <p><b>Tanggal & Waktu Serah:</b> ${b.waktu_serah || "-"}</p>
        <p><b>Supervisor Serah:</b> ${b.supervisor_serah || "-"}</p>
        <p><b>Foto Serah:</b><br>${b.foto_serah ? `<img src="${b.foto_serah}" width="200">` : "-"}</p>
      ` : ""}
      <button type="button" onclick="this.closest('.modal-overlay').remove()">Tutup</button>
    </div>
  `;

  document.body.appendChild(modal);
}


// =====================================================
// ===============   MUAT DATA DARI SUPABASE   =========
// =====================================================

async function muatData() {
  try {
    const { data, error } = await supabase
      .from("barang")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal memuat data:", error);
      dataBarang = [];
      tampilkanData();
      return;
    }

    dataBarang = data || [];
    tampilkanData();

  } catch (err) {
    console.error("Gagal memuat data (exception):", err);
  }
}


// =====================================================
// ===============   AUTH SESSION HANDLER   ===========
// =====================================================

function handleAuthChange(session) {
  currentUser = session?.user || null;

  const btnLogout = document.getElementById("btnLogout");
  const profileBox = document.getElementById("profileBox");
  const emailBox = document.getElementById("profileEmail");
  const nameBox = document.getElementById("profileName");

  if (currentUser) {
    if (btnLogout) btnLogout.classList.remove("hidden");
    if (profileBox) profileBox.classList.remove("hidden");
    if (emailBox) emailBox.textContent = currentUser.email || "-";
    if (nameBox) nameBox.textContent = currentUser.user_metadata?.full_name || currentUser.email || "-";

    showPage("home");
    muatData();

  } else {
    if (btnLogout) btnLogout.classList.add("hidden");
    if (profileBox) profileBox.classList.add("hidden");

    showPage("Login");
  }
}


// =====================================================
// ===============   INIT: EVENT LISTENERS   ==========
// =====================================================

window.addEventListener("DOMContentLoaded", async () => {
  // bind forms if exist
  document.getElementById("lostForm")?.addEventListener("submit", handleLostFormSubmit);
  document.getElementById("serahForm")?.addEventListener("submit", handleSerahFormSubmit);
  document.getElementById("loginForm")?.addEventListener("submit", handleLoginSubmit);
  document.getElementById("btnLogout")?.addEventListener("click", handleLogout);

  // auto-collapse sidebar on small screens
  const sidebar = document.querySelector(".sidebar");
  const container = document.querySelector(".container");
  if (window.innerWidth <= 768 && sidebar && container) {
    sidebar.classList.add("hidden-sidebar");
    container.classList.add("sidebar-collapsed");
  }

  // initial session check
  const { data } = await supabase.auth.getSession();
  handleAuthChange(data.session || null);

  // listen auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    handleAuthChange(session);
  });
});


// =====================================================
// ===============   EXPOSE KE GLOBAL WINDOW  ==========
// =====================================================
window.showPage = showPage;
window.toggleSidebar = toggleSidebar;
window.toggleDiamankan = toggleDiamankan;
window.filterData = filterData;
window.bukaSerahTerima = bukaSerahTerima;
window.batalSerah = batalSerah;
window.viewDetail = viewDetail;
window.muatData = muatData;
window.handleLoginSubmit = handleLoginSubmit;
window.handleLogout = handleLogout;

