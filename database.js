/* =====================================================
   DATABASE SUPABASE
   LINFOX - DATABASE.JS
   VERSI OPTIMASI
   LOGIKA TETAP SAMA
===================================================== */


/* =====================================================
   KONFIGURASI SUPABASE
===================================================== */

const runtimeEnv =
    window.PlanburEnv ||
    window.__PLANBUR_ENV__ ||
    {};

const SUPABASE_URL =
    String(
        runtimeEnv.SUPABASE_URL || ""
    ).replace(/\/$/, "");

const SUPABASE_ANON_KEY =
    String(
        runtimeEnv.SUPABASE_ANON_KEY || ""
    ).trim();


/* =====================================================
   INITIALIZE SUPABASE
===================================================== */

let supabaseClient = null;

try {

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {

        console.error(
            "[DB] Konfigurasi Supabase belum tersedia. Isi window.__PLANBUR_ENV__ sebelum memuat database.js."
        );

    } else if (
        typeof window.supabase !== "undefined" &&
        typeof window.supabase.createClient === "function"
    ) {

        supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );

        console.log(
            "Supabase client berhasil dibuat."
        );

    } else {

        console.error(
            "Library Supabase belum termuat."
        );

    }

}
catch (error) {

    console.error(
        "Gagal membuat Supabase client:",
        error
    );

}


/* =====================================================
   DATA GLOBAL
===================================================== */

let karyawan = [];
let planning = [];

window.karyawan = karyawan;
window.planning = planning;


/* =====================================================
   SNAPSHOT DATABASE
===================================================== */

let databaseKaryawanSnapshot = [];
let databasePlanningSnapshot = [];


/* =====================================================
   STATUS DATABASE
===================================================== */

let databaseReady = false;
let databaseReadyPromise = null;


/* =====================================================
   HELPER DASAR
===================================================== */

function normalizeId(value) {

    return String(value ?? "")
        .trim()
        .toUpperCase();

}


function normalizeText(value) {

    return String(value ?? "")
        .trim();

}


function normalizeStatus(value) {

    return String(value ?? "AKTIF")
        .trim()
        .toUpperCase();

}


function cloneData(data) {

    try {

        return JSON.parse(
            JSON.stringify(data)
        );

    }
    catch (error) {

        console.error(
            "Gagal clone data:",
            error
        );

        return [];

    }

}


function isArray(value) {

    return Array.isArray(value);

}


/* =====================================================
   FORMAT DURASI
===================================================== */

function formatDurasiDatabase(menit) {

    const value =
        Number(menit || 0);

    if (value <= 0) {

        return "0 Jam";

    }

    const jam =
        value / 60;

    return (
        Number.isInteger(jam)
            ? jam
            : jam.toFixed(1)
    ) + " Jam";

}


/* =====================================================
   NORMALISASI KARYAWAN
===================================================== */

function normalisasiKaryawanData(data) {

    if (!isArray(data)) {

        return [];

    }

    return data
        .map(item => {

            if (!item) {

                return null;

            }

            const id =
                normalizeId(
                    item.kode_karyawan ??
                    item.id
                );

            const nama =
                normalizeText(
                    item.nama
                );

            const status =
                normalizeStatus(
                    item.status
                );

            const alasanPenalti =
                normalizeText(
                    item.alasan_penalti ??
                    item.alasanPenalti
                );

            const tanggalLahir =
                normalizeText(
                    item.tanggal_lahir ??
                    item.tanggalLahir
                );

            const tanggalPenalti =
                normalizeText(
                    item.tanggalPenalti
                );

            const isDeleted = Boolean(
                item.is_deleted ??
                item.isDeleted ??
                false
            );

            return {

                id,

                nama,

                status,

                alasanPenalti,

                tanggalLahir,

                tanggalPenalti,

                isDeleted

            };

        })
        .filter(item =>
            item &&
            item.id &&
            item.nama
        );

}


/* =====================================================
   BENTUK OBJECT KARYAWAN DATABASE
===================================================== */

function normalisasiKaryawanDatabase(data) {

    if (!isArray(data)) {

        return [];

    }

    return data
        .map(item => {

            const normalized =
                normalisasiKaryawanData([item])[0];

            if (!normalized) {

                return null;

            }

            normalized.databaseId =
                item.id;

            normalized.idDatabase =
                item.id;

            normalized.tanggalLahir =
                normalizeText(
                    item.tanggal_lahir ??
                    item.tanggalLahir
                );

            normalized.isDeleted = Boolean(
                item.is_deleted ??
                item.isDeleted ??
                false
            );

            return normalized;

        })
        .filter(Boolean);

}


/* =====================================================
   CEK SUPABASE
===================================================== */

