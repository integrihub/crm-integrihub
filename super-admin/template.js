const API = window.location.hostname.includes("staging") || 
            window.location.hostname.includes("pages.dev") || 
            window.location.hostname.includes("localhost") || 
            window.location.hostname.includes("127.0.0.1")
  ? "https://api-staging.crm.integrihub.my.id"
  : "https://api-crm.integrihub.my.id";

let CACHE = [];
//edit template
let currentEditId = null;
// PAGINATION STATE
let currentPage = 1;
let perPage = 10;

// LOAD
async function loadTemplates(){
  try {
    const res = await fetch(API + "/superadmin/templates");

    let data = [];
    try {
      data = await res.json();
    } catch(e) {
      console.error("JSON parse error:", e);
      data = [];
    }

    if (!Array.isArray(data)) {
      console.warn("Data bukan array:", data);
      data = [];
    }

    CACHE = data;

    try {
      render(data);
    } catch(renderErr){
      console.error("Render error:", renderErr);
    }

  } catch(err){
    console.error("LoadTemplates error:", err);
  }
}

// RENDER
function render(data){
  const keyword = document.getElementById("search").value.toLowerCase();
const statusFilter = document.getElementById("filterStatus").value.toLowerCase();

// ================= FILTER =================  
const filtered = data.filter(t => {

  const name = (t.name || "").toLowerCase();
  const client = (t.client_name || "").toLowerCase();
  const sender = (t.sender || "").toLowerCase();
  const status = (t.status || "").toLowerCase();

  // 🔥 GLOBAL SEARCH (gabungan)
  const matchSearch =
    name.includes(keyword) ||
    client.includes(keyword) ||
    sender.includes(keyword);

  return (
    matchSearch &&
    (statusFilter ? status === statusFilter : true)
  );
});

// ================= PAGINATION =================
 const totalData = filtered.length;
const totalPages = Math.ceil(totalData / perPage);

if(currentPage > totalPages) currentPage = 1;

const start = (currentPage - 1) * perPage;
const end = Math.min(start + perPage, totalData); // 🔥 TAMBAHAN
const paginated = filtered.slice(start, start + perPage);

 // ================= TOTAL LIST SHOWING =================
 const info = document.getElementById("templateInfo");
if(info){
  if(totalData === 0){
    info.innerText = "0 data";
  } else {
    info.innerText = `Showing ${start + 1}–${end} of ${totalData} Templates Client`;
  }
}
  
  // ================= TABLE =================  
  const table = document.getElementById("table");

  table.innerHTML = paginated.map(t => {

    const status = (t.status || "").toLowerCase(); // 🔥 normalisasi lagi

    return `
    <tr class="border hover:bg-gray-50">
      <td class="p-3">${t.client_name || "-"}</td>
      <td class="p-3 font-semibold">${t.name || "-"}</td>
      <td class="p-3">${t.category_template || "-"}</td>
      <td class="p-3">${t.sender || "-"}</td>

      <td class="p-3">
        ${renderStatus(status)}
      </td>

      <td class="p-3 text-xs text-gray-500">
    ${formatWIB(t.created_at)}
    </td>

      <td class="p-3 text-center space-x-1">
        <button onclick="detail(${t.id})"
          class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">
          Detail
        </button>

        <button onclick="approve(${t.id})"
          class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded">
          Approve
        </button>

        <button onclick="reject(${t.id})"
          class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">
          Reject
        </button>

        <button onclick="edit(${t.id}, '${t.category_template || ""}')"
        class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded">
        Edit
      </button>
      </td>
    </tr>
    `;
  }).join("");
  
  renderPagination(totalPages);
}

//RENDER PAGINATION
function renderPagination(totalPages){

  const container = document.getElementById("pagination");

  if(totalPages <= 1){
    container.innerHTML = "";
    return;
  }

  let html = "";

  // ================= PREV =================
  html += `
    <button onclick="goPage(${currentPage - 1})"
      ${currentPage === 1 ? "disabled" : ""}
      class="px-3 py-1 border rounded ${currentPage === 1 ? 'opacity-50' : ''}">
      ◀
    </button>
  `;

  // ================= RANGE =================
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  // ================= FIRST PAGE =================
  if(startPage > 1){
    html += `
      <button onclick="goPage(1)" class="px-3 py-1 border rounded">1</button>
    `;

    if(startPage > 2){
      html += `<span class="px-2">...</span>`;
    }
  }

  // ================= MIDDLE =================
  for(let i = startPage; i <= endPage; i++){
    html += `
      <button onclick="goPage(${i})"
        class="px-3 py-1 border rounded ${
          i === currentPage ? 'bg-blue-500 text-white' : ''
        }">
        ${i}
      </button>
    `;
  }

  // ================= LAST PAGE =================
  if(endPage < totalPages){
    if(endPage < totalPages - 1){
      html += `<span class="px-2">...</span>`;
    }

    html += `
      <button onclick="goPage(${totalPages})"
        class="px-3 py-1 border rounded">
        ${totalPages}
      </button>
    `;
  }

  // ================= NEXT =================
  html += `
    <button onclick="goPage(${currentPage + 1})"
      ${currentPage === totalPages ? "disabled" : ""}
      class="px-3 py-1 border rounded ${currentPage === totalPages ? 'opacity-50' : ''}">
      ▶
    </button>
  `;

  container.innerHTML = html;
}

