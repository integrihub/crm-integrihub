const API = window.location.hostname.includes("staging") || 
            window.location.hostname.includes("pages.dev") || 
            window.location.hostname.includes("localhost") || 
            window.location.hostname.includes("127.0.0.1")
  ? "https://api-staging.crm.integrihub.my.id"
  : "https://api-crm.integrihub.my.id";
  
const MEDIA_BASE = API + "/media/";
const CID=localStorage.getItem("client_id");

let paramCount = 1;
// ================= STATE UNTUK FILTER CHAT LIST =================
let activeChatFilter = 'all';
let chatSearchQuery = '';
let processedChatMap = {};


function insertParam(){
  const body = document.getElementById("tplBody");
  body.value += ` {{${paramCount}}} `;
  paramCount++;
}


let quickReplyCount = 0;

//QUICK REPLAY
function addQuickReply(){
  if(quickReplyCount >= 10){
    alert("Max 10 quick reply");
    return;
  }

  const box = document.getElementById("quickReplyBox");

  const wrapper = document.createElement("div");
  wrapper.className = "flex gap-1 mb-1";

  const input = document.createElement("input");
  input.placeholder = "Quick reply";
  input.className = "w-full border p-1";
  input.className =
    "w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded";

  const btn = document.createElement("button");
  btn.innerText = "✕";
  btn.className = "px-2 bg-red-500 text-white";
  btn.onclick = () => {
    wrapper.remove();
    quickReplyCount--;
  };

  wrapper.appendChild(input);
  wrapper.appendChild(btn);

  box.appendChild(wrapper);
  quickReplyCount++;
}

//FORMAT BOLD DAN ITALIC
function formatBold(){
  const t = document.getElementById("tplBody");
  wrapText(t, "*");
}

function formatItalic(){
  const t = document.getElementById("tplBody");
  wrapText(t, "_");
}

function wrapText(el, symbol){
  const start = el.selectionStart;
  const end = el.selectionEnd;

  const selected = el.value.substring(start, end);

  const newText = symbol + selected + symbol;

  el.value =
    el.value.substring(0, start) +
    newText +
    el.value.substring(end);

  el.selectionStart = start + symbol.length;
  el.selectionEnd = end + symbol.length;
}

let searchUser;

window.addEventListener("DOMContentLoaded", () => {

  const tplBodyEl = document.getElementById("tplBody");
  const tplHeaderEl = document.getElementById("tplHeader");

  if(tplBodyEl){
    tplBodyEl.addEventListener("input", livePreview);
  }

  if(tplHeaderEl){
    tplHeaderEl.addEventListener("input", livePreview);
  }

  // 🔥 FIX: trigger preview saat pilih file
  const tplHeaderFile = document.getElementById("tplHeaderFile");
  if(tplHeaderFile){
    tplHeaderFile.addEventListener("change", livePreview);
  }

  // 🔥 OPTIONAL: trigger saat ganti media type
  const mediaType = document.getElementById("tplHeaderMediaType");
  if(mediaType){
    mediaType.addEventListener("change", livePreview);
  }

  // SEARCH USER
  searchUser = document.getElementById("searchUser");

  // EMOJI PICKER
  const picker = document.querySelector("emoji-picker");
  if (picker) {
    picker.addEventListener("emoji-click", e => {
      document.getElementById("msg").value += e.detail.unicode;
    });
  }

});


let selected=null;
let ALL_MESSAGES=[];
let CLIENT=null;
let LAST_RENDER = "";
let fileData = null;
let fileType = null;
let fileName = null;
let chatFilePreview = null;
let templateFilePreview = null;
let isSending = false;
let fileMime = null;
let uploadedHeaderUrl = null;

//PAGINATION LIST TEMPLATE
let allTemplates = [];
let currentPage = 1;
let limit = 10;
let keyword = "";

// 🔥 STATE UNTUK EDIT TEMPLATE
let currentEditId = null;

// 🔥 FUNGSI TOGGLE TITIK TIGA (Template Saja)
function toggleTemplateActionMenu(event, id) {
  event.stopPropagation(); 
  
  // Tutup semua menu template lain
  document.querySelectorAll(".action-menu").forEach(menu => {
    if(menu.id !== "action-menu-" + id) menu.classList.add("hidden");
  });
  
  // Buka/Tutup menu template yang diklik
  document.getElementById("action-menu-" + id).classList.toggle("hidden");
}

// 🔥 TUTUP DROPDOWN JIKA KLIK DI LUAR (Template)
window.addEventListener("click", function(e){
  // Pastikan selector onclick di HTML disesuaikan menjadi toggleTemplateActionMenu
  if(!e.target.closest(".action-menu") && !e.target.closest("button[onclick^='toggleTemplateActionMenu']")) {
    document.querySelectorAll(".action-menu").forEach(menu => menu.classList.add("hidden"));
  }
});

//SET EMOJI DAN UPLOAD FILE
// EMOJI
function toggleEmoji(){
  document.getElementById("emojiBox").classList.toggle("hidden");
}

// FILE UPLOAD
function uploadFile(){
  const f = document.getElementById("file").files[0];
  if(!f) return;
  if(f.size > 5 * 1024 * 1024){
    alert("Max file 5MB");
    return;
  }

  fileMime = f.type;

  const reader = new FileReader();

  reader.onload = e => {
    fileData = e.target.result;
    fileName = f.name;

    if(chatFilePreview){
  URL.revokeObjectURL(chatFilePreview);
}
chatFilePreview = URL.createObjectURL(f);
    if(f.type.includes("image")) fileType = "image";
    else if(f.type.includes("video")) fileType = "video";
    else fileType = "document";

    showFilePreview();
  };

  reader.readAsDataURL(f);
}

//SHOW PREVIEW FILE
function showFilePreview(){
  let html = "";

  if(fileType === "image"){
    html = `
      <div class="relative inline-block">
        <img src="${chatFilePreview}" class="h-32 rounded">
        <button onclick="cancelFile()" 
          class="absolute top-1 right-1 bg-black/60 text-white rounded-full px-2">
          ✕
        </button>
      </div>
    `;
  }

  else if(fileType === "video"){
    html = `
      <div class="relative inline-block">
        <video src="${chatFilePreview}"class="h-32 rounded" controls></video>
        <button onclick="cancelFile()" 
          class="absolute top-1 right-1 bg-black/60 text-white rounded-full px-2">
          ✕
        </button>
      </div>
    `;
  }

  else {
    html = `
      <div class="relative p-3 bg-gray-200 dark:bg-gray-700 rounded flex items-center gap-2">
        📄 <span>${fileName}</span>

        <button onclick="cancelFile()" 
          class="ml-auto bg-black/60 text-white rounded px-2">
          ✕
        </button>
      </div>
    `;
  }

  document.getElementById("filePreviewBox").innerHTML = html;
}

//SET MENU
function setActiveMenu(menuId){
  // reset semua
  document.querySelectorAll(".menu-btn").forEach(btn=>{
    btn.classList.remove("bg-green-500", "text-white");
    btn.classList.add("bg-gray-200", "dark:bg-gray-700", "text-black", "dark:text-white");
  });

  // aktifkan yg dipilih
  const active = document.getElementById(menuId);
  if(active){
    active.classList.remove("bg-gray-200", "dark:bg-gray-700", "text-black", "dark:text-white");
    active.classList.add("bg-green-500", "text-white");
  }
}

// ================= LOAD KPI & DUAL-AXIS CHART =================
async function loadKPI(){
  try {
    const start = document.getElementById("kpiStart")?.value || "";
    const end = document.getElementById("kpiEnd")?.value || "";

    const res = await fetch(API + `/kpi-agent?start=${start}&end=${end}`, { headers: { "client-id": CID }});
    const data = await res.json();
    
    // Simpan ke state global untuk pagination
    allKpiData = data || [];
    
    // Render Summary Card
    renderKpiSummary();
    
    // Render Chart (Menampilkan TOP 10 Agent agar grafik tidak sesak)
    renderKpiChart(allKpiData.slice(0, 10));

    // Render Tabel sesuai Pagination
    renderKpiTable();

  } catch(err){
    console.log("KPI ERROR:", err);
  }
}

function renderKpiSummary() {
    const summary = document.getElementById("kpiSummary");
    if(!summary) return;
    
    summary.innerHTML = `
      <div class="col-span-full grid grid-cols-4 gap-4 w-full">
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow text-center border-b-4 border-blue-500">
          <p class="text-gray-500 text-sm font-bold">Total Agent</p>
          <p class="text-2xl font-black mt-1">${allKpiData.length}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow text-center border-b-4 border-green-500">
          <p class="text-gray-500 text-sm font-bold">Total Chat</p>
          <p class="text-2xl font-black mt-1">${allKpiData.reduce((a,b)=>a+b.total,0)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow text-center border-b-4 border-gray-500">
          <p class="text-gray-500 text-sm font-bold">Total Resolved</p>
          <p class="text-2xl font-black text-gray-500 mt-1">${allKpiData.reduce((a,b)=>a + (Number(b.resolved) || 0), 0)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded shadow text-center border-b-4 border-yellow-500">
          <p class="text-gray-500 text-sm font-bold">Avg SLA</p>
          <p class="text-2xl font-black text-yellow-500 mt-1">${allKpiData.length ? Math.round(allKpiData.reduce((a,b)=>a+b.sla,0)/allKpiData.length) : 0}%</p>
        </div>
      </div>
    `;
}

function renderKpiTable() {
    const table = document.getElementById("kpiTable");
    const info = document.getElementById("kpiTotalInfo");
    if(!table) return;

    const totalData = allKpiData.length;
    const totalPage = Math.ceil(totalData / kpiLimit);
    
    // Safety check jika current page melebihi total page
    if (kpiCurrentPage > totalPage) kpiCurrentPage = Math.max(1, totalPage);

    const start = (kpiCurrentPage - 1) * kpiLimit;
    const end = start + kpiLimit;
    const pageData = allKpiData.slice(start, end);

    if (info) {
        info.innerText = `Menampilkan ${totalData === 0 ? 0 : start + 1}-${Math.min(end, totalData)} dari ${totalData} Agent`;
    }

    if (pageData.length === 0) {
        table.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-400 italic">Belum ada data agent.</td></tr>`;
        renderKpiPaginationControls(0);
        return;
    }

    table.innerHTML = pageData.map(a => `
    <tr class="border-b dark:border-gray-700 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition">
      <td class="p-3 text-left ${!a.agent || a.agent === "-" ? "text-red-400 italic" : "font-semibold text-gray-800 dark:text-gray-200"}">${a.agent || "-"}</td>
      <td class="font-semibold text-blue-600 dark:text-blue-400">${a.total}</td>
      <td class="font-bold text-gray-500 dark:text-gray-400">${a.resolved || 0}</td> 
      <td>${a.avg_response < 1 ? Math.round(a.avg_response * 60) + " sec" : a.avg_response + " min"}</td>
      <td class="w-40">
        <div class="text-xs mb-1">${a.sla}%</div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
          <div class="h-2 rounded ${a.sla >= 90 ? 'bg-green-500' : a.sla >= 70 ? 'bg-yellow-500' : 'bg-red-500'}" style="width:${a.sla}%"></div>
        </div>
      </td>
      <td>
        <span class="px-2 py-1 rounded text-xs font-semibold ${a.sla >= 90 ? 'bg-green-500/20 text-green-600 dark:text-green-400' : a.sla >= 70 ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}">${a.status}</span>
      </td>
    </tr>
    `).join("");

    renderKpiPaginationControls(totalPage);
}

