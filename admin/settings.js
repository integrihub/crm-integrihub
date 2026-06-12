const API_BASE =  window.location.hostname.includes("staging") || 
            window.location.hostname.includes("pages.dev") || 
            window.location.hostname.includes("localhost") || 
            window.location.hostname.includes("127.0.0.1")
  ? "https://api-staging.crm.integrihub.my.id"
  : "https://api-crm.integrihub.my.id";

const CLIENT_ID = localStorage.getItem("client_id");

// 🔥 INISIALISASI SETTINGS
document.addEventListener("DOMContentLoaded", () => {
    console.log("Inisialisasi Halaman Settings Dimulai...");
    loadFlowsFromDB();
    loadRealTemplates();
    enableCanvasDrag(); // 🔥 Aktifkan fitur geser layar
});

// ==========================================
// SMART FLOW BUILDER & WA SIMULATOR (SPA MODE)
// ==========================================

// Variabel Global
let LIST_FLOWS = []; 
let CURRENT_FLOW_ID = null; 
let FLOW_DATA = []; 
let TEMPLATES = [];
// 🔥 Variabel Pagination
let flowCurrentPage = 1;
let itemsPerPage = 10;


// LOAD DARI BACKEND
async function loadFlowsFromDB() {
    try {
        const res = await fetch(`${API_BASE}/chatbot-rules?client_id=${CLIENT_ID}`);
        const rawData = await res.json();
        const data = Array.isArray(rawData) ? rawData : (rawData.results || rawData.data || []);

        LIST_FLOWS = data.map(f => ({...f, flow_json: f.interactive_json || "[]"}));
        
        // 🔥 SORTING: Urutkan ID terbesar (terbaru) di urutan paling atas
        LIST_FLOWS.sort((a, b) => b.id - a.id);
        
        renderListView();
    } catch(e) { console.error("Gagal load Flow", e); }
}

// ============================================================
// 🔥 MASTER SCANNER: Bongkar Tombol dari Meta & Balasan Cepat
// ============================================================

