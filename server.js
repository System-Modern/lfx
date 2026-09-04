const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const port = Number(process.env.PORT || 3000);
const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || "");
const proxyPrefix = "/supabase";
const publicRoot = __dirname;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL dan SUPABASE_ANON_KEY wajib tersedia di environment server.");
}

const target = new URL(supabaseUrl);
const transport = target.protocol === "https:" ? https : http;

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
        headers: upstreamHeaders
    }, (upstreamResponse) => {
        const responseHeaders = { ...upstreamResponse.headers };
        delete responseHeaders["access-control-allow-origin"];
        responseHeaders["access-control-allow-origin"] = request.headers.origin || "*";
        responseHeaders["access-control-allow-headers"] = "apikey, authorization, content-type, x-client-info, prefer, range";
        responseHeaders["access-control-allow-methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
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
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentTypes = {
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".png": "image/png"
    };

    response.writeHead(200, {
        "Content-Type": contentTypes[extension] || "application/octet-stream"
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

    if (request.url.startsWith(proxyPrefix + "/")) {
        proxy(request, response);
        return;
    }

    serveStatic(request, response);
}).listen(port, () => {
    console.log("Supabase proxy aktif di http://localhost:" + port + proxyPrefix);
});
