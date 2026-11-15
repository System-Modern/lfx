/* =========================================================
   APP.JS - OPTIMIZED + DASHBOARD FILTER PERIODE
   ---------------------------------------------------------
   FITUR:
   - Dashboard
   - Total Karyawan
   - Total Planning
   - Total Jam Lembur
   - Planning Hari Ini
   - Filter Periode Dashboard
   - Trend Mand Power
   - Distribusi Durasi
   - Total Plan di tengah Doughnut
   - Top Karyawan Lembur
   - Angka langsung di grafik
   - Angka Top Karyawan tidak terpotong
   - Planning Terbaru
   - Reset Filter Dashboard

   FILTER:
   - Tanggal mulai + akhir
   - Hanya tanggal mulai
   - Hanya tanggal akhir
   - Kosong = semua data

   CATATAN:
   DISTRIBUSI DURASI = JUMLAH PLAN
   BUKAN JUMLAH KARYAWAN
========================================================= */


/* =========================================================
   CHART INSTANCE
========================================================= */

let planningChartInstance = null;

let durasiChartInstance = null;

let karyawanChartInstance = null;


/* =========================================================
   STATE
========================================================= */

const AppState = {

    initialized: false,

    databaseReady: false,

    dashboardInitialized: false,

    dashboardFilteredPlanning: []

};


/* =========================================================
   COLOR SYSTEM
========================================================= */

const APP_COLORS = {

    primary: "#2563EB",

    primaryDark: "#1D4ED8",

    primarySoft: "#EFF6FF",


    yellow: "#F59E0B",

    yellowDark: "#D97706",

    yellowSoft: "#FFFBEB",


    navy: "#0F172A",

    navyLight: "#334155",


    slate: "#64748B",

    slateLight: "#94A3B8",


    amber: "#F59E0B",

    amberSoft: "#FFFBEB",


    green: "#10B981",

    greenSoft: "#ECFDF5",


    blue: "#2563EB",

    blueSoft: "#EFF6FF",


    purple: "#4F46E5",

    purpleSoft: "#EEF2FF",


    background: "#F4F7FB",

    surface: "#FFFFFF",

    border: "#E2E8F0",


    text: "#0F172A",

    textSoft: "#64748B",


    danger: "#EF4444"

};


/* =========================================================
   CHART DATALABELS
========================================================= */

function registerChartDataLabels() {

    if (
        typeof Chart === "undefined" ||
        typeof ChartDataLabels === "undefined"
    ) {

        console.warn(
            "[APP] ChartDataLabels belum tersedia."
        );

        return;

    }


    try {

        const registered =
            Chart.registry &&
            Chart.registry.plugins &&
            Chart.registry.plugins.get
                ? Chart.registry.plugins.get(
                    "datalabels"
                )
                : null;


        if (!registered) {

            Chart.register(
                ChartDataLabels
            );

        }

    } catch (error) {

        console.warn(
            "[APP] Gagal register ChartDataLabels:",
            error
        );

    }

}


/* =========================================================
   PAGE INFO
========================================================= */

const PAGE_INFO = {

    dashboard: [

        "Dasbor",

        "Ringkasan rencana lembur karyawan"

    ],


    karyawan: [

        "Data Karyawan",

        "Kelola data karyawan"

    ],


    planning: [

        "Rencana Lembur",

        "Atur jadwal lembur karyawan"

    ],


    laporan: [

        "Laporan Riwayat",

        "Riwayat lembur berdasarkan karyawan"

    ]

};


/* =========================================================
   DOM HELPER
========================================================= */

function appEl(id) {

    return document.getElementById(id);

}


function setText(
    id,
    value
) {

    const el =
        appEl(id);


    if (el) {

        el.textContent =
            value;

    }

}


/* =========================================================
   DATA HELPER
========================================================= */

function getPlanningData() {

    if (
        Array.isArray(
            window.planning
        )
    ) {

        return window.planning;

    }


    return [];

}


function getKaryawanData() {

    if (
        Array.isArray(
            window.karyawan
        )
    ) {

        return window.karyawan;

    }


    return [];

}


/* =========================================================
   DEBUG
========================================================= */

function debugAppData() {

    console.log(
        "[APP] Karyawan:",
        getKaryawanData().length
    );


    console.log(
        "[APP] Planning:",
        getPlanningData().length
    );

}


/* =========================================================
   NORMALISASI TANGGAL
========================================================= */