function cekSupabase() {

    if (!supabaseClient) {

        console.error(
            "supabaseClient belum tersedia."
        );

        return false;

    }

    return true;

}


/* =====================================================
   LOAD KARYAWAN
===================================================== */

async function loadKaryawanSupabase() {

    if (!cekSupabase()) {

        return [];

    }

    const {
        data,
        error
    } =
        await supabaseClient
            .from("karyawan")
            .select("*")
            .order(
                "id",
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(
            "ERROR LOAD KARYAWAN:",
            error
        );

        throw error;

    }

    return normalisasiKaryawanData(data);

}


/* =====================================================
   LOAD PLANNING
===================================================== */

async function loadPlanningSupabase() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("planning_lembur")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(
            "ERROR LOAD PLANNING:",
            error
        );

        throw error;

    }

    return isArray(data)
        ? data
        : [];

}


/* =====================================================
   LOAD RELASI PLANNING
===================================================== */

async function loadRelasiPlanningSupabase() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("planning_karyawan")
            .select(
                "planning_id, karyawan_id"
            );

    if (error) {

        console.error(
            "ERROR LOAD RELASI PLANNING:",
            error
        );

        throw error;

    }

    return isArray(data)
        ? data
        : [];

}


/* =====================================================
   BENTUK DATA PLANNING
===================================================== */

function bentukDataPlanning(
    dataPlanning,
    dataRelasi,
    dataKaryawan
) {

    if (!isArray(dataPlanning)) {

        return [];

    }

    const daftarKaryawanDB =
        isArray(dataKaryawan)
            ? dataKaryawan
            : [];


    /* =================================================
       MAP KARYAWAN
    ================================================= */

    const karyawanMap =
        new Map();

    for (
        const k of daftarKaryawanDB
    ) {

        const databaseId =
            String(
                k.databaseId ??
                k.idDatabase ??
                k._databaseId ??
                ""
            );

        if (databaseId) {

            karyawanMap.set(
                databaseId,
                k
            );

        }

    }


    /* =================================================
       MAP RELASI
    ================================================= */

    const relasiMap =
        new Map();

    if (isArray(dataRelasi)) {

        for (
            const relation of dataRelasi
        ) {

            const planningId =
                String(
                    relation.planning_id
                );

            let list =
                relasiMap.get(
                    planningId
                );

            if (!list) {

                list = [];

                relasiMap.set(
                    planningId,
                    list
                );

            }

            list.push(
                relation
            );

        }

    }


    /* =================================================
       BENTUK PLANNING
    ================================================= */

    return dataPlanning
        .map(item => {

            if (!item) {

                return null;

            }

            const relasi =
                relasiMap.get(
                    String(item.id)
                ) || [];


            const daftarKaryawan =
                relasi
                    .map(relation => {

                        const karyawanId =
                            String(
                                relation.karyawan_id
                            );

                        const data =
                            karyawanMap.get(
                                karyawanId
                            );

                        if (!data) {

                            return null;

                        }

                        return {

                            id:
                                normalizeId(
                                    data.id
                                ),

                            nama:
                                normalizeText(
                                    data.nama
                                ),

                            tanggalLahir:
                                normalizeText(
                                    data.tanggalLahir
                                )

                        };

                    })
                    .filter(Boolean);


            /* =========================================
               DURASI
            ========================================= */

            let durasiMenit =
                Number(
                    item.durasi_menit ??
                    item.durasiMenit ??
                    0
                );

            if (
                !durasiMenit &&
                item.jam_mulai &&
                item.jam_selesai &&
                typeof hitungDurasiPlanning ===
                "function"
            ) {

                durasiMenit =
                    Number(
                        hitungDurasiPlanning(
                            item.jam_mulai,
                            item.jam_selesai
                        )
                    ) || 0;

            }


            /* =========================================
               ID PLANNING
            ========================================= */

            const idPlanning =
                item.kode_planning ??
                String(item.id);


            /* =========================================
               RETURN
            ========================================= */

            return {

                id:
                    idPlanning,

                idPlanning:
                    idPlanning,

                databaseId:
                    item.id,

                tanggal:
                    item.tanggal ?? "",

                jamMulai:
                    item.jam_mulai ??
                    item.jamMulai ??
                    "",

                jamSelesai:
                    item.jam_selesai ??
                    item.jamSelesai ??
                    "",

                durasiMenit,

                durasi:
                    item.durasi ??
                    formatDurasiDatabase(
                        durasiMenit
                    ),

                keterangan:
                    item.keterangan ??
                    "",

                buktiUrl:
                    item.bukti_url ??
                    item.buktiUrl ??
                    "",

                buktiNama:
                    item.bukti_nama ??
                    item.buktiNama ??
                    "",

                previewUrl:
                    item.preview_url ??
                    item.previewUrl ??
                    "",

                jenisLembur:
                    item.jenis_lembur ??
                    item.jenisLembur ??
                    "harian",

                status:
                    item.status ??
                    "Planning",

                karyawan:
                    daftarKaryawan,

                jumlahKaryawan:
                    daftarKaryawan.length,

                createdAt:
                    item.created_at ??
                    item.createdAt ??
                    new Date().toISOString()

            };

        })
        .filter(Boolean);

}