function extractButtonsAnywhere(obj) {
    let results = [];
    if (!obj) return results;

    // 1. Jika string JSON, bongkar dulu
    if (typeof obj === 'string') {
        try { 
            const parsed = JSON.parse(obj); 
            return extractButtonsAnywhere(parsed);
        } catch(e) { return []; }
    }

    if (Array.isArray(obj)) {
        obj.forEach(item => {
            // Jika array flat berisi string (Misal: ["1", "2", "3"])
            if (typeof item === 'string') results.push(item);
            else results = results.concat(extractButtonsAnywhere(item));
        });
    } else if (typeof obj === 'object') {
        // 2. Tangkap tombol Meta (Format: {type: 'QUICK_REPLY', text: '...'})
        if (obj.text && (obj.type === 'QUICK_REPLY' || obj.type === 'REPLY' || obj.type === 'button')) {
            results.push(obj.text);
        }

        // 3. Tangkap tombol CRM/Interactive (Format: {title: '...', id: '...'})
        if (obj.title) {
            results.push(obj.title);
        }

        // 4. Scan semua Key Berpotensi (Sangat Agresif)
        // Kita scan 'options', 'buttons', 'interactive_json' karena 'LAGI LAGI' pakai itu
        const targetKeys = ['buttons', 'rows', 'sections', 'items', 'options', 'action', 'components', 'interactive_json'];
        for (let key in obj) {
            if (targetKeys.includes(key.toLowerCase()) && obj[key]) {
                // Jika isi key adalah string JSON, bongkar lagi
                if (typeof obj[key] === 'string') {
                    results = results.concat(extractButtonsAnywhere(obj[key]));
                } 
                // Jika isi key adalah array
                else if (Array.isArray(obj[key])) {
                    obj[key].forEach(item => {
                        const txt = item.text || item.title || item.display_text || (item.reply ? item.reply.title : null);
                        if (txt) results.push(txt);
                        if (typeof item === 'object') results = results.concat(extractButtonsAnywhere(item));
                    });
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                results = results.concat(extractButtonsAnywhere(obj[key]));
            }
        }
    }
    return [...new Set(results)].filter(Boolean);
}

// ============================================================
// 📡 SYNC TEMPLATES: Narik data Asli & Map ke Struktur Canvas
// ============================================================
async function loadRealTemplates() {
    try {
        console.log("⏳ Sinkronisasi Data Riil IntegriHub...");

        const [resMeta, resCanned] = await Promise.all([
            fetch(`${API_BASE}/templates?client_id=${CLIENT_ID}`),
            fetch(`${API_BASE}/get-canned?client_id=${CLIENT_ID}`)
        ]);

        const metaArray = await resMeta.json();
        const cannedArray = await resCanned.json();

        TEMPLATES = [];

        // 1. PROSES META TEMPLATES (Mapping buttons_json Meta)
        metaArray.forEach(t => {
    // 🔥 FILTER: Hanya masukkan template yang APPROVED
    if (t.status && t.status.toUpperCase() !== 'APPROVED') return; 

    let btns = [];
    try {
        if (t.buttons_json && t.buttons_json !== "[]") {
            const parsed = JSON.parse(t.buttons_json);
            btns = parsed.map(b => b.text).filter(Boolean);
        }
    } catch(e) { console.error("Gagal parse buttons Meta:", t.name); }

    TEMPLATES.push({ 
        id: `meta_${t.id}`, 
        name: t.name, 
        type: "meta_template", 
        text: t.body || `[Meta] ${t.name}`, 
        buttons: btns 
    });
});

        // 2. PROSES BALASAN CEPAT (Mapping buttons_json & list_json CRM)
        cannedArray.forEach(c => {
            let btns = [];
            try {
                if (c.type === 'button' && c.buttons_json) {
                    // Struktur CRM Button: ["satu 1","dua 2","tiga 3"]
                    const parsed = JSON.parse(c.buttons_json);
                    btns = Array.isArray(parsed) ? parsed : [];
                } 
                else if (c.type === 'list' && c.list_json) {
                    // Struktur CRM List: [{"title":"1"},...]
                    const parsed = JSON.parse(c.list_json);
                    btns = parsed.map(item => item.title).filter(Boolean);
                }
                else if (c.type === 'flow' && c.flow_button_text) {
                    btns = [c.flow_button_text];
                }
                else if (c.type === 'cta' && c.cta_text) {
                    btns = [c.cta_text];
                }
            } catch(e) { console.error("Gagal parse buttons Canned:", c.title); }

            TEMPLATES.push({ 
                id: `canned_${c.id}`, 
                name: c.title, 
                type: "quick_reply", 
                text: c.message || `[CRM] ${c.title}`, 
                buttons: btns 
            });
        });

        console.log("✅ Data Berhasil Dipetakan!", TEMPLATES);

        // Render ulang canvas agar jika ada node yang sedang diedit, dropdown-nya terisi
        if (CURRENT_FLOW_ID) renderCanvas();

    } catch(e) {
        console.error("❌ Gagal Sinkronisasi:", e);
    }
}


// ================= 1. LIST VIEW (HALAMAN DAFTAR) =================
function renderListView() {
    document.getElementById("listView").classList.remove("hidden");
    document.getElementById("builderView").classList.add("hidden");

    const tbody = document.getElementById("chatbotTableBody");
    const paginationControls = document.getElementById("paginationControls");
    if (!tbody) return;

    // 🔥 AMBIL KATA KUNCI SEARCH
    const searchKeyword = document.getElementById("searchFlowInput")?.value.toLowerCase() || "";
    
    // 🔥 FILTER DATA BERDASARKAN SEARCH
    let filteredFlows = LIST_FLOWS.filter(f => f.keyword.toLowerCase().includes(searchKeyword));

    if (filteredFlows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-gray-500">Tidak ada Chatbot yang cocok/tersedia.</td></tr>`;
        if(paginationControls) paginationControls.innerHTML = "";
        return;
    }

    const totalPages = Math.ceil(filteredFlows.length / itemsPerPage);
    if (flowCurrentPage > totalPages) flowCurrentPage = totalPages;
    if (flowCurrentPage < 1) flowCurrentPage = 1;
    
    const startIdx = (flowCurrentPage - 1) * itemsPerPage;
    const paginatedItems = filteredFlows.slice(startIdx, startIdx + itemsPerPage);

    tbody.innerHTML = paginatedItems.map(f => {
        let isActive = (f.is_active == 1 || f.is_active == '1' || f.is_active === true);
        let toggleBg = isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600';
        let toggleDot = isActive ? 'translate-x-5' : 'translate-x-0';
        
        return `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition border-b dark:border-gray-700">
            <td class="p-4">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-gray-800 dark:text-gray-200 text-base">${f.keyword}</span>
                    <button onclick="renameFlow(${f.id})" class="text-[10px] bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded transition shadow-sm border dark:border-gray-600">✏️ Rename</button>
                </div>
                <div class="text-[10px] text-gray-500 mt-1">${f.is_exact_match ? '📌 Exact Match' : '🔍 Contains Match'}</div>
            </td>
            <td class="p-4 text-center">
                <button onclick="toggleFlowStatus(${f.id})" class="relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none ${toggleBg}">
                    <span class="inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${toggleDot} ml-1"></span>
                </button>
            </td>
            <td class="p-4 text-right">
                <button onclick="editFlow(${f.id})" class="text-xs bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 mr-2 font-bold transition shadow-sm">⚙️ Edit Canvas</button>
                <button onclick="deleteFlow(${f.id})" class="text-xs bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 font-bold transition shadow-sm">🗑️ Hapus</button>
            </td>
        </tr>`;
    }).join('');

    if(paginationControls) {
        paginationControls.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="text-sm text-gray-600 dark:text-gray-400 font-medium">Halaman ${flowCurrentPage} dari ${totalPages} (Total: ${filteredFlows.length})</span>
                <select onchange="changeItemsPerPage(this.value)" class="text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500 transition">
                    <option value="10" ${itemsPerPage == 10 ? 'selected' : ''}>10 Baris</option>
                    <option value="25" ${itemsPerPage == 25 ? 'selected' : ''}>25 Baris</option>
                    <option value="50" ${itemsPerPage == 50 ? 'selected' : ''}>50 Baris</option>
                </select>
            </div>
            <div class="flex gap-2">
                <button onclick="changeFlowPage(-1)" class="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 font-bold" ${flowCurrentPage === 1 ? 'disabled' : ''}>← Prev</button>
                <button onclick="changeFlowPage(1)" class="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 font-bold" ${flowCurrentPage === totalPages ? 'disabled' : ''}>Next →</button>
            </div>
        `;
    }
}

// 🔥 Fungsi Ganti Jumlah Baris Per Halaman
function changeItemsPerPage(val) {
    itemsPerPage = parseInt(val);
    flowCurrentPage = 1; // Kembali ke halaman 1 setiap ganti filter
    renderListView();
}

// 🔥 Fungsi Ganti Halaman
function changeFlowPage(direction) {
    flowCurrentPage += direction;
    renderListView();
}

function createNewFlow() {
    document.getElementById("newFlowName").value = "";
    document.getElementById("newFlowModal").classList.remove("hidden");
}

async function proceedCreateFlow() {
    const name = document.getElementById("newFlowName").value.trim();
    if(!name) return alert("Nama Flow/Keyword wajib diisi!");

    try {
        await fetch(`${API_BASE}/save-chatbot-rule`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                client_id: CLIENT_ID, 
                keyword: name, 
                reply_type: "flow", 
                reply_text: "Smart Canvas Flow", 
                interactive_json: "[]",
                is_exact_match: 0, 
                is_active: 1,
                actor_email: localStorage.getItem("email")
            })
        });
        
        // Sembunyikan modal
        document.getElementById("newFlowModal").classList.add("hidden");
        document.getElementById("newFlowName").value = "";
        
        // 🔥 Tunggu data terbaru diload dari DB
        await loadFlowsFromDB();
        
        // 🔥 Cari ID dari flow yang baru saja dibuat (berdasarkan keyword) dan langsung edit
        const newFlow = LIST_FLOWS.find(f => f.keyword === name);
        if(newFlow) {
            editFlow(newFlow.id);
        }
        
    } catch(e) { alert("Gagal membuat flow."); }
}

// 🔥 FUNGSI BARU: Untuk klik Toggle Aktif/Nonaktif
async function toggleFlowStatus(id) {
    const flowObj = LIST_FLOWS.find(f => f.id === id);
    if(!flowObj) return;

    // Balik statusnya (1 ke 0, 0 ke 1)
    let currentStatus = (flowObj.is_active == 1 || flowObj.is_active == '1' || flowObj.is_active === true);
    let newStatus = currentStatus ? 0 : 1;

    // Update di UI lokal langsung biar cepet (nggak usah loading)
    flowObj.is_active = newStatus;
    renderListView(); 

    // Tembak API update
    try {
        await fetch(`${API_BASE}/save-chatbot-rule`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                id: flowObj.id,
                client_id: CLIENT_ID, 
                keyword: flowObj.keyword, 
                reply_type: flowObj.reply_type, 
                reply_text: flowObj.reply_text, 
                interactive_json: flowObj.interactive_json,
                is_exact_match: flowObj.is_exact_match,
                is_active: newStatus, // Kirim status baru
                actor_email: localStorage.getItem("email")
            })
        });
    } catch(e) {
        alert("Gagal mengubah status!");
        flowObj.is_active = currentStatus; // Kalo gagal, balikin statenya
        renderListView();
    }
}

async function deleteFlow(id) {
    if(!confirm("Yakin ingin menghapus seluruh alur chatbot ini?")) return;
    try {
        const emailAdmin = localStorage.getItem("email") || ""; // 🔥 TANGKAP EMAIL
        await fetch(`${API_BASE}/delete-chatbot-rule?id=${id}&actor_email=${emailAdmin}`, { method: "POST" }); // 🔥 SELIPKAN DI SINI
        loadFlowsFromDB();
    } catch(e) { alert("Gagal menghapus."); }
}


// 🔥 FUNGSI RENAME DENGAN UI MODAL KEREN
function renameFlow(id) {
    const flowObj = LIST_FLOWS.find(f => f.id === id);
    if(!flowObj) return;

    // Isi modal dengan data saat ini
    document.getElementById("renameFlowId").value = id;
    document.getElementById("renameFlowName").value = flowObj.keyword;
    
    // Tampilkan Modal
    document.getElementById("renameFlowModal").classList.remove("hidden");
    document.getElementById("renameFlowName").focus();
}

function closeRenameModal() {
    document.getElementById("renameFlowModal").classList.add("hidden");
}

async function proceedRenameFlow() {
    const id = parseInt(document.getElementById("renameFlowId").value);
    const newName = document.getElementById("renameFlowName").value.trim();
    const flowObj = LIST_FLOWS.find(f => f.id === id);

    if(!flowObj || !newName || newName === flowObj.keyword) {
        return closeRenameModal();
    }

    const originalName = flowObj.keyword;
    flowObj.keyword = newName;
    closeRenameModal();
    renderListView(); // Langsung update di UI biar terasa instan

    try {
        await fetch(`${API_BASE}/save-chatbot-rule`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                id: flowObj.id,
                client_id: CLIENT_ID, 
                keyword: flowObj.keyword, 
                reply_type: flowObj.reply_type, 
                reply_text: flowObj.reply_text, 
                interactive_json: flowObj.interactive_json, 
                is_exact_match: flowObj.is_exact_match,
                is_active: flowObj.is_active,
                actor_email: localStorage.getItem("email")
            })
        });
    } catch(e) {
        alert("❌ Gagal menyimpan nama baru.");
        flowObj.keyword = originalName; // Rollback kalau error
        renderListView();
    }
}

function backToList() {
    const flowObj = LIST_FLOWS.find(f => f.id === CURRENT_FLOW_ID);
    if(flowObj) flowObj.flow_json = JSON.stringify(FLOW_DATA);
    renderListView();
}

// ================= 2. CANVAS BUILDER =================
function editFlow(id) {
    const flowObj = LIST_FLOWS.find(f => f.id === id);
    if(!flowObj) return;

    CURRENT_FLOW_ID = id;
    document.getElementById("builderTitle").innerHTML = `🛠️ Canvas: <span class="text-blue-600 dark:text-blue-400">${flowObj.keyword}</span>`;

    // 🔥 Ceklik otomatis checkbox jika datanya exact match
    const isExact = (flowObj.is_exact_match == 1 || flowObj.is_exact_match == '1' || flowObj.is_exact_match === true);
    const canvasCheckbox = document.getElementById("canvasExactMatch");
    if(canvasCheckbox) canvasCheckbox.checked = isExact;

    try { FLOW_DATA = JSON.parse(flowObj.flow_json || "[]"); } 
    catch(e) { FLOW_DATA = []; }

    document.getElementById("listView").classList.add("hidden");
    document.getElementById("builderView").classList.remove("hidden");
    document.getElementById("waScreen").innerHTML = `<div class="text-center my-2"><span class="bg-[#e1f3fb] dark:bg-[#182229] text-[#4a4a4a] dark:text-gray-300 text-[10px] px-2 py-1 rounded-lg border dark:border-gray-700 shadow-sm">Simulator Siap - Ketik sesuatu</span></div>`;

    renderCanvas();

    // 🔥 FIX: Arahkan titik tengah canvas ke area awal node secara otomatis (Mulus)
    setTimeout(() => {
        const canvasEl = document.getElementById('flowCanvas');
        if(canvasEl) {
            canvasEl.scrollTo({ top: 0, left: 50, behavior: 'smooth' });
        }
    }, 100);
}


async function saveCurrentFlow() {
    const btn = event.target;
    btn.innerText = "⏳ Menyimpan...";

    const flowObj = LIST_FLOWS.find(f => f.id === CURRENT_FLOW_ID);
    if(flowObj) {
        flowObj.flow_json = JSON.stringify(FLOW_DATA);
        
        // 🔥 Baca status checkbox dari canvas
        const isExact = document.getElementById("canvasExactMatch").checked;
        flowObj.is_exact_match = isExact ? 1 : 0; // Update state lokal biar tabel lgsg berubah

        try {
            await fetch(`${API_BASE}/save-chatbot-rule`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    id: CURRENT_FLOW_ID,
                    client_id: CLIENT_ID, 
                    keyword: flowObj.keyword, 
                    reply_type: "flow", 
                    reply_text: "Smart Canvas Flow", 
                    interactive_json: flowObj.flow_json, 
                    is_exact_match: flowObj.is_exact_match, // Kirim status yang bener!
                    is_active: flowObj.is_active,
                    actor_email: localStorage.getItem("email")
                })
            });
            btn.innerText = "✅ Tersimpan!";
            setTimeout(() => btn.innerHTML = "💾 Simpan Alur", 2000);
            
            // Biar List View update saat di-back
            renderListView(); 
        } catch(e) {
            alert("❌ Gagal menyimpan.");
            btn.innerHTML = "💾 Simpan Alur";
        }
    }
}

// --- MESIN PENGGAMBAR CANVAS ---
function addRootNode(type) {
    FLOW_DATA.push({
        id: "node_" + Date.now(),
        type: type, 
        keyword: type === 'keyword' ? "halo, hai" : "WELCOME_MSG",
        template_name: "",
        children: []
    });
    renderCanvas();
}

function deleteNode(nodeId, parentArray = FLOW_DATA) {
    for (let i = 0; i < parentArray.length; i++) {
        if (parentArray[i].id === nodeId) { parentArray.splice(i, 1); return true; }
        if (parentArray[i].children && deleteNode(nodeId, parentArray[i].children)) return true;
    }
}

function updateNodeTemplate(nodeId, templateName, parentArray = FLOW_DATA) {
    for (let i = 0; i < parentArray.length; i++) {
        if (parentArray[i].id === nodeId) {
            const tpl = TEMPLATES.find(t => t.name === templateName);
            
            // Validasi: Jika diketik nama ngasal yang ga ada di template, batalkan
            if (templateName !== "" && !tpl) {
                alert("⚠️ Template tidak ditemukan. Silakan pilih dari daftar.");
                renderCanvas();
                return false; 
            }

            parentArray[i].template_name = templateName;
            if (tpl && tpl.buttons && tpl.buttons.length > 0) {
                parentArray[i].children = tpl.buttons.map(btnText => ({
                    id: "node_" + Date.now() + Math.floor(Math.random()*100),
                    type: "button_trigger", keyword: btnText, template_name: "", children: []
                }));
            } else { parentArray[i].children = []; }
            return true;
        }
        if (parentArray[i].children && updateNodeTemplate(nodeId, templateName, parentArray[i].children)) return true;
    }
}

function updateNodeKeyword(nodeId, newKeyword, parentArray = FLOW_DATA) {
    for (let i = 0; i < parentArray.length; i++) {
        if (parentArray[i].id === nodeId) { parentArray[i].keyword = newKeyword; return true; }
        if (parentArray[i].children && updateNodeKeyword(nodeId, newKeyword, parentArray[i].children)) return true;
    }
}

function renderCanvas() {
    const wrapper = document.getElementById("flowWrapper");
    
    // 🔥 FIX PENTING: Paksa area dalam Canvas menjadi sangat besar (3000px) agar bisa di-drag bebas
    wrapper.style.minWidth = "3000px";
    wrapper.style.minHeight = "3000px";
    wrapper.style.padding = "50px";
    
    if (FLOW_DATA.length === 0) {
        wrapper.innerHTML = `<div class="text-center text-gray-400 dark:text-gray-500 mt-32 border-2 border-dashed border-gray-300 dark:border-gray-700 p-10 rounded-xl w-96 mx-auto bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">Belum ada node alur.<br><span class="text-xs">Klik tombol <b>+ Sesi 24 Jam</b> atau <b>+ Kata Kunci</b> di pojok kanan atas.</span></div>`;
        return;
    }
    
    let html = "";
    FLOW_DATA.forEach(node => html += renderNodeRecursive(node, true));
    wrapper.innerHTML = html;
}

// 🔥 GANTI renderNodeRecursive PENUH DENGAN INI
function renderNodeRecursive(node, isRoot = false) {
    // Bangun list HTML untuk Dropdown Custom
    let optionsHtml = '';
    TEMPLATES.forEach(t => {
        optionsHtml += `<div onclick="selectTemplateForNode('${node.id}', '${t.name}')" class="px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-b dark:border-gray-700 last:border-b-0 transition">[${t.type === 'meta_template' ? 'Meta' : 'CRM'}] ${t.name}</div>`;
    });

    let boxHeader = "";
    if (node.type === 'welcome') boxHeader = `<div class="bg-indigo-500 dark:bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-t-lg shadow-sm border-b border-indigo-600 flex items-center gap-1">⏱️ Sesi 24 Jam (Welcome)</div>`;
    else if (node.type === 'keyword') boxHeader = `<div class="bg-green-500 dark:bg-green-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-t-lg shadow-sm border-b border-green-600 flex items-center gap-1">📥 Jika Ketik: <input type="text" value="${node.keyword}" onchange="updateNodeKeyword('${node.id}', this.value)" class="bg-black/20 focus:bg-black/40 border border-transparent focus:border-white/50 px-1 py-0.5 rounded w-64 outline-none text-white transition"></div>`;
    else if (node.type === 'button_trigger') boxHeader = `<div class="bg-blue-500 dark:bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-t-lg shadow-sm border-b border-blue-600 flex items-center gap-1">🔘 Jika Klik: ${node.keyword}</div>`;

    // UI Custom Searchable Dropdown
    // 🔥 FIX: Tambahkan 'focus-within:z-[999]' dan 'hover:z-[999]' agar selalu di atas
    let html = `<div class="flow-node relative focus-within:z-[999] hover:z-[999] ${isRoot ? 'mb-6' : ''}">
        <div class="w-64 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg z-10 relative group transition-transform hover:-translate-y-0.5 focus-within:z-[999] hover:z-[999]">
            ${boxHeader}
            <div class="p-4 relative">
                
                <div class="relative w-full">
                    <input type="text" id="searchInput_${node.id}" value="${node.template_name}" 
                           onkeyup="filterNodeDropdown('${node.id}', this.value)" 
                           onfocus="showNodeDropdown('${node.id}')" 
                           onclick="this.select()"
                           placeholder="🔍 Ketik nama template..." autocomplete="off" 
                           class="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded outline-none bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:border-blue-500 transition pr-8 cursor-text">
                    <div class="absolute right-2 top-2 text-[10px] text-gray-400 pointer-events-none">▼</div>
                    
                    <div id="dropdown_${node.id}" class="hidden absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto text-left">
                        ${optionsHtml}
                    </div>
                </div>

            </div>
            <button onclick="deleteNode('${node.id}'); renderCanvas();" class="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition shadow-md flex items-center justify-center">✕</button>
        </div>`;

    if (node.children && node.children.length > 0) {
        html += `<div class="flow-children">`;
        node.children.forEach(child => html += `<div class="flow-child">${renderNodeRecursive(child)}</div>`);
        html += `</div>`;
    }
    html += `</div>`; return html;
}

// ================= 3. WA SIMULATOR =================
function sendWaSim(simulatedText = null) {
    const inputEl = document.getElementById("waInput");
    const text = simulatedText || inputEl.value.trim();
    if (!text) return;

    // Kotak Pesan User
    document.getElementById("waScreen").innerHTML += `<div class="flex justify-end mb-1"><div class="bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-800 dark:text-gray-100 text-sm px-3 py-2 rounded-lg rounded-tr-none max-w-[80%] shadow-sm">${text}</div></div>`;
    inputEl.value = ""; 
    document.getElementById("waScreen").scrollTop = document.getElementById("waScreen").scrollHeight;

    // Kasih jeda 0.6 detik
    setTimeout(() => processSimulatorBot(text.toLowerCase()), 600);
}

function processSimulatorBot(inputTrigger) {
    let matchedTemplate = null;

    function searchNode(nodes) {
        for(let n of nodes) {
            if (n.type === 'keyword') {
                const keys = n.keyword.split(',').map(k=>k.trim().toLowerCase());
                if(keys.includes(inputTrigger) || keys.some(k => inputTrigger.includes(k))) return n.template_name;
            }
            if (n.type === 'button_trigger' && n.keyword.toLowerCase() === inputTrigger) return n.template_name;
            if (n.children) { let found = searchNode(n.children); if (found) return found; }
        }
        return null;
    }

    matchedTemplate = searchNode(FLOW_DATA);

    if (!matchedTemplate && FLOW_DATA.some(n => n.type === 'welcome')) {
        matchedTemplate = FLOW_DATA.find(n => n.type === 'welcome').template_name;
    }

    // Render Balasan Bot di Simulator
    if (matchedTemplate) {
        const tpl = TEMPLATES.find(t => t.name === matchedTemplate);
        if (tpl) {
            let btnsHtml = "";
            if(tpl.buttons && tpl.buttons.length > 0) {
                btnsHtml = `<div class="mt-2 border-t dark:border-gray-600 pt-2 flex flex-col gap-1.5">` + 
                    tpl.buttons.map(b => `<button onclick="sendWaSim('${b}')" class="text-[#00a884] dark:text-[#00a884] font-bold text-sm bg-white dark:bg-[#202c33] hover:bg-gray-50 dark:hover:bg-[#2a3942] py-2 rounded-md shadow-sm transition border dark:border-gray-600">${b}</button>`).join('') + 
                    `</div>`;
            }

            document.getElementById("waScreen").innerHTML += `<div class="flex justify-start mb-1"><div class="bg-white dark:bg-[#202c33] text-gray-800 dark:text-gray-100 text-sm p-3 rounded-lg rounded-tl-none max-w-[85%] shadow-sm border border-gray-100 dark:border-gray-700"><div class="whitespace-pre-line">${tpl.text}</div>${btnsHtml}</div></div>`;
            document.getElementById("waScreen").scrollTop = document.getElementById("waScreen").scrollHeight;
        }
    }
}

// ================= CUSTOM DROPDOWN HELPERS =================
function showNodeDropdown(nodeId) {
    // Sembunyikan dropdown lain yang sedang terbuka
    document.querySelectorAll('[id^="dropdown_"]').forEach(el => el.classList.add('hidden'));
    
    const drop = document.getElementById(`dropdown_${nodeId}`);
    if (drop) {
        drop.classList.remove('hidden');
        filterNodeDropdown(nodeId, ""); // Reset filter saat baru dibuka
    }
}

function filterNodeDropdown(nodeId, keyword) {
    const drop = document.getElementById(`dropdown_${nodeId}`);
    if (!drop) return;
    
    const items = drop.querySelectorAll('div');
    const lowerKeyword = keyword.toLowerCase();
    
    items.forEach(item => {
        if (item.innerText.toLowerCase().includes(lowerKeyword)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function selectTemplateForNode(nodeId, templateName) {
    document.getElementById(`dropdown_${nodeId}`).classList.add('hidden'); // Tutup pop-up
    updateNodeTemplate(nodeId, templateName); // Panggil fungsi update lama
    renderCanvas(); // Render ulang agar UI merekam datanya dan panah ke button terbentuk
}

// Tutup dropdown jika user klik di sembarang tempat di luar kotak
document.addEventListener('click', function(event) {
    if (!event.target.closest('[id^="searchInput_"]') && !event.target.closest('[id^="dropdown_"]')) {
        document.querySelectorAll('[id^="dropdown_"]').forEach(el => el.classList.add('hidden'));
    }
});

// ============================================================
// 🔥 FITUR DRAG TO PAN (GESER LAYAR CANVAS)
// ============================================================
function enableCanvasDrag() {
    const slider = document.getElementById('flowCanvas');
    if (!slider) return;

    let isDown = false;
    let startX, startY, scrollLeft, scrollTop;

    slider.addEventListener('mousedown', (e) => {
        // Cegah layar tergeser jika Admin sedang nge-klik text input, tombol, atau dropdown
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.flow-node .w-64')) return;
        
        isDown = true;
        slider.classList.add('cursor-grabbing');
        startX = e.pageX - slider.offsetLeft;
        startY = e.pageY - slider.offsetTop;
        scrollLeft = slider.scrollLeft;
        scrollTop = slider.scrollTop;
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('cursor-grabbing');
    });

    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('cursor-grabbing');
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const y = e.pageY - slider.offsetTop;
        const walkX = (x - startX) * 1.5; // Kecepatan geser horizontal
        const walkY = (y - startY) * 1.5; // Kecepatan geser vertikal
        slider.scrollLeft = scrollLeft - walkX;
        slider.scrollTop = scrollTop - walkY;
    });
}
