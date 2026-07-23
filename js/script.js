(function(){

  /* =====================================================
     CONFIG
  ===================================================== */
  var TUNNEL_LENGTH = 4200; /* kept purely for the depth readout's numeric flavor */

  var SECTIONS = [
    { el: document.getElementById('hero'),     frac: 0.00, range: 0.10 },
    { el: document.getElementById('services'), frac: 0.30, range: 0.12 },
    { el: document.getElementById('projects'), frac: 0.65, range: 0.12 },
    { el: document.getElementById('contact'),  frac: 0.92, range: 0.14 }
  ];

  /* background image crossfade + zoom window (as a fraction of total scroll) —
     kept narrow so the punch-through reads as fast against the full scroll length */
  var BG_TRANSITION_START = 0.43;
  var BG_TRANSITION_END   = 0.53;
  var BG_TRANSITION_CENTER = (BG_TRANSITION_START + BG_TRANSITION_END) / 2;
  var BG_TRANSITION_HALF   = (BG_TRANSITION_END - BG_TRANSITION_START) / 2;

  function clamp01(v){ return Math.max(0, Math.min(1, v)); }
  function smoothstep(edge0, edge1, x){
    var t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  }
  function lerp(a, b, t){ return a + (b - a) * t; }
  function easeInExpo(t){ return t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)); }
  function easeOutExpo(t){ return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  var bgExterior = document.getElementById('bg-exterior');
  var bgInterior = document.getElementById('bg-interior');
  var bgFlash = document.getElementById('bg-flash');
  var capExterior = document.getElementById('cap-exterior');
  var capInterior = document.getElementById('cap-interior');

  /* =====================================================
     SCROLL -> PROGRESS MAPPING
  ===================================================== */
  var rawProgress = 0;
  var smoothProgress = 0;

  function getProgress() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return clamp01(scrollTop / maxScroll);
  }

  function updateTarget() {
    rawProgress = getProgress();
  }

  window.addEventListener('scroll', updateTarget, { passive: true });
  window.addEventListener('resize', updateTarget);

  /* subtle mouse parallax on the background layers */
  var mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5);
    mouseY = (e.clientY / window.innerHeight - 0.5);
  });
  var parX = 0, parY = 0;

  /* =====================================================
     HUD / PANEL UPDATE
  ===================================================== */
  var pctReadout = document.getElementById('pct-readout');
  var zReadout = document.getElementById('z-readout');
  var railFill = document.getElementById('rail-fill');
  var idxCurrent = document.getElementById('idx-current');
  var scrollHint = document.getElementById('scroll-hint');
  var navdots = document.querySelectorAll('.navdot');

  function updateSections(progress) {
    var camZ = -progress * TUNNEL_LENGTH;
    var activeIndex = 0;
    var bestOpacity = -1;

    for (var s = 0; s < SECTIONS.length; s++) {
      var sec = SECTIONS[s];
      var secZ = -sec.frac * TUNNEL_LENGTH;
      var range = sec.range * TUNNEL_LENGTH;
      var dist = Math.abs(camZ - secZ);
      var op = 1 - dist / range;
      op = clamp01(op);

      sec.el.style.opacity = op;
      sec.el.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
      sec.el.style.transform = 'translateY(' + ((dist / range) * 24) + 'px)';

      if (op > bestOpacity) { bestOpacity = op; activeIndex = s; }
    }

    idxCurrent.textContent = String(activeIndex + 1).padStart(2, '0');
    navdots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === activeIndex);
    });
  }

  function updateHUD(progress) {
    var camZ = -progress * TUNNEL_LENGTH;
    pctReadout.textContent = String(Math.round(progress * 100)).padStart(3, '0') + '%';
    zReadout.textContent = (camZ >= 0 ? '+' : '') + camZ.toFixed(1);
    railFill.style.height = (progress * 100) + '%';
    scrollHint.style.opacity = progress > 0.03 ? '0' : '1';
  }

  function updateBackground(progress) {
    /* crossfade — narrow, fast window so it reads as a punch rather than a fade */
    var toInterior = smoothstep(BG_TRANSITION_START, BG_TRANSITION_END, progress);
    var exteriorOpacity = 1 - toInterior;
    var interiorOpacity = toInterior;

    bgExterior.style.opacity = exteriorOpacity;
    bgInterior.style.opacity = interiorOpacity;
    capExterior.style.opacity = exteriorOpacity * (1 - smoothstep(0.0, 0.06, Math.max(0, progress - 0.30)));
    capInterior.style.opacity = interiorOpacity;

    var preT = clamp01(progress / BG_TRANSITION_START);
    var exteriorPreScale = lerp(1.0, 1.12, preT);

    var puncT = clamp01((progress - BG_TRANSITION_START) / (BG_TRANSITION_END - BG_TRANSITION_START));
    var exteriorPunchScale = lerp(exteriorPreScale, 3.6, easeInExpo(puncT));
    var exteriorScale = puncT > 0 ? exteriorPunchScale : exteriorPreScale;

    var interiorScale;
    if (puncT <= 0) {
      interiorScale = 2.4;
    } else if (puncT >= 1) {
      var postT = clamp01((progress - BG_TRANSITION_END) / (1 - BG_TRANSITION_END));
      interiorScale = lerp(1.1, 1.38, postT);
    } else {
      interiorScale = lerp(2.4, 1.1, easeOutExpo(puncT));
    }

    var panX = parX * 14;
    var panY = parY * 10 - progress * 26;

    var distFromCenter = Math.abs(progress - BG_TRANSITION_CENTER) / BG_TRANSITION_HALF;
    var bell = Math.max(0, 1 - distFromCenter);
    var blurPx = (bell * bell) * 9;
    var flashOpacity = (bell * bell * bell) * 0.55;

    var filterStr = 'grayscale(0.86) contrast(1.2) brightness(0.62) blur(' + blurPx.toFixed(2) + 'px)';
    bgExterior.style.filter = filterStr;
    bgInterior.style.filter = filterStr;
    bgFlash.style.opacity = flashOpacity;

    bgExterior.style.transform = 'scale(' + exteriorScale.toFixed(4) + ') translate(' + panX + 'px,' + panY + 'px)';
    bgInterior.style.transform = 'scale(' + interiorScale.toFixed(4) + ') translate(' + (panX * 0.7) + 'px,' + (panY * 0.7) + 'px)';
  }

  navdots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var idx = parseInt(dot.getAttribute('data-index'), 10);
      var frac = SECTIONS[idx].frac;
      var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: frac * maxScroll, behavior: 'smooth' });
    });
  });

  /* =====================================================
     RENDER LOOP
  ===================================================== */
  function animate() {
    requestAnimationFrame(animate);

    smoothProgress += (rawProgress - smoothProgress) * 0.08;
    parX += (mouseX - parX) * 0.05;
    parY += (mouseY - parY) * 0.05;

    updateSections(smoothProgress);
    updateHUD(smoothProgress);
    updateBackground(smoothProgress);
  }

  updateTarget();
  updateSections(0);
  updateHUD(0);
  updateBackground(0);
  animate();

})();