function renderKpiPaginationControls(totalPage) {
    const box = document.getElementById("kpiPagination");
    if (!box) return;
    box.innerHTML = "";
    if (totalPage <= 1) return;

    let html = "";
    const activeClass = "bg-blue-500 text-white border-blue-500 shadow-sm";
    const normalClass = "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700";

    // Prev Button
    html += `<button onclick="changeKpiPage(${kpiCurrentPage - 1})" ${kpiCurrentPage === 1 ? "disabled" : ""} class="px-2 py-1 border rounded ${kpiCurrentPage === 1 ? 'opacity-30 cursor-not-allowed' : normalClass}">‹</button>`;

    // Page Numbers (Tampil maksimal 5 angka berjejer)
    let startP = Math.max(1, kpiCurrentPage - 2);
    let endP = Math.min(totalPage, kpiCurrentPage + 2);

    if (startP > 1) {
        html += `<button onclick="changeKpiPage(1)" class="px-3 py-1 border rounded ${normalClass}">1</button>`;
        if (startP > 2) html += `<span class="px-2 text-gray-400">...</span>`;
    }

    for (let i = startP; i <= endP; i++) {
        html += `<button onclick="changeKpiPage(${i})" class="px-3 py-1 border rounded ${i === kpiCurrentPage ? activeClass : normalClass}">${i}</button>`;
    }

    if (endP < totalPage) {
        if (endP < totalPage - 1) html += `<span class="px-2 text-gray-400">...</span>`;
        html += `<button onclick="changeKpiPage(${totalPage})" class="px-3 py-1 border rounded ${normalClass}">${totalPage}</button>`;
    }

    // Next Button
    html += `<button onclick="changeKpiPage(${kpiCurrentPage + 1})" ${kpiCurrentPage === totalPage ? "disabled" : ""} class="px-2 py-1 border rounded ${kpiCurrentPage === totalPage ? 'opacity-30 cursor-not-allowed' : normalClass}">›</button>`;

    box.innerHTML = html;
}

function changeKpiPage(p) {
    const totalPage = Math.ceil(allKpiData.length / kpiLimit);
    if (p < 1 || p > totalPage) return;
    kpiCurrentPage = p;
    renderKpiTable();
}

function changeKpiLimit() {
    kpiLimit = parseInt(document.getElementById("kpiLimit").value);
    kpiCurrentPage = 1; // Reset ke halaman 1 tiap ubah limit
    renderKpiTable();
}

function renderKpiChart(chartData) {
    const canvas = document.getElementById("kpiChart");
    if(!canvas || !canvas.offsetParent) return;
    if (typeof Chart === "undefined") return;

    const labels = chartData.map(a => a.agent || "-");
    const totalData = chartData.map(a => Number(a.total) || 0);
    const resolvedData = chartData.map(a => Number(a.resolved) || 0);
    const avgData = chartData.map(a => parseFloat(a.avg_response) || 0);

    requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d");
      if (window.kpiChart && typeof window.kpiChart.destroy === "function") window.kpiChart.destroy();

      window.kpiChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            { label: "Total Chat", data: totalData, backgroundColor: 'rgba(59, 130, 246, 0.8)', yAxisID: 'y', borderRadius: 4 },
            { label: "Resolved", data: resolvedData, backgroundColor: 'rgba(16, 185, 129, 0.8)', yAxisID: 'y', borderRadius: 4 },
            { label: "Avg Response (min)", data: avgData, type: 'line', borderColor: 'rgba(245, 158, 11, 1)', backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 3, tension: 0.3, pointBackgroundColor: 'rgba(245, 158, 11, 1)', yAxisID: 'y1' }
          ]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { tooltip: { cornerRadius: 8 } },
          scales: {
            y: {
              type: 'linear', display: true, position: 'left',
              title: { display: true, text: 'Jumlah Chat', color: '#6b7280' },
              grid: { color: 'rgba(156, 163, 175, 0.1)' }
            },
            y1: {
              type: 'linear', display: true, position: 'right',
              title: { display: true, text: 'Waktu (Menit)', color: '#6b7280' },
              grid: { drawOnChartArea: false } 
            }
          }
        }
      });
    });

  } 

// INIT
let loadInterval;
let kpiInterval;

// STATE PAGINATION KPI
let allKpiData = [];
let kpiCurrentPage = 1;
let kpiLimit = 10;

async function init(page){
  if(loadInterval) clearInterval(loadInterval);
  if(kpiInterval) clearInterval(kpiInterval);

  if(!CID){
    alert("Session expired");
    // Langsung tembak ke root domain juga
    window.location.replace("/login.html"); 
    return;
  }

  await loadBranding();
  loadProfile();

  // 🔥 CACHE TEMPLATE AGAR CHAT HISTORY SELALU SEMPURNA
  try {
    const resTpl = await fetch(API + "/templates?client_id=" + CID);
    const rawTpl = await resTpl.json();
    if(Array.isArray(rawTpl)) allTemplates = rawTpl;
  } catch(e) { 
    console.log("Gagal load cache template", e); 
  }

  // ✅ ACTIVE MENU (ANTI BUG)
  if(page === "dashboard") setActiveMenu("menuDashboard");
  if(page === "message") setActiveMenu("menuMessage");
  if(page === "template") setActiveMenu("menuTemplate");
  if(page === "campaign") setActiveMenu("menuCampaign");
  if(page === "report") setActiveMenu("menuReport");

  // ✅ LOAD PER PAGE
  if(page === "dashboard"){
    loadKPI();
    kpiInterval = setInterval(loadKPI, 30000);
  }

  if(page === "message"){
    await load();
    loadInterval = setInterval(load, 3000);
  }

  if(page === "template"){
    loadTemplates();
  }
  

  // ✅ DARK MODE FIX
  applyTheme();
}

// BRANDING
async function loadBranding(){
 const res=await fetch(API+"/client-info?client_id="+CID);
 CLIENT=await res.json();

 const logo = document.getElementById("logo");
 if(logo) logo.src = CLIENT.logo_url;

 const clientName = document.getElementById("clientName");
 if(clientName) clientName.innerText = CLIENT.name;

 const welcomeBig = document.getElementById("welcomeBig");
 if(welcomeBig){
   welcomeBig.innerText = CLIENT.name + " di Admin";
 }

 const sendBtnEl = document.getElementById("sendBtn");
 if(sendBtnEl){
   sendBtnEl.style.background = CLIENT.primary_color;
 }
}

// DASHBOARD
function showDashboard(){
  localStorage.setItem("admin_last_menu", "dashboard");
  setActiveMenu("menuDashboard");

  document.getElementById("dashboardView").classList.remove("hidden");
  document.getElementById("chatWrapper").classList.add("hidden");

  // 🔥 tunggu DOM settle baru render chart
  setTimeout(() => {
    loadKPI();
  }, 300);
}

function showMessage(){
  setActiveMenu("menuMessage"); // 🔥 TAMBAH INI
  localStorage.setItem("admin_last_menu", "message");
  document.getElementById("dashboardView").classList.add("hidden");
  document.getElementById("chatWrapper").classList.remove("hidden");
   // 🔥 paksa load chat saat buka
  load();
}

// ================= FUNGSI FILTER & SEARCH UI =================
function handleChatSearch() {
  chatSearchQuery = document.getElementById("searchChatInput").value.toLowerCase();
  renderChatListUI();
}

function setChatFilter(filter) {
  activeChatFilter = filter;
  // Reset style tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-green-500', 'text-white');
    btn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-gray-500', 'dark:text-gray-300');
  });
  // Set style active tab
  const activeBtn = document.getElementById('tab-' + filter);
  if(activeBtn) {
     activeBtn.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-500', 'dark:text-gray-300');
     activeBtn.classList.add('bg-green-500', 'text-white');
  }
  renderChatListUI();
}

// ================= TOGGLE RESOLVE API ACTION =================
async function toggleResolveChat() {
  if(!selected) return;

  const btnResolve = document.getElementById("btnResolve");
  const isCurrentlyResolved = processedChatMap[selected]?.is_closed;
  const newStatus = isCurrentlyResolved ? 0 : 1; 

  btnResolve.disabled = true;
  btnResolve.innerText = "⏳ Memproses...";

  try {
    const res = await fetch(API + "/resolve-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CID,
        number: selected,
        is_closed: newStatus
      })
    });

    const data = await res.json();
    if(!res.ok || data.error) throw new Error(data.error || "Gagal server");

    await load();
    if(document.getElementById("dashboardView").classList.contains("hidden") === false) {
       loadKPI(); 
    }
  } catch (err) {
    console.error("RESOLVE ERROR:", err);
    
  } finally {
    btnResolve.disabled = false;
  }
}

