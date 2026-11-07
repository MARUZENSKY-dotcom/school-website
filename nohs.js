/* menu button + notice bar (page switching is done by the browser: every page is its own file) */
(function(){
var d=document.getElementById('dismiss');
if(d)d.addEventListener('click',function(){document.getElementById('notice').style.display='none'});
var mb=document.getElementById('menuBtn');
if(mb)mb.addEventListener('click',function(){var o=document.querySelector('header.site').classList.toggle('open');mb.setAttribute('aria-expanded',o)});
})();


/* NOHS effects v3
   - soft click sounds made from the PS2 BIOS sound file
   - maroon / gold particles that follow the site theme (light + dark)
   - background music that starts automatically
   - lightbox, page transitions, cursor, magnetic buttons */
(function () {
'use strict';
var MULTI = !!window.NOHS_MULTI;            /* true when every page is its own .html file */
var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
var HTML = document.documentElement;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
var SPRING = 'cubic-bezier(0.2, 1.25, 0.35, 1)', EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} }
function sstore(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} }
function num(v, d) { v = parseFloat(v); return isNaN(v) ? d : v; }

/* ---------- CSS (maroon / gold theme) ---------- */
var st = document.createElement('style');
st.textContent =
'.page.active{animation:none}' +
'.lb{background:rgba(10,0,0,0);transition:background .4s,backdrop-filter .4s}' +
'.lb.show{background:rgba(10,0,0,.88);backdrop-filter:blur(7px)}' +
'.lb-inner{width:min(960px,100%);box-shadow:0 30px 80px rgba(0,0,0,.55);border-top:4px solid var(--goldl)}' +
'.lb-img{width:100%;height:auto;max-height:68vh}' +
'.lb-cap h2{color:var(--maroon)}' +
'.lb-dots{display:flex;gap:6px;margin-top:.8rem}' +
'.lb-dots i{height:4px;flex:1;border-radius:3px;background:var(--line);overflow:hidden;position:relative}' +
'.lb-dots i::after{content:"";position:absolute;inset:0;background:var(--maroon);transform:scaleX(0);transform-origin:left;transition:transform .45s ' + SPRING + '}' +
'.lb-dots i.on::after{transform:scaleX(1)}' +
'.lb-dots i.done::after{transform:scaleX(1);background:var(--goldl)}' +
'.gthumb::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 55%,rgba(60,0,0,.35));opacity:0;transition:opacity .3s}' +
'.gcard:hover .gthumb::after{opacity:1}' +
'.apanel .acol output{float:right;font-weight:700;color:var(--maroon);font-size:.8rem}' +
'#audioBtn[aria-expanded=true]{transform:rotate(90deg)}' +
'#audioBtn{transition:transform .45s ' + SPRING + ',background .15s}' +
'#particles{z-index:1}' +
'body.lb-lock{overflow:hidden}' +
'.mhint{position:fixed;z-index:33;right:calc(1rem + 50px + .7rem + env(safe-area-inset-right,0px));bottom:calc(1rem + 9px + env(safe-area-inset-bottom,0px));' +
 'background:var(--maroon);color:var(--on-maroon);font:600 .85rem/1 Inter,system-ui,sans-serif;padding:.65rem 1rem;border-radius:999px;' +
 'box-shadow:0 6px 18px rgba(0,0,0,.28);pointer-events:none;transition:opacity .4s;border:1px solid var(--goldl)}' +
'@media (max-width:480px){.mhint{font-size:.78rem;padding:.55rem .8rem}}' +
'@media print{.mhint{display:none}}';
document.head.appendChild(st);

/* =====================================================================
   AUDIO
   ===================================================================== */
