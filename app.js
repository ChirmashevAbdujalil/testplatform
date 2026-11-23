(() => {
  "use strict";

  /* ================= MA'LUMOTLAR ================= */
  const SECTIONS = (window.TEST_DATA && window.TEST_DATA.sections) || [];
  const Q = new Map();          // "bo'lim-raqam" -> savol
  const ALL_IDS = [];
  for (const s of SECTIONS) {
    s.ids = [];
    for (const [n, text, opts, ans] of s.q) {
      const id = s.id + "-" + n;
      Q.set(id, { id, sec: s.id, n, text, opts, ans });
      s.ids.push(id);
      ALL_IDS.push(id);
    }
  }
  const SEC_BY_ID = new Map(SECTIONS.map((s) => [s.id, s]));
  const LETTERS = ["A", "B", "C", "D"];

  /* ================= YORDAMCHILAR ================= */
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("tp_" + key); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem("tp_" + key, JSON.stringify(value)); } catch { /* saqlab bo'lmadi */ } },
    del(key) { try { localStorage.removeItem("tp_" + key); } catch { /* yo'q */ } },
  };
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const fmtTime = (ms) => {
    const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    const p = (x) => String(x).padStart(2, "0");
    return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
  };
  const fmtNum = (n) => n.toLocaleString("uz-UZ").replace(/,/g, " ");
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const secShort = (s) => s.title.replace(/\s*\(.*?\)\s*$/, "");

  /* ================= SAQLANADIGAN HOLAT ================= */
  let known = new Set(store.get("known", []));    // oxirgi urinishda to'g'ri topilganlar
  let mistakes = new Set(store.get("mistakes", [])); // xato qilingan savollar banki
  let history = store.get("history", []);

  /* ================= MAVZU (kun/tun) ================= */
  const savedTheme = store.get("theme", null);
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  $("theme-toggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    store.set("theme", next);
  });

  /* ================= SOZLAMALAR EKRANI ================= */
  const cfg = Object.assign({
    mode: "section",
    section: SECTIONS[0] ? SECTIONS[0].id : 1,
    multi: SECTIONS.map((s) => s.id),
    countSection: 0,   // 0 = bo'limning hammasi
    countRandom: 30,
    shuffleQ: true,
    shuffleO: true,
  }, store.get("cfg", {}));
  cfg.multi = cfg.multi.filter((id) => SEC_BY_ID.has(id));
  if (!SEC_BY_ID.has(cfg.section) && SECTIONS[0]) cfg.section = SECTIONS[0].id;

  function saveCfg() { store.set("cfg", cfg); }

  function poolForConfig() {
    if (cfg.mode === "all") return ALL_IDS;
    if (cfg.mode === "section") return (SEC_BY_ID.get(cfg.section) || { ids: [] }).ids;
    return SECTIONS.filter((s) => cfg.multi.includes(s.id)).flatMap((s) => s.ids);
  }

  function renderStats() {
    const box = $("stats-strip");
    box.innerHTML = "";
    const knownCount = ALL_IDS.filter((id) => known.has(id)).length;
    [[fmtNum(ALL_IDS.length), "ta savol"], [SECTIONS.length, "ta bo‘lim"], [fmtNum(knownCount), "ta o‘zlashtirilgan"]]
      .forEach(([b, t]) => { const d = el("div", "stat"); d.append(el("b", null, b), el("span", null, t)); box.append(d); });
    $("mode-all-desc").textContent = `To‘plamdagi ${fmtNum(ALL_IDS.length)} ta savolning hammasi birdaniga`;
  }

  function renderSections() {
    const list = $("sections-list");
    list.innerHTML = "";
    const multi = cfg.mode === "random";
    $("sections-title").textContent = multi ? "Qaysi bo‘limlardan olinsin?" : "Bo‘limni tanlang";
    $("section-tools").hidden = !multi;
    for (const s of SECTIONS) {
      const on = multi ? cfg.multi.includes(s.id) : cfg.section === s.id;
      const lab = el("label", "sec" + (multi ? " is-multi" : "") + (on ? " is-on" : ""));
      const input = el("input");
      input.type = multi ? "checkbox" : "radio";
      input.name = "sec";
      input.id = "sec-" + s.id;
      input.checked = on;
      input.addEventListener("change", () => {
        if (multi) {
          cfg.multi = input.checked ? [...new Set([...cfg.multi, s.id])] : cfg.multi.filter((x) => x !== s.id);
        } else {
          cfg.section = s.id;
          cfg.countSection = 0;
        }
        saveCfg(); renderSetup();
      });
      const mark = el("span", "sec-mark");
      const main = el("span", "sec-main");
      main.append(el("span", "sec-title", `${s.id}. ${s.title}`));
      const k = s.ids.filter((id) => known.has(id)).length;
      const meta = el("span", "sec-meta");
      const bar = el("span", "sec-bar"); const fill = el("i"); fill.style.width = (s.ids.length ? (k / s.ids.length) * 100 : 0) + "%"; bar.append(fill);
      meta.append(bar, el("span", null, `O‘zlashtirildi: ${k} / ${s.ids.length}`));
      main.append(meta);
      const cnt = el("span", "sec-count", s.ids.length);
      cnt.append(el("small", null, "savol"));
      lab.append(input, mark, main, cnt);
      list.append(lab);
    }
  }

  function currentCount(poolSize) {
    if (cfg.mode === "all") return poolSize;
    if (cfg.mode === "section") return cfg.countSection ? clamp(cfg.countSection, 1, poolSize) : poolSize;
    return clamp(cfg.countRandom || 1, 1, Math.max(1, poolSize));
  }

  function renderCount() {
    const pool = poolForConfig();
    const max = pool.length;
    const row = $("count-row");
    row.hidden = cfg.mode === "all";
    const input = $("count-input");
    input.max = String(Math.max(1, max));
    if (document.activeElement !== input) input.value = String(currentCount(max) || 0);
    $("count-max").textContent = `/ ${fmtNum(max)} ta`;
    const chips = $("count-chips");
    chips.innerHTML = "";
    const presets = [10, 20, 30, 50, 100, 200].filter((n) => n < max);
    const cur = currentCount(max);
    [...presets, max].forEach((n, i, arr) => {
      const isAll = i === arr.length - 1;
      const b = el("button", "chip" + (cur === n ? " is-on" : ""), isAll ? `Hammasi (${n})` : String(n));
      b.type = "button";
      b.addEventListener("click", () => setCount(n));
      chips.append(b);
    });
  }

  function setCount(n) {
    const max = poolForConfig().length;
    n = clamp(Math.round(Number(n) || 1), 1, Math.max(1, max));
    if (cfg.mode === "section") cfg.countSection = n >= max ? 0 : n;
    else cfg.countRandom = n;
    saveCfg(); renderCount(); renderSummary();
  }

  function renderSummary() {
    const pool = poolForConfig();
    const n = currentCount(pool.length);
    const box = $("start-summary");
    const btn = $("start-btn");
    box.classList.remove("is-error");
    if (!pool.length) {
      box.textContent = "Kamida bitta bo‘limni belgilang.";
      box.classList.add("is-error");
      btn.disabled = true;
      return;
    }
    btn.disabled = false;
    box.innerHTML = "";
    let where;
    if (cfg.mode === "section") where = `${cfg.section}-bo‘limdan`;
    else if (cfg.mode === "all") where = "barcha bo‘limlardan";
    else where = cfg.multi.length === SECTIONS.length ? "barcha bo‘limlardan tasodifiy" : `${cfg.multi.length} ta bo‘limdan tasodifiy`;
    box.append(
      document.createTextNode("Test: "), el("b", null, fmtNum(n)),
      document.createTextNode(` ta savol, ${where}` + (cfg.shuffleQ || cfg.mode === "random" ? ", aralash tartibda." : ", fayldagi tartibda."))
    );
  }

  function renderSetup() {
    document.querySelectorAll('input[name="mode"]').forEach((r) => { r.checked = r.value === cfg.mode; });
    $("panel-sections").hidden = cfg.mode === "all";
    $("step-settings").textContent = cfg.mode === "all" ? "2" : "3";
    $("opt-shuffle-q").checked = cfg.shuffleQ;
    $("opt-shuffle-o").checked = cfg.shuffleO;
    $("opt-shuffle-q").closest(".switch").hidden = cfg.mode === "random";
    renderSections();
    renderCount();
    renderSummary();
  }

  function renderExtras() {
    const m = [...mistakes].filter((id) => Q.has(id));
    $("mistakes-text").textContent = m.length
      ? `Sizda ${m.length} ta xato qilingan savol saqlangan. Ularni to‘g‘ri topsangiz, ro‘yxatdan o‘chadi.`
      : "Hozircha xato qilingan savollar yo‘q. Test ishlaganingizda xatolar shu yerda yig‘iladi.";
    $("mistakes-start").disabled = !m.length;
    $("mistakes-clear").hidden = !m.length;

    const list = $("history-list");
    list.innerHTML = "";
    if (!history.length) {
      list.append(el("li", "empty", "Hali test yakunlanmagan."));
    }
    history.slice(0, 6).forEach((h) => {
      const li = el("li");
      li.append(el("span", "h-name", h.label));
      const sc = el("span", "h-score", h.pct + "%");
      sc.append(el("small", null, `${h.ok}/${h.total}`));
      li.append(sc);
      const d = new Date(h.date);
      li.append(el("span", "h-date", `${d.toLocaleDateString("uz-UZ")} ${d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })} · ${fmtTime(h.time)}`));
      list.append(li);
    });

    const s = store.get("session", null);
    const valid = s && Array.isArray(s.qids) && s.qids.every((id) => Q.has(id));
    $("resume-banner").hidden = !valid;
    if (valid) {
      const done = s.answers.filter((a) => a != null).length;
      $("resume-info").textContent = `${s.label} — ${done} / ${s.qids.length} ta savol ishlangan`;
    }
  }

  function showHome() {
    stopTimer();
    showScreen("home");
    renderStats();
    renderSetup();
    renderExtras();
  }

  // Hodisalar
  document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", () => {
    cfg.mode = r.value; saveCfg(); renderSetup();
  }));
  $("sel-all").addEventListener("click", () => { cfg.multi = SECTIONS.map((s) => s.id); saveCfg(); renderSetup(); });
  $("sel-none").addEventListener("click", () => { cfg.multi = []; saveCfg(); renderSetup(); });
  $("count-input").addEventListener("input", (e) => {
    const v = parseInt(e.target.value, 10);
    if (!Number.isNaN(v) && v > 0) {
      const max = poolForConfig().length;
      if (cfg.mode === "section") cfg.countSection = v >= max ? 0 : v; else cfg.countRandom = v;
      saveCfg(); renderSummary();
      document.querySelectorAll("#count-chips .chip").forEach((c) => c.classList.remove("is-on"));
    }
  });
  $("count-input").addEventListener("change", (e) => setCount(e.target.value));
  $("count-input").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); setCount(e.target.value); e.target.blur(); } });
  $("count-minus").addEventListener("click", () => setCount(currentCount(poolForConfig().length) - 1));
  $("count-plus").addEventListener("click", () => setCount(currentCount(poolForConfig().length) + 1));
  $("opt-shuffle-q").addEventListener("change", (e) => { cfg.shuffleQ = e.target.checked; saveCfg(); renderSummary(); });
  $("opt-shuffle-o").addEventListener("change", (e) => { cfg.shuffleO = e.target.checked; saveCfg(); });

  $("start-btn").addEventListener("click", () => {
    const pool = poolForConfig();
    if (!pool.length) return;
    const n = currentCount(pool.length);
    let qids;
    if (cfg.mode === "random") qids = shuffle(pool).slice(0, n);
    else if (cfg.shuffleQ) qids = shuffle(pool).slice(0, n);
    else qids = pool.slice(0, n);
    let label;
    if (cfg.mode === "section") {
      const s = SEC_BY_ID.get(cfg.section);
      label = `${s.id}-bo‘lim · ${secShort(s)}`;
    } else if (cfg.mode === "all") label = "Barcha savollar";
    else label = `Tasodifiy ${n} ta savol`;
    startSession(qids, label);
  });
  $("mistakes-start").addEventListener("click", () => {
    const ids = [...mistakes].filter((id) => Q.has(id));
    if (ids.length) startSession(shuffle(ids), "Xatolar ustida ishlash");
  });
  $("mistakes-clear").addEventListener("click", () => {
    ask("Xatolar ro‘yxatini tozalaysizmi?", "Saqlangan xato savollar ro‘yxati o‘chiriladi.", () => {
      mistakes.clear(); store.set("mistakes", []); renderExtras();
    });
  });
  $("resume-go").addEventListener("click", () => {
    const s = store.get("session", null);
    if (s) { session = s; openQuiz(); }
  });
  $("resume-discard").addEventListener("click", () => {
    ask("Tugallanmagan testni o‘chirasizmi?", "Bu testdagi joriy holat saqlanmaydi.", () => {
      store.del("session"); renderExtras();
    });
  });

  /* ================= TEST ================= */
  let session = null;
  let timerId = null, lastTick = 0;

  function startSession(qids, label) {
    session = {
      label,
      qids,
      perms: qids.map(() => (cfg.shuffleO ? shuffle([0, 1, 2, 3]) : [0, 1, 2, 3])),
      answers: qids.map(() => null), // tanlangan ORIGINAL variant indeksi
      cur: 0,
      elapsed: 0,
      started: Date.now(),
    };
    saveSession();
    openQuiz();
  }

  function saveSession() { if (session) store.set("session", session); }
  const answeredCount = () => session.answers.filter((a) => a != null).length;
  const frontier = () => { const i = session.answers.indexOf(null); return i === -1 ? session.qids.length - 1 : i; };
  const isCorrect = (i) => session.answers[i] != null && session.answers[i] === Q.get(session.qids[i]).ans;

  function openQuiz() {
    showScreen("quiz");
    session.cur = clamp(session.cur, 0, frontier());
    $("quiz-label").textContent = session.label;
    $("pos-total").textContent = session.qids.length;
    buildNavigator();
    renderQuestion(true);
    startTimer();
  }

  function startTimer() {
    stopTimer();
    lastTick = Date.now();
    $("timer").textContent = fmtTime(session.elapsed);
    timerId = setInterval(() => {
      const now = Date.now();
      if (!document.hidden) session.elapsed += now - lastTick;
      lastTick = now;
      $("timer").textContent = fmtTime(session.elapsed);
    }, 1000);
  }
  function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }

  function renderQuestion(animate) {
    const i = session.cur;
    const q = Q.get(session.qids[i]);
    const s = SEC_BY_ID.get(q.sec);
    const perm = session.perms[i];
    const chosen = session.answers[i];

    $("pos-cur").textContent = i + 1;
    $("q-num").textContent = `Savol ${i + 1}`;
    $("q-src").textContent = `${s.id}-bo‘lim, №${q.n}`;
    $("q-src").title = s.title;
    $("q-text").textContent = q.text;

    const box = $("options");
    box.innerHTML = "";
    perm.forEach((orig, pos) => {
      const b = el("button", "opt");
      b.type = "button";
      b.dataset.orig = orig;
      b.append(el("span", "opt-letter", LETTERS[pos]), el("span", "opt-text", q.opts[orig]), el("span", "opt-tag"));
      b.setAttribute("aria-label", `${LETTERS[pos]} variant: ${q.opts[orig]}`);
      b.addEventListener("click", () => choose(orig));
      box.append(b);
    });
    if (chosen != null) paintAnswer(false);

    updateBar();
    const card = $("qcard");
    if (animate) { card.classList.remove("anim"); void card.offsetWidth; card.classList.add("anim"); }
  }

  function choose(orig) {
    const i = session.cur;
    if (session.answers[i] != null) return; // javob qulflangan
    session.answers[i] = orig;
    const id = session.qids[i];
    if (orig === Q.get(id).ans) { known.add(id); mistakes.delete(id); }
    else { known.delete(id); mistakes.add(id); }
    store.set("known", [...known]);
    store.set("mistakes", [...mistakes]);
    saveSession();
    paintAnswer(true);
    updateBar();
    $("next-btn").focus({ preventScroll: true });
  }

  function paintAnswer(fresh) {
    const i = session.cur;
    const q = Q.get(session.qids[i]);
    const chosen = session.answers[i];
    document.querySelectorAll("#options .opt").forEach((b) => {
      const orig = Number(b.dataset.orig);
      b.disabled = true;
      const tag = b.querySelector(".opt-tag");
      if (orig === q.ans) {
        b.classList.add("is-correct");
        tag.textContent = orig === chosen ? "Sizning javobingiz ✓" : "To‘g‘ri javob";
      } else if (orig === chosen) {
        b.classList.add("is-wrong");
        tag.textContent = "Sizning javobingiz";
        if (fresh) b.classList.add("shake");
      } else {
        b.classList.add("is-dim");
      }
      if (orig === chosen) b.classList.add("is-picked");
    });
  }

  function updateBar() {
    const i = session.cur;
    const total = session.qids.length;
    const done = answeredCount();
    let ok = 0, bad = 0;
    session.answers.forEach((a, k) => { if (a != null) (isCorrect(k) ? ok++ : bad++); });
    $("cnt-ok").textContent = ok;
    $("cnt-bad").textContent = bad;
    $("progress-fill").style.width = (done / total) * 100 + "%";

    const answered = session.answers[i] != null;
    const last = i === total - 1;
    const next = $("next-btn");
    next.disabled = !answered;
    next.textContent = last ? "Natijani ko‘rish" : "Keyingisi →";
    $("next-hint").textContent = answered ? (last ? "Bu oxirgi savol edi" : "") : "Davom etish uchun javobni tanlang";
    $("next-hint").style.color = "";
    $("prev-btn").disabled = i === 0;
    updateNavigator();
  }

  function goNext() {
    if (session.answers[session.cur] == null) {
      const h = $("next-hint");
      h.textContent = "Avval javob variantlaridan birini tanlang";
      h.style.color = "var(--bad)";
      return;
    }
    if (session.cur === session.qids.length - 1) { finish(); return; }
    session.cur++;
    saveSession();
    renderQuestion(true);
    scrollToCard();
  }
  function goPrev() {
    if (session.cur === 0) return;
    session.cur--;
    saveSession();
    renderQuestion(true);
    scrollToCard();
  }
  function scrollToCard() {
    const top = $("qcard").getBoundingClientRect().top;
    if (top < 70 || top > innerHeight * 0.5) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let navCells = [];
  function buildNavigator() {
    const grid = $("nav-grid");
    grid.innerHTML = "";
    navCells = session.qids.map((_, i) => {
      const b = el("button", "nav-cell", i + 1);
      b.type = "button";
      b.addEventListener("click", () => {
        if (i > frontier()) return;
        session.cur = i; saveSession(); renderQuestion(true); scrollToCard();
      });
      grid.append(b);
      return b;
    });
  }
  function updateNavigator() {
    const f = frontier();
    navCells.forEach((b, i) => {
      const a = session.answers[i];
      b.className = "nav-cell" + (a != null ? (isCorrect(i) ? " ok" : " bad") : "") + (i === session.cur ? " cur" : "");
      b.disabled = i > f;
    });
  }

  $("next-btn").addEventListener("click", goNext);
  $("prev-btn").addEventListener("click", goPrev);
  $("quiz-exit").addEventListener("click", () => {
    saveSession();
    showHome();
  });
  $("finish-early").addEventListener("click", () => {
    const left = session.qids.length - answeredCount();
    ask("Testni yakunlaysizmi?",
      left ? `Hali ${left} ta savol ishlanmagan. Ular natijada “ishlanmagan” deb hisoblanadi.` : "Natijalar sahifasiga o‘tasiz.",
      finish);
  });

  document.addEventListener("keydown", (e) => {
    if (!$("modal").hidden) {
      if (e.key === "Escape") closeModal();
      return;
    }
    if ($("screen-quiz").hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.matches && e.target.matches("input, textarea")) return;
    const k = e.key.toLowerCase();
    const idx = ["1", "2", "3", "4"].indexOf(k) !== -1 ? Number(k) - 1 : ["a", "b", "c", "d"].indexOf(k);
    if (idx >= 0) {
      const btn = document.querySelectorAll("#options .opt")[idx];
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
    } else if (e.key === "Enter" || e.key === "ArrowRight") {
      if (e.key === "Enter" && e.target.tagName === "BUTTON" && e.target.id !== "next-btn") return;
      e.preventDefault(); goNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); goPrev();
    }
  });

  /* ================= NATIJA ================= */
  let lastResult = null;

  function finish() {
    stopTimer();
    const total = session.qids.length;
    let ok = 0, bad = 0;
    const wrongIds = [];
    session.answers.forEach((a, i) => {
      if (a == null) return;
      if (isCorrect(i)) ok++; else { bad++; wrongIds.push(session.qids[i]); }
    });
    const pct = total ? Math.round((ok / total) * 100) : 0;
    lastResult = { session, ok, bad, skip: total - ok - bad, pct, wrongIds };
    if (ok + bad > 0) {
      history.unshift({ label: session.label, ok, total, pct, time: session.elapsed, date: Date.now() });
      history = history.slice(0, 30);
      store.set("history", history);
    }
    store.del("session");
    showResult();
  }

  function showResult() {
    const r = lastResult;
    showScreen("result");
    $("res-label").textContent = r.session.label;
    $("res-pct").textContent = r.pct + "%";
    $("res-ok").textContent = r.ok;
    $("res-bad").textContent = r.bad;
    $("res-skip").textContent = r.skip;
    $("res-time").textContent = fmtTime(r.session.elapsed);
    let title;
    if (r.pct >= 90) title = "A’lo natija!";
    else if (r.pct >= 75) title = "Yaxshi natija";
    else if (r.pct >= 56) title = "Qoniqarli natija";
    else title = "Yana mashq qilish kerak";
    $("res-title").textContent = title;
    const fg = $("ring-fg");
    const C = 2 * Math.PI * 52;
    fg.style.stroke = r.pct >= 56 ? "var(--ok)" : "var(--bad)";
    fg.style.strokeDashoffset = C;
    requestAnimationFrame(() => requestAnimationFrame(() => { fg.style.strokeDashoffset = C * (1 - r.pct / 100); }));
    $("res-wrong").disabled = !r.wrongIds.length;
    $("res-wrong").textContent = r.wrongIds.length ? `Xatolarni qayta ishlash (${r.wrongIds.length})` : "Xato yo‘q";
    setFilter(r.bad ? "bad" : "all");
    window.scrollTo({ top: 0 });
  }

  function setFilter(f) {
    document.querySelectorAll(".seg-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === f)));
    renderReview(f);
  }
  document.querySelectorAll(".seg-btn").forEach((b) => b.addEventListener("click", () => setFilter(b.dataset.filter)));

  function renderReview(filter) {
    const s = lastResult.session;
    const list = $("review-list");
    list.innerHTML = "";
    let shown = 0;
    s.qids.forEach((id, i) => {
      const a = s.answers[i];
      const q = Q.get(id);
      const state = a == null ? "skip" : a === q.ans ? "ok" : "bad";
      if (filter !== "all" && state !== filter) return;
      shown++;
      const perm = s.perms[i];
      const L = (orig) => LETTERS[perm.indexOf(orig)];
      const li = el("li", "rv " + state);
      const qt = el("div", "rv-q");
      qt.append(el("small", null, `${i + 1}.`), document.createTextNode(q.text));
      li.append(qt);
      if (state === "bad") {
        const y = el("div", "rv-a your-bad"); y.append(el("b", null, "Sizning javobingiz:"), el("span", null, `${L(a)}) ${q.opts[a]}`)); li.append(y);
      }
      if (state === "skip") li.append(el("div", "rv-a", "Ishlanmagan"));
      const c = el("div", "rv-a right"); c.append(el("b", null, "To‘g‘ri javob:"), el("span", null, `${L(q.ans)}) ${q.opts[q.ans]}`)); li.append(c);
      list.append(li);
    });
    if (!shown) list.append(el("li", "empty", filter === "bad" ? "Xato javoblar yo‘q — barakalla!" : "Bu bo‘limda ko‘rsatadigan narsa yo‘q."));
  }

  $("res-wrong").addEventListener("click", () => {
    if (lastResult.wrongIds.length) startSession(shuffle(lastResult.wrongIds), "Xatolar ustida ishlash");
  });
  $("res-retry").addEventListener("click", () => {
    const s = lastResult.session;
    startSession(cfg.shuffleQ ? shuffle(s.qids) : s.qids.slice(), s.label);
  });
  $("res-home").addEventListener("click", showHome);

  /* ================= EKRANLAR VA MODAL ================= */
  function showScreen(name) {
    ["home", "quiz", "result"].forEach((n) => { $("screen-" + n).hidden = n !== name; });
    window.scrollTo({ top: 0 });
  }

  let modalOk = null;
  function ask(title, text, onOk) {
    $("modal-title").textContent = title;
    $("modal-text").textContent = text;
    modalOk = onOk;
    $("modal").hidden = false;
    $("modal-ok").focus();
  }
  function closeModal() { $("modal").hidden = true; modalOk = null; }
  $("modal-cancel").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });
  $("modal-ok").addEventListener("click", () => { const f = modalOk; closeModal(); if (f) f(); });

  /* ================= ISHGA TUSHIRISH ================= */
  if (!SECTIONS.length) {
    document.querySelector(".setup").innerHTML = '<div class="panel"><p class="summary is-error">Savollar fayli (questions.js) topilmadi.</p></div>';
  }
  showHome();
})();
