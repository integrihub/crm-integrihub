if (!window.API) {
  window.API = window.location.hostname.includes("staging") || 
               window.location.hostname.includes("pages.dev") || 
               window.location.hostname.includes("localhost") || 
               window.location.hostname.includes("127.0.0.1")
    ? "https://api-staging.crm.integrihub.my.id"
    : "https://api-crm.integrihub.my.id";
}

// ================= STATE (VARIABLE TERISOLASI) =================
let AUDIT_CACHE = [];
let auditCurrentPage = 1;
let auditCurrentLimit = 20;

// ================= INIT =================
window.addEventListener("load", () => {
  loadAuditLogs();
});

// ================= FETCH DATA (SERVER-SIDE) =================
async function loadAuditLogs() {
  const table = document.getElementById("auditTableBody");
  table.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-blue-500 font-semibold animate-pulse">Menarik data dari server...</td></tr>`;

  const clientFilter = document.getElementById("filterClient").value.trim() || "all";
  const actionFilter = document.getElementById("filterAction").value;
  const entityFilter = document.getElementById("filterEntity").value;
  const startDate = document.getElementById("filterStartDate").value; // 🔥 Tanggal Dari
  const endDate = document.getElementById("filterEndDate").value;     // 🔥 Tanggal Sampai

  try {
    const query = new URLSearchParams({
      page: auditCurrentPage,
      limit: auditCurrentLimit,
      client_id: clientFilter,
      action: actionFilter,
      entity: entityFilter,
      start_date: startDate,
      end_date: endDate
    }).toString();

    const res = await fetch(`${API}/superadmin/audit-logs?${query}`);
    const resData = await res.json();

    if (!res.ok || !resData.success) throw new Error(resData.error || "Gagal mengambil log");

    AUDIT_CACHE = resData.data;
    renderAuditTable(AUDIT_CACHE, resData.pagination);

  } catch (err) {
    console.error("LOAD AUDIT ERROR:", err);
    table.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500 font-semibold">Gagal memuat data. Cek koneksi server.</td></tr>`;
  }
}

// ================= RENDER TABLE =================
function renderAuditTable(data, pagination) {
  const table = document.getElementById("auditTableBody");
  const info = document.getElementById("auditInfo");

  if (!data || data.length === 0) {
    table.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">Tidak ada data log yang ditemukan</td></tr>`;
    info.innerText = "0 data";
    document.getElementById("auditPagination").innerHTML = "";
    return;
  }

  table.innerHTML = data.map(log => {
    return `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
        <td class="p-3 text-xs">${formatWIB(log.created_at)}</td>
        <td class="p-3">
          <div class="font-semibold">${log.actor_email}</div>
          <div class="text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 inline-block px-1 rounded uppercase">${log.actor_role}</div>
        </td>
        <td class="p-3 text-sm">${log.client_id ? Math.floor(log.client_id) : '<span class="text-gray-400 italic">System</span>'}</td>
        <td class="p-3">${renderActionBadge(log.action)}</td>
        <td class="p-3 font-semibold">${log.entity} <br><span class="text-[10px] font-normal text-gray-500">ID: ${log.entity_id || '-'}</span></td>
        <td class="p-3 text-center">
          <button onclick="viewDetail('${log.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow text-xs transition">
            Lihat Detail
          </button>
        </td>
      </tr>
    `;
  }).join("");

  // Update Info Teks
  const startCount = ((pagination.page - 1) * pagination.limit) + 1;
  const endCount = Math.min(pagination.page * pagination.limit, pagination.total);
  info.innerText = `Menampilkan ${startCount} - ${endCount} dari total ${pagination.total} Log`;

  // Render Paginasi Bawah
  renderServerPagination(pagination);
}

// ================= HELPER UI =================
function renderActionBadge(action) {
  const a = (action || "").toUpperCase();
  if (a === "CREATE") return `<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">CREATE</span>`;
  if (a === "UPDATE") return `<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold border border-yellow-200">UPDATE</span>`;
  if (a === "DELETE") return `<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">DELETE</span>`;
  if (a === "LOGIN") return `<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold border border-purple-200">LOGIN</span>`;
  return `<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold border border-gray-200">${a}</span>`;
}

