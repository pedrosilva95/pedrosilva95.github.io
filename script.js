(() => {
  const $ = (id) => document.getElementById(id);

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

  const cssLengthToPx = (value) => {
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "-9999px";
    el.style.width = value;
    document.body.appendChild(el);
    const px = el.getBoundingClientRect().width;
    el.remove();
    return px || 0;
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

    const notchWStr = cs.getPropertyValue("--notch-w").trim();
    const notchHStr = cs.getPropertyValue("--notch-h").trim();

    const notchWpx = cssLengthToPx(notchWStr);
    const notchHpx = cssLengthToPx(notchHStr);

    const cardWpx = clipRect.width || 300;
    const cardHpx = clipRect.height || (300 / ratio);

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
  
    if (window.visualViewport) {
      visualViewport.addEventListener("resize", setMaskFromCSS, { passive: true });
      visualViewport.addEventListener("scroll", setMaskFromCSS, { passive: true });
}

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

  function viewportCenter() {
    const vv = window.visualViewport;
    if (vv) {
      return {
        cx: vv.width / 2 + vv.offsetLeft,
        cy: vv.height / 2 + vv.offsetTop,
      };
    }
    return { cx: window.innerWidth / 2, cy: window.innerHeight / 2 };
  }


  /**
   * Padding automático (mais estável):
   * - tenta igualar a “margem visual” total (padding + letterbox do contain)
   * - impõe limites para nunca esmagar a imagem
   */
  function computeAutoPad(cardW, cardH) {
    const px = 0.005 * cardW;
    const py = 0.005 * cardH;

    const minInner = 48;
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

    // re-calc após layout estabilizar
    requestAnimationFrame(() => requestAnimationFrame(doCalc));
  }

  function wireCalendarAndMaps() {
    const EVENT = {
      title: "Casamento Débora & Pedro",
      location: "Igreja Paroquial Vilar de Mouros",
      startISO: "2026-07-31T12:00:00",
      endISO: "2026-08-01T03:00:00",
      mapsUrl: "https://maps.google.com/?q=Igreja+Paroquial+Vilar+de+Mouros",
      backLink: "https://we.are.planning.wedding/debora-e-pedro",
    };

    const btnCalendar = $("btnCalendar");
    const btnSite = $("btnSite");
    const backLink = $("backLink");

    if (backLink) backLink.href = EVENT.backLink;

    const toICSDate = (iso) => {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, "0");
      return (
        d.getUTCFullYear() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) +
        "T" +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) +
        "Z"
      );
    };

    const makeICS = () => {
      const dtStart = toICSDate(EVENT.startISO);
      const dtEnd = toICSDate(EVENT.endISO);
      const uid = `invite-${Date.now()}@convite`;
      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Convite//PT//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${toICSDate(new Date().toISOString())}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${EVENT.title}`,
        `LOCATION:${EVENT.location}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
    };

    const openGoogleCalendar = () => {
      const start = toICSDate(EVENT.startISO);
      const end = toICSDate(EVENT.endISO);
      const url = new URL("https://calendar.google.com/calendar/render");
      url.searchParams.set("action", "TEMPLATE");
      url.searchParams.set("text", EVENT.title);
      url.searchParams.set("location", EVENT.location);
      url.searchParams.set("dates", `${start}/${end}`);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
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
        openGoogleCalendar();
        downloadICS();
      });
    }

    // ✅ Botão "Site": abre o mesmo link que antes estava na imagem (texto2.png)
    if (btnSite) {
      btnSite.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(EVENT.backLink, "_blank", "noopener,noreferrer");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
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

    // padding automático: DOMContentLoaded + window.load (garante)
    if (envelopeEl) applyAutoPadding(envelopeEl);
    window.addEventListener(
      "load",
      () => {
        if (envelopeEl) applyAutoPadding(envelopeEl);
      },
      { passive: true }
    );


    let detachedCard = null;

    function syncCoverStartFromCard(cardRect) {
      if (!cardRect || !cover) return;

      const fxClip = cover.querySelector(".fx-clip");
      if (!fxClip) return;

      const root = document.documentElement;

      // Mede o tamanho "alvo" do fx-clip a escala 1
      const prevStart = getComputedStyle(root).getPropertyValue("--cover-zoom-start").trim();
      root.style.setProperty("--cover-zoom-start", "1");

      // Força layout com start=1
      void fxClip.offsetWidth;

      const target = fxClip.getBoundingClientRect();
      if (!target.width || !target.height) {
        root.style.setProperty("--cover-zoom-start", prevStart || "1");
        return;
      }

      // Calcula escala para o fx-clip ficar do tamanho do cartão final
      const rw = cardRect.width / target.width;
      const rh = cardRect.height / target.height;

      // Escolhe a menor para garantir que não começa maior (evita “pop”)
      const s = Math.min(rw, rh);

      root.style.setProperty("--cover-zoom-start", s.toFixed(4));
    }


    function showCover() {
      document.body.classList.remove("fx-run", "fx-end");
      fxStarted = false;
      coverReady = false;

      if (!cover) return;

      cover.classList.remove("lock-zoom"); // ✅ deixa o zoom-in acontecer

      // Mostra cover (mas ainda sem "active", para preparar o estado inicial)
      cover.hidden = false;
      cover.classList.remove("active");
      if (coverHandle) coverHandle.disabled = true;

      // Atualiza máscara (precisa do cover visível no DOM)
      setMaskFromCSS();

      // ✅ sincroniza o zoom-start com o tamanho do cartão final
      if (detachedCard) {
        const r = detachedCard.getBoundingClientRect();
        syncCoverStartFromCard(r);

        // ✅ crossfade para não se notar a troca (mesma imagem)
        detachedCard.style.opacity = "0";
      }

      // Força o browser a “assentar” o estado inicial antes de animar
      void cover.offsetWidth;

      // Agora sim: entra o cover e faz o zoom para 1
      cover.classList.add("active");

      if (!coverStage) {
        coverReady = true;
        if (coverHandle) coverHandle.disabled = false;
        return;
      }

      const onEnd = (e) => {
        if (e.propertyName !== "transform") return;
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
      // 1) Mostra o flip por trás (ainda invisível)
      if (flipSection) {
        flipSection.hidden = false;
        // força layout para garantir que já está renderizado
        void flipSection.offsetWidth;
        // fade-in do flip
        flipSection.classList.add("active");
      }

      // reset do flip
      flipInner?.classList.remove("is-flipped");
      flipStage?.classList.remove("is-flipped");

      // 2) Agora sim: fade-out do cover (sem cortar com hidden)
      if (cover) {
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

        const onEnd = (e) => {
          if (!reduceMotion && e.propertyName !== "opacity") return;
          cover.removeEventListener("transitionend", onEnd);
          cover.hidden = true;
        };

        cover.hidden = false;            // garante que existe durante o fade
        cover.classList.add("lock-zoom"); // trava o scale no fim
        cover.addEventListener("transitionend", onEnd, { passive: true });

        // inicia o fade-out
        void cover.offsetWidth;
        cover.classList.remove("active");

        // fallback se não houver transição
        if (reduceMotion) onEnd({ propertyName: "opacity" });
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

        // ✅ elimina “subida” na abertura: start = preview (mesmo que no :root seja 100%)
        const preview = getComputedStyle(document.documentElement)
          .getPropertyValue("--card-preview")
          .trim();
        if (preview) envelopeEl.style.setProperty("--card-start", preview);

        // ✅ garante padding calculado antes de começar (se já estiver tudo pronto)
        applyAutoPadding(envelopeEl);

        // ✅ abre flap + mostra cartão logo no início
        envelopeEl.classList.add("open-flap", "reveal-card");

        // ✅ quando o flap termina, baixa o z-index do flap (preview-card)
        setTimeout(() => envelopeEl.classList.add("preview-card"), FLAP_MS + 20);

        // ✅ depois do preview, puxa o cartão
        setTimeout(() => envelopeEl.classList.add("pull-card"), FLAP_MS + PREVIEW_MS + 40);

        // timing base
        const tPullEnd = FLAP_MS + PREVIEW_MS + CARD_MS;

        // ✅ 1) antes do zoom: envelope sai + cartão desce/centra
        setTimeout(() => {
          envelopeEl.classList.add("exit");

          // opcional mas recomendado: remove o pull-card para garantir que a “tapa” desaparece
          envelopeEl.classList.remove("pull-card");
        }, tPullEnd + 60);

        // ✅ 2) só depois disso é que começa o cover/zoom
        setTimeout(() => {
          const card = envelopeEl.querySelector(".env-card");
          if (card) {
            // 1) mede a posição atual (ainda “peek”)
            const r = card.getBoundingClientRect();

            // 2) destaca o cartão para fora do env-mask (senão vai junto com o envelope)
            hero?.appendChild(card);
            card.classList.add("detached");
            detachedCard = card;


            // 3) congela visualmente no mesmo sítio (fixed no viewport)
            card.style.position = "fixed";
            card.style.left = `${r.left}px`;
            card.style.top = `${r.top}px`;
            card.style.width = `${r.width}px`;
            card.style.height = `${r.height}px`;
            card.style.margin = "0";
            card.style.transform = "none";

            // velocidade do “descer para o centro”
            card.style.setProperty("--card-move-dur", `${EXIT_CARD_MS}ms`);

            // 4) anima até ao centro do ecrã
            const { cx, cy } = viewportCenter();
            const dx = cx - (r.left + r.width / 2);
            const dy = cy - (r.top + r.height / 2);

            requestAnimationFrame(() => {
              card.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
            });
          }

          // 5) agora sim: envelope pode sair
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

    window.addEventListener(
      "resize",
      () => {
        buildSlices(fxSlices);
        setMaskFromCSS();
        if (envelopeEl) applyAutoPadding(envelopeEl);
      },
      { passive: true }
    );

    wireCalendarAndMaps();

  });
})();