// 🔥 SMART DATE FORMATTER (Full WIB Indonesia)
function formatTimeShort(t) {
  if(!t) return '';
  const date = new Date(t.replace(" ", "T"));
  const now = new Date();
  
  // Opsi zona waktu WIB (Jakarta)
  const tzOptions = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
  
  // Ambil tanggal murni (DD/MM/YYYY) berdasarkan WIB
  const dateWIB = date.toLocaleDateString("id-ID", tzOptions);
  const todayWIB = now.toLocaleDateString("id-ID", tzOptions);
  
  // Hitung tanggal kemarin berdasarkan WIB
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayWIB = yesterday.toLocaleDateString("id-ID", tzOptions);

  if (dateWIB === todayWIB) {
    // Jika hari ini: Jam Menit (Misal: 14:30)
    return date.toLocaleTimeString("id-ID", { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
  } else if (dateWIB === yesterdayWIB) {
    // Jika kemarin
    return "Kemarin"; 
  } else {
    // Jika sudah lampau: DD/MM/YYYY (Misal: 10/05/2026)
    return dateWIB;
  }
}

// ================= LOAD DATA & MAPPING (OTAK UTAMA) =================
async function load(){
  if(!CLIENT) return;
  try {
    const res = await fetch(API+"/messages", { headers: { "client-id": CID } });
    const rawData = await res.json();
    if(!Array.isArray(rawData)) return;
    
    ALL_MESSAGES = rawData;
    const map = {};

    // 🔥 PENTING: Urutkan ID terkecil ke terbesar agar pesan terbaru diproses terakhir
    const sorted = [...ALL_MESSAGES].sort((a, b) => a.id - b.id);

    sorted.forEach(m => {
      const isOutgoing = (m.sender === CLIENT.sender);
      const user = isOutgoing ? m.receiver : m.sender;
      if (!user) return; // Safety check

      let safeName = m.name || "User " + user.slice(-4);
      const dbClosedStatus = (m.is_closed == 1);

      // 🔥 LOGIKA TAMPILAN SIDEBAR UNTUK FLOW/BUTTON/TEMPLATE
      let displayMsg = m.message || (m.type && m.type !== 'text' ? `[${m.type.toUpperCase()}]` : '[Media]');
      if (typeof displayMsg === "string") {
          if (displayMsg.includes("[Flow Submit]")) {
              displayMsg = "📋 Mengisi Form/Flow";
          } else if (displayMsg.includes("[Button Click]")) {
              displayMsg = "↩️ " + displayMsg.replace("[Button Click]", "").trim();
          } else if (m.type === "template") {
              displayMsg = "🤖 " + displayMsg; 
          }
      }

      if(!map[user]){
        map[user] = {
          number: user,
          name: safeName,
          last_message: displayMsg, // 🔥 Gunakan displayMsg di sini
          last_time: m.timestamp,
          last_status: m.status,
          is_last_out: isOutgoing,
          is_unassigned: !m.assigned_to, 
          is_unread: !isOutgoing,         
          is_closed: dbClosedStatus,
          assigned_to: m.assigned_to // 🟢 TAMBAHAN BARU: Simpan data assignee
        };
      } else {
        // Kalau pesan sekarang punya nama yang valid, update nama di map!
        if (m.name && m.name !== "Unknown" && !m.name.startsWith("User ")) {
            map[user].name = m.name;
        }

        map[user].last_message = displayMsg; // 🔥 Gunakan displayMsg di sini
        map[user].last_time = m.timestamp;
        map[user].last_status = m.status;
        map[user].is_last_out = isOutgoing;
        map[user].is_closed = dbClosedStatus;
        map[user].is_unassigned = !m.assigned_to;
        map[user].assigned_to = m.assigned_to; // 🟢 TAMBAHAN BARU: Update data assignee
        
        if (!isOutgoing) {
            map[user].is_unread = true;
            map[user].is_closed = false;
        } else {
            map[user].is_unread = false; 
        }
      }
    });
    
    processedChatMap = map;
    
    // Jalankan Render
    renderChatListUI();

   // 🔥 MIRRORING UI KANAN: Update tombol Resolve & Input Area secara instan
    if(selected && processedChatMap[selected]){
        const current = processedChatMap[selected];
        const btnResolve = document.getElementById("btnResolve");
        const chatInputArea = document.getElementById("chatInputArea");

        if(current.is_closed){
            if(btnResolve) {
                btnResolve.innerHTML = "🔄 Reopen Chat";
                btnResolve.classList.replace("text-green-600", "text-gray-500");
            }
            chatInputArea?.classList.add("hidden");
            chatInputArea?.classList.remove("flex");
        } else {
            if(btnResolve) {
                btnResolve.innerHTML = "✅ Resolve";
                btnResolve.classList.replace("text-gray-500", "text-green-600");
            }
            chatInputArea?.classList.remove("hidden");
            chatInputArea?.classList.add("flex");
        }

        // FIX AUTO MUNCUL ADMIN: Update chat history otomatis tanpa refresh
        const filtered = ALL_MESSAGES.filter(m => (m.sender === selected && m.receiver === CLIENT.sender) || (m.sender === CLIENT.sender && m.receiver === selected));
        const currentIds = filtered.map(x => x.id + "-" + x.status).join("|");
        
        if(currentIds !== LAST_RENDER){
            LAST_RENDER = currentIds;
            const chatBoxEl = document.getElementById("chatBox");
            if(chatBoxEl) {
                chatBoxEl.innerHTML = filtered.map(renderBubble).join('');
                if(current.is_closed) {
                    chatBoxEl.innerHTML += `
                      <div class="flex justify-center mt-6 mb-2">
                        <div class="bg-red-50 dark:bg-red-900/20 text-red-500 text-xs px-4 py-2 rounded-lg text-center border border-red-100 dark:border-red-800">
                          Percakapan telah ditutup.<br>Klik <b>"🔄 Reopen Chat"</b> untuk membuka percakapan.
                        </div>
                      </div>
                    `;
                }
                setTimeout(() => { chatBoxEl.scrollTo({ top: chatBoxEl.scrollHeight, behavior: "smooth" }); }, 100);
            }
        }
    }
  } catch(e) {
    console.error("Gagal load data:", e);
  }
}

// ================= RENDER CHAT LIST UI (SYNC WITH DB) =================
function renderChatListUI() {
  const chatListEl = document.getElementById("chatList");
  if (!chatListEl) return;

  let list = Object.values(processedChatMap);

  // 1. Update Badge Resolved (Tab paling kanan)
  let resolvedCount = list.filter(c => c.is_closed).length;
  const badge = document.getElementById("resolvedBadge");
  if(badge){
     if(resolvedCount > 0){
        badge.innerText = resolvedCount;
        badge.classList.remove("hidden");
     } else {
        badge.classList.add("hidden");
     }
  }

  // 2. Logika Filter Tab
  list = list.filter(c => {
      if (activeChatFilter === 'resolved') return c.is_closed;
      if (c.is_closed) return false; // Jangan muncul di tab lain kalau sudah resolved
      if (activeChatFilter === 'unassigned') return c.is_unassigned;
      if (activeChatFilter === 'unread') return c.is_unread;
      return true;
  });

  // 3. Search Filter
  if (chatSearchQuery) {
    list = list.filter(c => 
      c.name.toLowerCase().includes(chatSearchQuery) || 
      c.number.includes(chatSearchQuery)
    );
  }

  // 🔥 REVISI: Logika Filter Human vs Bot yang Akurat
  const responderFilter = document.getElementById("filterResponder")?.value || "all";
  if (responderFilter !== "all") {
      list = list.filter(c => {
          if (responderFilter === "human") {
              // Benar-benar ada agent (tidak kosong) dan BUKAN Bot
              return c.assigned_to && c.assigned_to !== '🤖 Chatbot';
          }
          if (responderFilter === "bot") {
              // Memang benar-benar dijawab/dipegang oleh Bot
              return c.assigned_to === '🤖 Chatbot';
          }
          return true;
      });
  }

  // 4. Sorting waktu terbaru
  list.sort((a, b) => new Date(b.last_time.replace(" ","T")) - new Date(a.last_time.replace(" ","T")));

 // 5. Render ke HTML
  chatListEl.innerHTML = list.map(c => {
      const nameClass = c.is_unread ? "font-extrabold text-black dark:text-white" : "font-semibold text-gray-800 dark:text-gray-200";
      const msgClass = c.is_unread ? "font-bold text-gray-800 dark:text-gray-300" : "font-normal text-gray-500 dark:text-gray-400";
      
      let safeMsg = c.last_message || 'File/Media';
      safeMsg = String(safeMsg).replace(/<[^>]*>?/gm, '').replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // 🔥 LOGIKA ICON STATUS SINKRON
      let listStatusIcon = "";
      
      // Hanya munculkan icon centang/silang jika pesan terakhir kita yang kirim (is_last_out)
      if (c.is_last_out) {
          if (c.last_status === "failed") {
              listStatusIcon = `<span class="text-red-500 text-[11px]">❌</span>`;
          } else if (c.last_status === "read") {
              listStatusIcon = `<span class="text-[#53bdeb] text-[11px] font-bold">✓✓</span>`;
          } else if (c.last_status === "delivered") {
              listStatusIcon = `<span class="text-gray-400 text-[11px]">✓✓</span>`;
          } else {
              // Default untuk sent atau pending
              listStatusIcon = `<span class="text-gray-400 text-[11px]">✓</span>`;
          }
      }

      return `
      <div onclick="openChat('${c.number}','${c.name}')" class="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition flex items-center gap-3">
        <div class="relative flex-shrink-0">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&color=fff" class="w-11 h-11 rounded-full object-cover shadow-sm">
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" class="w-4 h-4 absolute bottom-0 right-0 bg-white rounded-full border border-white">
          ${c.is_unread ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></div>' : ''}
        </div>
        <div class="flex-1 min-w-0 border-b border-gray-100 dark:border-gray-700 pb-2">
           <div class="flex justify-between items-baseline mb-0.5">
             <h3 class="${nameClass} text-[15px] truncate mr-2">${c.name}</h3>
             <span class="text-[11px] ${c.is_unread ? 'text-green-500 font-bold' : 'text-gray-400'} whitespace-nowrap">${formatTimeShort(c.last_time)}</span>
           </div>
           <p class="${msgClass} text-[13px] truncate flex items-center gap-1">
              ${listStatusIcon} ${safeMsg}
           </p>
        </div>
      </div>
  `}).join('');

  if(list.length === 0) {
      chatListEl.innerHTML = `<div class="p-6 text-center text-xs text-gray-400 italic">Tidak ada percakapan.</div>`;
  }
}

// DELETE CHAT
  async function deleteChat(num){
 if(!confirm("Yakin mau hapus semua chat user ini?")) return;

 try {
   await fetch(API+"/delete-chat",{
     method:"POST",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({
       number:num,
       client_id:CID
     })
   });

   alert("Chat berhasil dihapus");

   // reset state
   selected = null;
   chatBox.innerHTML = "";
   chatName.innerText = "";
   chatNumber.innerText = "";

   // reload
   load();

 } catch(err){
   console.log("DELETE ERROR:", err);
   alert("Gagal hapus chat");
 }
}

// ================= OPEN CHAT (SINKRONISASI UI) =================
function openChat(num, name){
  selected = num;
  localStorage.setItem("admin_last_chat", JSON.stringify({ number: num, name: name }));

  const emptyStateEl = document.getElementById("emptyState");
  const chatContentEl = document.getElementById("chatContent");
  const chatNameEl = document.getElementById("chatName");
  const chatNumberEl = document.getElementById("chatNumber");
  const avatarEl = document.getElementById("avatar");
  const chatBoxEl = document.getElementById("chatBox");
  
  const btnResolve = document.getElementById("btnResolve");
  const chatInputArea = document.getElementById("chatInputArea");

  if(!chatBoxEl) return;

  emptyStateEl?.classList.add("hidden");
  chatContentEl?.classList.remove("hidden");

  chatNameEl.innerText = name;
  chatNumberEl.innerText = num;
  avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;

  // 🔥 CEK STATUS DARI MAP YANG SUDAH TERUPDATE
  const isResolved = processedChatMap[num]?.is_closed;

  if(isResolved){
     btnResolve.innerHTML = "🔄 Reopen Chat";
     btnResolve.classList.replace("text-green-600", "text-gray-500");
     if (chatInputArea) {
         chatInputArea.classList.add("hidden");
         chatInputArea.classList.remove("flex");
     }
  } else {
     btnResolve.innerHTML = "✅ Resolve";
     btnResolve.classList.replace("text-gray-500", "text-green-600");
     if (chatInputArea) {
         chatInputArea.classList.remove("hidden");
         chatInputArea.classList.add("flex");
     }
  }

  const filtered = ALL_MESSAGES.filter(m => (m.sender === num && m.receiver === CLIENT.sender) || (m.sender === CLIENT.sender && m.receiver === num));
  const currentIds = filtered.map(x => x.id + "-" + x.status).join("|");
  if(currentIds === LAST_RENDER) return;
  LAST_RENDER = currentIds;

  chatBoxEl.innerHTML = filtered.map(renderBubble).join('');

  if(isResolved) {
     chatBoxEl.innerHTML += `
       <div class="flex justify-center mt-6 mb-2">
         <div class="bg-red-50 dark:bg-red-900/20 text-red-500 text-xs px-4 py-2 rounded-lg text-center border border-red-100 dark:border-red-800">
           Percakapan telah ditutup.<br>Klik <b>"🔄 Reopen Chat"</b> untuk membuka percakapan.
         </div>
       </div>
     `;
  }

  setTimeout(() => {
    chatBoxEl.scrollTo({ top: chatBoxEl.scrollHeight, behavior: "smooth" });
  }, 100);
}

// BUBBLE CHAT
function renderBubble(m){
  // 🔥 SYSTEM MESSAGE (WAJIB DI ATAS)
 if(m.direction === "system" || m.type === "system"){
   return `
     <div class="text-center text-xs text-red-500 my-2">
       ${m.message}
     </div>
   `;
 }

 const isOut=m.direction==="outgoing";

 return `
 <div class="flex ${isOut?'justify-end':'justify-start'}">
  <div class="max-w-xs px-3 py-2 rounded-lg break-words
    ${isOut ? 'bg-emerald-100 dark:bg-emerald-900 text-gray-800 dark:text-white shadow-sm'
            : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'}">

     ${renderMessage(m)}

    ${m.assigned_to 
  ? `<div class="text-[10px] text-blue-600 dark:text-blue-300 font-medium">
       Assigned: ${m.assigned_to}
     </div>` 
  : `<div class="text-[10px] text-gray-500 dark:text-gray-400 italic">
       Unassigned
     </div>`}

     <div class="text-[10px] mt-1 flex justify-end gap-1">
        ${formatTime(m.timestamp)}
        ${m.direction==="outgoing" ? renderStatus(m.status, m.meta) : ""}
        </div>

     ${!isOut ? `
       <button onclick="assign(${m.id})"
       class="text-xs bg-yellow-400 px-2 rounded mt-1">
       Assign
       </button>` : ""}

   </div>
 </div>`;
}

// ================= ASSIGN AGENT (UI MODERN) =================
let currentAssignId = null; // Menyimpan ID pesan yang mau diassign

function assign(id) {
  currentAssignId = id;
  const modal = document.getElementById("assignModal");
  const input = document.getElementById("assignEmailInput");
  
  if(modal && input) {
    input.value = ""; 
    modal.classList.remove("hidden");
    setTimeout(() => input.focus(), 100); // Auto fokus ke kolom ketik
  } else {
    // Fallback keamanan jika HTML belum ada
    const agent = prompt("Masukkan email agent:");
    if(agent) executeAssign(id, agent);
  }
}

function closeAssignModal() {
  const modal = document.getElementById("assignModal");
  if(modal) modal.classList.add("hidden");
  currentAssignId = null;
}

async function confirmAssign() {
  const input = document.getElementById("assignEmailInput");
  if(!input || !input.value.trim()) {
    alert("Email agent tidak boleh kosong!");
    return;
  }
  const agent = input.value.trim();
  const id = currentAssignId;
  
  closeAssignModal(); // Tutup popup supaya UI terasa cepat
  await executeAssign(id, agent);
}

// Eksekutor API
async function executeAssign(id, agent) {
  try {
    const res = await fetch(API+"/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: id, agent_id: agent })
    });
    const data = await res.json();

    if(res.ok) {
      // Notifikasi Toast Modern
      const toast = document.createElement("div");
      toast.className = "fixed top-5 right-5 bg-green-500 text-white px-5 py-3 rounded-lg shadow-xl z-50 animate-bounce";
      toast.innerHTML = `✅ Berhasil assign chat ke <b>${agent}</b>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      
      load(); // Auto Refresh Data
    } else {
      alert("Gagal assign: " + data.error);
    }
  } catch(err) {
    console.log("ASSIGN ERROR:", err);
    alert("Error koneksi ke server");
  }
}
  
// RENDER MESSAGE TYPE
function renderMessage(m){

  let caption = m.message 
    ? `<div class="text-xs mt-1 whitespace-pre-line">${m.message}</div>` 
    : "";

 function fixUrl(path){
  if(!path) return "";

  if(path.startsWith("http")) return path;

  // 🔥 HAPUS /media DUPLIKAT
  path = path.replace(/^\/media\//, "");
  path = path.replace(/^media\//, "");

  return MEDIA_BASE + path;
}


 // ================= TEMPLATE (FRONTEND OVERRIDE) =================
  if (m.type === "template") {
    let parsed = {};

    // 1. Coba parse dari backend dulu
    try { parsed = JSON.parse(m.parsed_template || "{}"); } catch(e){}

    // 2. 🔥 FRONTEND OVERRIDE: Jahit ulang template agar 100% muncul Full Body & Footer
    let tName = m.message; // Backend menyimpan nama template di sini
    let raw = {};
    try { raw = JSON.parse(m.raw_payload || "{}"); } catch(e){}

    if (!tName) tName = raw?.template?.name; 

    // Cari template utuh dari cache allTemplates
     const realTpl = allTemplates.find(t => 
        String(t.name).toLowerCase().trim() === String(tName).toLowerCase().trim()
    );

    if (realTpl) {
       // Ekstrak parameter yang diisi oleh sistem/agen
       let paramsArr = [];
       const bodyComp = raw?.template?.components?.find(c => c.type === "body");

       if (bodyComp && bodyComp.parameters) {
           paramsArr = bodyComp.parameters.map(p => p.text || p.payload || "");
       } else if (parsed.body && Array.isArray(parsed.body)) {
           paramsArr = parsed.body; // Ambil dari fallback backend jika ada
       }

       // Jahit parameter {{1}} ke dalam teks body aslinya
       let stitchedBody = realTpl.body_text || realTpl.body || "";
       paramsArr.forEach((val, i) => {
           stitchedBody = stitchedBody.split(`{{${i+1}}}`).join(val);
       });

       // Rakit ulang objek parsed dengan data utuh dan cantik
       parsed.header = realTpl.header_type ? { type: realTpl.header_type, value: realTpl.header_value } : null;
       parsed.body = [stitchedBody];
       parsed.footer = realTpl.footer || "";

       let dbBtns = [];
       try { dbBtns = JSON.parse(realTpl.buttons_json || realTpl.buttons || "[]"); } catch(e){}
       parsed.buttons = dbBtns.map(b => {
           if(b.type === "quick_reply") return { type: "quick_reply", value: b.text || b.value };
           if(b.type === "url") return { type: "url", value: b.value || b.text };
           if(b.type === "phone") return { type: "phone", value: b.value || b.text };
           if(b.type === "flow") return { type: "flow", value: b.text || b.value };
           return null;
       }).filter(Boolean);

    } else if (!parsed || Object.keys(parsed).length === 0) {
       // 3. FALLBACK DARURAT (Jika template dihapus dari database)
       const components = raw?.template?.components || [];
       const headerComp = components.find(c => c.type === "header");
       const bodyComp   = components.find(c => c.type === "body");
       const footerComp = components.find(c => c.type === "footer");
       const buttonComps = components.filter(c => c.type === "button");

       parsed = {
         header: headerComp ? {
             type: headerComp.parameters?.[0]?.image ? "image" : headerComp.parameters?.[0]?.video ? "video" : headerComp.parameters?.[0]?.document ? "document" : "text",
             value: headerComp.parameters?.[0]?.image?.link || headerComp.parameters?.[0]?.video?.link || headerComp.parameters?.[0]?.document?.link || headerComp.parameters?.[0]?.text || ""
         } : null,
         body: bodyComp?.parameters ? bodyComp.parameters.map(p => p.text || p.payload).filter(Boolean) : [],
         footer: footerComp?.text || "",
         buttons: buttonComps.flatMap(comp => {
             if(comp.parameters){
               return comp.parameters.map(p => {
                 if(p.type === "payload" || p.type === "text") return { type: "quick_reply", value: p.payload || p.text };
                 if(p.type === "url") return { type: "url", value: p.url };
                 if(p.type === "phone_number") return { type: "phone", value: p.phone_number };
                 return null;
               }).filter(Boolean);
             }
             return [];
         })
       };
    }

    // ================= 4. AMBIL DATA & RENDER HTML =================
    const header = parsed.header;
    const body = parsed.body || [];
    const footer = parsed.footer || "";
    const buttons = parsed.buttons || [];

    let headerHTML = "";
    let bodyHTML = "";
    let footerHTML = "";
    let buttonsHTML = "";

    // HEADER
    if(header){
      if(header.type === "text") headerHTML = `<div class="font-semibold">${header.value}</div>`;
      if(header.type === "image") headerHTML = `<img src="${header.value}" class="rounded mb-1 max-h-40 w-full object-cover cursor-pointer hover:opacity-80" onclick="openImage('${header.value}')">`;
      if(header.type === "video") headerHTML = `<video src="${header.value}" class="rounded mb-1 max-h-32 w-full object-cover" controls></video>`;
      if(header.type === "document") headerHTML = `<a href="${header.value}" target="_blank" class="block bg-gray-700 p-2 rounded mb-1 text-xs text-blue-400 underline hover:opacity-80">📄 Open Document</a>`;
    }

    // BODY
    if(body.length) bodyHTML = body.join(" ");

    // FOOTER
    if(footer) footerHTML = `<div class="text-xs text-gray-400 mt-1">${footer}</div>`;

    // BUTTONS
    buttons.forEach(b => {
      if(b.type === "quick_reply") buttonsHTML += `<span class="inline-block bg-gray-600 px-2 py-1 rounded text-xs mt-1 mr-1 shadow-sm">↩️ ${b.value}</span>`;
      if(b.type === "url") buttonsHTML += `<a href="${b.value}" target="_blank" class="block mt-1 text-xs text-blue-400 underline">🔗 Open Link</a>`;
      if(b.type === "phone") buttonsHTML += `<div class="text-xs text-green-400 mt-1">📞 ${b.value}</div>`;
      if(b.type === "flow") buttonsHTML += `<div class="text-xs text-purple-400 mt-1">📋 ${b.value}</div>`;
    });

    // ================= FINAL RENDER =================
    return `
      <div class="bg-[#202c33] text-white p-2 rounded-lg max-w-xs shadow-md">
        ${headerHTML}
        <div class="text-sm whitespace-pre-line">${bodyHTML}</div>
        ${footerHTML}
        ${buttonsHTML ? `<div class="mt-2 flex flex-wrap border-t border-gray-600 pt-1">${buttonsHTML}</div>` : ''}
      </div>
    `;
  }

  // ================= IMAGE / STICKER =================
  if(m.type === "image" || m.type === "sticker"){
    const url = fixUrl(m.media_url);

    return `
      <img 
        src="${url}"
        loading="lazy"
        onclick="openImage('${url}')"
        class="rounded max-h-40 cursor-pointer hover:opacity-80 transition">
      ${caption}
    `;
  }

  // ================= VIDEO =================
if(m.type === "video"){
  const url = fixUrl(m.media_url);

  return `
    <video 
      src="${url}" 
      controls 
      preload="metadata"
      playsinline
      class="max-h-40 rounded">
    </video>
    ${caption}
  `;
}

  // ================= AUDIO =================
  if(m.type === "audio"){
    const url = fixUrl(m.media_url);

    return `
      <audio controls src="${url}"></audio>
      ${caption}
    `;
  }

  // ================= DOCUMENT =================
  if(m.type === "document"){
  const fileName = m.file_name || "file";
  const url = fixUrl(m.media_url);

  return `
    <a href="${url}" target="_blank"
      class="flex items-center gap-2 text-blue-500 underline hover:opacity-80">

      <span>${getFileIcon(fileName)}</span>
      <span class="truncate max-w-[150px]">${fileName}</span>
    </a>
    ${caption}
  `;
}

 // ================= INTERACTIVE (FLOW & BUTTON) =================
  if (m.message && typeof m.message === "string") {
    
    // 1. Jika itu balasan dari WhatsApp Flow
    if (m.message.includes("[Flow Submit]")) {
       try {
         const jsonString = m.message.replace("[Flow Submit]", "").trim();
         const flowData = JSON.parse(jsonString);
         
         let flowHTML = `<div class="text-[13px] leading-relaxed">`;
         let tokenHTML = "";
         
         for (let key in flowData) {
           if (key === "flow_token") {
             // Pisahkan flow_token untuk ditaruh di bawah sebagai identitas
             tokenHTML = `<div class="mt-1.5 pt-1 border-t border-gray-300/50 dark:border-gray-600/50 text-[11px] text-gray-500 font-mono">
                            <span class="font-bold text-gray-400">Token ID:</span> ${flowData[key]}
                          </div>`;
           } else {
             // Render data isian Flow normal
             flowHTML += `<div><span class="font-bold">${key}:</span> ${flowData[key]}</div>`;
           }
         }
         
         // Gabungkan data isian dengan token di paling bawah
         flowHTML += tokenHTML + `</div>`;
         
         return flowHTML;
       } catch(e) {
         // Jika gagal parse JSON, biarkan jatuh ke text biasa di bawah
       }
    }

    // 2. Jika itu balasan dari Quick Reply / Button Click
    if (m.message.includes("[Button Click]")) {
       const btnText = m.message.replace("[Button Click]", "").trim();
       return `<div class="text-[13px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">↩️ ${btnText}</div>`;
    }
  }

  // ================= TEXT =================
  return m.message
  ? `<div class="whitespace-pre-line">${m.message}</div>`
  : "";
}


//GET ICON FILE
function getFileIcon(name){
  const ext = name?.split(".").pop()?.toLowerCase();

  if(ext === "pdf") return "📕";
  if(ext === "xls" || ext === "xlsx") return "📊";
  if(ext === "doc" || ext === "docx") return "📄";
  if(ext === "zip") return "🗜️";

  if(ext === "ppt" || ext === "pptx") return "📈";
  if(ext === "csv") return "📑";
  if(ext === "txt") return "📃";

  return "📁";
}

// 🔥 RENDER STATUS CENTANG (Anti Gagal & Anti Cache)
function renderStatus(s, metaData) {
  let label = s;

  if (s === "failed") {
    label = "Failed (No Reason)"; // Default fallback dengan huruf besar

    if (metaData) {
      try {
        // Cek apakah berupa string (perlu di-parse) atau sudah object
        const meta = typeof metaData === "string" ? JSON.parse(metaData) : metaData;
        
        // Bongkar semua kemungkinan letak error Meta
        const errorMsg = meta?.notes || 
                         (meta?.sourceReason && meta?.sourceReason[0]?.message) || 
                         meta?.reason || 
                         meta?.error?.message;
        
        if (errorMsg) {
           label = `Failed: ${errorMsg}`;
        }
      } catch(e) {
        label = "Failed (Parse Error)";
      }
    }
  }

  // Escape HTML characters biar tooltip aman
  const safeLabel = String(label)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (s === "sent") 
    return `<span title="${safeLabel}" class="text-gray-500 text-xs cursor-default">✓</span>`;
  if (s === "delivered") 
    return `<span title="${safeLabel}" class="text-gray-600 text-xs cursor-default">✓✓</span>`;
  if (s === "read") 
    return `<span title="${safeLabel}" class="text-[#53bdeb] text-xs font-bold cursor-default">✓✓</span>`;
  if (s === "failed") 
    return `<span title="${safeLabel}" class="text-red-500 text-xs cursor-help">❌</span>`;
  
  return "";
}


// SEND MESSSAGE
async function send(){
 if(isSending) return;
 if(!selected) return alert("Pilih chat");

 if(!msg.value && !fileData){
  return alert("Isi pesan atau pilih file dulu");
 }

 isSending = true;
 sendBtn.innerHTML = "⏳ Uploading...";
 sendBtn.disabled = true;

 let finalMediaUrl = null;

 try {

   // ================= UPLOAD =================
   if(fileData){
  const f = document.getElementById("file").files[0];

  const fd = new FormData();
  fd.append("file", f);

  const uploadRes = await fetch(API + "/upload",{
    method:"POST",
    body: fd
  });

  const upload = await uploadRes.json();

  if(!uploadRes.ok || !upload.url){
    throw new Error("Upload gagal");
  }

  finalMediaUrl = upload.url;
}

   sendBtn.innerHTML = "⏳ Sending...";

   
   // 🔥 AMBIL TOKEN
   const token = localStorage.getItem("bearer_token") || "";

   // ================= SEND =================
   const sendRes = await fetch(API+"/send-message",{
     method:"POST",
     headers:{
       "Content-Type":"application/json",
       "Authorization": "Bearer " + token // 🛡️ Gembok API
     },
     body:JSON.stringify({
       receiver:selected,
       message: msg.value || "",
       type: fileType || "text",
       media_url: finalMediaUrl,
       fileName: fileName,
       client_id:CID
     })
   });

   const sendData = await sendRes.json();

   if(!sendRes.ok){
     throw new Error(sendData.error || "Gagal kirim");
   }

   // 🔥 OPTIONAL: optimistic render
   console.log("SEND SUCCESS:", sendData);

 } catch(err){
   console.log("SEND ERROR:", err);
   alert(err.message);
 }

 // ================= RESET =================
 isSending = false;
 sendBtn.innerHTML = "Send";
 sendBtn.disabled = false;

 fileData=null;
 fileType=null;
 fileName=null;
 fileMime=null;

 if(chatFilePreview){
   URL.revokeObjectURL(chatFilePreview);
   chatFilePreview = null;
 }

 document.getElementById("filePreviewBox").innerHTML = "";
 document.getElementById("file").value = "";
 msg.value="";

 // 🔥 kasih delay biar backend sempet save
 setTimeout(load, 500);
}

//HANDLE KEY
function handleKey(e){
  if(e.key === "Enter"){
    e.preventDefault();

    // kalau tekan Enter biasa → kirim
    if(!e.shiftKey){
      send();
    }
    // kalau Shift + Enter → newline
    else {
      const input = document.getElementById("msg");
      const start = input.selectionStart;
      const end = input.selectionEnd;

      input.value =
        input.value.substring(0, start) +
        "\n" +
        input.value.substring(end);

      input.selectionStart = input.selectionEnd = start + 1;
    }
  }
}

// TIME
function formatTime(t){
  return new Date(t.replace(" ", "T")).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta"
  });
}




//EXPORT KPI
function exportKPI(){
  const start = document.getElementById("kpiStart")?.value || "";
  const end = document.getElementById("kpiEnd")?.value || "";

  window.open(
    API + `/export-kpi?client_id=${CID}&start=${start}&end=${end}`
  );
}

// ================= LOGOUT =================
function logout(){
  localStorage.clear();
  sessionStorage.clear();
  
  // Langsung tembak ke root domain, sangat aman untuk migrasi vendor!
  window.location.replace("/login.html");
}

//SHOW TEMPLATE
function showTemplate(){
  setActiveMenu("menuTemplate");

  dashboardView.classList.add("hidden");
  chatWrapper.classList.add("hidden");
  templateView.classList.remove("hidden");
  campaignView.classList.add("hidden");

  loadTemplates();
}

//LOAD TEMPLATE
async function loadTemplates() {
  const client_id = localStorage.getItem("client_id");

  const res = await fetch(API + "/templates?client_id=" + client_id, {
    headers: {
      "client-id": client_id
    }
  });

  const data = await res.json();

  console.log("TEMPLATES:", data); // 🔥 debug

  renderTemplates(data);
}

//REDIRECT TEMPLATE DETAIL 
function goDetail(id){
  window.location.href = "template-detail.html?id=" + id;
}

//AMBIL ID TEMPLATE
function getParam(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

//LOAD TEMPLATE DETAIL
async function loadDetail(){

  const id = getParam("id");

  const res = await fetch(API + "/templates?client_id=" + CID);
  const data = await res.json();

  const t = data.find(x => String(x.id) === String(id));

  if(!t){
    alert("Template tidak ditemukan");
    return;
  }

  // ================= BASIC =================
  const el = document.getElementById("dName");
if(el) el.innerText = t.name;
  document.getElementById("dCategory").innerText = t.category_template;
  document.getElementById("dLang").innerText = t.language;
  document.getElementById("dStatus").innerText = t.status;

  // 🔥 fix field (kadang body_text kadang body)
  const bodyText = t.body_text || t.body || "";
  document.getElementById("dBody").innerText = bodyText;

  document.getElementById("dFooter").innerText = t.footer || "-";

  // ================= HEADER =================
  const headerBox = document.getElementById("dHeaderBox");
  const mediaLink = document.getElementById("mediaLink");

  headerBox.innerHTML = "";
  mediaLink.classList.add("hidden");

  if(t.header_type === "text"){
    headerBox.innerText = t.header_value;
  }

  if(t.header_type === "image"){
    headerBox.innerHTML = `
      <img src="${t.header_value}" class="w-40 rounded border">
    `;
    mediaLink.href = t.header_value;
    mediaLink.classList.remove("hidden");
  }

  if(t.header_type === "video"){
    headerBox.innerHTML = `
      <video src="${t.header_value}" controls class="w-40 rounded"></video>
    `;
    mediaLink.href = t.header_value;
    mediaLink.classList.remove("hidden");
  }

  if(t.header_type === "document"){
    headerBox.innerHTML = `
      <div class="text-sm text-gray-500">📄 Document</div>
    `;
    mediaLink.href = t.header_value;
    mediaLink.classList.remove("hidden");
  }

  // ================= BUTTONS =================
const btnBox = document.getElementById("dButtonsBox");
btnBox.innerHTML = "";

let buttons = [];

try {
  buttons = JSON.parse(t.buttons_json || "[]");
} catch(e){
  buttons = [];
}

// 🔥 render semua tipe button
buttons.forEach(b => {

  // 📞 PHONE
  if(b.type === "phone"){
    btnBox.innerHTML += `
      <div class="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100">
        <div class="flex justify-between">
          <div>📞 ${b.text}</div>
          <div class="text-xs text-gray-500">${b.value}</div>
        </div>
      </div>
    `;
  }

  // 🌐 URL
  else if(b.type === "url"){
    btnBox.innerHTML += `
      <div class="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100">

        <div class="flex justify-between">
          <div>🌐 ${b.text}</div>
          <a href="${b.value}" target="_blank" rel="noopener noreferrer"
            class="text-blue-500 text-xs underline">
            Open Link
          </a>
        </div>

        <div class="text-xs text-gray-500 mt-1 break-all">
          ${b.value}
        </div>

      </div>
    `;
  }

  // ↩️ QUICK REPLY
  else if(b.type === "quick_reply"){
    btnBox.innerHTML += `
      <div class="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100">
        ↩️ ${b.text}
      </div>
    `;
  }

  // 📋 FLOW
  else if(b.type === "flow"){
    btnBox.innerHTML += `
      <div class="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100">

        <div>📋 ${b.text}</div>

        <div class="text-xs text-gray-500 mt-1">
          Flow ID: ${b.flow_id || "-"}
        </div>

        ${b.screen ? `
          <div class="text-xs text-blue-500">
            Screen: ${b.screen}
          </div>
        ` : ""}

      </div>
    `;
  }

  // 🔐 TAMBAHKAN INI UNTUK OTP / AUTHENTICATION
  else if(b.type === "otp"){
    btnBox.innerHTML += `
      <div class="bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100">
        <div class="flex justify-between">
          <div>🔐 ${b.text || "Salin Kode"}</div>
          <div class="text-xs text-blue-500">Copy Code</div>
        </div>
      </div>
    `;
  }

});

// ================= EMPTY =================
if(buttons.length === 0){
  btnBox.innerHTML = `<span class="text-gray-400 text-sm">No Button</span>`;
}

  // ================= PREVIEW =================
  const preview = document.getElementById("previewBox");
  if(preview) preview.innerHTML = "";

  renderTemplatePreview({
    ...t,
    body: bodyText // 🔥 biar konsisten ke preview
  }, "page");
}

 //PREVIEW TEMPLATE
async function viewTemplate(id) {

  console.log("VIEW CLICK:", id);

  try {
    const res = await fetch(API + "/templates?client_id=" + CID);
    const data = await res.json();

    console.log("DATA:", data);

    const t = data.find(x => String(x.id) === String(id));

    if(!t){
      alert("Template tidak ditemukan");
      return;
    }

    const modal = document.getElementById("previewModal");
    if(!modal){
      console.log("previewModal not found ❌");
      return;
    }

    // 🔥 1. buka modal dulu
    modal.classList.remove("hidden");

    // 🔥 2. reset isi preview (biar gak numpuk)
    const box = document.getElementById("previewBox");
    if(box) box.innerHTML = "";

    // 🔥 3. render setelah modal muncul
    setTimeout(() => {
  renderTemplatePreview(t, "modal");
}, 50);

  } catch(err){
    console.log("VIEW ERROR:", err);
  }
}

// ================= DUPLICATE TEMPLATE =================
function duplicateTemplate(id) {
  const t = allTemplates.find(x => String(x.id) === String(id));
  if(!t) return;
  fillTemplateForm(t, true); // true = mode duplicate
}

// ================= EDIT TEMPLATE =================
function editTemplate(id, status) {
  if (status.toUpperCase() !== "REJECTED") {
    showModernAlert("Tidak Bisa Diedit", "Hanya template dengan status REJECTED yang bisa diedit.", "error");
    return;
  }
  const t = allTemplates.find(x => String(x.id) === String(id));
  if(!t) return;
  fillTemplateForm(t, false); // false = mode edit
}

// ================= FUNGSI BANTU PENGISIAN FORM MODAL =================
function fillTemplateForm(t, isDuplicate) {
  openCreateTemplate(); // Reset form dulu biar bersih
  
  // Set global state
  currentEditId = isDuplicate ? null : t.id; 
  
  // Update Judul Modal biar UX-nya bagus
  const titleModal = document.querySelector("#stepForm h2");
  if(titleModal) {
      titleModal.innerText = isDuplicate ? "Duplicate Template" : "Edit Template";
  }

  // Isi form dasar
  document.getElementById("tplName").value = isDuplicate ? t.name + "_copy" : t.name;
  document.getElementById("tplLanguage").value = t.language || "id";
  document.getElementById("category").value = t.category_template || "MARKETING";
  toggleCategory();

  document.getElementById("tplBody").value = t.body_text || t.body || "";
  document.getElementById("tplFooter").value = t.footer || "";

  // Isi form Header
  if(t.header_type && t.header_type !== "none") {
      const type = (t.header_type === "image" || t.header_type === "video" || t.header_type === "document") ? "media" : "text";
      document.getElementById("tplHeaderType").value = type;
      toggleHeaderType();
      
      if(type === "text") {
         document.getElementById("tplHeader").value = t.header_value || "";
      } else {
         document.getElementById("tplHeaderMediaType").value = t.header_type;
         // Catatan: Browser memblokir pengisian file ke input type="file" secara otomatis demi keamanan. 
         // Jadi user tetap harus browse file medianya secara manual jika diedit/diduplikasi.
      }
  }

  // Isi Button (Logika cerdas membaca Quick Reply & CTA)
  try {
      let btns = JSON.parse(t.buttons_json || t.buttons || "[]");
      if(btns.length > 0) {
          const firstType = btns[0].type;
          
          if(firstType === "quick_reply") {
              document.getElementById("tplButtonMode").value = "quick";
              toggleButtonMode();
              document.getElementById("quickReplyBox").innerHTML = "";
              quickReplyCount = 0;
              btns.forEach(b => {
                  addQuickReply();
                  const inputs = document.querySelectorAll("#quickReplyBox input");
                  inputs[inputs.length - 1].value = b.text || b.value;
              });
          } else if (firstType === "phone" || firstType === "url") {
              document.getElementById("tplButtonMode").value = "cta";
              toggleButtonMode();
              document.getElementById("ctaBox").innerHTML = ""; 
              btns.forEach((b, index) => {
                  addCTA();
                  const ctaItems = document.querySelectorAll(".cta-item");
                  const item = ctaItems[index];
                  item.querySelector(".cta-type").value = b.type === "url" ? "website" : "phone";
                  item.querySelector(".cta-text").value = b.text;
                  
                  let rawValue = b.value || b.url || b.phone_number;
                  if(b.type === "url" && rawValue.includes("{{1}}")) {
                      item.querySelector(".cta-url-type").value = "dynamic";
                      item.querySelector(".cta-value").value = rawValue.replace("{{1}}", "").replace(/\/$/, ""); 
                  } else {
                      if(item.querySelector(".cta-url-type")) item.querySelector(".cta-url-type").value = "static";
                      item.querySelector(".cta-value").value = rawValue;
                  }
                  toggleUrlType(item.querySelector(".cta-type"));
              });
          }
      }
  } catch(e) {}

  livePreview();
}

//DELETE TEMPLATE
async function deleteTemplate(id) {
  if (!confirm("Yakin hapus Template ini?")) return;

  const userEmail = localStorage.getItem("email") || "admin";

  try {
      await fetch(API + "/delete-template", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json" 
            // Header x-user-email DIHAPUS agar tidak kena CORS error
          },
          body: JSON.stringify({ id: id, email: userEmail }) // Kirim email di sini
      });

      await loadTemplatesList(); 
      alert("Template berhasil dihapus! 🗑️");
      
  } catch (err) {
      console.error("Gagal hapus template:", err);
      alert("Gagal menghapus template");
  }
}

//RENDER PREVIEW TEMPLATE
function renderTemplatePreview(t, mode = "live"){

  let headerHTML = "";
  let bodyHTML = "";
  let footerHTML = "";
  let buttonsHTML = "";

  // 🔥 NORMALISASI DATA DARI DB
if(typeof t === "string"){
  try { t = JSON.parse(t); } catch(e){}
}

if(typeof t.buttons === "string"){
  try { t.buttons = JSON.parse(t.buttons); } catch(e){}
}
if(typeof t.params === "string"){
  try { t.params = JSON.parse(t.params); } catch(e){}
}
if(typeof t.flow === "string"){
  try { t.flow = JSON.parse(t.flow); } catch(e){}
}

if(!Array.isArray(t.params)){
  t.params = [];
}

if(!Array.isArray(t.buttons)){
  t.buttons = [];
}

  if((!t.buttons || t.buttons.length === 0) && t.buttons_json){
  try {
    t.buttons = JSON.parse(t.buttons_json);
  } catch(e){
    t.buttons = [];
  }
}
  
  // ================= HEADER =================
  if(t.header_type === "text" && t.header_value){
    headerHTML = `
      <div class="font-semibold mb-1">
        ${t.header_value}
      </div>
    `;
  }

  if(t.header_type === "text"){
    headerHTML = `<div class="font-semibold mb-1">${t.header_value}</div>`;
  }

  if(t.header_type === "image"){
    headerHTML = `<img src="${t.header_value}" class="rounded mb-1 max-h-40 w-full object-cover">`;
  }
    
  if(t.header_type === "video" && t.header_value){

  headerHTML = `
    <div class="relative mb-1 rounded overflow-hidden bg-black cursor-pointer"
         onclick="this.innerHTML = this.getAttribute('data-video')"
         data-video='
           <video src="${t.header_value}" controls class="w-full max-h-40 object-cover"></video>
         '>

      <div class="flex items-center justify-center h-40 bg-black/60 text-white text-2xl">
        ▶
      </div>

    </div>
  `;
}

  if(t.header_type === "document" && t.header_value){

  const fileUrl = t.header_value;
  const fileName = fileUrl.split("/").pop() || "document";

  const isPreviewable = fileUrl.toLowerCase().endsWith(".pdf");

  headerHTML = `
    <div class="mb-1">

      <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs">
        📄 ${fileName}
      </div>

      ${
        isPreviewable
          ? `<iframe src="${fileUrl}" class="w-full h-40 mt-1 rounded border"></iframe>`
          : `<a href="${fileUrl}" target="_blank"
               class="block mt-1 text-blue-400 underline text-xs">
               🔗 Open Document
             </a>`
      }

    </div>
  `;
}
  // ================= BODY =================
 let bodyText = t.body_text || t.body || "";

bodyHTML = `
  <div class="text-sm whitespace-pre-line">
    ${bodyText.replace(/{{(\d+)}}/g, (match, num) => {
      return `<span class="text-blue-500 font-semibold">{{${num}}}</span>`;
    })}
  </div>
`;

  // ================= FOOTER =================
  if(t.footer){
    footerHTML = `
      <div class="text-xs text-gray-400 mt-1">
        ${t.footer}
      </div>
    `;
  }

 // ================= BUTTONS =================
if(Array.isArray(t.buttons) && t.buttons.length){

  // 🔥 garis atas (lebih keliatan)
 buttonsHTML += `
  <div class="border-t-2 border-blue-400 my-2"></div>
`;

  t.buttons.forEach(b => {

    // 🌐 URL
    if(b.type === "url"){
      buttonsHTML += `
        <a href="${b.value}" target="_blank"
          class="flex items-center gap-2 px-3 py-2 text-blue-400 text-sm hover:bg-[#2a3942] cursor-pointer">
          🌐 <span>${b.text || "Open Link"}</span>
        </a>
      `;
    }

    // 📞 PHONE
    else if(b.type === "phone"){
      buttonsHTML += `
        <div class="flex items-center gap-2 px-3 py-2 text-blue-400 text-sm hover:bg-[#2a3942] cursor-pointer">
          📞 <span>${b.text || "Call"}</span>
        </div>
      `;
    }

    // ↩️ QUICK REPLY
    else if(b.type === "quick_reply"){
      buttonsHTML += `
        <div class="flex items-center gap-2 px-3 py-2 text-white text-sm hover:bg-[#2a3942] cursor-pointer">
          ↩️ <span>${b.text}</span>
        </div>
      `;
    }

    // 📋 FLOW
    else if(b.type === "flow"){
      buttonsHTML += `
        <div class="flex items-center gap-2 px-3 py-2 text-purple-400 text-sm hover:bg-[#2a3942] cursor-pointer">
          📋 <span>${b.text}</span>
        </div>
      `;
    }

  });

}
  
  // ================= FINAL =================
let target = null;

if(mode === "modal"){
  target = document.getElementById("previewBox");
}
else if(mode === "page"){
  target = document.getElementById("previewBox"); // 🔥 untuk halaman detail
}
else {
  target = document.getElementById("previewStepBox"); // 🔥 tetap untuk create template
}

if(!target){
  console.log("Preview target not found ❌");
  return;
}

target.innerHTML = `
  <div class="flex justify-end">

    <div class="max-w-xs bg-[#202c33] text-white p-2 rounded-lg shadow">

      ${headerHTML}
      ${bodyHTML}
      ${footerHTML}

      <div class="mt-2 flex flex-wrap">
        ${buttonsHTML}
      </div>

    </div>

  </div>
`;
}

//CLOSE PREVIEW TEMPLATE
function closePreview(){
  const modal = document.getElementById("previewModal");

  if(!modal){
    console.log("previewModal not found ❌");
    return;
  }

  modal.classList.add("hidden");
}


// ==========================================
// LIVE PREVIEW (UPDATE)
// ==========================================
function livePreview(){
  let tplHeaderType = document.getElementById("tplHeaderType").value;
  let headerValue = document.getElementById("tplHeader").value;

  if(tplHeaderType === "media"){
    const file = document.getElementById("tplHeaderFile").files[0];
    const mediaType = document.getElementById("tplHeaderMediaType").value;
    if(file && mediaType){
      if(templateFilePreview) URL.revokeObjectURL(templateFilePreview);
      templateFilePreview = URL.createObjectURL(file);
      headerValue = templateFilePreview;
      tplHeaderType = mediaType;
    } else {
      headerValue = "";
      tplHeaderType = "";
    }
  }

  const mode = document.getElementById("tplButtonMode").value;
  let buttons = [];

 // 🔥 TANGKAP MULTI CTA
  if(mode === "cta"){
    document.querySelectorAll(".cta-item").forEach(item => {
      const type = item.querySelector(".cta-type").value;
      const text = item.querySelector(".cta-text").value;
      let value = item.querySelector(".cta-value").value;
      const urlType = item.querySelector(".cta-url-type")?.value;

      if(type && text && value){
        if(type === "phone") {
            buttons.push({ type: "phone", text: text, value: value });
        }
        if(type === "website") {
            // Jika dynamic dan user belum ketik {{1}} manual, kita tambahkan ke belakang URL
            if (urlType === "dynamic" && !value.includes("{{1}}")) {
                value = value.endsWith("/") ? value + "{{1}}" : value + "/{{1}}";
            }
            buttons.push({ type: "url", text: text, value: value });
        }
      }
    });
  }

  if(mode === "quick"){
    const quickReplies = [...document.querySelectorAll("#quickReplyBox input")].map(i => i.value.trim()).filter(Boolean);
    quickReplies.forEach(q => buttons.push({ type:"quick_reply", text:q }));
  }

  if(mode === "flow"){
    const flowId = document.getElementById("flowId").value;
    const flowText = document.getElementById("flowText").value;
    const flowScreen = document.getElementById("flowScreen").value;
    if(flowId && flowText){
      buttons.push({ type: "flow", flow_id: flowId, text: flowText, screen: flowScreen || null });
    }
  }

  // 🔥 INTERCEPT AUTHENTICATION PREVIEW
  const cat = document.getElementById("category").value;
  if (cat === "AUTHENTICATION") {
    const auth = getAuthContent();
    renderTemplatePreview({ 
        header_type: "", 
        header_value: "", 
        body_text: auth.body, 
        footer: auth.footer, 
        buttons: [{ type: "url", text: auth.btn, value: "#" }] 
    }, "live");
    return; 
  }

  renderTemplatePreview({
    header_type: tplHeaderType,
    header_value: headerValue,
    body_text: document.getElementById("tplBody").value,
    footer: document.getElementById("tplFooter").value,
    buttons: buttons
  }, "live");
}


//SAVE TEMPLATE 
async function saveTemplate(){
  const btn = document.getElementById("saveBtn");
  if(btn) {
      btn.disabled = true;
      btn.innerText = "Saving...";
  }

  try {
    if(!tplName.value.trim()){
      showModernAlert("Perhatian", "Nama template wajib diisi", "error");
      if(btn) { btn.disabled = false; btn.innerText = "Simpan & Ajukan"; }
      return;
    }

    const cat = document.getElementById("category").value;
    if(cat !== "AUTHENTICATION" && !tplBody.value.trim()){
      showModernAlert("Perhatian", "Body template tidak boleh kosong", "error");
      if(btn) { btn.disabled = false; btn.innerText = "Simpan & Ajukan"; }
      return;
    }

    const mode = document.getElementById("tplButtonMode")?.value || "";
    let buttons = [];

   // 🔥 TANGKAP MULTI CTA
  if(mode === "cta"){
    document.querySelectorAll(".cta-item").forEach(item => {
      const type = item.querySelector(".cta-type").value;
      const text = item.querySelector(".cta-text").value;
      let value = item.querySelector(".cta-value").value;
      const urlType = item.querySelector(".cta-url-type")?.value;

      if(type && text && value){
        if(type === "phone") {
            buttons.push({ type: "phone", text: text, value: value });
        }
        if(type === "website") {
            // Jika dynamic dan user belum ketik {{1}} manual, kita tambahkan ke belakang URL
            if (urlType === "dynamic" && !value.includes("{{1}}")) {
                value = value.endsWith("/") ? value + "{{1}}" : value + "/{{1}}";
            }
            buttons.push({ type: "url", text: text, value: value });
        }
      }
    });
  }

    if(mode === "quick"){
      const list = [...document.querySelectorAll("#quickReplyBox input")].map(i => i.value.trim()).filter(v => v !== "");
      list.forEach(text => buttons.push({ type: "quick_reply", text: text }));
    }

    if(mode === "flow"){
      const flowId = document.getElementById("flowId").value;
      const flowText = document.getElementById("flowText").value;
      const flowScreen = document.getElementById("flowScreen").value;
      if(flowId && flowText){
        buttons.push({ type: "flow", text: flowText, flow_id: flowId, screen: flowScreen || null });
      }
    }

    let headerFinal = document.getElementById("tplHeader")?.value || null;
    let headerTypeFinal = document.getElementById("tplHeaderType").value;
    const file = document.getElementById("tplHeaderFile")?.files[0];
    let originalFileName = file ? file.name : null;

     // 🔥 INTERCEPT AUTHENTICATION PAYLOAD
    if (cat === "AUTHENTICATION") {
      const auth = getAuthContent();
      
      // Paksa data Authentication yang sah ke Payload
      tplBody.value = auth.body;
      tplFooter.value = auth.footer;
      
      // buttons format khusus Meta untuk OTP
      buttons = [{ type: "otp", text: auth.btn }]; 
      headerTypeFinal = "";
      headerFinal = "";
    } else {
      // PROSES MEDIA JIKA BUKAN AUTHENTICATION
      if(headerTypeFinal === "media"){
        const mediaType = document.getElementById("tplHeaderMediaType").value;
        if(!mediaType){ 
            showModernAlert("Perhatian", "Pilih media type dulu", "error"); 
            if(btn) { btn.disabled = false; btn.innerText = "Simpan & Ajukan"; }
            return; 
        }
        headerTypeFinal = mediaType;
      }
      
      if(headerTypeFinal === "image" || headerTypeFinal === "video" || headerTypeFinal === "document"){
        if(!file){ 
            showModernAlert("Perhatian", "Pilih file header dulu", "error"); 
            if(btn) { btn.disabled = false; btn.innerText = "Simpan & Ajukan"; }
            return; 
        }
        const fd = new FormData();
        fd.append("file", file);
        const uploadRes = await fetch(API + "/upload", { method:"POST", body: fd });
        let upload;
        try { 
            upload = await uploadRes.json(); 
        } catch(e){ 
            showModernAlert("Gagal", "Upload media gagal, periksa koneksi Anda.", "error"); 
            if(btn) { btn.disabled = false; btn.innerText = "Simpan & Ajukan"; }
            return; 
        }
        if(!uploadRes.ok || !upload.url){ 
            showModernAlert("Gagal", "Upload header gagal ke server.", "error"); 
            if(btn) { btn.disabled = false; btn.innerText = "Simpan & Ajukan"; }
            return; 
        }
        headerFinal = upload.url;
      }
    }

   const payload = {
      template_id: currentEditId, // 🔥 BACKEND HARUS CEK INI (Jika ada = UPDATE, Jika null = INSERT)
      client_id: CID,
      name: document.getElementById("tplName").value,
      language: document.getElementById("tplLanguage")?.value || "id",
      category_template: cat,
      header_type: headerTypeFinal,
      header_value: headerFinal,
      file_name: originalFileName,
      body_text: document.getElementById("tplBody").value,
      footer: document.getElementById("tplFooter").value || null,
      params: [], 
      buttons: buttons, 
      flow: null, 
      created_by: localStorage.getItem("email") || "admin"
    };

    console.log("PAYLOAD TEMPLATE:", payload);

    const res = await fetch(API + "/create-template",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data = {}; try { data = JSON.parse(text); } catch(e){}

    // 🔥 ALERT MODERN SAAT RESPON SERVER GAGAL/BERHASIL
    if(!res.ok){ 
        showModernAlert("Gagal", data?.error || "Gagal save template", "error"); 
        return; 
    }
    
    try { if (typeof closeTemplateModal === "function") closeTemplateModal(); } catch(e){}
    try { if (typeof loadTemplatesList === "function") await loadTemplatesList(); } catch(e){}

    showModernAlert("Berhasil!", "Template berhasil diajukan ke Meta.", "success");

  } catch(err){
    console.log("ERROR:", err);
    showModernAlert("Server Error", "Terjadi kesalahan di server.", "error");
  } finally {
    if(btn) {
        btn.disabled = false;
        btn.innerText = "Simpan & Ajukan";
    }
  }
}

//CLOSE MODAL TEMPLATE
function closeTemplateModal(){
  const modal = document.getElementById("templateModal");
  if(modal){
    modal.classList.add("hidden");
  }
}

// ================= STEP PREVIEW =================
function goPreview() {
  // 🔥 Karena semua logika (Multi-CTA, Auth, dll) sudah diurus
  // oleh fungsi livePreview(), kita cukup panggil fungsinya di sini!
  livePreview();

  // ================= UI SWITCH =================
  document.getElementById("stepForm").classList.add("hidden");
  document.getElementById("stepPreview").classList.remove("hidden");
}

function backToForm() {
  document.getElementById("stepForm").classList.remove("hidden");
  document.getElementById("stepPreview").classList.add("hidden");
}

// ==========================================
// 1. OPEN CREATE TEMPLATE (UPDATE)
// ==========================================
function openCreateTemplate(){
  currentEditId = null;
  templateModal.classList.remove("hidden");
  uploadedHeaderUrl = null;
  paramCount = 1;
  quickReplyCount = 0;
  
  document.getElementById("quickReplyBox").innerHTML = "";
  document.getElementById("ctaBox").innerHTML = "";
  addCTA(); // Munculkan 1 box CTA default

  tplName.value = "";
  tplBody.value = "";
  tplFooter.value = "";
  tplHeader.value = "";

  document.getElementById("category").value = "MARKETING"; 
  toggleCategory(); // Reset UI ke normal

  document.getElementById("tplHeaderType").value = "";
  document.getElementById("headerTextBox").classList.add("hidden");
  document.getElementById("mediaTypeBox").classList.add("hidden");
}

// ================= LOAD PAGINATION TEMPLATE=================
async function loadTemplatesList(){

  const res = await fetch(API + "/templates?client_id=" + CID);
  const data = await res.json();

  allTemplates = data || [];

  renderList();
}

// ================= FILTER =================
function getFilteredData(){
  return allTemplates.filter(t =>
    (t.name || "").toLowerCase().includes(keyword.toLowerCase())
  );
}

// ================= RENDER TABLE =================
function renderList(){

  const tbody = document.getElementById("templateList");
  const data = getFilteredData();

  const start = (currentPage - 1) * limit;
  const end = start + limit;

  const pageData = data.slice(start, end);

//SHOW TOTAL TEMPLATE
  const totalData = data.length;
const realEnd = Math.min(end, totalData);

const info = document.getElementById("templateInfo");
if(info){
  info.innerText = `Showing ${totalData === 0 ? 0 : start + 1}–${realEnd} of ${totalData} Templates`;
}
  
  tbody.innerHTML = "";

  if(pageData.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center p-4 text-gray-400">
          No data
        </td>
      </tr>
    `;
    return;
  }

  pageData.forEach(t => {

    const created = t.created_at
      ? new Date(t.created_at + "Z").toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta"
        }) + " WIB"
      : "-";

    tbody.innerHTML += `
      <tr class="border-b text-center">

        <td class="p-2">${t.name}</td>
        <td class="p-2">${t.category_template || "-"}</td>
        <td class="p-2">${t.language || "-"}</td>
        <td class="p-2">${t.status || "PENDING"}</td>

        <td class="p-2 relative text-center">
        <button onclick="toggleTemplateActionMenu(event, '${t.id}')" class="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white px-3 py-1 font-extrabold text-lg rounded transition">
            ⋮
          </button>
          
          <div id="action-menu-${t.id}" class="action-menu hidden absolute right-8 top-8 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden text-left">
            <button onclick="goDetail('${t.id}')" class="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">👁️ Detail</button>
            <button onclick="duplicateTemplate('${t.id}')" class="w-full text-left px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">📄 Duplicate</button>
            <button onclick="editTemplate('${t.id}','${t.status}')" class="w-full text-left px-4 py-2.5 text-sm font-semibold text-yellow-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">✏️ Edit</button>
            <button onclick="deleteTemplate('${t.id}')" class="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">🗑️ Delete</button>
          </div>
        </td>

        <td class="p-2 text-xs">${created}</td>

      </tr>
    `;
  });

  renderPagination(data.length);
}

