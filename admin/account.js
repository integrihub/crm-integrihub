// ==========================================
// SETTINGS & WEBHOOKS SCRIPT (ISOLATED)
// ==========================================

const SET_API = window.location.hostname.includes("staging") || 
            window.location.hostname.includes("pages.dev") || 
            window.location.hostname.includes("localhost") || 
            window.location.hostname.includes("127.0.0.1")
  ? "https://api-staging.crm.integrihub.my.id"
  : "https://api-crm.integrihub.my.id";
  
const SET_CID = localStorage.getItem("client_id");

// Saat file dimuat, otomatis narik data setting
window.addEventListener("DOMContentLoaded", () => {
  set_loadData();
});

// ================= FETCH DATA & RENDER =================
async function set_loadData() {
  if (!SET_CID) return;

  try {
    // Tarik data client dari backend
    const res = await fetch(`${SET_API}/client-info?client_id=${SET_CID}`);
    if (!res.ok) throw new Error("Gagal mengambil data");
    
    const client = await res.json();
    
    // 1. Render Info Dasar
    document.getElementById("set_accName").innerText = client.name || "-";
    document.getElementById("set_accEmail").innerText = localStorage.getItem("email") || "-";
    document.getElementById("set_accSender").innerText = client.sender ? "+" + client.sender : "Belum Terhubung";
    
    // 2. Render Bearer Token
    const tokenInput = document.getElementById("set_accToken");
    if(tokenInput) tokenInput.value = client.bearer_token || "";

    // 🔥 TAMBAHAN 1: RENDER CLIENT ID DAN SECRET
    const clientIdInput = document.getElementById("set_clientId");
    if(clientIdInput) clientIdInput.value = client.id || SET_CID;

    const secretInput = document.getElementById("set_webhookSecret");
    if(secretInput) secretInput.value = client.webhook_secret || "";

    // 3. Render Webhook URLs
    const box = document.getElementById("set_webhookBox");
    box.innerHTML = ""; // Bersihkan list
    
    let hookUrls = [];
    try {
      hookUrls = typeof client.webhook_urls === "string" 
                 ? JSON.parse(client.webhook_urls || "[]") 
                 : (client.webhook_urls || []);
    } catch(e) { 
      hookUrls = []; 
    }
    
    if(hookUrls.length === 0) {
      // ✅ Default format URL khusus sesuai request domain migrasi vendor minggu depan
      set_addWebhookRow("https://app.dashbord.adeas.com/api/webhook");
    } else {
      hookUrls.forEach(url => set_addWebhookRow(url));
    }

  } catch (err) {
    console.error("SETTINGS ERROR:", err);
    set_showAlert("Error", "Gagal memuat informasi akun.", "error");
  }
}

// ================= UI INTERACTIONS =================
function set_toggleToken() {
  const tokenInput = document.getElementById("set_accToken");
  if (!tokenInput) return;
  tokenInput.type = tokenInput.type === "password" ? "text" : "password";
}

function set_copyToken() {
  const tokenInput = document.getElementById("set_accToken");
  if (!tokenInput || !tokenInput.value) {
    return set_showAlert("Perhatian", "Token tidak ditemukan!", "error");
  }
  
  tokenInput.type = "text"; 
  tokenInput.select();
  tokenInput.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(tokenInput.value);
  tokenInput.type = "password"; 
  
  set_showAlert("Berhasil", "Bearer token disalin ke clipboard.", "success");
}

function set_addWebhookRow(val = "") {
  const box = document.getElementById("set_webhookBox");
  if (box.querySelectorAll(".set-webhook-row").length >= 5) {
    return set_showAlert("Batas Maksimal", "Maksimal 5 URL Webhook untuk menjaga performa.", "error");
  }

  const div = document.createElement("div");
  div.className = "set-webhook-row flex gap-2 items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl border dark:border-gray-700 shadow-sm";
  div.innerHTML = `
    <span class="text-xs font-bold text-gray-400 px-1">🔗</span>
    <input type="url" value="${val}" placeholder="https://api.domainanda.com/callback" class="set-webhook-input w-full bg-white dark:bg-gray-800 text-sm p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none text-gray-800 dark:text-gray-200 focus:border-blue-500 transition">
    <button onclick="this.parentElement.remove()" class="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xs transition">✕</button>
  `;
  box.appendChild(div);
}

