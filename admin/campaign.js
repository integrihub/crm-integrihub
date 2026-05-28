if (!window.API) {
  window.API = window.location.hostname.includes("staging") || 
               window.location.hostname.includes("pages.dev") || 
               window.location.hostname.includes("localhost") || 
               window.location.hostname.includes("127.0.0.1")
    ? "https://api-staging.crm.integrihub.my.id"
    : "https://api-crm.integrihub.my.id";
}

window.campaignSelectedSource = null;
window.campaignSelectedTemplate = null;
window.campaignSelectedTemplateName = "";
window.campaignTemplateParams = [];
window.campaignAllTemplates = [];

window.campaignRawList = [];
window.campaignFilteredList = [];
window.campaignCurrentPage = 1;
window.campaignItemsPerPage = 10;

function getEl(id) { return document.getElementById(id); }

async function campaignLoadTemplates() {
  try {
    const activeCID = typeof CID !== 'undefined' ? CID : "";
    const res = await fetch(window.API + "/templates?client_id=" + activeCID);
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();
    
    window.campaignAllTemplates = (data || []).filter(t => {
       const status = (t.status || "").toLowerCase();
       return status === 'approved' || status === 'valid'; 
    });
    if (window.campaignAllTemplates.length === 0 && data.length > 0) {
        window.campaignAllTemplates = data;
    }
    renderTemplateDropdown(window.campaignAllTemplates);
  } catch (err) { console.log("LOAD TEMPLATE ERROR:", err); }
}

function renderTemplateDropdown(templates) {
  const dropdown = getEl("templateDropdown");
  if (!dropdown) return;
  if (templates.length === 0) {
    dropdown.innerHTML = `<div class="p-2 text-gray-500 text-sm">Tidak ada template ditemukan</div>`;
    return;
  }
  dropdown.innerHTML = templates.map(t => `
    <div onclick="selectTemplate('${t.id}')" class="p-2 hover:bg-blue-100 dark:hover:bg-gray-700 cursor-pointer border-b text-sm">
      ${t.name} <span class="text-xs text-gray-400">(${t.status || 'unknown'})</span>
    </div>
  `).join("");
}

function filterTemplates() {
  const keyword = getEl("templateSearch").value.toLowerCase();
  const filtered = window.campaignAllTemplates.filter(t => (t.name || "").toLowerCase().includes(keyword));
  renderTemplateDropdown(filtered);
  getEl("templateDropdown").classList.remove("hidden");
}

function selectTemplate(id) {
  const templateObj = window.campaignAllTemplates.find(t => String(t.id) === String(id));
  if (!templateObj) return;

  getEl("templateSearch").value = templateObj.name;
  getEl("campaignTemplateValue").value = templateObj.id;
  getEl("templateDropdown").classList.add("hidden");

  window.campaignSelectedTemplate = templateObj.id;
  window.campaignSelectedTemplateName = templateObj.name; 
  
  let paramCount = 0;
  if (templateObj.params_json) {
    try {
      let parsed = typeof templateObj.params_json === 'string' ? JSON.parse(templateObj.params_json) : templateObj.params_json;
      if (Array.isArray(parsed)) paramCount = parsed.length;
      else if (typeof parsed === 'object') paramCount = Object.keys(parsed).length;
    } catch(e) {}
  }

  if (paramCount === 0) {
    let strToCheck = templateObj.body || templateObj.content || JSON.stringify(templateObj) || "";
    let matches = strToCheck.match(/\{\{(\d+)\}\}/g);
    if (matches) {
       let uniqueParams = new Set(matches);
       paramCount = uniqueParams.size;
    }
  }
  window.campaignTemplateParams = new Array(paramCount).fill("");
}

// Global Click Listener (Menutup Dropdown & Menu Titik 3)
document.addEventListener('click', function(e) {
  const input = getEl('templateSearch');
  const dropdown = getEl('templateDropdown');
  if (input && dropdown && e.target !== input && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }

  // Menutup menu titik 3 jika klik di luar area tabel
  if (!e.target.closest('td')) {
    document.querySelectorAll('[id^="menu-"]').forEach(el => el.classList.add('hidden'));
  }
});

