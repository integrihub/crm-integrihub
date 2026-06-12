// ================= report.js ================= 
const REPORT_API = window.location.hostname.includes("staging") || 
               window.location.hostname.includes("pages.dev") || 
               window.location.hostname.includes("localhost") || 
               window.location.hostname.includes("127.0.0.1")
  ? "https://api-staging.crm.integrihub.my.id"
  : "https://api-crm.integrihub.my.id";
  
const REPORT_CID = localStorage.getItem("client_id");

// Data Master
let allUsersReport = [];
let allBlastTemplates = [];
let allQRTemplates = [];
let allFlowTemplates = [];

// Memori Centangan (Anti Hilang Pas Search)
let checkedUserSet = new Set();
let checkedBlastSet = new Set();
let checkedQRSet = new Set();
let checkedFlowSet = new Set();

// 🔥 STATE PAGINATION UNTUK TIAP BOX
const itemsPerPage = 25;
let paginationState = {
  users: { currentPage: 1, filterText: "" },
  blast: { currentPage: 1, filterText: "" },
  flow: { currentPage: 1, filterText: "" }
};

// 🔥 GANTI NAMA: changeReportPage (Agar tidak bentrok dengan changePage di app.js)
function changeReportPage(type, direction) {
  if (type === "users") {
    paginationState.users.currentPage += direction;
    renderUserCheckboxList();
  } else if (type === "blast") {
    paginationState.blast.currentPage += direction;
    renderTemplateCheckboxList("blast");
  } else if (type === "flow") {
    paginationState.flow.currentPage += direction;
    renderTemplateCheckboxList("flow");
  }
}

async function initReportDashboard() {
  await loadTemplatesForReport();
  await loadUsersForReport();
  
  // Event listener search User
  document.getElementById("chatSearch")?.addEventListener("input", function() {
    paginationState.users.filterText = this.value.toLowerCase();
    paginationState.users.currentPage = 1; // Reset ke halaman 1 saat search
    renderUserCheckboxList();
  });

  // Event listener search Template Blast
  document.getElementById("blastSearchInput")?.addEventListener("input", function() {
    paginationState.blast.filterText = this.value.toLowerCase();
    paginationState.blast.currentPage = 1;
    renderTemplateCheckboxList("blast");
  });

  // Event listener search Template Flow
  document.getElementById("flowSearchInput")?.addEventListener("input", function() {
    paginationState.flow.filterText = this.value.toLowerCase();
    paginationState.flow.currentPage = 1;
    renderTemplateCheckboxList("flow");
  });
}

// ================= 1. LOAD & CLASSIFY TEMPLATE =================
async function loadTemplatesForReport() {
  try {
    // A. LOAD TEMPLATE RESMI META
    const res = await fetch(REPORT_API + "/templates?client_id=" + REPORT_CID);
    const templates = await res.json();

    templates.forEach(t => {
      const statusTpl = String(t.status || "").trim().toUpperCase();
      if (statusTpl !== "APPROVED") return;

      allBlastTemplates.push(t.name);

      let buttons = [];
      try {
         if (Array.isArray(t.buttons)) buttons = t.buttons;
         else if (typeof t.buttons === "string") buttons = JSON.parse(t.buttons);
         else if (typeof t.buttons_json === "string") buttons = JSON.parse(t.buttons_json);
      } catch(e) {}
      
      let hasQR = false, hasFlow = false;
      buttons.forEach(b => {
        if (b.type === "quick_reply") hasQR = true;
        if (b.type === "flow") hasFlow = true;
      });

      if (hasQR) allQRTemplates.push(t.name);
      if (hasFlow) allFlowTemplates.push(t.name);
    });

    // B. 🔥 LOAD BALASAN CEPAT AGAR MUNCUL DI TRACKER REPORT
    try {
      // B. 🔥 Tambahkan Balasan Cepat (Free Form) ke Report
    const resCanned = await fetch(REPORT_API + "/get-canned?client_id=" + REPORT_CID);
    const cannedData = await resCanned.json();
    cannedData.forEach(c => {
      // 🔥 FIX: Hapus 'cta'. Tracker Button hanya untuk 'button' dan 'list' saja.
      if (c.type === "button" || c.type === "list") allQRTemplates.push(c.title);
      if (c.type === "flow") allFlowTemplates.push(c.title);
    });
      // B. 🔥 TAMBAHKAN LABEL "Chatbot Interaction" KE LIST FILTER
    if (!allQRTemplates.includes("Chatbot Interaction")) {
        allQRTemplates.push("Chatbot Interaction");
    }
  } catch(e) { console.log("Gagal load canned for report", e); }

    // Render ke HTML
    renderTemplateCheckboxList("blast");
    renderTemplateCheckboxList("flow");

  } catch(e) { console.error("Gagal load template report", e); }
}