var SPR = {"hover": [0.02, 0.2], "select": [0.34, 0.4], "nav": [0.86, 0.65], "open": [1.63, 0.55], "close": [2.3, 0.7], "chime": [3.12, 1.0], "next": [4.24, 0.4], "prev": [4.76, 0.4], "tick": [5.28, 0.27]};                                   /* clips cut from the PS2 BIOS sound file */
var sv = num(store('nohs.sv3'), .5);                  /* click-sound slider 0..1 (quiet default) */
var mv = num(store('nohs.mv2'), .65);                  /* music slider 0..1 */
var sfxOn = store('nohs.sfx') !== '0', musicOn = store('nohs.music') !== '0';
var MUSIC_MAX = .35;                                   /* music never exceeds 35% */
var MUSIC_URL = window.NOHS_MUSIC || 'assets/music.mp3', SFX_URL = window.NOHS_SFX || 'assets/sfx.wav';
var ctx = null, bus = null, master = null, buf = null, lastHover = 0, musicStarted = false, fadeT, hint = null;

var music = new Audio(MUSIC_URL); music.loop = true; music.preload = 'auto'; music.volume = 0;
var resumeAt = MULTI ? num(sstore('nohs.mt'), 0) : 0;   /* separate pages: carry the song across pages */
if (resumeAt > 0) music.addEventListener('loadedmetadata', function () {
  try { music.currentTime = resumeAt % (music.duration || 1e9); } catch (e) {}
}, { once: true });
function saveMusic() { if (MULTI && !music.paused) sstore('nohs.mt', music.currentTime); }
addEventListener('pagehide', saveMusic);
if (MULTI) setInterval(saveMusic, 1000);

function masterLevel() { return .8 * Math.pow(sv, 1.5); }
function makeIR() {
  var len = Math.floor(ctx.sampleRate * .7), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  return ir;
}
function decodeSprite() {
  try {
    var u = SFX_URL, done = function (ab) { ctx.decodeAudioData(ab, function (b) { buf = b; }, function () {}); };
    if (u.indexOf('data:') === 0) {
      var s = atob(u.slice(u.indexOf(',') + 1)), a = new Uint8Array(s.length);
      for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
      done(a.buffer);
    } else fetch(u).then(function (r) { return r.arrayBuffer(); }).then(done).catch(function () {});
  } catch (e) {}
}
function initAudio() {
  var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  if (!ctx) {
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    bus = ctx.createGain();
    var comp = ctx.createDynamicsCompressor();          /* keeps every click gentle and even */
    comp.threshold.value = -24; comp.knee.value = 20; comp.ratio.value = 6; comp.attack.value = .002; comp.release.value = .18;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = .5;   /* no harsh highs */
    master = ctx.createGain(); master.gain.value = masterLevel();
    var send = ctx.createGain(); send.gain.value = .16;  /* soft little room tail */
    var rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 4200;
    var verb = ctx.createConvolver(); verb.buffer = makeIR();
    bus.connect(comp); bus.connect(send); send.connect(rlp); rlp.connect(verb); verb.connect(comp);
    comp.connect(lp); lp.connect(master); master.connect(ctx.destination);
    decodeSprite();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

/* Every sound below is cut straight from the PS2 BIOS file you sent, softened (low-pass + short fades)
   and played with a tiny random pitch so repeated clicks never feel mechanical. */
function clip(name, gain, rate, t) {
  var o = SPR[name]; if (!o) return;
  if (!buf) { fallback(t, gain); return; }
  var s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = buf; s.playbackRate.value = (rate || 1) * (.97 + Math.random() * .06); g.gain.value = gain;
  s.connect(g); g.connect(bus); s.start(t, o[0], o[1]);
}
function fallback(t, gain) {                            /* only used for the split second before the clips finish decoding */
  var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(330, t + .1);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12 * gain, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .2);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + .25);
}
var R = {
  select: function (t, v) { clip('select', .60 * v, 1, t); },        /* the click: warm BIOS blip */
  nav:    function (t, v) { clip('nav',    .55 * v, 1, t); },        /* menu / link: BIOS cursor move */
  hover:  function (t, v) { clip('hover',  .22 * v, 1, t); },
  open:   function (t, v) { clip('open',   .60 * v, 1, t); },
  close:  function (t, v) { clip('close',  .55 * v, 1, t); },
  pop:    function (t, v) { clip('tick',   .55 * v, 1, t); },
  soft:   function (t, v) { clip('tick',   .40 * v, .82, t); },
  chime:  function (t, v) { clip('chime',  .50 * v, 1, t); },
  next:   function (t, v) { clip('next',   .60 * v, 1, t); },
  prev:   function (t, v) { clip('prev',   .60 * v, 1, t); }
};
R.tick = R.select;
function sfx(name, vol) {
  if (!sfxOn || !ctx || !R[name]) return;
  if (ctx.state !== 'running') ctx.resume();
  try { R[name](ctx.currentTime + .004, vol == null ? 1 : vol); } catch (e) {}
}

