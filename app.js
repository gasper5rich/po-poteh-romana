/* PO POTEH ROMANA – logika igre */
(function () {
  "use strict";

  const ROUTE = window.ROUTE;
  const PTS = window.POINTS_PER_Q || 10;
  const MAX = ROUTE.length * PTS;
  const KEY = "po-poteh-romana-v1";
  const $ = (s) => document.querySelector(s);

  /* ---------- stanje ---------- */
  let state = load() || { name: "", answers: {}, started: false, finished: false };
  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  const score = () => Object.values(state.answers).filter((a) => a.ok).length * PTS;
  const doneCount = () => Object.keys(state.answers).length;
  const nextIndex = () => ROUTE.findIndex((s) => !state.answers[s.id]);
  const labelOf = (s, i) => s.label || String(i);

  /* ---------- zvok motorja (Web Audio, brez datotek) ---------- */
  let actx = null;
  function audioCtx() {
    if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
    if (actx && actx.state === "suspended") actx.resume();
    if (actx && !actx.__unlocked) { // tih vzorec v istem dotiku – iOS nato dovoli zvok
      try { const b = actx.createBuffer(1, 1, actx.sampleRate), src = actx.createBufferSource(); src.buffer = b; src.connect(actx.destination); src.start(); actx.__unlocked = true; } catch (e) {}
    }
    return actx;
  }
  /* zvok motorja samo ob zagonu – sintetiziran V-twin (engine-sound.js) */
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {} // iOS: zvok tudi pri utišanem zvonjenju
  const sfx = {
    start: () => { const ctx = audioCtx(); return ctx && window.EngineSound ? EngineSound.play(ctx) : null; },
  };
  // zvok vnaprej izračunaj, ko je brskalnik prost, da zagon steče brez zamika
  const warm = () => { try { [44100, 48000].forEach((r) => EngineSound.samples(r)); } catch (e) {} };
  if (window.EngineSound) ("requestIdleCallback" in window ? requestIdleCallback(warm, { timeout: 2500 }) : setTimeout(warm, 800));
  function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

  /* ---------- tahometer ---------- */
  const TACH = { cx: 110, cy: 100, r: 85, min: -120, max: 120, top: 13 };
  function polar(deg, r) { const a = ((deg - 90) * Math.PI) / 180; return [TACH.cx + r * Math.cos(a), TACH.cy + r * Math.sin(a)]; }
  function arc(d1, d2, r) { const [x1, y1] = polar(d1, r), [x2, y2] = polar(d2, r); return `M ${x1} ${y1} A ${r} ${r} 0 ${d2 - d1 > 180 ? 1 : 0} 1 ${x2} ${y2}`; }
  const rpmDeg = (rpm) => TACH.min + (rpm / TACH.top) * (TACH.max - TACH.min);
  function drawTach() {
    const g = $("#tach-ticks"), ns = "http://www.w3.org/2000/svg";
    const bg = document.createElementNS(ns, "path"); bg.setAttribute("d", arc(TACH.min, TACH.max, TACH.r)); bg.setAttribute("class", "tach-arc"); g.appendChild(bg);
    $("#tach-red").setAttribute("d", arc(rpmDeg(10.5), TACH.max, TACH.r));
    for (let v = 0; v <= TACH.top; v += 0.5) {
      const d = rpmDeg(v), major = v % 1 === 0;
      const [x1, y1] = polar(d, TACH.r - 8), [x2, y2] = polar(d, TACH.r - (major ? 20 : 14));
      const l = document.createElementNS(ns, "line");
      Object.entries({ x1, y1, x2, y2 }).forEach(([k, val]) => l.setAttribute(k, val));
      l.setAttribute("class", "tick" + (major ? "" : " minor")); g.appendChild(l);
      if (major && v % 2 === 0 || v === 13) {
        const [tx, ty] = polar(d, TACH.r - 32), t = document.createElementNS(ns, "text");
        t.setAttribute("x", tx); t.setAttribute("y", ty); t.setAttribute("class", "tick-num"); t.textContent = v; g.appendChild(t);
      }
    }
  }
  function needle(rpm, ms) { const n = $("#tach-needle"); if (ms != null) n.style.transitionDuration = ms + "ms"; n.style.transform = `rotate(${rpmDeg(rpm)}deg)`; }

  /* ---------- zasloni ---------- */
  function show(id) { document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("is-active", s.id === id)); }

  /* ---------- predlogi imen ekip ---------- */
  const TEAMS = [
    "Romanovi Bestiči", "Kamniški Majstri", "Moto Tetke", "Hočemo Tortico", "Skurjene Sklopke",
    "Hitri in Drzni", "Rojeni Zmagovalci", "Škis Runda", "Oranžni Dirkači", "Vedno Žejni"
  ];
  /* imena, ki jih že uporabljajo druge ekipe (z lestvice) – dve ekipi ne smeta imeti istega imena */
  let takenNames = new Set();
  const norm = (n) => String(n || "").trim().replace(/\s+/g, " ").toLowerCase();
  const isTaken = (n) => takenNames.has(norm(n));
  function setTaken(teams) {
    takenNames = new Set((teams || []).filter((t) => t.id !== state.teamId).map((t) => norm(t.name)));
  }
  let teamPool = [];
  function nextTeam() {
    const cur = norm($("#rider-name") && $("#rider-name").value);
    const free = TEAMS.filter((n) => !isTaken(n) && norm(n) !== cur);
    if (free.length) {
      teamPool = teamPool.filter((n) => free.includes(n));
      if (!teamPool.length) teamPool = free.slice().sort(() => Math.random() - 0.5);
      return teamPool.pop();
    }
    // vsa imena iz nabora so zasedena – dodaj zaporedno številko
    for (let k = 2; k < 100; k++) {
      const n = TEAMS.map((t) => t + " " + k).find((t) => !isTaken(t) && norm(t) !== cur);
      if (n) return n;
    }
    return TEAMS[0] + " " + Date.now() % 1000;
  }
  function checkNameLive() {
    const v = $("#rider-name").value, w = $("#name-taken");
    if (v.trim() && isTaken(v)) { w.hidden = false; w.textContent = `Ime »${v.trim()}« že uporablja druga ekipa.`; }
    else w.hidden = true;
  }

  /* ---------- ura ---------- */
  function elapsed() {
    if (!state.startedAt) return 0;
    return (state.finishedAt || Date.now()) - state.startedAt;
  }
  function fmtTime(ms) {
    const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
  }
  setInterval(() => { const el = $("#hud-time"); if (el) el.textContent = fmtTime(elapsed()); }, 500);

  /* ---------- uvod ---------- */
  function initIntro() {
    drawTach();
    needle(0, 0);
    $("#rider-name").placeholder = nextTeam();
    $("#rider-name").addEventListener("input", checkNameLive);
    // sproti spremljaj zasedena imena
    let introUnsub = null;
    if (LB.enabled) {
      introUnsub = LB.subscribe((teams) => {
        setTaken(teams);
        if (isTaken($("#rider-name").placeholder)) $("#rider-name").placeholder = nextTeam();
        checkNameLive();
      });
      window.addEventListener("ppr-ignite", () => { if (introUnsub) { introUnsub(); introUnsub = null; } }, { once: true });
    }
    $("#dice-btn").addEventListener("click", () => {
      const d = $("#dice-btn"); d.classList.remove("roll"); void d.offsetWidth; d.classList.add("roll");
      $("#rider-name").value = nextTeam();
    });
    if (state.name) $("#rider-name").value = state.name;
    if (state.started && doneCount() > 0) {
      $("#resume-hint").hidden = false;
      $("#resume-btn").onclick = () => { audioCtx(); state.finished ? openFinish(false) : enterGame(); };
    }
    let checking = false;
    $("#rider-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (checking || igniting) return;
      audioCtx(); // zvok odkleni takoj ob pritisku (iPhone), še pred preverjanjem imena
      const input = $("#rider-name");
      const name = input.value.trim().replace(/\s+/g, " ");
      if (!name) { input.focus(); return; }
      // preveri, ali ime že uporablja druga ekipa (svež podatek z lestvice)
      if (LB.enabled) {
        checking = true;
        const teams = await LB.fetchAll(2500);
        checking = false;
        if (teams) setTaken(teams);
      }
      audioCtx();
      if (isTaken(name)) {
        const alt = nextTeam();
        input.value = alt; checkNameLive();
        const w = $("#name-taken"); w.hidden = false;
        w.textContent = `Ime »${name}« že uporablja druga ekipa – predlagamo »${alt}«. Pritisni ZAŽENI MOTOR ali izberi drugo ime.`;
        toast("Ime je že zasedeno", true);
        input.focus();
        return;
      }
      if (state.started && doneCount() > 0 && name !== state.name) {
        // drug voznik na isti napravi – nova vožnja
        state = { name, answers: {}, started: true, finished: false };
      } else { state.name = name; state.started = true; }
      if (!state.startedAt) state.startedAt = Date.now(); // ura začne teči ob zagonu motorja
      if (!state.teamId) state.teamId = newId();
      save(); pushTeam();
      save();
      ignite();
    });
  }
  let igniting = false;
  function ignite() {
    if (igniting) return; igniting = true;
    window.dispatchEvent(new Event("ppr-ignite"));
    const btn = $("#ignition"); btn.classList.add("revving");
    sfx.start(); buzz([30, 30, 30, 30, 30, 30, 30, 30, 30, 120, 60, 240, 80, 300]);
    // kazalec obratov natančno sledi zvoku motorja
    const t0 = performance.now(), ENDMS = 3000;
    $("#tach-needle").style.transitionDuration = "0ms";
    (function frame(now) {
      const t = (now - t0) / 1000;
      let rpm = window.EngineSound ? EngineSound.rpmAt(t) : 0;
      if (t < 0.76) rpm = 0.25 + Math.random() * 0.15;            // zaganjač – kazalec trza
      else rpm = rpm / 1000 + (Math.random() - 0.5) * 0.12;        // rahlo tresenje
      needle(Math.max(0, rpm));
      document.body.classList.toggle("shake", t > 0.76 && rpm > 4);
      if (now - t0 < ENDMS) requestAnimationFrame(frame);
    })(t0);
    setTimeout(() => {
      document.body.classList.remove("shake"); btn.classList.remove("revving"); igniting = false; enterGame();
      if (!state.seenHelp) { state.seenHelp = true; save(); setTimeout(openHelp, 500); }
    }, ENDMS);
  }

  /* ---------- zemljevid ---------- */
  let map, markers = [], mapReady = false;
  function initMap() {
    if (mapReady) return; mapReady = true;
    map = L.map("map", { zoomControl: true, attributionControl: true, tap: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const pts = ROUTE.map((s) => [s.lat, s.lng]);
    L.polyline(pts, { color: "#000", weight: 9, opacity: 0.75, lineJoin: "round" }).addTo(map);
    L.polyline(pts, { color: "#FF6600", weight: 4, dashArray: "10 8", lineJoin: "round" }).addTo(map);
    ROUTE.forEach((s, i) => {
      const m = L.marker([s.lat, s.lng], { icon: pinIcon(s, i), keyboard: true, title: s.name, riseOnHover: true }).addTo(map);
      m.bindTooltip(s.name, { direction: "top", offset: [0, -30], className: "pin-tip" });
      m.on("click", () => openSheet(i));
      markers.push(m);
    });
    fitAll();
    window.addEventListener("resize", () => map.invalidateSize());
  }
  function fitAll() {
    const b = L.latLngBounds(ROUTE.map((s) => [s.lat, s.lng]));
    map.fitBounds(b, { paddingTopLeft: [30, 110], paddingBottomRight: [30, 110] });
  }
  function pinIcon(s, i) {
    const a = state.answers[s.id], next = nextIndex() === i;
    const cls = ["pin", i === 0 && "is-start", i === ROUTE.length - 1 && "is-finish", a && "is-done", a && !a.ok && "is-wrong", next && "is-next"].filter(Boolean).join(" ");
    const badge = a ? `<span class="pin-badge"><svg viewBox="0 0 12 12">${a.ok ? '<path d="M2.5 6.5l2.3 2.2L9.5 3.5"/>' : '<path d="M3 3l6 6M9 3L3 9"/>'}</svg></span>` : "";
    return L.divIcon({ className: cls, html: `<div class="pin-plate"><span>${labelOf(s, i)}</span>${badge}</div>`, iconSize: [40, 40], iconAnchor: [20, 50] });
  }
  function refreshPins() { markers.forEach((m, i) => m.setIcon(pinIcon(ROUTE[i], i))); }

  /* ---------- HUD ---------- */
  function updateHud(bumpGear) {
    $("#hud-name").textContent = state.name || "—";
    $("#hud-time").textContent = fmtTime(elapsed());
    $("#hud-score").textContent = score();
    $("#mg-fill").style.strokeDashoffset = 82 - 82 * (score() / MAX);
    const d = doneCount();
    const gear = $("#hud-gear");
    gear.textContent = d === 0 ? "N" : Math.min(6, Math.ceil((d / ROUTE.length) * 6));
    if (bumpGear) { gear.classList.remove("bump"); void gear.offsetWidth; gear.classList.add("bump"); }
    $("#progress-fill").style.width = (d / ROUTE.length) * 100 + "%";
    const n = nextIndex();
    if (n === -1) { $("#next-kicker").textContent = "Vse etape prevožene"; $("#next-name").textContent = "Na cilj!"; }
    else { $("#next-kicker").textContent = `Naslednje vprašanje · ${d + 1}/${ROUTE.length}`; $("#next-name").textContent = ROUTE[n].name; }
    renderStages();
  }

  /* ---------- seznam etap ob zemljevidu ---------- */
  const desktop = () => window.matchMedia("(min-width: 900px)").matches;
  function renderStages() {
    const ol = $("#stages-list"); if (!ol) return;
    const n = nextIndex();
    ol.innerHTML = "";
    ROUTE.forEach((s, i) => {
      const a = state.answers[s.id];
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "stage-row" + (i === n ? " is-next" : "") + (a ? (a.ok ? " is-ok" : " is-bad") : "");
      const plateCls = "stage-plate" + (i === 0 ? " is-start" : "") + (i === ROUTE.length - 1 ? " is-finish" : "");
      const status = a ? (s.type === "words" ? "zapisano · +" + PTS : a.ok ? "pravilno · +" + PTS : "napačno · 0") : i === n ? "naslednja" : "";
      b.innerHTML = `<span class="${plateCls}"><span>${labelOf(s, i)}</span></span><span class="stage-text"><b></b><small></small></span><span class="stage-status">${status}</span>`;
      b.querySelector("b").textContent = s.name;
      b.querySelector("small").textContent = "Govori: " + s.voice;
      b.addEventListener("click", () => {
        if (!desktop()) closeStages();
        if (map) map.flyTo([s.lat, s.lng], 17, { duration: 0.7 });
        setTimeout(() => openSheet(i), 550);
      });
      li.appendChild(b); ol.appendChild(li);
    });
  }
  function openStages() { $("#stages").classList.add("open"); $("#stages-backdrop").hidden = false; }
  function closeStages() { $("#stages").classList.remove("open"); $("#stages-backdrop").hidden = true; }
  $("#stages-btn").addEventListener("click", openStages);
  $("#stages-close").addEventListener("click", closeStages);
  $("#stages-backdrop").addEventListener("click", closeStages);

  function enterGame() {
    show("game");
    if (!state.startedAt) { state.startedAt = Date.now(); save(); }
    if (!state.teamId) { state.teamId = newId(); save(); pushTeam(); }
    initMap();
    setTimeout(() => map.invalidateSize(), 50);
    updateHud(); refreshPins();
    $("#next-btn").onclick = () => {
      const n = nextIndex();
      if (n === -1) { openFinish(false); return; }
      map.flyTo([ROUTE[n].lat, ROUTE[n].lng], 17, { duration: 0.8 });
      setTimeout(() => openSheet(n), 650);
    };
    $("#recenter-btn").onclick = fitAll;
  }

  /* ---------- vprašanje ---------- */
  let current = -1, audio = null, lastFocus = null;
  function openSheet(i) {
    current = i; lastFocus = document.activeElement;
    const s = ROUTE[i], a = state.answers[s.id];
    const plate = $("#q-plate");
    plate.textContent = labelOf(s, i);
    plate.className = "plate" + (i === 0 ? " is-start" : "") + (i === ROUTE.length - 1 ? " is-finish" : "");
    $("#q-kicker").textContent = (i === 0 ? "Start" : i === ROUTE.length - 1 ? "Cilj" : "Etapa " + i) + " · vprašanje " + (i + 1) + " / " + ROUTE.length;
    $("#q-name").textContent = s.name;
    $("#q-tag").textContent = s.tagline || "";
    $("#q-tag").hidden = !s.tagline;
    $("#q-text").textContent = s.q;
    // navigacija do lokacije
    const ll = `${s.lat},${s.lng}`;
    $("#nav-google").href = `https://www.google.com/maps/dir/?api=1&destination=${ll}`;
    $("#nav-dist").textContent = me ? "· " + dist(me, s) : "";

    // namig
    stopAudio();
    const au = new Audio(s.audio); au.preload = "metadata"; audio = au;
    $("#pit-voice").textContent = "· govori " + s.voice;
    $("#pit-progress").style.width = "0";
    $("#pit-time").textContent = "0:00";
    au.addEventListener("loadedmetadata", () => { if (audio === au) $("#pit-time").textContent = fmt(au.duration); });
    au.addEventListener("timeupdate", () => {
      if (audio !== au) return;
      if (au.duration) $("#pit-progress").style.width = (au.currentTime / au.duration) * 100 + "%";
      $("#pit-time").textContent = fmt(Math.max(0, (au.duration || 0) - au.currentTime));
    });
    au.addEventListener("ended", () => { if (audio !== au) return; $("#pit").classList.remove("is-playing"); $("#pit-progress").style.width = "100%"; });

    // odgovori
    const box = $("#q-options"); box.innerHTML = "";
    if (s.type === "words") {
      box.innerHTML = `<form class="words-form" id="words-form" autocomplete="off">
          <label class="field-label" for="words-input">Tvoje besede · loči jih z vejico</label>
          <textarea id="words-input" rows="3" maxlength="160"></textarea>
          <p class="hint small">Tu ni napačnih odgovorov – vsak iskren zapis prinese ${PTS} točk. Besede se pokažejo na končni tabli.</p>
          <button class="cta" type="submit">Oddaj besede · +${PTS}</button>
        </form>`;
      $("#words-input").placeholder = s.placeholder || "";
      $("#words-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const v = $("#words-input").value.trim();
        if (!v) { $("#words-input").focus(); toast("Napiši vsaj eno besedo", true); return; }
        answerWords(v);
      });
    } else s.options.forEach((txt, k) => {
      const b = document.createElement("button");
      b.className = "opt"; b.type = "button";
      b.innerHTML = `<span class="opt-key">${"ABCD"[k]}</span><span></span>`;
      b.lastChild.textContent = txt;
      b.addEventListener("click", () => answer(k));
      box.appendChild(b);
    });
    if (a) paintAnswered(s, a.choice, false); else $("#verdict").hidden = true;

    $("#sheet-backdrop").hidden = false; $("#sheet").hidden = false; $("#sheet").scrollTop = 0;
    setTimeout(() => $("#sheet-close").focus(), 50);
  }
  function fmt(sec) { if (!isFinite(sec)) return "0:00"; sec = Math.round(sec); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }
  function stopAudio() { if (audio) { audio.pause(); audio = null; } $("#pit").classList.remove("is-playing"); }
  function closeSheet() {
    stopAudio();
    $("#sheet").hidden = true; $("#sheet-backdrop").hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $("#pit-play").addEventListener("click", () => {
    if (!audio) return;
    if (audio.paused) { audio.play().then(() => $("#pit").classList.add("is-playing")).catch(() => toast("Posnetka ni mogoče predvajati", true)); }
    else { audio.pause(); $("#pit").classList.remove("is-playing"); }
  });
  $("#sheet-close").addEventListener("click", closeSheet);
  $("#sheet-backdrop").addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#confirm").hidden) { $("#confirm").hidden = true; return; }
    if (!$("#help").hidden) { closeHelp(); return; }
    if (!$("#board").hidden) { closeBoard(); return; }
    if ($("#stages").classList.contains("open")) { closeStages(); return; }
    if (!$("#sheet").hidden) closeSheet();
  });

  function answer(k) {
    const s = ROUTE[current];
    if (state.answers[s.id]) return; // samo en poskus
    if (s.type === "words") return;
    const ok = k === s.correct;
    state.answers[s.id] = { choice: k, ok };
    save();
    paintAnswered(s, k, true);
    if (nextIndex() === -1 && !state.finishedAt) { state.finishedAt = Date.now(); save(); } // ura se ustavi ob zadnjem odgovoru
    pushTeam();
    ok ? (buzz(80), toast("Polni plin! +" + PTS)) : (buzz([40, 60, 40]), toast("Zdrs v ovinku", true));
    updateHud(true); refreshPins();
  }
  function answerWords(text) {
    const s = ROUTE[current];
    if (state.answers[s.id]) return;
    state.answers[s.id] = { ok: true, words: text.slice(0, 160) };
    save();
    paintAnswered(s, null, true);
    if (nextIndex() === -1 && !state.finishedAt) { state.finishedAt = Date.now(); save(); }
    pushTeam();
    buzz(80); toast("Hvala! +" + PTS);
    updateHud(true); refreshPins();
  }
  function splitWords(str) { return String(str || "").split(/[,;\n]+/).map((w) => w.trim()).filter(Boolean); }
  function chipsHtml(words) { return words.map((w) => `<span class="word-chip"></span>`).join(""); }
  function paintAnswered(s, k, fresh) {
    const v = $("#verdict");
    let ok;
    if (s.type === "words") {
      ok = true;
      const words = splitWords((state.answers[s.id] || {}).words);
      const box = $("#q-options");
      box.innerHTML = `<div class="word-cloud own">${chipsHtml(words)}</div>`;
      box.querySelectorAll(".word-chip").forEach((el, j) => (el.textContent = words[j]));
      $("#verdict-title").textContent = `Zapisano · +${PTS} točk`;
    } else {
      ok = k === s.correct;
      [...$("#q-options").children].forEach((b, j) => {
        b.disabled = true;
        if (j === s.correct) b.classList.add("is-right");
        else if (j === k) b.classList.add("is-wrong");
        else b.classList.add("is-dim");
      });
      $("#verdict-title").textContent = ok ? `Pravilno · +${PTS} točk` : "Napačno · 0 točk";
    }
    v.hidden = false; v.className = "verdict " + (ok ? "good" : "bad");
    $("#verdict-fact").textContent = s.fact || "";
    $("#verdict-fact").hidden = !s.fact;
    const pl = $("#place-list"); pl.innerHTML = "";
    (s.place || []).forEach((txt) => { const li = document.createElement("li"); li.textContent = txt; pl.appendChild(li); });
    $("#place-facts").hidden = !(s.place && s.place.length);
    const last = nextIndex() === -1;
    const nb = $("#q-next");
    nb.textContent = last ? "Na cilj!" : "Naprej na traso";
    nb.onclick = () => {
      closeSheet();
      if (nextIndex() === -1) openFinish(true);
      else { const n = nextIndex(); map.flyTo([ROUTE[n].lat, ROUTE[n].lng], 16, { duration: 0.9 }); }
    };
    if (fresh) setTimeout(() => v.scrollIntoView({ behavior: "smooth", block: "nearest" }), 120);
  }

  /* ---------- cilj ---------- */
  function rank(p) {
    if (p === MAX) return "Tovarniški dirkač KTM";
    if (p >= 80) return "Veteran Dakarja";
    if (p >= 50) return "Enduro mojster";
    if (p >= 30) return "Nedeljski voznik";
    return "Še s pomožnimi kolesi";
  }
  function openFinish(celebrate) {
    if (nextIndex() !== -1) { toast("Najprej prevozi vse etape", true); return; }
    if (!state.finishedAt) state.finishedAt = Date.now(); // ura se ustavi na cilju
    state.finished = true; save(); pushTeam();
    show("finish");
    $("#finish-name").textContent = state.name;
    $("#finish-rank").textContent = rank(score());
    $("#finish-time").textContent = fmtTime(elapsed());
    countUp($("#finish-score"), score());
    startCloud();
    if (celebrate) buzz([100, 50, 100, 50, 300]);
    confetti();
  }
  function countUp(el, to) {
    const t0 = performance.now(), d = 1200;
    (function f(t) { const p = Math.min(1, (t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
  }
  $("#review-btn").addEventListener("click", () => { enterGame(); });
  $("#copy-btn").addEventListener("click", () => {
    const line = ROUTE.map((s) => (state.answers[s.id] && state.answers[s.id].ok ? "🟧" : "⬛")).join("");
    const ws = myWords();
    const txt = `PO POTEH ROMANA 🏍️ 60\nEkipa: ${state.name}\nTočke: ${score()}/${MAX}\nČas: ${fmtTime(elapsed())}\n${rank(score())}\n${line}` + (ws ? `\nRoman v besedah: ${ws}` : "");
    const done = () => { const n = $("#copy-note"); n.hidden = false; n.textContent = "Rezultat kopiran – prilepi ga v skupinski klepet."; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(() => fallbackCopy(txt, done));
    else fallbackCopy(txt, done);
  });
  function fallbackCopy(txt, done) {
    const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { const n = $("#copy-note"); n.hidden = false; n.textContent = txt; }
    ta.remove();
  }
  $("#reset-btn").addEventListener("click", () => { $("#confirm").hidden = false; $("#confirm-no").focus(); });
  $("#confirm-no").addEventListener("click", () => { $("#confirm").hidden = true; });
  $("#confirm-yes").addEventListener("click", () => {
    state = { name: "", answers: {}, started: false, finished: false }; save();
    location.reload();
  });

  /* konfeti v KTM barvah */
  function confetti() {
    const c = $("#confetti"), ctx = c.getContext("2d");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const cols = ["#FF6600", "#FF8A2B", "#000000", "#F5F2ED"];
    const P = Array.from({ length: 160 }, () => ({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6, w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, vy: 2 + Math.random() * 3.5, vx: -1 + Math.random() * 2, r: Math.random() * 6, vr: -0.2 + Math.random() * 0.4, c: cols[(Math.random() * cols.length) | 0] }));
    const t0 = performance.now();
    (function f(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      P.forEach((p) => { p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (t - t0 < 6000) requestAnimationFrame(f); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  /* toast */
  let toastT;
  function toast(msg, bad) {
    const t = $("#toast"); t.textContent = msg; t.classList.toggle("bad", !!bad); t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1600);
  }

  /* ---------- lestvica v živo ---------- */
  function newId() {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function progressString() { return ROUTE.map((s) => (state.answers[s.id] ? (state.answers[s.id].ok ? "1" : "0") : "-")).join(""); }
  function myWords() { return ROUTE.filter((s) => s.type === "words").map((s) => (state.answers[s.id] || {}).words).filter(Boolean).join(", "); }

  /* oblak besed na cilju: besede vseh ekip (z lestvice) ali vsaj lastne */
  let cloudUnsub = null;
  function drawCloud(list) {
    const box = $("#word-cloud"); box.innerHTML = "";
    const mine = new Set(splitWords(myWords()).map((w) => w.toLowerCase()));
    list.forEach((it) => {
      const el = document.createElement("span");
      el.className = "word-chip" + (mine.has(it.key) ? " mine" : "");
      el.style.fontSize = Math.min(15 + (it.count - 1) * 5, 34) + "px";
      el.textContent = it.word + (it.count > 1 ? " ×" + it.count : "");
      box.appendChild(el);
    });
    $("#words-board").hidden = list.length === 0;
  }
  function startCloud() {
    drawCloud(LB.cloud([{ words: myWords() }]));
    if (!LB.enabled || cloudUnsub) return;
    cloudUnsub = LB.subscribe((teams) => {
      const list = teams.some((t) => t.id === state.teamId) ? teams : teams.concat([{ words: myWords() }]);
      drawCloud(LB.cloud(list));
      $("#word-note").textContent = "Besede vseh ekip – osvežuje se v živo.";
    });
  }

  function pushTeam() {
    if (!window.LB || !state.teamId || !state.startedAt) return;
    LB.push(state.teamId, {
      name: state.name, score: score(), answered: doneCount(), total: ROUTE.length,
      progress: progressString(), startedAt: state.startedAt, finishedAt: state.finishedAt || null, updatedAt: Date.now(),
      words: myWords() || null,
    });
  }
  let boardTeams = [], boardUnsub = null, boardTick = null, boardPrev = {};
  function boardStatus(st) {
    const map = { live: "V živo", poll: "V živo", offline: "Ni povezave – poskušam znova", off: "Lestvica ni povezana" };
    $("#board-status").textContent = map[st] || "V živo";
    $("#board-dot").classList.toggle("on", st === "live" || st === "poll");
  }
  function renderBoard() {
    const list = LB.rank(boardTeams), ol = $("#board-list");
    $("#board-empty").hidden = list.length > 0 || !LB.enabled;
    ol.innerHTML = "";
    list.forEach((t, i) => {
      const li = document.createElement("li");
      const done = !!t.finishedAt;
      li.className = "board-row" + (t.id === state.teamId ? " me" : "") + (done ? " done" : "");
      const prog = String(t.progress || "").padEnd(t.total || ROUTE.length, "-");
      li.innerHTML = `<span class="pos">${i + 1}</span><div class="who"><b></b><span class="dots">${[...prog].map((c) => `<i class="${c === "1" ? "y" : c === "0" ? "n" : ""}"></i>`).join("")}</span></div><span class="pts">${t.score || 0}</span><span class="tm">${fmtTime(t.time)}<small>${done ? "cilj" : "etapa " + Math.min((t.answered || 0) + 1, t.total || ROUTE.length)}</small></span>`;
      li.querySelector("b").textContent = t.name;
      if (t.words) { const w = document.createElement("span"); w.className = "row-words"; w.textContent = "»" + t.words + "«"; li.querySelector(".who").appendChild(w); }
      const sig = (t.score || 0) + "/" + (t.answered || 0);
      if (boardPrev[t.id] && boardPrev[t.id] !== sig) li.classList.add("flash");
      boardPrev[t.id] = sig;
      ol.appendChild(li);
    });
  }
  let boardReturn = null;
  function openBoard() {
    boardReturn = document.activeElement;
    $("#board").hidden = false; $("#board").scrollTop = 0;
    if (!LB.enabled) {
      boardStatus("off");
      $("#board-list").innerHTML = '<li class="hint">Organizator še ni povezal skupne lestvice (config.js). Tvoji točke in čas se vseeno beležijo na tem telefonu.</li>';
    } else if (!boardUnsub) {
      boardStatus("offline");
      boardUnsub = LB.subscribe((teams) => { boardTeams = teams; renderBoard(); }, boardStatus);
    } else renderBoard();
    clearInterval(boardTick); boardTick = setInterval(() => { if (LB.enabled && boardTeams.length) renderBoard(); }, 1000);
    setTimeout(() => $("#board-close").focus(), 30);
  }
  function closeBoard() {
    $("#board").hidden = true; clearInterval(boardTick);
    if (boardUnsub) { boardUnsub(); boardUnsub = null; }
    if (boardReturn && boardReturn.focus) boardReturn.focus();
  }
  document.querySelectorAll("[data-open-board]").forEach((b) => b.addEventListener("click", openBoard));
  $("#board-close").addEventListener("click", closeBoard);
  $("#board").addEventListener("click", (e) => { if (e.target.id === "board") closeBoard(); });

  /* ---------- kje sem (GPS) ---------- */
  let me = null, meMarker = null, watchId = null, firstFix = true;
  function dist(a, b) {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    const m = 2 * R * Math.asin(Math.sqrt(x));
    return m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(1).replace(".", ",") + " km";
  }
  $("#locate-btn").addEventListener("click", () => {
    if (!("geolocation" in navigator)) { toast("GPS ni na voljo", true); return; }
    if (watchId !== null) { if (me) map.flyTo([me.lat, me.lng], 17, { duration: 0.7 }); return; }
    $("#locate-btn").classList.add("is-on");
    firstFix = true;
    watchId = navigator.geolocation.watchPosition((p) => {
      me = { lat: p.coords.latitude, lng: p.coords.longitude };
      if (!meMarker) meMarker = L.marker([me.lat, me.lng], { icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
      else meMarker.setLatLng([me.lat, me.lng]);
      if (firstFix) { firstFix = false; map.flyTo([me.lat, me.lng], 17, { duration: 0.7 }); }
    }, () => {
      toast("Dovoli dostop do lokacije", true);
      $("#locate-btn").classList.remove("is-on");
      if (watchId !== null) navigator.geolocation.clearWatch(watchId); watchId = null;
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
  });

  /* ---------- navodila ---------- */
  /* interaktivni vodič: kartice, prestave, poteg s prstom, tipkovnica */
  const gTrack = $("#guide-track"), gSlides = [...gTrack.children], gN = gSlides.length, gGears = $("#guide-gears");
  let gi = 0;
  gSlides.forEach((sl, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "tab");
    b.setAttribute("aria-label", i < gN - 1 ? "Pravilo " + (i + 1) : "Kdo zmaga");
    b.innerHTML = `<span>${i < gN - 1 ? i + 1 : "C"}</span>`;
    b.addEventListener("click", () => guideGo(i));
    gGears.appendChild(b);
  });
  function guideGo(i, quiet) {
    gi = Math.max(0, Math.min(gN - 1, i));
    gTrack.style.transform = `translateX(${-gi * 100}%)`;
    gSlides.forEach((sl, j) => {
      const on = j === gi;
      if (on) { sl.classList.remove("is-active"); void sl.offsetWidth; sl.classList.add("is-active"); sl.scrollTop = 0; }
      else sl.classList.remove("is-active");
      sl.setAttribute("aria-hidden", String(!on)); sl.inert = !on;
    });
    [...gGears.children].forEach((b, j) => { b.classList.toggle("on", j === gi); b.classList.toggle("done", j < gi); b.setAttribute("aria-selected", String(j === gi)); });
    const last = gi === gN - 1;
    $("#guide-prev").disabled = gi === 0;
    $("#guide-next").hidden = last; $("#help-ok").hidden = !last;
    $("#guide-count").textContent = last ? "Pripravljeni?" : `Pravilo ${gi + 1} / ${gN - 1}`;
    if (!quiet) buzz(8);
  }
  $("#guide-next").addEventListener("click", () => guideGo(gi + 1));
  $("#guide-prev").addEventListener("click", () => guideGo(gi - 1));
  (function swipe() {
    const vp = $("#guide-viewport");
    let sx = null, sy = 0, dx = 0, horiz = null;
    vp.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; dx = 0; horiz = null; });
    vp.addEventListener("pointermove", (e) => {
      if (sx === null) return;
      const mx = e.clientX - sx, my = e.clientY - sy;
      if (horiz === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horiz = Math.abs(mx) > Math.abs(my);
      if (!horiz) return;
      // na robovih upor (kot gumijast trak)
      dx = (gi === 0 && mx > 0) || (gi === gN - 1 && mx < 0) ? mx * 0.3 : mx;
      gTrack.classList.add("dragging");
      gTrack.style.transform = `translateX(calc(${-gi * 100}% + ${dx}px))`;
    });
    const end = () => {
      if (sx === null) return;
      gTrack.classList.remove("dragging");
      if (horiz) guideGo(Math.abs(dx) > 50 ? gi + (dx < 0 ? 1 : -1) : gi, Math.abs(dx) <= 50);
      sx = null; horiz = null;
    };
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => vp.addEventListener(ev, end));
  })();

  let helpReturn = null;
  function openHelp() {
    helpReturn = document.activeElement;
    $("#help").hidden = false;
    guideGo(0, true);
    setTimeout(() => $("#guide-next").focus(), 30);
  }
  function closeHelp() { $("#help").hidden = true; if (helpReturn && helpReturn.focus) helpReturn.focus(); }
  document.querySelectorAll("[data-open-help]").forEach((b) => b.addEventListener("click", openHelp));
  $("#help-close").addEventListener("click", closeHelp);
  $("#help-ok").addEventListener("click", closeHelp);
  $("#help").addEventListener("click", (e) => { if (e.target.id === "help") closeHelp(); });
  document.addEventListener("keydown", (e) => {
    if ($("#help").hidden) return;
    if (e.key === "ArrowRight") { e.preventDefault(); guideGo(gi + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); guideGo(gi - 1); }
  });

  /* ---------- PWA ---------- */
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; $("#install-btn").hidden = false; });
  $("#install-btn").addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $("#install-btn").hidden = true; });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (isIOS && !standalone) $("#ios-hint").hidden = false;
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {}));
    // ko se namesti nova različica, stran samodejno osveži (enkrat)
    let reloaded = false; const hadController = !!navigator.serviceWorker.controller; // ob prvem obisku ne osvežuj
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (reloaded || !hadController) return; reloaded = true; location.reload(); });
  }

  initIntro();
})();
