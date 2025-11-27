// =====================================================
// ===============   INIT SUPABASE CLIENT   ============
// =====================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://falvxitgmkbnomsghzmg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
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

    // Upload
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Gagal upload:", uploadError);
      return "";
    }

    // Ambil URL public
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
// ===============     LOGIN / LOGOUT     ===============
// =====================================================

async function handleLoginSubmit(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail")?.value;
  const password = document.getElementById("loginPassword")?.value;
  const errorBox = document.getElementById("loginError");

  if (errorBox) errorBox.textContent = "";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      errorBox.textContent = "Login gagal: " + error.message;
      return;
    }

    console.log("Login sukses:", data.user);
    e.target.reset();

  } catch (err) {
    errorBox.textContent = "Terjadi error saat login";
  }
}


async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Logout gagal:", error);
}



// =====================================================
// ===============  SIMPAN FORM LITA  ==================
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

  if (fotoInput?.files[0]) {
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
      foto_serah: ""
    }
  ]);

  if (error) {
    console.error("Gagal simpan:", error);
    return;
  }

  e.target.reset();
  await muatData();
}



// =====================================================
// ===============   TAMPILKAN DATA TABEL   ============
// =====================================================

function tampilkanData(filtered = dataBarang) {
  const tbody = document.querySelector("#tabelBarang tbody");
  tbody.innerHTML = "";

  filtered.forEach((barang) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${barang.waktu_diamankan?.replace("T", " ") || ""}</td>
      <td>${barang.shift}</td>
      <td>${barang.nama_barang}</td>
      <td>${barang.status}</td>
      <td>
        ${
          barang.status === "Diamankan"
            ? `<button onclick="bukaSerahTerima('${barang.id}')">Serah Terima</button>`
            : ""
        }
        <button onclick="viewDetail('${barang.id}')">View</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}



// =====================================================
// ===============       FILTER DATA        ============
// =====================================================

function filterData() {
  const tgl = document.getElementById("filterTanggal")?.value;
  const shift = document.getElementById("filterShift")?.value;

  const hasil = dataBarang.filter((item) => {
    const cocokTanggal = tgl ? item.waktu_diamankan.startsWith(tgl) : true;
    const cocokShift = shift ? item.shift === shift : true;
    return cocokTanggal && cocokShift;
  });

  tampilkanData(hasil);
}



// =====================================================
// ===============  SERAHTERIMA BARANG     ============
// =====================================================

function bukaSerahTerima(id) {
  selectedBarangId = id;
  document.getElementById("serahTerimaBox")?.classList.remove("hidden");
}

function batalSerah() {
  document.getElementById("serahTerimaBox")?.classList.add("hidden");
  selectedBarangId = null;
}

async function handleSerahFormSubmit(e) {
  e.preventDefault();
  if (!selectedBarangId) return;

  const waktuSerah = document.getElementById("waktuSerah").value;
  const supervisorSerah = document.getElementById("supervisorSerah").value;

  const fotoInput = document.getElementById("fotoSerah");
  let fotoSerahURL = "";

  if (fotoInput?.files[0]) {
    fotoSerahURL = await uploadImageToSupabase(
      fotoInput.files[0],
      "barang-serah"
    );
  }

  const { error } = await supabase
    .from("barang")
    .update({
      waktu_serah: waktuSerah,
      supervisor_serah: supervisorSerah,
      foto_serah: fotoSerahURL,
      status: "Diserahkan"
    })
    .eq("id", Number(selectedBarangId));

  if (error) {
    console.error("Gagal update:", error);
    return;
  }

  await muatData();
  batalSerah();
  e.target.reset();
}



// =====================================================
// ===============       VIEW DETAIL        ============
// =====================================================

function viewDetail(id) {
  const b = dataBarang.find((x) => x.id === Number(id));
  if (!b) return;

  const modal = document.createElement("div");
  modal.classList.add("modal-overlay");

  modal.innerHTML = `
    <div class="modal-box">
      <h2>Detail Barang</h2>

      <p><b>Tanggal Diamankan:</b> ${b.waktu_diamankan}</p>
      <p><b>Shift:</b> ${b.shift}</p>
      <p><b>Supervisor:</b> ${b.supervisor}</p>
      <p><b>Nama Barang:</b> ${b.nama_barang}</p>
      <p><b>Spesifikasi:</b> ${b.spesifikasi}</p>
      <p><b>Foto Barang:</b><br>
        ${b.foto_url ? `<img src="${b.foto_url}" width="200">` : "-"}
      </p>

      ${
        b.status === "Diserahkan"
          ? `
              <hr>
              <p><b>Waktu Serah:</b> ${b.waktu_serah}</p>
              <p><b>Supervisor Serah:</b> ${b.supervisor_serah}</p>
              <p><b>Foto Serah:</b><br>
                ${
                  b.foto_serah
                    ? `<img src="${b.foto_serah}" width="200">`
                    : "-"
                }
              </p>
            `
          : ""
      }

      <button onclick="this.closest('.modal-overlay').remove()">Tutup</button>
    </div>
  `;

  document.body.appendChild(modal);
}



// =====================================================
// ===============      MUAT DATA          ============
// =====================================================

async function muatData() {
  const { data, error } = await supabase
    .from("barang")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error) {
    dataBarang = data || [];
    tampilkanData();
  }
}



// =====================================================
// ===============     AUTH SESSION        ============
// =====================================================

function handleAuthChange(session) {
  currentUser = session?.user || null;

  const btnLogout = document.getElementById("btnLogout");
  const profileBox = document.getElementById("profileBox");
  const emailBox = document.getElementById("profileEmail");
  const nameBox = document.getElementById("profileName");

  if (currentUser) {
    // Show elements
    btnLogout?.classList.remove("hidden");
    profileBox?.classList.remove("hidden");

    emailBox.textContent = currentUser.email;
    nameBox.textContent =
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
// ===============   SAAT PAGE DIBUKA      ============
// =====================================================

window.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("lostForm")?.addEventListener("submit", handleLostFormSubmit);
  document.getElementById("serahForm")?.addEventListener("submit", handleSerahFormSubmit);
  document.getElementById("loginForm")?.addEventListener("submit", handleLoginSubmit);
  document.getElementById("btnLogout")?.addEventListener("click", handleLogout);

  // Auto hide sidebar (mobile)
  if (window.innerWidth <= 768) {
    document.querySelector(".sidebar")?.classList.add("hidden-sidebar");
    document.querySelector(".container")?.classList.add("sidebar-collapsed");
  }

  // Cek session
  const { data } = await supabase.auth.getSession();
  handleAuthChange(data.session);

  // Listener perubahan login
  supabase.auth.onAuthStateChange((_e, session) => {
    handleAuthChange(session);
  });
});



// =====================================================
// ===============    EXPOSE KE WINDOWS   ==============
// =====================================================
window.filterData = filterData;
window.viewDetail = viewDetail;
window.bukaSerahTerima = bukaSerahTerima;
window.batalSerah = batalSerah;
window.toggleSidebar = toggleSidebar;
window.showPage = showPage;
window.toggleDiamankan = toggleDiamankan;
