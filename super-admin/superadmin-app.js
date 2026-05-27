if (!window.API) {
  window.API = window.location.hostname.includes("staging") || 
               window.location.hostname.includes("pages.dev") || 
               window.location.hostname.includes("localhost") || 
               window.location.hostname.includes("127.0.0.1")
    ? "https://api-staging.crm.integrihub.my.id"
    : "https://api-crm.integrihub.my.id";
}

//PAGINATION PAGE
let CLIENT_PAGE = 1;
let CLIENT_PER_PAGE = 10;
//EDIT CLIENT
let editId = null;
let CLIENTS_CACHE = [];

function closeAddAgentModal(){
  document.getElementById("addAgentModal").classList.add("hidden");
}



  // ================= LOGOUT =================
function logout() {
  // 1. Hapus semua data yang berhubungan dengan sesi login (Bearer token, client_id, dll)
  localStorage.clear(); 
  sessionStorage.clear();

  // 2. Gunakan slash "/" di depan untuk mengarahkan ke root (lokasi file login yang benar)
  window.location.href = "/login.html";
}

// ================= AGENT =================
function addAgent(){
  const div = document.createElement("div");
  div.className = "flex gap-2 mb-2";

  div.innerHTML = `
    <input placeholder="Agent Email" class="agent_email w-1/2 p-2 border rounded">
    <input placeholder="Agent Password" class="agent_pass w-1/2 p-2 border rounded">
    <button onclick="this.parentElement.remove()" class="bg-red-400 px-2 rounded">X</button>
  `;

  document.getElementById("agentsContainer").appendChild(div);
}

// ================= CREATE =================
async function createClient(){

  const name = document.getElementById("name").value.trim();
  const sender = document.getElementById("sender").value.trim();
  const token = document.getElementById("token").value.trim();

  const logo = document.getElementById("logo_url")?.value.trim() || "";
  const color = document.getElementById("primary_color")?.value.trim() || "";

  const admin_email = document.getElementById("admin_email").value.trim();
  const admin_pass = document.getElementById("admin_pass").value.trim();

  if(!name || !sender || !token || !admin_email || !admin_pass){
    alert("Harap isi semua field wajib ⚠️");
    return;
  }

  // 🔥 ambil semua agent
  const agents = [];
  document.querySelectorAll("#agentsContainer > div").forEach(row=>{
    const email = row.querySelector(".agent_email").value.trim();
    const pass = row.querySelector(".agent_pass").value.trim();

    if(email && pass){
      agents.push({ email, pass });
    }
  });

  const payload = {
    name,
    sender,
    bearer_token: token,
    logo_url: logo,
    primary_color: color,
    admin_email,
    admin_pass,
    agents, // ✅ INI KUNCI FIX
    actor_email: localStorage.getItem("email") // 🔥 TAMBAHKAN BARIS INI
  };

  console.log("PAYLOAD:", payload);

  try {
    const res = await fetch(API + "/create-client-full", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });

    const data = await res.json();

    if(!res.ok){
      alert("Error: " + (data.error || "Gagal create client"));
      return;
    }

    alert("Client berhasil dibuat ✅");

    document.querySelectorAll("input").forEach(i => i.value = "");
    document.getElementById("agentsContainer").innerHTML = "";

    window.location.href = "list-client.html";

  } catch(err){
    alert("Error koneksi ❌");
    console.error(err);
  }
}

// ================= LIST =================
async function loadClients(){
  try {
    console.log("🔥 loadClients jalan");

    const res = await fetch(API + "/clients");

    if (!res.ok) throw new Error("API ERROR");

    const data = await res.json();

    console.log("🔥 DATA CLIENT:", data);

    CLIENTS_CACHE = data;

    renderTable(data);

  } catch (err) {
    console.error("❌ ERROR LOAD CLIENT:", err);

    document.getElementById("clientTable").innerHTML =
      `<tr><td colspan="5" class="p-3 text-center text-red-500">Gagal load data</td></tr>`;
  }
}