/* =====================================================
   LOAD SEMUA DATABASE
   INITIAL LOAD / REFRESH MANUAL
===================================================== */

async function loadDatabase() {

    if (!cekSupabase()) {

        return false;

    }

    try {

        console.log(
            "Mengambil data dari Supabase..."
        );


        /* =============================================
           LOAD KARYAWAN
        ============================================= */

        const {
            data: rawKaryawan,
            error: rawKaryawanError
        } =
            await supabaseClient
                .from("karyawan")
                .select("*")
                .order(
                    "id",
                    {
                        ascending: true
                    }
                );


        if (rawKaryawanError) {

            throw rawKaryawanError;

        }


        const allNormalizedKaryawan =
            normalisasiKaryawanDatabase(
                rawKaryawan
            );

        karyawan =
            allNormalizedKaryawan.filter(
                k => !k.isDeleted && k.status !== "DELETED"
            );

        window.karyawan =
            karyawan;


        /* =============================================
           LOAD DATA PENALTI TERAKHIR
        ============================================= */

        const {
            data: rawPenalti,
            error: rawPenaltiError
        } =
            await supabaseClient
                .from("penalti")
                .select(
                    "id, karyawan_id, alasan, tanggal, aktif, created_at"
                )
                .order(
                    "created_at",
                    { ascending: false }
                )
                .order(
                    "id",
                    { ascending: false }
                );


        if (rawPenaltiError) {
            throw rawPenaltiError;
        }


        const penaltiTerakhirMap =
            new Map();


        for (const item of rawPenalti || []) {

            const karyawanDatabaseId =
                String(item.karyawan_id || "");

            if (
                karyawanDatabaseId &&
                !penaltiTerakhirMap.has(
                    karyawanDatabaseId
                )
            ) {
                penaltiTerakhirMap.set(
                    karyawanDatabaseId,
                    item
                );
            }

        }


        for (const item of karyawan) {

            const penaltiTerakhir =
                penaltiTerakhirMap.get(
                    String(item.databaseId || "")
                );

            if (!penaltiTerakhir) {
                item.tanggalPenalti = "";
                continue;
            }

            item.tanggalPenalti =
                normalizeText(
                    penaltiTerakhir.tanggal
                );

            const penaltiAktif =
                penaltiTerakhir.aktif === true;

            item.alasanPenalti =
                penaltiAktif
                    ? normalizeText(
                        penaltiTerakhir.alasan
                    )
                    : "";

            item.status =
                penaltiAktif
                    ? "PENALTI"
                    : "AKTIF";

        }


        databaseKaryawanSnapshot =
            cloneData(
                karyawan
            );


        /* =============================================
           LOAD PLANNING + RELASI
           
           Keduanya independen setelah karyawan
           selesai dimuat.
        ============================================= */

        const [
            dataPlanning,
            dataRelasi
        ] =
            await Promise.all([
                loadPlanningSupabase(),
                loadRelasiPlanningSupabase()
            ]);


        /* =============================================
           BENTUK PLANNING
        ============================================= */

        planning =
            bentukDataPlanning(
                dataPlanning,
                dataRelasi,
                allNormalizedKaryawan
            );

        window.planning =
            planning;


        databasePlanningSnapshot =
            cloneData(
                planning
            );


        /* =============================================
           READY
        ============================================= */

        databaseReady =
            true;


        document.dispatchEvent(
            new CustomEvent(
                "databaseReady"
            )
        );


        refreshUI();


        console.log(
            "Supabase database ready."
        );

        console.log(
            "Karyawan:",
            karyawan.length
        );

        console.log(
            "Planning:",
            planning.length
        );


        return true;

    }
    catch (error) {

        databaseReady =
            false;

        console.error(
            "DATABASE ERROR:",
            error
        );

        console.error(
            "MESSAGE:",
            error?.message
        );

        console.error(
            "DETAIL:",
            error?.details
        );

        console.error(
            "HINT:",
            error?.hint
        );

        return false;

    }

}


/* =====================================================
   REFRESH UI
===================================================== */

