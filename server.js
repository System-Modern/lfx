const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

if (typeof process.loadEnvFile === "function") {
    try {
        process.loadEnvFile();
    } catch (_) {}
}

const port = Number(process.env.PORT || 3000);
const defaultSupabaseUrl = "https://msthucqijrjmmntsdscm.supabase.co";
const defaultSupabaseAnonKey = "sb_publishable_-mgfP8xp-YlJDNmHtmonZw_nN0CR8gz";
const supabaseUrl = String(process.env.SUPABASE_URL || defaultSupabaseUrl).replace(/\/$/, "");
const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || defaultSupabaseAnonKey);
const proxyPrefix = "/supabase";
const publicRoot = __dirname;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL dan SUPABASE_ANON_KEY wajib tersedia di environment server.");
}

const target = new URL(supabaseUrl);
const transport = target.protocol === "https:" ? https : http;
const keepAliveAgent = target.protocol === "https:"
    ? new https.Agent({ keepAlive: true, keepAliveMsecs: 60000, maxSockets: 64, maxFreeSockets: 16 })
    : new http.Agent({ keepAlive: true, keepAliveMsecs: 60000, maxSockets: 64, maxFreeSockets: 16 });

function proxy(request, response) {
    if (!request.url.startsWith(proxyPrefix + "/")) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
    }

    const upstreamPath = request.url.slice(proxyPrefix.length);
    const upstreamHeaders = { ...request.headers };
    delete upstreamHeaders.host;
    upstreamHeaders.apikey = supabaseAnonKey;
    upstreamHeaders.authorization = "Bearer " + supabaseAnonKey;

    const upstreamRequest = transport.request({
        hostname: target.hostname,
        port: target.port || undefined,
        method: request.method,
        path: upstreamPath,
        headers: upstreamHeaders,
        agent: keepAliveAgent
    }, (upstreamResponse) => {
        const responseHeaders = { ...upstreamResponse.headers };
        delete responseHeaders["access-control-allow-origin"];
        responseHeaders["access-control-allow-origin"] = request.headers.origin || "*";
        responseHeaders["access-control-allow-headers"] = "apikey, authorization, content-type, x-client-info, prefer, range";
        responseHeaders["access-control-allow-methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
        if (upstreamPath.includes("/storage/v1/object/") && upstreamResponse.statusCode === 200) {
            responseHeaders["cache-control"] = "public, max-age=31536000, immutable";
        }
        response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
        upstreamResponse.pipe(response);
    });

    upstreamRequest.on("error", (error) => {
        console.error("Supabase proxy error:", error.message);
        if (!response.headersSent) {
            response.writeHead(502, { "Content-Type": "application/json" });
        }
        response.end(JSON.stringify({ error: "Supabase tidak dapat dihubungi." }));
    });

    request.pipe(upstreamRequest);
}

function serveStatic(request, response) {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const requestedPath = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.resolve(publicRoot, "." + requestedPath);

    if (!filePath.startsWith(publicRoot) || !fs.existsSync(filePath)) {
        if (requestedPath === "/favicon.ico" && fs.existsSync(path.resolve(publicRoot, "Logo.png"))) {
            response.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" });
            fs.createReadStream(path.resolve(publicRoot, "Logo.png")).pipe(response);
            return;
        }
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentTypes = {
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".json": "application/json; charset=utf-8",
        ".ico": "image/x-icon"
    };

    if (extension === ".html") {
        let html = fs.readFileSync(filePath, "utf8");
        const cacheBuster = Date.now();
        html = html.replace(/(src|href)=["'](?!https?:\/\/)([^"']+\.(?:js|css))(?:\?[^"']*)?["']/gi, `$1="$2?v=${cacheBuster}"`);

        response.writeHead(200, {
            "Content-Type": contentTypes[extension],
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
            "Pragma": "no-cache",
            "Expires": "0",
            "Surrogate-Control": "no-store",
            "Clear-Site-Data": "\"cache\""
        });
        response.end(html);
        return;
    }

    response.writeHead(200, {
        "Content-Type": contentTypes[extension] || "application/octet-stream",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
        "Pragma": "no-cache",
        "Expires": "0"
    });
    fs.createReadStream(filePath).pipe(response);
}

http.createServer((request, response) => {
    if (request.method === "OPTIONS") {
        response.writeHead(204, {
            "Access-Control-Allow-Origin": request.headers.origin || "*",
            "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info, prefer, range",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        });
        response.end();
        return;
    }

    if (request.url === proxyPrefix || request.url === proxyPrefix + "/") {
        if (request.headers.accept && request.headers.accept.includes("text/html")) {
            response.writeHead(302, { "Location": "/" });
            response.end();
            return;
        }
        response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ status: "ok", message: "Supabase proxy aktif." }));
        return;
    }

    if (request.url.startsWith(proxyPrefix + "/")) {
        proxy(request, response);
        return;
    }

    serveStatic(request, response);
}).listen(port, () => {
    console.log("\n=========================================");
    console.log(" Planbur Server siap digunakan!");
    console.log("=========================================");
    console.log(" > Buka Web App   : http://localhost:" + port + "/");
    console.log(" > Cek Lembur     : http://localhost:" + port + "/cek-lembur.html");
    console.log(" > Proxy Supabase : http://localhost:" + port + proxyPrefix + "/");
    console.log("=========================================\n");
});
