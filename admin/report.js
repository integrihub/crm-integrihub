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

async function initReportDashboard() {
  await loadTemplatesForReport();
  await loadUsersForReport();
  
  // Event listener search User
  document.getElementById("chatSearch")?.addEventListener("input", function() {
    renderUserCheckboxList(this.value.toLowerCase());
  });

  // Event listener search Template Blast
  document.getElementById("blastSearchInput")?.addEventListener("input", function() {
    renderTemplateCheckboxList("blast", this.value.toLowerCase());
  });

  // Event listener search Template QR
  //document.getElementById("qrSearchInput")?.addEventListener("input", function() {
    //renderTemplateCheckboxList("qr", this.value.toLowerCase());
  //});

  // Event listener search Template Flow
  document.getElementById("flowSearchInput")?.addEventListener("input", function() {
    renderTemplateCheckboxList("flow", this.value.toLowerCase());
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
    renderTemplateCheckboxList("blast", "");
    //renderTemplateCheckboxList("qr", "");
    renderTemplateCheckboxList("flow", "");

  } catch(e) { console.error("Gagal load template report", e); }
}

// RENDER CHECKBOX TEMPLATE
function renderTemplateCheckboxList(type, filterText) {
  let masterList = [];
  let targetListId = "";
  let memorySet = null;

  if (type === "blast") { masterList = allBlastTemplates; targetListId = "blastCheckboxList"; memorySet = checkedBlastSet; }
  else if (type === "qr") { masterList = allQRTemplates; targetListId = "qrCheckboxList"; memorySet = checkedQRSet; }
  else if (type === "flow") { masterList = allFlowTemplates; targetListId = "flowCheckboxList"; memorySet = checkedFlowSet; }

  const listEl = document.getElementById(targetListId);
  if (!listEl) return;

  const filtered = masterList.filter(name => name.toLowerCase().includes(filterText));

  listEl.innerHTML = filtered.map(name => {
    const isChecked = memorySet.has(name) ? "checked" : "";
    return `
      <label class="block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-600 truncate">
        <input type="checkbox" value="${name}" onchange="toggleSingleTemplate('${type}', this)" class="mr-2" ${isChecked}> 
        ${name}
      </label>
    `;
  }).join('');

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="p-3 text-center text-xs text-gray-400">Tidak ada template</div>`;
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
  let masterCheckId = "", listId = "", memorySet = null;

  if (type === "blast") { masterCheckId = "selectAllBlast"; listId = "blastCheckboxList"; memorySet = checkedBlastSet; }
  else if (type === "qr") { masterCheckId = "selectAllQR"; listId = "qrCheckboxList"; memorySet = checkedQRSet; }
  else if (type === "flow") { masterCheckId = "selectAllFlow"; listId = "flowCheckboxList"; memorySet = checkedFlowSet; }

  const isChecked = document.getElementById(masterCheckId).checked;
  const checkboxes = document.querySelectorAll(`#${listId} input[type='checkbox']`);
  
  checkboxes.forEach(cb => {
    cb.checked = isChecked;
    if (isChecked) memorySet.add(cb.value);
    else memorySet.delete(cb.value);
  });
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

function renderUserCheckboxList(filterText = "") {
  const list = document.getElementById("userCheckboxList");
  if(!list) return;

  const filtered = allUsersReport.filter(u => 
    u.name.toLowerCase().includes(filterText) || u.number.includes(filterText)
  );

  list.innerHTML = filtered.map(u => {
    const isChecked = checkedUserSet.has(u.number) ? "checked" : "";
    return `
      <label class="block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-600">
        <input type="checkbox" value="${u.number}" onchange="toggleSingleUser(this)" class="mr-2" ${isChecked}> 
        ${u.name} <span class="text-xs text-gray-400">(${u.number})</span>
      </label>
    `;
  }).join('');
}

function toggleSingleUser(checkbox) {
  if (checkbox.checked) checkedUserSet.add(checkbox.value);
  else checkedUserSet.delete(checkbox.value);
  document.getElementById("selectAllUsers").checked = false;
}

function toggleAllUsers(masterCheckbox) {
  const isChecked = masterCheckbox.checked;
  const checkboxes = document.querySelectorAll("#userCheckboxList input[type='checkbox']");
  checkboxes.forEach(cb => {
    cb.checked = isChecked;
    if (isChecked) checkedUserSet.add(cb.value);
    else checkedUserSet.delete(cb.value);
  });
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
