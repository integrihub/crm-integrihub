// ================= STATE IN-ROOM TEMPLATE =================
let currentInRoomConfig = { reqHeaderText: false, reqMedia: false, bodyParamsCount: 0, dynamicButtons: [] };

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject Div Banner "Sesi 24 Jam Berakhir" di atas area ngetik
    const chatContent = document.getElementById("chatContent");
    const chatInputArea = document.getElementById("chatInputArea");
    
    if (chatContent && chatInputArea) {
        const sessionArea = document.createElement("div");
        sessionArea.id = "sessionExpiredArea";
        sessionArea.className = "hidden p-3 border-t bg-yellow-50 dark:bg-yellow-900/20 text-center flex-none border-t dark:border-gray-700";
        sessionArea.innerHTML = `
            <p class="text-[13px] text-yellow-700 dark:text-yellow-400 mb-2 font-medium flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Sesi WA 24 Jam berakhir. Anda wajib membalas menggunakan Template Meta.
            </p>
            <button onclick="openInRoomTemplateModal()" class="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold shadow-md transition text-sm">
                📄 Pilih & Kirim Template
            </button>
        `;
        chatContent.insertBefore(sessionArea, chatInputArea);
    }

    // 2. Inject Modal Popup Template untuk dikirim per 1 User
    const modal = document.createElement("div");
    modal.id = "inRoomTemplateModal";
    modal.className = "hidden fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] transition-opacity opacity-0";
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-[500px] max-w-[95%] flex flex-col max-h-[85vh] transform scale-95 transition-transform duration-300">
            <div class="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
                <h2 class="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    🚀 Kirim Template ke Pelanggan
                </h2>
                <button onclick="closeInRoomTemplateModal()" class="text-gray-400 hover:text-red-500 transition text-2xl font-bold">✕</button>
            </div>
            
            <div class="overflow-y-auto flex-1 pr-2 mb-4 no-scrollbar">
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">1. Pilih Template Meta (Approved)</label>
                <select id="inRoomTemplateSelect" onchange="renderInRoomTemplateParams()" class="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 rounded-xl outline-none focus:border-green-500 mb-4 font-medium transition">
                    <option value="">-- Loading Template --</option>
                </select>

                <div id="inRoomParamsContainer" class="space-y-4">
                    <div class="text-sm text-blue-600 dark:text-blue-300 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-center border border-blue-200 dark:border-blue-800">
                        Pilih template untuk memuat parameter yang diperlukan.
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-auto">
                <button onclick="closeInRoomTemplateModal()" class="px-5 py-2.5 font-bold text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl transition">Batal</button>
                <button id="btnSendInRoom" onclick="sendInRoomTemplate()" class="hidden px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-md transition items-center gap-2">Kirim Sekarang</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
});

// ================= LOGIKA 1: CEK 24 JAM =================
window.check24HourSession = function() {
    if (typeof CURRENT_ROOM_MESSAGES === 'undefined' || CURRENT_ROOM_MESSAGES.length === 0) return false;

    // Cari pesan terakhir yg masuk DARI pelanggan (incoming)
    const lastUserMsg = [...CURRENT_ROOM_MESSAGES].reverse().find(m => m.direction !== "outgoing" && m.direction !== "system");
    
    if (!lastUserMsg) return false; 

    // Konversi format date ke valid JS Date
    const lastMsgTime = new Date(lastUserMsg.timestamp.replace(" ", "T")).getTime();
    const now = new Date().getTime();
    
    const diffHours = (now - lastMsgTime) / (1000 * 60 * 60);
    return diffHours <= 24; 
};

