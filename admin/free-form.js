// ==========================================
// FREE FORM / CANNED RESPONSES SCRIPT
// ==========================================
const FF_API = window.location.hostname.includes("staging") || 
               window.location.hostname.includes("pages.dev") || 
               window.location.hostname.includes("localhost") || 
               window.location.hostname.includes("127.0.0.1")
  ? "https://api-staging.crm.integrihub.my.id"
  : "https://api-crm.integrihub.my.id";
  
const FF_CID = localStorage.getItem("client_id");

// STATE GLOBAL
let ALL_CANNED = [];
let FILTERED_CANNED = []; // 🔥 Tambahan untuk fitur Search
let cannedPage = 1;
let cannedLimit = 10;
let editCannedId = null; // Menyimpan ID jika sedang mode Edit

// ================= TAB LOGIC =================
function switchTabTemplate(tabName) {
  const tabMeta = document.getElementById("tabMeta");
  const tabCanned = document.getElementById("tabCanned");
  const metaView = document.getElementById("metaViewContainer");
  const cannedView = document.getElementById("cannedViewContainer");
  const btnCreateMeta = document.getElementById("btnCreateTemplate");
  const btnCreateCanned = document.getElementById("btnCreateCanned");

  if (tabName === 'meta') {
    tabMeta.classList.replace('text-gray-400', 'text-blue-500');
    tabMeta.classList.add('border-blue-500');
    tabCanned.classList.replace('text-yellow-500', 'text-gray-400');
    tabCanned.classList.remove('border-yellow-500');
    metaView.classList.remove('hidden');
    cannedView.classList.add('hidden');
    btnCreateMeta.classList.remove('hidden');
    btnCreateCanned.classList.add('hidden');
  } else if (tabName === 'canned') {
    tabCanned.classList.replace('text-gray-400', 'text-yellow-500');
    tabCanned.classList.add('border-yellow-500');
    tabMeta.classList.replace('text-blue-500', 'text-gray-400');
    tabMeta.classList.remove('border-blue-500');
    metaView.classList.add('hidden');
    cannedView.classList.remove('hidden');
    btnCreateMeta.classList.add('hidden');
    btnCreateCanned.classList.remove('hidden');
    loadCannedData();
  }
}

// ================= MODAL LOGIC =================
function openCannedModal() {
  editCannedId = null; // Pastikan mode buat baru
  document.querySelector("#cannedModal h2").innerHTML = "⚡ Buat Balasan Cepat";
  resetCannedForm();
  document.getElementById("cannedModal").classList.remove("hidden");
}

function closeCannedModal() {
  document.getElementById("cannedModal").classList.add("hidden");
  editCannedId = null;
}

function toggleCannedFields() {
  const type = document.getElementById("cannedType").value;
  const dynamicArea = document.getElementById("cannedDynamicArea");
  
  document.getElementById("cannedBtnArea").classList.add("hidden");
  document.getElementById("cannedFlowArea").classList.add("hidden");
  document.getElementById("cannedCtaArea").classList.add("hidden");
  document.getElementById("cannedListArea").classList.add("hidden");

  if (type === "text") {
    dynamicArea.classList.add("hidden");
  } else {
    dynamicArea.classList.remove("hidden");
    if (type === "button") document.getElementById("cannedBtnArea").classList.remove("hidden");
    if (type === "flow") document.getElementById("cannedFlowArea").classList.remove("hidden");
    if (type === "cta") document.getElementById("cannedCtaArea").classList.remove("hidden");
    if (type === "list") document.getElementById("cannedListArea").classList.remove("hidden");
  }
}

// ================= MENU LIST BUILDER =================
let listItemsCount = 0;
function addCannedListItem(title = "", desc = "") {
  if(listItemsCount >= 10) return alert("Maksimal 10 pilihan menu!");
  listItemsCount++;
  const box = document.getElementById("cannedListItemsBox");
  const div = document.createElement("div");
  div.className = "flex gap-2 items-center bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-600 list-item-row";
  div.innerHTML = `
    <input type="text" placeholder="Judul Pilihan ${listItemsCount}" value="${title}" class="w-1/2 p-1 border rounded text-sm outline-none dark:bg-gray-700 dark:border-gray-600 list-title">
    <input type="text" placeholder="Deskripsi (Opsional)" value="${desc}" class="w-1/2 p-1 border rounded text-sm outline-none dark:bg-gray-700 dark:border-gray-600 list-desc">
    <button onclick="this.parentElement.remove(); listItemsCount--;" class="text-red-500 font-bold px-2 hover:bg-red-100 rounded">X</button>
  `;
  box.appendChild(div);
}

