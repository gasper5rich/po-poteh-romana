/* Service worker – Po poteh Romana: aplikacija in posnetki delujejo tudi brez povezave */
const VERSION = "ppr-v18";
const CORE = [
  "./",
  "app.css",
  "app.js",
  "audio/01-doma-mama.m4a",
  "audio/02-sutenska-cerkev-mama.m4a",
  "audio/03-maistrova-hisa-anja.m4a",
  "audio/04-glavni-trg-anja.m4a",
  "audio/05-mali-grad-tjasa.m4a",
  "audio/06-trznica-milena.m4a",
  "audio/07-zaprice-milena.m4a",
  "audio/08-novi-trg-tjasa.m4a",
  "audio/09-scrm-roman.m4a",
  "audio/10-invalidni-dom-nadi.m4a",
  "config.js",
  "data.js",
  "engine-sound.js",
  "fonts/barlow-latin-400-normal.woff2",
  "fonts/barlow-latin-600-normal.woff2",
  "fonts/barlow-latin-700-normal.woff2",
  "fonts/barlow-latin-ext-400-normal.woff2",
  "fonts/barlow-latin-ext-600-normal.woff2",
  "fonts/barlow-latin-ext-700-normal.woff2",
  "fonts/saira-condensed-latin-600-normal.woff2",
  "fonts/saira-condensed-latin-800-normal.woff2",
  "fonts/saira-condensed-latin-900-normal.woff2",
  "fonts/saira-condensed-latin-ext-600-normal.woff2",
  "fonts/saira-condensed-latin-ext-800-normal.woff2",
  "fonts/saira-condensed-latin-ext-900-normal.woff2",
  "icons/apple-touch-icon.png",
  "images/whatsapp-qr.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon.svg",
  "index.html",
  "lb.js",
  "leaderboard.html",
  "manifest.webmanifest",
  "vendor/leaflet.css",
  "vendor/leaflet.js",
  "vendor/qrcode.js",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== "ppr-tiles").map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // ploščice zemljevida: najprej omrežje, ob izpadu predpomnilnik
  if (url.hostname === "tile.openstreetmap.org") {
    e.respondWith(
      fetch(req).then((res) => { const cp = res.clone(); caches.open("ppr-tiles").then((c) => c.put(req, cp)); return res; })
        .catch(() => caches.match(req))
    );
    return;
  }
  if (url.origin !== location.origin) return; // lestvica (Firebase) gre vedno naravnost v omrežje
  if (req.headers.has("range")) return;       // iOS predvajanje zvoka z Range – naravnost iz omrežja
  // posnetki, pisave, ikone, knjižnice: iz predpomnilnika (hitro, deluje brez signala)
  if (/\/(audio|fonts|icons|vendor)\//.test(url.pathname)) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
    return;
  }
  // vse ostalo (stran, igra, vprašanja, nastavitve): najprej omrežje = vedno najnovejša različica
  e.respondWith(
    fetch(req, { cache: "no-store" })
      .then((res) => { if (res.ok) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
