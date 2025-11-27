// =====================================================
// ===============   INIT SUPABASE CLIENT   ============
// =====================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://falvxitgmkbnomsghzmg.supabase.co";
const SUPABASE_ANON_KEY = "MASUKKAN_ANON_KEY_LENGKAP_DI_SINI";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel global
let dataBarang = [];
let selectedBarangId = null;
let currentUser = null;

// =====================================================
// ===============   UPLOAD GAMBAR STORAGE   ============
// =====================================================

async function uploadImageToSupabase(file, folder) {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Gagal upload:", uploadError);
      return "";
    }

    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error("Upload error:", err);
    return "";
  }
}

// =====================================================
// ===============      LOGIN / LOGOUT      ============
// =====================================================

async function handleLoginSubmit(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const errorBox = document.getElementById("loginError");
  errorBox.textContent = "";

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    errorBox.textContent = "Login gagal: " + error.message;
    return;
  }

  e.target.reset();
}

async function handleLogout() {
  await supabase.auth.signOut();
}

// =====================================================
// ===============   SIMPAN DATA LITA (Insert) =========
// =====================================================

async function handleLostFormSubmit(e) {
  e.preventDefault();

  const waktuDiamankan = document.getElementById("waktuDiamankan").value;
  const shift = document.getElementById("shift").value;
  const supervisor = document.getElementById("supervisor").value;
  const namaBarang = document.getElementById("namaBarang").value;
  const spesifikasi = document.getElementById("spesifikasi").value;

  const fotoInput = document.getElementById("fotoBarang");
  let fotoURL = "";

  if (fotoInput.files[0]) {
    fotoURL = await uploadImageToSupabase(fotoInput.files[0], "barang");
  }

  const { error } = await supabase.from("barang").insert([
    {
      waktu_diamankan: waktuDiamankan,
      shift,
      supervisor,
      nama_barang: namaBarang,
      spesifikasi,
      foto_url: fotoURL,
      status: "Diamankan",
      waktu_serah: "",
      supervisor_serah: "",
      foto_serah: "",
    },
  ]);

  if (error) {
    console.error("Insert error:", error);
    return;
  }

  e.target.reset();
  await muatData();
}

// =====================================================
// ===============   TAMPILKAN DATA TABEL   ============
// =====================================================

async function muatData() {
  const tbody = document.getElementById("tbodyBarang");
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='7'>Memuat...</td></tr>";

  const { data, error } = await supabase
    .from("barang")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    tbody.innerHTML = "<tr><td colspan='7'>Gagal memuat data</td></tr>";
    return;
  }

  dataBarang = data;

  tampilkanTabel(dataBarang);
}

function tampilkanTabel(list) {
  const tbody = document.getElementById("tbodyBarang");
  tbody.innerHTML = "";

  list.forEach((b, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${b.waktu_diamankan}</td>
        <td>${b.nama_barang}</td>
        <td>${b.spesifikasi}</td>
        <td><img src="${b.foto_url}" style="height:60px"></td>
        <td>${b.status}</td>
        <td>
          <button onclick="viewDetail(${b.id})">Detail</button>
        </td>
      </tr>
    `;
  });
}

// =====================================================
// ===============   FILTER TABEL         ===============
// =====================================================

function filterData() {
  const q = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const filtered = dataBarang.filter(b =>
    b.nama_barang.toLowerCase().includes(q) ||
    b.spesifikasi.toLowerCase().includes(q)
  );
  tampilkanTabel(filtered);
}

// =====================================================
// ===============  DETAIL & SERAH TERIMA   =============
// =====================================================

function viewDetail(id) {
  selectedBarangId = id;

  const barang = dataBarang.find(b => b.id === id);
  if (!barang) return;

  document.getElementById("detailNama").textContent = barang.nama_barang;
  document.getElementById("detailSpesifikasi").textContent = barang.spesifikasi;
  document.getElementById("detailFoto").src = barang.foto_url;

  showPage("Detail");
}

function bukaSerahTerima() {
  showPage("Serah");
}

function batalSerah() {
  showPage("home");
}

async function handleSerahFormSubmit(e) {
  e.preventDefault();

  if (!selectedBarangId) return;

  const waktuSerah = document.getElementById("waktuSerah").value;
  const supervisorSerah = document.getElementById("supervisorSerah").value;

  const fotoInput = document.getElementById("fotoSerah");
  let fotoSerahURL = "";

  if (fotoInput.files[0]) {
    fotoSerahURL = await uploadImageToSupabase(fotoInput.files[0], "serah");
  }

  const { error } = await supabase
    .from("barang")
    .update({
      status: "Diserahkan",
      waktu_serah: waktuSerah,
      supervisor_serah: supervisorSerah,
      foto_serah: fotoSerahURL,
    })
    .eq("id", selectedBarangId);

  if (error) console.error(error);

  e.target.reset();
  showPage("home");
  muatData();
}

// =====================================================
// ===============  MARK DIAMANKAN <-> BUKA ============
// =====================================================

async function toggleDiamankan(id) {
  const barang = dataBarang.find(b => b.id === id);
  if (!barang) return;

  const newStatus = barang.status === "Diamankan" ? "Diserahkan" : "Diamankan";

  await supabase.from("barang").update({ status: newStatus }).eq("id", id);

  muatData();
}

// =====================================================
// ===============       HALAMAN ROUTER      ===========
// =====================================================

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(page)?.classList.add("active");
}

// =====================================================
// ===============      SIDEBAR MOBILE      ============
// =====================================================

function toggleSidebar() {
  document.querySelector(".sidebar")?.classList.toggle("hidden-sidebar");
  document.querySelector(".container")?.classList.toggle("sidebar-collapsed");
}

// =====================================================
// ===============   AUTH SESSION HANDLER   ============
// =====================================================

function handleAuthChange(session) {
  currentUser = session?.user || null;

  const btnLogout = document.getElementById("btnLogout");
  const profileBox = document.getElementById("profileBox");

  if (currentUser) {
    btnLogout?.classList.remove("hidden");
    profileBox?.classList.remove("hidden");

    document.getElementById("profileEmail").textContent = currentUser.email;
    document.getElementById("profileName").textContent =
      currentUser.user_metadata?.full_name || currentUser.email;

    showPage("home");
    muatData();
  } else {
    btnLogout?.classList.add("hidden");
    profileBox?.classList.add("hidden");
    showPage("Login");
  }
}

// =====================================================
// ===============   INIT SAAT PAGE DIBUKA   ===========
// =====================================================

window.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("lostForm")?.addEventListener("submit", handleLostFormSubmit);
  document.getElementById("serahForm")?.addEventListener("submit", handleSerahFormSubmit);
  document.getElementById("loginForm")?.addEventListener("submit", handleLoginSubmit);
  document.getElementById("btnLogout")?.addEventListener("click", handleLogout);

  const { data } = await supabase.auth.getSession();
  handleAuthChange(data.session);

  supabase.auth.onAuthStateChange((_e, session) => handleAuthChange(session));
});

// =====================================================
// ===============   EXPOSE KE WINDOW       ============
// =====================================================
window.filterData = filterData;
window.viewDetail = viewDetail;
window.bukaSerahTerima = bukaSerahTerima;
window.batalSerah = batalSerah;
window.toggleSidebar = toggleSidebar;
window.showPage = showPage;
window.toggleDiamankan = toggleDiamankan;