function refreshUI() {

    window.karyawan =
        karyawan;

    window.planning =
        planning;


    if (
        typeof renderKaryawan ===
        "function"
    ) {

        renderKaryawan();

    }


    if (
        typeof updateKaryawanDropdown ===
        "function"
    ) {

        updateKaryawanDropdown();

    }


    if (
        typeof renderPlanningKaryawan ===
        "function"
    ) {

        renderPlanningKaryawan();

    }


    if (
        typeof renderPlanning ===
        "function"
    ) {

        renderPlanning();

    }


    if (
        typeof updateDashboard ===
        "function"
    ) {

        updateDashboard();

    }

}


/* =====================================================
   GET DATA
===================================================== */

function getKaryawan() {

    return isArray(karyawan)
        ? karyawan
        : [];

}


function getPlanning() {

    return isArray(planning)
        ? planning
        : [];

}


/* =====================================================
   GET KARYAWAN AKTIF
===================================================== */

function getKaryawanAktifDatabase() {

    return getKaryawan()
        .filter(item =>
            normalizeStatus(
                item.status
            ) === "AKTIF"
        );

}


/* =====================================================
   SIMPAN KARYAWAN
   OPTIMIZED
===================================================== */

async function simpanKaryawanSupabase() {

    if (!cekSupabase()) {

        return false;

    }

    try {

        const current =
            getKaryawan();

        const oldSnapshot =
            isArray(
                databaseKaryawanSnapshot
            )
                ? databaseKaryawanSnapshot
                : [];


        /* =============================================
           MAP DATA LAMA
        ============================================= */

        const oldMap =
            new Map();

        for (
            const item of oldSnapshot
        ) {

            oldMap.set(
                normalizeId(item.id),
                item
            );

        }


        /* =============================================
           MAP DATA SEKARANG
        ============================================= */

        const currentMap =
            new Map();

        for (
            const item of current
        ) {

            currentMap.set(
                normalizeId(item.id),
                item
            );

        }


        /* =============================================
           CARI INSERT / UPDATE
        ============================================= */

        const changedData = [];


        for (
            const item of current
        ) {

            const id =
                normalizeId(
                    item.id
                );

            const nama =
                normalizeText(
                    item.nama
                );

            if (
                !id ||
                !nama
            ) {

                continue;

            }


            const old =
                oldMap.get(id);

            const databaseId =
                item.databaseId ||
                item.idDatabase ||
                old?.databaseId;


            const currentData = {

                kode_karyawan:
                    id,

                nama,

                status:
                    normalizeStatus(
                        item.status
                    ),

                alasan_penalti:
                    normalizeText(
                        item.alasanPenalti ??
                        item.alasan_penalti
                    ),

                tanggal_lahir:
                    normalizeText(
                        item.tanggalLahir ??
                        item.tanggal_lahir
                    ) || null

            };

            if (databaseId) {
                currentData.id = databaseId;
            }


            /* =========================================
               DATA BARU
            ========================================= */

            if (!old) {

                changedData.push(
                    currentData
                );

                continue;

            }


            /* =========================================
               DATA LAMA
            ========================================= */

            const oldNama =
                normalizeText(
                    old.nama
                );

            const oldStatus =
                normalizeStatus(
                    old.status
                );

            const oldAlasan =
                normalizeText(
                    old.alasanPenalti ??
                    old.alasan_penalti
                );

            const oldTanggalLahir =
                normalizeText(
                    old.tanggalLahir ??
                    old.tanggal_lahir
                );


            /* =========================================
               CEK PERUBAHAN
            ========================================= */

            if (
                oldNama !==
                currentData.nama ||

                oldStatus !==
                currentData.status ||

                oldAlasan !==
                currentData.alasan_penalti ||

                oldTanggalLahir !==
                (currentData.tanggal_lahir || "")
            ) {

                changedData.push(
                    currentData
                );

            }

        }


        /* =============================================
           SIMPAN YANG BERUBAH SAJA
        ============================================= */

        if (
            changedData.length > 0
        ) {

            for (
                const itemData of changedData
            ) {

                if (itemData.id) {

                    const updatePayload = {
                        kode_karyawan: itemData.kode_karyawan,
                        nama: itemData.nama,
                        status: itemData.status,
                        alasan_penalti: itemData.alasan_penalti,
                        tanggal_lahir: itemData.tanggal_lahir
                    };

                    let {
                        error
                    } =
                        await supabaseClient
                            .from("karyawan")
                            .update(updatePayload)
                            .eq(
                                "id",
                                itemData.id
                            );

                    // Fallback jika kolom tanggal_lahir belum ada di Supabase
                    if (error && (error.message?.includes("tanggal_lahir") || error.message?.includes("schema cache"))) {
                        console.warn("Mencoba update tanpa kolom tanggal_lahir:", error.message);
                        delete updatePayload.tanggal_lahir;
                        const retry = await supabaseClient
                            .from("karyawan")
                            .update(updatePayload)
                            .eq(
                                "id",
                                itemData.id
                            );
                        error = retry.error;
                    }

                    if (error) {
                        throw error;
                    }

                } else {

                    const insertPayload = {
                        kode_karyawan: itemData.kode_karyawan,
                        nama: itemData.nama,
                        status: itemData.status,
                        alasan_penalti: itemData.alasan_penalti,
                        tanggal_lahir: itemData.tanggal_lahir
                    };

                    let {
                        data: inserted,
                        error
                    } =
                        await supabaseClient
                            .from("karyawan")
                            .upsert(
                                insertPayload,
                                {
                                    onConflict:
                                        "kode_karyawan"
                                }
                            )
                            .select(
                                "id, kode_karyawan"
                            )
                            .single();

                    // Fallback jika kolom tanggal_lahir belum ada di Supabase
                    if (error && (error.message?.includes("tanggal_lahir") || error.message?.includes("schema cache"))) {
                        console.warn("Mencoba insert tanpa kolom tanggal_lahir:", error.message);
                        delete insertPayload.tanggal_lahir;
                        const retry = await supabaseClient
                            .from("karyawan")
                            .upsert(
                                insertPayload,
                                {
                                    onConflict:
                                        "kode_karyawan"
                                }
                            )
                            .select(
                                "id, kode_karyawan"
                            )
                            .single();
                        inserted = retry.data;
                        error = retry.error;
                    }

                    if (error) {
                        throw error;
                    }

                    if (inserted) {
                        const cur = current.find(k => normalizeId(k.id) === normalizeId(itemData.kode_karyawan));
                        if (cur) {
                            cur.databaseId = inserted.id;
                            cur.idDatabase = inserted.id;
                        }
                    }

                }

            }

        }


        /* =============================================
           CARI DATA YANG DIHAPUS
        ============================================= */

        const deleted =
            oldSnapshot.filter(
                oldItem => {

                    const id =
                        normalizeId(
                            oldItem.id
                        );

                    return (
                        id &&
                        !currentMap.has(id)
                    );

                }
            );


        /* =============================================
           HAPUS DATA (SOFT DELETE AGAR PLANNING AMAN)
        ============================================= */

        if (
            deleted.length > 0
        ) {

            for (
                const item of deleted
            ) {

                const id =
                    normalizeId(
                        item.id
                    );

                if (!id) {

                    continue;

                }


                try {
                    const {
                        error
                    } =
                        await supabaseClient
                            .from("karyawan")
                            .update({
                                is_deleted: true,
                                status: "NONAKTIF"
                            })
                            .eq(
                                "kode_karyawan",
                                id
                            );

                    if (error) {
                        // Fallback jika kolom is_deleted belum ada
                        await supabaseClient
                            .from("karyawan")
                            .update({
                                status: "NONAKTIF"
                            })
                            .eq(
                                "kode_karyawan",
                                id
                            );
                    }
                } catch (delError) {
                    console.warn("Gagal soft-delete karyawan:", delError);
                }

            }

        }


        return true;

    }
    catch (error) {

        console.error(
            "Gagal menyimpan karyawan:",
            error
        );

        alert(
            "Karyawan gagal disimpan ke Supabase.\n\n" +
            (
                error?.message ??
                "Unknown error"
            )
        );

        return false;

    }

}