// 🔥 TAMBAHAN 3: FUNGSI TOMBOL SALIN CLIENT ID
function set_copyClientId() {
  const input = document.getElementById("set_clientId");
  if (!input || !input.value) return;
  input.select();
  navigator.clipboard.writeText(input.value);
  set_showAlert("Berhasil", "Client ID disalin ke clipboard.", "success");
}

// 🔥 TAMBAHAN 4: FUNGSI TOMBOL GENERATE SECRET KEY
function set_generateSecret() {
  const input = document.getElementById("set_webhookSecret");
  if (!input) return;
  // Bikin random string 32 karakter yang solid
  const randomStr = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  input.value = "wh_sec_" + randomStr;
}

// ================= SAVE DATA =================
async function set_saveWebhooks() {
  const btn = document.getElementById("set_btnSaveWebhooks");
  const inputs = document.querySelectorAll(".set-webhook-input");
  
  let urls = [];
  let isValid = true;

  inputs.forEach(input => {
    const val = input.value.trim();
    if (val) {
      if (!val.startsWith("http://") && !val.startsWith("https://")) {
        isValid = false;
        input.classList.add("border-red-500");
      } else {
        input.classList.remove("border-red-500");
        urls.push(val);
      }
    }
  });

  if (!isValid) {
    return set_showAlert("Format Invalid", "Pastikan URL diawali dengan http:// atau https://", "error");
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = "⏳ Menyimpan...";
  }

  try {
    // 🔥 TAMBAHAN 2: TANGKAP SECRET SEBELUM DISIMPAN
    const secretVal = document.getElementById("set_webhookSecret")?.value.trim() || "";

    const payload = {
      client_id: SET_CID,
      webhook_urls: urls,
      webhook_secret: secretVal // Masukkan secret key ke dalam payload JSON
    };

    const res = await fetch(`${SET_API}/update-webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || data.error) throw new Error(data.error || "Gagal menyimpan ke server");

    set_showAlert("Berhasil", "Konfigurasi Webhook berhasil diperbarui.", "success");

  } catch (err) {
    console.error("SAVE ERROR:", err);
    set_showAlert("Gagal", err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "💾 Simpan Konfigurasi";
    }
  }
}

// ================= CUSTOM ALERT MODAL =================
function set_showAlert(title, text, type = "success") {
  const modal = document.getElementById("set_alertModal");
  const iconBox = document.getElementById("set_alertIcon");
  const titleEl = document.getElementById("set_alertTitle");
  const textEl = document.getElementById("set_alertText");
  const btn = document.getElementById("set_alertBtn");

  titleEl.innerText = title;
  textEl.innerText = text;

  if (type === "error") {
    iconBox.className = "flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full text-red-500 bg-red-100 dark:bg-red-900/30";
    iconBox.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    btn.className = "w-full px-4 py-2 text-white font-semibold rounded-xl shadow-md transition bg-red-600 hover:bg-red-700";
  } else {
    iconBox.className = "flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full text-green-500 bg-green-100 dark:bg-green-900/30";
    iconBox.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    btn.className = "w-full px-4 py-2 text-white font-semibold rounded-xl shadow-md transition bg-blue-600 hover:bg-blue-700";
  }

  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    modal.querySelector("div").classList.remove("scale-95");
  }, 10);
}

function set_closeAlert() {
  const modal = document.getElementById("set_alertModal");
  modal.classList.add("opacity-0");
  modal.querySelector("div").classList.add("scale-95");
  setTimeout(() => modal.classList.add("hidden"), 300);
}