/* ---------- music: starts by itself ---------- */
function setMusicVol(ms) {
  clearInterval(fadeT);
  var target = musicOn ? mv * MUSIC_MAX : 0, from = music.volume, t0 = performance.now();
  fadeT = setInterval(function () {
    var k = Math.min(1, (performance.now() - t0) / (ms || 1));
    music.volume = Math.max(0, Math.min(1, from + (target - from) * k));
    if (k >= 1) { clearInterval(fadeT); if (!musicOn) music.pause(); }
  }, 40);
}
function showHint() {
  if (hint || !musicOn) return;
  hint = document.createElement('div'); hint.className = 'mhint'; hint.setAttribute('role', 'status');
  hint.textContent = '\u266A  Tap anywhere to start the music'; document.body.appendChild(hint);
  if (!RM) hint.animate([{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: EASE });
}
function hideHint() { if (!hint) return; var h = hint; hint = null; h.style.opacity = 0; setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 450); }
function onPlaying() {
  if (musicStarted) return; musicStarted = true; HTML.classList.add('music-on'); hideHint();
  setMusicVol(resumeAt > 0 ? 1200 : 2800);
}
function tryMusic() {
  if (!musicOn) return;
  var p; try { p = music.play(); } catch (e) {}
  if (p && p.then) p.then(onPlaying).catch(function () { showHint(); });
}
function applyMusic(ms) {
  if (musicOn) { if (music.paused) tryMusic(); else { HTML.classList.add('music-on'); setMusicVol(ms); } }
  else { musicStarted = false; HTML.classList.remove('music-on'); setMusicVol(ms || 600); }
}
/* browsers only allow sound after a first tap/click/key: the first one starts everything */
var GEV = ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'touchend', 'keydown', 'click'];
function onGesture() {
  initAudio();
  if (musicOn && !musicStarted) tryMusic();
  if (ctx && ctx.state === 'running' && (musicStarted || !musicOn)) GEV.forEach(function (g) { removeEventListener(g, onGesture, true); });
}
GEV.forEach(function (g) { addEventListener(g, onGesture, true); });
initAudio();                                            /* decode the BIOS clips now so the very first click already has sound */
tryMusic();                                             /* try right away on page load */
music.addEventListener('canplay', function () { if (musicOn && !musicStarted && music.paused) tryMusic(); });

/* ---------- audio panel ---------- */
var ab = $('#audioBtn'), panel = document.createElement('div');
panel.className = 'apanel'; panel.id = 'audioPanel'; panel.hidden = true;
panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'Audio settings');
var svgA = 'viewBox="0 0 24 24" aria-hidden="true"';
panel.innerHTML =
 '<div class="arow"><button type="button" id="musicBtn" class="mag" aria-pressed="' + musicOn + '" aria-label="Music">' +
 '<svg class="mute" ' + svgA + '><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg><span class="eq"><i></i><i></i><i></i><i></i></span></button>' +
 '<div class="acol"><label for="mvol">Music <output id="mvo"></output></label><input id="mvol" type="range" min="0" max="100" step="1"></div></div>' +
 '<div class="arow"><button type="button" id="sndBtn" class="mag" aria-pressed="' + sfxOn + '" aria-label="Sound effects">' +
 '<svg class="on" ' + svgA + '><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>' +
 '<svg class="off" ' + svgA + '><path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/></svg></button>' +
 '<div class="acol"><label for="svol">Click sounds <output id="svo"></output></label><input id="svol" type="range" min="0" max="100" step="1"></div></div>';
