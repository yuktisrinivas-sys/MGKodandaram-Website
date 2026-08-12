/* M. G. Kodandaram — site behaviour.
   Every block is null-guarded so this file can be shared by all pages. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Preferences (theme / accent / text size) ---------- */
  var store = {
    get: function (k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(pref) {
    var dark = pref === 'dark' || (pref === 'auto' && systemDark.matches);
    document.body.classList.toggle('dark-mode', dark);
    root.dataset.theme = pref;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#060c15' : '#0a1727');
  }
  function applyAccent(a) { document.body.dataset.accent = a; }
  function applyFont(s) {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add('font-' + s);
  }

  var prefs = {
    theme: store.get('theme', 'light'),
    accent: store.get('accent', 'gold'),
    font: store.get('fontSize', 'medium')
  };
  if (prefs.theme !== 'light' && prefs.theme !== 'dark' && prefs.theme !== 'auto') prefs.theme = 'light';

  applyTheme(prefs.theme);
  applyAccent(prefs.accent);
  applyFont(prefs.font);
  // The boot attributes only exist to prevent a flash; body classes now own state.
  delete root.dataset.bootDark;
  delete root.dataset.bootAccent;
  delete root.dataset.bootFont;
  systemDark.addEventListener('change', function () {
    if (root.dataset.theme === 'auto') applyTheme('auto');
  });

  function syncButtons(group, value) {
    document.querySelectorAll('[data-' + group + ']').forEach(function (b) {
      b.classList.toggle('active', b.dataset[group] === value);
      b.setAttribute('aria-pressed', b.dataset[group] === value ? 'true' : 'false');
    });
  }
  syncButtons('theme', prefs.theme);
  syncButtons('accent', prefs.accent);
  syncButtons('size', prefs.font);

  document.querySelectorAll('[data-theme]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.dataset.theme); store.set('theme', btn.dataset.theme);
      syncButtons('theme', btn.dataset.theme);
    });
  });
  document.querySelectorAll('[data-accent]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyAccent(btn.dataset.accent); store.set('accent', btn.dataset.accent);
      syncButtons('accent', btn.dataset.accent);
    });
  });
  document.querySelectorAll('[data-size]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFont(btn.dataset.size); store.set('fontSize', btn.dataset.size);
      syncButtons('size', btn.dataset.size);
    });
  });

  /* ---------- Settings drawer ---------- */
  var setToggle = document.getElementById('settingsToggle');
  var setPanel = document.getElementById('settingsPanel');
  if (setToggle && setPanel) {
    var closeSettings = function () {
      setPanel.classList.remove('open');
      setToggle.setAttribute('aria-expanded', 'false');
    };
    setToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = setPanel.classList.toggle('open');
      setToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!setPanel.contains(e.target) && !setToggle.contains(e.target)) closeSettings();
    });
    var setClose = document.getElementById('settingsClose');
    if (setClose) setClose.addEventListener('click', closeSettings);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSettings();
    });
  }

  /* ---------- Scroll lock ---------- */
  var locks = {};
  function syncScrollLock() {
    var any = Object.keys(locks).some(function (k) { return locks[k]; });
    root.classList.toggle('scroll-locked', any);
  }
  function setLock(name, on) { locks[name] = on; syncScrollLock(); }

  /* ---------- Splash ---------- */
  var splash = document.getElementById('splash');
  if (splash) {
    var seen = false;
    try { seen = sessionStorage.getItem('splashSeen') === '1'; } catch (e) {}
    if (seen || reduceMotion) {
      root.removeAttribute('data-splash');
    } else {
      setLock('splash', true);
      try { sessionStorage.setItem('splashSeen', '1'); } catch (e) {}
      var dismissed = false;
      var dismiss = function () {
        if (dismissed) return;
        dismissed = true;
        splash.classList.add('splash-done');
        setLock('splash', false);
        setTimeout(function () { root.removeAttribute('data-splash'); }, 600);
      };
      setTimeout(dismiss, 2050);
      splash.addEventListener('click', dismiss);
    }
  }

  /* ---------- Mobile navigation drawer ---------- */
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  var navScrim = document.getElementById('navScrim');

  function setNav(open) {
    if (!navLinks || !navToggle) return;
    navLinks.classList.toggle('open', open);
    navToggle.classList.toggle('active', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (navScrim) navScrim.classList.toggle('show', open);
    document.body.classList.toggle('nav-open', open);
    setLock('nav', open);
  }
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      setNav(!navLinks.classList.contains('open'));
    });
    if (navScrim) navScrim.addEventListener('click', function () { setNav(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setNav(false);
    });
  }

  /* ---------- Smooth scrolling that accounts for the fixed header ---------- */
  var navbar = document.getElementById('navbar');
  function headerOffset() {
    return navbar ? navbar.getBoundingClientRect().height + 8 : 0;
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href === '#') return;
    var target = document.querySelector(href);
    if (!target) return;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      setNav(false);
      var y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ---------- Header state, reading progress, active section ---------- */
  var progress = document.getElementById('scrollProgress');
  var toTop = document.getElementById('toTop');
  var linkTargets = [].slice.call(document.querySelectorAll('.nav-links a[href^="#"]'))
    .map(function (a) { return { link: a, target: document.querySelector(a.getAttribute('href')) }; })
    .filter(function (s) { return s.target; });

  function onScroll() {
    var y = window.pageYOffset;
    if (navbar) navbar.classList.toggle('scrolled', y > 60);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = max > 0 ? (y / max) * 100 + '%' : '0%';
    }
    if (toTop) toTop.classList.toggle('show', y > 700);
    if (linkTargets.length) {
      var current = linkTargets[0];
      for (var i = 0; i < linkTargets.length; i++) {
        if (linkTargets[i].target.getBoundingClientRect().top <= headerOffset() + 40) current = linkTargets[i];
      }
      linkTargets.forEach(function (s) { s.link.classList.toggle('active', s === current); });
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var animEls = document.querySelectorAll('.anim');
  if (animEls.length) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      animEls.forEach(function (el) { el.classList.add('visible'); });
    } else {
      var revealObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('visible'); revealObs.unobserve(en.target); }
        });
      }, { threshold: 0.04, rootMargin: '0px 0px -40px 0px' });
      animEls.forEach(function (el) { revealObs.observe(el); });
      // Safety net in case an observer callback never fires.
      setTimeout(function () { animEls.forEach(function (el) { el.classList.add('visible'); }); }, 4000);
    }
  }

  /* ---------- Counting statistics ---------- */
  var counters = document.querySelectorAll('[data-count]');
  function runCount(el) {
    var end = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = end.toLocaleString('en-IN') + suffix; return; }
    var dur = 1500, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased).toLocaleString('en-IN') + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCount);
    } else {
      var countObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { runCount(en.target); countObs.unobserve(en.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { countObs.observe(el); });
    }
  }

  /* ---------- Photo lightbox with keyboard / swipe navigation ---------- */
  var lightbox = document.getElementById('lightbox');
  var items = [].slice.call(document.querySelectorAll('.gallery-item'));
  if (lightbox && items.length) {
    var lbImg = document.getElementById('lightboxImg');
    var lbCap = document.getElementById('lightboxCap');
    var lbCount = document.getElementById('lightboxCount');
    var idx = 0, lastFocus = null;

    function show(i) {
      idx = (i + items.length) % items.length;
      var item = items[idx];
      var img = item.querySelector('img');
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || '';
      if (lbCap) lbCap.innerHTML = item.dataset.cap || '';
      if (lbCount) lbCount.textContent = (idx + 1) + ' / ' + items.length;
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      lightbox.classList.add('open');
      setLock('modal', true);
      var c = document.getElementById('lightboxClose');
      if (c) c.focus();
    }
    function close() {
      lightbox.classList.remove('open');
      setLock('modal', false);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    items.forEach(function (item, i) {
      item.addEventListener('click', function () { open(i); });
    });
    ['lightboxClose'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', close);
    });
    var prev = document.getElementById('lightboxPrev');
    var next = document.getElementById('lightboxNext');
    if (prev) prev.addEventListener('click', function (e) { e.stopPropagation(); show(idx - 1); });
    if (next) next.addEventListener('click', function (e) { e.stopPropagation(); show(idx + 1); });

    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });

    var x0 = null;
    lightbox.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) show(dx < 0 ? idx + 1 : idx - 1);
      x0 = null;
    }, { passive: true });
  }

  /* ---------- Pointer glow on cards (fine pointers only) ---------- */
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.career-card, .expertise-card, .stat-card, .book-card').forEach(function (card) {
      card.classList.add('glow');
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }
})();