// ================= LOGIKA 2: BUKA/TUTUP MODAL =================
window.openInRoomTemplateModal = function() {
    const modal = document.getElementById("inRoomTemplateModal");
    const select = document.getElementById("inRoomTemplateSelect");
    
    // Sinkronisasi dengan allTemplates dari app.js (Sama persis seperti quickblast)
    if(typeof allTemplates !== 'undefined') {
        const validTemplates = allTemplates.filter(t => t.status && t.status.toUpperCase() === "APPROVED");
        select.innerHTML = '<option value="">-- Pilih Template Approved --</option>' + 
            validTemplates.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
    }
    
    // Reset parameter UI
    document.getElementById("inRoomParamsContainer").innerHTML = '<div class="text-sm text-blue-600 dark:text-blue-300 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-center border border-blue-200 dark:border-blue-800">Pilih template untuk memuat parameter yang diperlukan.</div>';
    document.getElementById("btnSendInRoom").classList.add("hidden");
    document.getElementById("btnSendInRoom").classList.remove("flex");

    modal.classList.remove("hidden");
    setTimeout(() => {
        modal.classList.remove("opacity-0");
        modal.querySelector('div').classList.remove("scale-95");
    }, 10);
};

window.closeInRoomTemplateModal = function() {
    const modal = document.getElementById("inRoomTemplateModal");
    modal.classList.add("opacity-0");
    modal.querySelector('div').classList.add("scale-95");
    setTimeout(() => modal.classList.add("hidden"), 300);
};

// ================= LOGIKA 3: RENDER INPUT PARAMETER (SINKRON QUICKBLAST) =================
window.renderInRoomTemplateParams = function() {
    const tplId = document.getElementById("inRoomTemplateSelect").value;
    const container = document.getElementById("inRoomParamsContainer");
    const btnSend = document.getElementById("btnSendInRoom");
    
    if (!tplId) {
        container.innerHTML = '<div class="text-sm text-blue-600 dark:text-blue-300 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-center border border-blue-200 dark:border-blue-800">Pilih template untuk memuat parameter yang diperlukan.</div>';
        btnSend.classList.add("hidden");
        btnSend.classList.remove("flex");
        return;
    }
    
    const tpl = allTemplates.find(x => String(x.id) === String(tplId));
    if (!tpl) return;

    btnSend.classList.remove("hidden");
    btnSend.classList.add("flex");

    // Reset Config (Identik dengan renderBlastTable)
    currentInRoomConfig = { reqHeaderText: false, reqMedia: false, bodyParamsCount: 0, dynamicButtons: [] };

    // 1. Cek Header
    if (tpl.header_type === 'text' && (tpl.header_value || "").includes("{{1}}")) {
        currentInRoomConfig.reqHeaderText = true;
    } else if (['image', 'video', 'document'].includes(tpl.header_type)) {
        currentInRoomConfig.reqMedia = true;
    }

    // 2. Cek Body
    const bodyStr = tpl.body_text || tpl.body || "";
    const matchParams = bodyStr.match(/\{\{\d+\}\}/g) || [];
    currentInRoomConfig.bodyParamsCount = new Set(matchParams).size;

    // 3. Cek Button URL Dynamic
    let dbBtns = [];
    try { dbBtns = JSON.parse(tpl.buttons_json || tpl.buttons || "[]"); } catch(e){}
    dbBtns.forEach((b, idx) => {
        if (b.type === "url" && (b.value || b.url || "").includes("{{1}}")) {
            currentInRoomConfig.dynamicButtons.push({ index: idx, text: b.text || "Visit Website" });
        }
    });

    // RAKIT UI
    let html = "";
    const customerName = CONTACT_REGISTRY[selected] || processedChatMap[selected]?.name || "";

    if (currentInRoomConfig.reqMedia) {
        html += `
            <div>
                <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">🔗 Media URL (${tpl.header_type.toUpperCase()})</label>
                <input type="text" id="inRoom_media_url" class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="https://..." value="${tpl.header_value || ""}">
            </div>
        `;
    }

    if (currentInRoomConfig.reqHeaderText) {
        html += `
            <div>
                <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">📝 Header {{1}}</label>
                <input type="text" id="inRoom_header_text" class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2.5 rounded-lg text-sm text-gray-900 dark:text-white" value="${customerName}">
            </div>
        `;
    }

    if (currentInRoomConfig.bodyParamsCount > 0) {
        html += `<div class="pt-2"><label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">💬 Parameter Body</label>`;
        for (let i = 1; i <= currentInRoomConfig.bodyParamsCount; i++) {
            let defaultVal = (i === 1) ? customerName : ""; 
            html += `
                <div class="flex items-center gap-2 mb-2">
                    <span class="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold px-2 py-1.5 rounded">{{${i}}}</span>
                    <input type="text" id="inRoom_body_${i}" class="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2 rounded-lg text-sm text-gray-900 dark:text-white" value="${defaultVal}">
                </div>
            `;
        }
        html += `</div>`;
    }

    if (currentInRoomConfig.dynamicButtons.length > 0) {
        html += `<div class="pt-2"><label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">🌐 Parameter Tombol (Akhiran URL)</label>`;
        currentInRoomConfig.dynamicButtons.forEach((btn) => {
            html += `
                <div class="flex items-center gap-2 mb-2">
                    <span class="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold px-2 py-1.5 rounded truncate max-w-[100px]">${btn.text}</span>
                    <input type="text" id="inRoom_button_cta_${btn.index}" class="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="Parameter url...">
                </div>
            `;
        });
        html += `</div>`;
    }

    if (html === "") {
        html = `<div class="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-center text-sm font-bold border border-green-200 dark:border-green-800">✅ Template statis. Siap langsung dikirim!</div>`;
    }

    container.innerHTML = html;
};

