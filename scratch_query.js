const SUPABASE_URL = "https://msthucqijrjmmntsdscm.supabase.co";
const SUPABASE_KEY = "sb_publishable_-mgfP8xp-YlJDNmHtmonZw_nN0CR8gz";

async function query(endpoint) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        }
    });
    return await res.json();
}

async function check() {
    const plans = await query("planning_lembur?kode_planning=eq.PLN-20261015-102584");
    console.log("PLAN:", JSON.stringify(plans, null, 2));

    if (plans && plans.length > 0) {
        const plan = plans[0];
        const rels = await query(`planning_karyawan?planning_id=eq.${plan.id}`);
        console.log("RELS:", JSON.stringify(rels, null, 2));
https://127.0.0.1:62807/static/artifacts/44fbc9b0-6ae0-4905-9b96-8392e87c6113/.user_uploaded/media_1792081982439.jpg?csrf=886f1733-fb12-4ce0-8220-e7ab71922975
        const kIds = (rels || []).map(r => r.karyawan_id);
        const kars = await query(`karyawan?id=in.(${kIds.join(",")})`);
        console.log("KARYAWAN:", JSON.stringify(kars, null, 2));
    }
}
check();
