// ================= STATE QUICK BLAST =================
let isBlastMode = false;
let selectedBlast = []; 
let currentBlastConfig = { reqHeaderText: false, reqMedia: false, bodyParamsCount: 0, reqButton: false };

function toggleBlastMode() {
    isBlastMode = !isBlastMode;
    selectedBlast = []; 
    
    const btn = document.getElementById("btnToggleBlast");
    const selectAllWrapper = document.getElementById("blastSelectAllWrapper");
    
    if (isBlastMode) {
        btn.innerHTML = "❌ Matikan Mode Blast";
        btn.classList.replace("bg-gray-100", "bg-red-100");
        btn.classList.replace("text-gray-700", "text-red-700");
        if(selectAllWrapper) selectAllWrapper.classList.remove("hidden");
    } else {
        btn.innerHTML = "📢 Aktifkan Mode Quick Blast";
        btn.classList.replace("bg-red-100", "bg-gray-100");
        btn.classList.replace("text-red-700", "text-gray-700");
        document.getElementById("blastFloatingPanel").classList.add("hidden");
        if(selectAllWrapper) {
            selectAllWrapper.classList.add("hidden");
            document.getElementById("checkAllBlast").checked = false;
        }
    }
    if(typeof renderChatListUI === "function") renderChatListUI(); 
}

// 🔥 FUNGSI BARU: SELECT ALL SESUAI FILTER
function toggleSelectAllBlast(isChecked) {
    let list = Object.values(processedChatMap);
    
    // Logika filter (disamakan dengan app.js)
    list = list.filter(c => {
        if (activeChatFilter === 'resolved') return c.is_closed;
        if (c.is_closed) return false; 
        if (activeChatFilter === 'unassigned') return c.is_unassigned;
        if (activeChatFilter === 'unread') return c.is_unread;
        return true;
    });

    if (chatSearchQuery) {
        list = list.filter(c => c.name.toLowerCase().includes(chatSearchQuery) || c.number.includes(chatSearchQuery));
    }

    const responderFilter = document.getElementById("filterResponder")?.value || "all";
    if (responderFilter !== "all") {
        list = list.filter(c => {
            if (responderFilter === "human") return c.assigned_to && c.assigned_to !== '🤖 Chatbot';
            if (responderFilter === "bot") return c.assigned_to === '🤖 Chatbot';
            return true;
        });
    }

    // Eksekusi Check/Uncheck
    list.forEach(c => {
        if (isChecked) {
            if (!selectedBlast.some(x => x.number === c.number)) selectedBlast.push({ number: c.number, name: c.name });
        } else {
            selectedBlast = selectedBlast.filter(x => x.number !== c.number);
        }
    });

    handleSelectBlast(null, null, null); // Paksa trigger UI floating panel
    if(typeof renderChatListUI === "function") renderChatListUI();
}

function handleSelectBlast(num, name, isChecked) {
    if (num) {
        if (isChecked) {
            if (!selectedBlast.some(x => x.number === num)) selectedBlast.push({ number: num, name: name });
        } else {
            selectedBlast = selectedBlast.filter(x => x.number !== num);
            document.getElementById("checkAllBlast").checked = false; // Lepas centang select all jika ada 1 yg di-uncheck
        }
    }
    
    const panel = document.getElementById("blastFloatingPanel");
    const countText = document.getElementById("blastCountText");
    
    if (selectedBlast.length > 0) {
        panel.classList.remove("hidden");
        panel.classList.add("flex");
        countText.innerText = `${selectedBlast.length} Kontak Terpilih`;
    } else {
        panel.classList.add("hidden");
        panel.classList.remove("flex");
    }
    
    if(typeof renderChatListUI === "function" && num) renderChatListUI();
}

function openBlastModal() {
    const modal = document.getElementById("blastModal");
    const select = document.getElementById("blastTemplateSelect");
    
    const validTemplates = allTemplates.filter(t => t.status && t.status.toUpperCase() === "APPROVED");
    select.innerHTML = '<option value="">-- Pilih Template Approved --</option>' + 
        validTemplates.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    
    document.getElementById("blastTableWrapper").classList.add("hidden");
    document.getElementById("blastProgressWrapper").classList.add("hidden");
    document.getElementById("blastInfoAlert").classList.remove("hidden");
    document.getElementById("btnSendBlast").classList.add("hidden");
    document.getElementById("blastPreviewCol").classList.add("hidden");
    
    modal.classList.remove("hidden");
    setTimeout(() => {
        modal.classList.remove("opacity-0");
        modal.querySelector('div').classList.remove("scale-95");
    }, 10);
}

function closeBlastModal() {
    const modal = document.getElementById("blastModal");
    modal.classList.add("opacity-0");
    modal.querySelector('div').classList.add("scale-95");
    setTimeout(() => modal.classList.add("hidden"), 300);
}

