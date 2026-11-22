// RAPT — главная: меню, карусель туров, форма заявки

// Мобильное меню
(function () {
  const header = document.querySelector('.header');
  const burger = document.querySelector('.burger');
  if (!header || !burger) return;
  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
  header.querySelectorAll('.nav a, .header__tg').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
})();

// Карусель «Ближайшие туры»: стрелки листают на одну карточку
(function () {
  const track = document.getElementById('track');
  const arrows = document.querySelectorAll('.arrow');
  if (!track) return;
  const step = () => {
    const card = track.querySelector('.card');
    const gap = parseFloat(getComputedStyle(track).columnGap) || 20;
    return card ? card.getBoundingClientRect().width + gap : 300;
  };
  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    arrows.forEach((b) => {
      b.disabled = b.dataset.dir === '-1' ? track.scrollLeft <= 2 : track.scrollLeft >= max;
    });
  };
  arrows.forEach((b) => b.addEventListener('click', () => {
    track.scrollBy({ left: step() * Number(b.dataset.dir) });
  }));
  // свой индикатор прокрутки вместо системного скроллбара
  const thumb = document.getElementById('track-thumb');
  const moveThumb = () => {
    if (!thumb) return;
    const bar = thumb.parentElement.clientWidth;
    const ratio = Math.min(1, track.clientWidth / track.scrollWidth);
    const w = bar * ratio;
    const max = track.scrollWidth - track.clientWidth;
    thumb.style.setProperty('--w', w + 'px');
    thumb.style.setProperty('--x', (max > 0 ? (track.scrollLeft / max) * (bar - w) : 0) + 'px');
  };
  track.addEventListener('scroll', () => { update(); moveThumb(); }, { passive: true });
  window.addEventListener('resize', () => { update(); moveThumb(); });
  update(); moveThumb();

  // карточки появляются по очереди, полосы мест заполняются, когда блок попал на экран
  const section = track.closest('.tours');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (section && !still && 'IntersectionObserver' in window) {
    section.classList.add('anim');
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { section.classList.add('is-in'); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(track);
  }
})();

// Фото в карточках туров: при наведении меняются по положению мыши (как в маркетплейсах), при уходе — снова первое
(function () {
  document.querySelectorAll('.card__ph--gallery').forEach((ph) => {
    const imgs = [...ph.querySelectorAll('.card__img')];
    if (imgs.length < 2) return;
    const dots = document.createElement('span');
    dots.className = 'card__dots';
    dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = imgs.map(() => '<i></i>').join('');
    ph.appendChild(dots);
    const marks = [...dots.children];
    let cur = -1;
    const show = (n) => {
      if (n === cur) return;
      cur = n;
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === n));
      marks.forEach((m, k) => m.classList.toggle('is-on', k === n));
    };
    show(0);
    const card = ph.closest('.card') || ph;
    card.addEventListener('mouseenter', () => imgs.forEach((im) => { im.loading = 'eager'; }), { once: true });
    ph.addEventListener('mousemove', (e) => {
      const r = ph.getBoundingClientRect();
      show(Math.min(imgs.length - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * imgs.length))));
    });
    card.addEventListener('mouseleave', () => show(0));
  });
})();