document.body.appendChild(panel);
var mvol = $('#mvol'), svol = $('#svol');
function showVals() { $('#mvo').textContent = Math.round(mv * 100) + '%'; $('#svo').textContent = Math.round(sv * 100) + '%'; }
mvol.value = mv * 100; svol.value = sv * 100; showVals();
mvol.oninput = function () { mv = mvol.value / 100; store('nohs.mv2', mv); showVals(); if (musicOn && !music.paused) setMusicVol(150); };
svol.oninput = function () { sv = svol.value / 100; store('nohs.sv3', sv); showVals(); if (master) master.gain.setTargetAtTime(masterLevel(), ctx.currentTime, .02); };
svol.onchange = function () { sfx('select'); };
$('#musicBtn').onclick = function () {
  musicOn = !musicOn; store('nohs.music', musicOn ? '1' : '0'); this.setAttribute('aria-pressed', musicOn);
  initAudio(); applyMusic(900); sfx(musicOn ? 'chime' : 'soft');
};
$('#sndBtn').onclick = function () {
  sfxOn = !sfxOn; store('nohs.sfx', sfxOn ? '1' : '0'); this.setAttribute('aria-pressed', sfxOn); sfx('chime');
};
function togglePanel(open) {
  open = open == null ? panel.hidden : open; panel.hidden = !open; ab.setAttribute('aria-expanded', open);
  if (open && !RM) panel.animate([{ opacity: 0, transform: 'translateY(14px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: SPRING });
  sfx(open ? 'pop' : 'soft');
}
ab.addEventListener('click', function () { togglePanel(); });
document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && !ab.contains(e.target)) togglePanel(false); });
addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { togglePanel(false); ab.focus(); } });
document.addEventListener('visibilitychange', function () {
  if (document.hidden) music.pause(); else if (musicOn && musicStarted) music.play().catch(function () {});
});

/* ---------- interaction sounds ---------- */
var HOT = 'a[href],button,.gcard,.btn,input,select,textarea';
document.addEventListener('pointerover', function (e) {
  if (e.pointerType !== 'mouse') return;
  var t = e.target.closest && e.target.closest(HOT);
  if (!t || (e.relatedTarget && t.contains(e.relatedTarget))) return;
  var n = performance.now(); if (n - lastHover < 90) return; lastHover = n; sfx('hover', .5);
});
function goTo(url) {                                    /* separate pages: let the click sound finish, then go */
  saveMusic();
  var pg = $('.page.active');
  if (pg && !RM) pg.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' });
  setTimeout(function () { location.href = url; }, RM ? 80 : 190);
}
document.addEventListener('click', function (e) {
  var t = e.target.closest && e.target.closest('a[href],button,.btn'); if (!t || t.closest('.lb') || t.closest('.apanel') || t === ab) return;
  var href = t.getAttribute('href') || '';
  var nav = t.closest('nav') || href.charAt(0) === '#' || /\.html?(#|$)/.test(href);
  sfx(nav ? 'nav' : 'select');
  if (t.closest('nav')) { t.classList.remove('ps-pop'); void t.offsetWidth; t.classList.add('ps-pop'); }
  if (MULTI && t.tagName === 'A' && /\.html?(#.*)?$/.test(href) && !/^[a-z]+:/i.test(href) &&
      e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !t.target && !t.hasAttribute('download')) {
    var u = new URL(t.href, location.href);
    if (u.pathname !== location.pathname) { e.preventDefault(); goTo(u.href); }
  }
});

/* ---------- page + scroll transitions ---------- */
function enter() {
  if (RM) return;
  var pg = $('.page.active'); if (!pg) return;
  $$(':scope > *', pg).slice(0, 5).forEach(function (el, i) {
    el.animate([{ opacity: 0, transform: 'translateY(34px) scale(.985)' }, { opacity: 1, transform: 'none' }],
      { duration: 700, delay: i * 90, easing: SPRING, fill: 'backwards' });
  });
}
if (!MULTI) addEventListener('hashchange', function () { enter(); setTimeout(function () { sfx('open', .6); }, 40); });
enter();
if (!RM && 'IntersectionObserver' in window) {
  var seen = new WeakSet(), q = 0, qt;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (!en.isIntersecting || seen.has(en.target)) return; seen.add(en.target); io.unobserve(en.target);
      en.target.animate([{ opacity: 0, transform: 'translateY(40px) scale(.96)' }, { opacity: 1, transform: 'none' }],
        { duration: 650, delay: Math.min(q++, 6) * 70, easing: SPRING, fill: 'backwards' });
      clearTimeout(qt); qt = setTimeout(function () { q = 0; }, 120);
    });
  }, { threshold: .15 });
  $$('.stats li,.prog,.news,.events,.tl li,.values li,.mv2 article,.member,.ccard,.gcard,.form-card').forEach(function (el) { io.observe(el); });
}

