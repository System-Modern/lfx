window.__PLANBUR_ENV__ = {
    SUPABASE_URL: "https://msthucqijrjmmntsdscm.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_-mgfP8xp-YlJDNmHtmonZw_nN0CR8gz"
};

(function (global) {
    const source = global.__PLANBUR_ENV__ || global.PlanburEnv || {};
    const placeholderUrl = "__SUPABASE_URL__";
    const placeholderAnonKey = "__SUPABASE_ANON_KEY__";

    let url = String(
        source.SUPABASE_URL ||
        source.API_BASE_URL ||
        ""
    ).trim().replace(/\/$/, "");

    let anonKey = String(
        source.SUPABASE_ANON_KEY ||
        ""
    ).trim();

    // Jika masih berupa placeholder, kosongkan agar tidak memicu error URL invalid
    if (url === placeholderUrl || url.includes("__SUPABASE_URL__")) {
        url = "";
    }
    if (anonKey === placeholderAnonKey || anonKey.includes("__SUPABASE_ANON_KEY__")) {
        anonKey = "";
    }

    const env = {
        SUPABASE_URL: url,
        SUPABASE_ANON_KEY: anonKey
    };

    global.__PLANBUR_ENV__ = env;
    global.PlanburEnv = Object.freeze(env);

    /* =========================================================
       PLANBUR API SERVICE CLASS
       Sentralisasi seluruh komunikasi database Supabase
    ========================================================= */
    class PlanburAPI {
        static _client = null;

        /**
         * Mendapatkan instance Supabase Client (Singleton)
         */
        static get client() {
            if (!this._client) {
                const envConfig = global.__PLANBUR_ENV__ || {};
                const u = envConfig.SUPABASE_URL;
                const k = envConfig.SUPABASE_ANON_KEY;

                if (global.supabaseClient) {
                    this._client = global.supabaseClient;
                } else if (u && k && typeof global.supabase !== "undefined" && typeof global.supabase.createClient === "function") {
                    this._client = global.supabase.createClient(u, k);
                    global.supabaseClient = this._client;
                }
            }
            return this._client;
        }

        /**
         * Mengatur Supabase Client secara manual
         */
        static setClient(clientInstance) {
            this._client = clientInstance;
            global.supabaseClient = clientInstance;
        }

        /**
         * Menghapus karyawan langsung dari database Supabase (HARD DELETE & Fallback Soft Delete)
         * @param {string|string[]} kodeList - ID atau array ID karyawan (kode_karyawan)
         * @returns {Promise<boolean>}
         */
        static async deleteKaryawan(kodeList) {
            const rawList = Array.isArray(kodeList) ? kodeList : [kodeList];
            const ids = rawList.map(item => String(item || "").trim()).filter(Boolean);

            if (ids.length === 0) {
                return true;
            }

            const sb = this.client;
            if (!sb) {
                console.error("[PlanburAPI] Supabase client belum siap saat menghapus karyawan.");
                throw new Error("Koneksi Supabase belum siap.");
            }

            console.log(`[PlanburAPI] Menghapus ${ids.length} karyawan langsung dari Supabase:`, ids);

            // 1. Coba Hard Delete langsung di database Supabase
            let { error: delError } = await sb
                .from("karyawan")
                .delete()
                .in("kode_karyawan", ids);

            if (delError) {
                console.warn("[PlanburAPI] Hard delete gagal, mencoba soft delete is_deleted=true:", delError);
                // 2. Fallback jika ada foreign key constraint: tandai is_deleted: true
                // PENTING: JANGAN menyertakan status: 'NONAKTIF' karena tabel punya constraint (status IN ('AKTIF', 'PENALTI'))
                const { error: softError } = await sb
                    .from("karyawan")
                    .update({ is_deleted: true })
                    .in("kode_karyawan", ids);

                if (softError) {
                    console.error("[PlanburAPI] Soft delete juga gagal:", softError);
                    throw new Error("Gagal menghapus data dari database Supabase: " + (softError.message || delError.message));
                }
            }

            // 3. Sinkronisasi memori lokal agar tampilan langsung bersih
            const idSet = new Set(ids);
            if (Array.isArray(global.karyawan)) {
                global.karyawan = global.karyawan.filter(k => {
                    const kid = String(k.id || k.kode_karyawan || "").trim();
                    return !idSet.has(kid);
                });
            }
            if (Array.isArray(global.databaseKaryawanSnapshot)) {
                global.databaseKaryawanSnapshot = global.databaseKaryawanSnapshot.filter(k => {
                    const kid = String(k.id || k.kode_karyawan || "").trim();
                    return !idSet.has(kid);
                });
            }

            console.log(`[PlanburAPI] Sukses menghapus ${ids.length} karyawan dari Supabase.`);
            return true;
        }

        /**
         * Mengambil seluruh data karyawan aktif dari Supabase
         */
        static async fetchKaryawan() {
            const sb = this.client;
            if (!sb) return [];

            const { data, error } = await sb
                .from("karyawan")
                .select("*")
                .order("id", { ascending: true });

            if (error) {
                console.error("[PlanburAPI] Gagal mengambil karyawan:", error);
                throw error;
            }

            return (data || []).filter(k => !k.is_deleted && k.status !== "DELETED");
        }

        /**
         * Menyimpan / Menambah Karyawan Baru ke Supabase
         */
        static async saveKaryawan(karyawanData) {
            const sb = this.client;
            if (!sb) throw new Error("Supabase client belum siap");

            const payload = {
                kode_karyawan: String(karyawanData.id || karyawanData.kode_karyawan).trim(),
                nama: String(karyawanData.nama || "").trim(),
                status: karyawanData.status || "AKTIF",
                tanggal_lahir: karyawanData.tanggalLahir || karyawanData.tanggal_lahir || null,
                alasan_penalti: karyawanData.alasanPenalti || karyawanData.alasan_penalti || ""
            };

            let { data, error } = await sb
                .from("karyawan")
                .upsert(payload, { onConflict: "kode_karyawan" })
                .select()
                .single();

            if (error && error.message?.includes("tanggal_lahir")) {
                delete payload.tanggal_lahir;
                const retry = await sb
                    .from("karyawan")
                    .upsert(payload, { onConflict: "kode_karyawan" })
                    .select()
                    .single();
                data = retry.data;
                error = retry.error;
            }

            if (error) throw error;
            return data;
        }

        /**
         * Menghapus planning lembur dari Supabase
         */
        static async deletePlanning(kodePlanningList) {
            const kodes = Array.isArray(kodePlanningList) ? kodePlanningList : [kodePlanningList];
            const sb = this.client;
            if (!sb || kodes.length === 0) return true;

            const { error } = await sb
                .from("planning_lembur")
                .delete()
                .in("kode_planning", kodes);

            if (error) throw error;
            return true;
        }

        /**
         * Mengambil data planning lembur dari Supabase
         */
        static async fetchPlanning(filter = {}) {
            const sb = this.client;
            if (!sb) return [];

            let query = sb.from("planning_lembur").select("*").order("tanggal", { ascending: false });

            if (filter.tanggalDari) {
                query = query.gte("tanggal", filter.tanggalDari);
            }
            if (filter.tanggalSampai) {
                query = query.lte("tanggal", filter.tanggalSampai);
            }

            const { data, error } = await query;
            if (error) {
                console.error("[PlanburAPI] Gagal mengambil planning:", error);
                throw error;
            }
            return data || [];
        }

        /**
         * Memberikan sanksi / penalti kepada karyawan
         */
        static async setPenalti(kodeKaryawan, alasan = "", tanggal = null) {
            const sb = this.client;
            if (!sb) throw new Error("Supabase client belum siap");

            const today = tanggal || new Date().toISOString().split("T")[0];

            // 1. Update status karyawan menjadi PENALTI
            const { error: empError } = await sb
                .from("karyawan")
                .update({
                    status: "PENALTI",
                    alasan_penalti: alasan
                })
                .eq("kode_karyawan", String(kodeKaryawan).trim());

            if (empError) {
                console.error("[PlanburAPI] Gagal update status karyawan:", empError);
                throw empError;
            }

            return true;
        }

        /**
         * Mencabut sanksi / penalti karyawan
         */
        static async hapusPenalti(kodeKaryawan) {
            const sb = this.client;
            if (!sb) throw new Error("Supabase client belum siap");

            const { error } = await sb
                .from("karyawan")
                .update({
                    status: "AKTIF",
                    alasan_penalti: ""
                })
                .eq("kode_karyawan", String(kodeKaryawan).trim());

            if (error) {
                console.error("[PlanburAPI] Gagal mencabut penalti:", error);
                throw error;
            }

            return true;
        }

        /**
         * Tes konektivitas database Supabase
         */
        static async checkConnection() {
            try {
                const sb = this.client;
                if (!sb) return false;
                const { count, error } = await sb.from("karyawan").select("*", { count: "exact", head: true });
                return !error;
            } catch (_) {
                return false;
            }
        }
    }

    global.PlanburAPI = PlanburAPI;
    global.API = PlanburAPI;
})(window);