// ================= RENDER TABLE =================
function renderTable(data){

  const table = document.getElementById("clientTable");

  if(!Array.isArray(data) || data.length === 0){
    table.innerHTML = `<tr><td colspan="5" class="p-3 text-center">Tidak ada data</td></tr>`;

    // 🔥 INFO KOSONG
    const info = document.getElementById("clientInfo");
    if(info) info.innerText = "0 data";

    return;
  }

  // ================= PAGINATION =================
  const totalData = data.length;
  const totalPages = Math.ceil(totalData / CLIENT_PER_PAGE);

  if(CLIENT_PAGE > totalPages) CLIENT_PAGE = 1;

  const start = (CLIENT_PAGE - 1) * CLIENT_PER_PAGE;
  const end = Math.min(start + CLIENT_PER_PAGE, totalData);

  const paginated = data.slice(start, start + CLIENT_PER_PAGE);

  // ================= 🔥 INFO TEXT =================
  const info = document.getElementById("clientInfo");
  if(info){
    info.innerText = `Showing ${start + 1}–${end} of ${totalData} clients`;
  }

  // ================= 🔥 FUNGSI FORMAT WAKTU (Taruh tepat di atas table.innerHTML) =================
  const formatWIB = (dateStr) => {
    if (!dateStr) return "-";
    // Ubah format string DB jadi ISO agar valid dibaca JS sebagai UTC, lalu format ke WIB
    const validStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    return new Date(validStr).toLocaleString('id-ID', { 
      timeZone: 'Asia/Jakarta', 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  // ================= TABLE =================
  table.innerHTML = paginated.map(c=>`
    <tr class="border hover:bg-gray-50 transition">
      <td class="p-3 font-semibold">${c.id}</td>
      <td class="p-3">${c.name}</td>
      <td class="p-3">${c.sender}</td>
      <td class="p-3 text-sm text-gray-600 dark:text-gray-400">${formatWIB(c.created_at)}</td>
      <td class="p-3 text-sm text-gray-600 dark:text-gray-400">${formatWIB(c.update_at)}</td>
      <td class="p-3 text-center">
        ${c.logo_url ? `<img src="${c.logo_url}" class="h-8 mx-auto cursor-pointer" onclick="window.open('${c.logo_url}')">` : "-"}
      </td>
      <td class="p-3 text-center space-x-1">
        <button onclick="detailClient(${c.id})" class="bg-blue-500 text-white px-2 py-1 rounded">Detail</button>
        <button onclick="editClient(${c.id})" class="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>
        <button onclick="deleteClient(${c.id})" class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
        <button onclick="addAgentToClient(${c.id})" class="bg-green-500 text-white px-2 py-1 rounded">+ Add</button>
      </td>
    </tr>
  `).join("");

  renderClientPagination(totalPages);
}

// ================= PAGINATION PAGE =================
function renderClientPagination(totalPages){

  const container = document.getElementById("clientPagination");
  if(!container) return;

  if(totalPages <= 1){
    container.innerHTML = "";
    return;
  }

  let html = "";

  // PREV
  html += `
    <button onclick="clientGoPage(${CLIENT_PAGE - 1})"
      ${CLIENT_PAGE === 1 ? "disabled" : ""}
      class="px-3 py-1 border rounded ${CLIENT_PAGE === 1 ? 'opacity-50' : ''}">
      ◀
    </button>
  `;

  // RANGE
  const startPage = Math.max(1, CLIENT_PAGE - 2);
  const endPage = Math.min(totalPages, CLIENT_PAGE + 2);

  for(let i = startPage; i <= endPage; i++){
    html += `
      <button onclick="clientGoPage(${i})"
        class="px-3 py-1 border rounded ${i === CLIENT_PAGE ? 'bg-blue-500 text-white' : ''}">
        ${i}
      </button>
    `;
  }

  // NEXT
  html += `
    <button onclick="clientGoPage(${CLIENT_PAGE + 1})"
      ${CLIENT_PAGE === totalPages ? "disabled" : ""}
      class="px-3 py-1 border rounded ${CLIENT_PAGE === totalPages ? 'opacity-50' : ''}">
      ▶
    </button>
  `;

  container.innerHTML = html;
}

// ================= NAVIGASI PAGINATION =================
function clientGoPage(page){
  const totalData = CLIENTS_CACHE.length;
  const totalPages = Math.ceil(totalData / CLIENT_PER_PAGE);

  if(page < 1 || page > totalPages) return;

  CLIENT_PAGE = page;
  renderTable(CLIENTS_CACHE);
}

function clientChangeLimit(val){
  CLIENT_PER_PAGE = parseInt(val);
  CLIENT_PAGE = 1;
  renderTable(CLIENTS_CACHE);
}

// ================= REFRESH =================
function refreshPage(){
  location.reload();
}

// ================= DETAIL =================
async function detailClient(id){
  const res = await fetch(API + "/client-detail?id=" + id);
  const data = await res.json();

  const admin = data.users.find(u=>u.role==="admin");
  const agents = data.users.filter(u=>u.role==="agent");

  let adminHTML = `
    <div class="border p-2 rounded mb-2">
      <p><b>Admin:</b> ${admin?.email}</p>
      <p>Password: 
      <span id="adminPass${admin.id}" class="hidden">${admin?.password}</span>
      <button onclick="toggle('adminPass${admin.id}')">👁</button>
      </p>

      <div class="space-x-2 mt-2">
        <button onclick="openEditUser(${admin.id}, '${admin.email}', '${admin.password}')" 
          class="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>

        <button onclick="deleteUser(${admin.id})" 
          class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
      </div>
    </div>
  `;

  let agentsHTML = "";

  agents.forEach((a,i)=>{
    agentsHTML += `
      <div class="border p-2 rounded mb-2">
        <p><b>Agent ${i+1}:</b> ${a.email}</p>
        <p>Password: 
        <span id="agentPass${a.id}" class="hidden">${a.password}</span>
        <button onclick="toggle('agentPass${a.id}')">👁</button>
        </p>

        <div class="space-x-2 mt-2">
          <button onclick="openEditUser(${a.id}, '${a.email}', '${a.password}')" 
            class="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>

          <button onclick="deleteUser(${a.id})" 
            class="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
        </div>
      </div>
    `;
  });

  document.getElementById("detailContent").innerHTML = `
  <p><b>Name:</b> ${data.client.name}</p>
  <p><b>Sender:</b> ${data.client.sender}</p>

  <p><b>Bearer Token:</b> 
    <span id="tokenVal" class="hidden">${data.client.bearer_token}</span>
    <button onclick="toggle('tokenVal')">👁</button>
  </p>

  <hr class="my-2">

  ${adminHTML}

  <hr class="my-2">

  ${agentsHTML}
`;

  document.getElementById("detailModal").classList.remove("hidden");
}
function toggle(id){
  const el = document.getElementById(id);
  el.classList.toggle("hidden");
}

function closeModal(){
  document.getElementById("detailModal").classList.add("hidden");
}

// ================= EDIT =================
async function editClient(id){
  editId = id;

  const res = await fetch(API + "/client-detail?id=" + id);
  const data = await res.json();

  const admin = data.users.find(u=>u.role==="admin");
  const agent = data.users.find(u=>u.role==="agent");

  edit_name.value = data.client.name;
  edit_sender.value = data.client.sender;
  edit_token.value = data.client.bearer_token;
  edit_logo.value = data.client.logo_url;
  edit_color.value = data.client.primary_color;

  document.getElementById("editModal").classList.remove("hidden");
}

//SAVE EDIT CLIENT  
async function saveEdit(){
  try {
    const res = await fetch(API + "/update-client", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        id: editId,
        name: edit_name.value,
        sender: edit_sender.value,
        bearer_token: edit_token.value,
        logo_url: edit_logo.value,
        primary_color: edit_color.value,
        actor_email: localStorage.getItem("email") // 🔥 TAMBAHKAN BARIS INI
      })
    });

    const data = await res.json(); // ✅ sekarang aman

    if(!res.ok){
      alert("Gagal update: " + (data.error || "Unknown error"));
      return;
    }

    alert("Client berhasil diupdate ✅");
    closeEdit();
    loadClients();

  } catch(err){
    console.error("FETCH ERROR:", err);
    alert("Koneksi ke server bermasalah ❌");
  }
}

