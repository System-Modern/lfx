/* =========================================================
   PLANNING LEMBUR - OPTIMIZED, REFINED & FULL LOADING INTEGRATED
   ========================================================= */

/* =========================================================
   STATE MANAGEMENT
   ========================================================= */
let planningCRUDLoading = false;
const PlanningState = {
    previewId: null,
    toastTimer: null,
    loadingInitialized: false,
    searchInitialized: false,
    previewEventsInitialized: false
};

/* =========================================================
   DOM HELPER & UTILITIES
   ========================================================= */
function planningEl(id) {
    return document.getElementById(id);
}

function normalizePlanningSearch(value) {
    return String(value ?? "").toLowerCase().trim();
}

function escapePlanningHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================================
   LOCAL STORAGE & EVIDENCE HELPER
   ========================================================= */
function getPlanningEvidenceKey(id) {
    return `planningEvidence_${String(id ?? "")}`;
}

function getPlanningEvidence(id) {
    try {
        const savedEvidence = localStorage.getItem(getPlanningEvidenceKey(id));
        return savedEvidence ? JSON.parse(savedEvidence) : null;
    } catch (error) {
        return null;
    }
}

/* =========================================================
   MODERN LOADING OVERLAY SYSTEM
   ========================================================= */
function initPlanningLoading() {
    if (planningEl("planningGlobalLoading")) return;

    const loading = document.createElement("div");
    loading.id = "planningGlobalLoading";
    loading.innerHTML = `
        <div class="planning-loading-box">
            <div class="planning-spinner-wrapper">
                <div class="planning-loading-spinner"></div>
                <div class="planning-spinner-glow"></div>
            </div>
            <div class="planning-loading-text" id="planningLoadingText">Memproses Data...</div>
            <div class="planning-loading-subtext">Mohon tunggu sebentar, sistem sedang bekerja</div>
        </div>
    `;

    Object.assign(loading.style, {
        position: "fixed",
        inset: "0",
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(8px)",
        webkitBackdropFilter: "blur(8px)",
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "999999",
        opacity: "0",
        transition: "opacity 0.25s ease-in-out"
    });

    const style = document.createElement("style");
    style.id = "planningLoadingStyle";
    style.textContent = `
        .planning-loading-box {
            min-width: 260px;
            padding: 32px 40px;
            border-radius: 24px;
            background: #ffffff;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            transform: scale(0.9);
            transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        #planningGlobalLoading.visible .planning-loading-box {
            transform: scale(1);
        }
        .planning-spinner-wrapper {
            position: relative;
            width: 54px;
            height: 54px;
            margin: 0 auto 18px;
        }
        .planning-loading-spinner {
            width: 54px;
            height: 54px;
            border: 4px solid #f1f5f9;
            border-top-color: #d71920;
            border-right-color: #d71920;
            border-radius: 50%;
            animation: planningSpin 0.75s cubic-bezier(0.6, 0.2, 0.4, 0.8) infinite;
        }
        .planning-spinner-glow {
            position: absolute;
            inset: -6px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(215,25,32,0.2) 0%, rgba(255,255,255,0) 70%);
        }
        .planning-loading-text {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.3px;
        }
        .planning-loading-subtext {
            font-size: 12px;
            color: #64748b;
            margin-top: 6px;
        }
        @keyframes planningSpin {
            to { transform: rotate(360deg); }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(loading);
}

function showPlanningLoading(text = "Memproses Data...") {
    initPlanningLoading();
    const loading = planningEl("planningGlobalLoading");
    const textElement = planningEl("planningLoadingText");

    if (textElement) textElement.textContent = text;
    if (loading) {
        loading.style.display = "flex";
        requestAnimationFrame(() => {
            loading.style.opacity = "1";
            loading.classList.add("visible");
        });
    }
}

function hidePlanningLoading() {
    const loading = planningEl("planningGlobalLoading");
    if (loading) {
        loading.style.opacity = "0";
        loading.classList.remove("visible");
        setTimeout(() => {
            loading.style.display = "none";
        }, 250);
    }
}

/* =========================================================
   BUTTON LOCK UTILITIES
   ========================================================= */
function lockPlanningButton(button) {
    if (!button) return;
    if (!button.dataset.originalText) {
        button.dataset.originalText = button.innerHTML;
    }
    button.disabled = true;
    button.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:6px;">
            ⏳ Memproses...
        </span>
    `;
}

function unlockPlanningButton(button) {
    if (!button) return;
    button.disabled = false;
    if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
    }
}

/* =========================================================
   SUPABASE & FILE OPERATIONS WITH LOADING
   ========================================================= */
async function uploadPlanningPreview(idPlanning, blob) {
    if (!supabaseClient) {
        throw new Error("Koneksi Supabase belum tersedia.");
    }
    if (!(blob instanceof Blob) || blob.size <= 0) {
        throw new Error("File preview PNG tidak valid.");
    }

    const safeId = String(idPlanning ?? "").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!safeId) {
        throw new Error("ID planning tidak valid.");
    }

    const previewBucket = "planning-bukti";
    const filePath = `${safeId}/preview/${Date.now()}-SPL_${safeId}.png`;

    const { error: uploadError } = await supabaseClient.storage
        .from(previewBucket)
        .upload(filePath, blob, {
            upsert: false,
            contentType: "image/png",
            cacheControl: "0"
        });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseClient.storage
        .from(previewBucket)
        .getPublicUrl(filePath);

    if (!publicData?.publicUrl) {
        throw new Error("URL publik preview tidak berhasil dibuat.");
    }

    const previewUrl = publicData.publicUrl;
    const { error: updateError } = await supabaseClient
        .from("planning_lembur")
        .update({ preview_url: previewUrl })
        .eq("kode_planning", idPlanning);

    if (updateError) throw updateError;

    const planningItem = findPlanningById(idPlanning);
    if (planningItem) {
        planningItem.previewUrl = previewUrl;
    }

    return previewUrl;
}