// 🔥 FUNGSI BARU: SEARCH TEMPLATE DI DROPDOWN
function filterBlastTemplates() {
    const query = document.getElementById("searchBlastTemplate").value.toLowerCase();
    const select = document.getElementById("blastTemplateSelect");
    const options = select.options;
    
    let hasResult = false;
    for(let i = 1; i < options.length; i++) {
        const text = options[i].text.toLowerCase();
        if (text.includes(query)) {
            options[i].style.display = "";
            hasResult = true;
        } else {
            options[i].style.display = "none";
        }
    }
    // Auto select jika hanya sisa 1 hasil (UX Enhancement)
    if(hasResult && query !== "") {
        select.value = ""; 
    }
}

// 🔥 FUNGSI REVISI BESAR: DETEKSI SEMUA PARAMETER DAN RENDER PREVIEW
function renderBlastTable() {
    const tplId = document.getElementById("blastTemplateSelect").value;
    if (!tplId) {
        document.getElementById("blastTableWrapper").classList.add("hidden");
        document.getElementById("blastInfoAlert").classList.remove("hidden");
        document.getElementById("btnSendBlast").classList.add("hidden");
        document.getElementById("blastPreviewCol").classList.add("hidden");
        return;
    }

    const tpl = allTemplates.find(t => String(t.id) === String(tplId));
    document.getElementById("blastInfoAlert").classList.add("hidden");
    document.getElementById("blastTableWrapper").classList.remove("hidden");
    document.getElementById("btnSendBlast").classList.remove("hidden");
    document.getElementById("blastPreviewCol").classList.remove("hidden");

    // Tampilkan Preview Template (Menggunakan UI renderTemplatePreview dari app.js)
    if(typeof renderTemplatePreview === "function") {
        const previewTargetOriginal = document.getElementById("previewBox");
        // Kita timpa ID sementara agar fungsi renderTemplatePreview nulis ke dalam modal blast
        const blastPreviewBox = document.getElementById("blastTemplatePreviewBox");
        blastPreviewBox.id = "previewBox"; 
        renderTemplatePreview(tpl, "modal");
        blastPreviewBox.id = "blastTemplatePreviewBox"; // Kembalikan ID-nya
    }

    // --- ANALISA KEBUTUHAN PARAMETER TEMPLATE ---
    currentBlastConfig = { reqHeaderText: false, reqMedia: false, bodyParamsCount: 0, reqButton: false };
    
    // 1. Cek Header
    if (tpl.header_type === 'text' && (tpl.header_value || "").includes("{{1}}")) {
        currentBlastConfig.reqHeaderText = true;
    } else if (['image', 'video', 'document'].includes(tpl.header_type)) {
        currentBlastConfig.reqMedia = true;
    }

    // 2. Cek Body
    const bodyStr = tpl.body_text || tpl.body || "";
    const matchParams = bodyStr.match(/\{\{\d+\}\}/g) || [];
    currentBlastConfig.bodyParamsCount = new Set(matchParams).size;

    // 3. Cek Button URL Dynamic
    let dbBtns = [];
    try { dbBtns = JSON.parse(tpl.buttons_json || tpl.buttons || "[]"); } catch(e){}
    if (dbBtns.some(b => b.type === "url" && (b.value || b.url || "").includes("{{1}}"))) {
        currentBlastConfig.reqButton = true;
    }

    // --- RAKIT TABEL ---
    let thHTML = `<th class="p-3 whitespace-nowrap w-[50px]">No</th>
                  <th class="p-3 whitespace-nowrap min-w-[150px]">Nama Kontak</th>`;
                  
    // Header Kolom
    if (currentBlastConfig.reqMedia) thHTML += createColHeader('media_url', '🔗 Media/Doc URL');
    if (currentBlastConfig.reqHeaderText) thHTML += createColHeader('header_text', '📝 Header {{1}}');
    for (let i = 1; i <= currentBlastConfig.bodyParamsCount; i++) {
        thHTML += createColHeader(`body_${i}`, `💬 Body {{${i}}}`);
    }
    if (currentBlastConfig.reqButton) thHTML += createColHeader('button_cta', '🌐 URL CTA {{1}}');

    // Body Kolom
    let trHTML = selectedBlast.map((u, rowIndex) => {
        let tdHTML = `<td class="p-3 border-r dark:border-gray-700 font-mono text-xs text-gray-400">${rowIndex + 1}</td>
                      <td class="p-3 border-r dark:border-gray-700 font-semibold text-sm">
                          ${u.name}<br><span class="text-xs text-gray-400 font-normal">${u.number}</span>
                      </td>`;
            
        if (currentBlastConfig.reqMedia) {
            tdHTML += createInputCell(rowIndex, 'media_url', tpl.header_value || "", "URL Media dinamis...");
        }
        if (currentBlastConfig.reqHeaderText) {
            tdHTML += createInputCell(rowIndex, 'header_text', u.name, "Header param...");
        }
        for (let i = 1; i <= currentBlastConfig.bodyParamsCount; i++) {
            let defaultVal = (i === 1) ? u.name : ""; 
            tdHTML += createInputCell(rowIndex, `body_${i}`, defaultVal, `Body {{${i}}}...`);
        }
        if (currentBlastConfig.reqButton) {
            tdHTML += createInputCell(rowIndex, 'button_cta', "", "Akhiran Link...");
        }

        return `<tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">${tdHTML}</tr>`;
    }).join('');

    document.getElementById("blastTableHead").innerHTML = thHTML;
    document.getElementById("blastTableBody").innerHTML = trHTML;
}

