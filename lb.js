/* Lestvica v živo – Firebase Realtime Database prek REST + Server-Sent Events (brez knjižnic) */
window.LB = (function () {
  "use strict";
  const BASE = String(window.LEADERBOARD_URL || "").trim().replace(/\/+$/, "");
  const PATH = "/races/" + (window.RACE_ID || "roman60") + "/teams";
  const enabled = /^https?:\/\//.test(BASE);
  const url = (p) => BASE + PATH + (p || "") + ".json";

  /* ---- pošiljanje rezultata ekipe (zadnji zapis zmaga, ponovni poskus ob izpadu) ---- */
  let pending = null, sending = false, retryT = null;
  function push(id, data) {
    if (!enabled || !id) return;
    pending = { id, data };
    try { localStorage.setItem("ppr-lb-pending", JSON.stringify(pending)); } catch (e) {}
    flush();
  }
  async function flush() {
    if (!enabled || sending || !pending) return;
    const job = pending; sending = true;
    let ok = false;
    try {
      const r = await fetch(url("/" + encodeURIComponent(job.id)), { method: "PUT", body: JSON.stringify(job.data) });
      ok = r.ok;
    } catch (e) { ok = false; }
    sending = false;
    if (ok && pending === job) { pending = null; try { localStorage.removeItem("ppr-lb-pending"); } catch (e) {} }
    if (pending && pending !== job) flush();            // medtem je prišel novejši rezultat
    else if (!ok) { clearTimeout(retryT); retryT = setTimeout(flush, 5000); }
  }
  try { const p = JSON.parse(localStorage.getItem("ppr-lb-pending")); if (p) { pending = p; } } catch (e) {}
  window.addEventListener("online", flush);
  if (pending) setTimeout(flush, 500);

  function remove(id) { if (!enabled) return Promise.resolve(); return fetch(url("/" + encodeURIComponent(id)), { method: "DELETE" }); }

  /* ---- poslušanje lestvice v živo ---- */
  function subscribe(cb, onStatus) {
    if (!enabled) { onStatus && onStatus("off"); return () => {}; }
    let teams = {}, es = null, poll = null, errs = 0;
    const emit = () => cb(Object.keys(teams || {}).filter((k) => teams[k] && teams[k].name).map((k) => Object.assign({ id: k }, teams[k])));
    function setAt(id, rest, data, patch) {
      if (!rest.length) {
        if (data === null) delete teams[id];
        else teams[id] = patch ? Object.assign(teams[id] || {}, data) : data;
        return;
      }
      teams[id] = teams[id] || {};
      let o = teams[id];
      for (let i = 0; i < rest.length - 1; i++) o = o[rest[i]] = o[rest[i]] || {};
      const last = rest[rest.length - 1];
      if (data === null) delete o[last]; else o[last] = patch && typeof data === "object" ? Object.assign(o[last] || {}, data) : data;
    }
    function apply(ev, patch) {
      let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (!msg) return;
      const parts = String(msg.path || "/").split("/").filter(Boolean);
      if (!parts.length) {
        if (patch) Object.keys(msg.data || {}).forEach((k) => setAt(k, [], msg.data[k], true));
        else teams = msg.data || {};
      } else setAt(parts[0], parts.slice(1), msg.data, patch);
      errs = 0; onStatus && onStatus("live"); emit();
    }
    function startPoll() {
      if (poll) return;
      onStatus && onStatus("poll");
      const f = async () => {
        try { const r = await fetch(url()); if (r.ok) { teams = (await r.json()) || {}; emit(); onStatus && onStatus("live"); } }
        catch (e) { onStatus && onStatus("offline"); }
      };
      f(); poll = setInterval(f, 4000);
    }
    if ("EventSource" in window) {
      es = new EventSource(url());
      es.addEventListener("put", (e) => apply(e, false));
      es.addEventListener("patch", (e) => apply(e, true));
      es.addEventListener("cancel", () => { es.close(); startPoll(); });
      es.addEventListener("auth_revoked", () => { es.close(); startPoll(); });
      es.onerror = () => { errs++; onStatus && onStatus("offline"); if (errs > 3) { es.close(); startPoll(); } };
    } else startPoll();
    return () => { if (es) es.close(); if (poll) clearInterval(poll); };
  }

  /* ---- razvrstitev: največ točk, nato več odgovorov, nato najkrajši čas ---- */
  function rank(list, now) {
    now = now || Date.now();
    return list
      .map((t) => Object.assign({}, t, { time: Math.max(0, (t.finishedAt || now) - (t.startedAt || now)) }))
      .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.answered || 0) - (a.answered || 0) || a.time - b.time);
  }

  /* ---- oblak besed: združi besede vseh ekip (loči z vejico, podpičjem ali novo vrstico) ---- */
  function cloud(teams) {
    const m = new Map();
    (teams || []).forEach((t) => String((t && t.words) || "").split(/[,;\n]+/).forEach((w) => {
      w = w.trim().replace(/\s+/g, " ").slice(0, 40); if (!w) return;
      const key = w.toLowerCase();
      if (m.has(key)) m.get(key).count++; else m.set(key, { key, word: w, count: 1 });
    }));
    return [...m.values()].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "sl"));
  }

  async function fetchAll(timeoutMs) {
    if (!enabled) return [];
    const ctl = "AbortController" in window ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), timeoutMs || 3000);
    try {
      const r = await fetch(url(), ctl ? { signal: ctl.signal } : {});
      const d = (await r.json()) || {};
      return Object.keys(d).filter((k) => d[k] && d[k].name).map((k) => Object.assign({ id: k }, d[k]));
    } catch (e) { return null; } finally { clearTimeout(t); }
  }

  return { enabled, push, remove, subscribe, rank, cloud, fetchAll };
})();