function showCreateCampaign() {
  getEl("campaignListView").classList.add("hidden");
  getEl("step1").classList.remove("hidden");
}

function goBackToList() {
  getEl("step1").classList.add("hidden");
  getEl("step2").classList.add("hidden");
  getEl("step3").classList.add("hidden");
  getEl("campaignListView").classList.remove("hidden");
}

// 🔥 FIX 1: Fungsi Cancel Blast
function cancelBlast() {
  if (confirm("Anda yakin ingin membatalkan pembuatan campaign ini?")) {
     goBackToList();
     getEl("campaignName").value = "";
     getEl("templateSearch").value = "";
     getEl("campaignFile").value = "";
     getEl("campaignManualInput").value = "";
  }
}

function campaignSelectSource(type) {
  window.campaignSelectedSource = type;
  const btnManual = getEl("btnManual");
  const btnUpload = getEl("btnUpload");

  if (btnManual) btnManual.classList.remove("bg-blue-600", "text-white");
  if (btnUpload) btnUpload.classList.remove("bg-blue-600", "text-white");

  if (type === "manual") {
    if (btnManual) btnManual.classList.add("bg-blue-600", "text-white");
  } else {
    if (btnUpload) btnUpload.classList.add("bg-blue-600", "text-white");
  }
}

function campaignGoStep2() {
  const name = getEl("campaignName")?.value?.trim();
  const templateId = getEl("campaignTemplateValue")?.value;

  if (!name) return alert("Nama campaign wajib diisi!");
  if (!templateId) return alert("Pilih template terlebih dahulu!");
  if (!window.campaignSelectedSource) return alert("Pilih data source dulu!");

  window.campaignDraft = {
    name,
    template_id: templateId,
    params: window.campaignTemplateParams,
    source: window.campaignSelectedSource
  };

  getEl("step1").classList.add("hidden");
  getEl("step2").classList.remove("hidden");

  const manualBox = getEl("manualBox");
  const uploadBox = getEl("uploadBox");

  if (window.campaignSelectedSource === "manual") {
    manualBox.classList.remove("hidden");
    uploadBox.classList.add("hidden");
  } else {
    uploadBox.classList.remove("hidden");
    manualBox.classList.add("hidden");
  }
  renderParamMapping();
}

function goBackToStep1() {
  getEl("step2").classList.add("hidden");
  getEl("step1").classList.remove("hidden");
}
function goBackToStep2() {
  getEl("step3").classList.add("hidden");
  getEl("step2").classList.remove("hidden");
}

function clearSelectedFile() {
  const fileInput = getEl("campaignFile");
  if(fileInput) fileInput.value = "";
}

function downloadFormatXLSX() {
  if (typeof XLSX === 'undefined') return alert("Library Excel belum siap.");

  let headers = ["No HP Kontak", "Nama Kontak"];
  for (let i = 0; i < window.campaignTemplateParams.length; i++) {
    headers.push(`Parameter ${i + 1}`);
  }

  const ws_data = [headers];
  let sampleRow = ["628123456789", "Bagas"];
  for (let i = 0; i < window.campaignTemplateParams.length; i++) {
    sampleRow.push(`Isi Param ${i + 1}`);
  }
  ws_data.push(sampleRow);

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Format Campaign");
  XLSX.writeFile(wb, "Format_Campaign_WA.xlsx");
}

