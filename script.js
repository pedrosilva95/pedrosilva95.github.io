(() => {
  const $ = (id) => document.getElementById(id);

  /* =========================
     VIEWPORT / SCALE SYSTEM
     - --app-h: altura estável (evita "saltos" quando a barra do browser muda)
     - --dvh/--dvw: viewport atual (pode variar)
     - --scale: min(vw/designW, appH/designH) com clamp
     ========================= */
  const DESIGN_W = 390;
  const DESIGN_H = 844;
  const SCALE_MIN = 0.85;
  const SCALE_MAX = 1.25;

  let stableH = null;   // “small viewport height” (baseline)
  let lastW = null;
  let rafVp = 0;

  const getViewport = () => {
    const vv = window.visualViewport;
    if (vv) {
      return {
        width: vv.width,
        height: vv.height,
        offsetLeft: vv.offsetLeft || 0,
        offsetTop: vv.offsetTop || 0,
      };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetLeft: 0,
      offsetTop: 0,
    };
  };

  let lastGood = { w: window.innerWidth, h: window.innerHeight };

  function updateViewportVars({ forceReset = false } = {}) {
    const root = document.documentElement;

    const vv = window.visualViewport;
    const layoutW = Math.round(document.documentElement.clientWidth || window.innerWidth);
    const layoutH = Math.round(document.documentElement.clientHeight || window.innerHeight);

    // usamos visualViewport quando existe, mas com "guard rails"
    let w = Math.round((vv && vv.width) ? vv.width : layoutW);
    let h = Math.round((vv && vv.height) ? vv.height : layoutH);

    // ✅ Android durante rotação pode dar valores minúsculos (1..100). Ignora.
    if (w < 240 || h < 240) {
      w = lastGood.w;
      h = lastGood.h;
    } else {
      lastGood = { w, h };
    }

    // ✅ app-h: usa layout viewport (mais estável) com guarda
    let appH = layoutH;
    if (appH < 240) appH = lastGood.h;

    root.style.setProperty("--dvw", `${w}px`);
    root.style.setProperty("--dvh", `${h}px`);
    root.style.setProperty("--app-h", `${appH}px`);
    root.style.setProperty("--dpr", String(window.devicePixelRatio || 1));

    const s = Math.min(w / DESIGN_W, appH / DESIGN_H);
    const clamped = Math.max(SCALE_MIN, Math.min(s, SCALE_MAX));
    root.style.setProperty("--scale", clamped.toFixed(4));
  }


  function scheduleViewportUpdate(opts) {
    if (rafVp) cancelAnimationFrame(rafVp);
    rafVp = requestAnimationFrame(() => {
      rafVp = 0;
      updateViewportVars(opts);
    });
  }

  const cssTimeToMs = (v) => {
    v = String(v || "").trim();
    if (!v) return 0;
    if (v.endsWith("ms")) return parseFloat(v) || 0;
    if (v.endsWith("s")) return (parseFloat(v) || 0) * 1000;
    return parseFloat(v) || 0;
  };

  const parseRatio = (str) => {
    const parts = String(str).split("/").map((s) => parseFloat(s.trim()));
    if (parts.length !== 2 || !isFinite(parts[0]) || !isFinite(parts[1]) || parts[1] === 0) return null;
    return parts[0] / parts[1];
  };

  function setMaskFromCSS() {
    const root = document.documentElement;
    const cs = getComputedStyle(root);

    const clip = document.querySelector(".fx-clip");
    const clipRect = clip ? clip.getBoundingClientRect() : { width: 0, height: 0 };

    const arStr = cs.getPropertyValue("--card-ar").trim() || "3 / 4";
    const ratio = parseRatio(arStr) || 3 / 4;

    const vbW = 100;
    const vbH = vbW / ratio;

    const cardWpx = clipRect.width || 300;
    const cardHpx = clipRect.height || (300 / ratio);

    // ✅ notch por rácio (estável) em vez de cm/px fixos
    const notchWr = parseFloat(cs.getPropertyValue("--notch-w-r").trim()) || 0.195;
    const notchHr = parseFloat(cs.getPropertyValue("--notch-h-r").trim()) || 0.05;

    const notchWpx = cardWpx * notchWr;
    const notchHpx = cardHpx * notchHr;

    const rx = (notchWpx / cardWpx) * vbW * 0.5;
    const ry = (notchHpx / cardHpx) * vbH * 0.5;

    const rxf = rx.toFixed(3);
    const ryf = ry.toFixed(3);
    const dx = (2 * rx).toFixed(3);

    const corner = parseFloat(cs.getPropertyValue("--mask-corner").trim()) || 14;
    const topR = parseFloat(cs.getPropertyValue("--mask-topr").trim()) || corner;

    const H = vbH.toFixed(3);
    const Hm = (vbH - topR).toFixed(3);

    const path =
`M${corner} 0 H${vbW - corner} Q${vbW} 0 ${vbW} ${topR}
 V${Hm} Q${vbW} ${H} ${vbW - corner} ${H}
 H${corner} Q0 ${H} 0 ${Hm}
 V${topR} Q0 0 ${corner} 0 Z
 M50 0 m-${rxf} 0 a${rxf} ${ryf} 0 1 0 ${dx} 0 a${rxf} ${ryf} 0 1 0 -${dx} 0 Z
 M50 ${H} m-${rxf} 0 a${rxf} ${ryf} 0 1 0 ${dx} 0 a${rxf} ${ryf} 0 1 0 -${dx} 0 Z`;

    const maskSvg =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="none">
  <path fill="white" fill-rule="evenodd" d="${path}"/>
</svg>`;

    root.style.setProperty("--fx-mask", `url("data:image/svg+xml,${encodeURIComponent(maskSvg)}")`);
  }

  function buildSlices(fxSlicesEl) {
    if (!fxSlicesEl) return;
    fxSlicesEl.innerHTML = "";

    const cs = getComputedStyle(document.documentElement);
    const slices = Math.max(1, parseInt(cs.getPropertyValue("--slices"), 10) || 5);
    const src = fxSlicesEl.dataset.sliceSrc || "only_foto.png";

    document.documentElement.style.setProperty("--slicesMinus1", String(Math.max(0, slices - 1)));

    for (let i = 0; i < slices; i++) {
      const slice = document.createElement("div");
      slice.className = "fx-slice";
      slice.style.setProperty("--i", String(i));
      slice.dataset.i = String(i);

      const band = document.createElement("div");
      band.className = "fx-band";
      band.style.setProperty("--i", String(i));
      band.dataset.i = String(i);

      const img = document.createElement("img");
      img.src = src;
      img.alt = "";

      band.appendChild(img);
      slice.appendChild(band);
      fxSlicesEl.appendChild(slice);
    }
  }

  function computeAutoPad(cardW, cardH) {
    const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;

    const px = 0.005 * cardW;
    const py = 0.005 * cardH;

    const minInner = 48 * scale;
    const capX = Math.max(0, (cardW - minInner) / 2);
    const capY = Math.max(0, (cardH - minInner) / 2);

    return { px: Math.min(px, capX), py: Math.min(py, capY) };
  }

  function applyAutoPadding(envelopeEl) {
    const card = envelopeEl?.querySelector?.(".env-card");
    const img = envelopeEl?.querySelector?.(".env-card-img");
    if (!card || !img) return;

    const doCalc = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      envelopeEl.style.setProperty("--env-card-ar", `${img.naturalWidth} / ${img.naturalHeight}`);

      const r = card.getBoundingClientRect();
      const cardW = r.width;
      const cardH = r.height;
      if (cardW <= 0 || cardH <= 0) return;

      const { px, py } = computeAutoPad(cardW, cardH);

      envelopeEl.style.setProperty("--card-pad-x", `${px.toFixed(2)}px`);
      envelopeEl.style.setProperty("--card-pad-y", `${py.toFixed(2)}px`);
    };

    if (img.complete) doCalc();
    else img.addEventListener("load", doCalc, { once: true });

    requestAnimationFrame(() => requestAnimationFrame(doCalc));
  }

  function wireCalendarAndMaps() {
    const EVENT = {
      title: "Casamento Débora & Pedro",
      location: "Igreja Paroquial Vilar de Mouros",
      startISO: "2026-07-31T12:00:00", // horário LOCAL do evento
      endISO: "2026-08-01T03:00:00",   // horário LOCAL do evento
      timeZone: "Europe/Lisbon",
      mapsUrl: "https://maps.google.com/?q=Igreja+Paroquial+Vilar+de+Mouros",
      backLink: "https://we.are.planning.wedding/debora-e-pedro",
    };

    const btnCalendar = $("btnCalendar");
    const btnSite = $("btnSite");

    // --- Platform detection (robusto p/ iOS + iPadOS “MacIntel”) ---
    const detectPlatform = () => {
      const ua = navigator.userAgent || "";
      const platform = navigator.userAgentData?.platform || navigator.platform || "";
      const maxTouch = navigator.maxTouchPoints || 0;

      const isIOS =
        /iPad|iPhone|iPod/i.test(ua) ||
        (platform === "MacIntel" && maxTouch > 1); // iPadOS 13+

      const isAndroid = /Android/i.test(ua);
      const isMobile = isIOS || isAndroid || /Mobi/i.test(ua);

      return { isIOS, isAndroid, isMobile };
    };

    // --- Helpers timezone-safe: interpretar hora em Europe/Lisbon ---
    const dtfForTZ = (timeZone) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

    const partsToObj = (parts) => {
      const out = {};
      for (const p of parts) if (p.type !== "literal") out[p.type] = p.value;
      return out;
    };

    // Converte "YYYY-MM-DDTHH:mm:ss" assumido como hora local do EVENT.timeZone
    // para um Date em UTC (mesmo que o utilizador esteja noutra timezone).
    const zonedTimeToUtc = (isoLocal, timeZone) => {
      const [datePart, timePart = "00:00:00"] = isoLocal.split("T");
      const [y, m, d] = datePart.split("-").map(Number);
      const [hh, mm, ss = 0] = timePart.split(":").map(Number);

      // chute inicial: tratar como UTC
      let utc = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
      const fmt = dtfForTZ(timeZone);

      // 1ª correção
      const p1 = partsToObj(fmt.formatToParts(utc));
      const asIfUtc1 = Date.UTC(
        Number(p1.year),
        Number(p1.month) - 1,
        Number(p1.day),
        Number(p1.hour),
        Number(p1.minute),
        Number(p1.second)
      );
      const desiredAsIfUtc = Date.UTC(y, m - 1, d, hh, mm, ss);
      utc = new Date(utc.getTime() + (desiredAsIfUtc - asIfUtc1));

      // 2ª correção (ajuda em transições DST)
      const p2 = partsToObj(fmt.formatToParts(utc));
      const asIfUtc2 = Date.UTC(
        Number(p2.year),
        Number(p2.month) - 1,
        Number(p2.day),
        Number(p2.hour),
        Number(p2.minute),
        Number(p2.second)
      );
      const diff2 = desiredAsIfUtc - asIfUtc2;
      if (diff2) utc = new Date(utc.getTime() + diff2);

      return utc;
    };

    const pad2 = (n) => String(n).padStart(2, "0");
    const toICSDateUTC = (dateUTC) =>
      dateUTC.getUTCFullYear() +
      pad2(dateUTC.getUTCMonth() + 1) +
      pad2(dateUTC.getUTCDate()) +
      "T" +
      pad2(dateUTC.getUTCHours()) +
      pad2(dateUTC.getUTCMinutes()) +
      pad2(dateUTC.getUTCSeconds()) +
      "Z";

    const getStartEndUTC = () => {
      const startUtc = zonedTimeToUtc(EVENT.startISO, EVENT.timeZone);
      const endUtc = zonedTimeToUtc(EVENT.endISO, EVENT.timeZone);
      return { startUtc, endUtc };
    };

    const makeICS = () => {
      const { startUtc, endUtc } = getStartEndUTC();
      const uid = `invite-${Date.now()}@convite`;

      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Convite//PT//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${toICSDateUTC(new Date())}`,
        `DTSTART:${toICSDateUTC(startUtc)}`,
        `DTEND:${toICSDateUTC(endUtc)}`,
        `SUMMARY:${EVENT.title}`,
        `LOCATION:${EVENT.location}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
    };

    const openGoogleCalendar = () => {
      const { startUtc, endUtc } = getStartEndUTC();
      const url = new URL("https://calendar.google.com/calendar/render");
      url.searchParams.set("action", "TEMPLATE");
      url.searchParams.set("text", EVENT.title);
      url.searchParams.set("location", EVENT.location);
      url.searchParams.set("dates", `${toICSDateUTC(startUtc)}/${toICSDateUTC(endUtc)}`);

      const w = window.open(url.toString(), "_blank", "noopener,noreferrer");
      if (!w) window.location.href = url.toString(); // fallback se pop-up for bloqueado
    };

    const downloadICS = () => {
      const blob = new Blob([makeICS()], { type: "text/calendar;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "convite.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };

    if (btnCalendar) {
      btnCalendar.addEventListener("click", (e) => {
        e.preventDefault();
        const p = detectPlatform();

        // ✅ Fluxo por plataforma:
        // iOS/iPadOS: .ics (nativo e mais “suave”)
        // Android/Desktop: Google Calendar (mais direto)
        if (p.isIOS) downloadICS();
        else openGoogleCalendar();
      });
    }

    if (btnSite) {
      btnSite.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(EVENT.backLink, "_blank", "noopener,noreferrer");
      });
    }
  }


  document.addEventListener("DOMContentLoaded", () => {
    // inicializa viewport vars cedo (evita layout “errado” no primeiro paint em mobile)
    updateViewportVars({ forceReset: true });

    // mantém atualizado (inclui iOS/Android antigos com fallback)
    window.addEventListener("resize", () => scheduleViewportUpdate(), { passive: true });
    window.addEventListener("orientationchange", () => {
      scheduleViewportUpdate({ forceReset: true });
      setTimeout(() => scheduleViewportUpdate({ forceReset: true }), 120);
      setTimeout(() => scheduleViewportUpdate({ forceReset: true }), 420);
    }, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => scheduleViewportUpdate(), { passive: true });
      // útil quando a barra do browser altera a área visível
      window.visualViewport.addEventListener("scroll", () => scheduleViewportUpdate(), { passive: true });
    }

    const hero = $("hero");
    const tapHint = $("tapHint");
    const envelopeBtn = $("envelopeBtn");

    const cover = $("cover");
    const coverStage = $("coverStage");
    const coverHandle = $("coverHandle");
    const fxSlices = $("fxSlices");

    const flipSection = $("flipSection");
    const flipInner = $("flipInner");
    const flipStage = $("flipStage");

    buildSlices(fxSlices);
    setMaskFromCSS();

    const rootCSS = getComputedStyle(document.documentElement);
    const FLAP_MS = cssTimeToMs(rootCSS.getPropertyValue("--dur-flap"));
    const PREVIEW_MS = cssTimeToMs(rootCSS.getPropertyValue("--dur-preview"));
    const CARD_MS = cssTimeToMs(rootCSS.getPropertyValue("--dur-card"));
    const EXIT_ENV_MS = cssTimeToMs(rootCSS.getPropertyValue("--dur-exit-env")) || 520;
    const EXIT_CARD_MS = cssTimeToMs(rootCSS.getPropertyValue("--dur-exit-card")) || 900;
    const EXIT_MS = Math.max(EXIT_ENV_MS, EXIT_CARD_MS);
    const FX_DELAY = cssTimeToMs(rootCSS.getPropertyValue("--fx-delay"));
    const DUR_CORTINA = cssTimeToMs(rootCSS.getPropertyValue("--dur-cortina"));

    let opened = false;
    let coverReady = false;
    let fxStarted = false;

    const envelopeEl =
      envelopeBtn?.closest?.(".envelope") ||
      (envelopeBtn?.classList?.contains("envelope") ? envelopeBtn : null);

    if (envelopeEl) applyAutoPadding(envelopeEl);
    window.addEventListener(
      "load",
      () => {
        if (envelopeEl) applyAutoPadding(envelopeEl);
        // recalc máscara com assets já carregados + viewport estável
        setMaskFromCSS();
      },
      { passive: true }
    );

    let detachedCard = null;

    function syncCoverStartFromCard(cardRect) {
      if (!cardRect || !cover) return;

      const fxClip = cover.querySelector(".fx-clip");
      if (!fxClip) return;

      const root = document.documentElement;

      const prevStart = getComputedStyle(root).getPropertyValue("--cover-zoom-start").trim();
      root.style.setProperty("--cover-zoom-start", "1");

      void fxClip.offsetWidth;

      const target = fxClip.getBoundingClientRect();
      if (!target.width || !target.height) {
        root.style.setProperty("--cover-zoom-start", prevStart || "1");
        return;
      }

      const rw = cardRect.width / target.width;
      const rh = cardRect.height / target.height;
      const s = Math.min(rw, rh);

      root.style.setProperty("--cover-zoom-start", s.toFixed(4));
    }

    function showCover() {
      document.body.classList.remove("fx-run", "fx-end");
      fxStarted = false;
      coverReady = false;

      if (!cover) return;

      cover.classList.remove("lock-zoom");
      cover.hidden = false;
      cover.classList.remove("active");
      if (coverHandle) coverHandle.disabled = true;

      // garante vars atualizadas antes de medir
      updateViewportVars();
      setMaskFromCSS();

      if (detachedCard) {
        const r = detachedCard.getBoundingClientRect();
        syncCoverStartFromCard(r);
        detachedCard.style.opacity = "0";
      }

      void cover.offsetWidth;

      cover.classList.add("active");

      if (!coverStage) {
        coverReady = true;
        if (coverHandle) coverHandle.disabled = false;
        return;
      }

      const rootCSS = getComputedStyle(document.documentElement);
      const COVER_ZOOM_MS = cssTimeToMs(rootCSS.getPropertyValue("--cover-zoom-dur")) || 1500;

      let fallbackTimer = setTimeout(() => {
        coverReady = true;
        if (coverHandle) coverHandle.disabled = false;
      }, COVER_ZOOM_MS + 120);

      const onEnd = (e) => {
        if (e.propertyName !== "transform") return;
        clearTimeout(fallbackTimer);
        coverStage.removeEventListener("transitionend", onEnd);
        coverReady = true;
        if (coverHandle) coverHandle.disabled = false;
      };
      coverStage.addEventListener("transitionend", onEnd, { passive: true });


      if (flipSection) {
        flipSection.classList.remove("active");
        flipSection.hidden = true;
      }
    }

    function goToFinalText() {
      if (flipSection) {
        flipSection.hidden = false;
        void flipSection.offsetWidth;
        flipSection.classList.add("active");
      }

      flipInner?.classList.remove("is-flipped");
      flipStage?.classList.remove("is-flipped");

      if (cover) {
        const onEnd = (e) => {
          if (e.propertyName !== "opacity") return;
          cover.removeEventListener("transitionend", onEnd);
          cover.hidden = true;
        };
        cover.addEventListener("transitionend", onEnd);

        // ✅ não esconder já (senão mata o fade-out)
        cover.classList.add("lock-zoom");
        void cover.offsetWidth;
        cover.classList.remove("active");
      }
    }

    function startFx() {
      if (!coverReady || fxStarted) return;
      fxStarted = true;
      if (coverHandle) coverHandle.disabled = true;

      setTimeout(() => {
        document.body.classList.add("fx-run");
        setTimeout(() => {
          document.body.classList.add("fx-end");
          goToFinalText();
        }, DUR_CORTINA);
      }, FX_DELAY);
    }

    if (envelopeEl) {
      envelopeEl.addEventListener("click", (e) => {
        e.preventDefault();
        if (opened) return;
        opened = true;

        if (tapHint) {
          tapHint.style.opacity = "0";
          tapHint.style.transform = "translateX(-50%) translateY(-6px)";
        }

        const preview = getComputedStyle(document.documentElement)
          .getPropertyValue("--card-preview")
          .trim();
        if (preview) envelopeEl.style.setProperty("--card-start", preview);

        applyAutoPadding(envelopeEl);

        envelopeEl.classList.add("open-flap", "reveal-card");

        setTimeout(() => envelopeEl.classList.add("preview-card"), FLAP_MS + 20);
        setTimeout(() => envelopeEl.classList.add("pull-card"), FLAP_MS + PREVIEW_MS + 40);

        const tPullEnd = FLAP_MS + PREVIEW_MS + CARD_MS;

        setTimeout(() => {
          envelopeEl.classList.add("exit");
          envelopeEl.classList.remove("pull-card");
        }, tPullEnd + 60);

        setTimeout(() => {
          const card = envelopeEl.querySelector(".env-card");
          if (card) {
            const r = card.getBoundingClientRect();

            hero?.appendChild(card);
            card.classList.add("detached");
            detachedCard = card;

            card.style.position = "fixed";
            card.style.left = `${r.left}px`;
            card.style.top = `${r.top}px`;
            card.style.width = `${r.width}px`;
            card.style.height = `${r.height}px`;
            card.style.margin = "0";
            card.style.transform = "none";

            card.style.setProperty("--card-move-dur", `${EXIT_CARD_MS}ms`);

            // ✅ usa visualViewport (quando existe) para centrar no "visível"
            const vp = getViewport();
            const cx = vp.offsetLeft + vp.width / 2;
            const cy = vp.offsetTop + vp.height / 2;

            const dx = cx - (r.left + r.width / 2);
            const dy = cy - (r.top + r.height / 2);

            requestAnimationFrame(() => {
              card.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
            });
          }

          envelopeEl.classList.add("exit");
        }, tPullEnd + 60);

        setTimeout(() => {
          showCover();
          setTimeout(() => hero?.remove(), 300);
        }, tPullEnd + 60 + EXIT_MS + 80);
      });
    }

    if (coverHandle) {
      coverHandle.addEventListener("click", (e) => {
        e.preventDefault();
        startFx();
      });
    }

    if (flipStage) {
      flipStage.addEventListener("click", (e) => {
        if (e.target.closest(".back-actions, a, button")) return;
        flipInner?.classList.toggle("is-flipped");
        flipStage.classList.toggle("is-flipped", flipInner?.classList.contains("is-flipped"));
      });
    }

    // refresh completo em resize (tamanho/orientação)
    const refreshLayout = () => {
      updateViewportVars();
      buildSlices(fxSlices);
      setMaskFromCSS();
      if (envelopeEl) applyAutoPadding(envelopeEl);
    };

    window.addEventListener("resize", refreshLayout, { passive: true });
    if (window.visualViewport) window.visualViewport.addEventListener("resize", refreshLayout, { passive: true });

    wireCalendarAndMaps();
  });
})();