function formatWIB(dateString) {
  if (!dateString) return "-";
  const iso = dateString.replace(" ", "T");
  const d = new Date(iso);
  if (isNaN(d)) return dateString;

  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

// ================= MODAL DIFF VIEWER =================
function viewDetail(logId) {
  const log = AUDIT_CACHE.find(l => l.id === logId);
  if (!log) return;

  // Set Judul & IP Address Modal
  document.getElementById("modalTitle").innerText = `Log Detail: ${log.action} ${log.entity}`;
  document.getElementById("modalIpAddress").innerText = log.ip_address || "Unknown IP";

  // Parse JSON agar rapi (Pretty Print)
  const formatJSON = (jsonStr) => {
    if (!jsonStr) return "Tidak ada data.";
    try {
      const obj = JSON.parse(jsonStr);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return jsonStr; 
    }
  };

  document.getElementById("oldValueViewer").innerText = formatJSON(log.old_value);
  document.getElementById("newValueViewer").innerText = formatJSON(log.new_value);

  document.getElementById("auditModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("auditModal").classList.add("hidden");
}

// ================= PAGINATION SERVER SIDE (DIBUAT RAPI) =================
function renderServerPagination(pagination) {
  const container = document.getElementById("auditPagination");
  if (pagination.total_pages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";
  const total = pagination.total_pages;
  const current = pagination.page;

  // PREV
  html += `<button onclick="goToPage(${current - 1})" ${current === 1 ? "disabled" : ""} class="px-3 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 ${current === 1 ? 'opacity-50 cursor-not-allowed' : ''}">◀</button>`;

  const startPage = Math.max(1, current - 2);
  const endPage = Math.min(total, current + 2);

  // FIRST PAGE & ELLIPSIS
  if(startPage > 1){
    html += `<button onclick="goToPage(1)" class="px-3 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800">1</button>`;
    if(startPage > 2) html += `<span class="px-2">...</span>`;
  }

  // MIDDLE
  for (let i = startPage; i <= endPage; i++) {
    html += `<button onclick="goToPage(${i})" class="px-3 py-1 border dark:border-gray-600 rounded transition ${i === current ? 'bg-blue-600 text-white font-bold' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}">${i}</button>`;
  }

  // LAST PAGE & ELLIPSIS
  if(endPage < total){
    if(endPage < total - 1) html += `<span class="px-2">...</span>`;
    html += `<button onclick="goToPage(${total})" class="px-3 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800">${total}</button>`;
  }

  // NEXT
  html += `<button onclick="goToPage(${current + 1})" ${current === total ? "disabled" : ""} class="px-3 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 ${current === total ? 'opacity-50 cursor-not-allowed' : ''}">▶</button>`;

  container.innerHTML = html;
}

function goToPage(page) {
  auditCurrentPage = page;
  loadAuditLogs(); 
}

function changeLimit(limit) {
  auditCurrentLimit = parseInt(limit);
  auditCurrentPage = 1; 
  loadAuditLogs();
}

function applyFilter() {
  auditCurrentPage = 1; 
  loadAuditLogs();
}

// ================= EXPORT CSV =================
async function exportCSV() {
  // 🔥 TAMBAHAN: Cek Validasi Tanggal Dulu
  const startDate = document.getElementById("filterStartDate").value;
  const endDate = document.getElementById("filterEndDate").value;
  const warning = document.getElementById("dateWarning"); // ID yang kita buat di HTML tadi

  if (!startDate || !endDate) {
    warning.classList.remove("hidden"); // Munculkan peringatan merah
    setTimeout(() => warning.classList.add("hidden"), 3000); // Hilang otomatis setelah 3 detik
    return; // Berhenti di sini, tidak lanjut download
  }
  warning.classList.add("hidden"); // Sembunyikan peringatan jika valid
  // 🔥 END TAMBAHAN

  const btn = document.getElementById("btnExport");
  btn.innerText = "⏳ Memproses...";
  btn.disabled = true;

  const clientFilter = document.getElementById("filterClient").value.trim() || "all";
  const actionFilter = document.getElementById("filterAction").value;
  const entityFilter = document.getElementById("filterEntity").value;

  try {
    // 🔥 Limit 999999 agar SEMUA data di rentang waktu tersebut terdownload, bukan cuma 20 baris!
    const query = new URLSearchParams({
      page: 1,
      limit: 999999,
      client_id: clientFilter,
      action: actionFilter,
      entity: entityFilter,
      start_date: startDate,
      end_date: endDate
    }).toString();

    const res = await fetch(`${API}/superadmin/audit-logs?${query}`);
    const resData = await res.json();

    if (!res.ok || !resData.success) throw new Error("Gagal mengambil data dari server");

    const exportData = resData.data;

    if (exportData.length === 0) {
      alert("Tidak ada data untuk diexport pada filter ini!");
      btn.innerHTML = "📥 Export CSV";
      btn.disabled = false;
      return;
    }

    let csvContent = "Time,Actor,Role,Client_ID,Action,Entity,IP_Address\n";

    exportData.forEach(log => {
      const time = formatWIB(log.created_at).replace(/,/g, "");
      const actor = log.actor_email;
      const role = log.actor_role;
      const client = log.client_id || "System";
      const action = log.action;
      const entity = log.entity;
      const ip = log.ip_address || "";

      csvContent += `"${time}","${actor}","${role}","${client}","${action}","${entity}","${ip}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Audit_Logs_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (err) {
    alert("Gagal Export: " + err.message);
  }

  btn.innerHTML = "📥 Export CSV";
  btn.disabled = false;
}
