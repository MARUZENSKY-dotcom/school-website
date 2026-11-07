(function () {
'use strict';
var N = window.NOHS, sfx = N.sfx, $ = N.$, $$ = N.$$, RM = N.RM, EASE = N.EASE, SPRING = N.SPRING;
/* ---------- lightbox (gallery page) ---------- */
var cards = $$('.gcard'), items = cards.map(function (c) {
  var th = $('.gthumb', c), im = $('img', c);
  return { th: th, src: new URL(im.getAttribute('data-full') || im.getAttribute('src'), location.href).href, alt: im.alt, title: ($('h3', c) || {}).textContent || '', desc: ($('.gbody p', c) || {}).textContent || '' };
});
if (!items.length) return;
var lb = document.createElement('div'); lb.className = 'lb'; lb.id = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
var ch = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="';
lb.innerHTML =
 '<div class="lb-inner"><button type="button" class="lb-close" aria-label="Close photo viewer">&times;</button>' +
 '<div class="lb-stage"><button type="button" class="lb-nav lb-prev" aria-label="Previous photo">' + ch + 'M15 5l-7 7 7 7"/></svg></button>' +
 '<img class="lb-img" alt="" draggable="false">' +
 '<button type="button" class="lb-nav lb-next" aria-label="Next photo">' + ch + 'M9 5l7 7-7 7"/></svg></button></div>' +
 '<div class="lb-cap"><p class="lb-count" aria-live="polite"></p><h2></h2><p class="lb-desc"></p><div class="lb-dots" aria-hidden="true"></div></div></div>';
document.body.appendChild(lb);
var inner = $('.lb-inner', lb), img = $('.lb-img', lb), cnt = $('.lb-count', lb), h2 = $('h2', lb), dsc = $('.lb-desc', lb), dots = $('.lb-dots', lb), idx = 0, isOpen = false, busy = false, opener = null;
dots.innerHTML = items.map(function () { return '<i></i>'; }).join('');
function fill(i) {
  var it = items[i]; img.src = it.src; img.alt = it.alt; cnt.textContent = 'Photo ' + (i + 1) + ' of ' + items.length; h2.textContent = it.title; dsc.textContent = it.desc;
  $$('i', dots).forEach(function (d, k) { d.className = k === i ? 'on' : (k < i ? 'done' : ''); });
}
function anim(el, kf, o) { return RM ? Promise.resolve() : el.animate(kf, o).finished.catch(function () {}); }
function open(i) {
  idx = i; opener = items[i].th; img.getAnimations().forEach(function (a) { a.cancel(); }); img.style.opacity = ''; fill(i); isOpen = true;
  lb.classList.add('open'); document.body.classList.add('lb-lock');
  requestAnimationFrame(function () { lb.classList.add('show'); });
  var r = opener.getBoundingClientRect(), b = inner.getBoundingClientRect();
  var dx = r.left + r.width / 2 - (b.left + b.width / 2), dy = r.top + r.height / 2 - (b.top + b.height / 2), s = Math.max(.25, r.width / b.width);
  anim(inner, [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', opacity: 0, borderRadius: '40px' }, { transform: 'none', opacity: 1, borderRadius: '16px' }], { duration: 620, easing: SPRING });
  anim(img, [{ filter: 'blur(14px) saturate(1.6)' }, { filter: 'none' }], { duration: 650, easing: EASE });
  sfx('open'); $('.lb-close', lb).focus();
}
function close() {
  if (!isOpen || busy) return; busy = true; sfx('close');
  var t = items[idx].th, r = t.getBoundingClientRect(), b = inner.getBoundingClientRect(), vis = r.bottom > 0 && r.top < innerHeight;
  var dx = r.left + r.width / 2 - (b.left + b.width / 2), dy = r.top + r.height / 2 - (b.top + b.height / 2), s = Math.max(.25, r.width / b.width);
  lb.classList.remove('show');
  anim(inner, vis ? [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', opacity: 0 }]
                  : [{ transform: 'none', opacity: 1 }, { transform: 'translateY(50px) scale(.92)', opacity: 0 }], { duration: 420, easing: EASE })
  .then(function () { lb.classList.remove('open'); document.body.classList.remove('lb-lock'); isOpen = busy = false; (t || opener).focus({ preventScroll: true }); });
}
function waitImg(el) {                                   /* resolve when the new photo has loaded (or after 2.5 s) */
  return new Promise(function (ok) {
    if (el.complete && el.naturalWidth) return ok();
    var t = setTimeout(ok, 2500), done = function () { clearTimeout(t); ok(); };
    el.addEventListener('load', done, { once: true }); el.addEventListener('error', done, { once: true });
  });
}
function go(d) {
  if (!isOpen || busy) return; busy = true; var n = (idx + d + items.length) % items.length;
  sfx(d > 0 ? 'next' : 'prev', 1.1);
  anim(img, [{ opacity: 1, transform: 'none', filter: 'none' }, { opacity: 0, transform: 'translateX(' + (-70 * d) + 'px) scale(.96)', filter: 'blur(10px)' }], { duration: 200, easing: 'ease-in' })
  .then(function () {
    img.style.opacity = '0';                              /* keep it hidden while the next photo swaps in */
    idx = n; fill(n);
    return waitImg(img);
  })
  .then(function () {
    img.style.opacity = '';
    return anim(img, [{ opacity: 0, transform: 'translateX(' + (70 * d) + 'px) scale(.96)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 480, easing: SPRING });
  }).then(function () { img.style.opacity = ''; busy = false; });
  [-1, 1].forEach(function (k) { var j = (n + k + items.length) % items.length, p = new Image(); p.src = items[j].src; });
}
cards.forEach(function (c, i) { $('.gthumb', c).addEventListener('click', function () { open(i); }); });
$('.lb-close', lb).onclick = close; $('.lb-prev', lb).onclick = function () { go(-1); }; $('.lb-next', lb).onclick = function () { go(1); };
lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
addEventListener('keydown', function (e) {
  if (!isOpen) return;
  if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); } else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
  else if (e.key === 'Tab') { var f = $$('button', lb), i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
}, true);
var sx = null, stage = $('.lb-stage', lb);
stage.addEventListener('pointerdown', function (e) { if (!e.target.closest('.lb-nav')) sx = e.clientX; });
addEventListener('pointerup', function (e) { if (sx == null) return; var d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1); });
addEventListener('hashchange', function () { if (isOpen) { lb.classList.remove('open', 'show'); document.body.classList.remove('lb-lock'); isOpen = busy = false; } });
})();

