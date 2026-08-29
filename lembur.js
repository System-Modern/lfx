    /* =========================================================
    PLANNING LEMBUR - OPTIMIZED
    ========================================================= */

    /* =========================================================
    STATE
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
    DOM HELPER
    ========================================================= */

    function planningEl(id) {
        return document.getElementById(id);
    }


    /* =========================================================
    NORMALIZER
    ========================================================= */

    function normalizePlanningSearch(value) {
        return String(value ?? "")
            .toLowerCase()
            .trim();
    }


    /* =========================================================
    ESCAPE HTML
    ========================================================= */

    function escapePlanningHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getPlanningEvidenceKey(id) {
        return `planningEvidence_${String(id ?? "")}`;
    }

    function getPlanningEvidence(id) {
        try {
            const savedEvidence = localStorage.getItem(
                getPlanningEvidenceKey(id)
            );
            return savedEvidence ? JSON.parse(savedEvidence) : null;
        } catch (error) {
            return null;
        }
    }

    async function uploadPlanningEvidence(id, button) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx";

        input.addEventListener("change", async function () {
            const file = input.files?.[0];
            const allowedExtensions = [
                "jpg", "jpeg", "png", "gif", "webp",
                "pdf", "doc", "docx", "xls", "xlsx"
            ];
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
                button.disabled = false;
            }
        }, { once: true });

        input.click();
    }

    async function downloadPlanningEvidence(id) {
        const planningItem = findPlanningById(id);
        const evidence = planningItem?.buktiUrl
            ? { name: planningItem.buktiNama, data: planningItem.buktiUrl }
            : getPlanningEvidence(id);

        if (!evidence) {
            showPlanningToast("warning", "Bukti belum tersedia", "Upload file terlebih dahulu.");
            return;
        }

        try {
            const response = await fetch(evidence.data);
            const fileBlob = await response.blob();
            const link = document.createElement("a");
            const objectUrl = URL.createObjectURL(fileBlob);
            link.href = objectUrl;
            link.download = evidence.name || `bukti-${id}`;
            link.click();
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            window.open(evidence.data, "_blank", "noopener");
        }
    }

    async function deletePlanningEvidence(id, button) {
        localStorage.removeItem(getPlanningEvidenceKey(id));
        const planningItem = findPlanningById(id);
        const evidenceUrl = planningItem?.buktiUrl || "";

        if (supabaseClient) {
            if (evidenceUrl) {
                const marker = "/storage/v1/object/public/planning-bukti/";
                const markerIndex = evidenceUrl.indexOf(marker);
                if (markerIndex !== -1) {
                    const filePath = decodeURIComponent(evidenceUrl.slice(markerIndex + marker.length));
                    const { error: storageError } = await supabaseClient.storage
                        .from("planning-bukti").remove([filePath]);
                    if (storageError) {
                        showPlanningToast("error", "Hapus gagal", storageError.message);
                        return;
                    }
                }
            }

            const { error } = await supabaseClient.from("planning_lembur")
                .update({ bukti_url: null, bukti_nama: null })
                .eq("kode_planning", id);
            if (error) {
                showPlanningToast("error", "Hapus gagal", error.message);
                return;
            }
        }

        if (planningItem) {
            planningItem.buktiUrl = "";
            planningItem.buktiNama = "";
        }

        const uploadButton = button?.closest(".planning-action-group")
            ?.querySelector(".planning-file-upload");
        if (uploadButton) {
            uploadButton.textContent = "↑ Upload";
            uploadButton.classList.remove("has-file");
            uploadButton.title = "Upload File";
        }

        showPlanningToast("success", "Bukti dihapus", "File bukti berhasil dihapus.");
    }


    /* =========================================================
    KARYAWAN HELPER
    ========================================================= */

    function getKaryawanAktif() {

        if (!Array.isArray(karyawan)) {
            return [];
        }

        return karyawan.filter(function (item) {

            const status = normalizePlanningSearch(
                item?.status || "Aktif"
            );

            return ![
                "penalti",
                "nonaktif",
                "resign"
            ].includes(status);

        });

    }


    /* =========================================================
    GET ID KARYAWAN
    ========================================================= */

    function getPlanningKaryawanId(item) {

        if (!item) {
            return "";
        }

        return String(
            item.id ??
            item.idKaryawan ??
            item.ID ??
            item.nik ??
            item.NIK ??
            item.NIB ??
            ""
        ).trim();

    }


    /* =========================================================
    GET NAMA KARYAWAN
    ========================================================= */

    function getPlanningKaryawanNama(item) {

        if (!item) {
            return "";
        }

        return String(
            item.nama ??
            item.namaKaryawan ??
            item.Nama ??
            ""
        ).trim();

    }


    /* =========================================================
    SEMUA IDENTITAS KARYAWAN
    ========================================================= */

    function getPlanningKaryawanIdentifiers(item) {

        if (!item) {
            return [];
        }

        return [
            item.id,
            item.idKaryawan,
            item.ID,
            item.nik,
            item.NIK,
            item.NIB
        ]
            .filter(function (value) {
                return value !== undefined &&
                    value !== null &&
                    String(value).trim() !== "";
            })
            .map(function (value) {
                return String(value).trim();
            });

    }


    /* =========================================================
    SEARCH TEXT KARYAWAN
    ========================================================= */

    function getPlanningKaryawanSearchText(item) {

        return normalizePlanningSearch(
            [
                getPlanningKaryawanNama(item),
                ...getPlanningKaryawanIdentifiers(item)
            ].join(" ")
        );

    }


    /* =========================================================
    SORT KARYAWAN
    ========================================================= */

    function sortPlanningKaryawan(data) {

        if (!Array.isArray(data)) {
            return [];
        }

        return [...data].sort(function (a, b) {

            return getPlanningKaryawanNama(a)
                .localeCompare(
                    getPlanningKaryawanNama(b),
                    "id",
                    {
                        sensitivity: "base"
                    }
                );

        });

    }


    /* =========================================================
    GET PLANNING ID
    ========================================================= */

    function getPlanningId(item) {

        return String(
            item?.idPlanning ??
            item?.id ??
            ""
        ).trim();

    }


    /* =========================================================
    FIND PLANNING
    ========================================================= */

    function findPlanningById(idPlanning) {

        if (!Array.isArray(planning)) {
            return null;
        }

        const target = String(idPlanning);

        return planning.find(function (item) {

            return getPlanningId(item) === target;

        }) || null;

    }


    /* =========================================================
    LOADING
    ========================================================= */

    function initPlanningLoading() {

        if (planningEl("planningGlobalLoading")) {
            return;
        }

        const loading = document.createElement("div");

        loading.id = "planningGlobalLoading";

        loading.innerHTML = `
            <div class="planning-loading-box">
                <div class="planning-loading-spinner"></div>
                <div
                    class="planning-loading-text"
                    id="planningLoadingText"
                >
                    Memproses...
                </div>
            </div>
        `;

        Object.assign(loading.style, {
            position: "fixed",
            inset: "0",
            background: "rgba(0,0,0,.35)",
            backdropFilter: "blur(3px)",
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "999998"
        });

        const style = document.createElement("style");

        style.id = "planningLoadingStyle";

        style.textContent = `
            .planning-loading-box {
                min-width: 220px;
                padding: 25px 30px;
                border-radius: 15px;
                background: #fff;
                box-shadow: 0 15px 50px rgba(0,0,0,.2);
                text-align: center;
                font-family: Arial, sans-serif;
            }

            .planning-loading-spinner {
                width: 38px;
                height: 38px;
                margin: 0 auto 14px;
                border: 4px solid #eee;
                border-top-color: #d71920;
                border-radius: 50%;
                animation: planningSpin .8s linear infinite;
            }

            .planning-loading-text {
                font-size: 14px;
                font-weight: 600;
                color: #333;
            }

            @keyframes planningSpin {
                to {
                    transform: rotate(360deg);
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(loading);

    }


    function showPlanningLoading(text = "Memproses...") {

        initPlanningLoading();

        const loading = planningEl(
            "planningGlobalLoading"
        );

        const textElement = planningEl(
            "planningLoadingText"
        );

        if (textElement) {
            textElement.textContent = text;
        }

        if (loading) {
            loading.style.display = "flex";
        }

    }


    function hidePlanningLoading() {

        const loading = planningEl(
            "planningGlobalLoading"
        );

        if (loading) {
            loading.style.display = "none";
        }

    }


    /* =========================================================
    BUTTON LOCK
    ========================================================= */

    function lockPlanningButton(button) {

        if (!button) {
            return;
        }

        if (!button.dataset.originalText) {
            button.dataset.originalText =
                button.innerHTML;
        }

        button.disabled = true;

        button.innerHTML = `
            <span style="
                display:inline-flex;
                align-items:center;
                gap:6px;
            ">
                ⏳ Memproses...
            </span>
        `;

    }


    function unlockPlanningButton(button) {

        if (!button) {
            return;
        }

        button.disabled = false;

        if (button.dataset.originalText) {
            button.innerHTML =
                button.dataset.originalText;
        }

    }


    /* =========================================================
    OPEN PLANNING MODAL
    ========================================================= */

   function openPlanningModal() {

    if (planningCRUDLoading) {
        return;
    }

    const modal =
        planningEl("planningModal");

    const form =
        planningEl("formPlanning");

    if (!modal) {
        return;
    }


    /* =====================================================
       RESET FORM
    ===================================================== */

    if (form) {
        form.reset();
    }


    /* =====================================================
       TANGGAL DEFAULT
    ===================================================== */

    const tanggal =
        planningEl("tanggal");

    if (tanggal) {

        const now =
            new Date();

        const localDate =
            new Date(
                now.getTime() -
                now.getTimezoneOffset() * 60000
            )
            .toISOString()
            .split("T")[0];

        tanggal.value =
            localDate;
    }


    /* =====================================================
       DEFAULT DURASI
    ===================================================== */

    const durasi =
        planningEl("durasiPlanning");

    const jamMulai =
        planningEl("jamMulai");

    const jamSelesai =
        planningEl("jamSelesai");

    const jenisLembur =
        planningEl("jenisLembur");


    if (durasi) {
        durasi.value = "4 Jam";
    }

    if (jamMulai) {
        jamMulai.value = "17:00";
    }

    if (jamSelesai) {
        jamSelesai.value = "21:00";
    }

    let eligibilityRefreshQueued = false;

    const refreshPlanningEligibility = function () {
        if (eligibilityRefreshQueued) {
            return;
        }

        eligibilityRefreshQueued = true;

        requestAnimationFrame(function () {
            eligibilityRefreshQueued = false;
            renderPlanningKaryawan(search?.value || "");
            updateJumlahKaryawanPlanning();
        });
    };

    [tanggal, jamMulai, jamSelesai, jenisLembur].forEach(function (field) {
        if (field) {
            field.oninput = refreshPlanningEligibility;
            field.onchange = refreshPlanningEligibility;
        }
    });


    /* =====================================================
       SEARCH KARYAWAN
    ===================================================== */

    const search =
        planningEl("planningKaryawanSearch");


    if (search) {

        /* reset search */
        search.value = "";


        /* cegah event listener dobel */
        search.oninput = function () {

            renderPlanningKaryawan(
                this.value
            );

            updateJumlahKaryawanPlanning();

        };


        /* ESC untuk clear search */
        search.onkeydown = function (event) {

            if (
                event.key === "Escape"
            ) {

                this.value = "";

                renderPlanningKaryawan("");

                updateJumlahKaryawanPlanning();

                this.focus();

            }

        };

    }


    /* =====================================================
       RENDER KARYAWAN
    ===================================================== */

    renderPlanningKaryawan("");


    /* =====================================================
       BUKA MODAL
    ===================================================== */

    modal.style.display =
        "flex";


    requestAnimationFrame(function () {

        modal.classList.add(
            "active"
        );

    });


    /* =====================================================
       UPDATE JUMLAH KARYAWAN
    ===================================================== */

    updateJumlahKaryawanPlanning();


    /* =====================================================
       HITUNG DURASI
    ===================================================== */

    hitungDurasiPlanning();


    /* =====================================================
       FOCUS SEARCH
    ===================================================== */

    requestAnimationFrame(function () {

        if (search) {

            search.focus();

        }

    });

}

    /* =========================================================
    CLOSE PLANNING MODAL
    ========================================================= */

    function closePlanningModal() {

        const modal = planningEl("planningModal");

        if (!modal) {
            return;
        }

        modal.classList.remove("active");
        modal.style.display = "none";

        const search = planningEl(
            "planningSearchKaryawan"
        );

        if (search) {
            search.value = "";
        }

        document
            .querySelectorAll(
                "#planningKaryawanList input[type='checkbox']"
            )
            .forEach(function (checkbox) {
                checkbox.checked = false;
            });

        updateJumlahKaryawanPlanning();

    }


    /* =========================================================
    SEARCH KARYAWAN
    ========================================================= */

    function createPlanningSearch() {

        const container = planningEl(
            "planningKaryawanList"
        );

        if (!container) {
            return;
        }

        if (planningEl("planningSearchKaryawan")) {
            return;
        }

        const wrapper = document.createElement("div");

        wrapper.className =
            "planning-search-wrapper";

        wrapper.innerHTML = `
            <input
                type="search"
                id="planningSearchKaryawan"
                class="planning-search-input"
                placeholder="Cari nama, NIK, atau NIB..."
                autocomplete="off"
            >
        `;

        container.parentNode.insertBefore(
            wrapper,
            container
        );

        const input = planningEl(
            "planningSearchKaryawan"
        );

        if (input) {

            input.addEventListener(
                "input",
                filterPlanningKaryawan
            );

        }

        addPlanningSearchStyle();

    }


    function addPlanningSearchStyle() {

        if (planningEl("planningSearchStyle")) {
            return;
        }

        const style = document.createElement("style");

        style.id = "planningSearchStyle";

        style.textContent = `
            .planning-search-wrapper {
                margin-bottom: 12px;
            }

            .planning-search-input {
                width: 100%;
                box-sizing: border-box;
                padding: 11px 13px;
                border: 1px solid #ddd;
                border-radius: 9px;
                outline: none;
                font-size: 14px;
            }

            .planning-search-input:focus {
                border-color: #d71920;
                box-shadow:
                    0 0 0 3px rgba(215,25,32,.08);
            }

            .planning-search-empty {
                padding: 18px;
                text-align: center;
                color: #888;
                font-size: 13px;
            }
        `;

        document.head.appendChild(style);

    }


    function filterPlanningKaryawan() {

        const input = planningEl(
            "planningSearchKaryawan"
        );

        const container = planningEl(
            "planningKaryawanList"
        );

        if (!input || !container) {
            return;
        }

        const keyword = normalizePlanningSearch(
            input.value
        );

        const items = container.querySelectorAll(
            ".planning-karyawan-item"
        );

        let visible = 0;

        items.forEach(function (item) {

            const searchText =
                normalizePlanningSearch(
                    item.dataset.search || ""
                );

            const match =
                !keyword ||
                searchText.includes(keyword);

            item.style.display =
                match ? "flex" : "none";

            if (match) {
                visible++;
            }

        });

        let empty = container.querySelector(
            ".planning-search-empty"
        );

        if (empty) {
            empty.remove();
        }

        if (items.length && visible === 0) {

            empty = document.createElement("div");

            empty.className =
                "planning-search-empty";

            empty.textContent =
                "Karyawan tidak ditemukan.";

            container.appendChild(empty);
        }

    }


    /* =========================================================
    RENDER KARYAWAN
    ========================================================= */

    const POLA_KERJA_TANGGAL_MULAI = "2026-08-21";
    const POLA_KERJA = [
        "pagi", "pagi", "malam", "siang",
        "siang", "malam", "libur", "libur"
    ];

    function getPlanningWeekRange(dateValue) {
        if (!dateValue) return null;

        const targetDate = new Date(`${dateValue}T00:00:00`);
        const patternStart = new Date(`${POLA_KERJA_TANGGAL_MULAI}T00:00:00`);
        const daysFromStart = Math.floor(
            (targetDate - patternStart) / 86400000
        );
        const cycleNumber = Math.floor(daysFromStart / POLA_KERJA.length);
        const cycleStart = new Date(patternStart);

        cycleStart.setDate(
            patternStart.getDate() + cycleNumber * POLA_KERJA.length
        );

        const cycleEnd = new Date(cycleStart);
        cycleEnd.setDate(cycleStart.getDate() + POLA_KERJA.length - 1);

        return { start: cycleStart, end: cycleEnd };
    }

    function getPlanningDurationMinutes(item) {
        if (Number(item?.durasiMenit) > 0) {
            return Number(item.durasiMenit);
        }

        return hitungDurasiDariJam(
            item?.jamMulai || item?.jam_mulai,
            item?.jamSelesai || item?.jam_selesai
        );
    }

    function getWeeklyOvertimeMinutes(karyawanId, dateValue) {
        const range = getPlanningWeekRange(dateValue);
        const targetId = normalizePlanningSearch(karyawanId);

        if (!range || !Array.isArray(planning)) return 0;

        return planning.filter(function (item) {
            const itemDate = new Date(`${item.tanggal}T00:00:00`);

            return itemDate >= range.start &&
                itemDate <= range.end &&
                normalizePlanningSearch(item.jenisLembur) !== "tanggal_merah" &&
                Array.isArray(item.karyawan) &&
                item.karyawan.some(function (employee) {
                    return getPlanningKaryawanIdentifiers(employee).some(function (value) {
                        return normalizePlanningSearch(value) === targetId;
                    });
                });
        }).reduce(function (total, item) {
            return total + getPlanningDurationMinutes(item);
        }, 0);
    }

    function renderPlanningKaryawan(searchTerm = "") {

    const container =
        planningEl("planningKaryawanList");

    if (!container) {
        console.warn(
            "planningKaryawanList tidak ditemukan"
        );
        return;
    }

    const keyword =
        normalizePlanningSearch(searchTerm);

    const selectedIds = new Set(
        Array.from(
            container.querySelectorAll("input[type='checkbox']:checked")
        ).map(function (checkbox) {
            return checkbox.dataset.id;
        })
    );
    const targetDate = planningEl("tanggal")?.value || "";
    const targetType = normalizePlanningSearch(
        planningEl("jenisLembur")?.value || "harian"
    );
    const planningDuration = hitungDurasiDariJam(
        planningEl("jamMulai")?.value,
        planningEl("jamSelesai")?.value
    );
    const weeklyLimit = 16 * 60;
    const weeklyOvertimeCache = new Map();

    let data =
        typeof getKaryawanAktif === "function"
            ? getKaryawanAktif()
            : [];

    if (!Array.isArray(data)) {
        data = [];
    }

    data = data
        .map(function (k) {
            const employeeId = getPlanningKaryawanId(k);
            let weeklyUsed = weeklyOvertimeCache.get(employeeId);

            if (weeklyUsed === undefined) {
                weeklyUsed = getWeeklyOvertimeMinutes(
                    employeeId,
                    targetDate
                );
                weeklyOvertimeCache.set(employeeId, weeklyUsed);
            }
            const canSelect = !targetDate ||
                targetType === "tanggal_merah" ||
                weeklyUsed + planningDuration < weeklyLimit;

            return {
                id: String(
                    getPlanningKaryawanId(k) || ""
                ).trim(),

                nama: String(
                    getPlanningKaryawanNama(k) || ""
                ).trim(),

                weeklyUsed,
                remaining: Math.max(0, weeklyLimit - weeklyUsed),
                canSelect,

                original: k
            };

        })
        .filter(function (k) {

            if (!k.canSelect) {
                return false;
            }

            if (!keyword) {
                return true;
            }

            const text =
                `${k.id} ${k.nama}`
                    .toLowerCase();

            return text.includes(keyword);

        })
        .sort(function (a, b) {

            return a.nama.localeCompare(
                b.nama,
                "id"
            );

        });


    if (!data.length) {

        container.innerHTML = `
            <div style="
                padding:20px;
                text-align:center;
                color:#888;
            ">
                Karyawan tidak ditemukan.
            </div>
        `;

        return;
    }


    container.innerHTML =
        data.map(function (k) {

            return `
                <label
                    class="planning-karyawan-item"
                    data-id="${escapePlanningHTML(k.id)}"
                    data-nama="${escapePlanningHTML(k.nama)}"
                    data-search="${escapePlanningHTML(
                        `${k.id} ${k.nama}`
                    )}"
                    style="
                        display:flex;
                        align-items:center;
                        gap:10px;
                        padding:10px;
                        cursor:pointer;
                    "
                >

                    <input
                        type="checkbox"
                        class="planning-karyawan-checkbox"
                        value="${escapePlanningHTML(k.id)}"
                        data-id="${escapePlanningHTML(k.id)}"
                        data-nama="${escapePlanningHTML(k.nama)}"
                        ${selectedIds.has(k.id) ? "checked" : ""}
                    >

                    <div>
                        <strong>
                            ${escapePlanningHTML(k.nama)}
                        </strong>

                        <div style="
                            font-size:12px;
                            color:#888;
                        ">
                            ${escapePlanningHTML(k.id)}
                        </div>

                        <div style="font-size:11px;color:#16803d;">
                            Sisa pola ini: ${(k.remaining / 60).toFixed(1)} jam
                        </div>
                    </div>

                </label>
            `;

        })
        .join("");
}

    /* =========================================================
    COUNTER KARYAWAN
    ========================================================= */

    function updateJumlahKaryawanPlanning() {

        const counter = planningEl(
            "jumlahKaryawanPlanning"
        );

        if (!counter) {
            return;
        }

        const total =
            document.querySelectorAll(
                "#planningKaryawanList input[type='checkbox']:checked"
            ).length;

        counter.textContent =
            `${total} karyawan dipilih`;

    }


    /* =========================================================
    SELECT ALL
    ========================================================= */

    function pilihSemuaKaryawanPlanning() {

        document
            .querySelectorAll(
                "#planningKaryawanList input[type='checkbox']"
            )
            .forEach(function (checkbox) {

                checkbox.checked = true;

            });

        updateJumlahKaryawanPlanning();

    }


    /* =========================================================
    DESELECT ALL
    ========================================================= */

    function batalSemuaKaryawanPlanning() {

        document
            .querySelectorAll(
                "#planningKaryawanList input[type='checkbox']"
            )
            .forEach(function (checkbox) {

                checkbox.checked = false;

            });

        updateJumlahKaryawanPlanning();

    }


    /* =========================================================
    GET SELECTED
    ========================================================= */

    function getSelectedPlanningKaryawan() {

        return Array.from(
            document.querySelectorAll(
                "#planningKaryawanList input[type='checkbox']:checked"
            )
        )
            .map(function (checkbox) {

                return {
                    id: String(
                        checkbox.dataset.id || ""
                    ).trim(),

                    nama: String(
                        checkbox.dataset.nama || ""
                    ).trim()
                };

            })
            .filter(function (item) {

                return item.id || item.nama;

            });

    }


    /* =========================================================
    DURASI
    ========================================================= */

    function hitungDurasiDariJam(
        jamMulai,
        jamSelesai
    ) {

        if (!jamMulai || !jamSelesai) {
            return 0;
        }

        const parseTime = function (time) {

            const parts = String(time).split(":");

            const hour = Number(parts[0]);

            const minute = Number(parts[1]);

            if (
                !Number.isFinite(hour) ||
                !Number.isFinite(minute)
            ) {
                return NaN;
            }

            return (
                hour * 60 +
                minute
            );

        };

        const start = parseTime(jamMulai);

        let end = parseTime(jamSelesai);

        if (
            !Number.isFinite(start) ||
            !Number.isFinite(end)
        ) {
            return 0;
        }

        if (end <= start) {
            end += 1440;
        }

        return end - start;

    }


    function hitungDurasiPlanning() {

        const mulai =
            planningEl("jamMulai");

        const selesai =
            planningEl("jamSelesai");

        const durasi =
            planningEl("durasiPlanning");

        if (!mulai || !selesai || !durasi) {
            return;
        }

        const total =
            hitungDurasiDariJam(
                mulai.value,
                selesai.value
            );

        durasi.value =
            formatDurasiPlanning(total);

    }


    function getDurasiMenitPlanning() {

        const mulai =
            planningEl("jamMulai");

        const selesai =
            planningEl("jamSelesai");

        if (!mulai || !selesai) {
            return 0;
        }

        return hitungDurasiDariJam(
            mulai.value,
            selesai.value
        );

    }


    /* =========================================================
    FORMAT DURASI
    ========================================================= */

    function formatDurasiPlanning(menit) {

        const total = Number(menit);

        if (
            !Number.isFinite(total) ||
            total <= 0
        ) {
            return "-";
        }

        const jam = total / 60;

        return `${Number.isInteger(jam)
            ? jam
            : Number(jam.toFixed(1))
        } Jam`;

    }


    /* =========================================================
    FORMAT TANGGAL
    ========================================================= */

    function formatTanggalPlanning(tanggal) {

        if (!tanggal) {
            return "-";
        }

        const parts =
            String(tanggal).split("-");

        if (parts.length !== 3) {
            return tanggal;
        }

        return `${parts[2]}-${parts[1]}-${parts[0]}`;

    }


    /* =========================================================
    GENERATE ID
    ========================================================= */

    function generatePlanningId() {

        const tanggal =
            planningEl("tanggal")?.value ||
            new Date()
                .toISOString()
                .split("T")[0];

        const datePart =
            tanggal.replace(/-/g, "");

        const random =
            Date.now()
                .toString()
                .slice(-6);

        return `PLN-${datePart}-${random}`;

    }


    /* =========================================================
    SIMPAN DATA PLANNING
    ========================================================= */

    async function simpanPlanningCRUD() {

        if (
            typeof simpanPlanningSupabase ===
            "function"
        ) {

            return simpanPlanningSupabase();

        }

        if (typeof simpanData === "function") {
            return simpanData();
        }

        return true;

    }


    /* =========================================================
    BUAT PLANNING
    ========================================================= */

    async function buatPlanning() {

        if (planningCRUDLoading) {
            return;
        }

        const tanggal =
            planningEl("tanggal");

        const jamMulai =
            planningEl("jamMulai");

        const jamSelesai =
            planningEl("jamSelesai");

        const keterangan =
            planningEl("keterangan");

        const button =
            planningEl("btnBuatPlanning");

        if (!tanggal?.value) {

            alert("Tanggal wajib diisi.");

            tanggal?.focus();

            return;
        }

        if (!jamMulai?.value) {

            alert("Jam mulai wajib diisi.");

            jamMulai?.focus();

            return;
        }

        if (!jamSelesai?.value) {

            alert("Jam selesai wajib diisi.");

            jamSelesai?.focus();

            return;
        }

        const selected =
            getSelectedPlanningKaryawan();

        if (!selected.length) {

            alert(
                "Pilih minimal satu karyawan."
            );

            return;
        }

        const durasiMenit =
            hitungDurasiDariJam(
                jamMulai.value,
                jamSelesai.value
            );

        if (durasiMenit <= 0) {

            alert(
                "Durasi lembur tidak valid."
            );

            return;
        }

        const idPlanning =
            generatePlanningId();

        const dataBaru = {

            id: idPlanning,

            idPlanning: idPlanning,

            tanggal:
                tanggal.value,

            jamMulai:
                jamMulai.value,

            jamSelesai:
                jamSelesai.value,

            durasi:
                formatDurasiPlanning(
                    durasiMenit
                ),

            durasiMenit,

            keterangan:
                keterangan?.value.trim() || "",

            jenisLembur:
                jenisLembur?.value || "harian",

            karyawan:
                selected,

            createdAt:
                new Date().toISOString()

        };

        if (!Array.isArray(planning)) {
            planning = [];
        }

        planningCRUDLoading = true;

        lockPlanningButton(button);

        showPlanningLoading(
            "Menyimpan planning..."
        );

        planning.push(dataBaru);

        try {

            const result =
                await simpanPlanningCRUD();

            if (result === false) {
                throw new Error(
                    "Database gagal menyimpan planning."
                );
            }

            renderPlanning();

            if (
                typeof updateDashboard === "function"
            ) {
                updateDashboard();
            }

            if (
                typeof updateKaryawanDropdown ===
                "function"
            ) {
                updateKaryawanDropdown();
            }

            closePlanningModal();

            showPlanningToast(
                "success",
                "Planning berhasil dibuat",
                `${selected.length} karyawan berhasil ditambahkan.`
            );

        } catch (error) {

            console.error(
                "Gagal membuat planning:",
                error
            );

            const index =
                planning.indexOf(dataBaru);

            if (index !== -1) {
                planning.splice(index, 1);
            }

            showPlanningToast(
                "error",
                "Planning gagal disimpan",
                "Data dikembalikan karena penyimpanan gagal."
            );

        } finally {

            hidePlanningLoading();

            unlockPlanningButton(button);

            planningCRUDLoading = false;

        }

    }


    /* =========================================================
    RENDER PLANNING
    ========================================================= */

    function renderPlanning() {

        const tbody =
            planningEl("planningTable");

        if (!tbody) {
            return;
        }

        tbody.innerHTML = "";

        let data =
            Array.isArray(planning)
                ? [...planning]
                : [];

        const filterTanggal =
            planningEl("filterTanggal")?.value || "";

        const filterKaryawan =
            planningEl("filterKaryawan")?.value || "";

        if (filterTanggal) {

            data = data.filter(function (item) {

                return String(
                    item.tanggal || ""
                ) === String(filterTanggal);

            });

        }

        if (filterKaryawan) {

            const target =
                String(filterKaryawan);

            data = data.filter(function (item) {

                return Array.isArray(item.karyawan) &&
                    item.karyawan.some(function (k) {

                        return String(
                            k.id ||
                            k.idKaryawan ||
                            k.nik ||
                            k.NIK ||
                            k.NIB ||
                            ""
                        ) === target;

                    });

            });

        }

        data.reverse();

        if (!data.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        style="
                            text-align:center;
                            padding:25px;
                            color:#888;
                        "
                    >
                        Belum ada planning.
                    </td>
                </tr>
            `;

            const jumlah =
                planningEl("jumlahPlanningText");

            if (jumlah) {
                jumlah.textContent =
                    "0 Planning";
            }

            return;
        }

        const fragment =
            document.createDocumentFragment();

        data.forEach(function (item, index) {

            const id =
                getPlanningId(item);

            const savedEvidence = item.buktiUrl
                ? { name: item.buktiNama }
                : getPlanningEvidence(id);

            const hasEvidence = Boolean(savedEvidence?.name || item.buktiUrl);
            const uploadBtnText = hasEvidence ? "✓ Foto" : "↑ Upload";
            const uploadBtnClass = hasEvidence
                ? "planning-file-btn planning-file-upload has-file"
                : "planning-file-btn planning-file-upload";
            const uploadBtnTitle = hasEvidence
                ? (savedEvidence?.name || item.buktiNama || "Foto Bukti")
                : "Upload File";

            const namaKaryawanHTML =
                Array.isArray(item.karyawan) && item.karyawan.length
                    ? item.karyawan
                        .map(function (k, employeeIndex) {
                            const nama =
                                k.nama ||
                                k.namaKaryawan ||
                                "-";

                            return `<span class="planning-employee-name"><span class="planning-employee-number">${employeeIndex + 1}.</span>${escapePlanningHTML(nama)}</span>`;
                        })
                        .join("")
                    : `<span class="planning-employee-name">-</span>`;

            const tr =
                document.createElement("tr");

            tr.innerHTML = `
                <td>${index + 1}</td>

                <td>
                    ${escapePlanningHTML(id)}
                </td>

                <td>
                    ${escapePlanningHTML(
                        formatTanggalPlanning(
                            item.tanggal
                        )
                    )}
                </td>

                <td>
                    <details class="planning-employee-details">
                        <summary>Lihat daftar karyawan</summary>
                        <div class="planning-employee-list">
                            ${namaKaryawanHTML}
                        </div>
                    </details>
                </td>

                <td>
                    ${escapePlanningHTML(
                        item.jamMulai || "-"
                    )}
                    -
                    ${escapePlanningHTML(
                        item.jamSelesai || "-"
                    )}
                </td>

                <td>
                    ${escapePlanningHTML(
                        item.durasi ||
                        formatDurasiPlanning(
                            item.durasiMenit
                        )
                    )}
                </td>

                <td>
                    ${escapePlanningHTML(
                        item.keterangan || "-"
                    )}
                </td>

                <td class="planning-action-cell">

    <div class="planning-action-wrapper">

        <!-- KOTAK 1 — AKSI PLANNING -->
        <div class="planning-action-group">

            <div class="planning-action-label">
                Aksi Planning
            </div>

            <div class="planning-action-box">

            <button
                type="button"
                class="planning-btn planning-btn-preview"
                data-action="preview"
                data-id="${escapePlanningHTML(id)}"
            >
                👁 Preview
            </button>

            <button
                type="button"
                class="planning-btn planning-btn-edit"
                data-action="edit"
                data-id="${escapePlanningHTML(id)}"
            >
                ✏ Edit
            </button>

            <button
                type="button"
                class="planning-btn planning-btn-download"
                data-action="cetak"
                data-id="${escapePlanningHTML(id)}"
                title="Download Planning"
            >
                ↓ Download
            </button>

            <button
                type="button"
                class="planning-btn planning-btn-hapus"
                data-action="hapus"
                data-id="${escapePlanningHTML(id)}"
            >
                🗑 Hapus
            </button>

            </div>

        </div>


        <!-- KOTAK 2 — FILE -->
        <div class="planning-action-group">

            <div class="planning-action-label">
                Aksi untuk Bukti
            </div>

            <div class="planning-file-box">

            <button
                type="button"
                class="${uploadBtnClass}"
                data-action="upload"
                data-id="${escapePlanningHTML(id)}"
                title="${escapePlanningHTML(uploadBtnTitle)}"
            >
                ${escapePlanningHTML(uploadBtnText)}
            </button>

            <button
                type="button"
                class="planning-file-btn planning-file-download"
                data-action="download"
                data-id="${escapePlanningHTML(id)}"
                title="Download File"
            >
                ↓ Download
            </button>
<button
    type="button"
    class="planning-file-btn planning-file-delete"
    data-action="delete-file"
    data-id="${escapePlanningHTML(id)}"
    title="Hapus File"
>
    <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <path d="M3 6h18"></path>
        <path d="M8 6V4h8v2"></path>
        <path d="M19 6l-1 14H6L5 6"></path>
        <path d="M10 11v5"></path>
        <path d="M14 11v5"></path>
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

        const jumlah =
            planningEl("jumlahPlanningText");

        if (jumlah) {
            jumlah.textContent =
                `${data.length} Planning`;
        }

        if (!tbody.dataset.planningDelegation) {

            tbody.addEventListener(
                "click",
                function (event) {

                    const button =
                        event.target.closest(
                            "[data-action]"
                        );

                    if (!button) {
                        return;
                    }

                    const action =
                        button.dataset.action;

                    const id =
                        button.dataset.id;

                    if (action === "preview") {
                        previewPlanning(id);
                    }

                    if (action === "edit") {
                        previewPlanning(id);
                    }

                    if (action === "cetak") {
                    cetakPlanningPNG(id);
                   }

                    if (action === "hapus") {
                        hapusPlanning(id);
                    }

                    if (action === "upload") {
                        uploadPlanningEvidence(id, button);
                    }

                    if (action === "download") {
                        downloadPlanningEvidence(id);
                    }

                    if (action === "delete-file") {
                        deletePlanningEvidence(id, button);
                    }

                }
            );

            tbody.dataset.planningDelegation =
                "true";
        }

    }


    /* =========================================================
    PREVIEW STYLE
    ========================================================= */

    function addPreviewStyle() {

        if (planningEl("planningPreviewStyle")) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "planningPreviewStyle";

        style.textContent = `
            .planning-preview-modal {
                position:fixed;
                inset:0;
                z-index:99998;
                display:none;
                align-items:center;
                justify-content:center;
            }

            .planning-preview-modal.active {
                display:flex;
            }

            .planning-preview-overlay {
                position:absolute;
                inset:0;
                background:rgba(0,0,0,.55);
                backdrop-filter:blur(3px);
            }

            .planning-preview-box {
                position:relative;
                z-index:2;
                width:min(900px,94vw);
                max-height:92vh;
                overflow:auto;
                background:#fff;
                border-radius:16px;
                box-shadow:0 20px 70px rgba(0,0,0,.25);
            }

            .planning-preview-header {
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:15px;
                padding:18px 22px;
                background:#d71920;
                color:#fff;
                border-radius:16px 16px 0 0;
            }

            .planning-preview-header h2 {
                margin:0;
                font-size:18px;
            }

            .planning-preview-close {
                border:0;
                background:transparent;
                color:#fff;
                font-size:26px;
                cursor:pointer;
            }

            .planning-preview-form {
                display:grid;
                grid-template-columns:repeat(3,1fr);
                gap:16px;
                padding:20px;
            }

            .planning-preview-field {
                display:flex;
                flex-direction:column;
                gap:6px;
            }

            .planning-preview-full {
                grid-column:1/-1;
            }

            .planning-preview-field label {
                font-size:12px;
                font-weight:700;
                color:#555;
            }

            .planning-preview-field input,
            .planning-preview-field textarea {
                width:100%;
                box-sizing:border-box;
                padding:10px 11px;
                border:1px solid #ddd;
                border-radius:8px;
                outline:none;
            }

            .planning-preview-field input:focus,
            .planning-preview-field textarea:focus {
                border-color:#d71920;
            }

            .planning-preview-section {
                padding:0 20px 20px;
            }

            .planning-preview-section-header {
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                margin-bottom:12px;
            }

            .planning-preview-section-header h3 {
                margin:0;
                font-size:15px;
            }

            .planning-add-label {
                color:#73777c;
                font-size:12px;
                font-weight:700;
            }

            .planning-preview-search {
                position:relative;
                margin-bottom:10px;
            }

            .planning-preview-search input {
                width:100%;
                box-sizing:border-box;
                padding:11px 13px;
                border:1px solid #ddd;
                border-radius:8px;
                outline:none;
            }

            .planning-preview-search-result {
                position:absolute;
                left:0;
                right:0;
                top:calc(100% + 4px);
                z-index:20;
                display:none;
                max-height:220px;
                overflow:auto;
                background:#fff;
                border:1px solid #ddd;
                border-radius:8px;
                box-shadow:0 12px 30px rgba(0,0,0,.15);
            }

            .planning-preview-search-result.active {
                display:block;
            }

            .planning-preview-search-item {
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:10px;
                padding:10px 12px;
                border-bottom:1px solid #eee;
            }

            .planning-preview-search-item:hover {
                background:#fafafa;
            }

            .planning-preview-search-info {
                min-width:0;
                flex:1;
            }

            .planning-preview-search-name {
                font-weight:700;
                font-size:13px;
            }

            .planning-preview-search-id {
                color:#888;
                font-size:11px;
                margin-top:3px;
            }

            .planning-preview-search-add {
                border:0;
                background:#d71920;
                color:#fff;
                padding:7px 9px;
                border-radius:7px;
                cursor:pointer;
            }

            .planning-preview-search-empty {
                padding:15px;
                text-align:center;
                color:#888;
                font-size:13px;
            }

            .planning-preview-karyawan-list {
                display:flex;
                flex-direction:column;
                gap:7px;
                max-height:300px;
                overflow:auto;
            }

            .planning-preview-karyawan-row {
                display:grid;
                grid-template-columns:38px 1fr 180px 42px;
                gap:8px;
                align-items:center;
                padding:8px;
                border:1px solid #eee;
                border-radius:8px;
                background:#fafafa;
            }

            .planning-preview-number {
                text-align:center;
                font-weight:700;
                color:#777;
            }

            .planning-preview-karyawan-row input {
                width:100%;
                box-sizing:border-box;
                padding:8px 9px;
                border:1px solid #ddd;
                border-radius:7px;
                outline:none;
            }

            .planning-btn-delete {
                width:34px;
                height:34px;
                border:0;
                border-radius:7px;
                background:#fff0f1;
                color:#d71920;
                cursor:pointer;
            }

            .planning-preview-actions {
                display:flex;
                justify-content:flex-end;
                gap:8px;
                padding:0 20px 20px;
            }

            .planning-preview-actions button {
                border:0;
                padding:10px 16px;
                border-radius:8px;
                cursor:pointer;
            }

            .planning-preview-cancel {
                background:#eee;
                color:#333;
            }

            .planning-btn-save {
                background:#d71920;
                color:#fff;
            }

            @media(max-width:700px) {

                .planning-preview-form {
                    grid-template-columns:1fr;
                }

                .planning-preview-karyawan-row {
                    grid-template-columns:32px 1fr 38px;
                }

                .preview-id-input {
                    grid-column:2;
                }

                .planning-preview-actions {
                    flex-direction:column;
                }

                .planning-preview-actions button {
                    width:100%;
                }

            }
        `;

        document.head.appendChild(style);

    }


    /* =========================================================
    CREATE PREVIEW MODAL
    ========================================================= */

    function buatModalPreviewPlanning() {

        let modal =
            planningEl("planningPreviewModal");

        if (modal) {
            return modal;
        }

        modal =
            document.createElement("div");

        modal.id =
            "planningPreviewModal";

        modal.className =
            "planning-preview-modal";

        modal.innerHTML = `
            <div
                class="planning-preview-overlay"
                data-preview-close
            ></div>

            <div class="planning-preview-box">
                <div class="planning-preview-header">
                    <div>
                        <div style="font-size:11px;">
                            PREVIEW PLANNING
                        </div>
                        <h2>Detail Lembur</h2>
                    </div>

                    <button
                        type="button"
                        class="planning-preview-close"
                        data-preview-close
                    >
                        ×
                    </button>
                </div>

                <div id="planningPreviewContent"></div>
            </div>
        `;

        document.body.appendChild(modal);

        addPreviewStyle();

        modal
            .querySelectorAll(
                "[data-preview-close]"
            )
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    closePreviewPlanning
                );

            });

        return modal;

    }


    /* =========================================================
    PREVIEW
    ========================================================= */

    function previewPlanning(idPlanning) {

        if (planningCRUDLoading) {
            return;
        }

        const item =
            findPlanningById(idPlanning);

        if (!item) {

            alert(
                "Data planning tidak ditemukan."
            );

            return;
        }

        const modal =
            buatModalPreviewPlanning();

        const content =
            planningEl(
                "planningPreviewContent"
            );

        if (!content) {
            return;
        }

        PlanningState.previewId =
            getPlanningId(item);

        modal.dataset.idPlanning =
            PlanningState.previewId;

        const daftar =
            Array.isArray(item.karyawan)
                ? item.karyawan
                    .map(function (k) {
                        return {
                            id:
                                k.id ??
                                k.idKaryawan ??
                                k.nik ??
                                k.NIK ??
                                k.NIB ??
                                "",

                            nama:
                                k.nama ??
                                k.namaKaryawan ??
                                ""
                        };
                    })
                : [];

        content.innerHTML = `
            <div class="planning-preview-form">

                <div class="planning-preview-field">
                    <label>ID Planning</label>
                    <input
                        value="${escapePlanningHTML(
                            getPlanningId(item)
                        )}"
                        readonly
                    >
                </div>

                <div class="planning-preview-field">
                    <label>Tanggal</label>
                    <input
                        type="date"
                        id="previewTanggal"
                        value="${escapePlanningHTML(
                            item.tanggal || ""
                        )}"
                    >
                </div>

                <div class="planning-preview-field">
                    <label>Durasi</label>
                    <input
                        id="previewDurasi"
                        value="${escapePlanningHTML(
                            item.durasi ||
                            formatDurasiPlanning(
                                item.durasiMenit
                            )
                        )}"
                        readonly
                    >
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
                    <input
                        type="time"
                        id="previewJamMulai"
                        value="${escapePlanningHTML(
                            item.jamMulai || ""
                        )}"
                    >
                </div>

                <div class="planning-preview-field">
                    <label>Jam Selesai</label>
                    <input
                        type="time"
                        id="previewJamSelesai"
                        value="${escapePlanningHTML(
                            item.jamSelesai || ""
                        )}"
                    >
                </div>

                <div class="planning-preview-field">
                    <label>Keterangan</label>
                    <input
                        id="previewKeterangan"
                        value="${escapePlanningHTML(
                            item.keterangan || ""
                        )}"
                    >
                </div>

            </div>

            <div class="planning-preview-section">

                <div class="planning-preview-section-header">

                    <div>
                        <h3>
                            Daftar Karyawan
                        </h3>

                        <small
                            id="previewJumlahKaryawan"
                        >
                            0 karyawan
                        </small>
                    </div>

                    <span class="planning-add-label">
                        + Tambah Karyawan
                    </span>

                </div>

                <div class="planning-preview-search">

                    <input
                        type="search"
                        id="previewSearchKaryawan"
                        placeholder="Cari nama, NIK, atau NIB..."
                        autocomplete="off"
                    >

                    <div
                        id="previewSearchResult"
                        class="planning-preview-search-result"
                    ></div>

                </div>

                <div
                    id="previewKaryawanList"
                    class="planning-preview-karyawan-list"
                ></div>

            </div>

            <div class="planning-preview-actions">

                <button
                    type="button"
                    class="planning-preview-cancel"
                    onclick="closePreviewPlanning()"
                >
                    Batal
                </button>

                <button
                    type="button"
                    class="planning-btn-save"
                    onclick="simpanEditPlanning()"
                >
                    Simpan Perubahan
                </button>

            </div>
        `;

        renderPreviewKaryawan(
            daftar
        );

        hitungDurasiPreview();

        const search =
            planningEl(
                "previewSearchKaryawan"
            );

        if (search) {

            search.addEventListener(
                "input",
                function () {

                    searchKaryawanPreview(
                        search.value
                    );

                }
            );

        }

        modal.classList.add("active");

        modal.style.display = "flex";

    }


    /* =========================================================
    RENDER PREVIEW KARYAWAN
    ========================================================= */

    function renderPreviewKaryawan(daftar) {

        const container =
            planningEl(
                "previewKaryawanList"
            );

        if (!container) {
            return;
        }

        const data =
            Array.isArray(daftar)
                ? daftar
                    .map(function (item) {

                        return {
                            id: String(
                                item?.id ??
                                item?.idKaryawan ??
                                item?.nik ??
                                item?.NIK ??
                                item?.NIB ??
                                ""
                            ).trim(),

                            nama: String(
                                item?.nama ??
                                item?.namaKaryawan ??
                                ""
                            ).trim()
                        };

                    })
                    .filter(function (item) {

                        return item.id ||
                            item.nama;

                    })
                : [];

        if (!data.length) {

            container.innerHTML = `
                <div class="planning-preview-search-empty">
                    Belum ada karyawan.
                </div>
            `;

            updatePreviewJumlahKaryawan();

            return;
        }

        container.innerHTML =
            data.map(function (item, index) {

                return `
                    <div
                        class="planning-preview-karyawan-row"
                    >

                        <div
                            class="planning-preview-number"
                        >
                            ${index + 1}
                        </div>

                        <input
                            type="text"
                            class="preview-nama-input"
                            value="${escapePlanningHTML(
                                item.nama
                            )}"
                            placeholder="Nama karyawan"
                        >

                        <input
                            type="text"
                            class="preview-id-input"
                            value="${escapePlanningHTML(
                                item.id
                            )}"
                            placeholder="ID Karyawan (angka)"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            oninput="this.value = this.value.replace(/[^0-9]/g, '')"
                        >

                        <button
                            type="button"
                            class="planning-btn-delete"
                            onclick="hapusKaryawanPreview(this)"
                        >
                            ×
                        </button>

                    </div>
                `;

            })
            .join("");

        updatePreviewJumlahKaryawan();

    }


    /* =========================================================
    PREVIEW COUNTER
    ========================================================= */

    function updatePreviewJumlahKaryawan() {

        const container =
            planningEl(
                "previewKaryawanList"
            );

        const counter =
            planningEl(
                "previewJumlahKaryawan"
            );

        if (!container || !counter) {
            return;
        }

        const total =
            container.querySelectorAll(
                ".planning-preview-karyawan-row"
            ).length;

        counter.textContent =
            `${total} karyawan`;

    }


    /* =========================================================
    FOCUS SEARCH PREVIEW
    ========================================================= */

    function focusSearchPreview() {

        const search =
            planningEl(
                "previewSearchKaryawan"
            );

        if (!search) {
            return;
        }

        search.focus();

        search.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }


    /* =========================================================
    SEARCH PREVIEW
    ========================================================= */

    function searchKaryawanPreview(keyword) {

        const result =
            planningEl(
                "previewSearchResult"
            );

        if (!result) {
            return;
        }

        const search =
            normalizePlanningSearch(
                keyword
            );

        if (!search) {

            result.innerHTML = "";

            result.classList.remove(
                "active"
            );

            return;
        }

        const rows =
            Array.from(
                document.querySelectorAll(
                    "#previewKaryawanList .planning-preview-karyawan-row"
                )
            );

        const existingIds =
            new Set();

        rows.forEach(function (row) {

            const input =
                row.querySelector(
                    ".preview-id-input"
                );

            if (!input) {
                return;
            }

            const id =
                normalizePlanningSearch(
                    input.value
                );

            if (id) {
                existingIds.add(id);
            }

        });

        const employees =
            sortPlanningKaryawan(
                getKaryawanAktif()
            );

        const matches =
            employees
                .filter(function (item) {

                    const searchText =
                        getPlanningKaryawanSearchText(
                            item
                        );

                    const identifiers =
                        getPlanningKaryawanIdentifiers(
                            item
                        )
                            .map(
                                normalizePlanningSearch
                            );

                    const duplicate =
                        identifiers.some(
                            function (id) {
                                return existingIds.has(id);
                            }
                        );

                    return (
                        searchText.includes(search) &&
                        !duplicate
                    );

                })
                .slice(0, 20);

        if (!matches.length) {

            result.innerHTML = `
                <div class="planning-preview-search-empty">
                    Karyawan tidak ditemukan
                    atau sudah ada.
                </div>
            `;

            result.classList.add("active");

            return;
        }

        result.innerHTML =
            matches.map(function (item) {

                const id =
                    getPlanningKaryawanId(item);

                const nama =
                    getPlanningKaryawanNama(item);

                return `
                    <div
                        class="planning-preview-search-item"
                    >

                        <div
                            class="planning-preview-search-info"
                        >
                            <div
                                class="planning-preview-search-name"
                            >
                                ${escapePlanningHTML(
                                    nama
                                )}
                            </div>

                            <div
                                class="planning-preview-search-id"
                            >
                                ${escapePlanningHTML(
                                    id || "-"
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            class="planning-preview-search-add"
                            data-add-id="${escapePlanningHTML(
                                id
                            )}"
                            data-add-nama="${escapePlanningHTML(
                                nama
                            )}"
                        >
                            + Tambah
                        </button>

                    </div>
                `;

            })
            .join("");

        result.classList.add("active");

        if (!result.dataset.delegation) {

            result.addEventListener(
                "click",
                function (event) {

                    const button =
                        event.target.closest(
                            "[data-add-id]"
                        );

                    if (!button) {
                        return;
                    }

                    tambahKaryawanDariSearch(
                        button.dataset.addId,
                        button.dataset.addNama
                    );

                }
            );

            result.dataset.delegation =
                "true";
        }

    }


    /* =========================================================
    TAMBAH KARYAWAN DARI SEARCH
    ========================================================= */

    function tambahKaryawanDariSearch(
        id,
        nama
    ) {

        const container =
            planningEl(
                "previewKaryawanList"
            );

        if (!container) {
            return;
        }

        const targetId =
            normalizePlanningSearch(id);

        const rows =
            Array.from(
                container.querySelectorAll(
                    ".planning-preview-karyawan-row"
                )
            );

        const duplicate =
            rows.some(function (row) {

                const input =
                    row.querySelector(
                        ".preview-id-input"
                    );

                return (
                    input &&
                    normalizePlanningSearch(
                        input.value
                    ) === targetId
                );

            });

        if (duplicate) {

            showPlanningToast(
                "warning",
                "Karyawan sudah ada",
                "Karyawan tersebut sudah ada di planning."
            );

            return;
        }

        const dataSaatIni =
            rows.map(function (row) {

                return {

                    id:
                        row.querySelector(
                            ".preview-id-input"
                        )?.value.trim() || "",

                    nama:
                        row.querySelector(
                            ".preview-nama-input"
                        )?.value.trim() || ""

                };

            });

        dataSaatIni.push({
            id: String(id || "").trim(),
            nama: String(nama || "").trim()
        });

        /*
        Sorting berdasarkan NAMA TERBARU.
        Jadi kalau nama diedit, urutannya ikut nama edit.
        */
        dataSaatIni.sort(function (a, b) {

            return String(a.nama)
                .localeCompare(
                    String(b.nama),
                    "id",
                    {
                        sensitivity: "base"
                    }
                );

        });

        renderPreviewKaryawan(
            dataSaatIni
        );

        const search =
            planningEl(
                "previewSearchKaryawan"
            );

        const result =
            planningEl(
                "previewSearchResult"
            );

        if (search) {
            search.value = "";
        }

        if (result) {
            result.innerHTML = "";
            result.classList.remove("active");
        }

    }


    /* =========================================================
    TAMBAH KARYAWAN LAMA
    ========================================================= */

    function tambahKaryawanPreview() {

        focusSearchPreview();

    }


    /* =========================================================
    HAPUS KARYAWAN PREVIEW
    ========================================================= */

    function hapusKaryawanPreview(button) {

        if (planningCRUDLoading) {
            return;
        }

        const row =
            button?.closest(
                ".planning-preview-karyawan-row"
            );

        const container =
            planningEl(
                "previewKaryawanList"
            );

        if (!row || !container) {
            return;
        }

        const rows =
            container.querySelectorAll(
                ".planning-preview-karyawan-row"
            );

        if (rows.length <= 1) {

            alert(
                "Minimal harus ada satu karyawan."
            );

            return;
        }

        row.remove();

        updatePreviewNomor();

        updatePreviewJumlahKaryawan();

    }


    /* =========================================================
    UPDATE NOMOR PREVIEW
    ========================================================= */

    function updatePreviewNomor() {

        const container =
            planningEl(
                "previewKaryawanList"
            );

        if (!container) {
            return;
        }

        container
            .querySelectorAll(
                ".planning-preview-karyawan-row"
            )
            .forEach(function (row, index) {

                const nomor =
                    row.querySelector(
                        ".planning-preview-number"
                    );

                if (nomor) {
                    nomor.textContent =
                        index + 1;
                }

            });

    }


    /* =========================================================
    DURASI PREVIEW
    ========================================================= */

    function hitungDurasiPreview() {

        const mulai =
            planningEl(
                "previewJamMulai"
            );

        const selesai =
            planningEl(
                "previewJamSelesai"
            );

        const durasi =
            planningEl(
                "previewDurasi"
            );

        if (!mulai || !selesai || !durasi) {
            return;
        }

        const total =
            hitungDurasiDariJam(
                mulai.value,
                selesai.value
            );

        durasi.value =
            formatDurasiPlanning(total);

    }


    /* =========================================================
    CLOSE PREVIEW
    ========================================================= */

    function closePreviewPlanning() {

        const modal =
            planningEl(
                "planningPreviewModal"
            );

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "active"
        );

        modal.style.display =
            "none";

        PlanningState.previewId = null;

    }


    /* =========================================================
    SIMPAN EDIT PLANNING
    ========================================================= */

    async function simpanEditPlanning() {

        if (planningCRUDLoading) {
            return;
        }

        const modal =
            planningEl(
                "planningPreviewModal"
            );

        if (!modal) {
            return;
        }

        const idPlanning =
            modal.dataset.idPlanning;

        if (!idPlanning) {

            alert(
                "ID planning tidak ditemukan."
            );

            return;
        }

        if (!Array.isArray(planning)) {

            alert(
                "Data planning tidak tersedia."
            );

            return;
        }

        const index =
            planning.findIndex(function (item) {

                return getPlanningId(item) ===
                    String(idPlanning);

            });

        if (index === -1) {

            alert(
                "Planning tidak ditemukan."
            );

            return;
        }

        const tanggal =
            planningEl(
                "previewTanggal"
            );

        const jamMulai =
            planningEl(
                "previewJamMulai"
            );

        const jamSelesai =
            planningEl(
                "previewJamSelesai"
            );

        const keterangan =
            planningEl(
                "previewKeterangan"
            );

        const jenisLembur =
            planningEl("previewJenisLembur");

        if (
            !tanggal ||
            !jamMulai ||
            !jamSelesai
        ) {

            alert(
                "Form edit tidak lengkap."
            );

            return;
        }

        if (!tanggal.value) {

            alert(
                "Tanggal wajib diisi."
            );

            tanggal.focus();

            return;
        }

        if (!jamMulai.value) {

            alert(
                "Jam mulai wajib diisi."
            );

            jamMulai.focus();

            return;
        }

        if (!jamSelesai.value) {

            alert(
                "Jam selesai wajib diisi."
            );

            jamSelesai.focus();

            return;
        }

        const rows =
            document.querySelectorAll(
                "#previewKaryawanList .planning-preview-karyawan-row"
            );

        if (!rows.length) {

            alert(
                "Minimal harus ada satu karyawan."
            );

            return;
        }

        const daftarKaryawan = [];

        const idSet = new Set();

        let valid = true;

        rows.forEach(function (row) {

            const nama =
                row.querySelector(
                    ".preview-nama-input"
                )?.value.trim() || "";

            const id =
                row.querySelector(
                    ".preview-id-input"
                )?.value.trim() || "";

            if (!nama || !/^\d+$/.test(id)) {
                valid = false;
            }

            const normalizedId =
                normalizePlanningSearch(id);

            if (
                normalizedId &&
                idSet.has(normalizedId)
            ) {
                valid = false;
            }

            if (normalizedId) {
                idSet.add(normalizedId);
            }

            daftarKaryawan.push({
                id,
                nama
            });

        });

        if (!valid) {

            alert(
                "Nama wajib diisi dan ID karyawan harus berupa angka serta tidak boleh duplikat."
            );

            return;
        }

        /*
        Urutkan berdasarkan nama hasil edit.
        */
        daftarKaryawan.sort(function (a, b) {

            return a.nama.localeCompare(
                b.nama,
                "id",
                {
                    sensitivity: "base"
                }
            );

        });

        const durasiMenit =
            hitungDurasiDariJam(
                jamMulai.value,
                jamSelesai.value
            );

        if (durasiMenit <= 0) {

            alert(
                "Durasi lembur tidak valid."
            );

            return;
        }

        const button =
            modal.querySelector(
                ".planning-btn-save"
            );

        const dataLama =
            JSON.parse(
                JSON.stringify(
                    planning[index]
                )
            );

        planningCRUDLoading = true;

        lockPlanningButton(button);

        showPlanningLoading(
            "Menyimpan perubahan..."
        );

        try {

            planning[index] = {

                ...planning[index],

                tanggal:
                    tanggal.value,

                jamMulai:
                    jamMulai.value,

                jamSelesai:
                    jamSelesai.value,

                durasi:
                    formatDurasiPlanning(
                        durasiMenit
                    ),

                durasiMenit,

                keterangan:
                    keterangan?.value.trim() || "",

                jenisLembur:
                    jenisLembur?.value || "harian",

                karyawan:
                    daftarKaryawan

            };

            const result =
                await simpanPlanningCRUD();

            if (result === false) {
                throw new Error(
                    "Database gagal menyimpan perubahan."
                );
            }

            renderPlanning();

            if (
                typeof updateDashboard === "function"
            ) {
                updateDashboard();
            }

            if (
                typeof updateKaryawanDropdown ===
                "function"
            ) {
                updateKaryawanDropdown();
            }

            closePreviewPlanning();

            showPlanningToast(
                "success",
                "Perubahan berhasil disimpan",
                "Data planning dan daftar karyawan berhasil diperbarui."
            );

        } catch (error) {

            console.error(
                "Gagal menyimpan perubahan:",
                error
            );

            planning[index] =
                dataLama;

            showPlanningToast(
                "error",
                "Perubahan gagal disimpan",
                "Data planning dikembalikan ke kondisi sebelumnya."
            );

        } finally {

            hidePlanningLoading();

            unlockPlanningButton(button);

            planningCRUDLoading = false;

        }
        

    }


    /* =========================================================
    HAPUS PLANNING
    ========================================================= */

    async function hapusPlanning(idPlanning) {

        if (planningCRUDLoading) {
            return;
        }

        if (!Array.isArray(planning)) {
            return;
        }

        const yakin =
            confirm(
                "Yakin ingin menghapus planning ini?"
            );

        if (!yakin) {
            return;
        }

        const index =
            planning.findIndex(function (item) {

                return getPlanningId(item) ===
                    String(idPlanning);

            });

        if (index === -1) {

            alert(
                "Data planning tidak ditemukan."
            );

            return;
        }

        const dataLama =
            planning[index];

        planningCRUDLoading = true;

        showPlanningLoading(
            "Menghapus planning..."
        );

        planning.splice(
            index,
            1
        );

        try {

            const result =
                await simpanPlanningCRUD();

            if (result === false) {
                throw new Error(
                    "Database gagal menghapus planning."
                );
            }

            renderPlanning();

            if (
                typeof updateDashboard === "function"
            ) {
                updateDashboard();
            }

            showPlanningToast(
                "success",
                "Planning berhasil dihapus",
                "Data planning telah berhasil dihapus."
            );

        } catch (error) {

            console.error(
                "Gagal menghapus planning:",
                error
            );

            planning.splice(
                index,
                0,
                dataLama
            );

            showPlanningToast(
                "error",
                "Planning gagal dihapus",
                "Data dikembalikan karena proses penghapusan gagal."
            );

        } finally {

            hidePlanningLoading();

            planningCRUDLoading = false;

        }

    }


    /* =========================================================
    RESET FILTER
    ========================================================= */

    function resetFilter() {

        const tanggal =
            planningEl(
                "filterTanggal"
            );

        const karyawanFilter =
            planningEl(
                "filterKaryawan"
            );

        if (tanggal) {
            tanggal.value = "";
        }

        if (karyawanFilter) {
            karyawanFilter.value = "";
        }

        renderPlanning();

    }


    /* =========================================================
    TOAST
    ========================================================= */

    function initPlanningToast() {

        if (planningEl(
            "planningToastContainer"
        )) {
            return;
        }

        const container =
            document.createElement("div");

        container.id =
            "planningToastContainer";

        container.innerHTML = `
            <div
                id="planningToast"
                class="planning-toast"
            >

                <div
                    id="planningToastIcon"
                    class="planning-toast-icon"
                >
                    ✓
                </div>

                <div
                    class="planning-toast-content"
                >

                    <div
                        id="planningToastTitle"
                        class="planning-toast-title"
                    >
                        Berhasil
                    </div>

                    <div
                        id="planningToastMessage"
                        class="planning-toast-message"
                    ></div>

                </div>

                <button
                    type="button"
                    id="planningToastClose"
                    class="planning-toast-close"
                >
                    ×
                </button>

            </div>
        `;

        const style =
            document.createElement("style");

        style.id =
            "planningToastStyle";

        style.textContent = `
            #planningToastContainer {
                position:fixed;
                top:24px;
                right:24px;
                z-index:1000000;
                pointer-events:none;
            }

            .planning-toast {
                min-width:320px;
                max-width:420px;
                display:flex;
                align-items:center;
                gap:13px;
                padding:14px 15px;
                background:#fff;
                border:1px solid #e8e8e8;
                border-radius:13px;
                box-shadow:
                    0 15px 45px rgba(0,0,0,.16);
                transform:translateX(120%);
                opacity:0;
                transition:
                    transform .35s ease,
                    opacity .35s ease;
                pointer-events:auto;
            }

            .planning-toast.show {
                transform:translateX(0);
                opacity:1;
            }

            .planning-toast-icon {
                width:38px;
                height:38px;
                min-width:38px;
                display:flex;
                align-items:center;
                justify-content:center;
                border-radius:50%;
                background:#e9f8ef;
                color:#1d9b52;
                font-size:19px;
                font-weight:800;
            }

            .planning-toast-content {
                flex:1;
                min-width:0;
            }

            .planning-toast-title {
                font-size:14px;
                font-weight:750;
                color:#222;
                line-height:1.3;
            }

            .planning-toast-message {
                margin-top:3px;
                font-size:12px;
                line-height:1.45;
                color:#777;
            }

            .planning-toast-close {
                width:28px;
                height:28px;
                border:0;
                background:transparent;
                color:#999;
                font-size:20px;
                line-height:1;
                border-radius:6px;
                cursor:pointer;
            }

            .planning-toast-close:hover {
                background:#f4f4f4;
                color:#333;
            }

            .planning-toast.success
            .planning-toast-icon {
                background:#e9f8ef;
                color:#1d9b52;
            }

            .planning-toast.error
            .planning-toast-icon {
                background:#fff0f1;
                color:#d71920;
            }

            .planning-toast.warning
            .planning-toast-icon {
                background:#fff7e6;
                color:#d98a00;
            }

            @media(max-width:600px) {

                #planningToastContainer {
                    top:15px;
                    left:15px;
                    right:15px;
                }

                .planning-toast {
                    min-width:0;
                    width:100%;
                    max-width:none;
                }

            }
        `;

        document.head.appendChild(style);

        document.body.appendChild(container);

        const close =
            planningEl(
                "planningToastClose"
            );

        if (close) {

            close.addEventListener(
                "click",
                hidePlanningToast
            );

        }

    }


    /* =========================================================
    SHOW TOAST
    ========================================================= */

    function showPlanningToast(
        type = "success",
        title = "Berhasil",
        message = "",
        duration = 3500
    ) {

        initPlanningToast();

        const toast =
            planningEl(
                "planningToast"
            );

        const icon =
            planningEl(
                "planningToastIcon"
            );

        const titleElement =
            planningEl(
                "planningToastTitle"
            );

        const messageElement =
            planningEl(
                "planningToastMessage"
            );

        if (
            !toast ||
            !icon ||
            !titleElement ||
            !messageElement
        ) {
            return;
        }

        clearTimeout(
            PlanningState.toastTimer
        );

        toast.classList.remove(
            "success",
            "error",
            "warning",
            "show"
        );

        const icons = {
            success: "✓",
            error: "×",
            warning: "!"
        };

        icon.textContent =
            icons[type] || "✓";

        titleElement.textContent =
            title;

        messageElement.textContent =
            message;

        toast.classList.add(
            type
        );

        requestAnimationFrame(function () {

            toast.classList.add(
                "show"
            );

        });

        PlanningState.toastTimer =
            setTimeout(
                hidePlanningToast,
                duration
            );

    }


    /* =========================================================
    HIDE TOAST
    ========================================================= */

    function hidePlanningToast() {

        const toast =
            planningEl(
                "planningToast"
            );

        if (!toast) {
            return;
        }

        toast.classList.remove(
            "show"
        );

    }


    /* =========================================================
    COMPATIBILITY
    Fungsi lama tetap tersedia
    ========================================================= */

    function tampilkanNotifPlanning(
        tipe,
        judul,
        pesan
    ) {

        showPlanningToast(
            tipe,
            judul,
            pesan
        );

    }


    function planningToastSuccess(
        title,
        message
    ) {

        showPlanningToast(
            "success",
            title,
            message
        );

    }


    /* =========================================================
    CETAK PDF
    ========================================================= */

   /* =========================================================
   CETAK PLANNING PDF
   ========================================================= */

async function cetakPlanningPNG(idPlanning) {

    /* =========================================================
       VALIDASI
    ========================================================= */

    if (planningCRUDLoading) {
        return;
    }

    const item = findPlanningById(idPlanning);

    if (!item) {
        alert("Data planning tidak ditemukan.");
        return;
    }

    if (typeof html2canvas === "undefined") {
        alert("html2canvas belum termuat.");
        return;
    }


    /* =========================================================
       LOCK + LOADING
    ========================================================= */

    planningCRUDLoading = true;

    try {
        showPlanningLoading("Menyiapkan PNG...");
    } catch (e) {}


    let exportContainer = null;
    let downloadLink = null;
    let objectURL = null;


    try {

        await new Promise(function(resolve) {
            requestAnimationFrame(function() {
                requestAnimationFrame(resolve);
            });
        });


        /* =====================================================
           DATA PLANNING
        ===================================================== */

        const id =
            typeof getPlanningId === "function"
                ? (
                    getPlanningId(item) ||
                    item.idPlanning ||
                    item.id_planning ||
                    item.id ||
                    idPlanning ||
                    "-"
                )
                : (
                    item.idPlanning ||
                    item.id_planning ||
                    item.id ||
                    idPlanning ||
                    "-"
                );


        const tanggal =
            item.tanggal || "-";


        const tanggalTampil =
            typeof formatTanggalPlanning === "function"
                ? formatTanggalPlanning(tanggal)
                : tanggal;


        const jamMulai =
            item.jamMulai ||
            item.jam_mulai ||
            "-";


        const jamSelesai =
            item.jamSelesai ||
            item.jam_selesai ||
            "-";


        let durasi =
            item.durasi ||
            item.durasiLembur ||
            null;


        if (
            !durasi &&
            item.durasiMenit !== undefined &&
            item.durasiMenit !== null
        ) {

            if (
                typeof formatDurasiPlanning === "function"
            ) {

                durasi =
                    formatDurasiPlanning(
                        item.durasiMenit
                    );

            } else {

                durasi =
                    item.durasiMenit;

            }

        }


        durasi = durasi || "-";


        const jenisLemburValue =
            item.jenisLembur ||
            item.jenis_lembur ||
            "harian";

        const jenisLemburTampil =
            jenisLemburValue === "tanggal_merah"
                ? "Tanggal Merah"
                : "Harian";


        const keterangan =
            item.keterangan ||
            item.keteranganLembur ||
            item.catatan ||
            "-";


        /* =====================================================
           ESCAPE HTML
        ===================================================== */

        function escapeHTML(value) {

            if (
                value === null ||
                value === undefined
            ) {
                return "";
            }

            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

        }


        /* =====================================================
           MASTER KARYAWAN
        ===================================================== */

        const masterKaryawan =
            Array.isArray(window.karyawanData)
                ? window.karyawanData
                : [];


        function getKaryawanKey(data) {

            if (
                data === null ||
                data === undefined
            ) {
                return null;
            }


            if (
                typeof data !== "object"
            ) {
                return String(data).trim();
            }


            const keys = [
                "idKaryawan",
                "id_karyawan",
                "employeeId",
                "employee_id",
                "employeeID",
                "id",
                "ID",
                "nik",
                "NIK",
                "nip",
                "NIP"
            ];


            for (
                let i = 0;
                i < keys.length;
                i++
            ) {

                const key = keys[i];


                if (
                    data[key] !== undefined &&
                    data[key] !== null &&
                    String(data[key]).trim() !== ""
                ) {

                    return String(
                        data[key]
                    ).trim();

                }

            }


            return null;

        }


        function findMasterKaryawan(data) {

            const key =
                getKaryawanKey(data);


            if (
                key === null ||
                key === ""
            ) {
                return null;
            }


            return masterKaryawan.find(
                function(karyawan) {

                    const masterKey =
                        getKaryawanKey(
                            karyawan
                        );


                    if (
                        masterKey === null
                    ) {
                        return false;
                    }


                    return (
                        String(masterKey)
                            .trim()
                            .toLowerCase()
                        ===
                        String(key)
                            .trim()
                            .toLowerCase()
                    );

                }
            ) || null;

        }


        /* =====================================================
           AMBIL DATA KARYAWAN
        ===================================================== */

        let daftarKaryawan = [];


        if (Array.isArray(item.karyawan)) {

            daftarKaryawan =
                item.karyawan.slice();

        }

        else if (Array.isArray(item.karyawanList)) {

            daftarKaryawan =
                item.karyawanList.slice();

        }

        else if (Array.isArray(item.karyawanData)) {

            daftarKaryawan =
                item.karyawanData.slice();

        }

        else if (Array.isArray(item.daftarKaryawan)) {

            daftarKaryawan =
                item.daftarKaryawan.slice();

        }

        else if (Array.isArray(item.employees)) {

            daftarKaryawan =
                item.employees.slice();

        }

        else if (Array.isArray(item.karyawanIds)) {

            daftarKaryawan =
                item.karyawanIds.map(
                    function(idKaryawan) {

                        return {
                            id: idKaryawan
                        };

                    }
                );

        }

        else if (
            item.karyawanId !== undefined &&
            item.karyawanId !== null
        ) {

            daftarKaryawan = [
                {
                    id: item.karyawanId
                }
            ];

        }

        else if (
            item.karyawan &&
            typeof item.karyawan === "object"
        ) {

            daftarKaryawan = [
                item.karyawan
            ];

        }

        else if (
            typeof item.karyawan === "string"
        ) {

            try {

                const parsed =
                    JSON.parse(item.karyawan);


                daftarKaryawan =
                    Array.isArray(parsed)
                        ? parsed
                        : [parsed];

            }
            catch (e) {

                daftarKaryawan = [
                    item.karyawan
                ];

            }

        }


        /* =====================================================
           NORMALISASI KARYAWAN
        ===================================================== */

        const karyawanFinal =
            daftarKaryawan.map(
                function(dataKaryawan) {

                    let data =
                        dataKaryawan;


                    const master =
                        findMasterKaryawan(data);


                    if (
                        master &&
                        typeof data === "object"
                    ) {

                        data = {
                            ...master,
                            ...data
                        };

                    }

                    else if (master) {

                        data = master;

                    }


                    if (
                        data === null ||
                        data === undefined
                    ) {

                        return {
                            nama: "-",
                            nik: "-"
                        };

                    }


                    if (
                        typeof data !== "object"
                    ) {

                        const masterData =
                            findMasterKaryawan(data);


                        if (masterData) {

                            data =
                                masterData;

                        }

                        else {

                            return {
                                nama: String(data),
                                nik: String(data)
                            };

                        }

                    }


                    const nama =
                        data.nama ||
                        data.namaKaryawan ||
                        data.nama_lengkap ||
                        data.name ||
                        data.fullName ||
                        data.employeeName ||
                        data.karyawanNama ||
                        data.karyawan_nama ||
                        "-";


                    const nik =
                        data.nik ||
                        data.NIK ||
                        data.nikKaryawan ||
                        data.NIKKaryawan ||
                        data.nik_karyawan ||
                        data.nip ||
                        data.NIP ||
                        data.nomorNik ||
                        data.noNik ||
                        data.no_nik ||
                        data.nomorKaryawan ||
                        data.nomor_karyawan ||
                        data.idKaryawan ||
                        data.id_karyawan ||
                        data.employeeId ||
                        data.employee_id ||
                        data.employeeID ||
                        data.id ||
                        data.ID ||
                        "-";


                    return {
                        nama: String(nama).trim(),
                        nik: String(nik).trim()
                    };

                }
            );


        const dataKaryawan =
            karyawanFinal.filter(
                function(data) {

                    return (
                        data.nama !== "-" ||
                        data.nik !== "-"
                    );

                }
            );


        if (
            dataKaryawan.length === 0
        ) {

            dataKaryawan.push({
                nama: "Tidak ada data karyawan",
                nik: "-"
            });

        }


        /* =====================================================
           AUTO SIZE KARYAWAN
           DIBESARKAN
        ===================================================== */

        const jumlahKaryawan =
            dataKaryawan.length;


        let rowPadding;
        let employeeFontSize;
        let headerPadding;


        if (jumlahKaryawan <= 5) {

            rowPadding = 14;
            employeeFontSize = 13;
            headerPadding = 12;

        }

        else if (jumlahKaryawan <= 10) {

            rowPadding = 12;
            employeeFontSize = 12.5;
            headerPadding = 11;

        }

        else if (jumlahKaryawan <= 15) {

            rowPadding = 10;
            employeeFontSize = 12;
            headerPadding = 10;

        }

        else if (jumlahKaryawan <= 22) {

            rowPadding = 8;
            employeeFontSize = 11;
            headerPadding = 9;

        }

        else if (jumlahKaryawan <= 30) {

            rowPadding = 7;
            employeeFontSize = 10;
            headerPadding = 8;

        }

        else {

            rowPadding = 5;
            employeeFontSize = 9;
            headerPadding = 7;

        }


        /* =====================================================
           ROW KARYAWAN
        ===================================================== */

        let employeeRows = "";


        dataKaryawan.forEach(
            function(dataKaryawan, index) {

                employeeRows += `

                    <tr>

                        <td style="
                            width:55px;
                            padding:${rowPadding}px 6px;
                            text-align:center;
                            background:#f5f5f5;
                            color:#202020;
                            border:1px solid #d7d7d7;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:${employeeFontSize}px;
                            font-weight:400;
                            vertical-align:middle;
                            box-sizing:border-box;
                            line-height:1.35;
                        ">
                            ${index + 1}
                        </td>


                        <td style="
                            width:350px;
                            padding:${rowPadding}px 14px;
                            text-align:left;
                            background:#ffffff;
                            color:#202020;
                            border:1px solid #d7d7d7;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:${employeeFontSize}px;
                            font-weight:400;
                            vertical-align:middle;
                            box-sizing:border-box;
                            line-height:1.35;
                            letter-spacing:.1px;
                            white-space:normal;
                            overflow-wrap:anywhere;
                        ">
                            ${escapeHTML(
                                dataKaryawan.nama
                            )}
                        </td>


                        <td style="
                            width:255px;
                            padding:${rowPadding}px 14px;
                            text-align:left;
                            background:#f5f5f5;
                            color:#202020;
                            border:1px solid #d7d7d7;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:${employeeFontSize}px;
                            font-weight:400;
                            vertical-align:middle;
                            box-sizing:border-box;
                            line-height:1.35;
                            letter-spacing:.1px;
                            white-space:normal;
                            overflow-wrap:anywhere;
                        ">
                            ${escapeHTML(
                                dataKaryawan.nik
                            )}
                        </td>

                    </tr>

                `;

            }
        );


        /* =====================================================
           EXPORT CONTAINER
        ===================================================== */

        exportContainer =
            document.createElement("div");


        exportContainer.style.position =
            "fixed";

        exportContainer.style.left =
            "-100000px";

        exportContainer.style.top =
            "0";

        exportContainer.style.width =
            "794px";

        exportContainer.style.height =
            "auto";

        exportContainer.style.overflow =
            "visible";

        exportContainer.style.background =
            "#ffffff";

        exportContainer.style.margin =
            "0";

        exportContainer.style.padding =
            "0";

        exportContainer.style.boxSizing =
            "border-box";


        /* =====================================================
           HTML EXPORT
        ===================================================== */

        exportContainer.innerHTML = `

            <div style="
                position:relative;
                width:794px;
                min-height:1123px;
                height:auto;
                overflow:visible;
                background:#ffffff;
                color:#202020;
                font-family:Arial,Helvetica,sans-serif;
                box-sizing:border-box;
            ">


                <!-- HEADER -->

                <div style="
                    width:794px;
                    height:112px;
                    background:rgb(247,244,15);
                    display:flex;
                    align-items:center;
                    padding:0 55px;
                    box-sizing:border-box;
                ">

                    <div style="
                        width:92px;
                        height:60px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        flex-shrink:0;
                        margin-right:20px;
                    ">

                        <img
                            class="linfox-export-logo"
                            src="Logo.png"
                            crossorigin="anonymous"
                            style="
                                max-width:92px;
                                max-height:60px;
                                width:auto;
                                height:auto;
                                object-fit:contain;
                                display:block;
                            "
                        >

                    </div>


                    <div style="
                        flex:1;
                        min-width:0;
                    ">

                        <div style="
                            font-size:20px;
                            font-weight:800;
                            line-height:1.1;
                            white-space:nowrap;
                        ">
                            PT LINFOX LOGISTICS INDONESIA
                        </div>


                        <div style="
                            font-size:9.5px;
                            color:#555555;
                            font-weight:600;
                            margin-top:6px;
                            letter-spacing:.2px;
                        ">
                            LOGISTICS & SUPPLY CHAIN MANAGEMENT
                        </div>

                    </div>


                    <div style="
                        width:104px;
                        height:54px;
                        background:#202020;
                        border-radius:8px;
                        display:flex;
                        flex-direction:column;
                        justify-content:center;
                        align-items:center;
                        flex-shrink:0;
                    ">

                        <div style="
                            color:rgb(247,244,15);
                            font-size:10px;
                            font-weight:800;
                            letter-spacing:.5px;
                        ">
                            DOKUMEN
                        </div>


                        <div style="
                            color:#ffffff;
                            font-size:9px;
                            margin-top:4px;
                            font-weight:600;
                        ">
                            LEMBUR
                        </div>

                    </div>

                </div>


                <!-- JUDUL -->

                <div style="
                    width:660px;
                    margin:0 auto;
                    text-align:center;
                    padding-top:24px;
                    box-sizing:border-box;
                ">

                    <div style="
                        font-size:23px;
                        font-weight:800;
                        line-height:1.15;
                        letter-spacing:.25px;
                    ">
                        SURAT PERINTAH LEMBUR
                    </div>


                    <div style="
                        margin-top:7px;
                        font-size:10px;
                        color:#666666;
                        font-weight:600;
                    ">
                        Planning ID :
                        ${escapeHTML(id)}
                    </div>


                    <div style="
                        width:72px;
                        height:3px;
                        background:rgb(247,244,15);
                        margin:9px auto 0;
                        border-radius:2px;
                    "></div>

                </div>


                <!-- INFORMASI LEMBUR -->

                <div style="
                    width:660px;
                    margin:27px auto 0;
                    box-sizing:border-box;
                ">

                    <div style="
                        display:flex;
                        align-items:center;
                        margin-bottom:11px;
                    ">

                        <div style="
                            width:6px;
                            height:21px;
                            background:rgb(247,244,15);
                            border-radius:3px;
                            margin-right:10px;
                            flex-shrink:0;
                        "></div>


                        <div style="
                            font-size:15px;
                            font-weight:800;
                            letter-spacing:.15px;
                            line-height:1.2;
                        ">
                            INFORMASI LEMBUR
                        </div>

                    </div>


                    <div style="
                        width:660px;
                        background:#f3f3f3;
                        border:1px solid #d7d7d7;
                        border-radius:9px;
                        padding:0;
                        overflow:hidden;
                        box-sizing:border-box;
                    ">

                        <table style="
                            width:660px;
                            max-width:660px;
                            border-collapse:collapse;
                            border-spacing:0;
                            table-layout:fixed;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:11.5px;
                            margin:0;
                            padding:0;
                            box-sizing:border-box;
                        ">

                            <colgroup>
                                <col style="width:105px;">
                                <col style="width:225px;">
                                <col style="width:105px;">
                                <col style="width:225px;">
                            </colgroup>


                            <tr>

                                <td style="
                                    width:105px;
                                    height:44px;
                                    padding:11px 12px;
                                    background:#e5e5e5;
                                    color:#555555;
                                    border:1px solid #d2d2d2;
                                    font-weight:700;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:nowrap;
                                ">
                                    ID Planning
                                </td>


                                <td style="
                                    width:225px;
                                    height:44px;
                                    padding:11px 13px;
                                    background:#ffffff;
                                    color:#202020;
                                    border:1px solid #d2d2d2;
                                    font-weight:600;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:nowrap;
                                    overflow:hidden;
                                    text-overflow:ellipsis;
                                ">
                                    ${escapeHTML(id)}
                                </td>


                                <td style="
                                    width:105px;
                                    height:44px;
                                    padding:11px 12px;
                                    background:#e5e5e5;
                                    color:#555555;
                                    border:1px solid #d2d2d2;
                                    font-weight:700;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:nowrap;
                                ">
                                    Jam Selesai
                                </td>


                                <td style="
                                    width:225px;
                                    height:44px;
                                    padding:11px 13px;
                                    background:#ffffff;
                                    color:#202020;
                                    border:1px solid #d2d2d2;
                                    font-weight:600;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:nowrap;
                                    overflow:hidden;
                                    text-overflow:ellipsis;
                                ">
                                    ${escapeHTML(jamSelesai)}
                                </td>

                            </tr>


                            <tr>

                                <td style="
                                    width:105px;
                                    height:44px;
                                    padding:11px 12px;
                                    background:#e5e5e5;
                                    color:#555555;
                                    border:1px solid #d2d2d2;
                                    font-weight:700;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:nowrap;
                                ">
                                    Tanggal
                                </td>


                                <td style="
                                    width:225px;
                                    height:44px;
                                    padding:11px 13px;
                                    background:#ffffff;
                                    color:#202020;
                                    border:1px solid #d2d2d2;
                                    font-weight:600;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:nowrap;
                                    overflow:hidden;
                                    text-overflow:ellipsis;
                                ">
                                    ${escapeHTML(tanggalTampil)}
                                </td>


                                <td style="
                                    width:105px;
                                    height:44px;
                                    padding:11px 12px;
                                    background:#e5e5e5;
                                    color:#555555;
                                    border:1px solid #d2d2d2;
                                    font-weight:700;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:nowrap;
                                ">
                                    Durasi
                                </td>


                                <td style="
                                    width:225px;
                                    height:44px;
                                    padding:11px 13px;
                                    background:#ffffff;
                                    color:#202020;
                                    border:1px solid #d2d2d2;
                                    font-weight:600;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:nowrap;
                                    overflow:hidden;
                                    text-overflow:ellipsis;
                                ">
                                    ${escapeHTML(durasi)}
                                </td>

                            </tr>


                            <tr>

                                <td style="
                                    width:105px;
                                    height:44px;
                                    padding:11px 12px;
                                    background:#e5e5e5;
                                    color:#555555;
                                    border:1px solid #d2d2d2;
                                    font-weight:700;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:nowrap;
                                ">
                                    Jam Mulai
                                </td>


                                <td style="
                                    width:225px;
                                    height:44px;
                                    padding:11px 13px;
                                    background:#ffffff;
                                    color:#202020;
                                    border:1px solid #d2d2d2;
                                    font-weight:600;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:nowrap;
                                    overflow:hidden;
                                    text-overflow:ellipsis;
                                ">
                                    ${escapeHTML(jamMulai)}
                                </td>


                                <td style="
                                    width:105px;
                                    height:44px;
                                    padding:11px 12px;
                                    background:#e5e5e5;
                                    color:#555555;
                                    border:1px solid #d2d2d2;
                                    font-weight:700;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:nowrap;
                                ">
                                    Jenis Lembur
                                </td>


                                <td style="
                                    width:225px;
                                    height:44px;
                                    padding:11px 13px;
                                    background:#ffffff;
                                    color:#202020;
                                    border:1px solid #d2d2d2;
                                    font-weight:600;
                                    vertical-align:middle;
                                    box-sizing:border-box;
                                    white-space:normal;
                                    overflow-wrap:anywhere;
                                    line-height:1.35;
                                ">
                                    ${escapeHTML(jenisLemburTampil)}
                                </td>

                            </tr>

                        </table>

                    </div>

                </div>


                <!-- =================================================
                     DAFTAR KARYAWAN
                     DIBESARKAN
                ================================================= -->

                <div style="
                    width:660px;
                    margin:35px auto 0;
                    box-sizing:border-box;
                ">


                    <div style="
                        display:flex;
                        align-items:center;
                        margin-bottom:13px;
                    ">

                        <div style="
                            width:7px;
                            height:24px;
                            background:rgb(247,244,15);
                            border-radius:3px;
                            margin-right:11px;
                            flex-shrink:0;
                        "></div>


                        <div style="
                            font-size:17px;
                            font-weight:800;
                            letter-spacing:.15px;
                            line-height:1.2;
                        ">
                            DAFTAR KARYAWAN
                        </div>

                    </div>


                    <div style="
                        width:660px;
                        border:1px solid #d7d7d7;
                        border-radius:10px;
                        overflow:hidden;
                        box-sizing:border-box;
                    ">

                        <table style="
                            width:660px;
                            max-width:660px;
                            border-collapse:collapse;
                            border-spacing:0;
                            table-layout:fixed;
                            font-family:Arial,Helvetica,sans-serif;
                            font-size:${employeeFontSize}px;
                            margin:0;
                            padding:0;
                        ">

                            <colgroup>

                                <col style="
                                    width:55px;
                                ">

                                <col style="
                                    width:350px;
                                ">

                                <col style="
                                    width:255px;
                                ">

                            </colgroup>


                            <thead>

                                <tr>

                                    <th style="
                                        width:55px;
                                        padding:${headerPadding}px 6px;
                                        background:#202020;
                                        color:rgb(247,244,15);
                                        border:1px solid #202020;
                                        text-align:center;
                                        font-size:${employeeFontSize}px;
                                        font-weight:800;
                                        box-sizing:border-box;
                                        line-height:1.3;
                                    ">
                                        NO
                                    </th>


                                    <th style="
                                        width:350px;
                                        padding:${headerPadding}px 14px;
                                        background:#202020;
                                        color:rgb(247,244,15);
                                        border:1px solid #202020;
                                        text-align:left;
                                        font-size:${employeeFontSize}px;
                                        font-weight:800;
                                        box-sizing:border-box;
                                        line-height:1.3;
                                    ">
                                        NAMA KARYAWAN
                                    </th>


                                    <th style="
                                        width:255px;
                                        padding:${headerPadding}px 14px;
                                        background:#202020;
                                        color:rgb(247,244,15);
                                        border:1px solid #202020;
                                        text-align:left;
                                        font-size:${employeeFontSize}px;
                                        font-weight:800;
                                        box-sizing:border-box;
                                        line-height:1.3;
                                    ">
                                        NIK / ID
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                ${employeeRows}

                            </tbody>

                        </table>

                    </div>


                    <!-- TOTAL -->

                    <div style="
                        width:660px;
                        margin-top:14px;
                        padding:14px 16px;
                        background:#fffedc;
                        border:1px solid rgb(247,244,15);
                        border-radius:9px;
                        text-align:center;
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:12.5px;
                        font-weight:700;
                        line-height:1.35;
                        box-sizing:border-box;
                    ">

                        TOTAL KARYAWAN :
                        ${jumlahKaryawan}
                        ORANG

                    </div>

                </div>


                <!-- =================================================
                     CATATAN
                     DIBESARKAN
                ================================================= -->

                <div style="
                    width:660px;
                    margin:31px auto 0;
                    padding:16px 18px;
                    background:#fafafa;
                    border:1px solid #e1e1e1;
                    border-radius:9px;
                    box-sizing:border-box;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:11.5px;
                    color:#666666;
                    line-height:1.55;
                ">

                    <span style="
                        font-weight:700;
                        color:#333333;
                    ">
                        Catatan:
                    </span>

                    Dokumen ini merupakan surat perintah lembur
                    berdasarkan planning yang telah dibuat.

                </div>


                <!-- =================================================
                     TANDA TANGAN
                     DIBESARKAN
                ================================================= -->

                <div style="
                    width:590px;
                    margin:34px auto 0;
                    display:flex;
                    justify-content:space-between;
                    text-align:center;
                    box-sizing:border-box;
                ">


                    <div style="
                        width:190px;
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:11px;
                        color:#666666;
                    ">

                        <div style="
                            font-weight:600;
                            margin-bottom:8px;
                        ">
                            Mengetahui,
                        </div>


                        <div style="
                            height:52px;
                        "></div>


                        <div style="
                            border-bottom:1px solid #999999;
                            width:100%;
                        "></div>


                        <div style="
                            margin-top:7px;
                            font-size:10px;
                            color:#888888;
                        ">
                            Supervisor / Atasan
                        </div>

                    </div>


                    <div style="
                        width:190px;
                        font-family:Arial,Helvetica,sans-serif;
                        font-size:11px;
                        color:#666666;
                    ">

                        <div style="
                            font-weight:600;
                            margin-bottom:8px;
                        ">
                            Dibuat oleh,
                        </div>


                        <div style="
                            height:52px;
                        "></div>


                        <div style="
                            border-bottom:1px solid #999999;
                            width:100%;
                        "></div>


                        <div style="
                            margin-top:7px;
                            font-size:10px;
                            color:#888888;
                        ">
                            PIC Planning
                        </div>

                    </div>

                </div>


                <!-- =================================================
                     FOOTER
                     DIBESARKAN
                ================================================= -->

                <div style="
                    position:absolute;
                    left:67px;
                    right:67px;
                    bottom:17px;
                    height:31px;
                    border-top:2px solid rgb(247,244,15);
                    display:flex;
                    align-items:flex-end;
                    justify-content:space-between;
                    padding-top:8px;
                    box-sizing:border-box;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:9px;
                    color:#888888;
                ">

                    <span>
                        Planning Lembur -
                        ${escapeHTML(id)}
                    </span>


                    <span>
                        PT LINFOX LOGISTICS INDONESIA
                    </span>

                </div>


            </div>

        `;


        /* =====================================================
           APPEND
        ===================================================== */

        document.body.appendChild(
            exportContainer
        );


        /* =====================================================
           LOAD LOGO
        ===================================================== */

        const logo =
            exportContainer.querySelector(
                ".linfox-export-logo"
            );


        if (logo) {

            await new Promise(
                function(resolve) {

                    let selesai = false;


                    function finish() {

                        if (selesai) {
                            return;
                        }

                        selesai = true;
                        resolve();

                    }


                    if (logo.complete) {

                        finish();
                        return;

                    }


                    logo.onload =
                        finish;

                    logo.onerror =
                        finish;


                    setTimeout(
                        finish,
                        2000
                    );

                }
            );


            if (!logo.naturalWidth) {

                logo.style.display =
                    "none";

            }

        }


        const exportPage =
            exportContainer.firstElementChild;

        let exportHeight = 1123;

        if (exportPage) {
            exportPage.style.height = "auto";
            exportPage.style.minHeight = "1123px";
            exportPage.style.overflow = "visible";
            exportContainer.style.height = "auto";
            exportContainer.style.overflow = "visible";

            exportHeight = Math.max(
                1123,
                exportPage.scrollHeight
            );

            exportPage.style.height = `${exportHeight}px`;
            exportContainer.style.height = `${exportHeight}px`;
        }


        /* =====================================================
           RENDER
        ===================================================== */

        showPlanningLoading(
            "Membuat gambar PNG..."
        );


        await new Promise(
            function(resolve) {

                requestAnimationFrame(
                    function() {

                        requestAnimationFrame(
                            resolve
                        );

                    }
                );

            }
        );


        let canvas = null;


        try {

            canvas =
                await html2canvas(
                    exportContainer,
                    {
                        scale:1.5,

                        width:794,

                        height:exportHeight,

                        windowWidth:794,

                        windowHeight:exportHeight,

                        backgroundColor:"#ffffff",

                        useCORS:true,

                        allowTaint:false,

                        imageTimeout:5000,

                        logging:false,

                        scrollX:0,

                        scrollY:0,

                        foreignObjectRendering:false,

                        removeContainer:true
                    }
                );

        }

        catch (firstError) {

            console.warn(
                "[PNG] Render pertama gagal:",
                firstError
            );


            if (logo) {
                logo.style.display = "none";
            }


            canvas =
                await html2canvas(
                    exportContainer,
                    {
                        scale:1,

                        width:794,

                        height:exportHeight,

                        windowWidth:794,

                        windowHeight:exportHeight,

                        backgroundColor:"#ffffff",

                        useCORS:false,

                        allowTaint:false,

                        imageTimeout:2000,

                        logging:false,

                        scrollX:0,

                        scrollY:0,

                        foreignObjectRendering:false,

                        removeContainer:true
                    }
                );

        }


        if (!canvas) {

            throw new Error(
                "Canvas PNG gagal dibuat."
            );

        }


        /* =====================================================
           BLOB
        ===================================================== */

        showPlanningLoading(
            "Menyiapkan file PNG..."
        );


        const blob =
            await new Promise(
                function(resolve, reject) {

                    try {
                        canvas.toBlob(
                            function(hasil) {
                                if (!hasil) {
                                    reject(new Error("PNG gagal dibuat."));
                                    return;
                                }

                                if (hasil.size <= 0) {
                                    reject(new Error("File PNG kosong."));
                                    return;
                                }

                                resolve(hasil);
                            },
                            "image/png"
                        );
                    }
                    catch (e) {
                        reject(e);
                    }
                }
            );


        objectURL =
            URL.createObjectURL(blob);


        const namaFile =
            String(idPlanning)
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    "_"
                );


        downloadLink =
            document.createElement("a");

        downloadLink.style.position = "fixed";
        downloadLink.style.left = "-99999px";
        downloadLink.style.top = "0";
        downloadLink.style.width = "1px";
        downloadLink.style.height = "1px";
        downloadLink.style.opacity = "0";
        downloadLink.href = objectURL;
        downloadLink.download = `SPL_${namaFile}.png`;
        document.body.appendChild(downloadLink);

        await new Promise(function(resolve) {
            requestAnimationFrame(function() {
                try {
                    downloadLink.click();
                }
                catch (e) {
                    console.error("[PNG] Download error:", e);
                }
                setTimeout(resolve, 500);
            });
        });

        /* =====================================================
           SUCCESS
        ===================================================== */

        if (
            typeof showPlanningToast ===
            "function"
        ) {

            showPlanningToast(
                "success",
                "PNG berhasil dibuat",
                `SPL ${idPlanning} berhasil dibuat.`
            );

        }

    }


    catch (error) {

        console.error(
            "[CETAK PNG] GAGAL:",
            error
        );


        if (
            typeof showPlanningToast ===
            "function"
        ) {

            showPlanningToast(
                "error",
                "PNG gagal dibuat",
                error &&
                error.message
                    ? error.message
                    : "Terjadi kesalahan saat membuat PNG."
            );

        }

        else {

            alert(
                error &&
                error.message
                    ? error.message
                    : "PNG gagal dibuat."
            );

        }

    }

 
    finally {

        try {

            if (
                downloadLink &&
                downloadLink.parentNode
            ) {
                downloadLink.parentNode.removeChild(downloadLink);
            }

        }

        catch (e) {}


        try {

            if (objectURL) {
                URL.revokeObjectURL(objectURL);
            }

        }

        catch (e) {}


        try {

            if (
                exportContainer &&
                exportContainer.parentNode
            ) {

                exportContainer.parentNode
                    .removeChild(
                        exportContainer
                    );

            }

        }

        catch (e) {}


        try {

            setTimeout(
                function() {

                    try {
                        hidePlanningLoading();
                    }

                    catch (e) {}

                },
                300
            );

        }

        catch (e) {}


        planningCRUDLoading = false;

    }

}
    /* =========================================================
    INITIALIZE EVENTS
    ========================================================= */

    function initPlanningEvents() {

        const jamMulai =
            planningEl("jamMulai");

        if (
            jamMulai &&
            !jamMulai.dataset.planningDuration
        ) {

            jamMulai.addEventListener(
                "input",
                hitungDurasiPlanning
            );

            jamMulai.dataset.planningDuration =
                "true";
        }

        const jamSelesai =
            planningEl("jamSelesai");

        if (
            jamSelesai &&
            !jamSelesai.dataset.planningDuration
        ) {

            jamSelesai.addEventListener(
                "input",
                hitungDurasiPlanning
            );

            jamSelesai.dataset.planningDuration =
                "true";
        }

        const button =
            planningEl(
                "btnBuatPlanning"
            );

        if (
            button &&
            !button.dataset.planningListener
        ) {

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    buatPlanning();

                }
            );

            button.dataset.planningListener =
                "true";
        }

        const form =
            planningEl(
                "formPlanning"
            );

        if (
            form &&
            !form.dataset.planningListener
        ) {

            form.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    buatPlanning();

                }
            );

            form.dataset.planningListener =
                "true";
        }

        createPlanningSearch();

        hitungDurasiPlanning();

    }


    /* =========================================================
    GLOBAL EVENT - PREVIEW
    ========================================================= */

    function initPlanningGlobalEvents() {

        if (
            PlanningState.previewEventsInitialized
        ) {
            return;
        }

        PlanningState.previewEventsInitialized =
            true;

        document.addEventListener(
            "keydown",
            function (event) {

                if (event.key !== "Escape") {
                    return;
                }

                const modal =
                    planningEl(
                        "planningPreviewModal"
                    );

                if (
                    modal &&
                    modal.classList.contains(
                        "active"
                    )
                ) {

                    closePreviewPlanning();

                }

            }
        );

        document.addEventListener(
            "input",
            function (event) {

                if (
                    event.target?.id ===
                        "previewJamMulai" ||
                    event.target?.id ===
                        "previewJamSelesai"
                ) {

                    hitungDurasiPreview();

                }

            }
        );

        document.addEventListener(
            "click",
            function (event) {

                const result =
                    planningEl(
                        "previewSearchResult"
                    );

                const search =
                    planningEl(
                        "previewSearchKaryawan"
                    );

                if (
                    !result ||
                    !search
                ) {
                    return;
                }

                if (
                    !result.contains(
                        event.target
                    ) &&
                    event.target !== search
                ) {

                    result.classList.remove(
                        "active"
                    );

                }

            }
        );

    }


    /* =========================================================
    DOM READY
    ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            function () {
initPlanningFilters();
                initPlanningEvents();

                initPlanningGlobalEvents();

                initPlanningToast();

            }
        );

    } else {

        initPlanningEvents();

        initPlanningGlobalEvents();

        initPlanningToast();

    }
function initPlanningFilters() {

    const filterTanggal =
        planningEl("filterTanggal");

    const filterKaryawan =
        planningEl("filterKaryawan");


    if (filterTanggal) {

        filterTanggal.onchange = function () {

            console.log(
                "Filter tanggal:",
                this.value
            );

            renderPlanning();

        };

    }


    if (filterKaryawan) {

        filterKaryawan.onchange = function () {

            console.log(
                "Filter karyawan:",
                this.value
            );

            renderPlanning();

        };

    }

}

    /* =========================================================
    DATABASE READY
    ========================================================= */

    document.addEventListener(
        "databaseReady",
        function () {

            renderPlanning();

            if (
                typeof updateKaryawanDropdown ===
                "function"
            ) {

                updateKaryawanDropdown();

            }

        }
    );