function closeEdit(){
  document.getElementById("editModal").classList.add("hidden");
}

// ================= DELETE =================
async function deleteClient(id){
  if(!confirm("Yakin Delete Client ini ?")) return;

 await fetch(API + "/delete-client", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      id: id, 
      actor_email: localStorage.getItem("email") // 🔥 TAMBAHKAN BARIS INI
    })
  });

  loadClients();
}

// Button + Add Agent
  let selectedClientId = null;

function addAgentToClient(id){
  selectedClientId = id;

  document.getElementById("modalAgentEmail").value = "";
  document.getElementById("modalAgentPass").value = "";

  document.getElementById("addAgentModal").classList.remove("hidden");
}

// Function Submit
 async function submitNewAgent(){
  const email = document.getElementById("modalAgentEmail").value;
  const pass = document.getElementById("modalAgentPass").value;

  if(!email || !pass){
    alert("Isi semua field");
    return;
  }

  const res = await fetch(API + "/add-agent", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      client_id: selectedClientId,
      agent_email: email,   // ✅ FIX
      agent_pass: pass,     // ✅ FIX
      actor_email: localStorage.getItem("email") // 🔥 TAMBAHKAN BARIS INI
    })
  });

  const data = await res.json();
  console.log("ADD AGENT RESPONSE:", data); // 🔥 debug

  if(!res.ok){
    alert("Error: " + data.error);
    return;
  }

  alert("Agent berhasil ditambahkan");

  closeAddAgentModal();
  loadClients();
}


  // Filter Client
 function filterClient(){
  const keyword = document.getElementById("searchInput").value.toLowerCase();

  const filtered = CLIENTS_CACHE.filter(c =>
    c.name.toLowerCase().includes(keyword) ||
    c.sender.toLowerCase().includes(keyword) ||
    String(c.id).includes(keyword)
  );

  CLIENT_PAGE = 1; // 🔥 WAJIB (biar ga loncat page kosong)
  renderTable(filtered);
}

  // ================= EDIT USER PER ROW =================
  let editUserId = null;

