// ================= STATE QUICK BLAST =================
let isBlastMode = false;
let selectedBlast = []; 
let currentBlastParamCount = 0; 

function toggleBlastMode() {
    isBlastMode = !isBlastMode;
    selectedBlast = []; // Reset pilihan setiap buka/tutup
    
    const btn = document.getElementById("btnToggleBlast");
    if (isBlastMode) {
        btn.innerHTML = "❌ Matikan Mode Blast";
        btn.classList.replace("bg-gray-100", "bg-red-100");
        btn.classList.replace("text-gray-700", "text-red-700");
    } else {
        btn.innerHTML = "📢 Aktifkan Mode Quick Blast";
        btn.classList.replace("bg-red-100", "bg-gray-100");
        btn.classList.replace("text-red-700", "text-gray-700");
        document.getElementById("blastFloatingPanel").classList.add("hidden");
    }
    // Re-render UI Chat List yang ada di app.js
    if(typeof renderChatListUI === "function") renderChatListUI(); 
}

function handleSelectBlast(num, name, isChecked) {
    if (isChecked) {
        if (!selectedBlast.some(x => x.number === num)) {
            selectedBlast.push({ number: num, name: name });
        }
    } else {
        selectedBlast = selectedBlast.filter(x => x.number !== num);
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
    
    if(typeof renderChatListUI === "function") renderChatListUI();
}

function openBlastModal() {
    const modal = document.getElementById("blastModal");
    const select = document.getElementById("blastTemplateSelect");
    
    // Ambil data dari allTemplates di app.js
    const validTemplates = allTemplates.filter(t => t.status && t.status.toUpperCase() === "APPROVED");
    select.innerHTML = '<option value="">-- Pilih Template Approved --</option>' + 
        validTemplates.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    
    document.getElementById("blastTableWrapper").classList.add("hidden");
    document.getElementById("blastProgressWrapper").classList.add("hidden");
    document.getElementById("blastInfoAlert").classList.remove("hidden");
    document.getElementById("btnSendBlast").classList.add("hidden");
    
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

function renderBlastTable() {
    const tplId = document.getElementById("blastTemplateSelect").value;
    if (!tplId) {
        document.getElementById("blastTableWrapper").classList.add("hidden");
        document.getElementById("blastInfoAlert").classList.remove("hidden");
        document.getElementById("btnSendBlast").classList.add("hidden");
        return;
    }

    const tpl = allTemplates.find(t => String(t.id) === String(tplId));
    document.getElementById("blastInfoAlert").classList.add("hidden");
    document.getElementById("blastTableWrapper").classList.remove("hidden");
    document.getElementById("btnSendBlast").classList.remove("hidden");

    const bodyStr = tpl.body_text || tpl.body || "";
    const matchParams = bodyStr.match(/\{\{\d+\}\}/g) || [];
    currentBlastParamCount = new Set(matchParams).size;

    let thHTML = `<th class="p-3 whitespace-nowrap w-[50px]">No</th>
                  <th class="p-3 whitespace-nowrap min-w-[150px]">Nama Kontak</th>`;
                  
    for (let i = 1; i <= currentBlastParamCount; i++) {
        thHTML += `
            <th class="p-3 min-w-[200px]">
                <div class="flex items-center justify-between">
                    <span>Param {{${i}}}</span>
                    <button onclick="applyBlastParamToAll(${i})" class="text-[10px] bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white px-2 py-1 rounded transition border border-blue-200">
                        ⚡ Isi Semua
                    </button>
                </div>
            </th>`;
    }

    let trHTML = selectedBlast.map((u, rowIndex) => {
        let tdHTML = `
            <td class="p-3 border-r dark:border-gray-700 font-mono text-xs text-gray-400">${rowIndex + 1}</td>
            <td class="p-3 border-r dark:border-gray-700 font-semibold text-sm">
                ${u.name}<br>
                <span class="text-xs text-gray-400 font-normal">${u.number}</span>
            </td>`;
            
        for (let i = 1; i <= currentBlastParamCount; i++) {
            let defaultVal = (i === 1) ? u.name : ""; // Auto nama untuk param 1
            tdHTML += `
                <td class="p-2 border-r dark:border-gray-700">
                    <input type="text" id="blast_param_${rowIndex}_${i}" value="${defaultVal}" placeholder="Isi param {{${i}}}..." class="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-2 rounded text-sm focus:border-green-500 outline-none transition">
                </td>`;
        }
        return `<tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">${tdHTML}</tr>`;
    }).join('');

    document.getElementById("blastTableHead").innerHTML = thHTML;
    document.getElementById("blastTableBody").innerHTML = trHTML;
}

function applyBlastParamToAll(paramIndex) {
    const firstVal = document.getElementById(`blast_param_0_${paramIndex}`).value;
    for (let i = 1; i < selectedBlast.length; i++) {
        document.getElementById(`blast_param_${i}_${paramIndex}`).value = firstVal;
    }
    if(typeof showModernAlert === "function") {
        showModernAlert("Sukses", `Parameter {{${paramIndex}}} berhasil diterapkan ke seluruh ${selectedBlast.length} kontak!`, "success");
    }
}

async function executeQuickBlast() {
    const tplId = document.getElementById("blastTemplateSelect").value;
    if (!tplId) return typeof showModernAlert === "function" ? showModernAlert("Error", "Pilih template terlebih dahulu!", "error") : alert("Pilih template!");

    const blastPayload = selectedBlast.map((u, rowIndex) => {
        let params = [];
        for (let i = 1; i <= currentBlastParamCount; i++) {
            params.push(document.getElementById(`blast_param_${rowIndex}_${i}`).value);
        }
        return { number: u.number, name: u.name, body_params: params };
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
    document.getElementById("blastProgressBar").style.width = "10%";
    document.getElementById("blastProgressText").innerText = "Menginisialisasi Antrean...";

    try {
        // Simulasi Background Processing UI (Hapus & Ganti dengan Fetch kalau API Backend udah ready)
        let percent = 10;
        const interval = setInterval(() => {
            percent += 20;
            document.getElementById("blastProgressBar").style.width = percent + "%";
            document.getElementById("blastProgressText").innerText = percent + "%";
            if(percent >= 100) {
                clearInterval(interval);
                if(typeof showModernAlert === "function") showModernAlert("Blast Dijalankan!", "Sistem sedang mengirim pesan di background.", "success");
                setTimeout(() => {
                    closeBlastModal();
                    toggleBlastMode();
                }, 2000);
            }
        }, 800);

    } catch (error) {
        if(typeof showModernAlert === "function") showModernAlert("Gagal", "Gagal menghubungi server.", "error");
        document.getElementById("btnSendBlast").disabled = false;
        document.getElementById("blastTableWrapper").classList.remove("opacity-50", "pointer-events-none");
    }
}