// ================= PAGINATION =================
function renderPagination(total){

  const box = document.getElementById("paginationBox");
  const totalPage = Math.ceil(total / limit);

  box.innerHTML = "";

  if(totalPage <= 1) return;

  let html = "";

  // ================= PREV =================
  html += `
    <button onclick="changePage(${currentPage - 1})"
      ${currentPage === 1 ? "disabled" : ""}
      class="px-3 py-1 border rounded ${currentPage === 1 ? 'opacity-30' : ''}">
      ‹
    </button>
  `;

  // ================= RANGE =================
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPage, currentPage + 2);

  // ================= FIRST =================
  if(startPage > 1){
    html += `<button onclick="changePage(1)" class="px-3 py-1 border rounded">1</button>`;

    if(startPage > 2){
      html += `<span class="px-2">...</span>`;
    }
  }

  // ================= MIDDLE =================
  for(let i = startPage; i <= endPage; i++){
    html += `
      <button onclick="changePage(${i})"
        class="px-3 py-1 border rounded ${
          i === currentPage ? 'bg-blue-500 text-white' : ''
        }">
        ${i}
      </button>
    `;
  }

  // ================= LAST =================
  if(endPage < totalPage){
    if(endPage < totalPage - 1){
      html += `<span class="px-2">...</span>`;
    }

    html += `
      <button onclick="changePage(${totalPage})"
        class="px-3 py-1 border rounded">
        ${totalPage}
      </button>
    `;
  }

  // ================= NEXT =================
  html += `
    <button onclick="changePage(${currentPage + 1})"
      ${currentPage === totalPage ? "disabled" : ""}
      class="px-3 py-1 border rounded ${currentPage === totalPage ? 'opacity-30' : ''}">
      ›
    </button>
  `;

  box.innerHTML = html;
}