function hapusMediaCanned() {
  document.getElementById("cannedMedia").value = "";
  document.getElementById("cannedMediaUrl").value = "";
  document.getElementById("cannedMediaType").value = "";
  document.getElementById("cannedMediaPreview").innerText = "";
  document.getElementById("cannedMediaPreview").classList.add("hidden");
  document.getElementById("btnHapusMedia").classList.add("hidden");
}

function resetCannedForm() {
  document.getElementById("cannedTitle").value = "";
  document.getElementById("cannedType").value = "text";
  document.getElementById("cannedMessage").value = "";
  document.getElementById("cannedBtn1").value = "";
  document.getElementById("cannedBtn2").value = "";
  document.getElementById("cannedBtn3").value = "";
  document.getElementById("cannedFlowBtn").value = "";
  document.getElementById("cannedFlowId").value = "";
  document.getElementById("cannedFlowScreen").value = "";
  document.getElementById("cannedCtaText").value = "";
  document.getElementById("cannedCtaUrl").value = "";
  document.getElementById("cannedListTitle").value = "";
  document.getElementById("cannedListItemsBox").innerHTML = "";
  listItemsCount = 0;
  hapusMediaCanned();
  toggleCannedFields();
}

// ================= API LOAD & PAGINATION =================
async function loadCannedData() {
  const tbody = document.getElementById("cannedTableBody");
  tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center">⏳ Memuat data...</td></tr>`;
  
  try {
    const res = await fetch(`${FF_API}/get-canned?client_id=${FF_CID}`);
    ALL_CANNED = await res.json();
    FILTERED_CANNED = [...ALL_CANNED]; // 🔥 Salin data untuk fitur search
    renderCannedTable();
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Gagal memuat data.</td></tr>`;
  }
}

// 🔥 FUNGSI SEARCH BARU
function handleSearchCanned() {
  const keyword = document.getElementById("searchCannedInput").value.toLowerCase();
  FILTERED_CANNED = ALL_CANNED.filter(c => 
    c.title.toLowerCase().includes(keyword) || 
    c.type.toLowerCase().includes(keyword) || 
    c.message.toLowerCase().includes(keyword)
  );
  cannedPage = 1; // Kembali ke halaman 1 saat mencari
  renderCannedTable();
}

function renderCannedTable() {
  const tbody = document.getElementById("cannedTableBody");
  if(FILTERED_CANNED.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500 text-xs italic">Belum ada Balasan Cepat.</td></tr>`;
    document.getElementById("cannedInfo").innerText = "";
    document.getElementById("cannedPaginationBox").innerHTML = "";
    return;
  }

  // Hitung Slice untuk Pagination
  const totalItems = FILTERED_CANNED.length;
  const totalPages = Math.ceil(totalItems / cannedLimit);
  if(cannedPage > totalPages) cannedPage = totalPages;
  if(cannedPage < 1) cannedPage = 1;

  const start = (cannedPage - 1) * cannedLimit;
  const end = start + cannedLimit;
  const slicedData = FILTERED_CANNED.slice(start, end);

  document.getElementById("cannedInfo").innerText = `Menampilkan ${start + 1} s/d ${Math.min(end, totalItems)} dari ${totalItems} baris`;

  tbody.innerHTML = slicedData.map(c => `
    <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
      <td class="p-2 font-bold text-gray-800 dark:text-gray-100">${c.title}</td>
      <td class="p-2"><span class="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-1 rounded font-bold uppercase">${c.type}</span></td>
      <td class="p-2 truncate max-w-[200px] text-xs text-gray-500 dark:text-gray-400">${c.message}</td>
      <td class="p-2 text-center relative">
        <button onclick="toggleActionMenu(${c.id})" class="text-xl px-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition">⋮</button>
        <div id="cannedMenu-${c.id}" class="hidden absolute right-6 top-8 w-32 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded shadow-lg z-40 text-left text-sm overflow-hidden">
          <button onclick="detailCanned(${c.id})" class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">👁️ Detail</button>
          <button onclick="editCanned(${c.id})" class="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600">✏️ Edit</button>
          <button onclick="deleteCanned(${c.id})" class="w-full text-left px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500">🗑️ Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Render Pagination Buttons
  let pgHtml = "";
  pgHtml += `<button onclick="setCannedPage(${cannedPage - 1})" class="px-2 py-1 border rounded ${cannedPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}">Prev</button>`;
  for (let i = 1; i <= totalPages; i++) {
    const active = i === cannedPage ? "bg-yellow-500 text-white border-yellow-500" : "hover:bg-gray-100 dark:hover:bg-gray-700";
    pgHtml += `<button onclick="setCannedPage(${i})" class="px-3 py-1 border rounded ${active}">${i}</button>`;
  }
  pgHtml += `<button onclick="setCannedPage(${cannedPage + 1})" class="px-2 py-1 border rounded ${cannedPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}">Next</button>`;
  document.getElementById("cannedPaginationBox").innerHTML = pgHtml;
}

function changeCannedLimit() {
  cannedLimit = parseInt(document.getElementById("cannedLimitSelect").value);
  cannedPage = 1;
  renderCannedTable();
}

function setCannedPage(p) {
  const totalPages = Math.ceil(FILTERED_CANNED.length / cannedLimit);
  if(p < 1 || p > totalPages) return;
  cannedPage = p;
  renderCannedTable();
}

// ================= AKSI MENU =================
function toggleActionMenu(id) {
  // Tutup menu lain dulu
  document.querySelectorAll('[id^="cannedMenu-"]').forEach(el => {
    if(el.id !== `cannedMenu-${id}`) el.classList.add('hidden');
  });
  document.getElementById(`cannedMenu-${id}`).classList.toggle("hidden");
}

// Tutup dropdown kalau klik sembarang tempat
window.addEventListener("click", (e) => {
  if (!e.target.matches("button[onclick^='toggleActionMenu']")) {
    document.querySelectorAll('[id^="cannedMenu-"]').forEach(el => el.classList.add('hidden'));
  }
});

//DETAIL BALASAN CEPAT
function detailCanned(id) {
  const item = ALL_CANNED.find(x => x.id === id);
  if(!item) return;
  
  // Format HTML untuk konten modal
  let html = `
    <div>
      <span class="text-gray-500 dark:text-gray-400 text-xs font-bold block mb-1">Judul Shortcut</span> 
      <div class="font-semibold text-base">${item.title}</div>
    </div>
    <div>
      <span class="text-gray-500 dark:text-gray-400 text-xs font-bold block mb-1">Tipe Pesan</span> 
      <span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">${item.type}</span>
    </div>
  `;

  // 🔥 TAMPILKAN PREVIEW MEDIA JIKA ADA
  if(item.media_url) {
    html += `<div><span class="text-gray-500 dark:text-gray-400 text-xs font-bold block mb-1">Media Terlampir (${item.media_type})</span>`;
    if(item.media_type === 'image') {
      html += `<img src="${item.media_url}" class="max-h-32 rounded border dark:border-gray-600"></div>`;
    } else {
      html += `<a href="${item.media_url}" target="_blank" class="text-blue-500 underline text-sm block truncate">Buka ${item.media_type}</a></div>`;
    }
  }

  // ISI PESAN UTAMA (Cukup taruh di sini sekali saja)
  html += `
    <div>
      <span class="text-gray-500 dark:text-gray-400 text-xs font-bold block mb-1">Isi Pesan Utama</span> 
      <div class="bg-gray-50 dark:bg-gray-900 p-3 rounded border dark:border-gray-700 whitespace-pre-wrap">${item.message}</div>
    </div>
  `;
  
  // Tambahan detail sesuai tipe
  if(item.type === 'button') {
    let btns = [];
    try { btns = JSON.parse(item.buttons_json || "[]"); } catch(e){}
    let btnHtml = btns.map((b, i) => `<span class="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded mr-1 mb-1 font-semibold">${b}</span>`).join('');
    
    html += `<div><span class="text-gray-500 dark:text-gray-400 text-xs font-bold block mb-1">Tombol Quick Reply</span> <div>${btnHtml || '-'}</div></div>`;
  } 
  else if(item.type === 'flow') {
    html += `
      <div class="grid grid-cols-2 gap-2">
        <div><span class="text-gray-500 dark:text-gray-400 text-xs font-bold block">Teks Tombol Flow</span> <div class="font-semibold">${item.flow_button_text}</div></div>
        <div><span class="text-gray-500 dark:text-gray-400 text-xs font-bold block">Flow ID</span> <div class="font-semibold">${item.flow_id}</div></div>
        <div class="col-span-2"><span class="text-gray-500 dark:text-gray-400 text-xs font-bold block">Screen ID</span> <div class="font-semibold">${item.flow_screen}</div></div>
      </div>
    `;
  } 
  else if(item.type === 'cta') {
    html += `
      <div><span class="text-gray-500 dark:text-gray-400 text-xs font-bold block mb-1">Teks Tombol CTA</span> <div class="font-semibold">${item.cta_text}</div></div>
      <div><span class="text-gray-500 dark:text-gray-400 text-xs font-bold block mb-1">URL / Link</span> <div class="font-semibold text-blue-500 break-all"><a href="${item.cta_url}" target="_blank" class="hover:underline">${item.cta_url}</a></div></div>
    `;
  } 
  else if(item.type === 'list') {
    html += `<div><span class="text-gray-500 dark:text-gray-400 text-xs font-bold block mb-1">Judul Menu List</span> <div class="font-semibold mb-2">${item.list_title}</div></div>`;
    
    let listItems = [];
    try { listItems = JSON.parse(item.list_json || "[]"); } catch(e){}
    let listHtml = listItems.map((l, i) => `
      <div class="text-sm mb-2 border-b dark:border-gray-700 pb-2 last:border-0 last:pb-0">
        <b class="text-gray-800 dark:text-gray-200">${i+1}. ${l.title}</b><br>
        <span class="text-gray-500 text-xs">${l.description || 'Tidak ada deskripsi'}</span>
      </div>
    `).join('');
    
    html += `<div><span class="text-gray-500 dark:text-gray-400 text-xs font-bold block mb-1">Daftar Pilihan</span> <div class="bg-gray-50 dark:bg-gray-900 p-3 rounded border dark:border-gray-700">${listHtml}</div></div>`;
  }

  // Tampilkan ke Modal
  document.getElementById("cannedDetailContent").innerHTML = html;
  document.getElementById("cannedDetailModal").classList.remove("hidden");
  
  // Tutup action menu (titik tiga) biar rapi
  document.querySelectorAll('[id^="cannedMenu-"]').forEach(el => el.classList.add('hidden'));
}

function closeCannedDetail() {
  document.getElementById("cannedDetailModal").classList.add("hidden");
}

//EDIT BALASAN CEPAT

function editCanned(id) {
  const item = ALL_CANNED.find(x => x.id === id);
  if(!item) return;

  editCannedId = id; 
  document.querySelector("#cannedModal h2").innerHTML = "✏️ Edit Balasan Cepat";
  
  document.getElementById("cannedTitle").value = item.title;
  document.getElementById("cannedType").value = item.type;
  document.getElementById("cannedMessage").value = item.message;
  
  // 🔥 TAMBAHAN EDIT MEDIA
  hapusMediaCanned();
  if(item.media_url) {
    document.getElementById("cannedMediaUrl").value = item.media_url;
    document.getElementById("cannedMediaType").value = item.media_type;
    document.getElementById("cannedMediaPreview").innerText = "Terdapat file media tersimpan (" + item.media_type + "). Upload file baru untuk menggantinya.";
    document.getElementById("cannedMediaPreview").classList.remove("hidden");
    document.getElementById("btnHapusMedia").classList.remove("hidden");
  }

  toggleCannedFields();

  // Parsing Data Tambahan
  if (item.type === "button") {
    try {
      const btns = JSON.parse(item.buttons_json || "[]");
      document.getElementById("cannedBtn1").value = btns[0] || "";
      document.getElementById("cannedBtn2").value = btns[1] || "";
      document.getElementById("cannedBtn3").value = btns[2] || "";
    } catch(e){}
  } else if (item.type === "flow") {
    document.getElementById("cannedFlowBtn").value = item.flow_button_text || "";
    document.getElementById("cannedFlowId").value = item.flow_id || "";
    document.getElementById("cannedFlowScreen").value = item.flow_screen || "";
  } else if (item.type === "cta") {
    document.getElementById("cannedCtaText").value = item.cta_text || "";
    document.getElementById("cannedCtaUrl").value = item.cta_url || "";
  } else if (item.type === "list") {
    document.getElementById("cannedListTitle").value = item.list_title || "";
    document.getElementById("cannedListItemsBox").innerHTML = "";
    listItemsCount = 0;
    try {
      const lists = JSON.parse(item.list_json || "[]");
      lists.forEach(l => addCannedListItem(l.title, l.description));
    } catch(e){}
  }
  document.getElementById("cannedModal").classList.remove("hidden");
}

async function deleteCanned(id) {
  if(confirm("Yakin hapus balasan cepat ini? Aksi ini tidak dapat dibatalkan.")) {
    try {
      const res = await fetch(`${FF_API}/delete-canned?id=${id}`, { 
         method: "POST", // 🔥 FIX: Ubah jadi POST agar lolos CORS Cloudflare
         headers: { "Content-Type": "application/json" }
      });
      
      if (res.ok) {
         loadCannedData(); // Sukses hapus, render ulang tabel
      } else {
         alert("❌ Gagal menghapus data dari server.");
      }
    } catch(e) {
      alert("❌ Error: Gagal menghubungi server.");
    }
  }
}

async function saveCannedResponse(event) {
  const title = document.getElementById("cannedTitle").value;
  const type = document.getElementById("cannedType").value;
  const message = document.getElementById("cannedMessage").value;

  if(!title || !message) return alert("Judul dan Isi Pesan wajib diisi!");

  let payload = { client_id: FF_CID, title, type, message };
  if(editCannedId) payload.id = editCannedId; 

  if (type === "button") {
    const b1 = document.getElementById("cannedBtn1").value;
    const b2 = document.getElementById("cannedBtn2").value;
    const b3 = document.getElementById("cannedBtn3").value;
    if(!b1) return alert("Minimal isi 1 tombol!");
    payload.buttons_json = JSON.stringify([b1, b2, b3].filter(b => b.trim() !== ""));
  } else if (type === "flow") {
    payload.flow_button_text = document.getElementById("cannedFlowBtn").value;
    payload.flow_id = document.getElementById("cannedFlowId").value;
    payload.flow_screen = document.getElementById("cannedFlowScreen").value;
    if(!payload.flow_id) return alert("Flow ID Wajib diisi!");
  } else if (type === "cta") {
    payload.cta_text = document.getElementById("cannedCtaText").value;
    payload.cta_url = document.getElementById("cannedCtaUrl").value;
    if(!payload.cta_url) return alert("URL / Link wajib diisi!");
  } else if (type === "list") {
    payload.list_title = document.getElementById("cannedListTitle").value;
    if(!payload.list_title) return alert("Teks Tombol Menu wajib diisi!");
    const rows = document.querySelectorAll(".list-item-row");
    if(rows.length === 0) return alert("Tambahkan minimal 1 Pilihan Menu!");
    let listItems = [];
    rows.forEach(r => {
      const t = r.querySelector(".list-title").value;
      const d = r.querySelector(".list-desc").value;
      if(t) listItems.push({ title: t, description: d });
    });
    payload.list_json = JSON.stringify(listItems);
  }

  const btn = event ? event.target : document.querySelector("button[onclick^='saveCanned']");
  if(btn) { btn.innerText = "⏳ Menyimpan..."; btn.disabled = true; }

  try {
    // 🔥 UPLOAD MEDIA DULU JIKA ADA
    const fileInput = document.getElementById("cannedMedia");
    payload.media_url = document.getElementById("cannedMediaUrl").value;
    payload.media_type = document.getElementById("cannedMediaType").value;

    if(fileInput.files.length > 0) {
      const f = fileInput.files[0];
      if(f.size > 5 * 1024 * 1024) {
         if(btn) { btn.innerText = "Simpan Template"; btn.disabled = false; }
         return alert("Ukuran file maksimal 5MB!");
      }
      
      if(btn) btn.innerText = "⏳ Uploading Media...";
      const fd = new FormData();
      fd.append("file", f);
      
      const upRes = await fetch(FF_API + "/upload", { method: "POST", body: fd });
      const upData = await upRes.json();
      
      if(upData.url) {
        payload.media_url = upData.url;
        payload.media_type = f.type.includes("image") ? "image" : (f.type.includes("video") ? "video" : "document");
      } else {
        throw new Error("Gagal upload file ke server.");
      }
    }

    if(btn) btn.innerText = "⏳ Menyimpan Data...";
    await fetch(`${FF_API}/save-canned`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if(btn) { btn.innerText = "Simpan Template"; btn.disabled = false; }
    
    alert(editCannedId ? "Berhasil diperbarui!" : "Berhasil disimpan!");
    closeCannedModal();
    loadCannedData();
  } catch(e) {
    if(btn) { btn.innerText = "Simpan Template"; btn.disabled = false; }
    alert("Gagal: " + e.message);
  }
}