// GO PAGE PAGINATION
function goPage(page){
  const totalData = CACHE.length;
  const totalPages = Math.ceil(totalData / perPage);

  // 🔥 GUARD (biar ga keluar range)
  if(page < 1 || page > totalPages) return;

  currentPage = page;
  render(CACHE);
}

// CHANGE PER PAGE
function changePerPage(val){
  perPage = parseInt(val);

  // 🔥 RESET KE PAGE 1 (wajib)
  currentPage = 1;

  render(CACHE);
}

//CREATED AT WIB
function formatWIB(dateString){
  if(!dateString) return "-";

  // 🔥 FIX: ubah ke ISO format
  const iso = dateString.replace(" ", "T") + "Z";

  const d = new Date(iso);

  if(isNaN(d)) return dateString;

  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// STATUS UI (🔥 UPGRADE TOOLTIP)
function renderStatus(s){
  s = (s || "").toLowerCase();

  if(s==="pending") return `<span class="text-yellow-500 font-semibold">Pending</span>`;
  if(s==="approved") return `<span class="text-green-600 font-semibold">Approved</span>`;
  if(s==="rejected") return `<span class="text-red-500 font-semibold">Rejected</span>`;
}

// DETAIL
function detail(id){
  const t = CACHE.find(x => x.id === id);
  if(!t) return;

  // ================= 🔥 FIX URL =================
  function fixUrl(path){
    if(!path) return "";
    if(path.startsWith("http")) return path;

    path = path.replace(/^\/media\//, "");
    path = path.replace(/^media\//, "");

    return API + "/media/" + path;
  }

  // ================= 🔥 NORMALISASI =================
  let buttons = [];

  try {
    buttons = JSON.parse(t.buttons_json || "[]");
  } catch(e){
    console.log("BUTTON PARSE ERROR:", e);
    buttons = [];
  }

  const bodyText = t.body_text || t.body || "";
  const footer = t.footer || "";

  // ================= 🔥 HEADER =================
 let headerHTML = "";

if(t.header_type && t.header_value){

  const url = fixUrl(t.header_value);

  if(t.header_type === "text"){
    headerHTML = `<div class="font-semibold mb-2">${t.header_value}</div>`;
  }

  if(t.header_type === "image"){
    headerHTML = `
      <div>
        <img src="${url}" class="w-40 rounded border mb-1">
        <a href="${url}" target="_blank" class="text-xs text-blue-500 underline">Open Image</a>
      </div>
    `;
  }

  if(t.header_type === "video"){
    headerHTML = `
      <div>
        <video src="${url}" controls class="w-40 rounded mb-1"></video>
        <a href="${url}" target="_blank" class="text-xs text-blue-500 underline">Open Video</a>
      </div>
    `;
  }

  if(t.header_type === "document"){
    headerHTML = `
      <div>
        <div class="text-sm text-gray-500">📄 Document</div>
        <a href="${url}" target="_blank" class="text-xs text-blue-500 underline">Open Document</a>
      </div>
    `;
  }
}

  // ================= 🔥 BODY =================
  const bodyHTML = `
    <div class="text-sm whitespace-pre-line">
      ${bodyText.replace(/{{(\d+)}}/g, (m,n)=>
        `<span class="text-blue-500 font-semibold">{{${n}}}</span>`
      )}
    </div>
  `;

  // ================= 🔥 FOOTER =================
  const footerHTML = footer
    ? `<div class="text-xs text-gray-400 mt-1">${footer}</div>`
    : "";

  // ================= 🔥 BUTTON =================
  let buttonsHTML = "";

if(buttons.length){

  buttonsHTML += `<div class="border-t mt-2 pt-2 space-y-2"></div>`;

  buttons.forEach(b => {

    // 📞 PHONE
    if(b.type === "phone"){
      buttonsHTML += `
        <div class="bg-gray-100 p-2 rounded">
          <div class="flex justify-between">
            <div>📞 ${b.text}</div>
            <div class="text-xs text-gray-500">${b.value}</div>
          </div>
        </div>
      `;
    }

    // 🌐 URL
    else if(b.type === "url"){
      buttonsHTML += `
        <div class="bg-gray-100 p-2 rounded">

          <div class="flex justify-between">
            <div>🌐 ${b.text}</div>
            <a href="${b.value}" target="_blank"
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

    // ↩️ QUICK
    else if(b.type === "quick_reply"){
      buttonsHTML += `
        <div class="bg-gray-100 p-2 rounded">
          ↩️ ${b.text}
        </div>
      `;
    }

    // 📋 FLOW
    else if(b.type === "flow"){
      buttonsHTML += `
        <div class="bg-gray-100 p-2 rounded">
          <div>📋 ${b.text}</div>

          <div class="text-xs text-gray-500">
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

  });
}
  
  // ================= 🔥 FINAL RENDER =================
  document.getElementById("detailBox").innerHTML = `
    <p><b>Name:</b> ${t.name}</p>
    <p><b>Category:</b> ${t.category || t.category_template || "-"}</p>
    <p><b>Sender:</b> ${t.sender || "-"}</p>
    <p><b>Status:</b> ${(t.status || "").toLowerCase()}</p>
    <p><b>Language:</b> ${t.language || "-"}</p>

    <hr class="my-2">

    <div class="bg-[#f5f5f5] p-3 rounded-lg">

      ${headerHTML}

      ${bodyHTML}

      ${footerHTML}

      ${buttonsHTML}

    </div>
  `;

  document.getElementById("modal").classList.remove("hidden");
}

function closeTemplateModal(){
  document.getElementById("modal").classList.add("hidden");
}



// ======================
// APPROVE
// ======================
async function approve(id){
  // 1. API CALL (ONLY)
  try {
    await fetch(API + "/template-approve", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ 
        id: id,
        actor_email: localStorage.getItem("email") // 🔥 TAMBAHKAN BARIS INI
      })
    });
  } catch(err){
    console.error("API ERROR:", err);
    alert("Gagal approve ❌");
    return;
  }

  // 2. UI SUCCESS (dipisah)
  alert("Approved ✅");

  // 3. REFRESH (jangan ganggu flow)
  loadTemplates().catch(e => {
    console.error("Reload error:", e);
  });
}

// ======================
// REJECT
// ======================
async function reject(id){
  try {
    await fetch(API + "/template-reject", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ 
        id: id,
        actor_email: localStorage.getItem("email") // 🔥 TAMBAHKAN BARIS INI
      })
    });
  } catch(err){
    console.error("API ERROR:", err);
    alert("Gagal reject ❌");
    return;
  }

  alert("Rejected ❌");

  loadTemplates().catch(e => {
    console.error("Reload error:", e);
  });
}

