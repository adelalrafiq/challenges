import http from "http";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer(async (req, res) => {
    let filePath = path.join(__dirname, "public", req.url === "/" ? "index.html" : req.url);
    const extname = path.extname(filePath);
    let contentType = "text/html";

    switch (extname) {
        case ".js":
            contentType = "application/javascript"; break;
        case ".css":
            contentType = "text/css"; break;
        case ".json":
            contentType = "application/json"; break;
        case ".png":
            contentType = "image/png"; break;
        case ".jpg":
        case ".jpeg":
            contentType = "image/jpeg"; break;
        case ".svg":
            contentType = "image/svg+xml"; break;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    // serve html
    if (url.pathname === "/" || url.pathname.endsWith(".html")) {
        const filePath = path.join(__dirname, "public", url.pathname === "/" ? "index.html" : url.pathname);
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end("Not Found");
            } else {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(content);
            }
        });
        return;
    }

    // ipinfo API proxy
    if (url.pathname === "/api/ipinfo") {
        const ip = url.searchParams.get("ip") || "";
        const apiUrl = `https://geo.ipify.org/api/v1?apiKey=${process.env.IPIFY_KEY}${ip ? `&ipAddress=${ip}` : ""}`;
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(data));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Server error" }));
        }
        return;
    }

    // reverse geocoding API proxy
    if (url.pathname === "/api/reverse-geocode") {
        const lat = url.searchParams.get("lat");
        const lng = url.searchParams.get("lng");
        if (!lat || !lng) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing lat/lng" }));
            return;
        }
        const apiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.MAPBOX_TOKEN}`;
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(data));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Server error" }));
        }
        return;
    }

    // static files
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        } else {
            res.writeHead(200, { "Content-Type": contentType });
            res.end(content, "utf-8");
        }
    });
});

server.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));