// RENDER CHECKBOX TEMPLATE
function renderTemplateCheckboxList(type) {
  let masterList = [];
  let targetListId = "";
  let memorySet = null;
  let state = null;
  let masterCheckId = "";

  if (type === "blast") { masterList = allBlastTemplates; targetListId = "blastCheckboxList"; memorySet = checkedBlastSet; state = paginationState.blast; masterCheckId = "selectAllBlast"; }
  else if (type === "flow") { masterList = allFlowTemplates; targetListId = "flowCheckboxList"; memorySet = checkedFlowSet; state = paginationState.flow; masterCheckId = "selectAllFlow"; }
  else return; // QR tidak dipakai

  const listContainer = document.getElementById(targetListId);
  if (!listContainer) return;

  // Hapus pagination lama
  const existingPagination = listContainer.parentElement.querySelector(".pagination-container");
  if(existingPagination) existingPagination.remove();

  // Filter
  const filtered = masterList.filter(name => name.toLowerCase().includes(state.filterText));

  // Logika Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  const startIndex = (state.currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageData = filtered.slice(startIndex, endIndex);

  const isAllChecked = (filtered.length > 0 && filtered.every(name => memorySet.has(name))) ? "checked" : "";
  let html = `
    <label class="block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold border-b-2 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm">
      <input type="checkbox" id="${masterCheckId}" onchange="toggleAllTemplates('${type}')" class="mr-2" ${isAllChecked}> Pilih Semua Template Terfilter
    </label>
  `;

  if (filtered.length === 0) {
    html += `<div class="p-3 text-center text-xs text-gray-400">Tidak ada template</div>`;
  } else {
    html += pageData.map(name => {
      const isChecked = memorySet.has(name) ? "checked" : "";
      return `
        <label class="block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-600 truncate">
          <input type="checkbox" value="${name}" onchange="toggleSingleTemplate('${type}', this)" class="mr-2" ${isChecked}> 
          ${name}
        </label>
      `;
    }).join('');
  }

  listContainer.innerHTML = html;

  if (totalPages > 1) {
    const paginationHtml = `
      <div class="pagination-container flex items-center justify-between p-2 text-xs border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        <button onclick="changeReportPage('${type}', -1)" class="px-2 py-1 bg-white dark:bg-gray-700 border rounded shadow-sm disabled:opacity-30" ${state.currentPage === 1 ? 'disabled' : ''}>&lsaquo; Prev</button>
        <span class="text-gray-500 font-medium">${startIndex + 1}-${endIndex} dari ${totalItems}</span>
        <button onclick="changeReportPage('${type}', 1)" class="px-2 py-1 bg-white dark:bg-gray-700 border rounded shadow-sm disabled:opacity-30" ${state.currentPage === totalPages ? 'disabled' : ''}>Next &rsaquo;</button>
      </div>
    `;
    listContainer.insertAdjacentHTML("afterend", paginationHtml);
  }
}

// TOGGLE SINGLE TEMPLATE
function toggleSingleTemplate(type, checkbox) {
  let memorySet = null, masterCheckId = "";

  if (type === "blast") { memorySet = checkedBlastSet; masterCheckId = "selectAllBlast"; }
  else if (type === "qr") { memorySet = checkedQRSet; masterCheckId = "selectAllQR"; }
  else if (type === "flow") { memorySet = checkedFlowSet; masterCheckId = "selectAllFlow"; }

  if (checkbox.checked) memorySet.add(checkbox.value);
  else memorySet.delete(checkbox.value);
  
  document.getElementById(masterCheckId).checked = false;
}