function openEditUser(id, email, pass){
  editUserId = id;

  document.getElementById("editUserEmail").value = email;
  document.getElementById("editUserPass").value = pass;

  document.getElementById("editUserModal").classList.remove("hidden");
}

function closeEditUser(){
  document.getElementById("editUserModal").classList.add("hidden");
}

async function submitEditUser(){
  await fetch(API + "/update-user", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      id: editUserId,
      email: document.getElementById("editUserEmail").value,
      password: document.getElementById("editUserPass").value,
      actor_email: localStorage.getItem("email") // 🔥 TAMBAHKAN BARIS INI
    })
  });

  alert("User updated");
  closeEditUser();
}

  // ================= DELET USER PER ROW =================
  async function deleteUser(id){
  if(!confirm("Yakin hapus user ini?")) return;

  await fetch(API + "/delete-user", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      id: id,
      actor_email: localStorage.getItem("email") // 🔥 TAMBAHKAN BARIS INI
    })
  });

  alert("Deleted");
}

// ================= DIAGRAM STATISTIC LOAD =================
async function loadStats(){
  const res = await fetch(API + "/clients");
  const clients = await res.json();

  let totalClient = clients.length;
  let totalUser = 0;
  let totalAgent = 0;

  // 🔥 ambil detail tiap client
  for(const c of clients){
    const detail = await fetch(API + "/client-detail?id=" + c.id);
    const data = await detail.json();

    totalUser += data.users.length;
    totalAgent += data.users.filter(u => u.role === "agent").length;
  }

  // SET UI
  document.getElementById("totalClient").innerText = totalClient;
  document.getElementById("totalUser").innerText = totalUser;
  document.getElementById("totalAgent").innerText = totalAgent;

  renderChart(totalClient, totalUser, totalAgent);
}

  // ================= FUNCTION CHART =================
  function renderChart(client, user, agent){
  const ctx = document.getElementById('chartStats');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Client', 'User', 'Agent'],
      datasets: [{
        label: 'Statistics',
        data: [client, user, agent]
      }]
    }
  });
}

// ================= PROFILE POJOK KANAN ATAS =================
function loadProfile(){
  let email =
  localStorage.getItem("email") ||
  localStorage.getItem("user_email") ||
  "admin@mail.com";

  // 🔥 FIX: sinkronkan supaya semua halaman konsisten
  if(email && !localStorage.getItem("email")){
    localStorage.setItem("email", email);
  }

  // fallback terakhir
  if(!email) email = "admin@mail.com";

  const el = document.getElementById("profileEmail");
  if(el) el.innerText = email;

  const initial = document.getElementById("profileInitial");
  if(initial) initial.innerText = email.charAt(0).toUpperCase();
}

// ================= DROPDOWN =================
function toggleProfileMenu(){
  document.getElementById("profileMenu")?.classList.toggle("hidden");
}

// ================= THEME =================
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
    // system
    if(window.matchMedia("(prefers-color-scheme: dark)").matches){
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
}

// ================= INIT =================
window.addEventListener("load", () => {

  // 🔥 PAKSA SESSION (BIAR GA KE-BLOCK LOGIN)
  // MATIKAN 2 BARIS INI:
  // localStorage.setItem("is_login", "true");
  // localStorage.setItem("role", "super_admin");

  // MATIKAN JUGA BARIS INI KARENA INI EMAIL DUMMY:
  // if(!localStorage.getItem("email")){
  //   localStorage.setItem("email", "admin@mail.com");
  // }

  // PROFILE + THEME
  loadProfile();
  applyTheme();

  // 🔥 AUTO LOAD PER PAGE
  if(document.getElementById("totalClient")){
    loadStats();
  }

  if(document.getElementById("clientTable")){
    loadClients();
  }
});

// AUTO UPDATE kalau system theme berubah
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', applyTheme);
