// ====== LOGIN / LOGOUT (SUPABASE AUTH EMAIL/PASSWORD) ======

async function handleLoginSubmit(e) {
  e.preventDefault();

  const emailInput = document.getElementById("loginEmail");
  const passInput = document.getElementById("loginPassword");
  const errorBox = document.getElementById("loginError");

  if (!emailInput || !passInput) return;
  if (errorBox) errorBox.textContent = "";

  try {
    const email = emailInput.value;
    const password = passInput.value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("Login gagal:", error);
      if (errorBox) {
        errorBox.textContent =
          "Login gagal: " + (error.message || "cek email/password");
      }
      return;
    }

    console.log("Login sukses:", data.user);
    e.target.reset();

  } catch (err) {
    console.error("Login error:", err);
    if (errorBox) {
      errorBox.textContent = "Terjadi error saat login";
    }
  }
}


async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout gagal:", error);
      return;
    }
    console.log("Logout sukses");
  } catch (err) {
    console.error("Logout error:", err);
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
    console.error("Gagal simpan ke Supabase:", error);
    return;
  }

  e.target.reset();
  await muatData();
}



// ====== TAMPILKAN DATA KE TABEL ======

function tampilkanData(filteredData = dataBarang) {
  const tbody = document.querySelector("#tabelBarang tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  filteredData.forEach((barang) => {
    const tglTeks = barang.waktu_diamankan
      ? barang.waktu_diamankan.split("T").join(" ")
      : "";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${tglTeks}</td>
      <td>${barang.shift || ""}</td>
      <td>${barang.nama_barang || ""}</td>
      <td>${barang.status || ""}</td>
      <td>
        ${
          barang.status === "Diamankan"
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

  const hasil = dataBarang.filter((item) => {
    const cocokTanggal = tgl
      ? (item.waktu_diamankan || "").startsWith(tgl)
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
  if (box) box.classList.remove("hidden");
}

function batalSerah() {
  const box = document.getElementById("serahTerimaBox");
  if (box) box.classList.add("hidden");
  selectedBarangId = null;
}

async function handleSerahFormSubmit(e) {
  e.preventDefault();
  if (!selectedBarangId) return;

  const waktuSerah = document.getElementById("waktuSerah").value;
  const supervisorSerah = document.getElementById("supervisorSerah").value;

  const fotoInput = document.getElementById("fotoSerah");
  let fotoSerahURL = "";

  if (fotoInput && fotoInput.files && fotoInput.files[0]) {
    fotoSerahURL = await uploadImageToSupabase(
      fotoInput.files[0],
      "barang-serah"
    );
  }

  const barangIdNum = Number(selectedBarangId);

  const { error } = await supabase
    .from("barang")
    .update({
      waktu_serah: waktuSerah,
      supervisor_serah: supervisorSerah,
      foto_serah: fotoSerahURL,
      status: "Diserahkan"
    })
    .eq("id", barangIdNum);

  if (error) {
    console.error("Gagal update serah terima:", error);
    return;
  }

  await muatData();
  batalSerah();
  e.target.reset();
}



// ====== VIEW DETAIL BARANG ======

function viewDetail(id) {
  const barangIdNum = Number(id);
  const b = dataBarang.find((x) => x.id === barangIdNum);
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

      <p><b>Foto Barang:</b><br>
        ${
          b.foto_url
            ? `<img src="${b.foto_url}" width="200">`
            : "-"
        }
      </p>

      <p><b>Status:</b> ${b.status || "-"}</p>

      ${
        b.status === "Diserahkan"
          ? `
            <hr>
            <p><b>Tanggal & Waktu Serah:</b> ${b.waktu_serah || "-"}</p>
            <p><b>Supervisor Serah:</b> ${b.supervisor_serah || "-"}</p>
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

      <button type="button" onclick="this.closest('.modal-overlay').remove()">Tutup</button>
    </div>
  `;

  document.body.appendChild(modal);
}



// ====== MUAT DATA DARI SUPABASE ======

async function muatData() {
  try {
    const { data, error } = await supabase
      .from("barang")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal memuat data:", error);
      return;
    }

    dataBarang = data || [];
    tampilkanData();
  } catch (err) {
    console.error("Gagal memuat data (exception):", err);
  }
}



// ====== HANDLE PERUBAHAN SESSION AUTH ======

function handleAuthChange(session) {
  const btnLogout = document.getElementById("btnLogout");
  const profileBox = document.getElementById("profileBox");
  const profileEmail = document.getElementById("profileEmail");
  const profileName = document.getElementById("profileName");

  currentUser = session?.user || null;

  if (currentUser) {
    console.log("User login:", currentUser.email);

    if (btnLogout) btnLogout.classList.remove("hidden");
    if (profileBox) profileBox.classList.remove("hidden");
    if (profileEmail) profileEmail.textContent = currentUser.email || "-";
    if (profileName)
      profileName.textContent =
        currentUser.user_metadata?.full_name ||
        currentUser.email ||
        "-";

    showPage("home");
    muatData();

  } else {
    console.log("Belum login / sudah logout");

    if (btnLogout) btnLogout.classList.add("hidden");
    if (profileBox) profileBox.classList.add("hidden");

    showPage("Login");
  }
}



// ====== INIT SETELAH HALAMAN SIAP ======

window.addEventListener("DOMContentLoaded", async () => {
  const lostForm = document.getElementById("lostForm");
  const serahForm = document.getElementById("serahForm");
  const loginForm = document.getElementById("loginForm");
  const btnLogout = document.getElementById("btnLogout");

  if (lostForm) lostForm.addEventListener("submit", handleLostFormSubmit);
  if (serahForm) serahForm.addEventListener("submit", handleSerahFormSubmit);
  if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);
  if (btnLogout) btnLogout.addEventListener("click", handleLogout);

  // Auto-collapse sidebar on mobile
  const sidebar = document.querySelector(".sidebar");
  const container = document.querySelector(".container");
  if (window.innerWidth <= 768 && sidebar && container) {
    sidebar.classList.add("hidden-sidebar");
    container.classList.add("sidebar-collapsed");
  }

  // cek session awal
  const { data } = await supabase.auth.getSession();
  handleAuthChange(data.session || null);

  // pantau perubahan auth
  supabase.auth.onAuthStateChange((_event, session) => {
    handleAuthChange(session);
  });
});



// ====== EXPOSE FUNGSI KE GLOBAL ======
window.showPage = showPage;
window.toggleSidebar = toggleSidebar;
window.toggleDiamankan = toggleDiamankan;
window.filterData = filterData;
window.bukaSerahTerima = bukaSerahTerima;
window.batalSerah = batalSerah;
window.viewDetail = viewDetail;