/* =====================================================
   SIMPAN PENALTI
   OPTIMIZED
===================================================== */

async function simpanPenaltiSupabase() {

    if (!cekSupabase()) {

        return false;

    }

    try {

        const current =
            getKaryawan();

        const old =
            isArray(
                databaseKaryawanSnapshot
            )
                ? databaseKaryawanSnapshot
                : [];


        /* =============================================
           MAP SNAPSHOT
        ============================================= */

        const oldMap =
            new Map();

        for (
            const item of old
        ) {

            oldMap.set(
                normalizeId(item.id),
                item
            );

        }


        /* =============================================
           CARI DATA PENALTI BERUBAH
        ============================================= */

        const changed = [];


        for (
            const item of current
        ) {

            const id =
                normalizeId(
                    item.id
                );

            const previous =
                oldMap.get(id);


            if (!previous) {

                continue;

            }


            const currentStatus =
                normalizeStatus(
                    item.status
                );

            const oldStatus =
                normalizeStatus(
                    previous.status
                );

            const currentAlasan =
                normalizeText(
                    item.alasanPenalti ??
                    item.alasan_penalti
                );

            const oldAlasan =
                normalizeText(
                    previous.alasanPenalti ??
                    previous.alasan_penalti
                );

            const currentTanggal =
                normalizeText(
                    item.tanggalPenalti
                );

            const oldTanggal =
                normalizeText(
                    previous.tanggalPenalti
                );


            if (
                oldStatus !==
                currentStatus ||

                oldAlasan !==
                currentAlasan ||

                oldTanggal !==
                currentTanggal
            ) {

                changed.push(
                    item
                );

            }

        }


        /* =============================================
           TIDAK ADA PERUBAHAN
        ============================================= */

        if (
            changed.length === 0
        ) {

            return true;

        }


        /* =============================================
           AMBIL DATABASE ID
           DALAM SATU QUERY
        ============================================= */

        const kodeList =
            changed
                .map(item =>
                    normalizeId(
                        item.id
                    )
                )
                .filter(Boolean);


        if (
            kodeList.length === 0
        ) {

            return true;

        }


        const {
            data,
            error
        } =
            await supabaseClient
                .from("karyawan")
                .select(
                    "id, kode_karyawan"
                )
                .in(
                    "kode_karyawan",
                    kodeList
                );


        if (error) {

            throw error;

        }


        if (!isArray(data)) {

            return true;

        }


        /* =============================================
           MAP DATABASE ID
        ============================================= */

        const databaseMap =
            new Map();

        for (
            const item of data
        ) {

            databaseMap.set(
                normalizeId(
                    item.kode_karyawan
                ),
                item.id
            );

        }


        /* =============================================
           PROSES PENALTI
        ============================================= */

        for (
            const aplikasi of changed
        ) {

            const kode =
                normalizeId(
                    aplikasi.id
                );

            const databaseId =
                databaseMap.get(
                    kode
                );


            if (!databaseId) {

                continue;

            }


            const status =
                normalizeStatus(
                    aplikasi.status
                );

            const alasan =
                normalizeText(
                    aplikasi.alasanPenalti ??
                    aplikasi.alasan_penalti
                );

            const tanggalPenalti =
                normalizeText(
                    aplikasi.tanggalPenalti
                ) ||
                new Date()
                    .toISOString()
                    .split("T")[0];


            /* =========================================
               PENALTI
            ========================================= */

            if (
                status ===
                "PENALTI"
            ) {

                const {
                    data:
                        penaltyAktif,
                    error:
                        penaltyError
                } =
                    await supabaseClient
                        .from("penalti")
                        .select("id")
                        .eq(
                            "karyawan_id",
                            databaseId
                        )
                        .eq(
                            "aktif",
                            true
                        )
                        .order(
                            "created_at",
                            { ascending: false }
                        )
                        .order(
                            "id",
                            { ascending: false }
                        )
                        .limit(1);


                if (penaltyError) {

                    throw penaltyError;

                }


                if (
                    isArray(penaltyAktif) &&
                    penaltyAktif.length > 0
                ) {

                    const {
                        error:
                            updateError
                    } =
                        await supabaseClient
                            .from("penalti")
                            .update({

                                alasan:
                                    alasan ||
                                    "Penalti",

                                tanggal:
                                    tanggalPenalti,

                                aktif:
                                    true

                            })
                            .eq(
                                "id",
                                penaltyAktif[0].id
                            );


                    if (updateError) {

                        throw updateError;

                    }

                }

                else {

                    const {
                        error:
                            insertError
                    } =
                        await supabaseClient
                            .from("penalti")
                            .insert({

                                karyawan_id:
                                    databaseId,

                                alasan:
                                    alasan ||
                                    "Penalti",

                                tanggal:
                                    tanggalPenalti,

                                aktif:
                                    true

                            });


                    if (insertError) {

                        throw insertError;

                    }

                }

            }


            /* =========================================
               LEPAS PENALTI
            ========================================= */

            else {

                const {
                    data:
                        penaltyTerakhir,
                    error:
                        penaltyError
                } =
                    await supabaseClient
                        .from("penalti")
                        .select("id")
                        .eq(
                            "karyawan_id",
                            databaseId
                        )
                        .eq(
                            "aktif",
                            true
                        )
                        .order(
                            "created_at",
                            { ascending: false }
                        )
                        .order(
                            "id",
                            { ascending: false }
                        )
                        .limit(1);


                if (penaltyError) {

                    throw penaltyError;

                }


                if (
                    isArray(penaltyTerakhir) &&
                    penaltyTerakhir.length > 0
                ) {

                    const {
                        error:
                            updateError
                    } =
                        await supabaseClient
                            .from("penalti")
                            .update({
                                aktif: false
                            })
                            .eq(
                                "id",
                                penaltyTerakhir[0].id
                            );


                    if (updateError) {
                        throw updateError;
                    }

                }

            }

        }


        return true;

    }
    catch (error) {

        console.error(
            "Gagal menyimpan penalti:",
            error
        );

        alert(
            "Data penalti gagal disimpan ke Supabase.\n\n" +
            (
                error?.message ??
                "Unknown error"
            )
        );

        return false;

    }

}


