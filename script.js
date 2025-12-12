// script.js
// Fluxo: envelope -> cover -> flip-section (texto.png <-> texto2.png)
// Flip rotates around the longer side (X for tall images, Y for wide images).
// Buttons reduced to 2/3 via CSS class .small-handle

// Helper: attach both touchstart and click without double-fire
function addTapListener(el, handler) {
  if (!el) return;
  let touched = false;
  const wrapper = (e) => {
    if (e.type === 'touchstart') {
      touched = true;
      handler(e);
    } else if (e.type === 'click') {
      if (touched) {
        touched = false;
        return;
      }
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

  // Safety: ensure elements exist
  if (!envelopeBtn || !cover || !coverHandle || !flipSection || !flip3d || !flipInner || !imgFront || !imgBack) {
    console.warn('Alguns elementos essenciais não foram encontrados no DOM.');
  }

  // Utility: determine longer side for an image element (returns 'X' or 'Y')
  function longerAxisForImages(frontImg, backImg) {
    // Use natural dimensions when available; fallback to bounding box
    const fW = frontImg.naturalWidth || frontImg.width;
    const fH = frontImg.naturalHeight || frontImg.height;
    const bW = backImg.naturalWidth || backImg.width;
    const bH = backImg.naturalHeight || backImg.height;

    // average aspect ratio to decide dominant orientation
    const avgW = (fW + bW) / 2;
    const avgH = (fH + bH) / 2;

    // If width >= height, longer side is horizontal -> rotate around Y (vertical axis)
    return avgW >= avgH ? 'Y' : 'X';
  }

  // Apply axis-specific transforms to flipInner and faces
  function setFlipAxis(axis) {
    // axis: 'X' or 'Y'
    if (!flipInner) return;
    if (axis === 'X') {
      // rotate around X: front 0, back 180deg around X
      flipInner.style.transform = ''; // reset
      flipInner.dataset.axis = 'X';
      // set faces transforms via CSS variables or inline styles
      const front = document.querySelector('.flip-front');
      const back = document.querySelector('.flip-back');
      if (front) front.style.transform = 'rotateX(0deg)';
      if (back) back.style.transform = 'rotateX(180deg)';
      // set transform origin for a long-side flip (horizontal center)
      flipInner.style.transformOrigin = '50% 50%';
    } else {
      // Y axis
      flipInner.dataset.axis = 'Y';
      const front = document.querySelector('.flip-front');
      const back = document.querySelector('.flip-back');
      if (front) front.style.transform = 'rotateY(0deg)';
      if (back) back.style.transform = 'rotateY(180deg)';
      flipInner.style.transformOrigin = '50% 50%';
    }
  }

  // Perform flip to show back (texto2)
  function flipToBack(axis) {
    if (!flipInner) return;
    if (axis === 'X') {
      flipInner.style.transform = 'rotateX(180deg)';
    } else {
      flipInner.style.transform = 'rotateY(180deg)';
    }
    flip3d.classList.add('flipped');
  }

  // Perform flip to show front (texto)
  function flipToFront(axis) {
    if (!flipInner) return;
    flipInner.style.transform = 'rotateX(0deg) rotateY(0deg)';
    flip3d.classList.remove('flipped');
  }

  // 1) Envelope -> mostrar cover
  addTapListener(envelopeBtn, (e) => {
    e.preventDefault();
    if (tapHint) tapHint.style.opacity = '0';
    envelopeBtn.style.opacity = '0';
    envelopeBtn.style.transform = 'scale(0.98)';

    setTimeout(() => {
      // Prepare flip section images (ensure they are loaded)
      // Show cover and prepare flipSection behind it
      if (flipSection) {
        // keep hidden until needed
        flipSection.classList.remove('active');
      }

      if (cover) {
        cover.hidden = false;
        void cover.offsetWidth;
        cover.classList.add('active');
      }

      // Remove hero visually
      setTimeout(() => {
        const hero = document.querySelector('.hero');
        if (hero) hero.remove();
      }, 360);
    }, 360);
  });

  // 2) Cover -> reveal flipSection front (texto.png)
  addTapListener(coverHandle, (e) => {
    e.preventDefault();
    if (!flipSection || !imgFront || !imgBack) return;

    // ensure images are loaded to compute axis
    const ensureLoaded = (img) => new Promise((res) => {
      if (img.complete && img.naturalWidth) return res();
      img.onload = () => res();
      img.onerror = () => res();
    });

    Promise.all([ensureLoaded(imgFront), ensureLoaded(imgBack)]).then(() => {
      // decide axis based on images' dimensions
      const axis = longerAxisForImages(imgFront, imgBack);
      setFlipAxis(axis);

      // show flipSection (front face visible)
      flipSection.hidden = false;
      flipSection.classList.add('active');

      // animate cover down to reveal flipSection
      app.classList.add('sliding-cover');
      setTimeout(() => {
        if (cover) {
          cover.classList.remove('active');
          cover.hidden = true;
        }
        app.classList.remove('sliding-cover');
      }, 520);
    });
  });

  // 3) From front (texto.png) -> flip to back (texto2.png)
  addTapListener(document.getElementById('flipForwardBtn'), (e) => {
    e.preventDefault();
    // compute axis again (in case orientation changed)
    const axis = longerAxisForImages(imgFront, imgBack);
    setFlipAxis(axis);
    flipToBack(axis);
  });

  // 4) From back (texto2.png) -> flip to front (texto.png)
  addTapListener(document.getElementById('flipBackBtn'), (e) => {
    e.preventDefault();
    const axis = longerAxisForImages(imgFront, imgBack);
    setFlipAxis(axis);
    flipToFront(axis);
  });

  // Keyboard accessibility
  [envelopeBtn, coverHandle, document.getElementById('flipForwardBtn'), document.getElementById('flipBackBtn')].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        btn.click();
      }
    });
  });
});
