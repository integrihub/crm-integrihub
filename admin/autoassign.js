// ==========================================
// autoassign.js - Modul Fitur Auto Assign
// ==========================================

window.AutoAssign = (function() {
    // Ambil API dan CID dari global (app.js)
    const BASE_API = window.location.hostname.includes("staging") || 
            window.location.hostname.includes("pages.dev") || 
            window.location.hostname.includes("localhost") || 
            window.location.hostname.includes("127.0.0.1")
  ? "https://api-staging.crm.integrihub.my.id"
  : "https://api-crm.integrihub.my.id";
   
    const CLIENT_ID = localStorage.getItem("client_id");

    async function fetchStatus() {
        if (!CLIENT_ID) return;
        try {
            const res = await fetch(`${BASE_API}/client-info?client_id=${CLIENT_ID}`);
            const data = await res.json();
            
            // Cek status dari database (1 = aktif, 0 = nonaktif)
            const isAuto = data.is_auto_assign === 1;
            updateUI(isAuto);
        } catch (error) {
            console.error("Gagal load status Auto-Assign", error);
        }
    }

    async function toggle() {
        const checkbox = document.getElementById("toggleAutoAssign");
        const newState = checkbox.checked;
        updateUI(newState); // Efek instan

        try {
            const res = await fetch(`${BASE_API}/toggle-auto-assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: CLIENT_ID,
                    is_auto_assign: newState ? 1 : 0
                })
            });

            if (!res.ok) throw new Error("Gagal server");
            
            if(typeof showModernAlert === 'function') {
                showModernAlert("Berhasil", newState ? "Auto-Assign DIAKTIFKAN. Chat baru akan otomatis dibagi rata ke Agent." : "Auto-Assign DIMATIKAN.", "success");
            }
            
        } catch (error) {
            console.log("Error toggle:", error);
            updateUI(!newState); // Kembalikan posisi toggle jika error
            if(typeof showModernAlert === 'function') {
                showModernAlert("Gagal", "Koneksi ke server bermasalah.", "error");
            }
        }
    }

    function updateUI(isActive) {
        const checkbox = document.getElementById("toggleAutoAssign");
        const bgToggle = document.getElementById("bgToggle");
        const dotToggle = document.getElementById("dotToggle");

        if (!checkbox || !bgToggle || !dotToggle) return;

        checkbox.checked = isActive;
        if (isActive) {
            bgToggle.classList.replace("bg-gray-300", "bg-green-500");
            bgToggle.classList.replace("dark:bg-gray-600", "bg-green-500");
            dotToggle.style.transform = "translateX(100%)";
        } else {
            bgToggle.classList.replace("bg-green-500", "bg-gray-300");
            bgToggle.classList.replace("bg-green-500", "dark:bg-gray-600");
            dotToggle.style.transform = "translateX(0)";
        }
    }

    // Load status saat file diload
    document.addEventListener("DOMContentLoaded", fetchStatus);

    return { toggle };
})();