/* =====================================================
   SIMPAN PLANNING
   LOGIKA TETAP SAMA
===================================================== */

async function simpanPlanningSupabase() {

    if (!cekSupabase()) {

        return false;

    }

    try {

        const currentPlanning =
            getPlanning();


        /* =============================================
           SET ID PLANNING SEKARANG
           Lebih cepat daripada includes()
        ============================================= */

        const currentPlanningIds =
            new Set(
                currentPlanning
                    .map(item =>
                        String(
                            item.idPlanning ??
                            item.id ??
                            ""
                        ).trim()
                    )
                    .filter(Boolean)
            );


        /* =============================================
           PROSES PLANNING
        ============================================= */

        for (
            const item of currentPlanning
        ) {

            const kodePlanning =
                String(
                    item.idPlanning ??
                    item.id ??
                    ""
                ).trim();


            if (!kodePlanning) {

                continue;

            }


            /* =========================================
               UPSERT PLANNING
            ========================================= */

            const {
                data:
                    planningData,
                error:
                    planningError
            } =
                await supabaseClient
                    .from(
                        "planning_lembur"
                    )
                    .upsert(
                        {

                            kode_planning:
                                kodePlanning,

                            tanggal:
                                item.tanggal ??
                                "",

                            jam_mulai:
                                item.jamMulai ??
                                "",

                            jam_selesai:
                                item.jamSelesai ??
                                "",

                            durasi_menit:
                                Number(
                                    item.durasiMenit ??
                                    0
                                ),

                            durasi:
                                item.durasi ??
                                formatDurasiDatabase(
                                    item.durasiMenit
                                ),

                            keterangan:
                                item.keterangan ??
                                "",

                            jenis_lembur:
                                item.jenisLembur ??
                                "harian",

                            status:
                                item.status ??
                                "Planning",

                            preview_url:
                                item.previewUrl ??
                                item.preview_url ??
                                null

                        },
                        {
                            onConflict:
                                "kode_planning"
                        }
                    )
                    .select(
                        "id, kode_planning"
                    )
                    .single();


            if (planningError) {

                throw planningError;

            }


            const planningId =
                planningData.id;


            /* =========================================
               HAPUS RELASI LAMA
            ========================================= */

            const {
                error:
                    deleteRelationError
            } =
                await supabaseClient
                    .from(
                        "planning_karyawan"
                    )
                    .delete()
                    .eq(
                        "planning_id",
                        planningId
                    );


            if (deleteRelationError) {

                throw deleteRelationError;

            }


            /* =========================================
               DAFTAR KARYAWAN
            ========================================= */

            const daftar =
                isArray(item.karyawan)
                    ? item.karyawan
                    : [];


            const kodeKaryawanList =
                daftar
                    .map(
                        dataKaryawan =>
                            normalizeId(
                                dataKaryawan.id
                            )
                    )
                    .filter(Boolean);


            if (
                kodeKaryawanList.length === 0
            ) {

                continue;

            }


            /* =========================================
               AMBIL ID KARYAWAN
               SATU QUERY
            ========================================= */

            const {
                data:
                    karyawanDB,
                error:
                    karyawanError
            } =
                await supabaseClient
                    .from("karyawan")
                    .select(
                        "id, kode_karyawan"
                    )
                    .in(
                        "kode_karyawan",
                        kodeKaryawanList
                    );


            if (karyawanError) {

                throw karyawanError;

            }


            /* =========================================
               MAP KARYAWAN
            ========================================= */

            const databaseKaryawanMap =
                new Map();


            if (isArray(karyawanDB)) {

                for (
                    const itemDB of karyawanDB
                ) {

                    databaseKaryawanMap.set(
                        normalizeId(
                            itemDB.kode_karyawan
                        ),
                        itemDB.id
                    );

                }

            }


            /* =========================================
               BUAT RELASI
            ========================================= */

            const relationInsert =
                kodeKaryawanList
                
                    .map(kode => {

                        const databaseId =
                            databaseKaryawanMap.get(
                                kode
                            );


                        if (!databaseId) {

                            console.warn(
                                "Karyawan tidak ditemukan:",
                                kode
                            );

                            return null;

                        }


                        return {

                            planning_id:
                                planningId,

                            karyawan_id:
                                databaseId

                        };

                    })
                    .filter(Boolean);


            /* =========================================
               INSERT RELASI SEKALIGUS
            ========================================= */

            if (
                relationInsert.length > 0
            ) {

                const {
                    error:
                        relationError
                } =
                    await supabaseClient
                        .from(
                            "planning_karyawan"
                        )
                        .insert(
                            relationInsert
                        );


                if (relationError) {

                    throw relationError;

                }

            }

        }


        /* =============================================
           HAPUS PLANNING YANG SUDAH DIHAPUS LOKAL
        ============================================= */

        const deletedPlanning =
            databasePlanningSnapshot
                .filter(oldItem => {

                    const oldId =
                        String(
                            oldItem.idPlanning ??
                            oldItem.id ??
                            ""
                        ).trim();


                    return (
                        oldId &&
                        !currentPlanningIds.has(
                            oldId
                        )
                    );

                });


        /* =============================================
           HAPUS DATABASE
        ============================================= */

        for (
            const item of deletedPlanning
        ) {

            const kode =
                String(
                    item.idPlanning ??
                    item.id ??
                    ""
                ).trim();


            if (!kode) {

                continue;

            }


            const {
                error
            } =
                await supabaseClient
                    .from(
                        "planning_lembur"
                    )
                    .delete()
                    .eq(
                        "kode_planning",
                        kode
                    );


            if (error) {

                console.error(
                    "Gagal menghapus planning:",
                    error
                );

            }

        }


        /* =============================================
           UPDATE SNAPSHOT
        ============================================= */

        databasePlanningSnapshot =
            cloneData(
                currentPlanning
            );


        return true;

    }
    catch (error) {

        console.error(
            "Gagal menyimpan planning:",
            error
        );

        alert(
            "Planning gagal disimpan ke Supabase.\n\n" +
            (
                error?.message ??
                "Unknown error"
            )
        );

        return false;

    }

}