// TOGGLE ALL TEMPLATE
function toggleAllTemplates(type) {
  let masterCheckId = "", state = null, masterList = [], memorySet = null;

  if (type === "blast") { masterCheckId = "selectAllBlast"; state = paginationState.blast; masterList = allBlastTemplates; memorySet = checkedBlastSet; }
  else if (type === "flow") { masterCheckId = "selectAllFlow"; state = paginationState.flow; masterList = allFlowTemplates; memorySet = checkedFlowSet; }
  else return;

  const isChecked = document.getElementById(masterCheckId).checked;
  const filtered = masterList.filter(name => name.toLowerCase().includes(state.filterText));
  
  // Menandai semua data hasil pencarian (bukan cuma halaman yang tampil)
  filtered.forEach(name => {
    if (isChecked) memorySet.add(name);
    else memorySet.delete(name);
  });
  
  // Render ulang agar checkbox di layar ikut ter-update
  renderTemplateCheckboxList(type);
}


// ================= 2. LOAD & RENDER MULTI-USER =================
async function loadUsersForReport() {
  try {
    const res = await fetch(REPORT_API + "/messages", { headers: { "client-id": REPORT_CID } });
    const data = await res.json();
    
    if(Array.isArray(data)) {
       const map = {};
       
       // 🔥 FIX: Urutkan dari ID kecil ke besar, agar nama terbaru akan menimpa nama lama
       const sorted = [...data].sort((a, b) => a.id - b.id);
       
       sorted.forEach(m => {
         const user = m.direction === 'outgoing' ? m.receiver : m.sender;
         
         if (user) {
            // Jika belum ada di map, buat baru
            if (!map[user]) {
                map[user] = { number: user, name: m.name || "User " + user.slice(-4) };
            } else {
                // Jika sudah ada, update JIKA namanya benar (bukan placeholder)
                if (m.name && m.name !== "Unknown" && !m.name.startsWith("User ")) {
                    map[user].name = m.name;
                }
            }
         }
       });
       
       allUsersReport = Object.values(map);
       renderUserCheckboxList();
    }
  } catch(e) { console.log("Gagal load user", e); }
}