/* ---------- cursor, magnetic buttons, card tilt ---------- */
if (FINE && !RM) {
  var cur = $('#cur'), cx = 0, cy = 0, tx = 0, ty = 0, run = false;
  function loop() { cx += (tx - cx) * .22; cy += (ty - cy) * .22; cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px)'; requestAnimationFrame(loop); }
  addEventListener('pointermove', function (e) {
    tx = e.clientX; ty = e.clientY; if (!run) { run = true; cx = tx; cy = ty; loop(); }
    cur.classList.add('show'); cur.classList.toggle('grow', !!e.target.closest(HOT));
  });
  document.addEventListener('pointerdown', function () { cur.classList.add('press'); });
  addEventListener('pointerup', function () { cur.classList.remove('press'); });
  document.documentElement.addEventListener('pointerleave', function () { cur.classList.remove('show'); });
  document.addEventListener('pointermove', function (e) {
    var m = e.target.closest('.mag');
    $$('.mag.moving').forEach(function (el) { if (el !== m) { el.classList.remove('moving'); el.style.transform = ''; } });
    if (m) { var r = m.getBoundingClientRect(); m.classList.add('moving');
      m.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .22) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3) + 'px)'; }
    var c = e.target.closest('.gcard');
    $$('.gcard.moving').forEach(function (el) { if (el !== c) { el.classList.remove('moving'); el.style.transform = ''; } });
    if (c) { var b = c.getBoundingClientRect(), px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
      c.classList.add('moving'); c.style.setProperty('--mx', px * 100 + '%'); c.style.setProperty('--my', py * 100 + '%');
      c.style.transform = 'perspective(800px) translateY(-6px) rotateX(' + ((.5 - py) * 7) + 'deg) rotateY(' + ((px - .5) * 9) + 'deg)'; }
  });
}