/* =====================================================
   SIMPAN SEMUA DATA
   OPTIMIZED
===================================================== */

async function simpanData() {

    if (!databaseReady) {

        alert(
            "Database belum siap. Tunggu sebentar lalu coba lagi."
        );

        return false;

    }


    console.log(
        "Menyimpan perubahan..."
    );


    /* =============================================
       SIMPAN KARYAWAN
    ============================================= */

    const karyawanBerhasil =
        await simpanKaryawanSupabase();


    if (!karyawanBerhasil) {

        return false;

    }


    /* =============================================
       SIMPAN PENALTI
    ============================================= */

    const penaltiBerhasil =
        await simpanPenaltiSupabase();


    if (!penaltiBerhasil) {

        return false;

    }


    /* =============================================
       SIMPAN PLANNING
    ============================================= */

    const planningBerhasil =
        await simpanPlanningSupabase();


    if (!planningBerhasil) {

        return false;

    }


    /* =============================================
       UPDATE SNAPSHOT
    ============================================= */

    databaseKaryawanSnapshot =
        cloneData(
            getKaryawan()
        );

    databasePlanningSnapshot =
        cloneData(
            getPlanning()
        );


    console.log(
        "Perubahan berhasil disimpan."
    );


    return true;

}


/* =====================================================
   ALIAS
===================================================== */

