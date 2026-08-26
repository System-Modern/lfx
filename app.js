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

    primary: "#D71920",

    primaryDark: "#B51218",

    primarySoft: "#FDEBEC",


    yellow: "#F7F40F",

    yellowDark: "#E8E500",

    yellowSoft: "#FFFDE6",


    navy: "#172033",

    navyLight: "#24324A",


    slate: "#64748B",

    slateLight: "#94A3B8",


    amber: "#F59E0B",

    amberSoft: "#FFF7E6",


    green: "#16A34A",

    greenSoft: "#EAF8EF",


    blue: "#2563EB",

    blueSoft: "#EFF6FF",


    purple: "#7C3AED",

    purpleSoft: "#F5F3FF",


    background: "#F6F7F9",

    surface: "#FFFFFF",

    border: "#E5E7EB",


    text: "#172033",

    textSoft: "#64748B",


    danger: "#DC2626"

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

        "Dashboard",

        "Ringkasan planning lembur karyawan"

    ],


    karyawan: [

        "Database Karyawan",

        "Kelola data karyawan"

    ],


    planning: [

        "Planning Lembur",

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
   NAVIGASI
========================================================= */

function showPage(
    pageId,
    button = null
) {

    document
        .querySelectorAll(
            ".page"
        )
        .forEach(
            page => {

                page.classList.toggle(
                    "active-page",
                    page.id === pageId
                );

            }
        );


    document
        .querySelectorAll(
            ".menu-item"
        )
        .forEach(
            item => {

                item.classList.remove(
                    "active"
                );

            }
        );


    if (button) {

        button.classList.add(
            "active"
        );

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

                updateKaryawanDropdown();

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
        typeof closePlanningModal ===
        "function"
    ) {

        closePlanningModal();

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


    if (
        typeof updateKaryawanDropdown ===
        "function"
    ) {

        updateKaryawanDropdown();

    }


    if (
        typeof renderKaryawan ===
        "function"
    ) {

        renderKaryawan();

    }


    if (
        typeof renderPlanning ===
        "function"
    ) {

        renderPlanning();

    }


    updateDashboard();

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
   LOAD MESSAGE
========================================================= */

console.log(
    "app.js optimized + dashboard filter periode aktif"
);