function createColHeader(key, label) {
    return `<th class="p-3 min-w-[200px]">
                <div class="flex items-center justify-between">
                    <span>${label}</span>
                    <button onclick="applyBlastParamToAll('${key}')" class="text-[10px] bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white px-2 py-1 rounded transition border border-blue-200">
                        ⚡ Isi Semua
                    </button>
                </div>
            </th>`;
}

function createInputCell(rowIndex, key, defaultVal, placeholder) {
    return `<td class="p-2 border-r dark:border-gray-700">
                <input type="text" id="blast_${key}_${rowIndex}" value="${defaultVal}" placeholder="${placeholder}" class="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-2 rounded text-sm focus:border-green-500 outline-none transition">
            </td>`;
}

function applyBlastParamToAll(key) {
    const firstVal = document.getElementById(`blast_${key}_0`).value;
    for (let i = 1; i < selectedBlast.length; i++) {
        document.getElementById(`blast_${key}_${i}`).value = firstVal;
    }
    if(typeof showModernAlert === "function") showModernAlert("Sukses", `Kolom ${key} berhasil diterapkan ke semua kontak!`, "success");
}

async function executeQuickBlast() {
    const tplId = document.getElementById("blastTemplateSelect").value;
    if (!tplId) return alert("Pilih template terlebih dahulu!");

    // Susun Payload Dinamis
    const blastPayload = selectedBlast.map((u, rowIndex) => {
        let payload = { number: u.number, name: u.name };
        
        if (currentBlastConfig.reqMedia) payload.media_url = document.getElementById(`blast_media_url_${rowIndex}`).value;
        if (currentBlastConfig.reqHeaderText) payload.header_param = document.getElementById(`blast_header_text_${rowIndex}`).value;
        if (currentBlastConfig.reqButton) payload.button_param = document.getElementById(`blast_button_cta_${rowIndex}`).value;
        
        let bodyParams = [];
        for (let i = 1; i <= currentBlastConfig.bodyParamsCount; i++) {
            bodyParams.push(document.getElementById(`blast_body_${i}_${rowIndex}`).value);
        }
        if (bodyParams.length > 0) payload.body_params = bodyParams;

        return payload;
    });

    const finalJSON = {
        client_id: typeof CID !== "undefined" ? CID : localStorage.getItem("client_id"),
        template_id: tplId,
        targets: blastPayload
    };

    console.log("🚀 MENGIRIM KE BACKEND:", finalJSON);

    document.getElementById("btnSendBlast").disabled = true;
    document.getElementById("blastTableWrapper").classList.add("opacity-50", "pointer-events-none");
    document.getElementById("blastProgressWrapper").classList.remove("hidden");
    document.getElementById("blastProgressBar").style.width = "50%";
    document.getElementById("blastProgressText").innerText = "Mengirim ke server...";

    try {
        let API_URL = "https://api-crm.integrihub.my.id"; 
        if (typeof BASE_URL !== "undefined") API_URL = BASE_URL;
        else if (typeof API_BASE_URL !== "undefined") API_URL = API_BASE_URL;
        else {
            const hostname = window.location.hostname;
            if (hostname.includes("staging")) API_URL = "https://api-staging.crm.integrihub.my.id";
            else if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) API_URL = "http://localhost:8787";
        }

        const endpoint = `${API_URL}/api/blast`;
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", "client-id": finalJSON.client_id },
            body: JSON.stringify(finalJSON)
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById("blastProgressBar").style.width = "100%";
            document.getElementById("blastProgressText").innerText = "100% - Sukses Masuk Antrean!";
            
            if (typeof showModernAlert === "function") showModernAlert("Blast Dijalankan!", "Sistem sedang mengirim pesan di background.", "success");
            else alert("🚀 Sukses! Pesan sedang dikirim di background server.");

            setTimeout(() => { closeBlastModal(); toggleBlastMode(); }, 2000);
        } else {
            throw new Error(result.error || "Gagal mengirim blast");
        }
    } catch (error) {
        if (typeof showModernAlert === "function") showModernAlert("Gagal", "Terjadi kesalahan: " + error.message, "error");
        else alert("Terjadi kesalahan: " + error.message);
        
        document.getElementById("btnSendBlast").disabled = false;
        document.getElementById("blastTableWrapper").classList.remove("opacity-50", "pointer-events-none");
        document.getElementById("blastProgressWrapper").classList.add("hidden");
    }
}