/* ---------- particles: x O triangle square, in the site's maroon + gold ---------- */
(function () {
  var cv = $('#particles'), fx = $('#fx'); if (!cv) return;
  var c = cv.getContext('2d'), f = fx.getContext('2d'), W, H, D, P = [], B = [], mx = -999, my = -999;
  var PAL_L = ['#800000', '#6b0000', '#9a2a33', '#a84850', '#c9a24a'];      /* light theme */
  var PAL_D = ['#e08a8a', '#f0a8a8', '#d07a80', '#b06068', '#e3c37a'];      /* dark theme  */
  var COL = PAL_L, fr = 0;
  function dark() { var t = HTML.getAttribute('data-theme'); return t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); }
  function pal() { COL = dark() ? PAL_D : PAL_L; }
  pal();
  function pick() { return Math.random() < .08 ? 4 : (Math.random() * 4) | 0; }   /* maroon first, only a touch of gold */
  function draw(g, t, x, y, s, rot, col, a, lw) {
    g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw; g.lineCap = g.lineJoin = 'round'; g.beginPath();
    if (t === 0) { g.moveTo(-s, -s); g.lineTo(s, s); g.moveTo(s, -s); g.lineTo(-s, s); }
    else if (t === 1) g.arc(0, 0, s * 1.05, 0, 6.2832);
    else if (t === 2) { g.moveTo(0, -s * 1.1); g.lineTo(s * 1.05, s * .8); g.lineTo(-s * 1.05, s * .8); g.closePath(); }
    else if (t === 3) g.rect(-s * .9, -s * .9, s * 1.8, s * 1.8);
    else g.arc(0, 0, s, 0, 6.2832);                                         /* ripple ring */
    g.stroke();
    if (t === 1 || t === 2 || t === 3) { g.globalAlpha = a * .16; g.fillStyle = col; g.fill(); }   /* soft maroon tint inside each shape */
    g.restore();
  }
  function size() {
    D = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    [cv, fx].forEach(function (k) { k.width = W * D; k.height = H * D; });
    c.setTransform(D, 0, 0, D, 0, 0); f.setTransform(D, 0, 0, D, 0, 0);
    var n = Math.max(30, Math.min(70, Math.round(W * H / 22000))); P = [];
    for (var i = 0; i < n; i++) P.push({ t: i % 4, x: Math.random() * W, y: Math.random() * H, s: 2.5 + Math.random() * 3,
      r: Math.random() * 6.28, vr: (Math.random() - .5) * .03, ph: Math.random() * 99, sp: .35 + Math.random() * .6,
      ci: pick(), vx: 0, vy: 0, d: Math.random() * 6.28 });
  }
  size(); addEventListener('resize', size);
  addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; });
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(40, now - last) / 16.67; last = now;
    if ((fr++ % 30) === 0) pal();
    c.clearRect(0, 0, W, H);
    P.forEach(function (p) {
      p.ph += .012 * dt; p.d += Math.sin(p.ph) * .05 * dt;
      var ax = Math.cos(p.d) * p.sp, ay = Math.sin(p.d) * p.sp;
      var dx = p.x - mx, dy = p.y - my, dd = dx * dx + dy * dy;
      if (dd < 9000) { var k = (1 - dd / 9000) * .9; ax += dx / Math.sqrt(dd + 1) * k; ay += dy / Math.sqrt(dd + 1) * k; }
      p.vx += (ax - p.vx) * .06 * dt; p.vy += (ay - p.vy) * .06 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.x < -30) p.x = W + 30; if (p.x > W + 30) p.x = -30; if (p.y < -30) p.y = H + 30; if (p.y > H + 30) p.y = -30;
      draw(c, p.t, p.x, p.y, p.s, p.r, COL[p.ci], .42, 1.3);
    });
    f.clearRect(0, 0, W, H);
    B = B.filter(function (b) { b.a -= (b.ring ? .03 : .022) * dt; return b.a > 0; });
    B.forEach(function (b) {
      if (b.ring) { b.s += 2.2 * dt * (b.a + .15); draw(f, 4, b.x, b.y, b.s, 0, COL[b.ci], b.a * .55, 1.2); return; }
      b.vx *= .94; b.vy *= .94; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt; draw(f, b.t, b.x, b.y, b.s, b.r, COL[b.ci], b.a, 1.3);
    });
    requestAnimationFrame(frame);
  }
  if (RM) { P.forEach(function (p) { draw(c, p.t, p.x, p.y, p.s, p.r, COL[p.ci], .2, 1.8); }); return; }
  requestAnimationFrame(frame);
  window.nohsBurst = function (x, y) {
    B.push({ ring: true, x: x, y: y, s: 6, a: .9, ci: 0 });
    for (var i = 0; i < 7; i++) { var a = i / 7 * 6.28 + Math.random() * .5, v = 1.8 + Math.random() * 2;
      B.push({ t: i % 4, x: x, y: y, s: 2 + Math.random() * 2.2, r: 0, vr: (Math.random() - .5) * .2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: .7, ci: pick() }); }
  };
  document.addEventListener('pointerdown', function (e) { if (!e.target.closest('input,textarea,select,.apanel')) nohsBurst(e.clientX, e.clientY); });
})();

window.NOHS = { sfx: sfx, $: $, $$: $$, RM: RM, EASE: EASE, SPRING: SPRING };
})();