// ================= CHANGE PAGE =================
function changePage(p){
  const total = Math.ceil(getFilteredData().length / limit);
  if(p < 1 || p > total) return;

  currentPage = p;
  renderList();
}

// ================= SEARCH =================
function handleSearch(){
  keyword = document.getElementById("searchInput").value;
  currentPage = 1;
  renderList();
}

// ================= LIMIT =================
function changeLimit(){
  limit = parseInt(document.getElementById("limitSelect").value);
  currentPage = 1;
  renderList();
}

// ================= DETAIL =================
function goDetail(id){
  location.href = "template-detail.html?id=" + id;
}

// ================= INIT =================
window.addEventListener("DOMContentLoaded", () => {

  // halaman list
  if(window.location.pathname.includes("template.html")){
    loadTemplatesList();
  }

  // halaman detail
  if(window.location.pathname.includes("template-detail.html")){
    loadDetail();
  }

});


// AUTO CLOSE EMOJI
window.addEventListener("click", function(e){
  const box = document.getElementById("emojiBox");
     if(!box) return;
  if(
    !e.target.closest("#emojiBox") &&
    !e.target.closest("button[onclick='toggleEmoji()']")
  ){
    box.classList.add("hidden");
  }
});

  function openImage(src){
  document.getElementById("imgPreview").src = src;
  document.getElementById("imgModal").classList.remove("hidden");
}