// Форма заявки. Пока без отправки: сюда подключается Telegram-бот, почта или CRM
(function () {
  const form = document.getElementById('apply');
  if (!form) return;
  const error = document.getElementById('form-error');
  const done = document.getElementById('form-done');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.name;
    const contact = form.elements.contact;
    const agree = form.elements.agree;
    [name, contact].forEach((f) => f.setAttribute('aria-invalid', String(!f.value.trim())));

    let msg = '';
    if (!name.value.trim() || !contact.value.trim()) msg = 'Заполни имя и телефон или ник в Telegram — без них не сможем связаться.';
    else if (!agree.checked) msg = 'Поставь галочку согласия на обработку данных, иначе заявку не отправить.';

    if (msg) {
      error.textContent = msg;
      error.hidden = false;
      (!name.value.trim() ? name : !contact.value.trim() ? contact : agree).focus();
      return;
    }

    error.hidden = true;
    // TODO: отправка данных + цель Метрики: ym(XXXXXX, 'reachGoal', 'form_sent')
    form.classList.add('is-sent');
    done.hidden = false;
    done.focus();
  });
})();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Первый экран: слайдер с полосками прогресса. Пауза при наведении и фокусе
(function () {
  const root = document.getElementById('slider');
  if (!root) return;
  const slides = [...root.querySelectorAll('.slide')];
  const bars = [...root.querySelectorAll('.slider__bars button')];
  const DURATION = 6500;
  let i = 0, start = performance.now(), paused = false, elapsed = 0;

  const go = (n) => {
    slides[i].classList.remove('is-active');
    slides[i].setAttribute('aria-hidden', 'true');
    slides[i].querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
    bars[i].setAttribute('aria-selected', 'false');
    bars.forEach((b, k) => b.querySelector('i').style.setProperty('--p', k < n ? 1 : 0));
    i = (n + slides.length) % slides.length;
    if (i === 0) bars.forEach((b) => b.querySelector('i').style.setProperty('--p', 0));
    const img = slides[i].querySelector('img[loading=lazy]');
    if (img) img.loading = 'eager';
    slides[i].classList.add('is-active');
    slides[i].removeAttribute('aria-hidden');
    slides[i].querySelectorAll('a').forEach((a) => a.removeAttribute('tabindex'));
    bars[i].setAttribute('aria-selected', 'true');
    start = performance.now(); elapsed = 0;
  };

  bars.forEach((b, k) => b.addEventListener('click', () => go(k)));
  root.addEventListener('mouseenter', () => { paused = true; elapsed = performance.now() - start; });
  root.addEventListener('mouseleave', () => { paused = false; start = performance.now() - elapsed; });
  root.addEventListener('focusin', () => { paused = true; elapsed = performance.now() - start; });
  root.addEventListener('focusout', () => { paused = false; start = performance.now() - elapsed; });

  // предзагрузка второго слайда, чтобы смена была без вспышки
  const next = slides[1] && slides[1].querySelector('img'); if (next) next.loading = 'eager';
  // если в системе отключены анимации — вместо видео показываем неподвижный постер
  const video = root.querySelector('.slider__video');
  if (video && reduceMotion) { video.removeAttribute('autoplay'); video.querySelectorAll('source').forEach((x) => x.remove()); video.load(); }

  if (reduceMotion) { bars[0].querySelector('i').style.setProperty('--p', 1); return; }
  const tick = (now) => {
    if (!paused && !document.hidden) {
      const p = Math.min(1, (now - start) / DURATION);
      bars[i].querySelector('i').style.setProperty('--p', p);
      if (p >= 1) go(i + 1);
    } else if (paused) { start = now - elapsed; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

// Манифест: слова проявляются по мере прокрутки
(function () {
  const el = document.querySelector('[data-reveal]');
  if (!el) return;
  const html = el.innerHTML.replace(/&nbsp;/g, ' ');
  el.innerHTML = html.split(/( )/).map((t) => (t === ' ' ? ' ' : '<span class="w">' + t + '</span>')).join('');
  const words = [...el.querySelectorAll('.w')];
  if (reduceMotion) { words.forEach((w) => w.classList.add('on')); return; }
  const update = () => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    const n = Math.round(p * words.length);
    words.forEach((w, k) => w.classList.toggle('on', k < n));
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// «RAPT в цифрах»: при прокрутке по очереди показываются цифры, число досчитывает от нуля, фон меняется
(function () {
  const sec = document.getElementById('numbers');
  if (!sec) return;
  const items = [...sec.querySelectorAll('.nums__list li')];
  const bgs = [...sec.querySelectorAll('.nums__bg')];
  const bars = [...sec.querySelectorAll('.nums__bars i')];
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  bgs.forEach((im) => { im.loading = 'eager'; });
  let stage = -1, raf = 0, seen = false;

  const countUp = (el) => {
    const to = Number(el.dataset.to);
    if (still) { el.textContent = to.toLocaleString('ru-RU'); return; }
    const t0 = performance.now(), dur = 1200;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString('ru-RU');
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const setStage = (n) => {
    if (n === stage) return;
    stage = n;
    items.forEach((li, k) => li.classList.toggle('is-on', k === n));
    bgs.forEach((im, k) => im.classList.toggle('is-on', k === n));
    bars.forEach((b, k) => b.classList.toggle('is-on', k === n));
    const num = items[n] && items[n].querySelector('[data-to]');
    if (num && seen) countUp(num);
  };

  const update = () => {
    raf = 0;
    const r = sec.getBoundingClientRect();
    if (r.top < window.innerHeight && !seen) { seen = true; stage = -1; }
    const range = sec.offsetHeight - window.innerHeight;
    const p = Math.min(0.999, Math.max(0, -r.top / range));
    setStage(Math.floor(p * items.length));
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// Страница тура: слайдер «Яркие моменты» — стрелки листают по одному фото, по кругу
(function () {
  const track = document.getElementById('hl-track');
  if (!track) return;
  document.querySelectorAll('[data-hl]').forEach((b) => b.addEventListener('click', () => {
    const w = track.clientWidth;
    const n = track.children.length;
    const cur = Math.round(track.scrollLeft / w);
    const next = (cur + Number(b.dataset.hl) + n) % n;
    track.scrollTo({ left: next * w });
  }));
})();

// Страница тура: липкая кнопка «Записаться» на телефоне — после первого экрана, прячется у формы
(function () {
  const stick = document.getElementById('stick');
  const hero = document.querySelector('.t-hero');
  const form = document.getElementById('form');
  if (!stick || !hero || !('IntersectionObserver' in window)) return;
  let pastHero = false, nearForm = false;
  const render = () => stick.classList.toggle('is-on', pastHero && !nearForm);
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; render(); }).observe(hero);
  if (form) new IntersectionObserver(([e]) => { nearForm = e.isIntersecting; render(); }).observe(form);
})();

// Появление блоков при прокрутке: заголовки, плитки, вопросы, шаги и фото выезжают снизу по очереди
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const textSel = '.h2, .crew__title, .crew__lead, .mate, .gift__title, .gift__lead, .gift__row, .faq-sec__title, .apply__title, .about__title, .tours__lead, .about__text, .about__actions, .tile, .review:not(.review--photo), .safety__list li, .sc, .qa__item, .cert__in, .steps li, .apply--sell .apply__sub, .hot, .apply--sell .form, .what__item, .inc__list li, .faq__list details';
  const imgSel = '.mosaic .ph, .review--photo, .t-safety__in img';
  const els = [];
  const mark = (el, cls) => {
    if (el.closest('.slider, .nums, .t-hero, .track')) return;
    const sibs = [...el.parentElement.children].filter((c) => c.matches(textSel + ', ' + imgSel));
    el.style.setProperty('--d', Math.min(6, sibs.indexOf(el)));
    el.classList.add(cls); els.push(el);
  };
  document.querySelectorAll(textSel).forEach((el) => mark(el, 'rv'));
  document.querySelectorAll(imgSel).forEach((el) => mark(el, 'rv-img'));
  document.documentElement.classList.add('rv-on');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => io.observe(el));
  // страховка: если наблюдатель по какой-то причине промолчал, показываем всё, что уже на экране или выше
  const sweep = () => {
    const vh = window.innerHeight;
    els.forEach((el) => { if (!el.classList.contains('in') && el.getBoundingClientRect().top < vh * 0.92) { el.classList.add('in'); io.unobserve(el); } });
  };
  window.addEventListener('scroll', sweep, { passive: true });
  window.addEventListener('load', sweep);
  setTimeout(sweep, 1200);
})();

// 3D-билет в блоке сертификатов: наклоняется вслед за мышью, блик бежит по поверхности
(function () {
  const stage = document.getElementById('ticket');
  if (!stage || reduceMotion || !window.matchMedia('(hover: hover)').matches) return;
  const t = stage.querySelector('.ticket:not(.ticket--back)');
  const area = stage.closest('.gift__card') || stage;
  area.addEventListener('mousemove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / r.width;
    const y = (e.clientY - (r.top + r.height / 2)) / r.height;
    stage.classList.add('is-tilt');
    t.style.setProperty('--ry', (x * 28 - 10).toFixed(1) + 'deg');
    t.style.setProperty('--rx', (-y * 22 + 6).toFixed(1) + 'deg');
    t.style.setProperty('--sx', (50 + x * 100).toFixed(0) + '%');
  });
  area.addEventListener('mouseleave', () => {
    stage.classList.remove('is-tilt');
    ['--rx', '--ry', '--sx'].forEach((p) => t.style.removeProperty(p));
  });
})();

// Цвет страницы меняется при прокрутке: секция с data-bg, оказавшись в центре экрана, перекрашивает фон
(function () {
  const secs = [...document.querySelectorAll('main > section')];
  if (!secs.some((s) => s.dataset.bg)) return;
  let cur = null;
  const update = () => {
    const mid = window.innerHeight / 2;
    const s = secs.find((x) => { const r = x.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; });
    const bg = (s && s.dataset.bg) || '';
    if (bg !== cur) { cur = bg; document.body.dataset.bg = bg; }
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// Переход между страницами: красная шторка с логотипом закрывает экран, на новой странице уезжает вверх
(function () {
  if (reduceMotion) return;
  // шторка показывается только при переходе с другой страницы сайта, при первом заходе её нет
  const fromNav = sessionStorageGet('rapt-nav') === '1';
  const c = document.createElement('div');
  c.className = fromNav ? 'curtain is-start' : 'curtain';
  c.setAttribute('aria-hidden', 'true');
  c.innerHTML = '<img src="assets/logo/rapt-logo-light.svg" alt="">';
  document.body.appendChild(c);
  if (fromNav) {
    sessionStorageSet('rapt-nav', '');
    void c.offsetHeight; // зафиксировать закрытое положение, затем запустить уезд
    setTimeout(() => { c.classList.remove('is-start'); c.classList.add('is-leave'); }, 60);
    setTimeout(() => { c.className = 'curtain'; }, 1400); // страховка: шторка точно убрана
  }
  window.addEventListener('pageshow', (e) => { if (e.persisted) { c.className = 'curtain'; } });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return; // якоря на той же странице — без шторки
    e.preventDefault();
    sessionStorageSet('rapt-nav', '1');
    c.className = 'curtain';
    void c.offsetHeight;
    c.classList.add('is-cover');
    setTimeout(() => { location.href = url.href; }, 480);
  });

  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (_) {} }
})();

// Кнопки: текст «перекатывается» при наведении, заливка растёт из точки, где курсор вошёл в кнопку
(function () {
  document.querySelectorAll('.btn').forEach((b) => {
    if (b.querySelector('.btn__t')) return;
    const node = [...b.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (node) {
      const text = node.textContent.trim();
      const wrap = document.createElement('span');
      wrap.className = 'btn__t';
      wrap.dataset.t = text;
      wrap.innerHTML = '<span></span>';
      wrap.firstChild.textContent = text;
      node.replaceWith(wrap);
    }
    const setOrigin = (e) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--bx', (e.clientX - r.left) + 'px');
      b.style.setProperty('--by', (e.clientY - r.top) + 'px');
    };
    b.addEventListener('mouseenter', setOrigin);
    b.addEventListener('mouseleave', setOrigin);
  });
})();

// Инструкторы: на телефоне подробности открываются касанием; на компьютере колонки карточек слегка «плывут» при прокрутке
(function () {
  const sec = document.getElementById('crew');
  if (!sec) return;
  const cards = [...sec.querySelectorAll('.mate:not(.mate--tile)')];
  cards.forEach((m) => {
    m.tabIndex = 0;
    m.setAttribute('aria-expanded', 'false');
    const toggle = () => {
      const open = !m.classList.contains('is-open');
      cards.forEach((x) => { x.classList.remove('is-open'); x.setAttribute('aria-expanded', 'false'); });
      m.classList.toggle('is-open', open);
      m.setAttribute('aria-expanded', String(open));
    };
    m.addEventListener('click', () => { if (!window.matchMedia('(hover: hover)').matches) toggle(); });
    m.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  if (reduceMotion) return;
  const all = [...sec.querySelectorAll('.mate')];
  const shift = [0, -1, 1, -1, 1, -1, 1]; // соседние колонки двигаются навстречу друг другу
  const update = () => {
    if (window.innerWidth <= 1024) { all.forEach((m) => m.style.removeProperty('--py')); return; }
    const r = sec.getBoundingClientRect();
    const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight));
    all.forEach((m, i) => m.style.setProperty('--py', (shift[i] * p * 36).toFixed(1) + 'px'));
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// Плитка «100+»: цифра досчитывает до конца, когда плитка появляется на экране
(function () {
  const el = document.querySelector('.mate__count');
  if (!el || reduceMotion || !('IntersectionObserver' in window)) return;
  const to = +el.dataset.to;
  const run = () => { el.textContent = '0'; const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / 1400); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); setTimeout(() => { el.textContent = to; }, 1700); };
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); run(); } }, { threshold: .4 });
  io.observe(el);
})();

// «Про прыжки»: галочка у лиц инструкторов ставится, когда блок появляется на экране
(function () {
  const s = document.querySelector('.jumps');
  if (!s) return;
  const on = () => { if (s.getBoundingClientRect().top < window.innerHeight * 0.75) { s.classList.add('is-seen'); window.removeEventListener('scroll', on); } };
  window.addEventListener('scroll', on, { passive: true }); on();
})();

// Отзывы-колода: верхняя карточка по стрелке, клику или свайпу улетает и уходит вниз; сама листается раз в 7 с
(function () {
  const deck = document.querySelector('.deck');
  if (!deck) return;
  const cards = [...deck.children];
  const count = document.querySelector('.reviews__count b');
  let order = cards.map((_, i) => i), busy = false, timer = 0;
  const render = () => {
    order.forEach((ci, k) => { const c = cards[ci]; c.style.setProperty('--k', Math.min(k, 3)); c.classList.toggle('is-top', k === 0); c.setAttribute('aria-hidden', k === 0 ? 'false' : 'true'); });
    if (count) count.textContent = String(order[0] + 1).padStart(2, '0');
  };
  const next = () => {
    if (busy) return; busy = true;
    const top = cards[order[0]];
    top.classList.add('is-out');
    setTimeout(() => { order.push(order.shift()); top.classList.remove('is-out'); render(); busy = false; }, reduceMotion ? 0 : 480);
  };
  const prev = () => { if (busy) return; order.unshift(order.pop()); render(); };
  const restart = () => { clearInterval(timer); if (!reduceMotion) timer = setInterval(next, 7000); };
  document.querySelector('[data-deck="next"]')?.addEventListener('click', () => { next(); restart(); });
  document.querySelector('[data-deck="prev"]')?.addEventListener('click', () => { prev(); restart(); });
  deck.addEventListener('click', () => { next(); restart(); });
  let x0 = null;
  deck.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  deck.addEventListener('touchend', (e) => { if (x0 !== null && Math.abs(e.changedTouches[0].clientX - x0) > 40) { next(); restart(); } x0 = null; });
  deck.addEventListener('mouseenter', () => clearInterval(timer));
  deck.addEventListener('mouseleave', restart);
  render(); restart();
})();

// Клики по контактам — цель для Метрики
document.querySelectorAll('[data-goal]').forEach((a) => a.addEventListener('click', () => {
  if (typeof window.ym === 'function') window.ym(0, 'reachGoal', a.dataset.goal); // 0 → номер счётчика
}));