function renderParamMapping() {
  const box = getEl("paramMappingBox");
  if (!box) return;

  const params = window.campaignDraft?.params || [];
  const excelCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  let html = `
    <div class="mb-3 grid grid-cols-2 gap-4 items-center">
      <label class="text-sm font-semibold">No HP Kontak</label>
      <input disabled value="Kolom A (Excel)" class="w-full border border-gray-300 p-2 rounded bg-white dark:bg-gray-700 font-mono text-sm text-center text-gray-500">
    </div>
    <div class="mb-3 grid grid-cols-2 gap-4 items-center">
      <label class="text-sm font-semibold">Nama Kontak</label>
      <input disabled value="Kolom B (Excel)" class="w-full border border-gray-300 p-2 rounded bg-white dark:bg-gray-700 font-mono text-sm text-center text-gray-500">
    </div>
  `;

  if (params.length === 0) {
    html += `<div class="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-center text-sm text-gray-500 italic border">Template ini tidak menggunakan Parameter Dinamis.</div>`;
  } else {
    html += `<hr class="my-4 border-gray-300 dark:border-gray-700">`;
    html += params.map((_, i) => {
      let colLetter = excelCols[i + 2] || '?'; 
      return `
      <div class="mb-3 grid grid-cols-2 gap-4 items-center">
        <label class="text-sm text-blue-700 dark:text-blue-400 font-bold">Variabel {{${i + 1}}}</label>
        <input disabled value="Ambil Dari Kolom ${colLetter}" class="w-full border border-blue-300 p-2 rounded bg-blue-50 dark:bg-gray-800 font-mono text-sm text-center font-bold text-blue-700 dark:text-blue-400 shadow-sm">
      </div>
      `;
    }).join("");
  }
  box.innerHTML = html;
}

function campaignParseManual() {
  const text = getEl("campaignManualInput")?.value || "";
  return text.split("\n").filter(r => r.trim()).map(r => {
    const cols = r.split(",");
    return { number: cols[0]?.trim() || "", name: cols[1]?.trim() || "", params: cols.slice(2).map(x => x.trim()) };
  });
}

function campaignParseFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve([]);
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length < 2) return resolve([]);
        const mappedData = json.slice(1).map(cols => ({
            number: cols[0] != null ? String(cols[0]).trim() : "",
            name: cols[1] != null ? String(cols[1]).trim() : "",
            params: cols.slice(2).map(x => (x != null) ? String(x).trim() : "")
        })).filter(r => r.number !== ""); 
        resolve(mappedData);
      } catch (err) {
        alert("Gagal membaca file Excel. Pastikan file tidak rusak.");
        resolve([]);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function campaignPreviewData() {
  let rawData = [];
  if (window.campaignDraft?.source === "manual") rawData = campaignParseManual();
  else if (window.campaignDraft?.source === "upload") {
    const file = getEl("campaignFile")?.files?.[0];
    if (!file) return alert("Silakan upload file Excel terlebih dahulu.");
    rawData = await campaignParseFile(file);
  }

  if (!rawData.length) return alert("Data kosong. Pastikan Anda telah Input Data.");

  let validData = [];
  let invalidCount = 0;

  rawData.forEach(row => {
    let rawNumber = row.number ? String(row.number) : "";
    let phone = rawNumber.replace(/\D/g, "");

    if(phone.startsWith("08")) phone = "628" + phone.substring(2);
    if (/^628[0-9]{8,13}$/.test(phone)) {
      row.number = phone;
      validData.push(row);
    } else invalidCount++;
  });

  if(validData.length === 0) return alert("Semua nomor telepon tidak valid! (Harus format 628xxx)");
  if(invalidCount > 0) alert(`Terdapat ${invalidCount} nomor tidak valid dan akan diabaikan.`);

  window.campaignDraft.data = validData;
  renderCampaignPreview(validData);
}

function renderCampaignPreview(data) {
  getEl("step2").classList.add("hidden");
  getEl("step3").classList.remove("hidden");

  let html = `<p class="mb-4 text-sm text-gray-500">Menampilkan 5 Data Teratas. (Total akan dikirim: <b>${data.length} kontak</b>)</p>`;

  data.slice(0, 5).forEach(d => {
    let body = `[Mockup Teks]\nHalo ${d.name || "Pelanggan"},\n`;
    d.params.forEach((p, i) => { body += `{{${i + 1}}} -> ${p}\n`; });

    html += `
      <div class="border border-gray-200 dark:border-gray-700 p-3 rounded mb-3 bg-gray-50 dark:bg-gray-900">
        <div class="text-xs font-bold text-blue-600 mb-1">To: ${d.number} ${d.name ? `(${d.name})` : ''}</div>
        <div class="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">${body}</div>
      </div>
    `;
  });
  getEl("previewContainer").innerHTML = html;
}

function toggleScheduleBox() {
  getEl("scheduleBox").classList.toggle("hidden");
}

async function campaignSend(mode) {
  let scheduleTimeMs = null;

  if (mode === 'schedule') {
    const inputVal = getEl("scheduleTime").value;
    if (!inputVal) return alert("Silakan pilih Tanggal dan Jam (WIB) terlebih dahulu!");
    scheduleTimeMs = new Date(inputVal).getTime().toString(); 
  }

  const btns = [getEl("btnSendNow"), getEl("btnToggleSchedule")];
  btns.forEach(b => { if(b) { b.disabled = true; b.innerHTML = "Memproses..."; } });
  
  try {
    const payload = { ...window.campaignDraft };
    const client_id = typeof CID !== 'undefined' ? CID : "";

    const createRes = await fetch(window.API + "/campaign/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        template_id: payload.template_id,
        template_name: window.campaignSelectedTemplateName || "Template Default",
        client_id: client_id,
        schedule_time: scheduleTimeMs,
        actor_email: localStorage.getItem("email")
      })
    });
    if (!createRes.ok) throw new Error(`[Create] Gagal membuat campaign.`);
    const createData = await createRes.json();
    const campaign_id = createData.campaign_id;

    const recipients = payload.data.map(d => ({ phone: d.number, name: d.name, params: d.params }));
    const addRes = await fetch(window.API + "/campaign/add-recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id, recipients })
    });
    if (!addRes.ok) throw new Error(`[Recipients] Gagal menyimpan kontak.`);

    const valRes = await fetch(window.API + "/campaign/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id })
    });
    if (!valRes.ok) throw new Error(`[Validate] Gagal memvalidasi data.`);

    const startRes = await fetch(window.API + "/campaign/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id })
    });
    if (!startRes.ok) throw new Error(`[Start] Gagal memulai proses blast.`);

    alert(mode === 'schedule' ? "Berhasil! Campaign dijadwalkan." : "Berhasil! Campaign sedang dikirim. 🚀");
    window.location.reload();

  } catch (err) {
    console.error("SEND ERROR:", err);
    alert("Gagal memproses campaign: \n" + (err.message || err.toString()));
    window.location.reload();
  }
}