//LIVE SISA KARAKETER KETIK TEMPLATE
document.addEventListener("DOMContentLoaded", () => {
  const tplBody = document.getElementById("tplBody");
  const bodyCounter = document.getElementById("bodyCounter");

  if (!tplBody || !bodyCounter) return;

  const MAX_BODY = 1024;

  tplBody.addEventListener("input", () => {
    const used = tplBody.value.length;
    const remaining = MAX_BODY - used;

    bodyCounter.textContent = remaining + " tersisa";

    if (remaining <= 50) {
      bodyCounter.classList.add("text-red-500");
    } else {
      bodyCounter.classList.remove("text-red-500");
    }
  });
});

//AUTO CORRECT HURUF DAN SPASI NAME TEMPLATE
document.addEventListener("DOMContentLoaded", () => {
  const tplName = document.getElementById("tplName");

  if (!tplName) return;

  tplName.addEventListener("input", () => {
    let value = tplName.value;

    // 🔥 lowercase semua
    value = value.toLowerCase();

    // 🔥 spasi jadi underscore
    value = value.replace(/\s+/g, "_");

    // 🔥 optional: hapus karakter aneh (biar aman WABA)
    value = value.replace(/[^a-z0-9_]/g, "");

    tplName.value = value;
  });
});


  // PROFILE DATA