// RENDER CHECKBOX USER
function renderUserCheckboxList() {
  const listContainer = document.getElementById("userCheckboxList");
  if(!listContainer) return;

  const state = paginationState.users;
  
  const existingPagination = listContainer.parentElement.querySelector(".pagination-container");
  if(existingPagination) existingPagination.remove();

  const filtered = allUsersReport.filter(u => 
    u.name.toLowerCase().includes(state.filterText) || u.number.includes(state.filterText)
  );

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  const startIndex = (state.currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageData = filtered.slice(startIndex, endIndex);

  const isAllChecked = (filtered.length > 0 && filtered.every(u => checkedUserSet.has(u.number))) ? "checked" : "";
  let html = `
    <label class="block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer font-bold border-b-2 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm">
      <input type="checkbox" id="selectAllUsers" onchange="toggleAllUsers(this)" class="mr-2" ${isAllChecked}> Pilih Semua User Terfilter
    </label>
  `;

  if (filtered.length === 0) {
    html += `<div class="p-3 text-center text-xs text-gray-400">Tidak ada user</div>`;
  } else {
    html += pageData.map(u => {
      const isChecked = checkedUserSet.has(u.number) ? "checked" : "";
      return `
        <label class="block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-600">
          <input type="checkbox" value="${u.number}" onchange="toggleSingleUser(this)" class="mr-2" ${isChecked}> 
          ${u.name} <span class="text-xs text-gray-400 truncate">(${u.number})</span>
        </label>
      `;
    }).join('');
  }

  listContainer.innerHTML = html;

  if (totalPages > 1) {
    const paginationHtml = `
      <div class="pagination-container flex items-center justify-between p-2 text-xs border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        <button onclick="changeReportPage('users', -1)" class="px-2 py-1 bg-white dark:bg-gray-700 border rounded shadow-sm disabled:opacity-30" ${state.currentPage === 1 ? 'disabled' : ''}>&lsaquo; Prev</button>
        <span class="text-gray-500 font-medium">${startIndex + 1}-${endIndex} dari ${totalItems}</span>
        <button onclick="changeReportPage('users', 1)" class="px-2 py-1 bg-white dark:bg-gray-700 border rounded shadow-sm disabled:opacity-30" ${state.currentPage === totalPages ? 'disabled' : ''}>Next &rsaquo;</button>
      </div>
    `;
    listContainer.insertAdjacentHTML("afterend", paginationHtml);
  }
}

function toggleSingleUser(checkbox) {
  if (checkbox.checked) checkedUserSet.add(checkbox.value);
  else checkedUserSet.delete(checkbox.value);
  document.getElementById("selectAllUsers").checked = false;
}

function toggleAllUsers(masterCheckbox) {
  const isChecked = masterCheckbox.checked;
  const state = paginationState.users;
  const filtered = allUsersReport.filter(u => 
    u.name.toLowerCase().includes(state.filterText) || u.number.includes(state.filterText)
  );

  filtered.forEach(u => {
    if (isChecked) checkedUserSet.add(u.number);
    else checkedUserSet.delete(u.number);
  });
  
  // Render ulang agar UI checkbox ter-update
  renderUserCheckboxList();
}

// ================= 3. EKSEKUSI DOWNLOAD =================
function downloadReport(type) {
  let start = "", end = "", templates = "all", users = "all";

  // Ambil Data Berdasarkan Tipe Report
  if (type === "blast") {
    start = document.getElementById("blastStart").value;
    end = document.getElementById("blastEnd").value;
    
    if (!start || !end) return showCustomToast("Mohon pilih Tanggal Mulai & Akhir terlebih dahulu!");
    
    if (!document.getElementById("selectAllBlast").checked && checkedBlastSet.size > 0) templates = Array.from(checkedBlastSet).join(",");
    else if (!document.getElementById("selectAllBlast").checked && checkedBlastSet.size === 0) return showCustomToast("Pilih minimal 1 template!");
  } 
  else if (type === "button") {
    start = document.getElementById("qrStart").value;
    end = document.getElementById("qrEnd").value;
    
    if (!start || !end) return showCustomToast("Mohon pilih Tanggal Mulai & Akhir terlebih dahulu!");
    
    // 🔥 FIX: Paksa semua data di-export tanpa perlu pilih template lagi
    templates = "all"; 
  }
  else if (type === "flow") {
    start = document.getElementById("flowStart").value;
    end = document.getElementById("flowEnd").value;
    
    if (!start || !end) return showCustomToast("Mohon pilih Tanggal Mulai & Akhir terlebih dahulu!");
    
    if (!document.getElementById("selectAllFlow").checked && checkedFlowSet.size > 0) templates = Array.from(checkedFlowSet).join(",");
    else if (!document.getElementById("selectAllFlow").checked && checkedFlowSet.size === 0) return showCustomToast("Pilih minimal 1 template!");
  } 
  else if (type === "chatlog") {
    start = document.getElementById("chatStart").value;
    end = document.getElementById("chatEnd").value;
    
    if (!start || !end) return showCustomToast("Mohon pilih Tanggal Mulai & Akhir terlebih dahulu!");
    
    if (!document.getElementById("selectAllUsers").checked && checkedUserSet.size > 0) users = Array.from(checkedUserSet).join(",");
    else if (!document.getElementById("selectAllUsers").checked && checkedUserSet.size === 0) return showCustomToast("Pilih minimal 1 user!");
  }

  // Tembak URL Export (Mengirim string gabungan template dengan koma)
  const exportUrl = `${REPORT_API}/export?client_id=${REPORT_CID}&report_type=${type}&start=${start}&end=${end}&template=${encodeURIComponent(templates)}&users=${users}`;
  window.open(exportUrl);
}

// ================= CUSTOM ALERT (TOAST MODERN) =================
function showCustomToast(message, type = "error") {
  const toast = document.createElement("div");
  const bgColor = type === "error" ? "bg-red-500" : "bg-green-500";
  const icon = type === "error" ? "⚠️" : "✅";
  
  toast.className = `fixed top-5 right-5 ${bgColor} text-white px-5 py-3 rounded-lg shadow-2xl z-[9999] animate-bounce flex items-center gap-2 transition-all duration-500`;
  toast.innerHTML = `<span class="text-lg">${icon}</span> <span class="font-semibold text-sm">${message}</span>`;
  
  document.body.appendChild(toast);
  
  // Hilangkan toast secara otomatis setelah 3 detik
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-x-full");
    setTimeout(() => toast.remove(), 500); // Hapus dari DOM setelah animasi selesai
  }, 3000);
}