async function campaignLoadList() {
  try {
    const activeCID = typeof CID !== 'undefined' ? CID : "";
    const res = await fetch(window.API + "/campaign/list?client_id=" + activeCID);
    if (!res.ok) throw new Error("Fetch failed");
    window.campaignRawList = await res.json() || [];
    applyFilter();
  } catch (err) { console.log("LOAD LIST ERROR:", err); }
}

function applyFilter() {
  const keyword = getEl("searchInput")?.value.toLowerCase() || "";
  window.campaignFilteredList = window.campaignRawList.filter(c => {
    const nameMatch = (c.name || "").toLowerCase().includes(keyword);
    const tmplMatch = (c.template_name || "").toLowerCase().includes(keyword);
    return nameMatch || tmplMatch;
  });
  window.campaignCurrentPage = 1; 
  renderTable();
}

function changeItemsPerPage() {
  window.campaignItemsPerPage = parseInt(getEl("itemsPerPage").value);
  window.campaignCurrentPage = 1;
  renderTable();
}

function goToPage(page) {
  window.campaignCurrentPage = page;
  renderTable();
}

// 🔥 FIX 3: Fungsi Pembuka Menu Titik Tiga
function toggleActionMenu(menuId) {
  document.querySelectorAll('[id^="menu-"]').forEach(el => {
    if(el.id !== menuId) el.classList.add('hidden');
  });
  const menu = document.getElementById(menuId);
  if(menu) menu.classList.toggle('hidden');
}

