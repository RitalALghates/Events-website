/* Events Platform – منصة الفعاليات
   Bilingual UI, slider, search, favourites, accounts and bookings (all client-side demo). */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const EVENTS = window.EV_EVENTS, CITIES = window.EV_CITIES, CATS = window.EV_CATS, DICT = window.EV_I18N;
  const page = document.body.dataset.page;

  /* ---------- Storage ---------- */
  const LS = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* blocked */ } },
  };

  /* ---------- i18n ---------- */
  let lang = LS.get("ev.lang", null) || "ar";
  const t = (k) => (DICT[lang] && DICT[lang][k] !== undefined ? DICT[lang][k] : DICT.ar[k] ?? k);
  const L = (o) => (o ? o[lang] || o.ar : "");
  const listeners = [];
  const onLang = (fn) => listeners.push(fn);
  const PAGE_TITLE = { home: "brand", events: "events.t", about: "about.t", contact: "contact.t", login: "login", signup: "signup", bookings: "bk.t" };

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $$("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    document.title = `${t(PAGE_TITLE[page] || "brand")} · ${t("brand")}`;
    const btn = $("#lang-btn"); if (btn) btn.textContent = lang === "ar" ? "EN" : "ع";
    listeners.forEach((fn) => fn());
  }
  function setLang(l) { lang = l; LS.set("ev.lang", l); applyLang(); }

  /* ---------- Toast ---------- */
  function toast(msg, type = "ok") {
    let el = $(".toast");
    if (!el) { el = document.createElement("div"); el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.className = "toast" + (type === "error" ? " error" : "");
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 3400);
  }

  /* ---------- Auth (demo: SHA-256 salted hash in localStorage) ---------- */
  const users = () => LS.get("ev.users", []);
  const session = () => LS.get("ev.session", null);
  const currentUser = () => { const s = session(); return s ? users().find((u) => u.email === s) || null : null; };
  async function hash(pw, salt) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + pw));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- Bookings / favourites ---------- */
  const bookings = () => LS.get("ev.bookings", []);
  const favs = () => new Set(LS.get("ev.fav", []));
  function toggleFav(id) { const f = favs(); f.has(id) ? f.delete(id) : f.add(id); LS.set("ev.fav", [...f]); return f.has(id); }

  /* ---------- Layout ---------- */
  function mount() {
    const nav = [["index.html", "nav.home", "home"], ["events.html", "nav.events", "events"], ["about.html", "nav.about", "about"], ["contact.html", "nav.contact", "contact"]];
    const header = $("#site-header");
    if (header) {
      header.className = "site-header";
      header.innerHTML = `<div class="container nav">
        <a class="brand" href="index.html"><span class="brand-mark">🎟️</span><span data-i18n="brand"></span></a>
        <ul id="nav-list">${nav.map(([h, k, p]) => `<li><a href="${h}" class="${p === page ? "active" : ""}" data-i18n="${k}"></a></li>`).join("")}</ul>
        <div class="nav-tools">
          <button class="icon-btn" id="search-btn" aria-label="Search">🔍</button>
          <button class="icon-btn" id="lang-btn" aria-label="Language"></button>
          <div id="auth-slot"></div>
          <button class="icon-btn burger" id="burger" aria-label="Menu">☰</button>
        </div></div>`;
      $("#burger").onclick = () => $("#nav-list").classList.toggle("open");
      $("#lang-btn").onclick = () => setLang(lang === "ar" ? "en" : "ar");
      $("#search-btn").onclick = openSearch;
      renderAuth();
      onLang(renderAuth);
      document.addEventListener("click", (e) => { if (!e.target.closest(".user-chip")) $$(".menu.open").forEach((m) => m.classList.remove("open")); });
    }
    const footer = $("#site-footer");
    if (footer) {
      footer.className = "site-footer";
      footer.innerHTML = `<div class="container foot">
        <div><div class="brand" style="color:#fff;margin-bottom:12px"><span class="brand-mark">🎟️</span><span data-i18n="brand"></span></div><p data-i18n="foot.about"></p></div>
        <div><h4 data-i18n="foot.links"></h4><ul>${nav.map(([h, k]) => `<li><a href="${h}" data-i18n="${k}"></a></li>`).join("")}<li><a href="login.html" data-i18n="login"></a></li></ul></div>
        <div><h4 data-i18n="nav.contact"></h4><p>✉️ events@platform.com</p><p>📍 <span data-i18n="c.where.v"></span></p></div></div>
        <div class="container foot-bottom">© ${new Date().getFullYear()} <span data-i18n="brand"></span> – <span data-i18n="foot.rights"></span></div>`;
    }
    const bar = document.createElement("div"); bar.className = "progress"; document.body.prepend(bar);
    const top = document.createElement("button"); top.className = "to-top"; top.setAttribute("aria-label", "Top"); top.textContent = "↑"; top.onclick = () => scrollTo({ top: 0, behavior: "smooth" }); document.body.appendChild(top);
    const onScroll = () => {
      const h = document.documentElement;
      bar.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
      header && header.classList.toggle("solid", h.scrollTop > 40);
      top.classList.toggle("show", h.scrollTop > 700);
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  function renderAuth() {
    const slot = $("#auth-slot"); if (!slot) return;
    const u = currentUser();
    if (!u) {
      slot.innerHTML = `<a class="btn sm gold" href="login.html" data-i18n="login"></a>`;
    } else {
      slot.innerHTML = `<div class="user-chip"><button class="avatar" aria-label="Account">${esc(u.name.trim()[0] || "?").toUpperCase()}</button>
        <div class="menu"><div class="who">${esc(t("menu.hello"))} ${esc(u.name)}<br><span class="ltr">${esc(u.email)}</span></div>
        <a href="bookings.html">🎫 ${esc(t("menu.bookings"))}</a><button id="logout">↩ ${esc(t("logout"))}</button></div></div>`;
      $(".avatar", slot).onclick = (e) => { e.stopPropagation(); $(".menu", slot).classList.toggle("open"); };
      $("#logout").onclick = () => { LS.set("ev.session", null); toast(t("ok.out")); renderAuth(); if (page === "bookings") location.reload(); };
    }
    $$("[data-i18n]", slot).forEach((el) => (el.textContent = t(el.dataset.i18n)));
  }

  /* ---------- Reveal ---------- */
  let io;
  function reveal() {
    const els = $$(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("in"));
    io = io || new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: 0.12 });
    els.forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 90}ms`; io.observe(el); });
  }

  /* ---------- Poster / card ---------- */
  function posterHtml(e) {
    if (e.img) return `<img src="${esc(e.img)}" alt="${esc(L(e.title))}" loading="lazy" />`;
    return `<div class="art" style="--c1:${e.art.c1};--c2:${e.art.c2};position:absolute;inset:0"><b>${e.art.icon}</b></div>`;
  }
  function cardHtml(e, i = 0) {
    const on = favs().has(e.id);
    return `<article class="card" style="animation-delay:${Math.min(i, 9) * 50}ms" data-id="${e.id}">
      <div class="poster">${posterHtml(e)}<span class="badge">${CATS[e.cat].icon} ${esc(L(CATS[e.cat]))}</span>
        <button class="heart ${on ? "on" : ""}" data-fav="${e.id}" aria-label="Favourite" aria-pressed="${on}">${on ? "♥" : "♡"}</button></div>
      <div class="card-body"><h3>${esc(L(e.title))}</h3>
        <p class="line">📅 ${esc(L(e.date))}</p><p class="line">📍 ${esc(L(e.place))}</p>
        <div class="card-foot"><button class="btn sm" data-open="${e.id}">${esc(t("book"))}</button><span class="line">${esc(L(CITIES[e.city]))}</span></div></div></article>`;
  }

  /* ---------- Modal ---------- */
  function modalEl() {
    let m = $("#modal");
    if (!m) { m = document.createElement("div"); m.id = "modal"; m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.innerHTML = `<div class="modal-card"></div>`; document.body.appendChild(m); }
    return m;
  }
  const closeModal = () => { $("#modal")?.classList.remove("open"); $("#search-modal")?.classList.remove("open"); document.body.style.overflow = ""; };
  function openEvent(id) {
    const e = EVENTS.find((x) => x.id === id); if (!e) return;
    const m = modalEl(); let seats = 1;
    const u = currentUser();
    const render = () => {
      $(".modal-card", m).innerHTML = `
        <div class="head">${posterHtml(e)}<button class="x" aria-label="${esc(t("m.close"))}">✕</button></div>
        <div class="modal-body">
          <span class="tag" style="color:var(--teal);border-color:var(--line);background:var(--sand)">${CATS[e.cat].icon} ${esc(L(CATS[e.cat]))}</span>
          <h2 style="margin-top:10px">${esc(L(e.title))}</h2><p class="sub">${esc(L(e.desc))}</p>
          <div class="info"><div><small>${esc(t("m.date"))}</small>${esc(L(e.date))}</div><div><small>${esc(t("m.place"))}</small>${esc(L(e.place))}</div></div>
          ${u ? `<label style="font-weight:800;color:var(--teal)">${esc(t("m.seats"))}</label>
            <div class="stepper"><button data-step="-1" aria-label="-">−</button><output>${seats}</output><button data-step="1" aria-label="+">+</button></div>
            <button class="btn full" id="confirm">${esc(t("m.confirm"))}</button>`
          : `<div class="lock"><b style="color:var(--teal);font-size:18px">${esc(t("m.lock"))}</b><p style="margin:6px 0 14px;color:var(--muted)">${esc(t("m.lockp"))}</p>
              <a class="btn sm" href="login.html?next=${encodeURIComponent(`events.html?book=${e.id}`)}">${esc(t("login"))}</a>
              <a class="btn sm ghost" href="signup.html?next=${encodeURIComponent(`events.html?book=${e.id}`)}">${esc(t("signup"))}</a></div>`}
        </div>`;
      $(".x", m).onclick = closeModal;
      $$("[data-step]", m).forEach((b) => (b.onclick = () => { seats = Math.min(10, Math.max(1, seats + +b.dataset.step)); $("output", m).textContent = seats; }));
      const c = $("#confirm", m); if (c) c.onclick = () => confirmBooking(e, seats);
    };
    render(); m.classList.add("open"); document.body.style.overflow = "hidden";
    modalEl.rerender = render;
  }
  function confirmBooking(e, seats) {
    const u = currentUser(); if (!u) return;
    const code = "EV-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    LS.set("ev.bookings", [{ id: "b" + Date.now(), eventId: e.id, email: u.email, seats, code, at: Date.now() }, ...bookings()]);
    $(".modal-body", modalEl()).innerHTML = `<div class="ok-mark">✓</div><h2 style="text-align:center">${esc(t("m.done"))}</h2>
      <p class="sub" style="text-align:center">${esc(t("m.ticket"))}:</p>
      <div class="ticket"><small>EVENTS PLATFORM · TICKET</small><h4>${esc(L(e.title))}</h4>
        <p class="line" style="color:#fff;margin:2px 0">📅 ${esc(L(e.date))}</p><p class="line" style="color:#fff;margin:2px 0 14px">📍 ${esc(L(e.place))}</p>
        <div class="row"><span>${seats} ${esc(t("m.seat"))}</span><span class="code">${code}</span></div></div>
      <div style="display:flex;gap:10px"><a class="btn full" href="bookings.html">${esc(t("m.mine"))}</a><button class="btn ghost full" id="done-close">${esc(t("m.close"))}</button></div>`;
    $("#done-close", modalEl()).onclick = closeModal;
    toast(t("m.done"));
  }

  /* ---------- Global click handling ---------- */
  document.addEventListener("click", (ev) => {
    const open = ev.target.closest("[data-open]"); if (open) return openEvent(open.dataset.open);
    const fav = ev.target.closest("[data-fav]");
    if (fav) { const on = toggleFav(fav.dataset.fav); fav.classList.toggle("on", on); fav.textContent = on ? "♥" : "♡"; fav.setAttribute("aria-pressed", on); if (page === "events" && window.EV_refresh) window.EV_refresh(); return; }
    const m = $("#modal"), s = $("#search-modal");
    if (ev.target === m || ev.target === s) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });

  /* ---------- Search overlay ---------- */
  function openSearch() {
    let s = $("#search-modal");
    if (!s) {
      s = document.createElement("div"); s.id = "search-modal"; s.className = "modal search-modal"; s.setAttribute("role", "dialog");
      s.innerHTML = `<div class="search-box"><input id="gs" type="search" autocomplete="off" /><div id="gs-res"></div><div class="res-empty" id="gs-hint" style="padding:12px;font-size:13px"></div></div>`;
      document.body.appendChild(s);
      const input = $("#gs", s); let sel = 0;
      const run = () => {
        const q = input.value.trim().toLowerCase();
        const list = (q ? EVENTS.filter((e) => [e.title.ar, e.title.en, CITIES[e.city].ar, CITIES[e.city].en, CATS[e.cat].ar, CATS[e.cat].en].join(" ").toLowerCase().includes(q)) : EVENTS).slice(0, 6);
        sel = 0;
        $("#gs-res", s).innerHTML = list.length ? list.map((e, i) => `<div class="res ${i === 0 ? "sel" : ""}" data-open="${e.id}"><div class="th">${posterHtml(e)}</div><div><b>${esc(L(e.title))}</b><small>${esc(L(CITIES[e.city]))} · ${esc(L(e.date))}</small></div></div>`).join("") : `<div class="res-empty">${esc(t("search.none"))}</div>`;
      };
      input.addEventListener("input", run);
      input.addEventListener("keydown", (e) => {
        const items = $$("#gs-res .res", s);
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length); items.forEach((x, i) => x.classList.toggle("sel", i === sel)); }
        if (e.key === "Enter") { e.preventDefault(); const q = input.value.trim(); if (items[sel] && q === "") items[sel].click(); else location.href = "events.html" + (q ? `?q=${encodeURIComponent(q)}` : ""); }
      });
      s.run = run;
    }
    $("#gs", s).placeholder = t("search.ph"); $("#gs-hint", s).textContent = t("search.hint");
    s.classList.add("open"); document.body.style.overflow = "hidden"; s.run(); $("#gs", s).focus();
  }
  // Opening an event from the search overlay should close the overlay first.
  document.addEventListener("click", (e) => { if (e.target.closest("#search-modal [data-open]")) $("#search-modal").classList.remove("open"); }, true);

  /* ---------- Slider ---------- */
  function initSlider() {
    const hero = $(".hero"); if (!hero) return;
    const slides = () => $$(".slide", hero), dotsBox = $(".dots", hero);
    const DUR = 6000; let i = 0, timer, paused = false;
    dotsBox.innerHTML = slides().map((_, n) => `<button class="dot" aria-label="Slide ${n + 1}" style="--dur:${DUR}ms"><i></i></button>`).join("");
    const dots = $$(".dot", dotsBox);
    function go(n) {
      i = (n + slides().length) % slides().length;
      slides().forEach((s, k) => { s.classList.toggle("active", k === i); s.setAttribute("aria-hidden", k !== i); });
      dots.forEach((d, k) => { d.classList.remove("active", "done"); void d.offsetWidth; if (k < i) d.classList.add("done"); if (k === i) d.classList.add("active"); });
      clearTimeout(timer); if (!paused) timer = setTimeout(() => go(i + 1), DUR);
    }
    $(".prev", hero).onclick = () => go(i - (document.documentElement.dir === "rtl" ? -1 : 1));
    $(".next", hero).onclick = () => go(i + (document.documentElement.dir === "rtl" ? -1 : 1));
    dots.forEach((d, k) => (d.onclick = () => go(k)));
    $(".pause", hero).onclick = (e) => { paused = !paused; hero.classList.toggle("paused", paused); e.currentTarget.textContent = paused ? "▶" : "⏸"; paused ? clearTimeout(timer) : go(i); };
    let x0 = null;
    hero.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    hero.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1)); x0 = null; });
    document.addEventListener("keydown", (e) => { if (/input|textarea|select/i.test(document.activeElement.tagName)) return; if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); });
    hero.addEventListener("mouseenter", () => { if (!paused) clearTimeout(timer); });
    hero.addEventListener("mouseleave", () => { if (!paused) { clearTimeout(timer); timer = setTimeout(() => go(i + 1), 2500); } });
    go(0);
  }

  /* ---------- Home ---------- */
  function initHome() {
    const heroEvents = ["seanights", "eva", "livemusic", "food", "tech"].map((id) => EVENTS.find((e) => e.id === id));
    const renderHero = () => {
      $("#slides").innerHTML = heroEvents.map((e, n) => `<div class="slide ${n === 0 ? "active" : ""}"><div class="bg">${posterHtml(e).replace(" loading=\"lazy\"", "")}</div>
        <div class="container sl-grid"><div class="slide-caption"><span class="tag">✦ ${esc(L(CATS[e.cat]))}</span><h2>${esc(L(e.title))}</h2><p>${esc(L(e.desc))}</p>
          <div class="row"><button class="btn gold" data-open="${e.id}">${esc(t("book"))}</button><span class="meta-pill">📅 ${esc(L(e.date))}</span><span class="meta-pill">📍 ${esc(L(CITIES[e.city]))}</span></div></div>
          <div class="sl-poster">${posterHtml(e).replace(" loading=\"lazy\"", "")}</div></div></div>`).join("");
    };
    renderHero(); initSlider();
    const sync = () => {
      const active = $$("#slides .slide").findIndex((s) => s.classList.contains("active"));
      renderHero(); $$("#slides .slide").forEach((s, k) => s.classList.toggle("active", k === Math.max(0, active)));
      $("#f-city").innerHTML = `<option value="">${esc(t("q.all"))}</option>` + Object.entries(CITIES).map(([k, v]) => `<option value="${k}">${esc(L(v))}</option>`).join("");
      $("#f-cat").innerHTML = `<option value="">${esc(t("q.all"))}</option>` + Object.entries(CATS).map(([k, v]) => `<option value="${k}">${esc(L(v))}</option>`).join("");
      $("#cats").innerHTML = Object.entries(CATS).map(([k, v]) => `<a class="cat reveal in" href="events.html?cat=${k}"><span>${v.icon}</span><b>${esc(L(v))}</b><small>${EVENTS.filter((e) => e.cat === k).length} ${esc(t("cats.n"))}</small></a>`).join("");
      $("#upcoming").innerHTML = [...EVENTS].sort((a, b) => b.ts - a.ts).slice(0, 4).map(cardHtml).join("");
    };
    sync(); onLang(sync);
    $("#quick").addEventListener("submit", (e) => {
      e.preventDefault();
      const p = new URLSearchParams();
      const q = $("#f-q").value.trim(), c = $("#f-city").value, k = $("#f-cat").value;
      if (q) p.set("q", q); if (c) p.set("city", c); if (k) p.set("cat", k);
      location.href = "events.html" + (p.toString() ? "?" + p : "");
    });
    const targets = { events: EVENTS.length, cities: Object.keys(CITIES).length, cats: Object.keys(CATS).length };
    const io2 = new IntersectionObserver((en) => en.forEach((x) => {
      if (!x.isIntersecting) return; io2.disconnect();
      $$("[data-count]").forEach((el) => {
        const target = targets[el.dataset.count];
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return (el.textContent = target);
        const s0 = performance.now(); const tick = (n) => { const p = Math.min(1, (n - s0) / 1200); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
      });
    }), { threshold: 0.3 });
    const band = $(".band"); if (band) io2.observe(band);
    const nf = $("#news"); if (nf) nf.addEventListener("submit", (e) => { e.preventDefault(); const i = $("input", nf); if (!EMAIL.test(i.value.trim())) return toast(t("e.email"), "error"); toast(t("news.ok")); nf.reset(); });
  }

  /* ---------- Events page ---------- */
  function initEvents() {
    const st = { q: "", city: "", cat: "", sort: "def", fav: false };
    const p = new URLSearchParams(location.search);
    st.q = p.get("q") || ""; st.city = CITIES[p.get("city")] ? p.get("city") : ""; st.cat = CATS[p.get("cat")] ? p.get("cat") : "";
    const draw = () => {
      $("#f-sort").innerHTML = [["def", "sort.def"], ["title", "sort.title"], ["date", "sort.date"]].map(([v, k]) => `<option value="${v}" ${st.sort === v ? "selected" : ""}>${esc(t(k))}</option>`).join("");
      $("#chips-cat").innerHTML = `<button class="chip ${!st.cat && !st.fav ? "on" : ""}" data-c="">${esc(t("q.all"))}</button>` + Object.entries(CATS).map(([k, v]) => `<button class="chip ${st.cat === k ? "on" : ""}" data-c="${k}">${v.icon} ${esc(L(v))}</button>`).join("") + `<button class="chip ${st.fav ? "on" : ""}" data-fav-chip>♥ ${esc(t("fav"))}</button>`;
      $("#chips-city").innerHTML = `<button class="chip ${!st.city ? "on" : ""}" data-city="">${esc(t("q.all"))}</button>` + Object.entries(CITIES).map(([k, v]) => `<button class="chip ${st.city === k ? "on" : ""}" data-city="${k}">📍 ${esc(L(v))}</button>`).join("");
      const q = st.q.trim().toLowerCase(); const f = favs();
      let list = EVENTS.filter((e) => (!st.cat || e.cat === st.cat) && (!st.city || e.city === st.city) && (!st.fav || f.has(e.id)) && (!q || [e.title.ar, e.title.en, CITIES[e.city].ar, CITIES[e.city].en, e.desc.ar, e.desc.en].join(" ").toLowerCase().includes(q)));
      if (st.sort === "title") list = [...list].sort((a, b) => L(a.title).localeCompare(L(b.title), lang)); if (st.sort === "date") list = [...list].sort((a, b) => b.ts - a.ts);
      $("#grid").innerHTML = list.map(cardHtml).join("");
      $("#empty").classList.toggle("show", !list.length);
      $("#count").textContent = `${list.length} ${t("res")}`;
    };
    window.EV_refresh = draw;
    $("#f-q").value = st.q;
    $("#f-q").addEventListener("input", (e) => { st.q = e.target.value; draw(); });
    $("#f-sort").addEventListener("change", (e) => { st.sort = e.target.value; draw(); });
    $("#chips-cat").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; if (c.hasAttribute("data-fav-chip")) { st.fav = !st.fav; if (st.fav) st.cat = ""; } else { st.cat = c.dataset.c; st.fav = false; } draw(); });
    $("#chips-city").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; st.city = c.dataset.city; draw(); });
    $("#reset").addEventListener("click", () => { Object.assign(st, { q: "", city: "", cat: "", fav: false }); $("#f-q").value = ""; draw(); });
    draw(); onLang(draw);
    const b = p.get("book"); if (b) openEvent(b);
  }

  /* ---------- Bookings page ---------- */
  function initBookings() {
    const draw = () => {
      const u = currentUser(); const host = $("#list");
      if (!u) { host.innerHTML = `<div class="empty show"><b>${esc(t("bk.login"))}</b><a class="btn" href="login.html?next=bookings.html" style="margin-top:12px">${esc(t("login"))}</a></div>`; return; }
      const mine = bookings().filter((b) => b.email === u.email);
      if (!mine.length) { host.innerHTML = `<div class="empty show"><b>${esc(t("bk.none"))}</b>${esc(t("bk.nonep"))}<br><a class="btn" href="events.html" style="margin-top:14px">${esc(t("nav.events"))}</a></div>`; return; }
      host.innerHTML = mine.map((b) => { const e = EVENTS.find((x) => x.id === b.eventId); if (!e) return ""; return `<div class="booking"><div class="th">${posterHtml(e)}</div>
        <div class="grow"><h3>${esc(L(e.title))}</h3><p>📅 ${esc(L(e.date))} · 📍 ${esc(L(e.place))}</p><p>${b.seats} ${esc(t("m.seat"))} · <span class="code" style="font-size:15px">${b.code}</span></p></div>
        <button class="btn sm ghost" data-cancel="${b.id}">${esc(t("bk.cancel"))}</button></div>`; }).join("");
    };
    draw(); onLang(draw);
    $("#list").addEventListener("click", (e) => { const c = e.target.closest("[data-cancel]"); if (!c) return; LS.set("ev.bookings", bookings().filter((b) => b.id !== c.dataset.cancel)); toast(t("bk.cancelled")); draw(); });
  }

  /* ---------- Forms ---------- */
  function field(input, msg) {
    const g = input.closest(".fg"); g.classList.toggle("bad", !!msg); g.classList.toggle("ok", !msg && !!input.value);
    const err = $(".err", g); if (err) err.textContent = msg ? t(msg) : ""; input.dataset.msg = msg || ""; return !msg;
  }
  const nextUrl = () => { const n = new URLSearchParams(location.search).get("next"); return n && /^[\w\-./?=&%]+$/.test(n) && !n.startsWith("//") ? n : "events.html"; };

  function initAuth(kind) {
    const form = $("#auth-form");
    const rules = {
      name: (v) => (v.trim().length >= 2 ? "" : "e.name"),
      email: (v) => (EMAIL.test(v.trim()) ? "" : "e.email"),
      password: (v) => (v.length >= 8 ? "" : "e.pw"),
      password2: (v) => (v === $("[name=password]", form).value ? "" : "e.pw2"),
    };
    const inputs = $$("input[name]", form);
    inputs.forEach((el) => {
      el.addEventListener("blur", () => rules[el.name] && field(el, rules[el.name](el.value)));
      el.addEventListener("input", () => { if (el.closest(".fg").classList.contains("bad")) field(el, rules[el.name](el.value)); });
    });
    $$(".pw button", form).forEach((b) => (b.onclick = () => { const i = $("input", b.parentElement); const show = i.type === "password"; i.type = show ? "text" : "password"; b.textContent = t(show ? "hide" : "show"); }));
    const meter = $("#meter i");
    if (meter) $("[name=password]", form).addEventListener("input", (e) => {
      const v = e.target.value; let s = 0; if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) s++;
      meter.style.width = `${(v ? Math.max(1, s) : 0) * 25}%`; meter.style.background = ["#e06c4f", "#e06c4f", "#e0a030", "#6ab04c", "#2e9c70"][v ? Math.max(1, s) : 0];
      $("#strength").textContent = v ? DICT[lang].strength[Math.max(1, s) - 1] : "";
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ok = inputs.filter((i) => rules[i.name]).map((i) => field(i, rules[i.name](i.value)));
      if (ok.includes(false)) { $(".bad input", form)?.focus(); return toast(t("e.fix"), "error"); }
      const v = Object.fromEntries(inputs.map((i) => [i.name, i.value]));
      const email = v.email.trim().toLowerCase();
      if (kind === "signup") {
        if (users().some((u) => u.email === email)) return field($("[name=email]", form), "e.exists");
        const salt = crypto.getRandomValues(new Uint8Array(8)).join("");
        LS.set("ev.users", [...users(), { name: v.name.trim(), email, salt, hash: await hash(v.password, salt) }]);
        LS.set("ev.session", email); toast(t("ok.signup"));
      } else {
        const u = users().find((x) => x.email === email);
        if (!u || u.hash !== (await hash(v.password, u.salt))) { field($("[name=password]", form), "e.bad"); return toast(t("e.bad"), "error"); }
        LS.set("ev.session", email); toast(t("ok.login"));
      }
      setTimeout(() => (location.href = nextUrl()), 700);
    });
  }

  function initContact() {
    const form = $("#contact-form");
    const rules = { name: (v) => (v.trim().length >= 2 ? "" : "e.name"), email: (v) => (EMAIL.test(v.trim()) ? "" : "e.email"), message: (v) => (v.trim().length >= 5 ? "" : "e.msg") };
    const inputs = $$("[name]", form);
    inputs.forEach((el) => { el.addEventListener("blur", () => field(el, rules[el.name](el.value))); el.addEventListener("input", () => el.closest(".fg").classList.contains("bad") && field(el, rules[el.name](el.value))); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (inputs.map((i) => field(i, rules[i.name](i.value))).includes(false)) return toast(t("e.fix"), "error");
      LS.set("ev.messages", [{ ...Object.fromEntries(inputs.map((i) => [i.name, i.value.trim()])), at: Date.now() }, ...LS.get("ev.messages", [])].slice(0, 20));
      toast(t("c.ok")); form.reset(); $$(".fg", form).forEach((g) => g.classList.remove("ok", "bad"));
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    mount();
    if (page === "home") initHome();
    if (page === "events") initEvents();
    if (page === "bookings") initBookings();
    if (page === "login" || page === "signup") initAuth(page);
    if (page === "contact") initContact();
    applyLang();
    reveal();
    onLang(() => { if (modalEl.rerender && $("#modal.open")) modalEl.rerender(); });
  });
})();