async function saveDatabase() {

    return await simpanData();

}


async function simpanDatabase() {

    return await simpanData();

}


/* =====================================================
   NORMALISASI DATABASE
===================================================== */

function normalisasiDatabase() {

    karyawan =
        normalisasiKaryawanData(
            karyawan
        );

    window.karyawan =
        karyawan;

    window.planning =
        planning;

}


/* =====================================================
   REFRESH DATABASE
===================================================== */

async function refreshDatabase() {

    return await loadDatabase();

}


/* =====================================================
   CEK DATABASE READY
===================================================== */

function isDatabaseReady() {

    return databaseReady;

}


/* =====================================================
   TUNGGU DATABASE READY
===================================================== */

async function tungguDatabaseReady() {

    if (databaseReady) {

        return true;

    }


    if (databaseReadyPromise) {

        return await databaseReadyPromise;

    }


    return false;

}


/* =====================================================
   EXPORT GLOBAL
===================================================== */

window.getKaryawan =
    getKaryawan;

window.getPlanning =
    getPlanning;

window.getKaryawanAktifDatabase =
    getKaryawanAktifDatabase;

window.loadDatabase =
    loadDatabase;

window.refreshDatabase =
    refreshDatabase;

window.simpanData =
    simpanData;

window.saveDatabase =
    saveDatabase;

window.simpanDatabase =
    simpanDatabase;

window.isDatabaseReady =
    isDatabaseReady;

window.tungguDatabaseReady =
    tungguDatabaseReady;


/* =====================================================
   INITIAL DATABASE
===================================================== */

databaseReadyPromise =
    loadDatabase();

window.databaseReadyPromise =
    databaseReadyPromise;


/* =====================================================
   EVENT DATABASE READY
===================================================== */

document.addEventListener(
    "databaseReady",
    function () {

        console.log(
            "Database siap digunakan."
        );

    }
);
