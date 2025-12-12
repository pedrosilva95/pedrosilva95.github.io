// Helper: attach both touchstart and click without double-fire
function addTapListener(el, handler) {
  if (!el) return;
  let touched = false;
  const wrapper = (e) => {
    if (e.type === 'touchstart') {
      touched = true;
      handler(e);
    } else if (e.type === 'click') {
      if (touched) { touched = false; return; }
      handler(e);
    }
  };
  el.addEventListener('touchstart', wrapper, { passive: true });
  el.addEventListener('click', wrapper);
}

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  const envelopeBtn = document.getElementById('envelopeBtn');
  const tapHint = document.getElementById('tapHint');

  const cover = document.getElementById('cover');
  const coverHandle = document.getElementById('coverHandle');

  const flipSection = document.getElementById('flipSection');
  const flip3d = document.getElementById('flip3d');
  const flipInner = document.getElementById('flipInner');

  const flipForwardBtn = document.getElementById('flipForwardBtn');
  const flipBackBtn = document.getElementById('flipBackBtn');

  const imgFront = document.getElementById('imgFront'); // texto.png
  const imgBack = document.getElementById('imgBack');   // texto2.png

  // Safety: if elements missing, warn and return
  if (!envelopeBtn || !cover || !coverHandle || !flipSection || !flipInner || !imgFront || !imgBack) {
    console.warn('Elementos essenciais em falta no DOM. Verifica IDs.');
    return;
  }

  // Decide axis based on average aspect ratio of both images
  function computeAxis() {
    const fW = imgFront.naturalWidth || imgFront.width;
    const fH = imgFront.naturalHeight || imgFront.height;
    const bW = imgBack.naturalWidth || imgBack.width;
    const bH = imgBack.naturalHeight || imgBack.height;
    const avgW = (fW + bW) / 2;
    const avgH = (fH + bH) / 2;
    return avgW >= avgH ? 'Y' : 'X';
  }

  // Set initial face transforms according to axis
  function prepareFaces(axis) {
    if (axis === 'X') {
      // rotate around X axis (flip top/bottom) — for tall images
      flipInner.style.transform = 'rotateX(0deg)';
      document.querySelector('.flip-front').style.transform = 'rotateX(0deg)';
      document.querySelector('.flip-back').style.transform = 'rotateX(180deg)';
    } else {
      // rotate around Y axis (flip left/right) — for wide images
      flipInner.style.transform = 'rotateY(0deg)';
      document.querySelector('.flip-front').style.transform = 'rotateY(0deg)';
      document.querySelector('.flip-back').style.transform = 'rotateY(180deg)';
    }
    flipInner.dataset.axis = axis;
  }

  // Flip to back
  function flipToBack(axis) {
    if (axis === 'X') flipInner.style.transform = 'rotateX(180deg)';
    else flipInner.style.transform = 'rotateY(180deg)';
  }

  // Flip to front
  function flipToFront() {
    flipInner.style.transform = 'rotateX(0deg) rotateY(0deg)';
  }

  // 1) Envelope -> mostrar cover
  addTapListener(envelopeBtn, (e) => {
    e.preventDefault();
    if (tapHint) tapHint.style.opacity = '0';
    envelopeBtn.style.opacity = '0';
    envelopeBtn.style.transform = 'scale(0.98)';

    setTimeout(() => {
      // Preload flip images (ensure natural sizes available)
      imgFront.hidden = false;
      imgBack.hidden = false;

      // Show cover
      cover.hidden = false;
      void cover.offsetWidth;
      cover.classList.add('active');

      // remove hero visually
      setTimeout(() => {
        const hero = document.querySelector('.hero');
        if (hero) hero.remove();
      }, 360);
    }, 360);
  });

  // 2) Cover -> reveal flipSection front (texto.png)
  addTapListener(coverHandle, (e) => {
    e.preventDefault();

    // ensure images loaded
    const ensureLoaded = (img) => new Promise(res => {
      if (img.complete && img.naturalWidth) return res();
      img.onload = () => res();
      img.onerror = () => res();
    });

    Promise.all([ensureLoaded(imgFront), ensureLoaded(imgBack)]).then(() => {
      const axis = computeAxis();
      prepareFaces(axis);

      // show flip section
      flipSection.hidden = false;
      flipSection.classList.add('active');

      // animate cover down
      app.classList.add('sliding-cover');
      setTimeout(() => {
        cover.classList.remove('active');
        cover.hidden = true;
        app.classList.remove('sliding-cover');
      }, 520);
    });
  });

  // 3) front -> back (flip)
  addTapListener(flipForwardBtn, (e) => {
    e.preventDefault();
    const axis = computeAxis();
    prepareFaces(axis);
    flipToBack(axis);
  });

  // 4) back -> front (flip back)
  addTapListener(flipBackBtn, (e) => {
    e.preventDefault();
    flipToFront();
  });

  // keyboard accessibility
  [envelopeBtn, coverHandle, flipForwardBtn, flipBackBtn].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        btn.click();
      }
    });
  });
});