function loadProfile(){
  const EMAIL = localStorage.getItem("email");
  if(!EMAIL) return;

  const emailEl = document.getElementById("profileEmail");
  if(emailEl) emailEl.innerText = EMAIL;

  const nameEl = document.getElementById("profileName");
  if(nameEl) nameEl.innerText = EMAIL.split("@")[0];

  const avatarEl = document.getElementById("avatarCircle");
  if(avatarEl) avatarEl.innerText = EMAIL[0].toUpperCase();
}

// TOGGLE DROPDOWN
function toggleProfile(){
  document.getElementById("profileMenu").classList.toggle("hidden");
}

// CLICK OUTSIDE CLOSE
window.addEventListener("click", function(e){
  if(
  !e.target.closest("#profileMenu") &&
  !e.target.closest("[onclick='toggleProfile()']")
){
  document.getElementById("profileMenu").classList.add("hidden");
}
});

// THEME
function setTheme(mode){
  localStorage.setItem("theme", mode);
  applyTheme();
}

function applyTheme(){
  const theme = localStorage.getItem("theme") || "system";

  if(theme === "dark"){
    document.documentElement.classList.add("dark");
  }
  else if(theme === "light"){
    document.documentElement.classList.remove("dark");
  }
  else {
    if(window.matchMedia('(prefers-color-scheme: dark)').matches){
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
}

// CLOSE IMAGE
function closeImage(){
  document.getElementById("imgModal").classList.add("hidden");
}

// LISTENER SYSTEM
window.matchMedia('(prefers-color-scheme: dark)')
.addEventListener('change', applyTheme);

// ===============================
// 🔥 FIX PREVIEW MODAL CLICK OUTSIDE (ANTI ERROR)
// ===============================
window.addEventListener("click", (e)=>{
  const modal = document.getElementById("previewModal");

  // 🔥 WAJIB: cegah null error
  if(!modal) return;

  // kalau modal lagi kebuka & klik background → close
  if(!modal.classList.contains("hidden") && e.target === modal){
    closePreview();
  }
});


// ================= FITUR BARU: TEMPLATE AUTHENTICATION & MULTI CTA =================

function insertHeaderParam() {
  const headerInput = document.getElementById("tplHeader");
  if (!headerInput.value.includes("{{1}}")) {
    headerInput.value += " {{1}} ";
    livePreview();
  } else {
    alert("Header maksimal hanya mendukung 1 parameter {{1}}");
  }
}

function toggleHeaderType() {
  const val = document.getElementById("tplHeaderType").value;
  document.getElementById("headerTextBox").classList.add("hidden");
  document.getElementById("mediaTypeBox").classList.add("hidden");
  if(val === "text") document.getElementById("headerTextBox").classList.remove("hidden");
  if(val === "media") document.getElementById("mediaTypeBox").classList.remove("hidden");
  livePreview();
}

function toggleButtonMode() {
  const val = document.getElementById("tplButtonMode").value;
  document.getElementById("ctaSection").classList.add("hidden");
  document.getElementById("quickReplySection").classList.add("hidden");
  document.getElementById("flowSection").classList.add("hidden");
  
  if(val === "cta") document.getElementById("ctaSection").classList.remove("hidden");
  if(val === "quick") document.getElementById("quickReplySection").classList.remove("hidden");
  if(val === "flow") document.getElementById("flowSection").classList.remove("hidden");
  livePreview();
}

function toggleCategory() {
  const cat = document.getElementById("category").value;
  const normalElements = [
    "tplHeaderType", "headerTextBox", "mediaTypeBox", 
    "bodyToolbar", "tplBody", "bodyHelper", 
    "tplFooter", "tplButtonMode", 
    "ctaSection", "quickReplySection", "flowSection"
  ];
  const authSection = document.getElementById("authSection");

  if (cat === "AUTHENTICATION") {
    normalElements.forEach(id => {
       const el = document.getElementById(id);
       if(el) el.classList.add("hidden");
    });
    authSection.classList.remove("hidden");
  } else {
    // Show normal fields back
    document.getElementById("tplHeaderType").classList.remove("hidden");
    toggleHeaderType();
    
    document.getElementById("bodyToolbar").classList.remove("hidden");
    document.getElementById("tplBody").classList.remove("hidden");
    document.getElementById("bodyHelper").classList.remove("hidden");
    document.getElementById("tplFooter").classList.remove("hidden");
    document.getElementById("tplButtonMode").classList.remove("hidden");
    toggleButtonMode();
    
    authSection.classList.add("hidden");
  }
  livePreview();
}

//ADD CTA
function addCTA() {
  const box = document.getElementById("ctaBox");
  if (box.querySelectorAll(".cta-item").length >= 3) {
     showModernAlert("Perhatian", "Maksimal 3 CTA secara keseluruhan (Max 2 Website, 1 Phone).", "error"); 
     return;
  }
  
  const wrapper = document.createElement("div");
  wrapper.className = "cta-item flex gap-2 mb-2 border p-3 rounded dark:border-gray-600 relative bg-gray-50 dark:bg-gray-800 shadow-sm";
  
  wrapper.innerHTML = `
    <div class="flex-1 space-y-2">
      <div class="flex gap-2">
        <select class="cta-type w-1/2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2 rounded text-sm font-semibold" onchange="toggleUrlType(this); validateCTA(this); livePreview()">
          <option value="website">Visit Website</option>
          <option value="phone">Call Phone Number</option>
        </select>
        <select class="cta-url-type w-1/2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2 rounded text-sm text-blue-600 font-semibold" onchange="toggleUrlType(this); livePreview()">
          <option value="static">Static URL</option>
          <option value="dynamic">Dynamic URL ({{1}})</option>
        </select>
      </div>
      <input class="cta-text w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2 rounded text-sm" placeholder="Button text (e.g., Kunjungi Web)" oninput="livePreview()">
      <div class="relative">
        <input class="cta-value w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2 rounded text-sm" placeholder="URL (https://...) / Phone (+62...)" oninput="livePreview()">
        <span class="cta-dynamic-suffix hidden absolute right-2 top-2 text-sm text-blue-500 font-bold bg-white dark:bg-gray-900 px-1">{{1}}</span>
      </div>
    </div>
    <button onclick="this.parentElement.remove(); livePreview()" class="px-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded h-9 mt-1 transition">✕</button>
  `;
  box.appendChild(wrapper);
  validateCTA(wrapper.querySelector('.cta-type'));
  toggleUrlType(wrapper.querySelector('.cta-type')); // Trigger default state
  livePreview();
}

// Helper untuk UI toggle Dynamic/Static URL
function toggleUrlType(selectEl) {
    const wrapper = selectEl.closest('.cta-item');
    if (!wrapper) return;
    const typeEl = wrapper.querySelector('.cta-type');
    const urlTypeEl = wrapper.querySelector('.cta-url-type');
    const suffixEl = wrapper.querySelector('.cta-dynamic-suffix');
    const valueInput = wrapper.querySelector('.cta-value');

    if (typeEl.value === 'website') {
        urlTypeEl.classList.remove('hidden');
        if (urlTypeEl.value === 'dynamic') {
            suffixEl.classList.remove('hidden');
            valueInput.style.paddingRight = '45px'; // Ruang untuk {{1}}
        } else {
            suffixEl.classList.add('hidden');
            valueInput.style.paddingRight = '0.5rem';
        }
    } else {
        urlTypeEl.classList.add('hidden');
        suffixEl.classList.add('hidden');
        valueInput.style.paddingRight = '0.5rem';
    }
}

function validateCTA(selectEl) {
  const box = document.getElementById("ctaBox");
  const allTypes = Array.from(box.querySelectorAll('.cta-type')).map(s => s.value);
  
  const webCount = allTypes.filter(t => t === "website").length;
  const phoneCount = allTypes.filter(t => t === "phone").length;
  
  if (webCount > 2) {
     alert("Maksimal 2 tombol Visit Website!");
     selectEl.value = "phone";
  }
  if (phoneCount > 1) {
     alert("Maksimal 1 tombol Call Phone Number!");
     selectEl.value = "website";
  }
}

function getAuthContent() {
    const lang = document.getElementById("tplLanguage")?.value || "en";
    const useSec = document.getElementById("authSecurity")?.checked;
    const useExp = document.getElementById("authExpire")?.checked;
    
    // Gunakan nilai hardcoded atau ambil dari config default
    // Kita hapus referensi ke id="authBtnText"
    const btnTextDefault = lang === "id" ? "Salin Kode" : "Copy code";

    // Kamus bahasa
    const dict = {
        id: {
            body: "{{1}} adalah kode verifikasi Anda.",
            security: "\nDemi keamanan, jangan bagikan kode ini.",
            footer: "Kode ini kedaluwarsa dalam 5 menit.",
            btn: btnTextDefault // Mengambil dari variabel statis
        },
        en: {
            body: "{{1}} is your verification code.",
            security: "\nFor your security, do not share this code.",
            footer: "This code expires in 5 minutes.",
            btn: btnTextDefault // Mengambil dari variabel statis
        }
    };

    const data = dict[lang] || dict['en'];
    let bodyText = data.body;
    if(useSec) bodyText += data.security;
    let footerText = useExp ? data.footer : "";

    return { body: bodyText, footer: footerText, btn: data.btn };
}

// ================= MODERN MODAL ALERT & CONFIRM =================

function showModernAlert(title, text, type = "success") {
    const modalId = "modernAlertModal";
    if (document.getElementById(modalId)) document.getElementById(modalId).remove();

    const isError = type === "error";
    const iconColor = isError ? "text-red-500 bg-red-100 dark:bg-red-900/30" : "text-green-500 bg-green-100 dark:bg-green-900/30";
    const iconSvg = isError
        ? `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`
        : `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;

    const modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] opacity-0 transition-opacity duration-300";
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 w-[350px] p-6 rounded-2xl shadow-2xl transform scale-95 transition-transform duration-300">
        <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full ${iconColor}">${iconSvg}</div>
        <h3 class="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">${title}</h3>
        <p class="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">${text}</p>
        <button onclick="document.getElementById('${modalId}').remove()" class="w-full px-4 py-2 ${isError ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-semibold rounded-xl shadow-md transition">Tutup</button>
      </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => {
        modal.classList.remove("opacity-0");
        modal.querySelector('div').classList.remove("scale-95");
    }, 10);
}

function confirmSaveTemplate() {
    const inputName = document.getElementById("tplName").value.trim();

    // Validasi basic sebelum modal muncul
    if(!inputName){
      showModernAlert("Perhatian", "Nama template wajib diisi", "error"); return;
    }
    if(document.getElementById("category").value !== "AUTHENTICATION" && !document.getElementById("tplBody").value.trim()){
      showModernAlert("Perhatian", "Body template tidak boleh kosong", "error"); return;
    }

    // 🔥 VALIDASI NAMA TIDAK BOLEH DUPLIKAT
    // Kita abaikan pengecekan jika dia mengedit dirinya sendiri (t.id === currentEditId)
    const isDuplicate = allTemplates.some(t => t.name.toLowerCase() === inputName.toLowerCase() && t.id !== currentEditId);
    if(isDuplicate) {
      showModernAlert("Gagal", "Nama template tidak boleh sama dengan yang sudah dibuat!", "error"); 
      return;
    }

    const modalId = "modernConfirmModal";
    if (document.getElementById(modalId)) document.getElementById(modalId).remove();

    const modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] opacity-0 transition-opacity duration-300";
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 w-[400px] p-6 rounded-2xl shadow-2xl transform scale-95 transition-transform duration-300">
        <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-500 rounded-full">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h3 class="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Ajukan Template?</h3>
        <p class="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
          Template akan diajukan ke pihak Meta untuk direview (maksimal 1x24 jam). <br><b class="text-red-500">Template yang sudah diajukan tidak dapat diedit kembali.</b><br><br>Pastikan semua data sudah benar.
        </p>
        <div class="flex gap-3">
          <button onclick="document.getElementById('${modalId}').remove()" class="w-1/2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl transition">Batal</button>
          <button id="btnRealSave" class="w-1/2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-md transition">Ya, Ajukan</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("btnRealSave").addEventListener("click", () => {
        document.getElementById(modalId).remove();
        saveTemplate(); // Panggil fungsi save asli
    });

    setTimeout(() => {
        modal.classList.remove("opacity-0");
        modal.querySelector('div').classList.remove("scale-95");
    }, 10);
}
