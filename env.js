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
})(window);