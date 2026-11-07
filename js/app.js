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
  var toastT = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  /* Animations SVG figées si l'animation est réduite */
  if (reduced) document.querySelectorAll('svg').forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });

  /* ---------- Lueur et bordure qui suivent la souris ---------- */
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
  /* Un seul panneau latéral : son contenu vient d'un gabarit <template id="tpl-…">,
     complété au besoin par une fonction de remplissage (FILL). */
  var drawer = $('drawer'), drawerBody = $('drawer-body'), drawerLabel = $('drawer-label');
  var FILL = {}, SRC = {}, lastOpener = null;
  function openPanel(key, opener) {
    var tpl = $('tpl-' + key);
    if (!tpl || !drawer.showModal) return;
    drawerBody.textContent = '';
    drawerBody.appendChild(tpl.content.cloneNode(true));
    drawerLabel.textContent = tpl.getAttribute('data-label') || '';
    drawerBody.querySelectorAll('[data-fill]').forEach(function (n) { var f = FILL[n.getAttribute('data-fill')]; if (f) f(n); });
    drawerBody.querySelectorAll('[data-mail]').forEach(function (a) { a.href = $('mail-btn').href; });
    lastOpener = opener || null;
    drawer.showModal();
    drawer.scrollTop = 0;
  }
  function closePanel() {
    if (!drawer.open) return;
    drawer.classList.add('closing');
    setTimeout(function () { drawer.classList.remove('closing'); drawer.close(); if (lastOpener) lastOpener.focus(); }, reduced ? 0 : 260);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-panel]');
    if (t) openPanel(t.getAttribute('data-panel'), t);
  });
  $('drawer-close').addEventListener('click', closePanel);
  drawer.addEventListener('click', function (e) { if (e.target === drawer) closePanel(); });
  drawer.addEventListener('cancel', function (e) { e.preventDefault(); closePanel(); });

  /* Agrandissement d'un visuel (QR code, affiches) */
  var lb = $('lightbox'), lbImg = $('lightbox-img'), lbCap = $('lightbox-cap'), lbDl = $('lightbox-dl');
  function zoom(src, caption, alt, download) {
    if (!lb.showModal) return;
    lbImg.src = src; lbImg.alt = alt || '';
    lbCap.textContent = caption || ''; lbCap.hidden = !caption;
    lbDl.hidden = !download;
    if (download) { lbDl.href = src; lbDl.setAttribute('download', download); }
    lb.classList.toggle('lightbox-poster', !download);
    lb.showModal();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-zoom]');
    if (t) zoom(t.getAttribute('data-zoom'), t.getAttribute('data-zoom-caption'), t.getAttribute('data-zoom-alt'), t.getAttribute('data-zoom-download'));
  });
  $('lightbox-close').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });

  /* ---------- Réglages ---------- */
  getJSON('data/config.json').then(function (cfg) {
    var f = cfg.features || {};
    document.querySelectorAll('[data-feature]').forEach(function (n) {
      if (f[n.getAttribute('data-feature')] === false) n.hidden = true;
    });
    if (f.atelier === true) initAtelier();
    if (cfg.contact && cfg.contact.email) {
      var m = $('mail-btn');
      m.href = 'mailto:' + cfg.contact.email;
      if (cfg.contact.label) { m.setAttribute('aria-label', cfg.contact.label); m.setAttribute('data-tip', cfg.contact.label); }
    }
    SRC = cfg.sources || {};
    if (cfg.news) initNews(cfg.news);
    initShare(cfg.share || {});
    initStats(cfg.sources || {});
  }).catch(function () { initShare({}); initStats({}); });

  /* ---------- Nouveauté ---------- */
  function initNews(n) {
    var t = $('news-title');
    t.textContent = '';
    if (n.url) t.appendChild(el('a', { href: n.url }, n.title)); else t.textContent = n.title;
    if (n.newUntil && new Date() <= new Date(n.newUntil + 'T23:59:59')) $('news-badge').hidden = false;
  }

  FILL.news = function (ul) {
    var jobs = [getJSON('data/news.json').then(function (d) {
      return (d.news || []).map(function (n) { return { date: n.date, site: n.site || 'Portail', title: n.title, text: n.text, url: n.url }; });
    })];
    if (SRC.labNews) jobs.push(getJSON(SRC.labNews).then(function (d) {
      return (d.updates || []).map(function (n) {
        return { date: n.date, site: 'Laboratoire', title: n.title, text: n.text, url: n.href ? (SRC.labBase || '') + n.href.replace(/^\//, '') : '' };
      });
    }));
    Promise.allSettled(jobs).then(function (res) {
      var items = [];
      res.forEach(function (r) { if (r.status === 'fulfilled') items = items.concat(r.value); });
      items.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
      ul.textContent = '';
      if (!items.length) { ul.appendChild(el('li', { 'class': 'd-empty' }, 'Rien de neuf pour le moment.')); return; }
      items.slice(0, 8).forEach(function (n) {
        var li = el('li'), head = el('span', { 'class': 'd-news-meta' });
        var d = n.date ? new Date(n.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
        head.textContent = [n.site, d].filter(Boolean).join(' · ');
        li.appendChild(head);
        var t = n.url ? el('a', { href: n.url, target: '_blank', rel: 'noopener' }, n.title) : el('b', null, n.title);
        li.appendChild(t);
        if (n.text) li.appendChild(el('p', null, n.text));
        ul.appendChild(li);
      });
    });
  };

  /* ---------- Compteurs ---------- */
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function renderStats(s) {
    /* Thèmes & immersions : un seul chiffre, le détail est dans l'infobulle */
    var th = s.themes || 0, im = s.immersions || 0;
    s = Object.assign({}, s, { themes: th + im });
    var tip = $('tip-themes');
    if (tip && th) tip.textContent = th + ' thème' + (th > 1 ? 's' : '') + ' animé' + (th > 1 ? 's' : '') + ' sur Codex Mental' +
      (im ? ' et ' + im + ' immersion' + (im > 1 ? 's' : '') : ', et bientôt des immersions');
    document.querySelectorAll('#stats .stat').forEach(function (c) {
      var v = s[c.getAttribute('data-key')], b = c.querySelector('b');
      var ok = typeof v === 'number' && v > 0;
      b.textContent = ok ? pad(v) : '··';
      c.classList.toggle('empty', !ok);
    });
  }
  function initStats(src) {
    getJSON('data/stats.json').then(function (base) {
      var cached = recall('cx-portail-stats-v3', 6 * 3600 * 1000);
      if (cached) { renderStats(Object.assign({}, base, cached)); return; }
      renderStats(base);
      var live = {}, jobs = [];
      if (src.codexCatalog) jobs.push(getJSON(src.codexCatalog).then(function (cat) {
        var arts = cat.articles || {}, keys = Object.keys(arts);
        live.articles = keys.filter(function (k) { return arts[k].type === 'article'; }).length;
        live.ideasCodex = keys.filter(function (k) { return k.indexOf('atelier/') === 0 && k !== 'atelier/intro'; }).length;
      }));
      if (src.obsHypotheses) jobs.push(getJSON(src.obsHypotheses).then(function (h) {
        live.ideasObs = (h.hypotheses || []).filter(function (x) { return !x.brouillon && x.statut !== 'exemple'; }).length;
      }));
      if (src.labProjects) jobs.push(getJSON(src.labProjects).then(function (lab) {
        var list = Array.isArray(lab) ? lab : (lab.projects || []), skip = src.labNotApps || [];
        live.apps = list.filter(function (x) { return x && skip.indexOf(x.id) < 0; }).length;
      }));
      if (src.codexThemes) jobs.push(getJSON(src.codexThemes).then(function (t) {
        var list = Array.isArray(t) ? t : (t.themes || []);
        live.themes = list.filter(function (x) { return x && x.enabled !== false; }).length;
      }));
      Promise.allSettled(jobs).then(function () {
        var out = {};
        if (live.articles) out.articles = live.articles;
        if (live.themes) out.themes = live.themes;
        if (live.apps) out.apps = live.apps;
        var ideas = (live.ideasCodex || 0) + (live.ideasObs || 0);
        if (ideas) out.ideas = ideas;
        if (Object.keys(out).length) { store('cx-portail-stats-v3', out); renderStats(Object.assign({}, base, out)); }
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
      var im = el('img', { src: p.image, alt: alt, width: '480', height: '720', decoding: 'async', 'data-zoom': p.image, 'data-zoom-alt': alt });
      if (i > 0) im.setAttribute('loading', 'lazy');
      stage.appendChild(im);
      return im;
    });
    // Image entière (contain) ; si son ratio est à moins de 3 % de celui du cadre, elle le remplit (cover).
    function fit() {
      var r = stage.clientWidth / stage.clientHeight;
      if (!r) return;
      imgs.forEach(function (im) {
        if (!im.naturalWidth) return;
        im.classList.toggle('cover', Math.abs(r / (im.naturalWidth / im.naturalHeight) - 1) < 0.03);
      });
    }
    imgs.forEach(function (im) { im.addEventListener('load', fit); });
    window.addEventListener('resize', fit);
    var cur = Math.floor(Math.random() * list.length);
    var every = (data.interval || 25) * 1000, pauseFor = (data.pauseAfterClick || 60) * 1000;
    var timer = null, resume = null;
    function show(i) {
      cur = (i + list.length) % list.length;
      imgs.forEach(function (im, k) { im.classList.toggle('on', k === cur); im.setAttribute('aria-hidden', k === cur ? 'false' : 'true'); });
      stage.style.setProperty('--poster-bg', 'url("' + new URL(list[cur].image, document.baseURI).href + '")');
      status.textContent = (cur + 1) + ' / ' + list.length;
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
      show(cur + d);
      resume = setTimeout(start, pauseFor);
    }
    $('poster-prev').addEventListener('click', function () { manual(-1); });
    $('poster-next').addEventListener('click', function () { manual(1); });
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
    var card = $('nox'), btn = $('nox-btn'), img = $('nox-img'), title = $('nox-title'), line = $('nox-line');
    var timer = null, state = 'sleeping', lastR = -1, preloaded = false;
    function preload() {
      if (preloaded) return; preloaded = true;
      [nox.waking, nox.idle].concat(nox.reactions).forEach(function (s) { var i = new Image(); i.src = s.img; });
    }
    function set(s, name) {
      state = name;
      img.src = s.img;
      title.textContent = s.title;
      line.textContent = name === 'sleeping' ? '' : s.line;
      card.classList.toggle('awake', name !== 'sleeping');
      img.classList.remove('hop', 'breathe'); void img.offsetWidth;
      img.classList.add(name === 'sleeping' ? 'breathe' : 'hop');
      var lab = name === 'sleeping' ? 'Réveiller Nox' : 'Taquiner Nox';
      btn.setAttribute('aria-label', lab);
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
      }, 4200);
    }
    btn.addEventListener('pointerenter', preload);
    btn.addEventListener('focus', preload);
    btn.addEventListener('click', function () {
      preload(); clearTimeout(timer);
      if (state === 'sleeping') { set(nox.waking, 'waking'); timer = setTimeout(react, 1300); }
      else react();
    });
  }).catch(function () {});

  /* ---------- Expérience : boîte de Schrödinger ---------- */
  var box = $('box');
  box.addEventListener('click', function () {
    var open = !box.classList.contains('open');
    box.classList.toggle('open', open);
    var lab = open ? 'Refermer la boîte' : 'Ouvrir la boîte';
    box.setAttribute('aria-label', lab);
  });

  /* ---------- Côté gamer ---------- */
  var sid = 0;
  function scene(kind) {
    var u = 's' + (++sid), s;
    var stars = '<g fill="#fff"><circle cx="14" cy="12" r=".9"/><circle cx="40" cy="22" r=".6"/><circle cx="96" cy="10" r="1"/><circle cx="70" cy="30" r=".6"/><circle cx="108" cy="34" r=".8"/></g>';
    switch (kind) {
      case 'space': s =
        '<defs><radialGradient id="' + u + 'a" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="#3b1d6e"/><stop offset="1" stop-color="#07051a"/></radialGradient>' +
        '<linearGradient id="' + u + 'b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ff6ff"/><stop offset="1" stop-color="#5b3bc4"/></linearGradient></defs>' +
        '<rect width="120" height="90" fill="url(#' + u + 'a)"/>' + stars +
        '<circle cx="70" cy="50" r="22" fill="url(#' + u + 'b)"/><path d="M48 50a22 22 0 0 0 44 0" fill="#07051a" fill-opacity=".35"/>' +
        '<ellipse cx="70" cy="50" rx="38" ry="8" fill="none" stroke="#ffd27a" stroke-opacity=".7" stroke-width="1.5" transform="rotate(-14 70 50)"/>' +
        '<circle cx="24" cy="70" r="5" fill="#c9a4ff" fill-opacity=".8"/>'; break;
      case 'ocean': s =
        '<defs><linearGradient id="' + u + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1fa3c4"/><stop offset=".55" stop-color="#0b3b6b"/><stop offset="1" stop-color="#061230"/></linearGradient></defs>' +
        '<rect width="120" height="90" fill="url(#' + u + 'a)"/>' +
        '<path d="M30 0L46 90H38L22 0ZM64 0L78 90H72L58 0Z" fill="#bff6ff" fill-opacity=".1"/>' +
        '<path d="M8 90C10 72 4 66 9 54M16 90C14 76 20 70 15 60M100 90C104 74 98 68 104 58" fill="none" stroke="#2bd4a0" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".7"/>' +
        '<path d="M60 52c6-6 16-6 22 0-6 6-16 6-22 0zM82 52l6-4v8z" fill="#ffb27a" fill-opacity=".85"/>' +
        '<g fill="none" stroke="#e8fbff" stroke-opacity=".7"><circle cx="40" cy="40" r="2"/><circle cx="44" cy="30" r="1.4"/><circle cx="38" cy="22" r="1"/></g>'; break;
      case 'planet': s =
        '<defs><linearGradient id="' + u + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1f5c"/><stop offset=".6" stop-color="#ff9a6b"/><stop offset="1" stop-color="#ffd27a"/></linearGradient></defs>' +
        '<rect width="120" height="90" fill="url(#' + u + 'a)"/>' + stars +
        '<circle cx="92" cy="22" r="9" fill="#ffe6c4" fill-opacity=".85"/>' +
        '<path d="M0 64C26 56 50 60 74 54S110 52 120 56V90H0Z" fill="#3a1f3f"/>' +
        '<path d="M30 60a12 12 0 0 1 24 0Z" fill="#8ff6ff" fill-opacity=".35" stroke="#8ff6ff" stroke-opacity=".8"/>' +
        '<path d="M70 56v-10M66 50l4-4 4 4" stroke="#9dff8a" stroke-width="1.5" fill="none"/>'; break;
      case 'base': s =
        '<defs><linearGradient id="' + u + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1236"/><stop offset="1" stop-color="#1d3a7a"/></linearGradient></defs>' +
        '<rect width="120" height="90" fill="url(#' + u + 'a)"/>' + stars +
        '<path d="M0 62L20 54 38 60 62 50 86 58 120 50V90H0Z" fill="#191a3a"/>' +
        '<path d="M44 64h34v10H44z" fill="#2a2f5c" stroke="#8ff6ff" stroke-opacity=".6"/>' +
        '<path d="M50 64a11 11 0 0 1 22 0" fill="#8ff6ff" fill-opacity=".25" stroke="#8ff6ff" stroke-opacity=".8"/>' +
        '<path d="M86 74V44" stroke="#c9a4ff" stroke-width="1.5"/><circle cx="86" cy="42" r="2.4" fill="#ffd27a"/>' +
        '<rect x="50" y="68" width="4" height="3" fill="#ffd27a"/><rect x="58" y="68" width="4" height="3" fill="#ffd27a"/>'; break;
      case 'raft': s =
        '<defs><linearGradient id="' + u + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7fbf"/><stop offset=".55" stop-color="#ffb27a"/><stop offset=".56" stop-color="#1b4f7a"/><stop offset="1" stop-color="#0b2142"/></linearGradient></defs>' +
        '<rect width="120" height="90" fill="url(#' + u + 'a)"/>' +
        '<circle cx="84" cy="48" r="11" fill="#ffe6c4" fill-opacity=".9"/>' +
        '<path d="M0 50H120V90H0Z" fill="#1b4f7a" fill-opacity=".55"/>' +
        '<path d="M30 64h40l-3 5H33z" fill="#6b3d22"/><path d="M50 64V36" stroke="#3a2416" stroke-width="1.6"/><path d="M51 38l14 20H51z" fill="#f4e6d0"/>' +
        '<path d="M0 74c10 0 10-3 20-3s10 3 20 3 10-3 20-3 10 3 20 3 10-3 20-3 10 3 20 3" fill="none" stroke="#bff6ff" stroke-opacity=".45"/>'; break;
      case 'bug': s =
        '<defs><linearGradient id="' + u + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a8"/><stop offset="1" stop-color="#3f7a3a"/></linearGradient></defs>' +
        '<rect width="120" height="90" fill="url(#' + u + 'a)"/>' +
        '<path d="M10 90C14 50 20 30 26 4 26 40 24 64 22 90ZM44 90C50 60 62 40 80 20 66 46 58 66 56 90ZM96 90C98 56 104 36 116 14 110 44 108 66 108 90Z" fill="#2f6b2c"/>' +
        '<path d="M80 90C78 70 72 58 64 46 74 58 84 70 90 90Z" fill="#245622"/>' +
        '<g transform="translate(40 66)"><ellipse rx="9" ry="7" fill="#d23b3b"/><path d="M0-7V7" stroke="#2a0f0f"/><circle cx="-3.5" cy="-1" r="1.4" fill="#2a0f0f"/><circle cx="3.5" cy="2" r="1.4" fill="#2a0f0f"/><circle cy="-8" r="3" fill="#2a0f0f"/></g>'; break;
      case 'mmo': s =
        '<defs><linearGradient id="' + u + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1250"/><stop offset="1" stop-color="#5b3bc4"/></linearGradient></defs>' +
        '<rect width="120" height="90" fill="url(#' + u + 'a)"/>' + stars +
        '<circle cx="92" cy="20" r="8" fill="#f4ecff"/><circle cx="95" cy="18" r="7" fill="#1d1250"/>' +
        '<path d="M0 74C30 58 60 56 120 70V90H0Z" fill="#140c33"/>' +
        '<path d="M44 66V40h6v6h4V34h6v12h4v-6h6v26z" fill="#2a1f5c" stroke="#c9a4ff" stroke-opacity=".6"/>' +
        '<path d="M57 34l3-8 3 8z" fill="#c9a4ff"/><rect x="58" y="52" width="4" height="6" fill="#ffd27a"/><rect x="46" y="48" width="2.5" height="4" fill="#ffd27a"/>'; break;
      default: s =
        '<defs><radialGradient id="' + u + 'a"><stop offset="0" stop-color="#7a4dff"/><stop offset="1" stop-color="#07051a"/></radialGradient></defs>' +
        '<rect width="120" height="90" fill="url(#' + u + 'a)"/>' + stars;
    }
    return '<svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + s + '</svg>';
  }
  getJSON('data/games.json').then(function (d) {
    var list = (d.games || []).filter(function (g) { return g.name; });
    if (d.enabled === false || !list.length) return;
    var sec = $('gamer'), art = $('gamer-art'), nm = $('gamer-name'), nextBtn = $('games-next');
    var order = list.map(function (_, i) { return i; }).sort(function () { return Math.random() - .5; });
    var pos = 0, timer = null, every = (d.interval || 45) * 1000;
    function show() {
      var g = list[order[pos % order.length]];
      art.textContent = '';
      if (g.image) art.appendChild(el('img', { src: g.image, alt: '', loading: 'lazy' }));
      else art.insertAdjacentHTML('beforeend', scene(g.icon));
      nm.textContent = g.name;
      nm.style.animation = 'none'; void nm.offsetWidth; nm.style.animation = '';
    }
    function start() {
      clearInterval(timer);
      if (reduced || list.length < 2) return;
      timer = setInterval(function () { if (!document.hidden) { pos++; show(); } }, every);
    }
    if (list.length < 2) nextBtn.hidden = true;
    nextBtn.addEventListener('click', function () { pos++; show(); start(); });
    FILL.games = function (ul) {
      list.forEach(function (g) {
        var li = el('li'), art = el('span', { 'class': 'd-game-art', 'aria-hidden': 'true' });
        if (g.image) art.appendChild(el('img', { src: g.image, alt: '', loading: 'lazy' }));
        else art.insertAdjacentHTML('beforeend', scene(g.icon));
        li.appendChild(art);
        var txt = el('span', { 'class': 'd-game-txt' });
        txt.appendChild(el('b', null, g.name));
        if (g.genre) txt.appendChild(el('span', null, g.genre));
        li.appendChild(txt);
        ul.appendChild(li);
      });
    };
    sec.hidden = false;
    show(); start();
  }).catch(function () {});

  /* ---------- Réseaux, partage, QR code ---------- */
  var ICONS = {
    github: '<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.3c3-.3 6-1.5 6-6.5a5 5 0 0 0-1.4-3.5 4.6 4.6 0 0 0-.1-3.5s-1.1-.3-3.6 1.4a12.4 12.4 0 0 0-6.5 0C6 1.4 5 1.7 5 1.7a4.6 4.6 0 0 0-.1 3.5A5 5 0 0 0 3.5 8.7c0 5 3 6.2 6 6.5a3 3 0 0 0-.9 2.3V21"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-7M12 13a3 3 0 0 1 6 0v4"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/>',
    twitch: '<path d="M4 3h16v11l-4 4h-4l-3 3v-3H4z"/><path d="M11 8v4M16 8v4"/>',
    mastodon: '<path d="M20 12.5c0 4-3 5-8 5-1.5 0-3-.2-4-.6 0 1.6 1.5 3.1 5 2.6M4 9c0-4 3-5 8-5s8 1 8 5v3.5"/><path d="M8 13V9.5a2 2 0 0 1 4 0V12m0-2.5a2 2 0 0 1 4 0V13"/>',
    bluesky: '<path d="M12 11c-1.5-3-5-6.5-7-6.5-1.5 0-1.5 2-1 4.5.5 2 2.5 3 5 2.5-3 .8-4 2.7-2 4.5 2.5 2.2 4-.5 5-3 1 2.5 2.5 5.2 5 3 2-1.8 1-3.7-2-4.5 2.5.5 4.5-.5 5-2.5.5-2.5.5-4.5-1-4.5-2 0-5.5 3.5-7 6.5z"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>'
  };
  Object.assign(ICONS, {
    discord: '<path d="M8 6.5C6 7 4.6 7.6 4 8c-1.3 3-2 6-1.6 9 1.6 1.2 3.3 1.8 5 2l1-1.6M16 6.5c2 .5 3.4 1.1 4 1.5 1.3 3 2 6 1.6 9-1.6 1.2-3.3 1.8-5 2l-1-1.6M7 16c3.3 1.6 6.7 1.6 10 0M8 6.5c2.6-.7 5.4-.7 8 0"/><circle cx="9" cy="12.5" r="1.3"/><circle cx="15" cy="12.5" r="1.3"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.2 4.2 5 4.5"/>',
    behance: '<path d="M3 7h5a2.5 2.5 0 0 1 0 5H3zM3 12h5.5a2.5 2.5 0 0 1 0 5H3zM14 13.5h7a3.5 3.5 0 1 0-1 2.6M15 7.5h5"/>',
    deviantart: '<path d="M17 3h-4l-1.5 3H7v5h3l-3 6v4h4l1.5-3H17v-5h-3l3-6z"/>',
    artstation: '<path d="M2.5 17l2 3.5h11l-2-3.5zM9.5 4.5h4l8 13.5-2 3.5zM8 15.5l3.5-6 3.5 6z"/>',
    pinterest: '<circle cx="12" cy="12" r="9"/><path d="M11 8.5c3-1 5.5 1 4.5 4s-3.5 3-4 1.5M11.5 11l-2.5 9"/>',
    reddit: '<ellipse cx="12" cy="14" rx="8" ry="5.5"/><circle cx="18.5" cy="5.5" r="1.5"/><path d="M12 8.5L13.5 4l5 1.5"/><circle cx="9" cy="13.5" r="1"/><circle cx="15" cy="13.5" r="1"/><path d="M9.5 16.5c1.6 1 3.4 1 5 0"/>',
    steam: '<circle cx="12" cy="12" r="9"/><circle cx="15.5" cy="9.5" r="2.5"/><circle cx="9" cy="15" r="1.8"/><path d="M3.5 13l4 1.6M10.6 14.2l3-2.6"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>'
  });
  function socialLink(s, withName) {
    var a = el('a', { 'class': withName ? 'social-row' : 'icon-btn', href: s.url, rel: 'me noopener', target: '_blank' });
    if (!withName) { a.setAttribute('aria-label', s.name); a.setAttribute('data-tip', s.name); }
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[s.icon] || ICONS.web) + '</svg>';
    if (withName) a.appendChild(el('span', null, s.name));
    return a;
  }
  getJSON('data/socials.json').then(function (d) {
    var all = (d.socials || []).filter(function (s) { return s.url; });
    var wrap = $('links'), more = $('socials-more');
    all.filter(function (s) { return s.main; }).slice(0, 3).forEach(function (s) { wrap.insertBefore(socialLink(s, false), more); });
    var groupsEl = $('socials-groups'), names = d.groups || {};
    Object.keys(names).forEach(function (g) {
      var items = all.filter(function (s) { return (s.group || 'perso') === g; });
      if (!items.length) return;
      var sec = el('div', { 'class': 'panel-group' });
      sec.appendChild(el('p', { 'class': 'panel-title' }, names[g]));
      var list = el('div', { 'class': 'panel-list' });
      items.forEach(function (s) { list.appendChild(socialLink(s, true)); });
      sec.appendChild(list);
      groupsEl.appendChild(sec);
    });
  }).catch(function () {});
  var panel = $('socials-panel');
  $('socials-more').addEventListener('click', function () { if (panel.showModal) panel.showModal(); });
  $('socials-close').addEventListener('click', function () { panel.close(); });
  panel.addEventListener('click', function (e) { if (e.target === panel) panel.close(); });

  function initShare(sh) {
    var url = sh.url || location.origin + '/';
    $('share-btn').addEventListener('click', function () {
      if (navigator.share) { navigator.share({ title: sh.title || document.title, url: url }).catch(function () {}); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Lien copié'); }, function () { prompt('Lien du portail :', url); });
      else prompt('Lien du portail :', url);
    });
  }

  /* ---------- Atelier d'écriture (si activé) ---------- */
  var STATUS = { idee: 'Idée', preparation: 'Préparation', ecriture: 'Écriture', revision: 'Révision', termine: 'Terminé' };
  function initAtelier() {
    getJSON('data/works.json').then(function (d) {
      var works = d.works || [];
      if (!works.length) return;
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
