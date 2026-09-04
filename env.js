/* Browser configuration.
   Isi nilai real-nya sebelum file ini dipanggil, misalnya:
   window.__PLANBUR_ENV__ = {
       SUPABASE_URL: "https://your-project.supabase.co",
       SUPABASE_ANON_KEY: "your-anon-key"
   };
*/
(function (global) {
    const source = global.__PLANBUR_ENV__ || global.PlanburEnv || {};
    const placeholderUrl = "__SUPABASE_URL__";
    const placeholderAnonKey = "__SUPABASE_ANON_KEY__";

    const url = String(
        source.SUPABASE_URL ||
        source.API_BASE_URL ||
        placeholderUrl
    ).replace(/\/$/, "");

    const anonKey = String(
        source.SUPABASE_ANON_KEY ||
        placeholderAnonKey
    ).trim();

    const env = {
        SUPABASE_URL: url,
        SUPABASE_ANON_KEY: anonKey
    };

    global.__PLANBUR_ENV__ = env;
    global.PlanburEnv = Object.freeze(env);
})(window);