// 🔥 FIX 3: Fungsi Delete Campaign
async function deleteCampaign(id) {
  if (!confirm("⚠️ PERINGATAN: Yakin ingin menghapus campaign ini secara permanen? Seluruh data report akan hilang.")) return;

  try {
    const res = await fetch(window.API + `/campaign/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        campaign_id: id,
        actor_email: localStorage.getItem("email") // 🔥 TAMBAHKAN BARIS INI
      })
    });

    if (!res.ok) throw new Error("Gagal menghapus campaign.");
    alert("✅ Campaign berhasil dihapus!");
    campaignLoadList();
  } catch (err) {
    alert(err.message);
  }
}

// Tambahkan ini di bagian paling bawah campaign.js atau timpa fungsi renderTable-nya
function renderTable() {
  const tbody = getEl("campaignTable");
  if (!tbody) return;

  if (window.campaignFilteredList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center p-6 text-gray-500">Tidak ada data ditemukan.</td></tr>`;
    renderPaginationInfo(0);
    return;
  }

  const startIndex = (window.campaignCurrentPage - 1) * window.campaignItemsPerPage;
  const endIndex = startIndex + window.campaignItemsPerPage;
  const dataToRender = window.campaignFilteredList.slice(startIndex, endIndex);

  tbody.innerHTML = dataToRender.map(c => {
    let statusBadge = `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">On Queue</span>`;
    if (c.status === 'done') {
      statusBadge = `<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Published</span>`;
    } else if (c.status === 'scheduled') {
      let schDate = "-";
      if(c.schedule_time){
         const ms = parseInt(c.schedule_time);
         schDate = !isNaN(ms) ? new Date(ms).toLocaleString("id-ID") : new Date(c.schedule_time).toLocaleString("id-ID");
      }
      statusBadge = `<div class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold inline-block leading-tight">Scheduled<br><span class="font-normal text-[10px]">${schDate} WIB</span></div>`;
    } else if (c.status === 'blasting') {
      statusBadge = `<span class="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold animate-pulse">🚀 Blasting...</span>`;
    }

    let createdAtStr = "-";
    if (c.created_at) {
       const d = new Date(c.created_at);
       if (!isNaN(d)) createdAtStr = d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    }

    return `
      <tr class="hover:bg-blue-50 dark:hover:bg-gray-700 transition relative">
        <td class="p-3 font-semibold">${c.name || "-"}</td>
        <td class="p-3 text-xs font-bold text-gray-700 dark:text-gray-300">${c.template_name || "-"}</td>
        <td class="p-3 text-xs text-gray-400">${createdAtStr} WIB</td>
        <td class="p-3 text-center">${statusBadge}</td>
        <td class="p-3 text-center font-bold">${c.total_data || c.total || 0}</td>
        <td class="p-3 text-center">${c.total_sent || c.sent || 0}</td>
        <td class="p-3 text-center text-blue-500 font-bold">${c.total_delivered || c.delivered || 0}</td>
        <td class="p-3 text-center text-green-500 font-bold">${c.total_read || c.read || 0}</td>
        <td class="p-3 text-center text-red-500 font-bold">${c.total_failed || c.failed || 0}</td>
        <td class="p-3 text-center relative">
          <button onclick="toggleActionMenu('menu-${c.id}')" class="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white px-3 py-1 font-bold text-xl rounded">
             ⋮
          </button>
          
          <div id="menu-${c.id}" class="hidden absolute right-10 top-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 text-left overflow-hidden ring-1 ring-black ring-opacity-5">
             <div class="p-2 text-[10px] uppercase text-gray-400 font-bold border-b border-gray-100 dark:border-gray-700">Options</div>
             
             <button onclick="campaignReport('${c.id}')" class="flex items-center gap-2 w-full text-left p-3 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition">
                <span>📥</span> Download Report
             </button>
             
             <button onclick="deleteCampaign('${c.id}', '${c.status}')" class="flex items-center gap-2 w-full text-left p-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-t border-gray-100 dark:border-gray-700 transition">
                <span>🗑️</span> ${c.status === 'scheduled' || c.status === 'blasting' ? 'Cancel & Delete' : 'Delete Campaign'}
             </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  renderPaginationInfo(window.campaignFilteredList.length);
}

function renderPaginationInfo(totalItems) {
  const totalPages = Math.ceil(totalItems / window.campaignItemsPerPage);
  getEl("paginationInfo").innerText = `Showing ${totalItems === 0 ? 0 : ((window.campaignCurrentPage - 1) * window.campaignItemsPerPage) + 1} to ${Math.min(window.campaignCurrentPage * window.campaignItemsPerPage, totalItems)} of ${totalItems} entries`;

  let pageHtml = "";
  if (totalPages > 0) {
    pageHtml += `<button onclick="goToPage(${window.campaignCurrentPage - 1})" ${window.campaignCurrentPage === 1 ? 'disabled' : ''} class="px-2 py-1 border rounded bg-white dark:bg-gray-700 ${window.campaignCurrentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}">«</button>`;
    
    let startPage = Math.max(1, window.campaignCurrentPage - 2);
    let endPage = Math.min(totalPages, window.campaignCurrentPage + 2);

    if (startPage > 1) {
        pageHtml += `<button onclick="goToPage(1)" class="px-3 py-1 border rounded bg-white dark:bg-gray-700 hover:bg-gray-100">1</button>`;
        if (startPage > 2) pageHtml += `<span class="px-2 py-1 text-gray-500">...</span>`;
    }
    for (let i = startPage; i <= endPage; i++) {
        let activeClass = i === window.campaignCurrentPage ? "bg-blue-600 text-white font-bold" : "bg-white dark:bg-gray-700 hover:bg-gray-100";
        pageHtml += `<button onclick="goToPage(${i})" class="px-3 py-1 border rounded ${activeClass}">${i}</button>`;
    }
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageHtml += `<span class="px-2 py-1 text-gray-500">...</span>`;
        pageHtml += `<button onclick="goToPage(${totalPages})" class="px-3 py-1 border rounded bg-white dark:bg-gray-700 hover:bg-gray-100">${totalPages}</button>`;
    }
    pageHtml += `<button onclick="goToPage(${window.campaignCurrentPage + 1})" ${window.campaignCurrentPage === totalPages ? 'disabled' : ''} class="px-2 py-1 border rounded bg-white dark:bg-gray-700 ${window.campaignCurrentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}">»</button>`;
  }
  getEl("paginationControls").innerHTML = pageHtml;
}

async function campaignReport(id) {
  if (!id) return;
  const btn = event?.target;
  const originalText = btn ? btn.innerHTML : "Report";
  if (btn) { btn.innerHTML = "⏳ Download..."; btn.disabled = true; }

  try {
    const res = await fetch(window.API + `/campaign/report?campaign_id=${id}`);
    if (!res.ok) throw new Error("Gagal mengambil data report.");
    
    const data = await res.json();
    if (!data.success || !data.campaign) throw new Error("Format report tidak valid.");

    const campaign = data.campaign;
    const recipients = data.recipients || [];

    let headers = ["Created Campaign At", "Template Name", "No Hp Kontak", "Nama", "Sent Time", "Delivered Time", "Read Time", "Failed Time", "Note (jika failed)"];
    const ws_data = [headers];
    const createdAt = campaign.created_at ? new Date(campaign.created_at).toLocaleString("id-ID") : "-";
    const templateName = campaign.template_name || "-";

    recipients.forEach(r => {
      let sentTime = "-", deliveredTime = "-", readTime = "-", failedTime = "-";

      // 🔥 Tarik jamnya masing-masing secara real-time!
      if (r.sent_at) sentTime = new Date(r.sent_at).toLocaleString("id-ID");
      if (r.delivered_at) deliveredTime = new Date(r.delivered_at).toLocaleString("id-ID");
      if (r.read_at) readTime = new Date(r.read_at).toLocaleString("id-ID");

      // Khusus yang failed, ambil jam dari waktu dia gagal pas dikirim
      if (r.final_status === 'failed') {
         failedTime = sentTime;
         sentTime = "-"; // Hapus sent time kalau dia gagal kirim
      }

      ws_data.push([createdAt, templateName, r.phone || "-", r.name || "-", sentTime, deliveredTime, readTime, failedTime, r.error || "-"]);
    });

    if (typeof XLSX === 'undefined') throw new Error("Library XLSX hilang.");
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Report_Campaign_${campaign.name}.xlsx`);
  } catch (err) {
    alert("Gagal: " + err.message);
  } finally {
    if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // 🔥 FIX BUGS: Deteksi nama halaman dengan cara yang kebal terhadap Clean URL Cloudflare
  const path = window.location.pathname;
  if (path.includes("campaign") && !path.includes("template")) {
    campaignLoadTemplates();
    campaignLoadList();
  }
});
