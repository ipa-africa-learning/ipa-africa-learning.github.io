// IPA Africa Learning prototype: shared core (session, storage, enrolment, UI helpers, top bar, notifications).
// Everything runs in the browser. Data are stored in this device's localStorage; nothing is sent anywhere.
(function () {
  "use strict";
  const D = window.IPA, USERS = window.IPA_USERS || [];
  const C = (window.C = { D, users: USERS });
  const NS = "ipa:v1:";
  const byId = (C.userById = {});
  USERS.forEach((u) => (byId[u.id.toLowerCase()] = u));
  const Q = (C.Q = new URLSearchParams(location.search));
  const PAGE = (C.page = document.body.dataset.page || "");

  // ------------------------------------------------------------ DOM helpers
  C.$ = (s, r = document) => r.querySelector(s);
  C.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (C.el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    kids.flat(Infinity).forEach((k) => { if (k != null && k !== false) n.append(k instanceof Node ? k : document.createTextNode(String(k))); });
    return n;
  });
  const icon = (C.icon = (name, cls = "i") => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", cls); s.setAttribute("aria-hidden", "true");
    const u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u.setAttribute("href", "#" + name); s.append(u); return s;
  });
  C.hashNum = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  C.uid = (p = "id") => p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  C.fmt = (ts, opt = { day: "numeric", month: "short", year: "numeric" }) => new Date(ts).toLocaleDateString("en-GB", opt);
  C.fmtTime = (ts) => new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  C.ago = (ts) => {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago"; if (s < 86400 * 30) return Math.floor(s / 86400) + " days ago";
    return C.fmt(ts);
  };
  C.escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // ------------------------------------------------------------ storage
  const S = (C.store = {
    get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { C.say("This browser is not saving data (private mode or storage full)."); } },
    del(k) { try { localStorage.removeItem(NS + k); } catch (e) { } },
    keys(prefix) { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(NS + prefix)) out.push(k.slice(NS.length)); } } catch (e) { } return out; },
  });

  // ------------------------------------------------------------ session
  C.me = () => { const s = S.get("session", null); return s && typeof s.id === "string" && byId[s.id.toLowerCase()] ? byId[s.id.toLowerCase()] : null; };
  C.signIn = (id, pw) => {
    const u = byId[String(id).replace(/\s+/g, "").toLowerCase()];
    if (!u) return { ok: false, msg: "No account uses that participant ID or staff ID." };
    if (window.sha256(`ipa:${u.id.toLowerCase()}:${pw}`) !== u.h) return { ok: false, msg: "The password is not correct. Check capital letters and try again." };
    S.set("session", { id: u.id, at: Date.now() });
    C.log(u, "signin");
    return { ok: true, user: u };
  };
  C.signInAs = (id) => { S.set("session", { id, at: Date.now() }); };
  C.signOut = () => { S.del("session"); location.href = "login.html"; };
  C.isStaff = (u) => u && u.r !== "s";
  C.roleName = (u) => ({ s: "Participant", t: "Facilitator", c: "Programme director", sc: "Sponsor liaison", h: "Helpdesk officer", a: "Administrator", w: "Faculty author" })[u.r] || "Staff";
  C.requireUser = () => {
    const u = C.me();
    if (!u) { location.replace("login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search)); throw new Error("redirect"); }
    return u;
  };

  // per-user data (bookmarks, notes, progress, quiz attempts...)
  C.ud = (u = C.me()) => {
    const key = "user:" + (u ? u.id : "guest");
    return {
      get(path, d) { const o = S.get(key, {}); return o[path] === undefined ? d : o[path]; },
      set(path, v) { const o = S.get(key, {}); o[path] = v; S.set(key, o); },
      all() { return S.get(key, {}); },
      reset() { S.del(key); },
      resetReading() { const o = S.get(key, {}); Object.keys(o).forEach((k) => { if (/^(notes|bm|hl|quiz|quizdraft|pqans|ai):/.test(k) || ["pos", "prog", "seen", "dl", "readerPrefs"].includes(k)) delete o[k]; }); S.set(key, o); },
    };
  };
  C.log = (u, what, extra = {}) => { const l = S.get("activity", []); l.push({ id: u.id, what, at: Date.now(), ...extra }); S.set("activity", l.slice(-2000)); };

  // ------------------------------------------------------------ enrolment & access
  C.prog = (slug) => D.programmes.find((p) => p.slug === slug);
  C.course = (slug) => (typeof slug === "string" && Object.prototype.hasOwnProperty.call(D.courses, slug) ? D.courses[slug] : undefined);
  // organisations, countries and dated offerings (cohorts)
  C.country = (cc) => { const c = D.countries.find((x) => x[0] === cc); return c ? c[1] : ""; };
  C.org = (id) => D.orgs.find((x) => x[0] === id) || null;
  C.orgName = (id) => { const o = C.org(id); return o ? `${o[1]}, ${C.country(o[2])}` : ""; };
  C.offering = (id) => { for (const P of D.programmes) { const o = P.offerings.find((x) => x.id === id); if (o) return { P, o }; } return null; };
  const day0 = (iso) => new Date(iso + "T00:00:00").getTime();
  C.offState = (o) => { if (!o || !o.start) return "request"; const now = Date.now(); return now < day0(o.start) ? "upcoming" : now > day0(o.end) + 86400000 ? "completed" : "progress"; };
  C.offLabel = { upcoming: "Starts soon", progress: "In progress", completed: "Completed", request: "On request" };
  C.fmtDay = (iso) => C.fmt(day0(iso));
  C.ALUMNI_DAYS = 365;
  C.alumniUntil = (o) => day0(o.end) + C.ALUMNI_DAYS * 86400000;
  C.enrol = (u) => {
    if (!u || u.r !== "s") return { current: [], retro: [], alumni: [] };
    const cur = u.p && u.k ? C.offering(u.k) : null;
    const current = cur && C.offState(cur.o) !== "completed" ? cur.P.courses.slice() : [];
    const alumni = (u.alum || []).map(([p, k]) => ({ ...(C.offering(k) || { P: C.prog(p), o: null }) })).filter((a) => a.o);
    alumni.forEach((a) => (a.until = C.alumniUntil(a.o)));
    const retro = alumni.filter((a) => Date.now() < a.until).flatMap((a) => a.P.courses).filter((s) => !current.includes(s));
    return { current, retro: [...new Set(retro)], alumni, P: cur ? cur.P : null, K: cur ? cur.o : null };
  };
  C.access = (slug, u = C.me()) => {
    if (!u) return "preview";
    if (u.r !== "s") return "staff";
    const e = C.enrol(u);
    if (e.current.includes(slug)) return "full";
    if (e.retro.includes(slug)) return "retro";
    return "preview";
  };
  C.accessLabel = { full: "Full access", retro: "Alumni access: read-only", preview: "Preview: Unit 1 only", staff: "Staff access" };
  // participants in a current or forthcoming cohort of a course's programme (for forums, networks, facilitator lists)
  let _rost = null;
  C.roster = (slug) => {
    if (!_rost) {
      _rost = {};
      USERS.filter((u) => u.r === "s").forEach((u) => C.enrol(u).current.forEach((s) => (_rost[s] = _rost[s] || []).push(u)));
    }
    return _rost[slug] || [];
  };
  C.tutorsFor = (slug) => USERS.filter((u) => (u.r === "t" || u.r === "c") && (u.cs || []).includes(slug));
  C.staffCourses = (u) => (["t", "c", "w"].includes(u.r) ? u.cs || [] : Object.keys(D.courses));

  // reading progress stored by the reader
  C.progress = (slug, u = C.me()) => (u ? C.ud(u).get("prog", {})[slug] || 0 : 0);
  C.offline = (slug, u = C.me()) => (u ? !!C.ud(u).get("dl", {})[slug] : false);

  // books are loaded on demand from books/<slug>.js (works from file:// and on GitHub Pages)
  window.IPA_BOOKS = window.IPA_BOOKS || {};
  C.loadBook = (slug) => new Promise((res, rej) => {
    if (window.IPA_BOOKS[slug]) return res(window.IPA_BOOKS[slug]);
    const s = document.createElement("script");
    s.src = "books/" + slug + ".js";
    s.onload = () => (window.IPA_BOOKS[slug] ? res(window.IPA_BOOKS[slug]) : rej(new Error("Book not found")));
    s.onerror = () => rej(new Error("Could not load the course book"));
    document.head.append(s);
  });

  // ------------------------------------------------------------ uniform book cover
  C.cover = (c, cls = "") => el("div", { class: "cover " + cls, "aria-label": "Course book cover" },
    el("small", { text: "IPA AFRICA COURSE BOOK" }), el("span", { class: "ct", text: c.title }), el("span", { class: "cc2", text: c.code }), el("i"));
  // miniature of the same cover (44 x 60) for course cards, rows and the Continue reading hero
  C.mcover = (c, cls = "") => { const m = c.code.match(/^([A-Z]+)(\d+)$/) || [0, c.code, ""]; return el("span", { class: "mcover " + cls, "aria-hidden": "true" }, el("b", {}, el("span", { text: m[1] }), el("span", { text: m[2] })), el("i")); };

  // ------------------------------------------------------------ hemicycle progress (the IPA motif: one seat per course or unit)
  // states: "done" (gold), "cur" (gold ring with a centre dot), "todo" (neutral 300), "alum" (neutral 200, read-only)
  C.hemicycle = (states, label) => {
    const NS2 = "http://www.w3.org/2000/svg", n = states.length;
    const svg = document.createElementNS(NS2, "svg");
    svg.setAttribute("viewBox", "0 0 120 66"); svg.setAttribute("class", "hemi"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label);
    const title = document.createElementNS(NS2, "title"); title.textContent = label; svg.append(title);
    const arcs = n > 9 ? [[30, Math.round(n * 0.4), 5.5], [50, n - Math.round(n * 0.4), 5.5]] : [[46, n, Math.min(7.5, (Math.PI * 46 / Math.max(n, 1)) * 0.34)]];
    const seats = [];
    arcs.forEach(([R, k, r]) => { for (let i = 0; i < k; i++) { const a = k === 1 ? 90 : 170 - i * 160 / (k - 1); seats.push({ a, x: 60 + R * Math.cos(a * Math.PI / 180), y: 60 - R * Math.sin(a * Math.PI / 180), r }); } });
    seats.sort((p, q) => q.a - p.a || p.y - q.y);
    const circle = (x, y, r, cls) => { const c = document.createElementNS(NS2, "circle"); c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1)); c.setAttribute("r", r.toFixed(1)); c.setAttribute("class", cls); svg.append(c); };
    seats.forEach((p, i) => { const st = states[i] || "todo"; if (st === "cur") { circle(p.x, p.y, p.r - 1, "s-cur"); circle(p.x, p.y, p.r * 0.38, "s-dot"); } else circle(p.x, p.y, p.r, "s-" + st); });
    return svg;
  };

  // ------------------------------------------------------------ the Assessments hub: one tab bar on exams, quizzes and practice questions
  C.hubTabs = (active) => {
    const c = C.Q.get("c"), q = c && C.course(c) ? "?c=" + encodeURIComponent(c) : "";
    return el("nav", { class: "hubtabs", "aria-label": "Assessments, quizzes and practice questions" },
      ...[["exams", "exams.html", "Assessments"], ["quizzes", "quizzes.html", "Quizzes"], ["pastq", "pastq.html", "Practice questions"]]
        .map(([k, h, t]) => el("a", { href: h + q, class: k === active ? "on" : "", "aria-current": k === active ? "page" : null, text: t })));
  };

  // ------------------------------------------------------------ toast & modal
  const toast = el("div", { class: "pt-toast", role: "status", "aria-live": "polite" });
  document.body.append(toast);
  let tt;
  C.say = (msg, ms = 3000) => { toast.textContent = msg; toast.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove("show"), ms); };
  document.addEventListener("click", (e) => { const t = e.target.closest("[data-toast]"); if (t) { e.preventDefault(); C.say(t.getAttribute("data-toast")); } });

  C.modal = ({ title, body, actions = [], wide = false, onOpen }) => new Promise((resolve) => {
    const ov = el("div", { class: "ov open", role: "dialog", "aria-modal": "true" });
    const box = el("div", { class: "mbox" + (wide ? " wide" : "") });
    const close = (v) => { ov.remove(); document.removeEventListener("keydown", esc); resolve(v); };
    const esc = (e) => { if (e.key === "Escape") close(null); };
    document.addEventListener("keydown", esc);
    ov.addEventListener("click", (e) => { if (e.target === ov) close(null); });
    const acts = el("div", { class: "btns mact" });
    actions.forEach((a) => acts.append(el("button", {
      class: "btn " + (a.cls || ""), type: "button", text: a.label,
      onclick: () => { const v = a.value ? a.value(box) : a.id; if (v === false) return; close(v); },
    })));
    box.append(el("div", { class: "mhead" }, el("h2", { text: title }), el("button", { class: "icon-btn dark", "aria-label": "Close", onclick: () => close(null) }, icon("x"))),
      el("div", { class: "mbody" }, body), actions.length ? acts : null);
    ov.append(box); document.body.append(ov);
    const f = box.querySelector("input,textarea,select,button.btn"); if (f) setTimeout(() => f.focus(), 30);
    if (onOpen) onOpen(box, close);
  });
  C.confirm = (title, text, yes = "Yes", cls = "") => C.modal({ title, body: el("p", { text }), actions: [{ label: "Cancel", cls: "ghost", id: false }, { label: yes, id: true, cls }] });

  // ------------------------------------------------------------ notifications
  C.notifications = (u = C.me()) => {
    if (!u) return [];
    const out = [];
    const seen = new Set(C.ud(u).get("notifRead", []));
    const push = (id, text, href, at) => out.push({ id, text, href, at, read: seen.has(id) });
    const now = Date.now(), day = 86400000;
    if (u.r === "s") {
      const e = C.enrol(u);
      if (e.K) push("n-welcome-" + e.K.id, `Welcome to ${e.P.short} (${e.K.id}). Your course books are ready to read or download.`, "dashboard.html", now - 3 * day);
      if (C.liveUpcomingFor) C.liveUpcomingFor(u, 7).slice(0, 3).forEach((s) => push("n-live-" + s.id, `Live session: ${s.title} (${C.course(s.course).code}), ${C.fmtTime(s.start)}.`, "session.html?s=" + encodeURIComponent(s.id), Math.min(now, s.start - day)));
      e.alumni.forEach((a) => push("n-cert-" + a.o.id, `Your certificate for ${a.P.short} is ready. It carries ${a.P.cpd} CPD hours and a verification code.`, "certificates.html", day0(a.o.end) + 2 * day));
      (C.examList ? C.examList(e.current) : []).filter((x) => x.opens <= now && x.closes > now && !((S.get("examsubs:" + x.id, {})[u.id] || {}).status === "submitted")).slice(0, 3)
        .forEach((x) => push("n-exam-" + x.id, `Assessment open: ${x.title} (${C.course(x.course).code}), closes ${C.fmtTime(x.closes)}.`, "exams.html", x.opens));
      e.current.forEach((s) => (S.get("announce:" + s, []) || []).forEach((a) => push("n-ann-" + a.id, `${C.course(s).code}: ${a.text}`, `course-${s}.html`, a.at)));
      e.current.forEach((s) => { const ed = S.get("edition:" + s, null); if (ed) push("n-ed-" + s + ed.n, `${C.course(s).code}: edition ${ed.n} of the course book has been published.`, `course-${s}.html`, ed.at); });
      (S.get("groups", []) || []).filter((g) => (g.invites || []).includes(u.id)).forEach((g) => push("n-inv-" + g.id, `You were invited to the cohort network “${g.name}”.`, "groups.html", (g.invitedAt && g.invitedAt[u.id]) || g.created));
      Object.keys(D.courses).forEach((s) => (S.get("forum:" + s, []) || []).forEach((t) => {
        if (t.by === u.id) t.posts.slice(1).filter((p) => p.by !== u.id && !p.hidden).forEach((p) => push("n-rep-" + p.id, `${C.userById[p.by.toLowerCase()]?.n || "Someone"} replied to your post “${t.title}”.`, `forum.html?c=${s}&t=${t.id}`, p.at));
      }));
    } else {
      push("n-staff", "Welcome to the staff view of the IPA Africa Learning prototype.", "staff.html", now - 2 * day);
      if (u.r === "t" || u.r === "c") {
        const flagged = u.cs.reduce((a, s) => a + (S.get("forum:" + s, []) || []).reduce((b, t) => b + t.posts.filter((p) => p.flags && p.flags.length && !p.hidden).length, 0), 0);
        if (flagged) push("n-flag-" + flagged, `${flagged} reported post(s) are waiting for moderation in your courses.`, "staff.html#moderation", now);
      }
    }
    return out.sort((a, b) => b.at - a.at);
  };

  // ------------------------------------------------------------ top bar
  // the top menu: six items for participants; alumni, staff and visitors see fewer. Certificates and Help are in the avatar menu.
  C.isAlumnus = (u) => !!u && u.r === "s" && !C.enrol(u).current.length;
  C.nav = (u) => {
    if (!u) return [["index.html", "Overview", "home"], ["programmes.html", "Programmes", "grid"], ["help.html", "Help", "help"]];
    if (u.r === "s") return C.isAlumnus(u) ? [["dashboard.html", "Dashboard", "home"], ["programmes.html", "Programmes", "grid"], ["groups.html", "Networks", "users"]]
      : [["dashboard.html", "Dashboard", "home"], ["programmes.html", "Programmes", "grid"], ["live.html", "Live sessions", "video"], ["exams.html", "Assessments", "clock"], ["groups.html", "Networks", "users"], ["ai.html", "AI assistant", "spark"]];
    const n = [["staff.html", "Staff home", "home"], ["programmes.html", "Programmes", "grid"]];
    if (u.r === "t" || u.r === "c" || u.r === "a") n.push(["live.html", "Live sessions", "video"], ["exams.html", "Assessments", "clock"]);
    if (u.r === "a" || u.r === "h" || u.r === "sc" || u.r === "c") n.push(["admin.html", "Reports", "chart"]);
    return n;
  };
  // the avatar menu: profile, certificates (participants), help, sign out
  C.accountMenu = (u) => [["profile.html", "My profile and settings", "user"], u.r === "s" ? ["certificates.html", "Certificates", "check"] : null,
    u.r === "s" && !C.isAlumnus(u) ? ["ai.html#settings", "AI assistant settings", "spark"] : null, ["help.html", "Help", "help"]].filter(Boolean);
  function topbar() {
    const host = C.$("header.top"); if (!host) return;
    const u = C.me(), here = location.pathname.split("/").pop() || "index.html";
    const items = C.nav(u);
    const activeFor = (href) => here === href || (href === "programmes.html" && /^(programme-|course-|forum)/.test(here)) || (href === "dashboard.html" && here === "reader.html")
      || (href === "groups.html" && here === "group.html") || (href === "live.html" && here === "session.html") || (href === "exams.html" && /^(exam|quizzes|quiz|pastq)\.html$/.test(here));
    const links = C.$("nav.links", host), mnav = C.$(".mnav", host);
    links.replaceChildren(...items.map(([h, t]) => el("a", { href: h, class: activeFor(h) ? "on" : "", "aria-current": activeFor(h) ? "page" : null }, t)));
    mnav.replaceChildren(...items.map(([h, t, ic]) => el("a", { href: h, class: activeFor(h) ? "on" : "" }, icon(ic), t)));
    if (u) mnav.append(el("div", { class: "msep", role: "presentation" }), ...C.accountMenu(u).map(([h, t, ic]) => el("a", { href: h, class: activeFor(h) ? "on" : "" }, icon(ic), t)),
      el("a", { href: "#", onclick: (e) => { e.preventDefault(); C.signOut(); } }, icon("back"), "Sign out"));
    else mnav.append(el("a", { href: "login.html" }, icon("shield"), "Sign in"));
    const right = C.$(".right", host); right.replaceChildren();
    right.append(el("a", { class: "icon-btn", href: "programmes.html#search", "aria-label": "Search courses" }, icon("search", "i lg")));
    if (u) {
      const notes = C.notifications(u), unread = notes.filter((n) => !n.read).length;
      const count = el("span", { class: "nbadge", "aria-hidden": "true", text: unread > 9 ? "9+" : unread, hidden: !unread });
      const bell = el("button", { class: "icon-btn", "aria-label": `Notifications (${unread} unread)`, "aria-haspopup": "true" }, icon("bell", "i lg"), count);
      const pop = el("div", { class: "pop", role: "menu" });
      const fill = () => {
        const list = C.notifications(u);
        pop.replaceChildren(el("div", { class: "pophead" }, el("b", { text: "Notifications" }),
          el("button", { class: "btn ghost sm", text: "Mark all read", onclick: (e) => { e.stopPropagation(); C.ud(u).set("notifRead", list.map((n) => n.id)); count.hidden = true; bell.setAttribute("aria-label", "Notifications (0 unread)"); fill(); } })),
          ...(list.length ? list.slice(0, 12).map((n) => el("a", { href: n.href, class: "popitem" + (n.read ? "" : " unread"), onclick: () => { const r = new Set(C.ud(u).get("notifRead", [])); r.add(n.id); C.ud(u).set("notifRead", [...r]); } },
            el("span", { text: n.text }), el("small", { text: C.ago(n.at) }))) : [el("p", { class: "small muted pad", text: "No notifications." })]));
      };
      bell.addEventListener("click", (e) => { e.stopPropagation(); fill(); pop.classList.toggle("open"); am.classList.remove("open"); });
      const av = el("button", { class: "avatar", "aria-label": `Account menu for ${u.n}`, text: u.n.split(" ").map((x) => x[0]).slice(0, 2).join("") });
      const am = el("div", { class: "pop narrow", role: "menu" },
        el("div", { class: "pophead" }, el("div", {}, el("b", { text: u.n }), el("div", { class: "tiny muted", text: `${C.roleName(u)} · ${u.id}` }))),
        ...C.accountMenu(u).map(([h, t, ic]) => el("a", { class: "popitem", href: h, role: "menuitem" }, icon(ic, "i sm"), t)),
        el("a", { class: "popitem", href: "#", role: "menuitem", onclick: (e) => { e.preventDefault(); C.signOut(); } }, icon("back", "i sm"), "Sign out"));
      av.addEventListener("click", (e) => { e.stopPropagation(); am.classList.toggle("open"); pop.classList.remove("open"); });
      document.addEventListener("click", () => { pop.classList.remove("open"); am.classList.remove("open"); });
      pop.addEventListener("click", (e) => e.stopPropagation()); am.addEventListener("click", (e) => e.stopPropagation());
      right.append(el("div", { class: "popwrap" }, bell, pop), el("div", { class: "popwrap" }, av, am));
    } else {
      right.append(el("a", { class: "btn red sm", href: "login.html", text: "Sign in" }));
    }
    const brand = C.$(".brand", host); if (brand) brand.href = u ? (u.r === "s" ? "dashboard.html" : "staff.html") : "index.html";
    const mb = C.$("[data-menu]", host);
    mb.addEventListener("click", () => { const o = mnav.classList.toggle("open"); mb.setAttribute("aria-expanded", o); });
    const lb = u && C.liveBar(u, "global"); if (lb) host.after(lb);
  }

  // ------------------------------------------------------------ Live now: a slim green bar under the top bar while one of the user's sessions is open
  C.liveNow = (u) => (u && C.liveFor ? C.liveFor(u).filter((s) => s.status !== "cancelled" && C.liveState(s) === "open" && (C.liveCanAttend(u, s) || C.liveCanManage(u, s))) : []);
  C.liveBar = (u, kind) => {
    const s = C.liveNow(u)[0];
    if (!s || (PAGE === "session" && Q.get("s") === s.id)) return null;
    const mins = Math.round((Date.now() - s.start) / 60000), m = Math.abs(mins);
    const span = m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} minute${m === 1 ? "" : "s"}`;
    const when = mins >= 0 ? (mins === 0 ? "starting now" : `started ${span} ago`) : `starts in ${span}`;
    const href = "session.html?s=" + encodeURIComponent(s.id);
    return el("div", { class: "livebar " + kind, role: "region", "aria-label": "Live session open now" }, el("div", { class: "in" },
      el("span", { class: "pulse", "aria-hidden": "true" }), el("b", { class: "lk", text: "Live now" }),
      el("a", { class: "lt", href }, el("span", { class: "ltt", text: s.title }), el("span", { class: "lw", text: `${C.course(s.course).code} · ${when}` })),
      el("a", { class: "btn white sm", href, onclick: (e) => { if (C.liveEnter) { e.preventDefault(); C.liveEnter(u, s); } } }, icon("video", "i sm"), "Join")));
  };

  // ------------------------------------------------------------ prototype navigator
  function protobar() {
    const here = (location.pathname.split("/").pop() || "index.html") + location.search;
    const S2 = D.screens;
    let idx = S2.findIndex(([u]) => u === here);
    if (idx < 0) idx = S2.findIndex(([u]) => u.split("?")[0] === here.split("?")[0]);
    const bar = el("div", { class: "pt-bar", role: "region", "aria-label": "Prototype notice" }, el("span", { class: "d", "aria-hidden": "true" }), el("span", { class: "lb", text: "Prototype · not a live service" }));
    document.body.classList.add("has-pt");
    const bS = el("button", { type: "button", text: "Screens", "aria-expanded": "false" });
    const bN = el("button", { type: "button", text: "Next ›" });
    const menu = el("div", { class: "pt-menu", role: "menu" }, ...S2.map(([u, t], i) => el("a", { href: u, class: i === idx ? "cur" : "", text: t })));
    bS.addEventListener("click", (e) => { e.stopPropagation(); bS.setAttribute("aria-expanded", menu.classList.toggle("open")); });
    bN.addEventListener("click", () => { location.href = S2[(idx + 1) % S2.length][0]; });
    document.addEventListener("click", () => menu.classList.remove("open"));
    bar.append(bS, bN); document.body.append(bar, menu);
  }

  // links between pages; the Moodle reader replaces this with Moodle URLs
  const qs = (o) => Object.entries(o).filter(([, v]) => v != null && v !== "").map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  C.link = (kind, p = {}) => ({
    course: () => `course-${p.c}.html`, home: () => "dashboard.html", login: () => "login.html", aisettings: () => "ai.html#settings",
    reader: () => "reader.html?" + qs({ c: p.c, p: p.p, b: p.b }), quizzes: () => "quizzes.html?" + qs({ c: p.c }), pastq: () => "pastq.html?" + qs({ c: p.c }),
    print: () => "print.html?" + qs({ c: p.c, id: p.id }), exam: () => "exam.html?" + qs({ e: p.e }),
  }[kind] || (() => "#"))();
  C.ready = (fn) => {
    const run = () => { try { fn(); } catch (e) { if (e && e.message === "redirect") return; console.error(e); } };
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", run) : run();
  };
  C.ready(() => { topbar(); if (document.body.dataset.proto !== "off") protobar(); });
})();
