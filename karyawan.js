/* =====================================================
   KARYAWAN.JS — OPTIMIZED
   DATABASE KARYAWAN
   + PENALTI
   + KETERANGAN PENALTI DI TABEL
   + RIWAYAT LEMBUR
   + HAPUS KARYAWAN TANPA MENGHAPUS PLANNING
   + LOADING CRUD
   + NOTIFIKASI MODERN
   + SUMMARY TOTAL KARYAWAN AKTIF
   + SUMMARY TOTAL KARYAWAN PENALTI
   + OPTIMASI RENDER
===================================================== */


/* =====================================================
   STATE
===================================================== */

let crudProcessing = false;

const KaryawanState = {
    initialized: false,
    searchInitialized: false,
    penaltyInitialized: false,
    historyInitialized: false,
    loadingStyleInjected: false,
    toastContainer: null
};


/* =====================================================
   HELPER DATA
===================================================== */

function getDataKaryawan() {

    return Array.isArray(window.karyawan)
        ? window.karyawan
        : [];

}


function getDataPlanning() {

    return Array.isArray(window.planning)
        ? window.planning
        : [];

}


/* =====================================================
   NORMALISASI KARYAWAN
===================================================== */

function normalizeKaryawan(item) {

    if (
        !item ||
        typeof item !== "object"
    ) {
        return item;
    }

    if (!item.status) {
        item.status = "AKTIF";
    }

    if (
        item.alasanPenalti === undefined ||
        item.alasanPenalti === null
    ) {
        item.alasanPenalti = "";
    }

    return item;

}


function normalizeAllKaryawan() {

    const data = getDataKaryawan();

    for (
        let i = 0;
        i < data.length;
        i++
    ) {

        normalizeKaryawan(
            data[i]
        );

    }

    return data;

}


/* =====================================================
   STRING HELPER
===================================================== */

function normalizeId(value) {

    return String(value || "")
        .trim()
        .toUpperCase();

}


function normalizeSearch(value) {

    return String(value || "")
        .trim()
        .toLowerCase();

}


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


/* =====================================================
   SAVE DATA HELPER
===================================================== */

async function saveKaryawanData() {

    if (
        typeof simpanData !==
        "function"
    ) {
        return true;
    }

    const result =
        await simpanData();

    return result !== false;

}


/* =====================================================
   CRUD LOADING STYLE
===================================================== */

