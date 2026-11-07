/* contact page: checks the form and shows a confirmation (the form has no server yet, see the note in contact.html) */
(function () {
  var f = document.getElementById('contactForm'); if (!f) return;
  var N = window.NOHS || {}, say = function (n) { if (N.sfx) N.sfx(n); };
  var st = document.getElementById('formStatus');
  function ok(el) { return el.id === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()) : el.value.trim().length > 0; }
  function mark(el) { var bad = !ok(el); el.parentNode.classList.toggle('bad', bad); el.setAttribute('aria-invalid', bad); return !bad; }
  var fields = [].slice.call(f.querySelectorAll('input[required],textarea[required]'));
  fields.forEach(function (el) {
    el.addEventListener('blur', function () { if (el.value) mark(el); });
    el.addEventListener('input', function () { if (el.parentNode.classList.contains('bad')) mark(el); });
  });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var good = fields.map(mark).every(Boolean);
    if (!good) { var first = f.querySelector('[aria-invalid="true"]'); if (first) first.focus(); say('soft'); st.hidden = true; return; }
    say('chime');
    st.textContent = 'Thank you, ' + f.name.value.trim() + '. Your message is ready to send.';
    st.hidden = false; f.reset(); fields.forEach(function (el) { el.removeAttribute('aria-invalid'); });
    if (window.nohsBurst) { var r = st.getBoundingClientRect(); nohsBurst(r.left + r.width / 2, r.top); }
  });
})();