// ======================
// OPEN EDIT MODAL
// ======================
function edit(id, currentCategory = ""){
  currentEditId = id;

  // isi dropdown dengan value lama
  document.getElementById("edit_category").value = currentCategory || "";

  document.getElementById("editModal").classList.remove("hidden");
}

// ======================
// CLOSE MODAL
// ======================
function closeEditModal(){
  document.getElementById("editModal").classList.add("hidden");
}

// ======================
// SUBMIT EDIT
// ======================
async function submitEdit(){
  const category = document.getElementById("edit_category").value;

  if(!category){
    alert("Category wajib dipilih");
    return;
  }

  try {
    await fetch(API + "/template-edit", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        id: currentEditId,
        category: category,
        actor_email: localStorage.getItem("email") // 🔥 TAMBAHKAN BARIS INI
      })
    });
  } catch(err){
    console.error("API ERROR:", err);
    alert("Gagal update ❌");
    return;
  }

  alert("Updated ✅");
  closeEditModal();

  loadTemplates().catch(e => {
    console.error("Reload error:", e);
  });
}

// SEARCH (DEBOUNCE)
let debounceTimer;

document.getElementById("search").addEventListener("input", () => {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    currentPage = 1; // 🔥 penting
    render(CACHE);
  }, 300);
});

// FILTER
document.getElementById("filterStatus").addEventListener("change", () => {
  currentPage = 1; // 🔥 penting
  render(CACHE);
});

// LIMIT (ROWS PER PAGE)
document.getElementById("limit").addEventListener("change", (e) => {
  perPage = parseInt(e.target.value);
  currentPage = 1;
  render(CACHE);
});

// INIT
loadTemplates();