// ================= LOGIKA 4: EKSEKUSI KIRIM KE API BLAST =================
window.sendInRoomTemplate = async function() {
    if (!selected) return typeof showModernAlert === "function" ? showModernAlert("Error", "Tidak ada chat aktif!", "error") : alert("Tidak ada chat aktif");
    
    const tplId = document.getElementById("inRoomTemplateSelect").value;
    const btn = document.getElementById("btnSendInRoom");
    
    btn.innerHTML = "⏳ Mengirim...";
    btn.disabled = true;

    // 1. Susun Target Payload (Persis format executeQuickBlast)
    let payloadTarget = { 
        number: selected, 
        name: CONTACT_REGISTRY[selected] || processedChatMap[selected]?.name || selected 
    };
    
    if (currentInRoomConfig.reqMedia) {
        payloadTarget.media_url = document.getElementById("inRoom_media_url").value;
    }
    if (currentInRoomConfig.reqHeaderText) {
        payloadTarget.header_param = document.getElementById("inRoom_header_text").value;
    }
    
    let bodyParams = [];
    for (let i = 1; i <= currentInRoomConfig.bodyParamsCount; i++) {
        bodyParams.push(document.getElementById(`inRoom_body_${i}`).value);
    }
    if (bodyParams.length > 0) payloadTarget.body_params = bodyParams;

    if (currentInRoomConfig.dynamicButtons.length > 0) {
        let bParams = {};
        currentInRoomConfig.dynamicButtons.forEach((btn) => {
            bParams[btn.index] = document.getElementById(`inRoom_button_cta_${btn.index}`).value;
        });
        payloadTarget.button_params = bParams;
    }

    const finalJSON = {
        client_id: typeof CID !== "undefined" ? CID : localStorage.getItem("client_id"),
        template_id: tplId,
        targets: [payloadTarget] // Hanya 1 target array karena ini in-room sender
    };

    try {
        // 🔥 TIDAK PERLU DETEKSI ULANG! 
        // Langsung pakai variabel API dan CID dari app.js
        const endpoint = `${API}/api/blast`; 
        
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "client-id": CID, // Pakai CID dari app.js
                "Authorization": "Bearer " + (localStorage.getItem("bearer_token") || "")
            },
            body: JSON.stringify(finalJSON)
        });

        const result = await response.json();

        if (response.ok) {
            if (typeof showModernAlert === "function") showModernAlert("Berhasil!", "Pesan Template telah masuk ke antrean pengiriman.", "success");
            closeInRoomTemplateModal();
            setTimeout(load, 1000); // Trigger reload bubble chat setelah 1 detik
        } else {
            throw new Error(result.error || "Gagal mengirim template");
        }
    } catch (e) {
        console.error(e);
        if (typeof showModernAlert === "function") showModernAlert("Gagal", e.message, "error");
        else alert("Terjadi kesalahan: " + e.message);
    } finally {
        btn.innerHTML = "🚀 Kirim Pesan";
        btn.disabled = false;
    }
};