(function(){

  /* =====================================================
     DOM HELPERS
     Every lookup goes through this so a future markup edit
     (renamed/removed id) degrades gracefully with a console
     warning instead of throwing and killing the whole script.
  ===================================================== */
  function getEl(id) {
    var el = document.getElementById(id);
    if (!el) { console.warn('[script.js] expected element not found: #' + id); }
    return el;
  }

  /* =====================================================
     CONFIG
  ===================================================== */
  var TUNNEL_LENGTH = 4200; /* kept purely for the depth readout's numeric flavor */

  var SECTIONS = [
    { el: getEl('hero'),     frac: 0.00, range: 0.10 },
    { el: getEl('services'), frac: 0.30, range: 0.12 },
    { el: getEl('projects'), frac: 0.65, range: 0.12 },
    { el: getEl('contact'),  frac: 0.92, range: 0.14 }
  ].filter(function (sec) { return !!sec.el; }); /* drop any section whose element is missing */

  /* Background is a sequence of full-bleed images the scroll punches through.
     Keyed generically (image-1, image-2, ...) rather than by photo content,
     so swapping in different photography later is just a file + config change.
     The punch-zoom choreography itself is written for a two-image handoff;
     adding a third image means adding a second transition window below. */
  var BG_IMAGES = [
    { el: getEl('bg-image-1'), capEl: getEl('cap-image-1') },
    { el: getEl('bg-image-2'), capEl: getEl('cap-image-2') }
  ];
  var bgImage1 = BG_IMAGES[0].el;
  var bgImage2 = BG_IMAGES[1].el;
  var capImage1 = BG_IMAGES[0].capEl;
  var capImage2 = BG_IMAGES[1].capEl;
  var bgFlash = getEl('bg-flash');

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
  window.addEventListener('resize', updateTarget, { passive: true });

  /* subtle mouse parallax on the background layers */
  var mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5);
    mouseY = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });
  var parX = 0, parY = 0;

  /* =====================================================
     HUD / PANEL UPDATE
  ===================================================== */
  var pctReadout = getEl('pct-readout');
  var zReadout = getEl('z-readout');
  var railFill = getEl('rail-fill');
  var idxCurrent = getEl('idx-current');
  var scrollHint = getEl('scroll-hint');
  var navdots = document.querySelectorAll('.navdot');

  var lastActiveIndex = 0;
  var SWITCH_MARGIN = 0.04;

  function updateSections(progress) {
    var camZ = -progress * TUNNEL_LENGTH;
    var ops = new Array(SECTIONS.length);

    for (var s = 0; s < SECTIONS.length; s++) {
      var sec = SECTIONS[s];
      var secZ = -sec.frac * TUNNEL_LENGTH;
      var range = sec.range * TUNNEL_LENGTH;
      var dist = Math.abs(camZ - secZ);
      var op = clamp01(1 - dist / range);
      ops[s] = op;

      sec.el.style.opacity = op;
      sec.el.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
      sec.el.style.transform = 'translateY(' + ((dist / range) * 24) + 'px)';
    }

    if (ops.length === 0) return;

    var candidate = 0;
    var candidateOp = ops[0];
    for (var c = 1; c < ops.length; c++) {
      if (ops[c] > candidateOp) { candidateOp = ops[c]; candidate = c; }
    }

    var currentOp = ops[lastActiveIndex] || 0;
    if (candidate !== lastActiveIndex && candidateOp > currentOp + SWITCH_MARGIN) {
      lastActiveIndex = candidate;
    }

    var activeIndex = lastActiveIndex;
    if (idxCurrent) { idxCurrent.textContent = String(activeIndex + 1).padStart(2, '0'); }
    navdots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === activeIndex);
    });
  }

  function updateHUD(progress) {
    var camZ = -progress * TUNNEL_LENGTH;
    if (pctReadout) { pctReadout.textContent = String(Math.round(progress * 100)).padStart(3, '0') + '%'; }
    if (zReadout) { zReadout.textContent = (camZ >= 0 ? '+' : '') + camZ.toFixed(1); }
    if (railFill) { railFill.style.height = (progress * 100) + '%'; }
    if (scrollHint) { scrollHint.style.opacity = progress > 0.03 ? '0' : '1'; }
  }

  function updateBackground(progress) {
    if (!bgImage1 || !bgImage2) return; /* core visual missing — nothing safe to animate */

    /* crossfade — narrow, fast window so it reads as a punch rather than a fade */
    var toImage2 = smoothstep(BG_TRANSITION_START, BG_TRANSITION_END, progress);
    var image1Opacity = 1 - toImage2;
    var image2Opacity = toImage2;

    bgImage1.style.opacity = image1Opacity;
    bgImage2.style.opacity = image2Opacity;
    if (capImage1) { capImage1.style.opacity = image1Opacity * (1 - smoothstep(0.0, 0.06, Math.max(0, progress - 0.30))); }
    if (capImage2) { capImage2.style.opacity = image2Opacity; }

    var preT = clamp01(progress / BG_TRANSITION_START);
    var image1PreScale = lerp(1.0, 1.12, preT);

    var puncT = clamp01((progress - BG_TRANSITION_START) / (BG_TRANSITION_END - BG_TRANSITION_START));
    var image1PunchScale = lerp(image1PreScale, 3.6, easeInExpo(puncT));
    var image1Scale = puncT > 0 ? image1PunchScale : image1PreScale;

    var image2Scale;
    if (puncT <= 0) {
      image2Scale = 2.4;
    } else if (puncT >= 1) {
      var postT = clamp01((progress - BG_TRANSITION_END) / (1 - BG_TRANSITION_END));
      image2Scale = lerp(1.1, 1.38, postT);
    } else {
      image2Scale = lerp(2.4, 1.1, easeOutExpo(puncT));
    }

    var panX = parX * 14;
    var panY = parY * 10 - progress * 26;

    var distFromCenter = Math.abs(progress - BG_TRANSITION_CENTER) / BG_TRANSITION_HALF;
    var bell = Math.max(0, 1 - distFromCenter);
    var blurPx = (bell * bell) * 9;
    var flashOpacity = (bell * bell * bell) * 0.55;

    var filterStr = 'grayscale(0.86) contrast(1.2) brightness(0.62) blur(' + blurPx.toFixed(2) + 'px)';
    bgImage1.style.filter = filterStr;
    bgImage2.style.filter = filterStr;
    if (bgFlash) { bgFlash.style.opacity = flashOpacity; }

    bgImage1.style.transform = 'scale(' + image1Scale.toFixed(4) + ') translate(' + panX + 'px,' + panY + 'px)';
    bgImage2.style.transform = 'scale(' + image2Scale.toFixed(4) + ') translate(' + (panX * 0.7) + 'px,' + (panY * 0.7) + 'px)';
  }

  navdots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var idx = parseInt(dot.getAttribute('data-index'), 10);
      var sec = SECTIONS[idx];
      if (!sec) return;
      var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: sec.frac * maxScroll, behavior: 'smooth' });
    });
  });

  /* =====================================================
     RENDER LOOP
     Once the eased values have converged to their targets (the
     common case: page loaded, user reading, not scrolling), skip
     all DOM writes entirely rather than re-applying identical
     styles 60 times a second.
  ===================================================== */
  var SETTLE_EPSILON_PROGRESS = 0.00005;
  var SETTLE_EPSILON_MOUSE = 0.0005;

  function animate() {
    requestAnimationFrame(animate);

    var progressDelta = rawProgress - smoothProgress;
    var mouseXDelta = mouseX - parX;
    var mouseYDelta = mouseY - parY;

    var settled =
      Math.abs(progressDelta) < SETTLE_EPSILON_PROGRESS &&
      Math.abs(mouseXDelta) < SETTLE_EPSILON_MOUSE &&
      Math.abs(mouseYDelta) < SETTLE_EPSILON_MOUSE;

    if (settled) { return; }

    smoothProgress += progressDelta * 0.08;
    parX += mouseXDelta * 0.05;
    parY += mouseYDelta * 0.05;

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
