/* =========================================================
   ENGINE SOUND – sintetiziran zvok V-twin motorja (brez datotek)
   Zaganjač → motor prime → navijanje na mestu → pokanje izpuha → prosti tek.
   Zvok se izračuna vzorec za vzorcem: vsak vžig v valju sproži udarec
   v izpuhu, ki odzvanja v nizkih resonancah (globina) in šumu (hrup).
   ========================================================= */
window.EngineSound = (function () {
  "use strict";

  // [čas s, obrati rpm, plin 0..1]
  const KF = [
    [0.00, 230, 0], [0.70, 280, 0],            // zaganjač vrti motor
    [0.80, 2000, 0.7], [0.95, 1500, 0.15],     // prime!
    [1.02, 1500, 0.95], [1.22, 9500, 1],       // 1. navijanje
    [1.26, 9300, 0], [1.55, 3600, 0],          // spust + pokanje
    [1.60, 3600, 1], [1.90, 12000, 1],         // 2. navijanje do rdečega
    [1.94, 11800, 0], [2.45, 2100, 0],         // dolg spust + pokanje
    [2.55, 2600, 0.5], [2.62, 5200, 0.8],      // kratek "brm"
    [2.68, 5000, 0], [2.95, 1550, 0.12],
    [3.70, 1350, 0.1], [4.10, 1300, 0]         // prosti tek, utihne
  ];
  const DUR = 4.1, STARTER_END = 0.76;

  function at(t, idx) {
    if (t <= KF[0][0]) return KF[0][idx];
    for (let i = 1; i < KF.length; i++) {
      if (t <= KF[i][0]) {
        const a = KF[i - 1], b = KF[i], u = (t - a[0]) / (b[0] - a[0]);
        // rast obratov hitro (ease-out), padec počasneje (ease-in-out)
        const e = idx === 1 && b[1] > a[1] ? 1 - Math.pow(1 - u, 2.2) : u * u * (3 - 2 * u);
        return a[idx] + (b[idx] - a[idx]) * e;
      }
    }
    return KF[KF.length - 1][idx];
  }
  const rpmAt = (t) => at(t, 1);
  const throttleAt = (t) => at(t, 2);

  // resonator (dvopolni filter) – odzvanjanje izpuha na določeni frekvenci
  function reso(fs, f, bw) {
    const r = Math.exp(-Math.PI * bw / fs), c = 2 * r * Math.cos(2 * Math.PI * f / fs), r2 = r * r;
    let y1 = 0, y2 = 0;
    return (x) => { const y = x + c * y1 - r2 * y2; y2 = y1; y1 = y; return y * (1 - r); };
  }

  function render(fs) {
    fs = fs || 44100;
    const N = Math.floor(DUR * fs), out = new Float32Array(N);
    // nizka "trebušna" resonanca, srednji lajež, višji rezek ton
    const R1 = reso(fs, 62, 26), R1b = reso(fs, 95, 40), R2 = reso(fs, 175, 70), R3 = reso(fs, 430, 220), R4 = reso(fs, 1100, 600);
    let rand = 12345;
    const rnd = () => ((rand = (rand * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    let crank = 0, prevCycle = 0, rpmS = 230;
    let exc = 0, pulseA = 0, pulseK = 0, lp2 = 0, noiseEnv = 0, crackEnv = 0, lpN = 0, lpC = 0, prevC = 0, lpOut = 0, hp = 0, prevX = 0;
    let lastRpm = 230, dcIn = 0, dcY = 0, stPh = 0, stLp = 0;
    // V-twin 75°: vžiga pri 0° in 435° v ciklu 720° → neenakomeren, "krompirjev" ritem
    const FIRE = [0, 435 / 720];
    const PL = Math.floor(fs * 0.0045); // dolžina mehkega izpušnega sunka

    for (let n = 0; n < N; n++) {
      const t = n / fs;
      const target = rpmAt(t), thr = throttleAt(t);
      rpmS += (target - rpmS) * 0.0016;               // vztrajnost ročične gredi
      const falling = rpmS < lastRpm - 0.02;
      lastRpm = rpmS;
      const starter = t < STARTER_END;

      crank += (rpmS / 60) / fs;                        // vrtljaji
      const cycle = (crank / 2) % 1;                    // 4-taktni cikel = 2 vrtljaja
      for (const fp of FIRE) {
        const crossed = prevCycle <= cycle ? prevCycle < fp && cycle >= fp : prevCycle < fp || cycle >= fp;
        if (!crossed) continue;
        let A;
        if (starter) A = 1.5 + rnd() * 0.5;           // kompresija med zaganjanjem
        else if (t < 0.86) A = 1.6;                     // prvi vžig – pok
        else A = (0.28 + 0.9 * thr + 0.12 * Math.min(1, rpmS / 6000)) * (0.85 + rnd() * 0.3);
        pulseA = Math.max(pulseA * (1 - pulseK / PL), 0) + A; pulseK = 0;
        noiseEnv = Math.max(noiseEnv, A * (starter ? 0.4 : 0.9));
        // pokanje izpuha pri spuščanju plina
        if (!starter && thr < 0.05 && falling && rpmS > 2300 && rnd() < 0.32) crackEnv = 0.9 + rnd() * 1.4;
      }
      prevCycle = cycle;

      // izpušni udarec skozi resonance
      let x = 0;
      if (pulseA > 0 && pulseK < PL) { const ph = pulseK / PL; x = pulseA * Math.sin(2 * Math.PI * ph) * (ph < 0.5 ? 1 : 0.8) * 0.5; pulseK++; } else pulseA = 0;
      const deep = R1(x) * 1.3 + R1b(x) * 1.0;
      const mid = R2(x) * 0.75;
      const bark = R3(x) * (0.2 + 0.55 * thr) + R4(x) * (0.03 + 0.12 * thr);

      // šum izpuha (svetlejši pri več plina)
      const wn = rnd() * 2 - 1;
      noiseEnv *= Math.exp(-1 / (fs * (0.004 + 0.006 * thr)));
      const cN = 0.03 + 0.12 * thr + 0.03 * Math.min(1, rpmS / 9000);
      lpN += cN * (wn * noiseEnv - lpN);

      // pokanje: kratki ostri poki
      crackEnv *= Math.exp(-1 / (fs * 0.0025));
      const cr = (rnd() * 2 - 1) * crackEnv;
      lpC += 0.5 * (cr - lpC);
      const crack = (lpC - prevC) * 1.4 + lpC * 0.5; prevC = lpC;

      // mehanski šum (ventili, veriga) – zelo tih
      const mech = (rnd() * 2 - 1) * 0.012 * Math.min(1, rpmS / 8000) * (starter ? 0 : 1);

      // zaganjač: cviljenje elektromotorja, ki ga "ustavljajo" kompresije
      let st = 0;
      if (starter) {
        // globoko brnenje zaganjača (zobniki), ki ga kompresija upočasnjuje
        const load = 0.55 + 0.45 * Math.cos(2 * Math.PI * cycle * 2);
        stPh += 2 * Math.PI * (115 + 35 * (t / STARTER_END)) * (0.82 + 0.18 * load) / fs;
        const raw = Math.sin(stPh) * 0.7 + Math.sin(stPh * 2) * 0.18 + Math.sin(stPh * 0.5) * 0.5 + (rnd() * 2 - 1) * 0.08;
        stLp += 0.08 * (raw - stLp);
        st = stLp * 0.16 * load;
        if (t > STARTER_END - 0.05) st *= (STARTER_END - t) / 0.05;
      }

      let s = deep * 1.25 + mid + bark + lpN * 0.35 + crack * 0.7 + mech;
      // odstrani podzvočne ostanke pred nasičenjem
      dcY = 0.9972 * (dcY + s - dcIn); dcIn = s; s = dcY;
      s = Math.tanh(s * 0.17) + st * 1.6;                            // nasičenje = "mesnat" zvok
      // rahlo zaobljenje višin
      lpOut += 0.22 * (s - lpOut); lp2 += 0.3 * (lpOut - lp2);
      // odstrani DC
      hp = 0.9995 * (hp + lp2 - prevX); prevX = lp2;
      out[n] = hp;
    }
    // ovojnica: mehak začetek in izzvenenje
    const fadeIn = Math.floor(0.01 * fs), fadeOut = Math.floor(0.45 * fs);
    for (let n = 0; n < fadeIn; n++) out[n] *= n / fadeIn;
    for (let n = 0; n < fadeOut; n++) out[N - 1 - n] *= n / fadeOut;
    // normalizacija
    let peak = 0; for (let n = 0; n < N; n++) peak = Math.max(peak, Math.abs(out[n]));
    const g = 0.92 / (peak || 1); for (let n = 0; n < N; n++) out[n] *= g;
    return out;
  }

  const cache = {};
  function samples(fs) { return cache[fs] || (cache[fs] = render(fs)); }

  /* predvajanje: globina (lowshelf) + kompresor za polnost */
  function play(ctx) {
    if (!ctx) return 0;
    const fs = ctx.sampleRate, data = samples(fs);
    const buf = ctx.createBuffer(1, data.length, fs);
    buf.getChannelData(0).set(data);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const low = ctx.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 140; low.gain.value = 7;
    const top = ctx.createBiquadFilter(); top.type = "lowpass"; top.frequency.value = 5200; top.Q.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.12;
    const g = ctx.createGain(); g.gain.value = 0.9;
    src.connect(low).connect(top).connect(comp).connect(g).connect(ctx.destination);
    src.start();
    return ctx.currentTime;
  }

  return { play, render, samples, rpmAt, DUR };
})();