async function uploadPlanningEvidence(id, button) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx";

    input.addEventListener("change", async function () {
        const file = input.files?.[0];
        const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "xls", "xlsx"];
        const fileExtension = file?.name.split(".").pop().toLowerCase();

        if (!file) return;
        if (!allowedExtensions.includes(fileExtension)) {
            showPlanningToast("error", "Format tidak sesuai", "Gunakan gambar, PDF, Word, atau Excel.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showPlanningToast("error", "File terlalu besar", "Ukuran file maksimal 10 MB.");
            return;
        }
        if (!supabaseClient) {
            showPlanningToast("error", "Upload gagal", "Koneksi database belum tersedia.");
            return;
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${id}/${Date.now()}-${safeName}`;
        
        showPlanningLoading("Mengupload berkas...");
        button.disabled = true;

        try {
            const { error: uploadError } = await supabaseClient.storage
                .from("planning-bukti")
                .upload(filePath, file, { upsert: false, contentType: file.type });

            if (uploadError) throw uploadError;

            const { data: publicData } = supabaseClient.storage
                .from("planning-bukti")
                .getPublicUrl(filePath);

            const { error: updateError } = await supabaseClient
                .from("planning_lembur")
                .update({ bukti_url: publicData.publicUrl, bukti_nama: file.name })
                .eq("kode_planning", id);

            if (updateError) throw updateError;

            const planningItem = findPlanningById(id);
            if (planningItem) {
                planningItem.buktiUrl = publicData.publicUrl;
                planningItem.buktiNama = file.name;
            }

            button.textContent = "✓ Foto";
            button.classList.add("has-file");
            button.title = file.name;
            showPlanningToast("success", "File berhasil diupload", file.name);
        } catch (error) {
            showPlanningToast("error", "Upload gagal", error.message || "Gagal menyimpan file ke database.");
        } finally {
            hidePlanningLoading();
            button.disabled = false;
        }
    }, { once: true });

    input.click();
}

async function downloadPlanningEvidence(id) {
    const planningItem = findPlanningById(id);
    const evidenceUrl = String(planningItem?.buktiUrl || "").trim();
    const evidenceName = String(planningItem?.buktiNama || "").trim();
    const localEvidence = getPlanningEvidence(id);

    if (!evidenceUrl && !localEvidence?.data) {
        showPlanningToast("warning", "Bukti belum tersedia", "Upload file terlebih dahulu.");
        return;
    }

    let fileName = evidenceName || String(localEvidence?.name || "").trim() || `bukti-${id}`;
    showPlanningLoading("Mendownload berkas...");

    try {
        if (evidenceUrl && supabaseClient) {
            const marker = "/storage/v1/object/public/planning-bukti/";
            const markerIndex = evidenceUrl.indexOf(marker);
            if (markerIndex !== -1) {
                const filePath = decodeURIComponent(evidenceUrl.slice(markerIndex + marker.length).split("?")[0]);
                const { data: fileBlob, error: downloadError } = await supabaseClient.storage
                    .from("planning-bukti")
                    .download(filePath);

                if (downloadError) throw downloadError;
                if (!(fileBlob instanceof Blob) || fileBlob.size <= 0) {
                    throw new Error("File bukti kosong atau tidak dapat dibaca.");
                }

                const objectUrl = URL.createObjectURL(fileBlob);
                const link = document.createElement("a");
                link.href = objectUrl;
                link.download = fileName;
                link.style.display = "none";
                document.body.appendChild(link);
                link.click();

                setTimeout(() => {
                    if (link.parentNode) link.parentNode.removeChild(link);
                    URL.revokeObjectURL(objectUrl);
                }, 1000);

                showPlanningToast("success", "Download berhasil", fileName);
                return;
            }
        }

        if (localEvidence?.data) {
            let fileBlob;
            if (localEvidence.data instanceof Blob) {
                fileBlob = localEvidence.data;
            } else if (typeof localEvidence.data === "string" && localEvidence.data.startsWith("data:")) {
                const response = await fetch(localEvidence.data);
                fileBlob = await response.blob();
            } else {
                const response = await fetch(localEvidence.data);
                if (!response.ok) throw new Error(`Gagal mengambil file (${response.status}).`);
                fileBlob = await response.blob();
            }

            const objectUrl = URL.createObjectURL(fileBlob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = fileName;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                if (link.parentNode) link.parentNode.removeChild(link);
                URL.revokeObjectURL(objectUrl);
            }, 1000);

            showPlanningToast("success", "Download berhasil", fileName);
            return;
        }

        if (evidenceUrl) {
            window.open(evidenceUrl, "_blank", "noopener,noreferrer");
            showPlanningToast("warning", "File dibuka", "Browser membuka file karena download langsung tidak tersedia.");
            return;
        }

        throw new Error("Lokasi file bukti tidak ditemukan.");
    } catch (error) {
        console.error("[BUKTI] Download gagal:", error);
        showPlanningToast("error", "Download gagal", error?.message || "File bukti tidak dapat didownload.");
    } finally {
        hidePlanningLoading();
    }
}

async function deletePlanningEvidence(id, button) {
    if (!confirm("Yakin ingin menghapus berkas bukti ini?")) return;

    showPlanningLoading("Menghapus berkas...");
    localStorage.removeItem(getPlanningEvidenceKey(id));
    const planningItem = findPlanningById(id);
    const evidenceUrl = planningItem?.buktiUrl || "";

    try {
        if (supabaseClient) {
            if (evidenceUrl) {
                const marker = "/storage/v1/object/public/planning-bukti/";
                const markerIndex = evidenceUrl.indexOf(marker);
                if (markerIndex !== -1) {
                    const filePath = decodeURIComponent(evidenceUrl.slice(markerIndex + marker.length));
                    const { error: storageError } = await supabaseClient.storage
                        .from("planning-bukti")
                        .remove([filePath]);
                    if (storageError) {
                        throw storageError;
                    }
                }
            }
            const { error } = await supabaseClient
                .from("planning_lembur")
                .update({ bukti_url: null, bukti_nama: null })
                .eq("kode_planning", id);

            if (error) throw error;
        }

        if (planningItem) {
            planningItem.buktiUrl = "";
            planningItem.buktiNama = "";
        }

        const uploadButton = button?.closest(".planning-action-group")?.querySelector(".planning-file-upload");
        if (uploadButton) {
            uploadButton.textContent = "↑ Upload";
            uploadButton.classList.remove("has-file");
            uploadButton.title = "Upload File";
        }

        showPlanningToast("success", "Bukti dihapus", "File bukti berhasil dihapus.");
    } catch (error) {
        showPlanningToast("error", "Hapus gagal", error.message || "Gagal menghapus file.");
    } finally {
        hidePlanningLoading();
    }
}

/* =========================================================
   PESAN JADWAL LEMBUR GENERATOR
   ========================================================= */
function formatTanggalPesanPlanning(tanggal) {
    if (!tanggal) return "-";
    const match = String(tanggal).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return String(tanggal);

    const tahun = Number(match[1]);
    const bulan = Number(match[2]) - 1;
    const hari = Number(match[3]);
    const date = new Date(tahun, bulan, hari);

    if (Number.isNaN(date.getTime())) return String(tanggal);

    const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    return `${namaHari[date.getDay()]} ${hari} ${namaBulan[bulan]} ${tahun}`;
}

function getPlanningTotalManPower(item) {
    if (!item) return 0;
    if (Array.isArray(item.karyawan)) return item.karyawan.length;
    if (Array.isArray(item.karyawanList)) return item.karyawanList.length;
    if (Array.isArray(item.karyawanData)) return item.karyawanData.length;
    if (Array.isArray(item.daftarKaryawan)) return item.daftarKaryawan.length;
    if (Array.isArray(item.employees)) return item.employees.length;
    if (Array.isArray(item.karyawanIds)) return item.karyawanIds.length;
    if (item.karyawan && typeof item.karyawan === "object") return 1;
    return 0;
}

function generatePlanningMessage(idPlanning) {
    const item = findPlanningById(idPlanning);
    if (!item) return "";
    const tanggal = formatTanggalPesanPlanning(item.tanggal);
    const totalManPower = getPlanningTotalManPower(item);
    return `Berikut jadwal lembur hari ${tanggal} total ${totalManPower} man power`;
}

async function copyPlanningMessage(idPlanning) {
    const message = generatePlanningMessage(idPlanning);
    if (!message) {
        showPlanningToast("error", "Gagal membuat pesan", "Data planning tidak ditemukan.");
        return;
    }

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(message);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = message;
            textarea.style.position = "fixed";
            textarea.style.left = "-99999px";
            textarea.style.top = "0";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const berhasil = document.execCommand("copy");
            textarea.remove();
            if (!berhasil) throw new Error("Browser menolak proses copy.");
        }
        showPlanningToast("success", "Pesan berhasil disalin", message);
    } catch (error) {
        console.error("[PESAN PLANNING] Copy gagal:", error);
        showPlanningToast("error", "Copy gagal", "Pesan tidak dapat disalin otomatis.");
    }
}

/* =========================================================
   KARYAWAN HELPERS & SEARCH
   ========================================================= */
function getKaryawanAktif() {
    if (!Array.isArray(karyawan)) return [];
    return karyawan.filter(item => {
        const status = normalizePlanningSearch(item?.status || "Aktif");
        return !["penalti", "nonaktif", "resign"].includes(status);
    });
}

function getPlanningKaryawanId(item) {
    if (!item) return "";
    return String(item.id ?? item.idKaryawan ?? item.ID ?? item.nik ?? item.NIK ?? item.NIB ?? "").trim();
}

function getPlanningKaryawanNama(item) {
    if (!item) return "";
    return String(item.nama ?? item.namaKaryawan ?? item.Nama ?? "").trim();
}

function getPlanningKaryawanIdentifiers(item) {
    if (!item) return [];
    return [item.id, item.idKaryawan, item.ID, item.nik, item.NIK, item.NIB]
        .filter(val => val !== undefined && val !== null && String(val).trim() !== "")
        .map(val => String(val).trim());
}

function getPlanningKaryawanSearchText(item) {
    return normalizePlanningSearch(
        [getPlanningKaryawanNama(item), ...getPlanningKaryawanIdentifiers(item)].join(" ")
    );
}

function sortPlanningKaryawan(data) {
    if (!Array.isArray(data)) return [];
    return [...data].sort((a, b) =>
        getPlanningKaryawanNama(a).localeCompare(getPlanningKaryawanNama(b), "id", { sensitivity: "base" })
    );
}

function getPlanningId(item) {
    return String(item?.idPlanning ?? item?.id ?? "").trim();
}

function findPlanningById(idPlanning) {
    if (!Array.isArray(planning)) return null;
    const target = String(idPlanning);
    return planning.find(item => getPlanningId(item) === target) || null;
}

/* =========================================================
   PLANNING MODAL LOGIC
   ========================================================= */
function openPlanningModal() {
    if (planningCRUDLoading) return;

    const modal = planningEl("planningModal");
    const form = planningEl("formPlanning");
    if (!modal) return;

    if (form) form.reset();

    const tanggal = planningEl("tanggal");
    if (tanggal) {
        const now = new Date();
        const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0];
        tanggal.value = localDate;
    }

    const durasi = planningEl("durasiPlanning");
    const jamMulai = planningEl("jamMulai");
    const jamSelesai = planningEl("jamSelesai");
    const jenisLembur = planningEl("jenisLembur");

    if (durasi) durasi.value = "4 Jam";
    if (jamMulai) jamMulai.value = "17:00";
    if (jamSelesai) jamSelesai.value = "21:00";

    let eligibilityRefreshQueued = false;
    const refreshPlanningEligibility = function () {
        if (eligibilityRefreshQueued) return;
        eligibilityRefreshQueued = true;
        requestAnimationFrame(() => {
            eligibilityRefreshQueued = false;
            renderPlanningKaryawan(search?.value || "");
            updateJumlahKaryawanPlanning();
        });
    };

    [tanggal, jamMulai, jamSelesai, jenisLembur].forEach(field => {
        if (field) {
            field.oninput = refreshPlanningEligibility;
            field.onchange = refreshPlanningEligibility;
        }
    });

    const search = planningEl("planningKaryawanSearch");
    if (search) {
        search.value = "";
        search.oninput = function () {
            renderPlanningKaryawan(this.value);
            updateJumlahKaryawanPlanning();
        };
        search.onkeydown = function (event) {
            if (event.key === "Escape") {
                this.value = "";
                renderPlanningKaryawan("");
                updateJumlahKaryawanPlanning();
                this.focus();
            }
        };
    }

    renderPlanningKaryawan("");
    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("active"));

    updateJumlahKaryawanPlanning();
    hitungDurasiPlanning();

    requestAnimationFrame(() => {
        if (search) search.focus();
    });
}

function closePlanningModal() {
    const modal = planningEl("planningModal");
    if (!modal) return;

    modal.classList.remove("active");
    modal.style.display = "none";

    const search = planningEl("planningSearchKaryawan");
    if (search) search.value = "";

    document.querySelectorAll("#planningKaryawanList input[type='checkbox']")
        .forEach(checkbox => { checkbox.checked = false; });

    updateJumlahKaryawanPlanning();
}

/* =========================================================
   SEARCH & SELECTION IN MODAL
   ========================================================= */
function createPlanningSearch() {
    const container = planningEl("planningKaryawanList");
    if (!container || planningEl("planningSearchKaryawan")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "planning-search-wrapper";
    wrapper.innerHTML = `
        <input
            type="search"
            id="planningSearchKaryawan"
            class="planning-search-input"
            placeholder="Cari nama, NIK, atau NIB..."
            autocomplete="off"
        >
    `;
    container.parentNode.insertBefore(wrapper, container);

    const input = planningEl("planningSearchKaryawan");
    if (input) input.addEventListener("input", filterPlanningKaryawan);

    addPlanningSearchStyle();
}

function addPlanningSearchStyle() {
    if (planningEl("planningSearchStyle")) return;

    const style = document.createElement("style");
    style.id = "planningSearchStyle";
    style.textContent = `
        .planning-search-wrapper { margin-bottom: 12px; }
        .planning-search-input {
            width: 100%; box-sizing: border-box; padding: 11px 13px;
            border: 1px solid #ddd; border-radius: 9px; outline: none; font-size: 14px;
        }
        .planning-search-input:focus {
            border-color: #d71920; box-shadow: 0 0 0 3px rgba(215,25,32,.08);
        }
        .planning-search-empty { padding: 18px; text-align: center; color: #888; font-size: 13px; }
    `;
    document.head.appendChild(style);
}

function filterPlanningKaryawan() {
    const input = planningEl("planningSearchKaryawan");
    const container = planningEl("planningKaryawanList");
    if (!input || !container) return;

    const keyword = normalizePlanningSearch(input.value);
    const items = container.querySelectorAll(".planning-karyawan-item");
    let visible = 0;

    items.forEach(item => {
        const searchText = normalizePlanningSearch(item.dataset.search || "");
        const match = !keyword || searchText.includes(keyword);
        item.style.display = match ? "flex" : "none";
        if (match) visible++;
    });

    let empty = container.querySelector(".planning-search-empty");
    if (empty) empty.remove();

    if (items.length && visible === 0) {
        empty = document.createElement("div");
        empty.className = "planning-search-empty";
        empty.textContent = "Karyawan tidak ditemukan.";
        container.appendChild(empty);
    }
}

/* =========================================================
   OVERTIME RULES & RENDERING
   ========================================================= */
const POLA_KERJA_TANGGAL_MULAI = "2026-08-21";
const POLA_KERJA = ["pagi", "pagi", "malam", "siang", "siang", "malam", "libur", "libur"];

function getPlanningWeekRange(dateValue) {
    if (!dateValue) return null;
    const targetDate = new Date(`${dateValue}T00:00:00`);
    const patternStart = new Date(`${POLA_KERJA_TANGGAL_MULAI}T00:00:00`);
    const daysFromStart = Math.floor((targetDate - patternStart) / 86400000);
    const cycleNumber = Math.floor(daysFromStart / POLA_KERJA.length);

    const cycleStart = new Date(patternStart);
    cycleStart.setDate(patternStart.getDate() + cycleNumber * POLA_KERJA.length);

    const cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleStart.getDate() + POLA_KERJA.length - 1);

    return { start: cycleStart, end: cycleEnd };
}

function getPlanningDurationMinutes(item) {
    if (Number(item?.durasiMenit) > 0) return Number(item.durasiMenit);
    return hitungDurasiDariJam(item?.jamMulai || item?.jam_mulai, item?.jamSelesai || item?.jam_selesai);
}

function getWeeklyOvertimeMinutes(karyawanId, dateValue) {
    const range = getPlanningWeekRange(dateValue);
    const targetId = normalizePlanningSearch(karyawanId);

    if (!range || !Array.isArray(planning)) return 0;

    return planning.filter(item => {
        const itemDate = new Date(`${item.tanggal}T00:00:00`);
        return itemDate >= range.start &&
            itemDate <= range.end &&
            normalizePlanningSearch(item.jenisLembur) !== "tanggal_merah" &&
            Array.isArray(item.karyawan) &&
            item.karyawan.some(employee =>
                getPlanningKaryawanIdentifiers(employee).some(val => normalizePlanningSearch(val) === targetId)
            );
    }).reduce((total, item) => total + getPlanningDurationMinutes(item), 0);
}

function renderPlanningKaryawan(searchTerm = "") {
    const container = planningEl("planningKaryawanList");
    if (!container) return;

    const keyword = normalizePlanningSearch(searchTerm);
    const selectedIds = new Set(
        Array.from(container.querySelectorAll("input[type='checkbox']:checked"))
            .map(checkbox => checkbox.dataset.id)
    );

    const targetDate = planningEl("tanggal")?.value || "";
    const targetType = normalizePlanningSearch(planningEl("jenisLembur")?.value || "harian");
    const planningDuration = hitungDurasiDariJam(planningEl("jamMulai")?.value, planningEl("jamSelesai")?.value);
    const weeklyLimit = 16 * 60;
    const weeklyOvertimeCache = new Map();

    let data = typeof getKaryawanAktif === "function" ? getKaryawanAktif() : [];
    if (!Array.isArray(data)) data = [];

    data = data.map(k => {
        const employeeId = getPlanningKaryawanId(k);
        let weeklyUsed = weeklyOvertimeCache.get(employeeId);
        if (weeklyUsed === undefined) {
            weeklyUsed = getWeeklyOvertimeMinutes(employeeId, targetDate);
            weeklyOvertimeCache.set(employeeId, weeklyUsed);
        }
        const canSelect = !targetDate || targetType === "tanggal_merah" || (weeklyUsed + planningDuration <= weeklyLimit);
        return {
            id: String(getPlanningKaryawanId(k) || "").trim(),
            nama: String(getPlanningKaryawanNama(k) || "").trim(),
            weeklyUsed,
            remaining: Math.max(0, weeklyLimit - weeklyUsed),
            canSelect,
            original: k
        };
    }).filter(k => {
        if (!k.canSelect) return false;
        if (!keyword) return true;
        return `${k.id} ${k.nama}`.toLowerCase().includes(keyword);
    }).sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    if (!data.length) {
        container.innerHTML = `<div style="padding:20px;text-align:center;color:#888;">Karyawan tidak ditemukan.</div>`;
        return;
    }

    container.innerHTML = data.map(k => `
        <label class="planning-karyawan-item" data-id="${escapePlanningHTML(k.id)}" data-nama="${escapePlanningHTML(k.nama)}" data-search="${escapePlanningHTML(`${k.id} ${k.nama}`)}" style="display:flex;align-items:center;gap:10px;padding:10px;cursor:pointer;">
            <input type="checkbox" class="planning-karyawan-checkbox" value="${escapePlanningHTML(k.id)}" data-id="${escapePlanningHTML(k.id)}" data-nama="${escapePlanningHTML(k.nama)}" ${selectedIds.has(k.id) ? "checked" : ""}>
            <div>
                <strong>${escapePlanningHTML(k.nama)}</strong>
                <div style="font-size:12px;color:#888;">${escapePlanningHTML(k.id)}</div>
                <div style="font-size:11px;color:#16803d;">Sisa pola ini: ${(k.remaining / 60).toFixed(1)} jam</div>
            </div>
        </label>
    `).join("");
}

function updateJumlahKaryawanPlanning() {
    const counter = planningEl("jumlahKaryawanPlanning");
    if (!counter) return;
    const total = document.querySelectorAll("#planningKaryawanList input[type='checkbox']:checked").length;
    counter.textContent = `${total} karyawan dipilih`;
}

function pilihSemuaKaryawanPlanning() {
    document.querySelectorAll("#planningKaryawanList input[type='checkbox']").forEach(cb => { cb.checked = true; });
    updateJumlahKaryawanPlanning();
}

function batalSemuaKaryawanPlanning() {
    document.querySelectorAll("#planningKaryawanList input[type='checkbox']").forEach(cb => { cb.checked = false; });
    updateJumlahKaryawanPlanning();
}

function getSelectedPlanningKaryawan() {
    return Array.from(document.querySelectorAll("#planningKaryawanList input[type='checkbox']:checked"))
        .map(cb => ({
            id: String(cb.dataset.id || "").trim(),
            nama: String(cb.dataset.nama || "").trim()
        }))
        .filter(item => item.id || item.nama);
}

/* =========================================================
   CALCULATIONS & FORMATTERS
   ========================================================= */
function hitungDurasiDariJam(jamMulai, jamSelesai) {
    if (!jamMulai || !jamSelesai) return 0;

    const parseTime = time => {
        const parts = String(time).split(":");
        const hour = Number(parts[0]);
        const minute = Number(parts[1]);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;
        return hour * 60 + minute;
    };

    const start = parseTime(jamMulai);
    let end = parseTime(jamSelesai);

    if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
    if (end <= start) end += 1440;

    return end - start;
}

function hitungDurasiPlanning() {
    const mulai = planningEl("jamMulai");
    const selesai = planningEl("jamSelesai");
    const durasi = planningEl("durasiPlanning");

    if (!mulai || !selesai || !durasi) return;
    const total = hitungDurasiDariJam(mulai.value, selesai.value);
    durasi.value = formatDurasiPlanning(total);
}

function formatDurasiPlanning(menit) {
    const total = Number(menit);
    if (!Number.isFinite(total) || total <= 0) return "-";
    const jam = total / 60;
    return `${Number.isInteger(jam) ? jam : Number(jam.toFixed(1))} Jam`;
}

function formatTanggalPlanning(tanggal) {
    if (!tanggal) return "-";
    const parts = String(tanggal).split("-");
    if (parts.length !== 3) return tanggal;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function generatePlanningId() {
    const tanggal = planningEl("tanggal")?.value || new Date().toISOString().split("T")[0];
    const datePart = tanggal.replace(/-/g, "");
    const random = Date.now().toString().slice(-6);
    return `PLN-${datePart}-${random}`;
}

async function simpanPlanningCRUD() {
    if (typeof simpanPlanningSupabase === "function") return simpanPlanningSupabase();
    if (typeof simpanData === "function") return simpanData();
    return true;
}

/* =========================================================
   CRUD OPERATIONS (CREATE, READ, DELETE)
   ========================================================= */
async function buatPlanning() {
    if (planningCRUDLoading) return;

    const tanggal = planningEl("tanggal");
    const jamMulai = planningEl("jamMulai");
    const jamSelesai = planningEl("jamSelesai");
    const keterangan = planningEl("keterangan");
    const jenisLembur = planningEl("jenisLembur");
    const button = planningEl("btnBuatPlanning");

    if (!tanggal?.value) { alert("Tanggal wajib diisi."); tanggal?.focus(); return; }
    if (!jamMulai?.value) { alert("Jam mulai wajib diisi."); jamMulai?.focus(); return; }
    if (!jamSelesai?.value) { alert("Jam selesai wajib diisi."); jamSelesai?.focus(); return; }

    const selected = getSelectedPlanningKaryawan();
    if (!selected.length) { alert("Pilih minimal satu karyawan."); return; }

    const durasiMenit = hitungDurasiDariJam(jamMulai.value, jamSelesai.value);
    if (durasiMenit <= 0) { alert("Durasi lembur tidak valid."); return; }

    const idPlanning = generatePlanningId();
    const dataBaru = {
        id: idPlanning,
        idPlanning: idPlanning,
        tanggal: tanggal.value,
        jamMulai: jamMulai.value,
        jamSelesai: jamSelesai.value,
        durasi: formatDurasiPlanning(durasiMenit),
        durasiMenit,
        keterangan: keterangan?.value.trim() || "",
        jenisLembur: jenisLembur?.value || "harian",
        karyawan: selected,
        createdAt: new Date().toISOString()
    };

    if (!Array.isArray(planning)) planning = [];

    planningCRUDLoading = true;
    lockPlanningButton(button);
    showPlanningLoading("Menyimpan planning baru...");

    planning.push(dataBaru);

    try {
        const result = await simpanPlanningCRUD();
        if (result === false) throw new Error("Database gagal menyimpan planning.");

        const previewSaved = await cetakPlanningPNG(idPlanning, {
            download: false,
            savePreview: true,
            allowWhileSaving: true,
            silent: true
        });

        renderPlanning();
        if (typeof updateDashboard === "function") updateDashboard();
        if (typeof updateKaryawanDropdown === "function") updateKaryawanDropdown();

        closePlanningModal();
        showPlanningToast(
            previewSaved ? "success" : "warning",
            previewSaved ? "Planning berhasil dibuat" : "Planning tersimpan, preview gagal dibuat",
            previewSaved ? `${selected.length} karyawan berhasil ditambahkan dan preview tersimpan.` : "Data tersimpan, tetapi preview_url gagal diperbarui."
        );
    } catch (error) {
        console.error("Gagal membuat planning:", error);
        const index = planning.indexOf(dataBaru);
        if (index !== -1) planning.splice(index, 1);
        showPlanningToast("error", "Planning gagal disimpan", "Data dikembalikan karena penyimpanan gagal.");
    } finally {
        hidePlanningLoading();
        unlockPlanningButton(button);
        planningCRUDLoading = false;
    }
}

function renderPlanning() {
    const tbody = planningEl("planningTable");
    if (!tbody) return;

    tbody.innerHTML = "";
    let data = Array.isArray(planning) ? [...planning] : [];

    const filterTanggal = planningEl("filterTanggal")?.value || "";
    const filterKaryawan = planningEl("filterKaryawan")?.value || "";

    if (filterTanggal) {
        data = data.filter(item => String(item.tanggal || "") === String(filterTanggal));
    }
    if (filterKaryawan) {
        const target = String(filterKaryawan);
        data = data.filter(item =>
            Array.isArray(item.karyawan) &&
            item.karyawan.some(k => String(k.id || k.idKaryawan || k.nik || k.NIK || k.NIB || "") === target)
        );
    }

    data.reverse();

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:25px;color:#888;">Belum ada planning.</td></tr>`;
        const jumlah = planningEl("jumlahPlanningText");
        if (jumlah) jumlah.textContent = "0 Planning";
        return;
    }

    const fragment = document.createDocumentFragment();
    data.forEach((item, index) => {
        const id = getPlanningId(item);
        const savedEvidence = item.buktiUrl ? { name: item.buktiNama } : getPlanningEvidence(id);
        const hasEvidence = Boolean(savedEvidence?.name || item.buktiUrl);

        const uploadBtnText = hasEvidence ? "✓ Foto" : "↑ Upload";
        const uploadBtnClass = hasEvidence ? "planning-file-btn planning-file-upload has-file" : "planning-file-btn planning-file-upload";
        const uploadBtnTitle = hasEvidence ? (savedEvidence?.name || item.buktiNama || "Foto Bukti") : "Upload File";

        const namaKaryawanHTML = Array.isArray(item.karyawan) && item.karyawan.length
            ? item.karyawan.map((k, empIdx) => `<span class="planning-employee-name"><span class="planning-employee-number">${empIdx + 1}.</span>${escapePlanningHTML(k.nama || k.namaKaryawan || "-")}</span>`).join("")
            : `<span class="planning-employee-name">-</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapePlanningHTML(id)}</td>
            <td>${escapePlanningHTML(formatTanggalPlanning(item.tanggal))}</td>
            <td>
                <details class="planning-employee-details">
                    <summary>Lihat daftar karyawan</summary>
                    <div class="planning-employee-list">${namaKaryawanHTML}</div>
                </details>
            </td>
            <td>${escapePlanningHTML(item.jamMulai || "-")} - ${escapePlanningHTML(item.jamSelesai || "-")}</td>
            <td>${escapePlanningHTML(item.durasi || formatDurasiPlanning(item.durasiMenit))}</td>
            <td>${escapePlanningHTML(item.keterangan || "-")}</td>
            <td class="planning-action-cell">
                <div class="planning-action-wrapper">
                    <div class="planning-action-group">
                        <div class="planning-action-label">Aksi Planning</div>
                        <div class="planning-action-box">
                            <button type="button" class="planning-btn planning-btn-preview" data-action="preview" data-id="${escapePlanningHTML(id)}">👁 Preview</button>
                            <button type="button" class="planning-btn planning-btn-edit" data-action="edit" data-id="${escapePlanningHTML(id)}">✏ Edit</button>
                            <button type="button" class="planning-btn planning-btn-download" data-action="cetak" data-id="${escapePlanningHTML(id)}" title="Download Planning">↓ Download</button>
                            <button type="button" class="planning-btn planning-btn-message" data-action="copy-message" data-id="${escapePlanningHTML(id)}" title="Copy Pesan Jadwal Lembur">📋 Copy Pesan</button>
                            <button type="button" class="planning-btn planning-btn-hapus" data-action="hapus" data-id="${escapePlanningHTML(id)}">🗑 Hapus</button>
                        </div>
                    </div>
                    <div class="planning-action-group">
                        <div class="planning-action-label">Aksi untuk Bukti</div>
                        <div class="planning-file-box">
                            <button type="button" class="${uploadBtnClass}" data-action="upload" data-id="${escapePlanningHTML(id)}" title="${escapePlanningHTML(uploadBtnTitle)}">${escapePlanningHTML(uploadBtnText)}</button>
                            <button type="button" class="planning-file-btn planning-file-download" data-action="download" data-id="${escapePlanningHTML(id)}" title="Download File">↓ Download</button>
                            <button type="button" class="planning-file-btn planning-file-delete" data-action="delete-file" data-id="${escapePlanningHTML(id)}" title="Hapus File">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </td>
        `;
        fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);

    const jumlah = planningEl("jumlahPlanningText");
    if (jumlah) jumlah.textContent = `${data.length} Planning`;

    if (!tbody.dataset.planningDelegation) {
        tbody.addEventListener("click", function (event) {
            const button = event.target.closest("[data-action]");
            if (!button) return;

            const action = button.dataset.action;
            const id = button.dataset.id;

            if (action === "preview" || action === "edit") previewPlanning(id);
            if (action === "cetak") cetakPlanningPNG(id);
            if (action === "copy-message") copyPlanningMessage(id);
            if (action === "hapus") hapusPlanning(id);
            if (action === "upload") uploadPlanningEvidence(id, button);
            if (action === "download") downloadPlanningEvidence(id);
            if (action === "delete-file") deletePlanningEvidence(id, button);
        });
        tbody.dataset.planningDelegation = "true";
    }
}

async function hapusPlanning(idPlanning) {
    if (planningCRUDLoading || !Array.isArray(planning)) return;

    if (!confirm("Yakin ingin menghapus planning ini?")) return;

    const index = planning.findIndex(item => getPlanningId(item) === String(idPlanning));
    if (index === -1) { alert("Data planning tidak ditemukan."); return; }

    const dataLama = planning[index];
    planningCRUDLoading = true;
    showPlanningLoading("Menghapus planning...");

    planning.splice(index, 1);

    try {
        const result = await simpanPlanningCRUD();
        if (result === false) throw new Error("Database gagal menghapus planning.");

        renderPlanning();
        if (typeof updateDashboard === "function") updateDashboard();
        showPlanningToast("success", "Planning berhasil dihapus", "Data planning telah berhasil dihapus.");
    } catch (error) {
        console.error("Gagal menghapus planning:", error);
        planning.splice(index, 0, dataLama);
        showPlanningToast("error", "Planning gagal dihapus", "Data dikembalikan karena proses penghapusan gagal.");
    } finally {
        hidePlanningLoading();
        planningCRUDLoading = false;
    }
}

/* =========================================================
   PREVIEW MODAL & EDITING
   ========================================================= */
function addPreviewStyle() {
    if (planningEl("planningPreviewStyle")) return;

    const style = document.createElement("style");
    style.id = "planningPreviewStyle";
    style.textContent = `
        .planning-btn-message { background:#fff7e6; color:#9a6700; border:1px solid #f0d48a; }
        .planning-btn-message:hover { background:#fff0c7; }
        .planning-btn-message:disabled { opacity:.6; cursor:not-allowed; }
        .planning-preview-modal { position:fixed; inset:0; z-index:99998; display:none; align-items:center; justify-content:center; }
        .planning-preview-modal.active { display:flex; }
        .planning-preview-overlay { position:absolute; inset:0; background:rgba(0,0,0,.55); backdrop-filter:blur(3px); }
        .planning-preview-box { position:relative; z-index:2; width:min(900px,94vw); max-height:92vh; overflow:auto; background:#fff; border-radius:16px; box-shadow:0 20px 70px rgba(0,0,0,.25); }
        .planning-preview-header { display:flex; align-items:center; justify-content:space-between; gap:15px; padding:18px 22px; background:#d71920; color:#fff; border-radius:16px 16px 0 0; }
        .planning-preview-header h2 { margin:0; font-size:18px; }
        .planning-preview-close { border:0; background:transparent; color:#fff; font-size:26px; cursor:pointer; }
        .planning-preview-form { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; padding:20px; }
        .planning-preview-field { display:flex; flex-direction:column; gap:6px; }
        .planning-preview-field label { font-size:12px; font-weight:700; color:#555; }
        .planning-preview-field input, .planning-preview-field select, .planning-preview-field textarea { width:100%; box-sizing:border-box; padding:10px 11px; border:1px solid #ddd; border-radius:8px; outline:none; }
        .planning-preview-field input:focus, .planning-preview-field select:focus, .planning-preview-field textarea:focus { border-color:#d71920; }
        .planning-preview-section { padding:0 20px 20px; }
        .planning-preview-section-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
        .planning-preview-section-header h3 { margin:0; font-size:15px; }
        .planning-add-label { color:#73777c; font-size:12px; font-weight:700; cursor:pointer; }
        .planning-preview-search { position:relative; margin-bottom:10px; }
        .planning-preview-search input { width:100%; box-sizing:border-box; padding:11px 13px; border:1px solid #ddd; border-radius:8px; outline:none; }
        .planning-preview-search-result { position:absolute; left:0; right:0; top:calc(100% + 4px); z-index:20; display:none; max-height:220px; overflow:auto; background:#fff; border:1px solid #ddd; border-radius:8px; box-shadow:0 12px 30px rgba(0,0,0,.15); }
        .planning-preview-search-result.active { display:block; }
        .planning-preview-search-item { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border-bottom:1px solid #eee; }
        .planning-preview-search-item:hover { background:#fafafa; }
        .planning-preview-search-info { min-width:0; flex:1; }
        .planning-preview-search-name { font-weight:700; font-size:13px; }
        .planning-preview-search-id { color:#888; font-size:11px; margin-top:3px; }
        .planning-preview-search-add { border:0; background:#d71920; color:#fff; padding:7px 9px; border-radius:7px; cursor:pointer; }
        .planning-preview-search-empty { padding:15px; text-align:center; color:#888; font-size:13px; }
        .planning-preview-karyawan-list { display:flex; flex-direction:column; gap:7px; max-height:300px; overflow:auto; }
        .planning-preview-karyawan-row { display:grid; grid-template-columns:38px 1fr 180px 42px; gap:8px; align-items:center; padding:8px; border:1px solid #eee; border-radius:8px; background:#fafafa; }
        .planning-preview-number { text-align:center; font-weight:700; color:#777; }
        .planning-preview-karyawan-row input { width:100%; box-sizing:border-box; padding:8px 9px; border:1px solid #ddd; border-radius:7px; outline:none; }
        .planning-btn-delete { width:34px; height:34px; border:0; border-radius:7px; background:#fff0f1; color:#d71920; cursor:pointer; }
        .planning-preview-actions { display:flex; justify-content:flex-end; gap:8px; padding:0 20px 20px; }
        .planning-preview-actions button { border:0; padding:10px 16px; border-radius:8px; cursor:pointer; }
        .planning-preview-cancel { background:#eee; color:#333; }
        .planning-btn-save { background:#d71920; color:#fff; }
        @media(max-width:700px) {
            .planning-preview-form { grid-template-columns:1fr; }
            .planning-preview-karyawan-row { grid-template-columns:32px 1fr 38px; }
            .preview-id-input { grid-column:2; }
            .planning-preview-actions { flex-direction:column; }
            .planning-preview-actions button { width:100%; }
        }
    `;
    document.head.appendChild(style);
}

function buatModalPreviewPlanning() {
    let modal = planningEl("planningPreviewModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "planningPreviewModal";
    modal.className = "planning-preview-modal";
    modal.innerHTML = `
        <div class="planning-preview-overlay" data-preview-close></div>
        <div class="planning-preview-box">
            <div class="planning-preview-header">
                <div>
                    <div style="font-size:11px;">PREVIEW PLANNING</div>
                    <h2>Detail Lembur</h2>
                </div>
                <button type="button" class="planning-preview-close" data-preview-close>×</button>
            </div>
            <div id="planningPreviewContent"></div>
        </div>
    `;
    document.body.appendChild(modal);
    addPreviewStyle();

    modal.querySelectorAll("[data-preview-close]").forEach(btn => {
        btn.addEventListener("click", closePreviewPlanning);
    });

    return modal;
}

function previewPlanning(idPlanning) {
    if (planningCRUDLoading) return;

    const item = findPlanningById(idPlanning);
    if (!item) { alert("Data planning tidak ditemukan."); return; }

    const modal = buatModalPreviewPlanning();
    const content = planningEl("planningPreviewContent");
    if (!content) return;

    PlanningState.previewId = getPlanningId(item);
    modal.dataset.idPlanning = PlanningState.previewId;

    const daftar = Array.isArray(item.karyawan)
        ? item.karyawan.map(k => ({
            id: k.id ?? k.idKaryawan ?? k.nik ?? k.NIK ?? k.NIB ?? "",
            nama: k.nama ?? k.namaKaryawan ?? ""
        }))
        : [];

    content.innerHTML = `
        <div class="planning-preview-form">
            <div class="planning-preview-field">
                <label>ID Planning</label>
                <input value="${escapePlanningHTML(getPlanningId(item))}" readonly>
            </div>
            <div class="planning-preview-field">
                <label>Tanggal</label>
                <input type="date" id="previewTanggal" value="${escapePlanningHTML(item.tanggal || "")}">
            </div>
            <div class="planning-preview-field">
                <label>Durasi</label>
                <input id="previewDurasi" value="${escapePlanningHTML(item.durasi || formatDurasiPlanning(item.durasiMenit))}" readonly>
            </div>
            <div class="planning-preview-field">
                <label>Jenis Lembur</label>
                <select id="previewJenisLembur">
                    <option value="harian" ${item.jenisLembur !== "tanggal_merah" ? "selected" : ""}>Harian</option>
                    <option value="tanggal_merah" ${item.jenisLembur === "tanggal_merah" ? "selected" : ""}>Tanggal Merah</option>
                </select>
            </div>
            <div class="planning-preview-field">
                <label>Jam Mulai</label>
                <input type="time" id="previewJamMulai" value="${escapePlanningHTML(item.jamMulai || "")}">
            </div>
            <div class="planning-preview-field">
                <label>Jam Selesai</label>
                <input type="time" id="previewJamSelesai" value="${escapePlanningHTML(item.jamSelesai || "")}">
            </div>
            <div class="planning-preview-field">
                <label>Keterangan</label>
                <input id="previewKeterangan" value="${escapePlanningHTML(item.keterangan || "")}">
            </div>
        </div>
        <div class="planning-preview-section">
            <div class="planning-preview-section-header">
                <div>
                    <h3>Daftar Karyawan</h3>
                    <small id="previewJumlahKaryawan">0 karyawan</small>
                </div>
                <span class="planning-add-label" onclick="tambahKaryawanPreview()">+ Tambah Karyawan</span>
            </div>
            <div class="planning-preview-search">
                <input type="search" id="previewSearchKaryawan" placeholder="Cari nama, NIK, atau NIB..." autocomplete="off">
                <div id="previewSearchResult" class="planning-preview-search-result"></div>
            </div>
            <div id="previewKaryawanList" class="planning-preview-karyawan-list"></div>
        </div>
        <div class="planning-preview-actions">
            <button type="button" class="planning-preview-cancel" onclick="closePreviewPlanning()">Batal</button>
            <button type="button" class="planning-btn-save" onclick="simpanEditPlanning()">Simpan Perubahan</button>
        </div>
    `;

    renderPreviewKaryawan(daftar);
    hitungDurasiPreview();

    const search = planningEl("previewSearchKaryawan");
    if (search) {
        search.addEventListener("input", function () {
            searchKaryawanPreview(search.value);
        });
    }

    modal.classList.add("active");
    modal.style.display = "flex";
}

function renderPreviewKaryawan(daftar) {
    const container = planningEl("previewKaryawanList");
    if (!container) return;

    const data = Array.isArray(daftar)
        ? daftar.map(item => ({
            id: String(item?.id ?? item?.idKaryawan ?? item?.nik ?? item?.NIK ?? item?.NIB ?? "").trim(),
            nama: String(item?.nama ?? item?.namaKaryawan ?? "").trim()
        })).filter(item => item.id || item.nama)
        : [];

    if (!data.length) {
        container.innerHTML = `<div class="planning-preview-search-empty">Belum ada karyawan.</div>`;
        updatePreviewJumlahKaryawan();
        return;
    }

    container.innerHTML = data.map((item, index) => `
        <div class="planning-preview-karyawan-row">
            <div class="planning-preview-number">${index + 1}</div>
            <input type="text" class="preview-nama-input" value="${escapePlanningHTML(item.nama)}" placeholder="Nama karyawan">
            <input type="text" class="preview-id-input" value="${escapePlanningHTML(item.id)}" placeholder="ID Karyawan (angka)" inputmode="numeric" pattern="[0-9]*" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
            <button type="button" class="planning-btn-delete" onclick="hapusKaryawanPreview(this)">×</button>
        </div>
    `).join("");

    updatePreviewJumlahKaryawan();
}

function updatePreviewJumlahKaryawan() {
    const container = planningEl("previewKaryawanList");
    const counter = planningEl("previewJumlahKaryawan");
    if (!container || !counter) return;

    const total = container.querySelectorAll(".planning-preview-karyawan-row").length;
    counter.textContent = `${total} karyawan`;
}

function focusSearchPreview() {
    const search = planningEl("previewSearchKaryawan");
    if (!search) return;
    search.focus();
    search.scrollIntoView({ behavior: "smooth", block: "center" });
}

function searchKaryawanPreview(keyword) {
    const result = planningEl("previewSearchResult");
    if (!result) return;

    const search = normalizePlanningSearch(keyword);
    if (!search) {
        result.innerHTML = "";
        result.classList.remove("active");
        return;
    }

    const rows = Array.from(document.querySelectorAll("#previewKaryawanList .planning-preview-karyawan-row"));
    const existingIds = new Set();
    rows.forEach(row => {
        const input = row.querySelector(".preview-id-input");
        if (input) {
            const id = normalizePlanningSearch(input.value);
            if (id) existingIds.add(id);
        }
    });

    const employees = sortPlanningKaryawan(getKaryawanAktif());
    const matches = employees.filter(item => {
        const searchText = getPlanningKaryawanSearchText(item);
        const identifiers = getPlanningKaryawanIdentifiers(item).map(normalizePlanningSearch);
        const duplicate = identifiers.some(id => existingIds.has(id));
        return searchText.includes(search) && !duplicate;
    }).slice(0, 20);

    if (!matches.length) {
        result.innerHTML = `<div class="planning-preview-search-empty">Karyawan tidak ditemukan atau sudah ada.</div>`;
        result.classList.add("active");
        return;
    }

    result.innerHTML = matches.map(item => {
        const id = getPlanningKaryawanId(item);
        const nama = getPlanningKaryawanNama(item);
        return `
            <div class="planning-preview-search-item">
                <div class="planning-preview-search-info">
                    <div class="planning-preview-search-name">${escapePlanningHTML(nama)}</div>
                    <div class="planning-preview-search-id">${escapePlanningHTML(id || "-")}</div>
                </div>
                <button type="button" class="planning-preview-search-add" data-add-id="${escapePlanningHTML(id)}" data-add-nama="${escapePlanningHTML(nama)}">+ Tambah</button>
            </div>
        `;
    }).join("");

    result.classList.add("active");

    if (!result.dataset.delegation) {
        result.addEventListener("click", function (event) {
            const button = event.target.closest("[data-add-id]");
            if (!button) return;
            tambahKaryawanDariSearch(button.dataset.addId, button.dataset.addNama);
        });
        result.dataset.delegation = "true";
    }
}

function tambahKaryawanDariSearch(id, nama) {
    const container = planningEl("previewKaryawanList");
    if (!container) return;

    const targetId = normalizePlanningSearch(id);
    const rows = Array.from(container.querySelectorAll(".planning-preview-karyawan-row"));
    const duplicate = rows.some(row => {
        const input = row.querySelector(".preview-id-input");
        return input && normalizePlanningSearch(input.value) === targetId;
    });

    if (duplicate) {
        showPlanningToast("warning", "Karyawan sudah ada", "Karyawan tersebut sudah ada di planning.");
        return;
    }

    const dataSaatIni = rows.map(row => ({
        id: row.querySelector(".preview-id-input")?.value.trim() || "",
        nama: row.querySelector(".preview-nama-input")?.value.trim() || ""
    }));

    dataSaatIni.push({
        id: String(id || "").trim(),
        nama: String(nama || "").trim()
    });

    dataSaatIni.sort((a, b) => String(a.nama).localeCompare(String(b.nama), "id", { sensitivity: "base" }));

    renderPreviewKaryawan(dataSaatIni);

    const search = planningEl("previewSearchKaryawan");
    const result = planningEl("previewSearchResult");
    if (search) search.value = "";
    if (result) {
        result.innerHTML = "";
        result.classList.remove("active");
    }
}

function tambahKaryawanPreview() {
    focusSearchPreview();
}

function hapusKaryawanPreview(button) {
    if (planningCRUDLoading) return;
    const row = button?.closest(".planning-preview-karyawan-row");
    const container = planningEl("previewKaryawanList");
    if (!row || !container) return;

    const rows = container.querySelectorAll(".planning-preview-karyawan-row");
    if (rows.length <= 1) {
        alert("Minimal harus ada satu karyawan.");
        return;
    }

    row.remove();
    updatePreviewNomor();
    updatePreviewJumlahKaryawan();
}

function updatePreviewNomor() {
    const container = planningEl("previewKaryawanList");
    if (!container) return;

    container.querySelectorAll(".planning-preview-karyawan-row").forEach((row, index) => {
        const nomor = row.querySelector(".planning-preview-number");
        if (nomor) nomor.textContent = index + 1;
    });
}

function hitungDurasiPreview() {
    const mulai = planningEl("previewJamMulai");
    const selesai = planningEl("previewJamSelesai");
    const durasi = planningEl("previewDurasi");

    if (!mulai || !selesai || !durasi) return;
    const total = hitungDurasiDariJam(mulai.value, selesai.value);
    durasi.value = formatDurasiPlanning(total);
}

function closePreviewPlanning() {
    const modal = planningEl("planningPreviewModal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.style.display = "none";
    PlanningState.previewId = null;
}

async function simpanEditPlanning() {
    if (planningCRUDLoading) return;

    const modal = planningEl("planningPreviewModal");
    if (!modal) return;

    const idPlanning = modal.dataset.idPlanning;
    if (!idPlanning || !Array.isArray(planning)) {
        alert("Data planning tidak ditemukan.");
        return;
    }

    const index = planning.findIndex(item => getPlanningId(item) === String(idPlanning));
    if (index === -1) { alert("Planning tidak ditemukan."); return; }

    const tanggal = planningEl("previewTanggal");
    const jamMulai = planningEl("previewJamMulai");
    const jamSelesai = planningEl("previewJamSelesai");
    const keterangan = planningEl("previewKeterangan");
    const jenisLembur = planningEl("previewJenisLembur");

    if (!tanggal?.value) { alert("Tanggal wajib diisi."); tanggal?.focus(); return; }
    if (!jamMulai?.value) { alert("Jam mulai wajib diisi."); jamMulai?.focus(); return; }
    if (!jamSelesai?.value) { alert("Jam selesai wajib diisi."); jamSelesai?.focus(); return; }

    const rows = document.querySelectorAll("#previewKaryawanList .planning-preview-karyawan-row");
    if (!rows.length) { alert("Minimal harus ada satu karyawan."); return; }

    const daftarKaryawan = [];
    const idSet = new Set();
    let valid = true;

    rows.forEach(row => {
        const nama = row.querySelector(".preview-nama-input")?.value.trim() || "";
        const id = row.querySelector(".preview-id-input")?.value.trim() || "";

        if (!nama || !/^\d+$/.test(id)) valid = false;

        const normalizedId = normalizePlanningSearch(id);
        if (normalizedId && idSet.has(normalizedId)) valid = false;
        if (normalizedId) idSet.add(normalizedId);

        daftarKaryawan.push({ id, nama });
    });

    if (!valid) {
        alert("Nama wajib diisi dan ID karyawan harus berupa angka serta tidak boleh duplikat.");
        return;
    }

    daftarKaryawan.sort((a, b) => a.nama.localeCompare(b.nama, "id", { sensitivity: "base" }));

    const durasiMenit = hitungDurasiDariJam(jamMulai.value, jamSelesai.value);
    if (durasiMenit <= 0) { alert("Durasi lembur tidak valid."); return; }

    const button = modal.querySelector(".planning-btn-save");
    const dataLama = JSON.parse(JSON.stringify(planning[index]));

    planningCRUDLoading = true;
    lockPlanningButton(button);
    showPlanningLoading("Menyimpan perubahan data...");

    try {
        planning[index] = {
            ...planning[index],
            tanggal: tanggal.value,
            jamMulai: jamMulai.value,
            jamSelesai: jamSelesai.value,
            durasi: formatDurasiPlanning(durasiMenit),
            durasiMenit,
            keterangan: keterangan?.value.trim() || "",
            jenisLembur: jenisLembur?.value || "harian",
            karyawan: daftarKaryawan
        };

        const result = await simpanPlanningCRUD();
        if (result === false) throw new Error("Database gagal menyimpan perubahan.");

        const previewSaved = await cetakPlanningPNG(idPlanning, {
            download: false,
            savePreview: true,
            allowWhileSaving: true,
            silent: true
        });

        renderPlanning();
        if (typeof updateDashboard === "function") updateDashboard();
        if (typeof updateKaryawanDropdown === "function") updateKaryawanDropdown();

        closePreviewPlanning();
        showPlanningToast(
            previewSaved ? "success" : "warning",
            previewSaved ? "Perubahan berhasil disimpan" : "Perubahan tersimpan, preview gagal dibuat",
            previewSaved ? "Data planning, daftar karyawan, dan preview berhasil diperbarui." : "Data tersimpan, tetapi preview_url gagal diperbarui."
        );
    } catch (error) {
        console.error("Gagal menyimpan perubahan:", error);
        planning[index] = dataLama;
        showPlanningToast("error", "Perubahan gagal disimpan", "Data planning dikembalikan ke kondisi sebelumnya.");
    } finally {
        hidePlanningLoading();
        unlockPlanningButton(button);
        planningCRUDLoading = false;
    }
}

function resetFilter() {
    const tanggal = planningEl("filterTanggal");
    const karyawanFilter = planningEl("filterKaryawan");

    if (tanggal) tanggal.value = "";
    if (karyawanFilter) karyawanFilter.value = "";

    renderPlanning();
}

/* =========================================================
   TOAST NOTIFICATION SYSTEM
   ========================================================= */
function initPlanningToast() {
    if (planningEl("planningToastContainer")) return;

    const container = document.createElement("div");
    container.id = "planningToastContainer";
    container.innerHTML = `
        <div id="planningToast" class="planning-toast">
            <div id="planningToastIcon" class="planning-toast-icon">✓</div>
            <div class="planning-toast-content">
                <div id="planningToastTitle" class="planning-toast-title">Berhasil</div>
                <div id="planningToastMessage" class="planning-toast-message"></div>
            </div>
            <button type="button" id="planningToastClose" class="planning-toast-close">×</button>
        </div>
    `;

    const style = document.createElement("style");
    style.id = "planningToastStyle";
    style.textContent = `
        #planningToastContainer { position:fixed; top:24px; right:24px; z-index:1000000; pointer-events:none; }
        .planning-toast { min-width:320px; max-width:420px; display:flex; align-items:center; gap:13px; padding:14px 15px; background:#fff; border:1px solid #e8e8e8; border-radius:13px; box-shadow:0 15px 45px rgba(0,0,0,.16); transform:translateX(120%); opacity:0; transition:transform .35s ease, opacity .35s ease; pointer-events:auto; }
        .planning-toast.show { transform:translateX(0); opacity:1; }
        .planning-toast-icon { width:38px; height:38px; min-width:38px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#e9f8ef; color:#1d9b52; font-size:19px; font-weight:800; }
        .planning-toast-content { flex:1; min-width:0; }
        .planning-toast-title { font-size:14px; font-weight:750; color:#222; line-height:1.3; }
        .planning-toast-message { margin-top:3px; font-size:12px; line-height:1.45; color:#777; }
        .planning-toast-close { width:28px; height:28px; border:0; background:transparent; color:#999; font-size:20px; line-height:1; border-radius:6px; cursor:pointer; }
        .planning-toast-close:hover { background:#f4f4f4; color:#333; }
        .planning-toast.success .planning-toast-icon { background:#e9f8ef; color:#1d9b52; }
        .planning-toast.error .planning-toast-icon { background:#fff0f1; color:#d71920; }
        .planning-toast.warning .planning-toast-icon { background:#fff7e6; color:#d98a00; }
        @media(max-width:600px) {
            #planningToastContainer { top:15px; left:15px; right:15px; }
            .planning-toast { min-width:0; width:100%; max-width:none; }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(container);

    const close = planningEl("planningToastClose");
    if (close) close.addEventListener("click", hidePlanningToast);
}

function showPlanningToast(type = "success", title = "Berhasil", message = "", duration = 3500) {
    initPlanningToast();
    const toast = planningEl("planningToast");
    const icon = planningEl("planningToastIcon");
    const titleElement = planningEl("planningToastTitle");
    const messageElement = planningEl("planningToastMessage");

    if (!toast || !icon || !titleElement || !messageElement) return;

    clearTimeout(PlanningState.toastTimer);
    toast.classList.remove("success", "error", "warning", "show");

    const icons = { success: "✓", error: "×", warning: "!" };
    icon.textContent = icons[type] || "✓";
    titleElement.textContent = title;
    messageElement.textContent = message;

    toast.classList.add(type);
    requestAnimationFrame(() => toast.classList.add("show"));

    PlanningState.toastTimer = setTimeout(hidePlanningToast, duration);
}

function hidePlanningToast() {
    const toast = planningEl("planningToast");
    if (toast) toast.classList.remove("show");
}

function tampilkanNotifPlanning(tipe, judul, pesan) { showPlanningToast(tipe, judul, pesan); }
function planningToastSuccess(title, message) { showPlanningToast("success", title, message); }

/* =========================================================
   EXPORT / CETAK PNG JADWAL LEMBUR WITH LOADING
   ========================================================= */
async function cetakPlanningPNG(idPlanning, options = {}) {
    const shouldDownload = options.download !== false;
    const shouldSavePreview = options.savePreview !== false;
    const allowWhileSaving = options.allowWhileSaving === true;
    const silent = options.silent === true;

    if (planningCRUDLoading && !allowWhileSaving) return false;

    const item = findPlanningById(idPlanning);
    if (!item) {
        if (!silent) alert("Data planning tidak ditemukan.");
        return false;
    }

    if (typeof html2canvas === "undefined") {
        if (!silent) alert("Library html2canvas belum termuat.");
        return false;
    }

    planningCRUDLoading = true;
    showPlanningLoading("Menyiapkan & Rendern Dokumen PNG...");

    let exportContainer = null;

    try {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const id = getPlanningId(item) || item.idPlanning || item.id || idPlanning || "-";
        const tanggal = item.tanggal || "-";
        const tanggalTampil = formatTanggalPlanning(tanggal);
        const jamMulai = item.jamMulai || item.jam_mulai || "-";
        const jamSelesai = item.jamSelesai || item.jam_selesai || "-";

        let durasi = item.durasi || item.durasiLembur || null;
        if (!durasi && item.durasiMenit !== undefined && item.durasiMenit !== null) {
            durasi = formatDurasiPlanning(item.durasiMenit);
        }
        durasi = durasi || "-";

        const masterKaryawan = Array.isArray(window.karyawanData) ? window.karyawanData : [];

        function getKaryawanKey(data) {
            if (!data) return null;
            if (typeof data !== "object") return String(data).trim();
            const keys = ["idKaryawan", "id_karyawan", "employeeId", "employee_id", "id", "nik", "NIK"];
            for (let k of keys) {
                if (data[k] !== undefined && data[k] !== null && String(data[k]).trim() !== "") {
                    return String(data[k]).trim();
                }
            }
            return null;
        }

        function findMasterKaryawan(data) {
            const key = getKaryawanKey(data);
            if (!key) return null;
            return masterKaryawan.find(k => {
                const masterKey = getKaryawanKey(k);
                return masterKey && String(masterKey).toLowerCase() === String(key).toLowerCase();
            }) || null;
        }

        let daftarKaryawan = [];
        if (Array.isArray(item.karyawan)) daftarKaryawan = item.karyawan.slice();
        else if (Array.isArray(item.karyawanList)) daftarKaryawan = item.karyawanList.slice();
        else if (Array.isArray(item.employees)) daftarKaryawan = item.employees.slice();

        const karyawanFinal = daftarKaryawan.map(dataKaryawan => {
            let data = dataKaryawan;
            const master = findMasterKaryawan(data);
            if (master && typeof data === "object") data = { ...master, ...data };
            else if (master) data = master;

            if (!data) return { nama: "-", nik: "-" };
            if (typeof data !== "object") {
                const masterData = findMasterKaryawan(data);
                if (masterData) data = masterData;
                else return { nama: String(data), nik: String(data) };
            }

            const nama = data.nama || data.namaKaryawan || data.nama_lengkap || data.name || "-";
            const nik = data.nik || data.NIK || data.nikKaryawan || data.employeeId || data.id || "-";
            return { nama: String(nama).trim(), nik: String(nik).trim() };
        });

        const dataKaryawan = karyawanFinal.filter(d => d.nama !== "-" || d.nik !== "-");
        if (!dataKaryawan.length) dataKaryawan.push({ nama: "Tidak ada data karyawan", nik: "-" });

        const jumlahKaryawan = dataKaryawan.length;
        let rowPadding = jumlahKaryawan <= 5 ? 14 : jumlahKaryawan <= 10 ? 12 : jumlahKaryawan <= 15 ? 10 : 8;
        let employeeFontSize = jumlahKaryawan <= 5 ? 13 : jumlahKaryawan <= 10 ? 12.5 : 11;

        let employeeRows = dataKaryawan.map((k, index) => `
            <tr>
                <td style="width:55px;padding:${rowPadding}px 6px;text-align:center;background:#f5f5f5;border:1px solid #d7d7d7;font-size:${employeeFontSize}px;">${index + 1}</td>
                <td style="width:350px;padding:${rowPadding}px 14px;text-align:left;background:#ffffff;border:1px solid #d7d7d7;font-size:${employeeFontSize}px;">${escapePlanningHTML(k.nama)}</td>
                <td style="width:255px;padding:${rowPadding}px 14px;text-align:left;background:#f5f5f5;border:1px solid #d7d7d7;font-size:${employeeFontSize}px;">${escapePlanningHTML(k.nik)}</td>
            </tr>
        `).join("");

        exportContainer = document.createElement("div");
        Object.assign(exportContainer.style, {
            position: "fixed", left: "-100000px", top: "0", width: "794px", height: "auto",
            background: "#ffffff", margin: "0", padding: "0", boxSizing: "border-box"
        });

        exportContainer.innerHTML = `
            <div style="width:794px;min-height:1123px;background:#ffffff;color:#202020;font-family:Arial,sans-serif;box-sizing:border-box;">
                <div style="width:794px;height:112px;background:rgb(247,244,15);display:flex;align-items:center;padding:0 55px;box-sizing:border-box;">
                    <div style="flex:1;">
                        <div style="font-size:20px;font-weight:800;">PT LINFOX LOGISTICS INDONESIA</div>
                        <div style="font-size:9.5px;color:#555;font-weight:600;margin-top:6px;">LOGISTICS & SUPPLY CHAIN MANAGEMENT</div>
                    </div>
                    <div style="width:104px;height:54px;background:#202020;border-radius:8px;display:flex;flex-direction:column;justify-content:center;align-items:center;">
                        <div style="color:rgb(247,244,15);font-size:10px;font-weight:800;">DOKUMEN</div>
                        <div style="color:#ffffff;font-size:9px;margin-top:4px;">LEMBUR</div>
                    </div>
                </div>
                <div style="width:660px;margin:24px auto 0;text-align:center;">
                    <div style="font-size:23px;font-weight:800;">SURAT PERINTAH LEMBUR</div>
                    <div style="margin-top:7px;font-size:10px;color:#666;">Planning ID : ${escapePlanningHTML(id)}</div>
                </div>
                <div style="width:660px;margin:27px auto 0;">
                    <table style="width:660px;border-collapse:collapse;font-size:11.5px;">
                        <tr>
                            <td style="padding:11px;background:#e5e5e5;font-weight:700;">Tanggal</td>
                            <td style="padding:11px;background:#fff;">${escapePlanningHTML(tanggalTampil)}</td>
                            <td style="padding:11px;background:#e5e5e5;font-weight:700;">Jam Lembur</td>
                            <td style="padding:11px;background:#fff;">${escapePlanningHTML(jamMulai)} - ${escapePlanningHTML(jamSelesai)}</td>
                        </tr>
                        <tr>
                            <td style="padding:11px;background:#e5e5e5;font-weight:700;">Durasi</td>
                            <td style="padding:11px;background:#fff;">${escapePlanningHTML(durasi)}</td>
                            <td style="padding:11px;background:#e5e5e5;font-weight:700;">Keterangan</td>
                            <td style="padding:11px;background:#fff;">${escapePlanningHTML(item.keterangan || "-")}</td>
                        </tr>
                    </table>
                </div>
                <div style="width:660px;margin:20px auto 0;">
                    <table style="width:660px;border-collapse:collapse;">
                        <thead>
                            <tr style="background:#202020;color:#fff;">
                                <th style="padding:10px;width:55px;">No</th>
                                <th style="padding:10px;width:350px;text-align:left;">Nama Karyawan</th>
                                <th style="padding:10px;width:255px;text-align:left;">NIK / ID</th>
                            </tr>
                        </thead>
                        <tbody>${employeeRows}</tbody>
                    </table>
                </div>
            </div>
        `;

        document.body.appendChild(exportContainer);

        const canvas = await html2canvas(exportContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff"
        });

        let previewSaved = false;

        if (shouldSavePreview) {
            try {
                const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
                if (blob) {
                    await uploadPlanningPreview(id, blob);
                    previewSaved = true;
                }
            } catch (err) {
                console.error("Gagal menyimpan preview ke Supabase:", err);
            }
        }

        if (shouldDownload) {
            const imageURL = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = imageURL;
            link.download = `SPL_${id}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();

            if (!silent) {
                showPlanningToast("success", "Download berhasil", `SPL_${id}.png`);
            }
        }

        return previewSaved;
    } catch (err) {
        console.error("Error cetak PNG:", err);
        if (!silent) showPlanningToast("error", "Gagal mencetak PNG", err.message);
        return false;
    } finally {
        if (exportContainer && exportContainer.parentNode) {
            exportContainer.parentNode.removeChild(exportContainer);
        }
        hidePlanningLoading();
        planningCRUDLoading = false;
    }
}