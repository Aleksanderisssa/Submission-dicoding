(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  root.classList.add('js');

  /* ---------- Toast ---------- */
  var toastEl = document.querySelector('.toast');
  var toastTimer = 0;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-visible');
    }, 2400);
  }

  /* ---------- Nama di hero: ketebalan huruf mengikuti kursor ---------- */
  function initHeroName() {
    var name = document.querySelector('.hero__name');
    var hero = document.querySelector('.hero');
    if (!name || !hero) return;

    var REST = 640;
    var PEAK = 900;
    var chars = [];

    var srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = name.textContent.replace(/\s+/g, ' ').trim();

    name.querySelectorAll('.line').forEach(function (line) {
      var text = line.textContent.trim();
      line.textContent = '';
      line.setAttribute('aria-hidden', 'true');
      Array.from(text).forEach(function (letter) {
        var span = document.createElement('span');
        span.className = 'ch';
        span.textContent = letter;
        span.style.setProperty('--w', REST);
        line.appendChild(span);
        chars.push({ el: span, w: REST });
      });
    });
    name.insertBefore(srText, name.firstChild);

    if (reduceMotion.matches) return;

    var pointer = null;
    var introStart = performance.now() + 300;
    var introLength = (chars.length + 6) / 12;
    var raf = 0;

    function smoothstep(k) {
      return k * k * (3 - 2 * k);
    }

    function frame(now) {
      var settling = false;
      var radius = parseFloat(getComputedStyle(name).fontSize) * 1.6;
      var introT = introStart ? (now - introStart) / 1000 : -1;

      if (introStart && introT > introLength) introStart = 0;

      chars.forEach(function (c, i) {
        var target = REST;

        if (pointer) {
          var r = c.el.getBoundingClientRect();
          var dx = pointer.x - (r.left + r.width / 2);
          var dy = (pointer.y - (r.top + r.height / 2)) * 1.2;
          var k = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / radius);
          target = REST + (PEAK - REST) * smoothstep(k);
        }

        if (introStart && introT >= 0) {
          var center = introT * 12 - 2;
          var wave = Math.exp(-Math.pow(i - center, 2) / 3);
          target = Math.max(target, REST + (PEAK - REST) * wave);
        }

        c.w += (target - c.w) * 0.14;
        if (Math.abs(target - c.w) < 0.5) {
          c.w = target;
        } else {
          settling = true;
        }
        c.el.style.setProperty('--w', c.w.toFixed(1));
      });

      raf = (settling || introStart) ? requestAnimationFrame(frame) : 0;
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    hero.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      kick();
    });

    hero.addEventListener('pointerleave', function () {
      pointer = null;
      kick();
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(kick);
    } else {
      kick();
    }
  }

  /* ---------- Lampu merah yang mengikuti kursor ---------- */
  function followLight(target, varX, varY, host) {
    if (!target || reduceMotion.matches) return;
    (host || target).addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch') return;
      var r = target.getBoundingClientRect();
      target.style.setProperty(varX, ((event.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      target.style.setProperty(varY, ((event.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  }

  /* ---------- Navigasi: progres baca dan bagian aktif ---------- */
  function initNav() {
    var nav = document.querySelector('.site-nav');
    var bar = document.querySelector('.progress span');
    var links = Array.from(document.querySelectorAll('.site-nav__links a[href^="#"]'));
    var sections = links.map(function (a) {
      return document.querySelector(a.getAttribute('href'));
    });
    var ticking = false;

    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (bar) bar.style.setProperty('--p', progress.toFixed(4));
      if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 24);

      var line = (nav ? nav.offsetHeight : 0) + window.innerHeight * 0.35;
      var active = -1;
      sections.forEach(function (section, i) {
        if (section && section.getBoundingClientRect().top <= line) active = i;
      });
      if (progress > 0.995) active = sections.length - 1;

      links.forEach(function (link, i) {
        var on = i === active;
        link.classList.toggle('is-active', on);
        if (on) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- Muncul saat discroll ---------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Salin email ---------- */
  function initCopy() {
    var button = document.getElementById('copy-email');
    if (!button) return;
    var original = button.textContent;
    var resetTimer = 0;

    function fallbackCopy(text) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.className = 'sr-only';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(area);
      return ok ? Promise.resolve() : Promise.reject();
    }

    button.addEventListener('click', function () {
      var email = button.getAttribute('data-email');
      var copy = navigator.clipboard && window.isSecureContext
        ? navigator.clipboard.writeText(email)
        : fallbackCopy(email);

      copy.then(function () {
        button.textContent = 'Tersalin';
        toast(email + ' disalin.');
      }, function () {
        toast('Gagal menyalin. Salin manual: ' + email);
      });

      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () { button.textContent = original; }, 2000);
    });
  }

  initHeroName();
  followLight(document.querySelector('.hero__photo'), '--lx', '--ly', document.querySelector('.hero'));
  followLight(document.querySelector('.project'), '--mx', '--my');
  initNav();
  initReveal();
  initCopy();
})();
