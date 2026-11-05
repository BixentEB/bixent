/* Portail Codex Mental — comportements (aucune dépendance). */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' : ' + r.status);
      return r.json();
    });
  }
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: val })); } catch (e) {} }
  function recall(key, maxAge) {
    try {
      var o = JSON.parse(localStorage.getItem(key));
      if (o && Date.now() - o.t < maxAge) return o.v;
    } catch (e) {}
    return null;
  }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  /* L'atome reste immobile si l'animation est réduite */
  if (reduced) document.querySelectorAll('svg').forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });

  /* ---------- Lueur des cartes qui suit la souris ---------- */
  if (window.matchMedia && matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.card');
      if (!c) return;
      var b = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - b.left) + 'px');
      c.style.setProperty('--my', (e.clientY - b.top) + 'px');
    }, { passive: true });
  }

  /* ---------- Présentation ---------- */
  var bioBtn = $('bio-btn'), bioMore = $('bio-more');
  bioBtn.addEventListener('click', function () {
    var open = bioMore.hidden;
    bioMore.hidden = !open;
    bioBtn.setAttribute('aria-expanded', String(open));
    bioBtn.textContent = open ? 'Réduire' : 'En savoir plus';
  });

  /* ---------- Réglages ---------- */
  getJSON('data/config.json').then(function (cfg) {
    var f = cfg.features || {};
    document.querySelectorAll('[data-feature]').forEach(function (n) {
      var on = f[n.getAttribute('data-feature')];
      if (on === false) n.hidden = true;
    });
    if (f.atelier === true) initAtelier();

    if (cfg.contact && cfg.contact.email) {
      var m = $('mail-btn');
      m.href = 'mailto:' + cfg.contact.email;
      if (cfg.contact.label) { m.setAttribute('aria-label', cfg.contact.label); m.title = cfg.contact.label; m.querySelector('span').textContent = cfg.contact.label; }
    }
    if (cfg.news) initNews(cfg.news);
    initShare(cfg.share || {});
    initStats(cfg.sources || {});
  }).catch(function () {
    initShare({});
    initStats({});
  });

  /* ---------- Nouveauté ---------- */
  function initNews(n) {
    var t = $('news-title');
    t.textContent = '';
    if (n.url) t.appendChild(el('a', { href: n.url }, n.title)); else t.textContent = n.title;
    var d = n.date ? new Date(n.date + 'T12:00:00') : null;
    var dateTxt = d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    $('news-meta').textContent = [n.site, dateTxt].filter(Boolean).join(' · ');
    if (n.newUntil && new Date() <= new Date(n.newUntil + 'T23:59:59')) $('news-badge').hidden = false;
  }

  /* ---------- Statistiques ---------- */
  var STAT_LABELS = {
    articles: ['articles publiés', '#8ff6ff'],
    ideas: ['idées et hypothèses', '#c9a4ff'],
    writingProjects: ["projets d'écriture", '#ff7fbf'],
    digitalProjects: ['projets numériques', '#ffb27a']
  };
  function renderStats(s) {
    var row = $('stat-row');
    row.textContent = '';
    Object.keys(STAT_LABELS).forEach(function (k) {
      if (s[k] == null) return;
      var d = el('div', { 'class': 'stat' });
      var b = el('b', null, String(s[k]));
      b.style.color = STAT_LABELS[k][1];
      d.appendChild(b);
      d.appendChild(el('span', null, STAT_LABELS[k][0]));
      row.appendChild(d);
    });
  }
  function initStats(src) {
    getJSON('data/stats.json').then(function (base) {
      var cached = recall('cx-portail-stats', 6 * 3600 * 1000);
      if (cached) { renderStats(Object.assign({}, base, cached)); return; }
      renderStats(base);
      var live = {};
      var jobs = [];
      if (src.codexCatalog) jobs.push(getJSON(src.codexCatalog).then(function (cat) {
        var arts = cat.articles || {};
        var keys = Object.keys(arts);
        live.articles = keys.filter(function (k) { return arts[k].type === 'article'; }).length;
        live._ideasCodex = keys.filter(function (k) { return k.indexOf('atelier/') === 0 && k !== 'atelier/intro'; }).length;
      }));
      if (src.obsHypotheses) jobs.push(getJSON(src.obsHypotheses).then(function (h) {
        live._ideasObs = (h.hypotheses || []).filter(function (x) { return !x.brouillon && x.statut !== 'exemple'; }).length;
      }));
      Promise.allSettled(jobs).then(function () {
        var out = {};
        if (live.articles) out.articles = live.articles;
        if (live._ideasCodex != null || live._ideasObs != null) {
          out.ideas = (live._ideasCodex != null ? live._ideasCodex : 0) + (live._ideasObs != null ? live._ideasObs : 0);
          if (!out.ideas) delete out.ideas;
        }
        if (Object.keys(out).length) { store('cx-portail-stats', out); renderStats(Object.assign({}, base, out)); }
      });
    }).catch(function () {});
  }

  /* ---------- Affiches ---------- */
  getJSON('data/posters.json').then(function (data) {
    var list = data.posters || [];
    if (!list.length) return;
    var stage = $('poster-stage'), status = $('poster-status');
    var imgs = list.map(function (p, i) {
      var alt = p.quote + (p.author ? ' — ' + p.author : '') + (p.fr ? ' (' + p.fr + ')' : '');
      var im = el('img', { src: p.image, alt: alt, width: '480', height: '720', decoding: 'async' });
      if (i > 0) im.setAttribute('loading', 'lazy');
      stage.appendChild(im);
      return im;
    });
    var cur = Math.floor(Math.random() * list.length);
    var every = (data.interval || 25) * 1000;
    var pauseFor = (data.pauseAfterClick || 60) * 1000;
    var timer = null, resume = null, paused = false;

    function show(i) {
      cur = (i + list.length) % list.length;
      imgs.forEach(function (im, k) {
        im.classList.toggle('on', k === cur);
        im.setAttribute('aria-hidden', k === cur ? 'false' : 'true');
      });
      status.textContent = (cur + 1) + ' / ' + list.length + (paused ? ' · en pause' : '');
      var next = imgs[(cur + 1) % list.length];
      if (next.loading === 'lazy') next.loading = 'eager';
    }
    function start() {
      clearInterval(timer);
      if (reduced) return;
      timer = setInterval(function () { if (!document.hidden) show(cur + 1); }, every);
    }
    function manual(d) {
      clearInterval(timer); clearTimeout(resume);
      paused = true; show(cur + d);
      resume = setTimeout(function () { paused = false; show(cur); start(); }, pauseFor);
    }
    $('poster-prev').addEventListener('click', function () { manual(-1); });
    $('poster-next').addEventListener('click', function () { manual(1); });

    /* glisser du doigt sur mobile */
    var x0 = null;
    stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) manual(dx < 0 ? 1 : -1);
    });

    show(cur); start();
  }).catch(function () {});

  /* ---------- Nox ---------- */
  getJSON('data/nox.json').then(function (nox) {
    var btn = $('nox-btn'), img = $('nox-img'), title = $('nox-title'), line = $('nox-line');
    var timer = null, state = 'sleeping', lastR = -1, preloaded = false;

    function preload() {
      if (preloaded) return; preloaded = true;
      [nox.waking, nox.idle].concat(nox.reactions).forEach(function (s) { var i = new Image(); i.src = s.img; });
    }
    function set(s, name) {
      state = name;
      img.src = s.img;
      title.textContent = s.title;
      line.textContent = s.line;
      img.classList.remove('hop', 'breathe');
      void img.offsetWidth;
      img.classList.add(name === 'sleeping' ? 'breathe' : 'hop');
      btn.setAttribute('aria-label', name === 'sleeping' ? 'Réveiller Nox' : 'Taquiner Nox');
    }
    function react() {
      var r;
      do { r = Math.floor(Math.random() * nox.reactions.length); } while (nox.reactions.length > 1 && r === lastR);
      lastR = r;
      set(nox.reactions[r], 'reaction');
      clearTimeout(timer);
      timer = setTimeout(function () {
        set(nox.idle, 'idle');
        timer = setTimeout(function () { set(nox.sleeping, 'sleeping'); }, 2200);
      }, 3800);
    }
    btn.addEventListener('pointerenter', preload);
    btn.addEventListener('focus', preload);
    btn.addEventListener('click', function () {
      preload();
      clearTimeout(timer);
      if (state === 'sleeping') {
        set(nox.waking, 'waking');
        timer = setTimeout(react, 1300);
      } else {
        react();
      }
    });
  }).catch(function () {});

  /* ---------- Boîte de Schrödinger ---------- */
  var box = $('box'), boxBtn = $('box-btn'), boxLine = $('box-line');
  boxBtn.addEventListener('click', function () {
    var open = !box.classList.contains('open');
    box.classList.toggle('open', open);
    boxBtn.textContent = open ? 'Refermer' : 'Ouvrir';
    boxLine.textContent = open
      ? 'Il refuse de choisir : éveillé et endormi à la fois.'
      : 'Un chat dort là-dedans. Ou pas.';
  });

  /* ---------- Réseaux et partage ---------- */
  var ICONS = {
    github: '<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.3c3-.3 6-1.5 6-6.5a5 5 0 0 0-1.4-3.5 4.6 4.6 0 0 0-.1-3.5s-1.1-.3-3.6 1.4a12.4 12.4 0 0 0-6.5 0C6 1.4 5 1.7 5 1.7a4.6 4.6 0 0 0-.1 3.5A5 5 0 0 0 3.5 8.7c0 5 3 6.2 6 6.5a3 3 0 0 0-.9 2.3V21"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-7M12 13a3 3 0 0 1 6 0v4"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/>',
    mastodon: '<path d="M20 12.5c0 4-3 5-8 5-1.5 0-3-.2-4-.6 0 1.6 1.5 3.1 5 2.6M4 9c0-4 3-5 8-5s8 1 8 5v3.5"/><path d="M8 13V9.5a2 2 0 0 1 4 0V12m0-2.5a2 2 0 0 1 4 0V13"/>',
    bluesky: '<path d="M12 11c-1.5-3-5-6.5-7-6.5-1.5 0-1.5 2-1 4.5.5 2 2.5 3 5 2.5-3 .8-4 2.7-2 4.5 2.5 2.2 4-.5 5-3 1 2.5 2.5 5.2 5 3 2-1.8 1-3.7-2-4.5 2.5.5 4.5-.5 5-2.5.5-2.5.5-4.5-1-4.5-2 0-5.5 3.5-7 6.5z"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>'
  };
  getJSON('data/socials.json').then(function (d) {
    var wrap = $('socials');
    (d.socials || []).forEach(function (s) {
      if (!s.url) return;
      var a = el('a', { 'class': 'social', href: s.url, 'aria-label': s.name, title: s.name, rel: 'me noopener', target: '_blank' });
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[s.icon] || ICONS.x) + '</svg>';
      wrap.appendChild(a);
    });
  }).catch(function () {});

  function initShare(sh) {
    var url = sh.url || location.origin + '/';
    var btn = $('share-btn');
    btn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: sh.title || document.title, url: url }).catch(function () {});
        return;
      }
      var done = function () { btn.textContent = 'Lien copié'; setTimeout(function () { btn.textContent = 'Partager'; }, 2000); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('Lien du portail :', url); });
      else prompt('Lien du portail :', url);
    });
  }

  /* ---------- Atelier d'écriture (si activé) ---------- */
  var STATUS = { idee: 'Idée', preparation: 'Préparation', ecriture: 'Écriture', revision: 'Révision', termine: 'Terminé' };
  function initAtelier() {
    getJSON('data/works.json').then(function (d) {
      var works = d.works || [];
      if (!works.length) return;
      $('grid').classList.add('with-atelier');
      $('atelier').hidden = false;
      var covers = $('covers'), dlg = $('gallery');
      works.forEach(function (w) {
        var b = el('button', { type: 'button', 'class': 'cover' });
        var art = el('span', { 'class': 'cover-art' });
        if (w.cover) art.appendChild(el('img', { src: w.cover, alt: '', loading: 'lazy' }));
        else art.appendChild(el('b', null, w.title));
        b.appendChild(art);
        b.appendChild(el('b', null, w.title));
        b.appendChild(el('span', null, [w.genre, STATUS[w.status]].filter(Boolean).join(' · ')));
        b.addEventListener('click', function () {
          dlg.textContent = '';
          dlg.appendChild(el('p', { 'class': 'label' }, w.genre || ''));
          dlg.appendChild(el('h2', { 'class': 'uni-name' }, w.title));
          if (w.status) dlg.appendChild(el('p', { 'class': 'mono small' }, STATUS[w.status]));
          if (w.mood) dlg.appendChild(el('p', null, w.mood));
          var c = el('button', { type: 'button', 'class': 'pill pill-ghost' }, 'Fermer');
          c.addEventListener('click', function () { dlg.close(); });
          dlg.appendChild(c);
          dlg.showModal();
        });
        covers.appendChild(b);
      });
    }).catch(function () {});
  }
})();
