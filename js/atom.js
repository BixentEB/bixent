/* Atome du portail — même esprit que le thème Atome de Codex Mental :
   noyau de nucléons qui frémit, trois électrons lumineux (Codex, Labo,
   Observatoire) avec traînées de comète, en 3D projetée. Canvas 2D,
   fond transparent, se met en pause hors écran. */
(function () {
  'use strict';
  var cv = document.getElementById('atom');
  if (!cv || !cv.getContext) return;
  var g = cv.getContext('2d');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2, D2R = Math.PI / 180;

  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function glow(col, core) {
    var s = document.createElement('canvas'), z = 128; s.width = s.height = z;
    var x = s.getContext('2d'), c = rgb(col), gr = x.createRadialGradient(z / 2, z / 2, 0, z / 2, z / 2, z / 2);
    gr.addColorStop(0, core ? 'rgba(255,255,255,1)' : 'rgba(' + c + ',.9)');
    gr.addColorStop(core ? .06 : .15, 'rgba(' + c + ',.95)');
    gr.addColorStop(.18, 'rgba(' + c + ',.55)');
    gr.addColorStop(.42, 'rgba(' + c + ',.16)');
    gr.addColorStop(1, 'rgba(' + c + ',0)');
    x.fillStyle = gr; x.fillRect(0, 0, z, z); return s;
  }
  function ball(a, b) {
    var s = document.createElement('canvas'), z = 64; s.width = s.height = z;
    var x = s.getContext('2d'), gr = x.createRadialGradient(z * .36, z * .32, z * .04, z * .5, z * .5, z * .5);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.25, a); gr.addColorStop(.85, b); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.beginPath(); x.arc(z / 2, z / 2, z / 2, 0, TAU); x.fill(); return s;
  }

  var E = [
    { c: '#8ff6ff', r: .62, w: .9, inc: 72, node: 20, ph: 0 },
    { c: '#c9a4ff', r: .9, w: .55, inc: 64, node: 140, ph: 2.2 },
    { c: '#ffb27a', r: .9, w: .48, inc: 66, node: 260, ph: 4.4 }
  ];
  E.forEach(function (e, i) { e.rgb = rgb(e.c); e.spr = glow(e.c, true); e.halo = glow(e.c, false); e.i = i; e.th = e.ph; e.U = [0, 0, 0]; e.V = [0, 0, 0]; });
  var PROTON = ball('#ff7fae', '#8a1a52'), NEUTRON = ball('#a9c8ff', '#2a3f8f');
  var NGLOW = glow('#ff9a6b', true), NGLOW2 = glow('#c06bff', false), SPARK = glow('#ffffff', true);

  var NUC = [{ p: [0, 0, 0] }];
  for (var i = 0; i < 10; i++) {
    var y = 1 - (i + .5) / 10 * 2, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    NUC.push({ p: [Math.cos(a) * rr * .13, y * .13, Math.sin(a) * rr * .13] });
  }
  var kinds = [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  NUC.forEach(function (n, k) { n.k = kinds[k]; n.f = 2.2 + Math.random() * 2.5; n.ph = Math.random() * TAU; n.o = [0, 0, 0]; });

  var W = 0, H = 0, DPR = 1, R = 100, CX = 0, CY = 0;
  function resize() {
    var b = cv.getBoundingClientRect();
    W = b.width; H = b.height; DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    R = Math.min(W, H) * .34; CX = W / 2; CY = H / 2;
    if (reduce || !running) frame(0);
  }

  var yaw = .4, pitch = .42, cY = 1, sY = 0, cP = 1, sP = 0, OUT = [0, 0, 0, 0], DC = 3.4;
  function setRot(yv, pv) { cY = Math.cos(yv); sY = Math.sin(yv); cP = Math.cos(pv); sP = Math.sin(pv); }
  function proj(x, yv, z) {
    var x1 = x * cY + z * sY, z1 = -x * sY + z * cY, y2 = yv * cP - z1 * sP, z2 = yv * sP + z1 * cP, s = DC / (DC + z2);
    OUT[0] = CX + x1 * R * s; OUT[1] = CY + y2 * R * s; OUT[2] = z2; OUT[3] = s; return OUT;
  }
  function basis(e, t) {
    var ic = e.inc * D2R, n = e.node * D2R + t * .03 * (e.i % 2 ? -1 : 1), ci = Math.cos(ic), si = Math.sin(ic), cn = Math.cos(n), sn = Math.sin(n);
    e.U[0] = cn; e.U[1] = 0; e.U[2] = -sn; e.V[0] = ci * sn; e.V[1] = -si; e.V[2] = ci * cn;
  }
  function orbitPt(e, th, rad) {
    var c = Math.cos(th) * rad, s = Math.sin(th) * rad;
    return proj(e.U[0] * c + e.V[0] * s, e.U[1] * c + e.V[1] * s, e.U[2] * c + e.V[2] * s);
  }
  function strokeOrbit(e, back) {
    var started = false, N = 72;
    g.beginPath();
    for (var k = 0; k <= N; k++) {
      var p = orbitPt(e, k / N * TAU, e.r), inn = back ? p[2] > 0 : p[2] <= 0;
      if (inn) { if (started) g.lineTo(p[0], p[1]); else { g.moveTo(p[0], p[1]); started = true; } } else started = false;
    }
    g.strokeStyle = 'rgba(' + e.rgb + ',' + (back ? .14 : .38) + ')';
    g.lineWidth = back ? 1 : 1.4; g.stroke();
  }
  function drawElectron(e) {
    var A = e.sz > 0 ? .7 : 1, segs = 22, len = 1.5, prev = orbitPt(e, e.th, e.r), px = prev[0], py = prev[1];
    for (var j = 1; j <= segs; j++) {
      var f = j / segs, p2 = orbitPt(e, e.th - f * len, e.r), al = Math.pow(1 - f, 1.6) * .7 * A;
      g.strokeStyle = 'rgba(' + e.rgb + ',' + al + ')'; g.lineWidth = (3.2 * (1 - f) + .4) * p2[3];
      g.beginPath(); g.moveTo(px, py); g.lineTo(p2[0], p2[1]); g.stroke(); px = p2[0]; py = p2[1];
    }
    var gz = R * .44 * e.ss, hz = gz * 2.4;
    g.globalAlpha = A * .38; g.drawImage(e.halo, e.sx - hz / 2, e.sy - hz / 2, hz, hz);
    g.globalAlpha = A; g.drawImage(e.spr, e.sx - gz / 2, e.sy - gz / 2, gz, gz); g.globalAlpha = 1;
  }
  function drawNucleus(t) {
    var pulse = 1 + Math.sin(t * 2.1) * .06 + Math.sin(t * 5.3) * .025, gz = R * .9 * pulse, p = proj(0, 0, 0), px = p[0], py = p[1];
    g.globalAlpha = .3; g.drawImage(NGLOW2, px - gz, py - gz, gz * 2, gz * 2);
    g.globalAlpha = .7; g.drawImage(NGLOW, px - gz * .42, py - gz * .42, gz * .84, gz * .84); g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    var list = NUC.map(function (n) {
      var j = reduce ? 0 : .008;
      n.o[0] = n.p[0] + Math.sin(t * n.f + n.ph) * j; n.o[1] = n.p[1] + Math.sin(t * n.f * 1.3 + n.ph * 2) * j; n.o[2] = n.p[2] + Math.cos(t * n.f + n.ph) * j;
      var q = proj(n.o[0], n.o[1], n.o[2]); return { x: q[0], y: q[1], z: q[2], s: q[3], k: n.k };
    }).sort(function (a, b) { return b.z - a.z; });
    var bz = R * .17;
    list.forEach(function (n) { var z = bz * n.s; g.drawImage(n.k ? PROTON : NEUTRON, n.x - z / 2, n.y - z / 2, z, z); });
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = .35; g.drawImage(SPARK, px - gz * .18, py - gz * .18, gz * .36, gz * .36); g.globalAlpha = 1;
  }
  function frame(t) {
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.clearRect(0, 0, W, H);
    setRot(yaw + t * .06, pitch + Math.sin(t * .2) * .06);
    E.forEach(function (e) {
      basis(e, t); e.th = e.ph + t * e.w;
      var p = orbitPt(e, e.th, e.r); e.sx = p[0]; e.sy = p[1]; e.sz = p[2]; e.ss = p[3];
    });
    g.globalCompositeOperation = 'lighter';
    E.forEach(function (e) { strokeOrbit(e, true); });
    E.forEach(function (e) { if (e.sz > 0) drawElectron(e); });
    drawNucleus(t);
    E.forEach(function (e) { strokeOrbit(e, false); });
    E.forEach(function (e) { if (e.sz <= 0) drawElectron(e); });
    g.globalCompositeOperation = 'source-over';
  }

  var running = false, visible = true, t0 = performance.now(), tAcc = 0, last = 0;
  function loop(now) {
    if (!running) return;
    var dt = Math.min(.05, (now - last) / 1000); last = now; tAcc += dt;
    frame(tAcc);
    requestAnimationFrame(loop);
  }
  function update() {
    var should = !reduce && visible && !document.hidden;
    if (should && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    else if (!should) running = false;
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; update(); }).observe(cv);
  }
  document.addEventListener('visibilitychange', update);
  window.addEventListener('resize', resize);
  resize();
  tAcc = 2.5;
  frame(tAcc);
  update();
})();