function normalizePlanningDate(
    tanggal
) {

    if (
        tanggal === null ||
        tanggal === undefined
    ) {

        return "";

    }


    const value =
        String(
            tanggal
        ).trim();


    if (!value) {

        return "";

    }


    /*
     * Format database:
     * YYYY-MM-DD
     */

    if (
        /^\d{4}-\d{2}-\d{2}/.test(
            value
        )
    ) {

        return value.substring(
            0,
            10
        );

    }


    /*
     * Kalau ternyata tanggal
     * berupa Date object/string
     */

    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return [

        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


/* =========================================================
   GET FILTER DASHBOARD
========================================================= */

function getDashboardFilter() {

    const tanggalAwalEl =
        appEl(
            "dashboardTanggalAwal"
        );


    const tanggalAkhirEl =
        appEl(
            "dashboardTanggalAkhir"
        );


    const tanggalAwal =
        tanggalAwalEl
            ? String(
                tanggalAwalEl.value || ""
            ).trim()
            : "";


    const tanggalAkhir =
        tanggalAkhirEl
            ? String(
                tanggalAkhirEl.value || ""
            ).trim()
            : "";


    return {

        tanggalAwal,

        tanggalAkhir

    };

}


/* =========================================================
   CEK PLANNING MASUK FILTER
========================================================= */

function isPlanningInDashboardFilter(
    item,
    filter
) {

    if (!item) {

        return false;

    }


    const tanggal =
        normalizePlanningDate(
            item.tanggal
        );


    if (!tanggal) {

        return false;

    }


    const tanggalAwal =
        filter.tanggalAwal || "";


    const tanggalAkhir =
        filter.tanggalAkhir || "";


    /*
     * Tidak ada filter
     */

    if (
        !tanggalAwal &&
        !tanggalAkhir
    ) {

        return true;

    }


    /*
     * Hanya tanggal mulai
     * berarti >= tanggal mulai
     */

    if (
        tanggalAwal &&
        !tanggalAkhir
    ) {

        return tanggal >= tanggalAwal;

    }


    /*
     * Hanya tanggal akhir
     * berarti <= tanggal akhir
     */

    if (
        !tanggalAwal &&
        tanggalAkhir
    ) {

        return tanggal <= tanggalAkhir;

    }


    /*
     * Dua tanggal
     */

    return (
        tanggal >= tanggalAwal &&
        tanggal <= tanggalAkhir
    );

}


/* =========================================================
   GET FILTERED DASHBOARD PLANNING
========================================================= */

function getDashboardFilteredPlanning() {

    const planning =
        getPlanningData();


    const filter =
        getDashboardFilter();


    /*
     * Jika tanggal awal lebih besar
     * dari tanggal akhir,
     * jangan tampilkan data.
     */

    if (
        filter.tanggalAwal &&
        filter.tanggalAkhir &&
        filter.tanggalAwal >
        filter.tanggalAkhir
    ) {

        return [];

    }


    return planning.filter(
        item =>
            isPlanningInDashboardFilter(
                item,
                filter
            )
    );

}


/* =========================================================
   JUMLAH KARYAWAN DALAM PLANNING
========================================================= */

function getJumlahKaryawanPlanning(item) {

    if (!item) {

        return 0;

    }


    if (
        Array.isArray(
            item.karyawan
        )
    ) {

        return item.karyawan.length;

    }


    if (
        Array.isArray(
            item.karyawanList
        )
    ) {

        return item.karyawanList.length;

    }


    if (
        Array.isArray(
            item.karyawan_ids
        )
    ) {

        return item.karyawan_ids.length;

    }


    if (
        Array.isArray(
            item.kodeKaryawanList
        )
    ) {

        return item.kodeKaryawanList.length;

    }


    if (
        Array.isArray(
            item.kode_karyawan_list
        )
    ) {

        return item.kode_karyawan_list.length;

    }


    if (
        item.jumlahKaryawan !== undefined &&
        item.jumlahKaryawan !== null
    ) {

        return (
            Number(
                item.jumlahKaryawan
            ) || 0
        );

    }


    if (
        item.jumlah_karyawan !== undefined &&
        item.jumlah_karyawan !== null
    ) {

        return (
            Number(
                item.jumlah_karyawan
            ) || 0
        );

    }


    return 0;

}


/* =========================================================
   HITUNG DURASI
========================================================= */

function getDurasiMenitPlanning(item) {

    if (!item) {

        return 0;

    }


    if (
        item.durasiMenit !== undefined &&
        item.durasiMenit !== null
    ) {

        const menit =
            Number(
                item.durasiMenit
            );


        if (
            Number.isFinite(menit) &&
            menit > 0
        ) {

            return menit;

        }

    }


    if (
        item.durasi_menit !== undefined &&
        item.durasi_menit !== null
    ) {

        const menit =
            Number(
                item.durasi_menit
            );


        if (
            Number.isFinite(menit) &&
            menit > 0
        ) {

            return menit;

        }

    }


    const jamMulai =
        item.jamMulai ||
        item.jam_mulai;


    const jamSelesai =
        item.jamSelesai ||
        item.jam_selesai;


    if (
        jamMulai &&
        jamSelesai
    ) {

        const mulai =
            parseTimeToMinutes(
                jamMulai
            );


        const selesai =
            parseTimeToMinutes(
                jamSelesai
            );


        if (
            mulai !== null &&
            selesai !== null
        ) {

            let selisih =
                selesai -
                mulai;


            if (
                selisih < 0
            ) {

                selisih +=
                    24 * 60;

            }


            return selisih;

        }

    }


    return 0;

}


/* =========================================================
   PARSE TIME
========================================================= */

function parseTimeToMinutes(
    time
) {

    if (!time) {

        return null;

    }


    const value =
        String(
            time
        ).trim();


    const match =
        value.match(
            /^(\d{1,2}):(\d{2})/
        );


    if (!match) {

        return null;

    }


    const jam =
        Number(
            match[1]
        );


    const menit =
        Number(
            match[2]
        );


    if (
        jam < 0 ||
        jam > 23 ||
        menit < 0 ||
        menit > 59
    ) {

        return null;

    }


    return (
        jam * 60 +
        menit
    );

}


/* =========================================================
   TOTAL JAM PLANNING
========================================================= */

function getTotalJamPlanning(
    item
) {

    const durasiMenit =
        getDurasiMenitPlanning(
            item
        );


    if (!durasiMenit) {

        return 0;

    }


    return (
        durasiMenit /
        60
    );

}


/* =========================================================
   TOTAL JAM LEMBUR
========================================================= */

function getTotalJamLembur(
    planning
) {

    if (
        !Array.isArray(
            planning
        )
    ) {

        return 0;

    }


    let totalJam = 0;


    for (
        const item of planning
    ) {

        totalJam +=
            getTotalJamPlanning(
                item
            );

    }


    return totalJam;

}


/* =========================================================
   FORMAT TOTAL JAM
========================================================= */

function formatTotalJam(
    jam
) {

    const value =
        Number(
            jam
        ) || 0;


    if (
        Number.isInteger(
            value
        )
    ) {

        return `${value} Jam`;

    }


    return `${value.toFixed(1)} Jam`;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapePlanningHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   TODAY
========================================================= */

function getToday() {

    const now =
        new Date();


    return [

        now.getFullYear(),

        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatPlanningDate(
    tanggal
) {

    if (
        typeof formatTanggalPlanning ===
        "function"
    ) {

        return formatTanggalPlanning(
            tanggal
        );

    }


    return tanggal || "-";

}


/* =========================================================
   FORMAT DURATION
========================================================= */

function formatPlanningDuration(
    item
) {

    const menit =
        getDurasiMenitPlanning(
            item
        );


    if (!menit) {

        return "-";

    }


    if (
        typeof formatDurasiPlanning ===
        "function"
    ) {

        return formatDurasiPlanning(
            menit
        );

    }


    const jam =
        menit / 60;


    if (
        Number.isInteger(
            jam
        )
    ) {

        return `${jam} Jam`;

    }


    return `${jam.toFixed(1)} Jam`;

}


/* =========================================================
   NAVIGASI & SIGNATURE CACHE
========================================================= */

const renderedPageSignatures = Object.create(null);
let renderedDropdownHash = null;
let cachedNavPages = null;
let cachedDesktopNavs = null;
let cachedMobileNavs = null;

function hashDigestStep(h, value) {
    const str = String(value ?? "");
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function getKaryawanDigest() {
    const list = getKaryawanData();
    let h = hashDigestStep(2166136261, list.length);
    for (let i = 0; i < list.length; i++) {
        const k = list[i];
        if (!k) continue;
        h = hashDigestStep(h, k.id);
        h = hashDigestStep(h, k.nama);
        h = hashDigestStep(h, k.status);
        h = hashDigestStep(h, k.tanggalLahir);
        h = hashDigestStep(h, k.tanggalPenalti);
        h = hashDigestStep(h, k.alasanPenalti);
        h = hashDigestStep(h, k.updatedAt || k.updated_at || "");
    }
    return h;
}

function getPlanningDigest() {
    const list = getPlanningData();
    let h = hashDigestStep(2166136261, list.length);
    h = hashDigestStep(h, window.__planburEvidenceVersion || 0);
    for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (!p) continue;
        h = hashDigestStep(h, p.idPlanning || p.kodePlanning || p.id);
        h = hashDigestStep(h, p.tanggal);
        h = hashDigestStep(h, p.jamMulai || p.jam_mulai);
        h = hashDigestStep(h, p.jamSelesai || p.jam_selesai);
        h = hashDigestStep(h, p.durasiMenit || p.durasi);
        h = hashDigestStep(h, p.jenisLembur || p.jenis_lembur);
        h = hashDigestStep(h, p.keterangan);
        h = hashDigestStep(h, p.buktiUrl || p.bukti_url || "");
        h = hashDigestStep(h, p.updatedAt || p.updated_at || "");
        h = hashDigestStep(h, Array.isArray(p.karyawan) ? p.karyawan.length : 0);
    }
    return h;
}

function getPageRenderSignature(pageId) {
    const kDigest = getKaryawanDigest();
    const pDigest = getPlanningDigest();

    if (pageId === "dashboard") {
        const dari = appEl("dashboardFilterDari")?.value || "";
        const sampai = appEl("dashboardFilterSampai")?.value || "";
        return `d|${dari}|${sampai}|${pDigest}|${kDigest}`;
    }

    if (pageId === "karyawan") {
        const search = appEl("searchKaryawan")?.value || "";
        return `k|${search}|${kDigest}`;
    }

    if (pageId === "planning") {
        const tgl = appEl("filterTanggal")?.value || "";
        const kar = appEl("filterKaryawan")?.value || "";
        const chip = document.querySelector("#planning .planning-chip.active")?.id || "";
        return `p|${tgl}|${kar}|${chip}|${pDigest}|${kDigest}`;
    }

    if (pageId === "laporan") {
        const lapKar = appEl("laporanKaryawan")?.value || "";
        const lapAwal = appEl("laporanTanggalAwal")?.value || "";
        const lapAkhir = appEl("laporanTanggalAkhir")?.value || "";
        return `l|${lapKar}|${lapAwal}|${lapAkhir}|${pDigest}|${kDigest}`;
    }

    return `${pageId}|${pDigest}|${kDigest}`;
}

function hasPageRenderedContent(pageId) {
    if (pageId === "dashboard") {
        return AppState.dashboardInitialized === true;
    }
    if (pageId === "karyawan") {
        const tbody = appEl("tableKaryawan");
        return Boolean(tbody && tbody.childElementCount > 0);
    }
    if (pageId === "planning") {
        const tbody = appEl("planningTable");
        return Boolean(tbody && tbody.childElementCount > 0);
    }
    if (pageId === "laporan") {
        const tbody = appEl("laporanKaryawanTable");
        return Boolean(tbody && tbody.childElementCount > 0);
    }
    return false;
}

window.__markPageRendered = function (pageId) {
    if (pageId) {
        renderedPageSignatures[pageId] = getPageRenderSignature(pageId);
    }
};

window.__invalidatePageSignature = function (pageId) {
    if (pageId) {
        delete renderedPageSignatures[pageId];
    } else {
        Object.keys(renderedPageSignatures).forEach(function (key) {
            delete renderedPageSignatures[key];
        });
    }
};

window.__markKaryawanDropdownRendered = function () {
    renderedDropdownHash = getKaryawanDigest();
};

function showPage(
    pageId,
    button = null
) {

    if (!cachedNavPages || !cachedNavPages.length) {
        cachedNavPages = Array.from(document.querySelectorAll(".page"));
    }

    cachedNavPages.forEach(
        page => {
            page.classList.toggle(
                "active-page",
                page.id === pageId
            );
        }
    );


    const desktopNavIdMap = {
        dashboard: "navBtnDashboard",
        karyawan: "navBtnKaryawan",
        planning: "navBtnPlanning",
        laporan: "navBtnLaporan"
    };

    if (!cachedDesktopNavs || !cachedDesktopNavs.length) {
        cachedDesktopNavs = Array.from(document.querySelectorAll(".menu-item"));
    }

    const activeDesktopNavId = desktopNavIdMap[pageId];
    cachedDesktopNavs.forEach(
        item => {
            item.classList.toggle(
                "active",
                Boolean(activeDesktopNavId && item.id === activeDesktopNavId)
            );
        }
    );

    if (!cachedMobileNavs || !cachedMobileNavs.length) {
        cachedMobileNavs = Array.from(document.querySelectorAll(".mobile-nav-item"));
    }

    cachedMobileNavs.forEach(
        item => {
            item.classList.toggle(
                "active",
                item.dataset.page === pageId
            );
        }
    );

    if (button) {
        button.classList.add(
            "active"
        );
    }

    if (window.innerWidth <= 768 && window.scrollY > 4) {
        window.scrollTo(0, 0);
    }


    const info =
        PAGE_INFO[
            pageId
        ];


    if (info) {

        setText(
            "pageTitle",
            info[0]
        );


        setText(
            "pageSubtitle",
            info[1]
        );

    }

    const targetSig = getPageRenderSignature(pageId);
    if (renderedPageSignatures[pageId] === targetSig && hasPageRenderedContent(pageId)) {
        return;
    }

    switch (
        pageId
    ) {

        case "dashboard":

            updateDashboard();

            break;


        case "karyawan":

            if (
                typeof renderKaryawan ===
                "function"
            ) {

                renderKaryawan();

            }

            break;


        case "planning":

            if (
                typeof updateKaryawanDropdown ===
                "function"
            ) {
                const karHash = getKaryawanDigest();
                if (renderedDropdownHash !== karHash) {
                    updateKaryawanDropdown();
                }
            }


            if (
                typeof renderPlanning ===
                "function"
            ) {

                renderPlanning();

            }

            break;


        case "laporan":

            if (typeof renderLaporanKaryawan === "function") {
                renderLaporanKaryawan();
            }

            break;

    }

    renderedPageSignatures[pageId] = getPageRenderSignature(pageId);

}


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

function updateDashboard() {

    /*
     * Ambil data sesuai filter
     */

    const filteredPlanning =
        getDashboardFilteredPlanning();


    AppState.dashboardFilteredPlanning =
        filteredPlanning;


    updateDashboardStats(
        filteredPlanning
    );


    updateDashboardCharts(
        filteredPlanning
    );


    renderDashboardPlanning(
        filteredPlanning
    );


    AppState.dashboardInitialized =
        true;

    if (typeof window.__markPageRendered === "function") {
        window.__markPageRendered("dashboard");
    }

}


/* =========================================================
   DASHBOARD STATS
========================================================= */

function updateDashboardStats(
    filteredPlanning = null
) {

    const planning =
        Array.isArray(
            filteredPlanning
        )
            ? filteredPlanning
            : getDashboardFilteredPlanning();


    /*
     * TOTAL KARYAWAN
     *
     * Tetap total karyawan aktif.
     * Filter tanggal hanya memfilter
     * data planning.
     */

    let totalKaryawan = 0;


    if (
        typeof getKaryawanAktif ===
        "function"
    ) {

        const aktif =
            getKaryawanAktif();


        totalKaryawan =
            Array.isArray(
                aktif
            )
                ? aktif.length
                : 0;

    } else {

        totalKaryawan =
            getKaryawanData().length;

    }


    /*
     * TOTAL JAM
     */

    let totalJam = 0;


    for (
        const item of planning
    ) {

        totalJam +=
            getTotalJamPlanning(
                item
            );

    }


    /*
     * PLANNING HARI INI
     */

    let karyawanLemburHariIni =
        0;


    const today =
        getToday();


    /*
     * CARD DURASI
     */

    const durasi = {

        240: 0,

        480: 0,

        720: 0

    };


    for (
        const item of planning
    ) {

        const jumlah =
            getJumlahKaryawanPlanning(
                item
            );


        const menit =
            getDurasiMenitPlanning(
                item
            );


        if (
            normalizePlanningDate(
                item.tanggal
            ) === today
        ) {

            karyawanLemburHariIni +=
                jumlah;

        }


        if (
            durasi[menit] !==
            undefined
        ) {

            durasi[menit] +=
                jumlah;

        }

    }


    setText(
        "totalKaryawan",
        totalKaryawan
    );


    setText(
        "totalPlanning",
        planning.length
    );


    setText(
        "totalJam",
        formatTotalJam(
            totalJam
        )
    );


    setText(
        "planningHariIni",
        karyawanLemburHariIni
    );


    setText(
        "count4Jam",
        durasi[240]
    );


    setText(
        "count8Jam",
        durasi[480]
    );


    setText(
        "count12Jam",
        durasi[720]
    );

}


/* =========================================================
   UPDATE CHART
========================================================= */

function updateDashboardCharts(
    filteredPlanning = null
) {

    if (
        typeof Chart ===
        "undefined"
    ) {

        console.warn(
            "[APP] Chart.js belum tersedia."
        );

        return;

    }


    registerChartDataLabels();

    if (Chart.defaults) {
        Chart.defaults.animation = false;
    }


    const planning =
        Array.isArray(
            filteredPlanning
        )
            ? filteredPlanning
            : getDashboardFilteredPlanning();


    renderPlanningChart(
        planning
    );


    renderDurasiChart(
        planning
    );


    renderKaryawanChart(
        planning
    );

}


/* =========================================================
   CHART 1
   TREND MAND POWER
========================================================= */

function renderPlanningChart(
    planning = getDashboardFilteredPlanning()
) {

    const canvas =
        appEl(
            "planningChart"
        );


    if (
        !canvas ||
        typeof Chart ===
        "undefined"
    ) {

        return;

    }


    const tanggalMap =
        Object.create(
            null
        );


    for (
        const item of planning
    ) {

        const tanggal =
            normalizePlanningDate(
                item.tanggal
            );


        if (!tanggal) {

            continue;

        }


        tanggalMap[tanggal] =
            (
                tanggalMap[tanggal] ||
                0
            ) +
            getJumlahKaryawanPlanning(
                item
            );

    }


    const tanggal =
        Object.keys(
            tanggalMap
        ).sort();


    const labels =
        tanggal.map(
            formatPlanningDate
        );


    const values =
        tanggal.map(
            key =>
                tanggalMap[key]
        );


    const data = {

        labels,

        planningDates:
            tanggal,


        datasets: [{

            label:
                "Mand Power Lembur",


            data:
                values,


            borderColor:
                APP_COLORS.yellow,


            backgroundColor:
                "rgba(247,244,15,0.16)",


            borderWidth:
                3,


            tension:
                0.35,


            fill:
                true,


            pointRadius:
                4,


            pointHoverRadius:
                7,


            pointBackgroundColor:
                APP_COLORS.surface,


            pointBorderColor:
                APP_COLORS.yellow,


            pointBorderWidth:
                3

        }]

    };


    if (
        planningChartInstance
    ) {

        planningChartInstance.data =
            data;


        planningChartInstance.update(
            "none"
        );


        return;

    }


    planningChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "line",


                data,


                options: {

                    animation: false,

                    responsive:
                        true,


                    maintainAspectRatio:
                        false,

                    onClick:
                        function(event, elements) {
                            if (!elements.length) {
                                return;
                            }

                            const index = elements[0].index;
                            const selectedDate = this.data.planningDates[index];
                            const matchingPlanning = getDashboardFilteredPlanning().filter(function(item) {
                                return normalizePlanningDate(item.tanggal) === selectedDate;
                            });

                            if (typeof window.bukaRiwayatDashboard === "function") {
                                window.bukaRiwayatDashboard(
                                    `Riwayat Lembur - ${this.data.labels[index]}`,
                                    matchingPlanning,
                                    "karyawan"
                                );
                            }
                        },

                    onHover:
                        function(event, elements) {
                            event.native.target.style.cursor =
                                elements.length ? "pointer" : "default";
                        },


                    interaction: {

                        intersect:
                            false,


                        mode:
                            "index"

                    },


                    plugins: {

                        datalabels: {

                            display:
                                true,


                            color:
                                APP_COLORS.text,


                            anchor:
                                "end",


                            align:
                                "top",


                            offset:
                                5,


                            clamp:
                                true,


                            font: {

                                size:
                                    11,


                                weight:
                                    "800"

                            },


                            formatter:
                                function(value) {

                                    return value;

                                }

                        },


                        legend: {

                            labels: {

                                color:
                                    APP_COLORS.text,


                                font: {

                                    weight:
                                        "600"

                                }

                            }

                        },


                        tooltip: {

                            backgroundColor:
                                APP_COLORS.navy,


                            titleColor:
                                APP_COLORS.yellow,


                            bodyColor:
                                APP_COLORS.surface,


                            borderColor:
                                APP_COLORS.yellow,


                            borderWidth:
                                1,


                            padding:
                                12

                        }

                    },


                    scales: {

                        x: {

                            grid: {

                                color:
                                    "rgba(23,32,51,0.07)"

                            },


                            ticks: {

                                color:
                                    APP_COLORS.textSoft

                            }

                        },


                        y: {

                            beginAtZero:
                                true,


                            grid: {

                                color:
                                    "rgba(23,32,51,0.07)"

                            },


                            ticks: {

                                color:
                                    APP_COLORS.textSoft,


                                precision:
                                    0

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   CENTER TEXT PLUGIN
   TOTAL PLAN DI TENGAH DOUGHNUT
========================================================= */

const centerTextPlugin = {

    id:
        "centerTextPlugin",


    afterDraw(chart) {

        const {
            ctx,
            chartArea
        } = chart;


        if (!chartArea) {

            return;

        }


        /*
         * Gunakan data yang sedang difilter.
         */

        const totalPlan =
            Array.isArray(
                AppState.dashboardFilteredPlanning
            )
                ? AppState.dashboardFilteredPlanning.length
                : getPlanningData().length;


        const centerX =
            (
                chartArea.left +
                chartArea.right
            ) / 2;


        const centerY =
            (
                chartArea.top +
                chartArea.bottom
            ) / 2;


        ctx.save();


        ctx.textAlign =
            "center";


        ctx.textBaseline =
            "middle";


        /*
         * LABEL
         */

        ctx.font =
            "700 11px Arial";


        ctx.fillStyle =
            APP_COLORS.textSoft;


        ctx.fillText(
            "TOTAL PLAN",
            centerX,
            centerY - 12
        );


        /*
         * ANGKA
         */

        ctx.font =
            "800 27px Arial";


        ctx.fillStyle =
            APP_COLORS.navy;


        ctx.fillText(
            totalPlan,
            centerX,
            centerY + 12
        );


        ctx.restore();

    }

};


/* =========================================================
   CHART 2
   DISTRIBUSI DURASI
   ---------------------------------------------------------
   WAJIB:
   1 PLAN = 1 HITUNGAN
========================================================= */

function renderDurasiChart(
    planning = getDashboardFilteredPlanning()
) {

    const canvas =
        appEl(
            "durasiChart"
        );


    if (
        !canvas ||
        typeof Chart ===
        "undefined"
    ) {

        return;

    }


    const count = {

        240: 0,

        480: 0,

        720: 0

    };


    /*
     * Setiap item planning
     * = 1 plan.
     */

    for (
        const item of planning
    ) {

        const menit =
            getDurasiMenitPlanning(
                item
            );


        if (
            count[menit] !==
            undefined
        ) {

            count[menit]++;

        }

    }


    const data = {

        labels: [

            "4 Jam",

            "8 Jam",

            "12 Jam"

        ],

        durationMinutes: [240, 480, 720],


        datasets: [{

            data: [

                count[240],

                count[480],

                count[720]

            ],


            backgroundColor: [

                "#F7F40F",

                "#D71920",

                "#172033"

            ],


            hoverBackgroundColor: [

                "#E8E500",

                "#B51218",

                "#24324A"

            ],


            borderWidth:
                0,


            hoverOffset:
                6

        }]

    };


    if (
        durasiChartInstance
    ) {

        durasiChartInstance.data =
            data;


        durasiChartInstance.update(
            "none"
        );


        return;

    }


    durasiChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "doughnut",


                data,


                plugins: [

                    centerTextPlugin

                ],


                options: {

                    animation: false,

                    responsive:
                        true,


                    maintainAspectRatio:
                        false,

                    onClick:
                        function(event, elements) {
                            if (!elements.length) {
                                return;
                            }

                            const index = elements[0].index;
                            const selectedMinutes = this.data.durationMinutes[index];
                            const matchingPlanning = getDashboardFilteredPlanning().filter(function(item) {
                                return getDurasiMenitPlanning(item) === selectedMinutes;
                            });

                            if (typeof window.bukaRiwayatDashboard === "function") {
                                window.bukaRiwayatDashboard(
                                    `Riwayat Lembur - ${this.data.labels[index]}`,
                                    matchingPlanning,
                                    "planning"
                                );
                            }
                        },

                    onHover:
                        function(event, elements) {
                            event.native.target.style.cursor =
                                elements.length ? "pointer" : "default";
                        },


                    cutout:
                        "68%",


                    plugins: {

                        datalabels: {

                            display:
                                function(context) {

                                    return (
                                        context.dataset.data[
                                            context.dataIndex
                                        ] > 0
                                    );

                                },


                            color:
                                APP_COLORS.navy,


                            anchor:
                                "center",


                            align:
                                "center",


                            clamp:
                                true,


                            font: {

                                size:
                                    13,


                                weight:
                                    "800"

                            },


                            formatter:
                                function(value) {

                                    return value;

                                }

                        },


                        legend: {

                            position:
                                "bottom",


                            labels: {

                                color:
                                    APP_COLORS.text,


                                padding:
                                    18,


                                usePointStyle:
                                    true,


                                pointStyle:
                                    "circle"

                            }

                        },


                        tooltip: {

                            backgroundColor:
                                APP_COLORS.navy,


                            titleColor:
                                APP_COLORS.yellow,


                            bodyColor:
                                APP_COLORS.surface,


                            borderColor:
                                APP_COLORS.yellow,


                            borderWidth:
                                1,


                            padding:
                                12

                        }

                    }

                }

            }
        );

}


/* =========================================================
   CHART 3
   TOP KARYAWAN LEMBUR
========================================================= */
/* =========================================================
   CHART 3
   TOP KARYAWAN LEMBUR
   ---------------------------------------------------------
   - Nama karyawan dibuat UNIQUE
   - Nama yang sama digabung
   - Jumlah planning dijumlahkan
   - Maksimal 10 karyawan
========================================================= */

function renderKaryawanChart(
    planning = getDashboardFilteredPlanning()
) {

    const canvas =
        appEl(
            "karyawanChart"
        );


    if (
        !canvas ||
        typeof Chart ===
        "undefined"
    ) {

        return;

    }


    /*
     * =====================================================
     * RANKING BERDASARKAN NAMA UNIQUE
     * =====================================================
     */

    const rankingMap =
        Object.create(
            null
        );


    for (
        const item of planning
    ) {

        if (
            !Array.isArray(
                item.karyawan
            )
        ) {

            continue;

        }


        /*
         * =================================================
         * SET UNTUK MENCEGAH KARYAWAN YANG SAMA
         * MUNCUL 2X DALAM 1 PLANNING
         * =================================================
         */

        const karyawanDalamPlanning =
            new Set();


        for (
            const karyawan
            of item.karyawan
        ) {

            if (!karyawan) {

                continue;

            }


            /*
             * Ambil nama karyawan
             */

            const namaRaw =
                karyawan.nama ||
                karyawan.namaKaryawan ||
                karyawan.Nama ||
                karyawan.nama_karyawan ||
                karyawan.name ||
                karyawan.NAMA ||
                "";


            const nama =
                String(
                    namaRaw
                )
                    .trim()
                    .replace(
                        /\s+/g,
                        " "
                    );


            if (!nama) {

                continue;

            }


            /*
             * KEY UNIQUE BERDASARKAN NAMA
             *
             * Jadi:
             * "Budi"
             * "budi"
             * " Budi "
             *
             * dianggap orang yang sama.
             */

            const namaKey =
                nama
                    .toLowerCase();


            /*
             * Kalau nama yang sama sudah
             * ada di planning ini,
             * jangan dihitung dua kali.
             */

            if (
                karyawanDalamPlanning.has(
                    namaKey
                )
            ) {

                continue;

            }


            karyawanDalamPlanning.add(
                namaKey
            );


            /*
             * Buat data ranking
             */

            if (
                !rankingMap[namaKey]
            ) {

                rankingMap[namaKey] = {

                    nama:
                        nama,

                    jumlah:
                        0

                };

            }


            rankingMap[namaKey].jumlah++;

        }

    }


    /*
     * =====================================================
     * SORTING
     * =====================================================
     */

    const ranking =
        Object.values(
            rankingMap
        )
            .sort(
                (a, b) => {

                    /*
                     * Jumlah terbesar
                     * di atas
                     */

                    if (
                        b.jumlah !==
                        a.jumlah
                    ) {

                        return (
                            b.jumlah -
                            a.jumlah
                        );

                    }


                    /*
                     * Kalau jumlah sama,
                     * urut nama A-Z
                     */

                    return a.nama.localeCompare(
                        b.nama,
                        "id",
                        {
                            sensitivity:
                                "base"
                        }
                    );

                }
            )
            .slice(
                0,
                10
            );


    /*
     * =====================================================
     * CHART DATA
     * =====================================================
     */

    const labels =
        ranking.map(
            item =>
                item.nama
        );


    const values =
        ranking.map(
            item =>
                item.jumlah
        );


    /*
     * =====================================================
     * MAX VALUE
     * =====================================================
     */

    const maxValue =
        values.length
            ? Math.max(
                ...values
            )
            : 0;


    const suggestedMax =
        Math.max(

            maxValue + 2,

            Math.ceil(
                maxValue * 1.25
            )

        );


    /*
     * =====================================================
     * DATASET
     * =====================================================
     */

    const data = {

        labels,


        datasets: [{

            label:
                "Jumlah Planning",


            data:
                values,


            backgroundColor:
                APP_COLORS.yellow,


            borderRadius:
                7,


            borderSkipped:
                false,


            barThickness:
                24,


            maxBarThickness:
                28,


            hoverBackgroundColor:
                APP_COLORS.primary

        }]

    };


    /*
     * =====================================================
     * UPDATE CHART YANG SUDAH ADA
     * =====================================================
     */

    if (
        karyawanChartInstance
    ) {

        karyawanChartInstance.data =
            data;


        karyawanChartInstance.options
            .scales
            .x
            .suggestedMax =
                suggestedMax;


        karyawanChartInstance.update(
            "none"
        );


        return;

    }


    /*
     * =====================================================
     * BUAT CHART BARU
     * =====================================================
     */

    karyawanChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "bar",


                data,


                options: {

                    animation: false,

                    indexAxis:
                        "y",


                    responsive:
                        true,


                    maintainAspectRatio:
                        false,


                    onClick:
                        function(event, elements) {

                            if (!elements.length) {
                                return;
                            }

                            const barIndex =
                                elements[0].index;

                            const nama =
                                this.data.labels[barIndex];

                            if (
                                nama &&
                                typeof window.lihatRiwayatLemburByNama === "function"
                            ) {
                                window.lihatRiwayatLemburByNama(nama);
                            }
                        },


                    onHover:
                        function(event, elements) {
                            event.native.target.style.cursor =
                                elements.length ? "pointer" : "default";
                        },


                    layout: {

                        padding: {

                            right:
                                40

                        }

                    },


                    plugins: {

                        datalabels: {

                            display:
                                true,


                            color:
                                APP_COLORS.text,


                            anchor:
                                "end",


                            align:
                                "right",


                            offset:
                                7,


                            clamp:
                                false,


                            clip:
                                false,


                            font: {

                                size:
                                    12,


                                weight:
                                    "800"

                            },


                            formatter:
                                function(value) {

                                    return `${value}x`;

                                }

                        },


                        legend: {

                            display:
                                false

                        },


                        tooltip: {

                            backgroundColor:
                                APP_COLORS.navy,


                            titleColor:
                                APP_COLORS.yellow,


                            bodyColor:
                                APP_COLORS.surface,


                            borderColor:
                                APP_COLORS.yellow,


                            borderWidth:
                                1,


                            padding:
                                12

                        }

                    },


                    scales: {

                        x: {

                            beginAtZero:
                                true,


                            suggestedMax:
                                suggestedMax,


                            grace:
                                "8%",


                            grid: {

                                color:
                                    "rgba(23,32,51,0.07)"

                            },


                            ticks: {

                                color:
                                    APP_COLORS.textSoft,


                                precision:
                                    0

                            }

                        },


                        y: {

                            grid: {

                                display:
                                    false

                            },


                            ticks: {

                                color:
                                    APP_COLORS.text,


                                font: {

                                    weight:
                                        "600"

                                }

                            }

                        }

                    }

                }

            }
        );

}
/* =========================================================
   TANGGAL SEKARANG
========================================================= */

function tampilkanTanggal() {

    const element =
        appEl(
            "tanggalSekarang"
        );


    if (!element) {

        return;

    }


    element.textContent =
        new Date()
            .toLocaleDateString(
                "id-ID",
                {

                    weekday:
                        "long",

                    day:
                        "numeric",

                    month:
                        "long",

                    year:
                        "numeric"

                }
            );

}


/* =========================================================
   CLOSE ALL MODALS
========================================================= */

function closeAllModals() {

    if (
        typeof closePenaltyModal ===
        "function"
    ) {

        closePenaltyModal();

    }


    if (
        typeof closeEditKaryawanModal ===
        "function"
    ) {

        closeEditKaryawanModal();

    }


    if (
        typeof closePlanningModal ===
        "function"
    ) {

        closePlanningModal();

    }


    if (
        typeof closePreviewPlanning ===
        "function"
    ) {

        closePreviewPlanning();

    }


    if (
        typeof tutupRiwayatLembur ===
        "function"
    ) {

        tutupRiwayatLembur();

    }

}


/* =========================================================
   DASHBOARD PLANNING TERBARU
========================================================= */

function renderDashboardPlanning(
    filteredPlanning = null
) {

    const tbody =
        appEl(
            "dashboardPlanning"
        );


    if (!tbody) {

        return;

    }


    const planning =
        Array.isArray(
            filteredPlanning
        )
            ? filteredPlanning
            : getDashboardFilteredPlanning();


    if (
        !planning.length
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        color:${APP_COLORS.textSoft};
                        padding:28px;
                    "
                >

                    Belum ada planning pada periode ini

                </td>

            </tr>

        `;

        return;

    }


    const data =
        planning
            .slice()
            .sort(
                (a, b) => {

                    const dateA =
                        new Date(

                            a.createdAt ||

                            a.created_at ||

                            a.tanggal ||

                            0

                        ).getTime();


                    const dateB =
                        new Date(

                            b.createdAt ||

                            b.created_at ||

                            b.tanggal ||

                            0

                        ).getTime();


                    return (
                        dateB -
                        dateA
                    );

                }
            )
            .slice(
                0,
                5
            );


    const fragment =
        document.createDocumentFragment();


    for (
        const item of data
    ) {

        const tr =
            document.createElement(
                "tr"
            );


        tr.innerHTML = `

            <td>

                ${escapePlanningHTML(
                    formatPlanningDate(
                        item.tanggal
                    )
                )}

            </td>


            <td>

                ${escapePlanningHTML(
                    item.idPlanning ||
                    item.id ||
                    "-"
                )}

            </td>


            <td>

                ${getJumlahKaryawanPlanning(
                    item
                )}

            </td>


            <td>

                ${escapePlanningHTML(

                    `${ 
                        item.jamMulai ||
                        item.jam_mulai ||
                        "-"
                    } - ${
                        item.jamSelesai ||
                        item.jam_selesai ||
                        "-"
                    }`

                )}

            </td>


            <td>

                ${escapePlanningHTML(
                    formatPlanningDuration(
                        item
                    )
                )}

            </td>

        `;


        fragment.appendChild(
            tr
        );

    }


    tbody.replaceChildren(
        fragment
    );

}


/* =========================================================
   SETUP DASHBOARD FILTER
========================================================= */

function setupDashboardFilter() {

    const tanggalAwal =
        appEl(
            "dashboardTanggalAwal"
        );


    const tanggalAkhir =
        appEl(
            "dashboardTanggalAkhir"
        );


    const resetButton =
        appEl(
            "resetDashboardFilter"
        );


    /*
     * Input tanggal mulai
     */

    if (
        tanggalAwal &&
        !tanggalAwal.dataset.filterListener
    ) {

        tanggalAwal.addEventListener(
            "change",
            () => {

                updateDashboard();

            }
        );


        tanggalAwal.addEventListener(
            "input",
            () => {

                updateDashboard();

            }
        );


        tanggalAwal.dataset.filterListener =
            "true";

    }


    /*
     * Input tanggal akhir
     */

    if (
        tanggalAkhir &&
        !tanggalAkhir.dataset.filterListener
    ) {

        tanggalAkhir.addEventListener(
            "change",
            () => {

                updateDashboard();

            }
        );


        tanggalAkhir.addEventListener(
            "input",
            () => {

                updateDashboard();

            }
        );


        tanggalAkhir.dataset.filterListener =
            "true";

    }


    /*
     * Tombol reset
     */

    if (
        resetButton &&
        !resetButton.dataset.filterListener
    ) {

        resetButton.addEventListener(
            "click",
            () => {

                if (tanggalAwal) {

                    tanggalAwal.value =
                        "";

                }


                if (tanggalAkhir) {

                    tanggalAkhir.value =
                        "";

                }


                updateDashboard();

            }
        );


        resetButton.dataset.filterListener =
            "true";

    }

}


/* =========================================================
   MODAL BACKDROP
========================================================= */

function setupModalBackdrop(
    modalId,
    closeFunction
) {

    const modal =
        appEl(
            modalId
        );


    if (
        !modal ||
        modal.dataset.backdropListener
    ) {

        return;

    }


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target !==
                modal
            ) {

                return;

            }


            if (
                typeof closeFunction ===
                "function"
            ) {

                closeFunction();

            }

        }
    );


    modal.dataset.backdropListener =
        "true";

}


/* =========================================================
   REFRESH APP
========================================================= */

function refreshApp() {

    console.log(
        "[APP] Refresh dashboard"
    );


    debugAppData();

    window.__invalidatePageSignature();
    renderedDropdownHash = null;

    const activePage =
        document.querySelector(".page.active-page")?.id ||
        "dashboard";

    if (activePage === "karyawan") {
        if (typeof renderKaryawan === "function") {
            renderKaryawan();
        }
    } else if (activePage === "planning") {
        if (typeof updateKaryawanDropdown === "function") {
            updateKaryawanDropdown();
        }
        if (typeof renderPlanning === "function") {
            renderPlanning();
        }
    } else if (activePage === "laporan") {
        if (typeof renderLaporanKaryawan === "function") {
            renderLaporanKaryawan();
        }
    } else {
        updateDashboard();
    }

    if (typeof window.syncShellCounters === "function") {
        window.syncShellCounters();
    }

}


/* =========================================================
   INITIAL DATA
========================================================= */

function loadInitialData() {

    console.log(
        "[APP] DOM loaded"
    );


    setupDashboardFilter();


    refreshApp();


    tampilkanTanggal();


    AppState.initialized =
        true;

}


/* =========================================================
   DATABASE READY
========================================================= */

function handleDatabaseReady() {

    console.log(
        "[APP] databaseReady diterima"
    );


    AppState.databaseReady =
        true;


    requestAnimationFrame(
        () => {

            setupDashboardFilter();


            refreshApp();

        }
    );

}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadInitialData();


        setupModalBackdrop(
            "planningModal",

            typeof closePlanningModal ===
                "function"

                ? closePlanningModal

                : null
        );


        setupModalBackdrop(
            "penaltyModal",

            typeof closePenaltyModal ===
                "function"

                ? closePenaltyModal

                : null
        );


        setupModalBackdrop(
            "historyKaryawanModal",

            typeof tutupRiwayatLembur ===
                "function"

                ? tutupRiwayatLembur

                : null
        );


        if (
            !document.body.dataset
                .escapeListener
        ) {

            document.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Escape"
                    ) {

                        closeAllModals();

                    }

                }
            );


            document.body.dataset
                .escapeListener =
                "true";

        }

    }
);


/* =========================================================
   DATABASE READY EVENT
========================================================= */

document.addEventListener(
    "databaseReady",
    handleDatabaseReady
);


/* =========================================================
   GLOBAL EXPORT
========================================================= */

window.getPlanningData =
    getPlanningData;


window.getKaryawanData =
    getKaryawanData;


window.getDashboardFilter =
    getDashboardFilter;


window.getDashboardFilteredPlanning =
    getDashboardFilteredPlanning;


window.isPlanningInDashboardFilter =
    isPlanningInDashboardFilter;


window.getJumlahKaryawanPlanning =
    getJumlahKaryawanPlanning;


window.getDurasiMenitPlanning =
    getDurasiMenitPlanning;


window.getTotalJamPlanning =
    getTotalJamPlanning;


window.getTotalJamLembur =
    getTotalJamLembur;


window.showPage =
    showPage;


window.updateDashboard =
    updateDashboard;


window.updateDashboardStats =
    updateDashboardStats;


window.updateDashboardCharts =
    updateDashboardCharts;


window.renderPlanningChart =
    renderPlanningChart;


window.renderDurasiChart =
    renderDurasiChart;


window.renderKaryawanChart =
    renderKaryawanChart;


window.renderDashboardPlanning =
    renderDashboardPlanning;


window.tampilkanTanggal =
    tampilkanTanggal;


window.closeAllModals =
    closeAllModals;


window.escapePlanningHTML =
    escapePlanningHTML;


window.refreshApp =
    refreshApp;


/* =========================================================
   GLOBAL COLORS
========================================================= */

window.APP_COLORS =
    APP_COLORS;


/* =========================================================
   IKON TOMBOL
========================================================= */

const INLINE_BUTTON_ICON_PATHS = {
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
    "trash-2": '<path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>',
    save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path><path d="M7 3v4a1 1 0 0 0 1 1h7"></path>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect width="12" height="8" x="6" y="14"></rect>',
    "log-in": '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line>',
    search: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>',
    "rotate-ccw": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path>',
    "list-checks": '<path d="m3 17 2 2 4-4"></path><path d="m3 7 2 2 4-4"></path><path d="M13 6h8"></path><path d="M13 12h8"></path><path d="M13 18h8"></path>',
    "shield-check": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path>',
    x: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
    "shield-alert": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path>'
};

function enhanceButtonIcons(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") {
        return;
    }

    const iconByAction = {
        preview: "eye",
        edit: "pencil",
        cetak: "download",
        copy: "copy",
        hapus: "trash-2",
        upload: "upload",
        download: "download",
        "delete-file": "trash-2"
    };

    const iconByLabel = [
        [/pratinjau|lihat/i, "eye"],
        [/ubah|edit/i, "pencil"],
        [/unduh|download/i, "download"],
        [/salin/i, "copy"],
        [/hapus/i, "trash-2"],
        [/simpan/i, "save"],
        [/buat|tambah/i, "plus"],
        [/cetak/i, "printer"],
        [/masuk/i, "log-in"],
        [/cari/i, "search"],
        [/saring|filter/i, "filter"],
        [/atur ulang|reset/i, "rotate-ccw"],
        [/pilih semua/i, "list-checks"],
        [/lepas penalti/i, "shield-check"],
        [/batal|tutup/i, "x"],
        [/penalti/i, "shield-alert"],
        [/riwayat/i, "history"]
    ];

    const buttons = root.matches && root.matches("button")
        ? [root]
        : root.querySelectorAll("button");

    for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        if (button.dataset.iconChecked === "1") {
            continue;
        }
        button.dataset.iconChecked = "1";
        if (
            button.classList.contains("menu-item") ||
            button.classList.contains("modal-close") ||
            button.classList.contains("topbar-pulse") ||
            button.classList.contains("table-hscroll-btn") ||
            button.querySelector("svg, [data-lucide]")
        ) {
            continue;
        }

        const action = button.dataset.action || "";
        let icon = iconByAction[action];
        const label = icon ? "" : (button.textContent || "").trim();

        if (!icon && (button.classList.contains("modal-close") || button.classList.contains("planning-toast-close"))) {
            icon = "x";
        }

        if (!icon) {
            const onclick = button.getAttribute("onclick") || "";
            if (/close|tutup/i.test(onclick)) {
                icon = "x";
            }
        }

        if (!icon && label) {
            const match = iconByLabel.find(function (entry) {
                return entry[0].test(label);
            });
            icon = match?.[1];
        }

        const svgBody = icon ? INLINE_BUTTON_ICON_PATHS[icon] : "";
        if (!svgBody) {
            continue;
        }

        button.insertAdjacentHTML(
            "afterbegin",
            `<svg class="lucide lucide-${icon}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgBody}</svg>`
        );

        if (!button.title) {
            const textLabel = label || (button.textContent || "").trim();
            if (textLabel) {
                button.title = textLabel;
            }
        }
    }
}

function enhanceShellChrome() {
    // 1. Add categorized sidebar section labels once
    const menu = document.querySelector(".sidebar .menu");
    if (menu && !menu.querySelector(".menu-section-label")) {
        const navDash = document.getElementById("navBtnDashboard");
        const navLaporan = document.getElementById("navBtnLaporan");
        if (navDash) {
            const lblMain = document.createElement("div");
            lblMain.className = "menu-section-label";
            lblMain.textContent = "Menu Utama";
            menu.insertBefore(lblMain, navDash);
        }
        if (navLaporan) {
            const lblRep = document.createElement("div");
            lblRep.className = "menu-section-label";
            lblRep.textContent = "Laporan & Audit";
            menu.insertBefore(lblRep, navLaporan);
        }
    }

    // 2. Add Portal Cek Lembur button & Daysheet badge inside sidebar bottom panel once
    const bottomPanel = document.querySelector(".sidebar-bottom-panel");
    if (bottomPanel) {
        if (!bottomPanel.querySelector(".sidebar-portal-actions")) {
            const portalWrap = document.createElement("div");
            portalWrap.className = "sidebar-portal-actions";
            portalWrap.innerHTML = `
                <a href="cek-lembur.html" class="sidebar-portal-btn" title="Buka Portal Cek Lembur Karyawan">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
                    <span>Portal Cek Lembur</span>
                </a>
            `;
            const watermark = bottomPanel.querySelector(".sidebar-brand-watermark");
            bottomPanel.insertBefore(portalWrap, watermark || null);
        }

        if (!bottomPanel.querySelector(".sidebar-daysheet-badge")) {
            const badge = document.createElement("a");
            badge.href = "https://daysheet.id";
            badge.target = "_blank";
            badge.rel = "noopener noreferrer";
            badge.title = "Kunjungi https://daysheet.id";
            badge.className = "sidebar-daysheet-badge";
            badge.innerHTML = `
                <img src="logo-daysheet.png" alt="Daysheet.id" width="28" height="28" decoding="async" loading="lazy">
                <div class="sidebar-daysheet-meta">
                    <span>@copyright by</span>
                    <strong>daysheet.id</strong>
                </div>
            `;
            const watermark = bottomPanel.querySelector(".sidebar-brand-watermark");
            if (watermark) {
                watermark.replaceWith(badge);
            } else {
                bottomPanel.appendChild(badge);
            }
        }
    }

    // 3. Add crisp topbar quick CTA & refresh buttons alongside date-now once
    function notifyShell(type, title, message) {
        if (typeof window.showCRUDToast === "function") {
            window.showCRUDToast(type, title, message);
            return;
        }
        if (typeof window.showPlanningToast === "function") {
            window.showPlanningToast(type, title, message);
        }
    }

    const topbar = document.querySelector(".topbar");
    const dateNowEl = document.getElementById("tanggalSekarang");
    if (topbar && !topbar.querySelector(".topbar-right")) {
        const rightWrap = document.createElement("div");
        rightWrap.className = "topbar-right";

        const pulsePill = document.createElement("button");
        pulsePill.type = "button";
        pulsePill.className = "topbar-pulse";
        pulsePill.dataset.skipLoading = "true";
        pulsePill.title = "Cek status koneksi & sinkronisasi data";
        pulsePill.innerHTML = `<span class="topbar-pulse-dot"></span><span>Live Sync</span>`;
        pulsePill.addEventListener("click", async function () {
            if (pulsePill.dataset.syncing === "true") return;
            pulsePill.dataset.syncing = "true";
            try {
                if (typeof window.loadDatabase === "function") {
                    await window.loadDatabase();
                }
                if (typeof window.refreshApp === "function") {
                    window.refreshApp();
                }
                if (typeof window.syncShellCounters === "function") {
                    window.syncShellCounters();
                }
                const karTotal = Array.isArray(window.karyawan) ? window.karyawan.length : 0;
                const planTotal = Array.isArray(window.planning) ? window.planning.length : 0;
                notifyShell(
                    "success",
                    "Live Sync Aktif",
                    `Tersinkron (${karTotal} karyawan, ${planTotal} rencana lembur).`
                );
            } catch (err) {
                console.error("Gagal Live Sync:", err);
                notifyShell("error", "Sinkronisasi Gagal", err && err.message ? err.message : "Periksa koneksi database.");
            } finally {
                pulsePill.dataset.syncing = "false";
            }
        });

        const refreshBtn = document.createElement("button");
        refreshBtn.type = "button";
        refreshBtn.className = "topbar-quick-btn teal";
        refreshBtn.dataset.skipLoading = "true";
        refreshBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg><span class="hide-sm">Muat Ulang</span>`;
        refreshBtn.addEventListener("click", async function () {
            if (refreshBtn.dataset.loading === "true") return;
            refreshBtn.dataset.loading = "true";
            refreshBtn.disabled = true;
            refreshBtn.classList.add("is-spinning");
            try {
                if (typeof window.loadDatabase === "function") {
                    await window.loadDatabase();
                }
                if (typeof window.refreshApp === "function") {
                    window.refreshApp();
                }
                if (typeof tampilkanTanggal === "function") {
                    tampilkanTanggal();
                }
                if (typeof window.syncShellCounters === "function") {
                    window.syncShellCounters();
                }
                notifyShell("success", "Data Disegarkan", "Seluruh data dasbor berhasil dimuat ulang.");
            } catch (err) {
                console.error("Gagal memuat ulang:", err);
                notifyShell("error", "Gagal Muat Ulang", err && err.message ? err.message : "Terjadi kesalahan memuat data.");
            } finally {
                refreshBtn.dataset.loading = "false";
                refreshBtn.disabled = false;
                refreshBtn.classList.remove("is-spinning");
            }
        });

        const createBtn = document.createElement("button");
        createBtn.type = "button";
        createBtn.className = "topbar-quick-btn primary";
        createBtn.dataset.skipLoading = "true";
        createBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Buat Planning</span>`;
        createBtn.addEventListener("click", function () {
            if (typeof window.openPlanningModal === "function") {
                window.openPlanningModal();
            } else {
                notifyShell("error", "Form Belum Siap", "Tunggu sebentar hingga data selesai dimuat.");
            }
        });

        rightWrap.appendChild(pulsePill);
        rightWrap.appendChild(refreshBtn);
        rightWrap.appendChild(createBtn);
        if (dateNowEl) {
            rightWrap.appendChild(dateNowEl);
        }
        topbar.appendChild(rightWrap);
    }

    const pageTitleBox = document.querySelector(".topbar .page-title");
    if (pageTitleBox && !pageTitleBox.querySelector(".page-title-icon")) {
        const titleH1 = document.getElementById("pageTitle");
        const titleP = document.getElementById("pageSubtitle");
        const textWrap = document.createElement("div");
        if (titleH1) textWrap.appendChild(titleH1);
        if (titleP) textWrap.appendChild(titleP);

        const iconBox = document.createElement("div");
        iconBox.className = "page-title-icon";
        iconBox.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>`;

        pageTitleBox.innerHTML = "";
        pageTitleBox.appendChild(iconBox);
        pageTitleBox.appendChild(textWrap);
    }

    if (window.lucide && document.querySelector("[data-lucide]")) {
        try {
            window.lucide.createIcons();
        } catch (_) {}
    }
}

function enhanceTableScrollControls() {
    const wrappers = document.querySelectorAll(".table-wrapper");
    if (!wrappers.length) return;

    const pairs = [];
    let rafUpdateScheduled = false;

    function refreshAllScrollBars() {
        rafUpdateScheduled = false;
        pairs.forEach(function (entry) {
            const { wrapper, bar, track, spacer } = entry;
            if (!wrapper.isConnected || wrapper.offsetParent === null) {
                bar.hidden = true;
                return;
            }
            const table = wrapper.querySelector("table");
            const contentWidth = table ? Math.max(wrapper.scrollWidth, table.scrollWidth) : wrapper.scrollWidth;
            const clientWidth = wrapper.clientWidth;
            const canScroll = clientWidth > 0 && contentWidth > clientWidth + 4;
            bar.hidden = !canScroll;
            if (canScroll) {
                spacer.style.width = contentWidth + "px";
                if (Math.abs(track.scrollLeft - wrapper.scrollLeft) > 2) {
                    track.scrollLeft = wrapper.scrollLeft;
                }
            }
        });
    }

    function scheduleRefresh() {
        if (rafUpdateScheduled) return;
        rafUpdateScheduled = true;
        requestAnimationFrame(refreshAllScrollBars);
    }

    wrappers.forEach(function (wrapper) {
        if (wrapper.dataset.hscrollReady === "true" || !wrapper.parentNode) return;
        wrapper.dataset.hscrollReady = "true";

        const bar = document.createElement("div");
        bar.className = "table-hscroll-bar";
        bar.hidden = true;
        bar.innerHTML =
            '<button type="button" class="table-hscroll-btn" data-dir="left" title="Geser tabel ke kiri" aria-label="Geser tabel ke kiri">&lsaquo;</button>' +
            '<div class="table-hscroll-track"><div class="table-hscroll-spacer"></div></div>' +
            '<button type="button" class="table-hscroll-btn" data-dir="right" title="Geser tabel ke kanan" aria-label="Geser tabel ke kanan">&rsaquo;</button>' +
            '<span class="table-hscroll-hint">Geser kanan</span>';

        wrapper.parentNode.insertBefore(bar, wrapper);

        const track = bar.querySelector(".table-hscroll-track");
        const spacer = bar.querySelector(".table-hscroll-spacer");
        const leftBtn = bar.querySelector('[data-dir="left"]');
        const rightBtn = bar.querySelector('[data-dir="right"]');

        let lockSource = null;

        track.addEventListener("scroll", function () {
            if (lockSource === "wrapper") return;
            lockSource = "track";
            wrapper.scrollLeft = track.scrollLeft;
            requestAnimationFrame(function () { lockSource = null; });
        }, { passive: true });

        wrapper.addEventListener("scroll", function () {
            if (lockSource === "track") return;
            lockSource = "wrapper";
            track.scrollLeft = wrapper.scrollLeft;
            requestAnimationFrame(function () { lockSource = null; });
        }, { passive: true });

        if (leftBtn) {
            leftBtn.addEventListener("click", function () {
                wrapper.scrollBy({ left: -240, behavior: "smooth" });
            });
        }
        if (rightBtn) {
            rightBtn.addEventListener("click", function () {
                wrapper.scrollBy({ left: 240, behavior: "smooth" });
            });
        }

        pairs.push({ wrapper, bar, track, spacer });
    });

    if (typeof ResizeObserver === "function") {
        const ro = new ResizeObserver(scheduleRefresh);
        pairs.forEach(function (entry) {
            ro.observe(entry.wrapper);
            const tbl = entry.wrapper.querySelector("table");
            if (tbl) ro.observe(tbl);
        });
    }

    const pages = document.querySelectorAll(".page");
    if (pages.length && typeof MutationObserver === "function") {
        const pageObserver = new MutationObserver(scheduleRefresh);
        pages.forEach(function (pageEl) {
            pageObserver.observe(pageEl, { attributes: true, attributeFilter: ["class"] });
        });
    }

    window.addEventListener("resize", scheduleRefresh, { passive: true });
    window.refreshTableScrollBars = scheduleRefresh;
    scheduleRefresh();
}

document.addEventListener("DOMContentLoaded", function () {
    enhanceShellChrome();
    enhanceTableScrollControls();
    enhanceButtonIcons();

    const pendingRoots = new Set();
    let flushScheduled = false;
    let tableRowsAdded = false;

    function flushPendingButtonIcons() {
        flushScheduled = false;
        const hadTableRows = tableRowsAdded;
        tableRowsAdded = false;
        pendingRoots.forEach(function (node) {
            if (node && node.isConnected) {
                enhanceButtonIcons(node);
            }
        });
        pendingRoots.clear();
        if (hadTableRows && typeof window.refreshTableScrollBars === "function") {
            window.refreshTableScrollBars();
        }
        if (typeof window.syncShellCounters === "function") {
            window.syncShellCounters();
        }
    }

    new MutationObserver(function (mutations) {
        let added = false;
        for (let i = 0; i < mutations.length; i++) {
            const addedNodes = mutations[i].addedNodes;
            for (let j = 0; j < addedNodes.length; j++) {
                const node = addedNodes[j];
                if (
                    node.nodeType === 1 &&
                    !node.matches("svg, path, circle, line, rect, polyline, polygon, i[data-lucide], .table-hscroll-bar")
                ) {
                    const isRow = node.matches("tr");
                    if (isRow || node.matches("button") || node.querySelector("button")) {
                        pendingRoots.add(node);
                        if (isRow) tableRowsAdded = true;
                        added = true;
                    }
                }
            }
        }
        if (added && !flushScheduled) {
            flushScheduled = true;
            requestAnimationFrame(flushPendingButtonIcons);
        }
    }).observe(document.body, { childList: true, subtree: true });
});


/* =========================================================
   LOAD MESSAGE
========================================================= */

console.log(
    "app.js optimized + dashboard filter periode aktif"
);


/* =========================================================
   INTERACTIVE HELLO GREETING & MASCOT SYSTEM
========================================================= */

(function () {
    const greetingMessages = [
        "Halo Rekan Linfox! Semangat kerjanya hari ini! 🚀",
        "Planning lembur tersinkronisasi cepat & aman! ⚡",
        "Bukti foto otomatis terkompresi kilat & hemat kuota! 📸",
        "Sistem berjalan responsif, enteng dan stabil! ✨",
        "Delivering Solutions - PT Linfox Logistics Indonesia! 🛡️",
        "Jaga kesehatan & tetap utamakan keselamatan kerja! 👷‍♂️",
        "Ada pertanyaan? Pantau rekap lembur di menu Dasbor & Laporan! 📊"
    ];
    let currentMessageIndex = 0;

    function getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour >= 4 && hour < 11) return "Halo, Selamat Pagi! 🌅";
        if (hour >= 11 && hour < 15) return "Halo, Selamat Siang! ☀️";
        if (hour >= 15 && hour < 18) return "Halo, Selamat Sore! 🌇";
        return "Halo, Selamat Malam! 🌙";
    }

    let lastGreetingTitle = "";
    let lastDateString = "";
    let lastClockString = "";
    let lastShiftString = "";
    let lastPlanCount = "";
    let lastKarCount = "";

    function syncSidebarAndNavCounters() {
        if (Array.isArray(window.planning)) {
            const planCount = String(window.planning.length);
            if (planCount !== lastPlanCount) {
                lastPlanCount = planCount;
                const navPlan = document.getElementById("navPlanningCount");
                const mobNavPlan = document.getElementById("mobileNavPlanningCount");
                const sidePlan = document.getElementById("sidebarStatPlanning");
                if (navPlan) navPlan.textContent = planCount;
                if (mobNavPlan) mobNavPlan.textContent = planCount;
                if (sidePlan) sidePlan.textContent = planCount;
            }
        }

        if (Array.isArray(window.karyawan)) {
            let aktif = 0;
            for (let i = 0; i < window.karyawan.length; i++) {
                const k = window.karyawan[i];
                if (k && k.status !== "PENALTI" && !k.isDeleted) aktif++;
            }
            const karCount = String(aktif || window.karyawan.length);
            if (karCount !== lastKarCount) {
                lastKarCount = karCount;
                const navKar = document.getElementById("navKaryawanCount");
                const mobNavKar = document.getElementById("mobileNavKaryawanCount");
                const sideKar = document.getElementById("sidebarStatKaryawan");
                if (navKar) navKar.textContent = karCount;
                if (mobNavKar) mobNavKar.textContent = karCount;
                if (sideKar) sideKar.textContent = karCount;
            }
        }
    }

    function updateLiveClock() {
        if (document.hidden || document.documentElement.classList.contains("access-locked")) {
            return;
        }

        const now = new Date();
        const hour = now.getHours();
        const shiftText = hour >= 6 && hour < 14
            ? "Shift 1 • 06:00 - 14:00"
            : hour >= 14 && hour < 22
                ? "Shift 2 • 14:00 - 22:00"
                : "Shift 3 • 22:00 - 06:00";

        if (shiftText !== lastShiftString) {
            lastShiftString = shiftText;
            const mobileShiftEl = document.getElementById("mobileShiftChip");
            if (mobileShiftEl) {
                mobileShiftEl.textContent = shiftText.split("•")[0].trim();
            }
        }

        const dashboardSection = document.getElementById("dashboard");
        if (!dashboardSection || !dashboardSection.classList.contains("active-page")) {
            return;
        }

        const timeEl = document.getElementById("helloLiveTime");
        const titleEl = document.getElementById("helloGreetingTitle");
        const dateEl = document.getElementById("helloCurrentDateBadge");

        if (timeEl) {
            const h = String(hour).padStart(2, "0");
            const m = String(now.getMinutes()).padStart(2, "0");
            const s = String(now.getSeconds()).padStart(2, "0");
            const fullClock = h + ":" + m + ":" + s + " WIB";
            if (fullClock !== lastClockString) {
                lastClockString = fullClock;
                timeEl.textContent = fullClock;
            }
        }

        if (titleEl && !titleEl.dataset.customText) {
            const greeting = getTimeGreeting();
            if (greeting !== lastGreetingTitle) {
                lastGreetingTitle = greeting;
                titleEl.textContent = greeting;
            }
        }

        if (dateEl) {
            const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const months = [
                "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
            ];
            const dateStr = days[now.getDay()] + ", " + now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear();
            if (dateStr !== lastDateString) {
                lastDateString = dateStr;
                dateEl.textContent = dateStr;
            }
        }
    }

    window.triggerHelloInteractive = function () {
        currentMessageIndex = (currentMessageIndex + 1) % greetingMessages.length;
        const bubble = document.getElementById("helloSpeechBubble");
        const mascot = document.getElementById("mascotAvatarIcon");
        const wave = document.getElementById("helloWaveEmoji");
        const chipText = document.getElementById("helloInteractiveText");

        if (bubble) {
            bubble.classList.remove("speech-pop");
            void bubble.offsetWidth;
            bubble.textContent = greetingMessages[currentMessageIndex];
            bubble.classList.add("speech-pop");
        }

        if (mascot) {
            mascot.classList.remove("mascot-bounce");
            void mascot.offsetWidth;
            mascot.classList.add("mascot-bounce");
        }

        if (wave) {
            wave.classList.remove("wave-active");
            void wave.offsetWidth;
            wave.classList.add("wave-active");
        }

        if (chipText) {
            chipText.textContent = "Sapaan Terkirim! ✨";
            setTimeout(function () {
                if (chipText) chipText.textContent = "Sapa Lagi";
            }, 2000);
        }
    };

    window.syncShellCounters = function () {
        syncSidebarAndNavCounters();
        updateLiveClock();
    };

    function initGreeting() {
        syncSidebarAndNavCounters();
        updateLiveClock();
        setInterval(updateLiveClock, 1000);
        setInterval(syncSidebarAndNavCounters, 15000);
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) {
                syncSidebarAndNavCounters();
                updateLiveClock();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGreeting);
    } else {
        initGreeting();
    }
})();

/* =========================================================
   TACTILE COLOR CLICK RIPPLE & GLOW FEEDBACK
========================================================= */
(function initClickColorEffects() {
    "use strict";

    if (typeof document === "undefined" || window.__daysheetClickEffectsBound) return;
    window.__daysheetClickEffectsBound = true;

    const CLICK_TARGET_SELECTOR = [
        ".menu-item",
        ".mobile-nav-item",
        ".topbar-pulse",
        ".topbar-quick-btn",
        ".planning-chip",
        ".btn-primary",
        ".btn-secondary",
        ".btn-cancel",
        ".btn-small",
        ".btn-history",
        ".btn-delete",
        ".btn-penalty",
        ".btn-preview-planning",
        ".btn-cetak-spl",
        ".planning-btn",
        ".planning-file-btn",
        ".btn-hapus-bulk-header",
        ".btn-batal-bulk-header",
        ".sidebar-portal-btn",
        ".sidebar-daysheet-badge",
        ".hello-chip.chip-interactive",
        ".hello-mascot-card",
        ".stat-card",
        ".planning-stat-card",
        ".summary-card",
        ".access-submit"
    ].join(", ");

    const CLICK_COLOR_THEMES = [
        {
            match: ".btn-delete, .planning-btn-hapus, .planning-file-delete, .btn-hapus-bulk-header, .stats-grid .stat-card:nth-child(4), .planning-summary-grid .planning-stat-card:nth-child(4), .karyawan-summary .summary-card:last-child, .summary-card.penalty",
            ripple: "rgba(239, 68, 68, 0.30)",
            ring: "rgba(239, 68, 68, 0.24)"
        },
        {
            match: ".btn-penalty, .btn-cetak-spl, .planning-btn-edit, .stats-grid .stat-card:nth-child(3), .planning-summary-grid .planning-stat-card:nth-child(3), .summary-card.card-yellow, .summary-card.card-orange",
            ripple: "rgba(245, 158, 11, 0.30)",
            ring: "rgba(245, 158, 11, 0.24)"
        },
        {
            match: ".topbar-pulse, .planning-btn-cetak, .planning-btn-download, .planning-file-download, .planning-file-upload.has-file, .stats-grid .stat-card:nth-child(2), .planning-summary-grid .planning-stat-card:nth-child(2), .summary-card.card-green, .karyawan-summary .summary-card:first-child",
            ripple: "rgba(16, 185, 129, 0.30)",
            ring: "rgba(16, 185, 129, 0.24)"
        },
        {
            match: ".planning-file-upload",
            ripple: "rgba(124, 58, 237, 0.28)",
            ring: "rgba(124, 58, 237, 0.22)"
        },
        {
            match: ".topbar-quick-btn.teal, .planning-btn-copy, .sidebar-daysheet-badge",
            ripple: "rgba(6, 182, 212, 0.34)",
            ring: "rgba(6, 182, 212, 0.26)"
        },
        {
            match: ".btn-primary, .topbar-quick-btn.primary, .menu-item.active, .planning-chip.active, .access-submit",
            ripple: "rgba(255, 255, 255, 0.38)",
            ring: "rgba(59, 130, 246, 0.28)"
        }
    ];

    const DEFAULT_CLICK_THEME = {
        ripple: "rgba(37, 99, 235, 0.26)",
        ring: "rgba(37, 99, 235, 0.22)"
    };

    function resolveClickTheme(target) {
        for (let i = 0; i < CLICK_COLOR_THEMES.length; i++) {
            if (target.matches(CLICK_COLOR_THEMES[i].match)) {
                return CLICK_COLOR_THEMES[i];
            }
        }
        return DEFAULT_CLICK_THEME;
    }

    function triggerClickEffect(e) {
        if (e.button && e.button !== 0) return;
        const origin = e.target;
        if (!origin || typeof origin.closest !== "function") return;
        if (origin.closest("input, select, textarea")) return;

        const target = origin.closest(CLICK_TARGET_SELECTOR);
        if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return;

        const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const theme = resolveClickTheme(target);

        target.style.setProperty("--ui-click-ring", theme.ring);
        target.classList.add("ui-click-flash");
        clearTimeout(target.__uiFlashTimer);
        target.__uiFlashTimer = setTimeout(function () {
            target.classList.remove("ui-click-flash");
        }, 220);

        if (reducedMotion) return;

        const rect = target.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) return;

        const oldRipple = target.querySelector(":scope > .ui-click-ripple");
        if (oldRipple) oldRipple.remove();

        const hasCoords = typeof e.clientX === "number" && typeof e.clientY === "number" && (e.clientX !== 0 || e.clientY !== 0);
        const x = hasCoords ? (e.clientX - rect.left) : (rect.width / 2);
        const y = hasCoords ? (e.clientY - rect.top) : (rect.height / 2);
        const size = Math.max(rect.width, rect.height, 48) * 2.2;

        const ripple = document.createElement("span");
        ripple.className = "ui-click-ripple";
        ripple.setAttribute("aria-hidden", "true");
        ripple.style.setProperty("--ripple-x", x + "px");
        ripple.style.setProperty("--ripple-y", y + "px");
        ripple.style.setProperty("--ripple-size", size + "px");
        ripple.style.setProperty("--ripple-color", theme.ripple);

        const cleanup = function () {
            if (ripple.parentNode) ripple.remove();
        };
        ripple.addEventListener("animationend", cleanup, { once: true });
        target.appendChild(ripple);
        setTimeout(cleanup, 500);
    }

    document.addEventListener("pointerdown", triggerClickEffect, { passive: true });
})();