function injectCRUDLoadingStyle() {

    if (
        KaryawanState.loadingStyleInjected
    ) {
        return;
    }

    if (
        document.getElementById(
            "crudLoadingStyle"
        )
    ) {

        KaryawanState.loadingStyleInjected =
            true;

        return;

    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "crudLoadingStyle";

    style.textContent = `

        #crudLoadingOverlay {

            position: fixed;
            inset: 0;
            z-index: 99999;

            display: flex;
            align-items: center;
            justify-content: center;

            background:
                rgba(
                    15,
                    23,
                    42,
                    .42
                );

            backdrop-filter:
                blur(5px);

            opacity: 0;
            visibility: hidden;

            transition:
                opacity .25s ease,
                visibility .25s ease;

        }


        #crudLoadingOverlay.show {

            opacity: 1;
            visibility: visible;

        }


        .crud-loading-box {

            width: min(
                calc(100% - 40px),
                430px
            );

            padding: 30px;

            border-radius: 20px;

            background: #ffffff;

            box-shadow:
                0 25px 70px
                rgba(
                    0,
                    0,
                    0,
                    .20
                );

            text-align: center;

            transform:
                translateY(12px)
                scale(.97);

            transition:
                transform .25s ease;

        }


        #crudLoadingOverlay.show
        .crud-loading-box {

            transform:
                translateY(0)
                scale(1);

        }


        .crud-loading-icon {

            width: 62px;
            height: 62px;

            margin:
                0 auto 18px;

            display: flex;

            align-items: center;
            justify-content: center;

            border-radius: 50%;

            background:
                #f3f4f6;

        }


        .crud-spinner {

            width: 30px;
            height: 30px;

            border-radius: 50%;

            border:
                3px solid
                #e5e7eb;

            border-top-color:
                #d71920;

            animation:
                crudSpin .75s
                linear infinite;

        }


        @keyframes crudSpin {

            to {
                transform:
                    rotate(360deg);
            }

        }


        .crud-loading-title {

            font-size: 19px;
            font-weight: 700;

            color:
                #111827;

            margin-bottom:
                6px;

        }


        .crud-loading-description {

            font-size: 13px;

            color:
                #6b7280;

            margin-bottom:
                22px;

        }


        .crud-progress-wrapper {
            width: 100%;
        }


        .crud-progress-bar {

            width: 100%;
            height: 9px;

            overflow: hidden;

            border-radius:
                99px;

            background:
                #e5e7eb;

        }


        .crud-progress-fill {

            width: 0%;
            height: 100%;

            border-radius:
                99px;

            background:
                linear-gradient(
                    90deg,
                    #d71920,
                    #ef4444
                );

            transition:
                width .35s ease;

        }


        .crud-progress-info {

            display: flex;

            justify-content:
                space-between;

            margin-top:
                9px;

            font-size: 12px;

            color:
                #6b7280;

        }


        #crudProgressText {

            font-weight: 700;

            color:
                #d71920;

        }


        body.crud-processing {
            overflow: hidden;
        }


        .crud-toast-container {

            position: fixed;

            top: 24px;
            right: 24px;

            z-index: 100000;

            display: flex;

            flex-direction:
                column;

            gap: 12px;

            pointer-events:
                none;

        }


        .crud-toast {

            width: min(
                calc(100vw - 40px),
                390px
            );

            display: flex;

            gap: 13px;

            align-items:
                flex-start;

            padding:
                16px 18px;

            border-radius:
                15px;

            background:
                #ffffff;

            box-shadow:
                0 15px 40px
                rgba(
                    0,
                    0,
                    0,
                    .14
                );

            border:
                1px solid
                #e5e7eb;

            opacity: 0;

            transform:
                translateX(25px);

            transition:
                opacity .3s ease,
                transform .3s ease;

        }


        .crud-toast.show {

            opacity: 1;

            transform:
                translateX(0);

        }


        .crud-toast-icon {

            width: 34px;
            height: 34px;

            flex: 0 0 34px;

            display: flex;

            align-items:
                center;

            justify-content:
                center;

            border-radius:
                10px;

            font-size: 16px;
            font-weight: 700;

        }


        .crud-toast.success
        .crud-toast-icon {

            background:
                #dcfce7;

            color:
                #15803d;

        }


        .crud-toast.error
        .crud-toast-icon {

            background:
                #fee2e2;

            color:
                #b91c1c;

        }


        .crud-toast.info
        .crud-toast-icon {

            background:
                #dbeafe;

            color:
                #1d4ed8;

        }


        .crud-toast-content {

            flex: 1;
            min-width: 0;

        }


        .crud-toast-title {

            font-size: 14px;
            font-weight: 700;

            color:
                #111827;

            margin-bottom:
                3px;

        }


        .crud-toast-message {

            font-size: 12px;

            line-height:
                1.5;

            color:
                #6b7280;

        }


        /* =================================================
           KETERANGAN PENALTI
        ================================================== */

        .penalty-reason {

            display: inline-flex;

            align-items: center;

            gap: 6px;

            max-width: 230px;

            padding:
                7px 10px;

            border-radius:
                9px;

            background:
                #fff7ed;

            border:
                1px solid
                #fed7aa;

            color:
                #9a3412;

            font-size: 12px;

            line-height:
                1.4;

            vertical-align:
                middle;

        }


        .penalty-reason-icon {

            flex:
                0 0 auto;

            font-size: 13px;

        }


        .penalty-reason-text {

            min-width: 0;

            max-width: 190px;

            overflow: hidden;

            text-overflow:
                ellipsis;

            white-space:
                nowrap;

            font-weight: 600;

        }


        .penalty-reason-label {

            display: block;

            font-size: 10px;

            font-weight: 500;

            color:
                #c2410c;

            margin-bottom:
                1px;

        }


        @media (max-width: 900px) {

            .penalty-reason {

                max-width:
                    180px;

            }

            .penalty-reason-text {

                max-width:
                    145px;

            }

        }


        @media (max-width: 600px) {

            .crud-toast-container {

                top: 15px;
                right: 15px;
                left: 15px;

            }

        }

    `;

    document.head.appendChild(
        style
    );

    KaryawanState.loadingStyleInjected =
        true;

}


/* =====================================================
   LOADING
===================================================== */

function showCRUDLoading(
    title = "Memproses data...",
    description = "Mohon tunggu sebentar"
) {

    hideCRUDLoading();

    injectCRUDLoadingStyle();

    const overlay =
        document.createElement(
            "div"
        );

    overlay.id =
        "crudLoadingOverlay";

    overlay.innerHTML = `

        <div class="crud-loading-box">

            <div class="crud-loading-icon">

                <div
                    class="crud-spinner"
                ></div>

            </div>


            <div class="crud-loading-title">
                ${escapeHTML(title)}
            </div>


            <div
                class="crud-loading-description"
            >
                ${escapeHTML(description)}
            </div>


            <div
                class="crud-progress-wrapper"
            >

                <div
                    class="crud-progress-bar"
                >

                    <div
                        id="crudProgressBar"
                        class="crud-progress-fill"
                    ></div>

                </div>


                <div
                    class="crud-progress-info"
                >

                    <span
                        id="crudProgressText"
                    >
                        0%
                    </span>

                    <span
                        id="crudProgressStatus"
                    >
                        Menyiapkan...
                    </span>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(
        overlay
    );

    requestAnimationFrame(
        () => {

            overlay.classList.add(
                "show"
            );

        }
    );

}


/* =====================================================
   UPDATE LOADING
===================================================== */

function updateCRUDLoading(
    percentage,
    status = "Memproses..."
) {

    const value =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    percentage
                ) || 0
            )
        );

    const progress =
        document.getElementById(
            "crudProgressBar"
        );

    const text =
        document.getElementById(
            "crudProgressText"
        );

    const statusText =
        document.getElementById(
            "crudProgressStatus"
        );

    if (progress) {

        progress.style.width =
            `${value}%`;

    }

    if (text) {

        text.textContent =
            `${Math.round(value)}%`;

    }

    if (statusText) {

        statusText.textContent =
            status;

    }

}


/* =====================================================
   HIDE LOADING
===================================================== */

function hideCRUDLoading() {

    const overlay =
        document.getElementById(
            "crudLoadingOverlay"
        );

    if (!overlay) {
        return;
    }

    overlay.classList.remove(
        "show"
    );

    setTimeout(
        () => {

            if (
                overlay.parentNode
            ) {

                overlay.parentNode.removeChild(
                    overlay
                );

            }

        },
        250
    );

}


/* =====================================================
   CRUD PROCESS
===================================================== */

function startCRUDProcess(
    title,
    description
) {

    if (crudProcessing) {
        return false;
    }

    crudProcessing = true;

    document.body.classList.add(
        "crud-processing"
    );

    showCRUDLoading(
        title,
        description
    );

    updateCRUDLoading(
        10,
        "Menyiapkan data..."
    );

    return true;

}


function cancelCRUDProcess() {

    hideCRUDLoading();

    document.body.classList.remove(
        "crud-processing"
    );

    crudProcessing = false;

}


function finishCRUDProcess() {

    updateCRUDLoading(
        100,
        "Selesai!"
    );

    setTimeout(
        () => {

            hideCRUDLoading();

            document.body.classList.remove(
                "crud-processing"
            );

            crudProcessing = false;

        },
        350
    );

}


/* =====================================================
   TOAST
===================================================== */

function getCRUDToastContainer() {

    if (
        KaryawanState.toastContainer &&
        document.body.contains(
            KaryawanState.toastContainer
        )
    ) {

        return KaryawanState.toastContainer;

    }

    let container =
        document.getElementById(
            "crudToastContainer"
        );

    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "crudToastContainer";

        container.className =
            "crud-toast-container";

        document.body.appendChild(
            container
        );

    }

    KaryawanState.toastContainer =
        container;

    return container;

}


function showCRUDToast(
    type = "success",
    title = "Berhasil",
    message = ""
) {

    injectCRUDLoadingStyle();

    const container =
        getCRUDToastContainer();

    const icons = {

        success: "✓",
        error: "!",
        info: "i"

    };

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `crud-toast ${type}`;

    toast.innerHTML = `

        <div class="crud-toast-icon">
            ${icons[type] || "i"}
        </div>

        <div
            class="crud-toast-content"
        >

            <div
                class="crud-toast-title"
            >
                ${escapeHTML(title)}
            </div>

            <div
                class="crud-toast-message"
            >
                ${escapeHTML(message)}
            </div>

        </div>

    `;

    container.appendChild(
        toast
    );

    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );

        }
    );

    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

            setTimeout(
                () => {

                    if (
                        toast.parentNode
                    ) {

                        toast.parentNode.removeChild(
                            toast
                        );

                    }

                },
                300
            );

        },
        4200
    );

}


/* =====================================================
   REFRESH UI
===================================================== */

function refreshKaryawanUI() {

    renderKaryawan();

    updateKaryawanDropdown();

    if (
        typeof renderFilterKaryawan ===
        "function"
    ) {

        renderFilterKaryawan();

    }

    if (
        typeof renderPlanningKaryawan ===
        "function"
    ) {

        renderPlanningKaryawan();

    }

    if (
        typeof updateDashboard ===
        "function"
    ) {

        updateDashboard();

    }

}


/* =====================================================
   TAMBAH KARYAWAN
===================================================== */

async function tambahKaryawan() {

    if (
        !startCRUDProcess(
            "Menambahkan karyawan",
            "Data sedang divalidasi dan disimpan..."
        )
    ) {

        return;

    }

    let dataKaryawan;

    try {

        const idInput =
            document.getElementById(
                "idKaryawan"
            );

        const namaInput =
            document.getElementById(
                "namaKaryawan"
            );

        if (
            !idInput ||
            !namaInput
        ) {

            throw new Error(
                "Form karyawan tidak ditemukan."
            );

        }

        const id =
            normalizeId(
                idInput.value
            );

        const nama =
            String(
                namaInput.value || ""
            ).trim();

        updateCRUDLoading(
            25,
            "Memeriksa data..."
        );

        if (
            !id ||
            !/^\d+$/.test(id) ||
            !nama
        ) {

            throw new Error(
                "ID karyawan wajib berupa angka dan nama wajib diisi."
            );

        }

        dataKaryawan =
            getDataKaryawan();

        const sudahAda =
            dataKaryawan.some(
                item =>
                    normalizeId(
                        item.id
                    ) === id
            );

        if (sudahAda) {

            throw new Error(
                "ID karyawan sudah terdaftar."
            );

        }

        const dataBaru = {

            id,

            nama,

            status:
                "AKTIF",

            alasanPenalti:
                ""

        };

        dataKaryawan.push(
            dataBaru
        );

        window.karyawan =
            dataKaryawan;

        updateCRUDLoading(
            50,
            "Data karyawan siap disimpan..."
        );

        const berhasil =
            await saveKaryawanData();

        if (!berhasil) {

            dataKaryawan.pop();

            window.karyawan =
                dataKaryawan;

            throw new Error(
                "Data gagal disimpan ke database."
            );

        }

        updateCRUDLoading(
            75,
            "Memperbarui tampilan..."
        );

        idInput.value = "";
        namaInput.value = "";

        refreshKaryawanUI();

        finishCRUDProcess();

        showCRUDToast(
            "success",
            "Karyawan berhasil ditambahkan",
            `${nama} (${id}) sudah masuk ke database dan siap digunakan untuk planning lembur.`
        );

    } catch (error) {

        cancelCRUDProcess();

        showCRUDToast(
            "error",
            "Data belum tersimpan",
            error.message ||
            "Terjadi kesalahan saat menyimpan data."
        );

    }

}


async function editKaryawan(index) {

    if (crudProcessing) {
        return;
    }

    const dataKaryawan =
        getDataKaryawan();

    const data =
        dataKaryawan[index];

    if (!data) {
        showCRUDToast("error", "Data tidak ditemukan", "Karyawan sudah tidak tersedia.");
        return;
    }

    const namaLama =
        String(data.nama || "").trim();

    const namaBaru =
        window.prompt(
            `Edit nama karyawan (${data.id})`,
            namaLama
        );

    if (namaBaru === null) {
        return;
    }

    const nama =
        String(namaBaru).trim();

    if (!nama) {
        showCRUDToast("error", "Nama belum diisi", "Nama karyawan wajib diisi.");
        return;
    }

    if (nama === namaLama) {
        return;
    }

    if (!window.confirm(
        `Ubah nama ${namaLama} menjadi ${nama}?\n\n` +
        "Nama pada seluruh planning dan riwayat juga akan diperbarui."
    )) {
        return;
    }

    if (!startCRUDProcess("Mengubah karyawan", "Menyinkronkan nama ke planning...")) {
        return;
    }

    const id = normalizeId(data.id);
    const namaSebelumnya = data.nama;
    const planningLama = getDataPlanning().map(item => ({
        ...item,
        karyawan: Array.isArray(item.karyawan)
            ? item.karyawan.map(karyawan => ({ ...karyawan }))
            : item.karyawan
    }));

    try {
        data.nama = nama;

        getDataPlanning().forEach(item => {
            if (!Array.isArray(item.karyawan)) {
                return;
            }

            item.karyawan.forEach(karyawan => {
                if (normalizeId(karyawan.id) === id) {
                    karyawan.nama = nama;
                    karyawan.namaKaryawan = nama;
                }
            });
        });

        const berhasil = await saveKaryawanData();

        if (!berhasil) {
            data.nama = namaSebelumnya;
            window.planning = planningLama;
            throw new Error("Perubahan gagal disimpan ke database.");
        }

        refreshKaryawanUI();
        finishCRUDProcess();
        showCRUDToast("success", "Nama berhasil diubah", `${nama} (${data.id}) sudah diperbarui di seluruh planning.`);
    }
    catch (error) {
        cancelCRUDProcess();
        showCRUDToast("error", "Perubahan gagal", error.message || "Nama karyawan gagal diubah.");
    }
}


/* =====================================================
   HAPUS KARYAWAN
   PLANNING LAMA TETAP AMAN
===================================================== */

async function hapusKaryawan(index) {

    if (crudProcessing) {
        return;
    }

    const dataKaryawan =
        getDataKaryawan();

    const data =
        dataKaryawan[index];

    if (!data) {

        showCRUDToast(
            "error",
            "Data tidak ditemukan",
            "Karyawan yang ingin dihapus sudah tidak tersedia."
        );

        return;

    }

    const id =
        normalizeId(
            data.id
        );

    const nama =
        String(
            data.nama || ""
        ).trim();

    const pernahPlanning =
        getDataPlanning().some(
            item =>
                Array.isArray(
                    item.karyawan
                ) &&
                item.karyawan.some(
                    k =>
                        normalizeId(
                            k.id
                        ) === id
                )
        );

    let pesan =
        `Hapus karyawan ${nama}?`;

    if (pernahPlanning) {

        pesan =
            `Hapus karyawan ${nama}?\n\n` +
            `Karyawan ini sudah memiliki ` +
            `riwayat planning lembur.\n\n` +
            `Data planning lama TIDAK akan ` +
            `dihapus dan tetap tersimpan ` +
            `sebagai history.`;

    }

    if (!confirm(pesan)) {
        return;
    }

    if (
        !startCRUDProcess(
            "Menghapus karyawan",
            pernahPlanning
                ? "Menghapus karyawan tanpa menyentuh riwayat lembur..."
                : "Menghapus data karyawan dari database..."
        )
    ) {

        return;

    }

    try {

        updateCRUDLoading(
            25,
            "Menghapus data karyawan..."
        );

        const dataLama = {
            ...data
        };

        dataKaryawan.splice(
            index,
            1
        );

        window.karyawan =
            dataKaryawan;

        updateCRUDLoading(
            50,
            "Menyimpan perubahan..."
        );

        const berhasil =
            await saveKaryawanData();

        if (!berhasil) {

            dataKaryawan.splice(
                index,
                0,
                dataLama
            );

            window.karyawan =
                dataKaryawan;

            throw new Error(
                "Data gagal dihapus dari database."
            );

        }

        updateCRUDLoading(
            80,
            "Menyegarkan tampilan..."
        );

        refreshKaryawanUI();

        finishCRUDProcess();

        showCRUDToast(
            "success",
            "Karyawan berhasil dihapus",
            pernahPlanning
                ? `${nama} sudah dihapus dari daftar karyawan. Riwayat planning lemburnya tetap aman.`
                : `${nama} sudah dihapus dari database karyawan.`
        );

    } catch (error) {

        cancelCRUDProcess();

        showCRUDToast(
            "error",
            "Penghapusan gagal",
            error.message ||
            "Terjadi kesalahan saat menghapus karyawan."
        );

    }

}


/* =====================================================
   SUMMARY TOTAL KARYAWAN
===================================================== */

function updateSummaryKaryawan() {

    const dataKaryawan =
        normalizeAllKaryawan();


    let totalAktif = 0;

    let totalPenalti = 0;


    dataKaryawan.forEach(
        item => {

            const status =
                String(
                    item.status ||
                    "AKTIF"
                )
                .trim()
                .toUpperCase();


            if (
                status ===
                "PENALTI"
            ) {

                totalPenalti++;

            } else {

                totalAktif++;

            }

        }
    );


    const aktifElement =
        document.getElementById(
            "totalKaryawanAktif"
        );


    const penaltiElement =
        document.getElementById(
            "totalKaryawanPenalti"
        );


    if (aktifElement) {

        aktifElement.textContent =
            totalAktif;

    }


    if (penaltiElement) {

        penaltiElement.textContent =
            totalPenalti;

    }

}


/* =====================================================
   RENDER KARYAWAN
===================================================== */

function renderKaryawan() {

    const tbody =
        document.getElementById(
            "tableKaryawan"
        );

    if (!tbody) {

        updateSummaryKaryawan();

        return;

    }

    const dataKaryawan =
        normalizeAllKaryawan();

    const searchInput =
        document.getElementById(
            "searchKaryawan"
        );

    const search =
        normalizeSearch(
            searchInput
                ? searchInput.value
                : ""
        );

    const filtered =
        search
            ? dataKaryawan.filter(
                item => {

                    const id =
                        normalizeSearch(
                            item.id
                        );

                    const nama =
                        normalizeSearch(
                            item.nama
                        );

                    return (
                        id.includes(
                            search
                        ) ||
                        nama.includes(
                            search
                        )
                    );

                }
            )
            : dataKaryawan;


    /* =================================================
       DATA KOSONG
    ================================================== */

    if (
        filtered.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="empty-state-cell"
                >

                    <div
                        class="empty-state"
                    >
                        ${
                            search
                                ? "Karyawan tidak ditemukan."
                                : "Belum ada data karyawan."
                        }
                    </div>

                </td>

            </tr>

        `;

        updateJumlahKaryawan(
            dataKaryawan.length
        );

        updateSummaryKaryawan();

        return;

    }


    /* =================================================
       RENDER
    ================================================== */

    const fragment =
        document.createDocumentFragment();

    filtered.forEach(
        item => {

            const index =
                dataKaryawan.indexOf(
                    item
                );

            const isPenalty =
                normalizeSearch(
                    item.status
                ).toUpperCase() ===
                "PENALTI";


            /* -----------------------------------------
               STATUS
            ----------------------------------------- */

            const statusHTML =
                isPenalty
                    ? `
                        <span
                            class="status-badge status-penalty"
                        >
                            <span>●</span>
                            PENALTI
                        </span>
                    `
                    : `
                        <span
                            class="status-badge status-active"
                        >
                            <span>●</span>
                            AKTIF
                        </span>
                    `;


            /* -----------------------------------------
               KETERANGAN PENALTI
            ----------------------------------------- */

            const alasanPenalti =
                String(
                    item.alasanPenalti ||
                    ""
                ).trim();


            const penaltyReasonHTML =
                isPenalty
                    ? `
                        <span
                            class="penalty-reason"
                            title="${escapeHTML(
                                alasanPenalti ||
                                "Tidak ada keterangan penalti"
                            )}"
                        >

                            <span
                                class="penalty-reason-icon"
                            >
                                ⚠️
                            </span>

                            <span>

                                <span
                                    class="penalty-reason-label"
                                >
                                    Alasan Penalti
                                </span>

                                <span
                                    class="penalty-reason-text"
                                >
                                    ${escapeHTML(
                                        alasanPenalti ||
                                        "Tidak ada keterangan"
                                    )}
                                </span>

                            </span>

                        </span>
                    `
                    : "";


            /* -----------------------------------------
               AKSI
            ----------------------------------------- */

            const aksiHTML =
                isPenalty
                    ? `
                        <button
                            type="button"
                            class="btn-secondary btn-small"
                            onclick="editKaryawan(${index})"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="btn-primary btn-small"
                            onclick="lepasPenalti(${index})"
                        >
                            Lepas Penalti
                        </button>

                        <button
                            type="button"
                            class="btn-history btn-small"
                            onclick="lihatRiwayatLembur(${index})"
                        >
                            Riwayat
                        </button>

                        <button
                            type="button"
                            class="btn-delete btn-small"
                            onclick="hapusKaryawan(${index})"
                        >
                            Hapus
                        </button>

                        ${penaltyReasonHTML}
                    `
                    : `
                        <button
                            type="button"
                            class="btn-secondary btn-small"
                            onclick="editKaryawan(${index})"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="btn-penalty btn-small"
                            onclick="bukaModalPenalti(${index})"
                        >
                            Penalti
                        </button>

                        <button
                            type="button"
                            class="btn-history btn-small"
                            onclick="lihatRiwayatLembur(${index})"
                        >
                            Riwayat
                        </button>

                        <button
                            type="button"
                            class="btn-delete btn-small"
                            onclick="hapusKaryawan(${index})"
                        >
                            Hapus
                        </button>
                    `;


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>

                    <strong>
                        ${escapeHTML(
                            item.id
                        )}
                    </strong>

                </td>

                <td>
                    ${escapeHTML(
                        item.nama
                    )}
                </td>

                <td>
                    ${statusHTML}
                </td>

                <td>

                    <div
                        class="action-buttons"
                        style="
                            display:flex;
                            align-items:center;
                            flex-wrap:wrap;
                            gap:8px;
                        "
                    >

                        ${aksiHTML}

                    </div>

                </td>

            `;


            fragment.appendChild(
                row
            );

        }
    );


    tbody.replaceChildren(
        fragment
    );


    updateJumlahKaryawan(
        dataKaryawan.length
    );


    updateSummaryKaryawan();

}


/* =====================================================
   JUMLAH KARYAWAN
===================================================== */

function updateJumlahKaryawan(
    jumlah
) {

    const element =
        document.getElementById(
            "jumlahKaryawanText"
        );

    if (!element) {
        return;
    }

    element.textContent =
        `${jumlah} karyawan`;

}


/* =====================================================
   RIWAYAT LEMBUR
===================================================== */

function lihatRiwayatLembur(index) {

    const dataKaryawan =
        getDataKaryawan();

    const dataPlanning =
        getDataPlanning();

    const karyawan =
        dataKaryawan[index];

    if (!karyawan) {

        showCRUDToast(
            "error",
            "Data tidak ditemukan",
            "Karyawan yang dipilih sudah tidak tersedia."
        );

        return;

    }

    const idKaryawan =
        normalizeId(
            karyawan.id
        );

    const riwayat =
        dataPlanning
            .filter(
                item =>
                    Array.isArray(
                        item.karyawan
                    ) &&
                    item.karyawan.some(
                        k =>
                            normalizeId(
                                k.id
                            ) ===
                            idKaryawan
                    )
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.tanggal || 0
                    ) -
                    new Date(
                        a.tanggal || 0
                    )
            );


    const modal =
        document.getElementById(
            "historyKaryawanModal"
        );

    const title =
        document.getElementById(
            "historyKaryawanTitle"
        );

    const content =
        document.getElementById(
            "historyKaryawanContent"
        );


    if (
        !modal ||
        !content
    ) {

        showCRUDToast(
            "error",
            "Modal riwayat tidak ditemukan",
            "Pastikan historyKaryawanModal tersedia di index.html."
        );

        return;

    }


    if (title) {

        title.textContent =
            `${karyawan.id} - ${karyawan.nama}`;

    }


    if (
        riwayat.length === 0
    ) {

        content.innerHTML = `

            <div
                style="
                    padding:40px 20px;
                    text-align:center;
                    color:#6b7280;
                "
            >

                <div
                    style="
                        font-size:36px;
                        margin-bottom:12px;
                    "
                >
                    📋
                </div>

                <strong>
                    Belum ada riwayat lembur
                </strong>

                <div
                    style="
                        margin-top:6px;
                        font-size:13px;
                    "
                >

                    ${escapeHTML(
                        karyawan.nama
                    )}

                    belum memiliki
                    planning lembur.

                </div>

            </div>

        `;

    } else {

        const riwayatTerakhir =
            riwayat.slice(
                0,
                10
            );

        const fragment =
            document.createDocumentFragment();

        riwayatTerakhir.forEach(
            (
                item,
                nomor
            ) => {

                const tanggal =
                    formatTanggalRiwayat(
                        item.tanggal
                    );

                const jamMulai =
                    item.jamMulai ||
                    item.jam_mulai ||
                    "-";

                const jamSelesai =
                    item.jamSelesai ||
                    item.jam_selesai ||
                    "-";

                const durasi =
                    item.durasiPlanning ??
                    item.durasi ??
                    item.durasiMenit ??
                    "-";

                const keterangan =
                    item.keterangan ||
                    "-";

                const element =
                    document.createElement(
                        "div"
                    );

                element.className =
                    "history-item";

                element.innerHTML = `

                    <div
                        class="history-number"
                    >
                        ${nomor + 1}
                    </div>

                    <div
                        class="history-content"
                    >

                        <div
                            class="history-date"
                        >
                            ${escapeHTML(
                                tanggal
                            )}
                        </div>

                        <div
                            class="history-detail"
                        >

                            <span>
                                🕐
                                ${escapeHTML(
                                    jamMulai
                                )}
                                -
                                ${escapeHTML(
                                    jamSelesai
                                )}
                            </span>

                            <span>
                                ⏱
                                ${escapeHTML(
                                    String(
                                        durasi
                                    )
                                )}
                                Jam
                            </span>

                        </div>

                        <div
                            class="history-note"
                        >
                            ${escapeHTML(
                                keterangan
                            )}
                        </div>

                    </div>

                `;

                fragment.appendChild(
                    element
                );

            }
        );

        content.replaceChildren(
            fragment
        );

    }


    modal.classList.add(
        "show"
    );

    modal.style.display =
        "flex";

}


function lihatRiwayatLemburByNama(nama) {

    const targetNama =
        normalizeSearch(nama);

    const index =
        getDataKaryawan().findIndex(
            item => normalizeSearch(item.nama) === targetNama
        );

    if (index === -1) {
        showCRUDToast(
            "error",
            "Karyawan tidak ditemukan",
            `Data ${nama} tidak tersedia di database karyawan.`
        );
        return;
    }

    lihatRiwayatLembur(index);
}


function bukaRiwayatDashboard(title, planningItems, mode = "karyawan") {

    const modal =
        document.getElementById("historyKaryawanModal");

    const titleElement =
        document.getElementById("historyKaryawanTitle");

    const content =
        document.getElementById("historyKaryawanContent");

    if (!modal || !content) {
        return;
    }

    const items =
        Array.isArray(planningItems) ? planningItems : [];

    if (titleElement) {
        titleElement.textContent = title;
    }

    content.innerHTML = "";

    if (!items.length) {
        content.innerHTML = `<div style="padding:40px 20px;text-align:center;color:#6b7280;">Belum ada riwayat planning.</div>`;
    } else {
        items
            .slice()
            .sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0))
            .forEach(function (item, index) {
                const element = document.createElement("div");
                const karyawanNames = Array.isArray(item.karyawan)
                    ? item.karyawan.map(k => k.nama || k.namaKaryawan || "-").join(", ")
                    : "-";
                const durasi = item.durasiPlanning ?? item.durasi ?? item.durasiMenit ?? "-";
                const planningId = item.idPlanning || item.kodePlanning || item.id || "-";

                element.className = "history-item";
                element.innerHTML = `
                    <div class="history-number">${index + 1}</div>
                    <div class="history-content">
                        <div class="history-date">${mode === "planning" ? `Planning ${escapeHTML(planningId)}` : escapeHTML(formatTanggalRiwayat(item.tanggal))}</div>
                        <div class="history-detail">
                            ${mode === "planning"
                                ? `<span>📅 ${escapeHTML(formatTanggalRiwayat(item.tanggal))}</span><span>⏱ ${escapeHTML(String(durasi))}</span>`
                                : `<span>🕐 ${escapeHTML(item.jamMulai || item.jam_mulai || "-")} - ${escapeHTML(item.jamSelesai || item.jam_selesai || "-")}</span><span>⏱ ${escapeHTML(String(durasi))}</span>`}
                        </div>
                        <div class="history-note">${escapeHTML(mode === "planning" ? item.keterangan || karyawanNames : karyawanNames)}</div>
                    </div>
                `;
                content.appendChild(element);
            });
    }

    modal.classList.add("show");
    modal.style.display = "flex";
}


/* =====================================================
   FORMAT TANGGAL
===================================================== */

function formatTanggalRiwayat(
    tanggal
) {

    if (!tanggal) {
        return "-";
    }

    const date =
        new Date(
            tanggal
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            tanggal
        );

    }

    return date.toLocaleDateString(
        "id-ID",
        {

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric"

        }
    );

}


/* =====================================================
   TUTUP RIWAYAT
===================================================== */

function tutupRiwayatLembur() {

    const modal =
        document.getElementById(
            "historyKaryawanModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "show"
    );

    modal.style.display =
        "none";

}


/* =====================================================
   MODAL PENALTI
===================================================== */

function bukaModalPenalti(
    index
) {

    if (crudProcessing) {
        return;
    }

    const data =
        getDataKaryawan()[index];

    if (!data) {

        showCRUDToast(
            "error",
            "Data tidak ditemukan",
            "Karyawan yang dipilih sudah tidak tersedia."
        );

        return;

    }

    const modal =
        document.getElementById(
            "penaltyModal"
        );

    const idInput =
        document.getElementById(
            "penaltyKaryawanId"
        );

    const namaInput =
        document.getElementById(
            "penaltyKaryawanNama"
        );

    const alasanInput =
        document.getElementById(
            "alasanPenalti"
        );


    if (!modal) {

        showCRUDToast(
            "error",
            "Modal penalti belum tersedia",
            "Periksa elemen penaltyModal di index.html."
        );

        return;

    }


    if (idInput) {

        idInput.value =
            data.id;

    }


    if (namaInput) {

        namaInput.value =
            `${data.id} - ${data.nama}`;

    }


    if (alasanInput) {

        alasanInput.value =
            data.alasanPenalti ||
            "";

    }


    modal.classList.add(
        "show"
    );

    modal.style.display =
        "flex";


    setTimeout(
        () => {

            if (alasanInput) {

                alasanInput.focus();

            }

        },
        100
    );

}


/* =====================================================
   CLOSE PENALTY MODAL
===================================================== */

function closePenaltyModal() {

    const modal =
        document.getElementById(
            "penaltyModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "show"
    );

    modal.style.display =
        "none";


    const form =
        document.getElementById(
            "formPenalty"
        );

    if (form) {
        form.reset();
    }


    const idInput =
        document.getElementById(
            "penaltyKaryawanId"
        );

    const namaInput =
        document.getElementById(
            "penaltyKaryawanNama"
        );


    if (idInput) {
        idInput.value = "";
    }

    if (namaInput) {
        namaInput.value = "";
    }

}


/* =====================================================
   AKTIFKAN PENALTI
===================================================== */

async function aktifkanPenalti() {

    if (
        !startCRUDProcess(
            "Mengaktifkan penalti",
            "Status karyawan sedang diperbarui..."
        )
    ) {

        return;

    }

    const dataKaryawan =
        getDataKaryawan();

    const idInput =
        document.getElementById(
            "penaltyKaryawanId"
        );

    const alasanInput =
        document.getElementById(
            "alasanPenalti"
        );


    const id =
        normalizeId(
            idInput
                ? idInput.value
                : ""
        );


    const alasan =
        String(
            alasanInput
                ? alasanInput.value
                : ""
        ).trim();


    try {

        updateCRUDLoading(
            25,
            "Memeriksa karyawan..."
        );


        if (!id) {

            throw new Error(
                "Karyawan tidak ditemukan."
            );

        }


        if (!alasan) {

            throw new Error(
                "Alasan penalti wajib diisi."
            );

        }


        const index =
            dataKaryawan.findIndex(
                item =>
                    normalizeId(
                        item.id
                    ) === id
            );


        if (index === -1) {

            throw new Error(
                "Data karyawan tidak ditemukan."
            );

        }


        const data =
            dataKaryawan[index];

        const statusLama =
            data.status;

        const alasanLama =
            data.alasanPenalti;


        data.status =
            "PENALTI";

        data.alasanPenalti =
            alasan;


        window.karyawan =
            dataKaryawan;


        updateCRUDLoading(
            50,
            "Menyimpan status penalti..."
        );


        const berhasil =
            await saveKaryawanData();


        if (!berhasil) {

            data.status =
                statusLama;

            data.alasanPenalti =
                alasanLama;

            window.karyawan =
                dataKaryawan;


            throw new Error(
                "Status penalti gagal disimpan."
            );

        }


        updateCRUDLoading(
            80,
            "Memperbarui daftar karyawan..."
        );


        const nama =
            data.nama;


        closePenaltyModal();

        refreshKaryawanUI();

        finishCRUDProcess();


        showCRUDToast(
            "success",
            "Penalti berhasil diaktifkan",
            `${nama} sekarang berstatus PENALTI dan tidak dapat dimasukkan ke planning lembur.`
        );


    } catch (error) {

        cancelCRUDProcess();

        showCRUDToast(
            "error",
            "Penalti gagal diterapkan",
            error.message ||
            "Terjadi kesalahan saat memperbarui status karyawan."
        );

    }

}


/* =====================================================
   LEPAS PENALTI
===================================================== */

async function lepasPenalti(
    index
) {

    if (crudProcessing) {
        return;
    }

    const dataKaryawan =
        getDataKaryawan();

    const data =
        dataKaryawan[index];


    if (!data) {
        return;
    }


    if (
        !confirm(
            `Lepas penalti untuk ${data.nama}?`
        )
    ) {

        return;

    }


    if (
        !startCRUDProcess(
            "Melepas penalti",
            "Status karyawan sedang dikembalikan..."
        )
    ) {

        return;

    }


    const statusLama =
        data.status;

    const alasanLama =
        data.alasanPenalti;


    try {

        updateCRUDLoading(
            30,
            "Mengubah status karyawan..."
        );


        data.status =
            "AKTIF";

        data.alasanPenalti =
            "";


        window.karyawan =
            dataKaryawan;


        updateCRUDLoading(
            55,
            "Menyimpan perubahan..."
        );


        const berhasil =
            await saveKaryawanData();


        if (!berhasil) {

            data.status =
                statusLama;

            data.alasanPenalti =
                alasanLama;

            window.karyawan =
                dataKaryawan;


            throw new Error(
                "Perubahan status gagal disimpan."
            );

        }


        updateCRUDLoading(
            80,
            "Memperbarui daftar karyawan..."
        );


        refreshKaryawanUI();

        finishCRUDProcess();


        showCRUDToast(
            "success",
            "Penalti berhasil dilepas",
            `${data.nama} sudah kembali AKTIF dan sekarang dapat dimasukkan ke planning lembur.`
        );


    } catch (error) {

        cancelCRUDProcess();

        showCRUDToast(
            "error",
            "Gagal melepas penalti",
            error.message ||
            "Terjadi kesalahan saat memperbarui status karyawan."
        );

    }

}


/* =====================================================
   DROPDOWN KARYAWAN
===================================================== */

function updateKaryawanDropdown() {

    const dataKaryawan =
        getDataKaryawan();


    const filter =
        document.getElementById(
            "filterKaryawan"
        );


    const select =
        document.getElementById(
            "pilihKaryawan"
        );


    /* =================================================
       FILTER KARYAWAN
    ================================================== */

    if (filter) {

        const nilaiLama =
            filter.value;


        const fragment =
            document.createDocumentFragment();


        const semua =
            document.createElement(
                "option"
            );


        semua.value =
            "";

        semua.textContent =
            "Semua Karyawan";


        fragment.appendChild(
            semua
        );


        dataKaryawan.forEach(
            item => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    item.id;

                option.textContent =
                    `${item.id} - ${item.nama}`;

                fragment.appendChild(
                    option
                );

            }
        );


        filter.replaceChildren(
            fragment
        );


        filter.value =
            Array.from(
                filter.options
            ).some(
                option =>
                    option.value ===
                    nilaiLama
            )
                ? nilaiLama
                : "";

    }


    /* =================================================
       SELECT PLANNING
    ================================================== */

    if (select) {

        const fragment =
            document.createDocumentFragment();


        const placeholder =
            document.createElement(
                "option"
            );


        placeholder.value =
            "";

        placeholder.textContent =
            "Pilih Karyawan";


        fragment.appendChild(
            placeholder
        );


        dataKaryawan.forEach(
            item => {

                const status =
                    String(
                        item.status ||
                        "AKTIF"
                    )
                    .trim()
                    .toUpperCase();


                if (
                    status ===
                    "PENALTI"
                ) {

                    return;

                }


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    item.id;

                option.textContent =
                    `${item.id} - ${item.nama}`;


                fragment.appendChild(
                    option
                );

            }
        );


        select.replaceChildren(
            fragment
        );

    }

}


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeKaryawan
);


function initializeKaryawan() {

    if (
        KaryawanState.initialized
    ) {

        return;

    }


    KaryawanState.initialized =
        true;


    injectCRUDLoadingStyle();

    initKaryawanForm();

    initLaporanKaryawan();

    initKaryawanSearch();

    initPenaltyForm();

    initModalEvents();

    updateSummaryKaryawan();

}


/* =====================================================
   FORM KARYAWAN
===================================================== */

function initKaryawanForm() {

    const form =
        document.getElementById(
            "formKaryawan"
        );


    if (
        !form ||
        form.dataset.listener
    ) {

        return;

    }


    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            tambahKaryawan();

        }
    );


    form.dataset.listener =
        "true";

}


/* =====================================================
   SEARCH KARYAWAN
===================================================== */

function initKaryawanSearch() {

    const search =
        document.getElementById(
            "searchKaryawan"
        );


    if (
        !search ||
        search.dataset.listener
    ) {

        return;

    }


    search.addEventListener(
        "input",
        renderKaryawan
    );


    search.dataset.listener =
        "true";

}


/* =====================================================
   FORM PENALTI
===================================================== */

function initPenaltyForm() {

    const form =
        document.getElementById(
            "formPenalty"
        );


    if (
        !form ||
        form.dataset.listener
    ) {

        return;

    }


    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            aktifkanPenalti();

        }
    );


    form.dataset.listener =
        "true";

}


/* =====================================================
   MODAL EVENTS
===================================================== */

function initModalEvents() {

    const penaltyModal =
        document.getElementById(
            "penaltyModal"
        );


    if (
        penaltyModal &&
        !penaltyModal.dataset.listener
    ) {

        penaltyModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    penaltyModal
                ) {

                    closePenaltyModal();

                }

            }
        );


        penaltyModal.dataset.listener =
            "true";

    }


    const historyModal =
        document.getElementById(
            "historyKaryawanModal"
        );


    if (
        historyModal &&
        !historyModal.dataset.listener
    ) {

        historyModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    historyModal
                ) {

                    tutupRiwayatLembur();

                }

            }
        );


        historyModal.dataset.listener =
            "true";

    }

}


/* =====================================================
   DATABASE READY
===================================================== */

document.addEventListener(
    "databaseReady",
    () => {

        if (
            !Array.isArray(
                window.karyawan
            )
        ) {

            window.karyawan =
                [];

        }


        if (
            !Array.isArray(
                window.planning
            )
        ) {

            window.planning =
                [];

        }


        normalizeAllKaryawan();

        renderKaryawan();

        updateKaryawanDropdown();

        initLaporanKaryawan();

        updateSummaryKaryawan();


        if (
            typeof renderPlanningKaryawan ===
            "function"
        ) {

            renderPlanningKaryawan();

        }


        if (
            typeof updateDashboard ===
            "function"
        ) {

            updateDashboard();

        }

    }
);


/* =====================================================
   EXPORT GLOBAL
===================================================== */

function getLaporanDurasiMenit(item) {

    if (item.durasiMenit !== undefined && item.durasiMenit !== null) {
        return Number(item.durasiMenit) || 0;
    }

    const durasi = String(item.durasi || "").toLowerCase();
    const angka = Number.parseFloat(durasi.replace(",", "."));

    return Number.isFinite(angka) ? angka * 60 : 0;
}


function renderLaporanKaryawan() {

    const select = document.getElementById("laporanKaryawan");
    const table = document.getElementById("laporanKaryawanTable");

    if (!select || !table) {
        return;
    }

    const selectedId = select.value;

    select.innerHTML = `<option value="">Pilih karyawan</option>`;

    getDataKaryawan()
        .slice()
        .sort((a, b) => String(a.nama || "").localeCompare(String(b.nama || ""), "id"))
        .forEach(function (item) {
            const option = document.createElement("option");
            option.value = normalizeId(item.id);
            option.textContent = `${item.nama || "-"} (${item.id || "-"})`;
            option.selected = option.value === selectedId;
            select.appendChild(option);
        });

    const id = select.value;
    const awal = document.getElementById("laporanTanggalAwal")?.value || "";
    const akhir = document.getElementById("laporanTanggalAkhir")?.value || "";
    const namaElement = document.getElementById("laporanNama");
    const totalElement = document.getElementById("laporanTotalPlanning");
    const jamElement = document.getElementById("laporanTotalJam");
    const periodeElement = document.getElementById("laporanPeriodeText");

    if (!id) {
        if (namaElement) namaElement.textContent = "-";
        if (totalElement) totalElement.textContent = "0";
        if (jamElement) jamElement.textContent = "0 Jam";
        if (periodeElement) periodeElement.textContent = "Pilih karyawan untuk melihat riwayat.";
        table.innerHTML = `<tr><td colspan="7" class="empty-state-cell">Pilih karyawan untuk melihat riwayat.</td></tr>`;
        return;
    }

    const karyawan = getDataKaryawan().find(item => normalizeId(item.id) === id);
    const riwayat = getDataPlanning().filter(function (item) {
        const cocokKaryawan = Array.isArray(item.karyawan) && item.karyawan.some(k => normalizeId(k.id) === id);
        const cocokAwal = !awal || String(item.tanggal || "") >= awal;
        const cocokAkhir = !akhir || String(item.tanggal || "") <= akhir;
        return cocokKaryawan && cocokAwal && cocokAkhir;
    }).sort((a, b) => new Date(a.tanggal || 0) - new Date(b.tanggal || 0));

    const totalMenit = riwayat.reduce((total, item) => total + getLaporanDurasiMenit(item), 0);

    if (namaElement) namaElement.textContent = karyawan?.nama || "-";
    if (totalElement) totalElement.textContent = String(riwayat.length);
    if (jamElement) jamElement.textContent = `${(totalMenit / 60).toFixed(1).replace(".0", "")} Jam`;
    if (periodeElement) periodeElement.textContent = `${riwayat.length} riwayat lembur ditemukan.`;

    if (!riwayat.length) {
        table.innerHTML = `<tr><td colspan="7" class="empty-state-cell">Belum ada riwayat pada periode ini.</td></tr>`;
        return;
    }

    table.innerHTML = riwayat.map(function (item, index) {
        const jenis = item.jenisLembur === "tanggal_merah" ? "Tanggal Merah" : "Harian";
        const idPlanning = item.idPlanning || item.kodePlanning || item.id || "-";
        const durasi = item.durasi || `${getLaporanDurasiMenit(item) / 60} Jam`;

        return `<tr>
            <td>${index + 1}</td>
            <td>${escapeHTML(formatTanggalRiwayat(item.tanggal))}</td>
            <td>${escapeHTML(idPlanning)}</td>
            <td>${escapeHTML(item.jamMulai || "-")} - ${escapeHTML(item.jamSelesai || "-")}</td>
            <td>${escapeHTML(durasi)}</td>
            <td>${jenis}</td>
            <td>${escapeHTML(item.keterangan || "-")}</td>
        </tr>`;
    }).join("");
}


function initLaporanKaryawan() {

    const select = document.getElementById("laporanKaryawan");

    if (!select || select.dataset.listener) {
        return;
    }

    ["laporanKaryawan", "laporanTanggalAwal", "laporanTanggalAkhir"].forEach(function (id) {
        document.getElementById(id)?.addEventListener("change", renderLaporanKaryawan);
    });

    document.getElementById("resetLaporanKaryawan")?.addEventListener("click", function () {
        select.value = "";
        document.getElementById("laporanTanggalAwal").value = "";
        document.getElementById("laporanTanggalAkhir").value = "";
        renderLaporanKaryawan();
    });

    document.getElementById("printLaporanKaryawan")?.addEventListener("click", function () {
        if (!select.value) {
            showCRUDToast("warning", "Pilih karyawan", "Pilih karyawan sebelum mencetak laporan.");
            return;
        }
        window.print();
    });

    select.dataset.listener = "true";
    renderLaporanKaryawan();
}

window.getDataKaryawan =
    getDataKaryawan;

window.getDataPlanning =
    getDataPlanning;

window.tambahKaryawan =
    tambahKaryawan;

window.editKaryawan =
    editKaryawan;

window.renderKaryawan =
    renderKaryawan;

window.hapusKaryawan =
    hapusKaryawan;

window.bukaModalPenalti =
    bukaModalPenalti;

window.closePenaltyModal =
    closePenaltyModal;

window.aktifkanPenalti =
    aktifkanPenalti;

window.lepasPenalti =
    lepasPenalti;

window.updateKaryawanDropdown =
    updateKaryawanDropdown;

window.lihatRiwayatLembur =
    lihatRiwayatLembur;

window.lihatRiwayatLemburByNama =
    lihatRiwayatLemburByNama;

window.bukaRiwayatDashboard =
    bukaRiwayatDashboard;

window.tutupRiwayatLembur =
    tutupRiwayatLembur;

window.escapeHTML =
    escapeHTML;

window.showCRUDToast =
    showCRUDToast;

window.updateSummaryKaryawan =
    updateSummaryKaryawan;


/* =====================================================
   LOAD MESSAGE
===================================================== */

console.log(
    "karyawan.js berhasil dimuat — optimized CRUD + summary karyawan."
);