// Page controllers: sign-in, dashboard, programmes and calendar, course pages, print copy, certificates, staff and sponsor views, reports, profile, help.
(function () {
  "use strict";
  const { el, icon, $, $$, store: S } = C;
  const DAY = 86400000;
  const who = (id) => C.userById[String(id).toLowerCase()] || { n: id, id };
  const tile = (l, v, s) => el("div", { class: "card pad tile" }, el("div", { class: "label", text: l }), el("div", { class: "v", text: v }), s ? el("div", { class: "small muted", text: s }) : null);
  const csvCell = (v) => { let t = String(v ?? ""); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
  const download = (name, text, type = "text/plain") => { const a = el("a", { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); a.remove(); };
  const PERSONA = "P2600001";

  // ------------------------------------------------------------------ sign in
  function loginPage() {
    const box = $("#lbox"), u = C.me(), next = C.Q.get("next");
    const safeNext = next && /^[a-z0-9-]+\.html(\?[\w=&%.:-]*)?(#[\w-]*)?$/i.test(next) ? next : null;
    const dest = (x) => safeNext || (x.r === "s" ? "dashboard.html" : "staff.html");
    if (u) {
      box.append(el("h2", { text: "You are signed in" }), el("p", { class: "muted small", text: `${u.n} · ${C.roleName(u)} · ${u.id}` }),
        el("div", { class: "btns mt" }, el("a", { class: "btn", href: dest(u), text: "Continue" }), el("button", { class: "btn sec", onclick: () => { S.del("session"); location.reload(); }, text: "Sign in as someone else" })));
      return;
    }
    const id = el("input", { class: "input", id: "ix", autocomplete: "username", inputmode: "text", placeholder: "e.g. P2600001 or STF-T001", "aria-describedby": "lerr" });
    const pw = el("input", { class: "input", id: "pw", type: "password", autocomplete: "current-password", "aria-describedby": "lerr" });
    const show = el("button", { type: "button", class: "btn ghost sm", "aria-pressed": "false", text: "Show", onclick: () => { const on = pw.type === "password"; pw.type = on ? "text" : "password"; show.textContent = on ? "Hide" : "Show"; show.setAttribute("aria-pressed", String(on)); } });
    const err = el("div", { class: "lerr", id: "lerr", role: "alert" });
    let fails = 0;
    const form = el("form", { class: "stack", novalidate: true, onsubmit: (e) => {
      e.preventDefault(); err.textContent = "";
      if (!id.value.trim() || !pw.value) { err.textContent = "Enter your participant ID (or staff ID) and your password."; return; }
      const r = C.signIn(id.value, pw.value);
      if (!r.ok) { fails++; err.textContent = r.msg + (fails >= 3 ? " After several attempts, contact the helpdesk to reset your password." : ""); pw.select(); return; }
      location.href = dest(r.user);
    } },
      el("div", { class: "field" }, el("label", { for: "ix", text: "Participant ID or staff ID" }), id),
      el("div", { class: "field" }, el("label", { for: "pw", text: "Password" }), el("div", { class: "pwrow" }, pw, show)), err,
      el("button", { class: "btn block", type: "submit" }, icon("shield"), "Sign in"));
    const quick = (uid, label, sub) => el("button", { type: "button", class: "qbtn", onclick: () => { C.signInAs(uid); C.log(who(uid), "signin-demo"); location.href = dest(who(uid)); } }, el("b", { text: label }), el("span", { class: "tiny muted", text: sub }));
    const find = (f) => C.users.find(f);
    const t = C.tutorsFor("foa102").find((x) => x.r === "t"), dir = find((x) => x.r === "c" && x.prog === "foa"), alum = find((x) => x.r === "s" && !x.k && (x.alum || []).length);
    const soon = find((x) => x.r === "s" && x.k && C.offState((C.offering(x.k) || {}).o) === "upcoming"), spon = find((x) => x.r === "sc" && x.o === "gh-audit");
    const help = find((x) => x.r === "h"), adm = find((x) => x.r === "a"), auth = find((x) => x.r === "w");
    const featured = [[PERSONA, "Participant", "Adwoa Nyarko · Financial Oversight Academy, in progress"], alum && [alum.id, "Alumna or alumnus", `${alum.n} · read-only access and a certificate`],
      soon && [soon.id, "Participant, upcoming offering", `${soon.n} · ${soon.k}`], t && [t.id, "Facilitator", `${t.n} · runs the FOA102 live sessions`], dir && [dir.id, "Programme director", `${dir.n} · Financial Oversight Academy`],
      spon && [spon.id, "Sponsor liaison", `${spon.n} · ${C.orgName(spon.o)}`], auth && [auth.id, "Faculty author", auth.n], help && [help.id, "Helpdesk officer", help.n], adm && [adm.id, "Administrator", adm.n]].filter(Boolean);
    box.append(el("h2", { text: "Sign in" }), el("div", { class: "muted small", text: "Institute of Parliamentary Affairs Africa" }), el("div", { class: "mt" }, form),
      el("div", { class: "or", text: "or try a demo account (no password needed)" }),
      el("div", { class: "qgrid2", id: "demoaccts" }, ...featured.map(([id2, label, sub]) => quick(id2, label, sub))),
      el("div", { class: "btns between mt" }, el("button", { type: "button", class: "btn ghost sm", "data-toast": "In the live service a reset link is sent to your registered email. In this prototype the helpdesk can look up any account.", text: "Forgot password?" }),
        el("a", { class: "btn ghost sm", href: "help.html", text: "Need help?" })),
      el("div", { class: "login-warn", role: "note", text: "This is a prototype, not the official IPA Africa sign-in. Use only the demonstration accounts; never enter a real password here." }),
      el("div", { class: "lfoot" }, el("span", {}, icon("flag", "i sm"), " All people and accounts in this prototype are fictional; organisations are named only to illustrate."),
        el("span", { text: "Prototype: sign-in is checked in this browser only. Nothing is sent anywhere." })));
    setTimeout(() => id.focus(), 50);
  }

  // ------------------------------------------------------------------ programmes: search and offering status
  function offeringStatus() {
    $$("tr[data-start]").forEach((tr) => {
      const st = C.offState({ start: tr.dataset.start, end: tr.dataset.end }), pill = tr.querySelector(".ostat");
      if (pill) { pill.textContent = C.offLabel[st]; pill.className = "ostat pill " + (st === "progress" ? "ok" : st === "upcoming" ? "" : "grey"); }
      if (st !== "upcoming") { const b = tr.querySelector("button"); if (b) b.replaceWith(el("span", { class: "tiny muted", text: st === "progress" ? "Enrolment closed" : "Finished" })); }
    });
  }
  function programmesPage() {
    offeringStatus();
    const q = $("#q"); if (!q) return;
    const res = $("#results"), all = Object.values(C.D.courses);
    const run = () => {
      const v = q.value.trim().toLowerCase(); res.replaceChildren();
      if (v.length < 2) { res.style.display = "none"; return; }
      const hits = all.filter((c) => c.code.toLowerCase().includes(v) || c.title.toLowerCase().includes(v)).slice(0, 40);
      res.style.display = "flex";
      if (!hits.length) { res.append(el("div", { class: "pad small muted", text: `No courses match “${q.value}”.` })); return; }
      hits.forEach((c) => res.append(el("a", { href: "course-" + c.slug + ".html" }, el("span", { class: "cd", text: c.code }),
        el("span", { class: "tt" }, c.title, el("span", { class: "tiny muted", style: { display: "block" }, text: C.prog(c.subject).short })), icon("chev", "i go"))));
    };
    q.addEventListener("input", run);
    if (location.hash === "#search") setTimeout(() => q.focus(), 50);
  }

  // ------------------------------------------------------------------ dashboard
  const isoDay = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const midnight = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const hm = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dm = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const calDays = (t) => Math.round((midnight(t) - midnight(Date.now())) / DAY);
  // "Closes today, 23:59", "Closes tomorrow, 17:00", "Closes in 4 days"
  C.closesIn = (t) => { const n = calDays(t); return n <= 0 ? `Closes today, ${hm(t)}` : n === 1 ? `Closes tomorrow, ${hm(t)}` : `Closes in ${n} days`; };
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  // course card: white card, cover miniature, code chip, title, gold progress, footer with status and one action
  function courseCard(u, slug, retro, until) {
    const c = C.course(slug), p = C.progress(slug, u), off = C.offline(slug, u), pg = C.ud(u).get("pos", {})[slug];
    const status = retro ? (until ? `Read-only until ${C.fmt(until)}` : "Read-only") : (p || pg ? [p ? `${p}% read` : "", pg ? "p. " + pg : ""].filter(Boolean).join(" · ") : "Not started") + (off ? " · offline" : "");
    return el("a", { class: "card cc" + (retro ? " retro" : ""), href: retro ? `reader.html?c=${slug}` : `course-${slug}.html` },
      el("div", { class: "cch" }, C.mcover(c, retro ? "alum" : ""), el("div", { class: "cct" },
        el("div", { class: "chips" }, el("span", { class: "chip" + (retro ? " gold" : ""), text: c.code }), retro ? el("span", { class: "chip gold", text: "Alumni" }) : null), el("h3", { text: c.title }))),
      retro ? null : el("div", { class: "bar" }, el("i", { style: { width: Math.max(p, 2) + "%" } })),
      el("div", { class: "ccf" }, el("span", { text: status }), el("span", { class: "go" }, retro ? "Open book" : "Open course", icon("chev", "i sm"))));
  }
  // certificates: one per completed programme, with a code anyone can verify
  C.certCode = (uid, offId) => "IPA-" + offId.replace(/-/g, "") + "-" + (C.hashNum(uid + "|" + offId) % 1e6).toString().padStart(6, "0");
  C.certsOf = (u) => (C.enrol(u).alumni || []).map((a) => ({ P: a.P, o: a.o, code: C.certCode(u.id, a.o.id), issued: new Date(a.o.end + "T00:00:00").getTime() + 2 * DAY }));
  // what is coming up for a participant: live sessions, assessments and network meetings, each with a day for the week ribbon
  function comingUp(u, e) {
    const now = Date.now(), items = [];
    if (C.liveUpcomingFor) C.liveUpcomingFor(u).forEach((s) => {
      const live = C.liveState(s) === "open", code = C.course(s.course).code, prov = C.liveProviders[s.prov].name;
      items.push({ kind: live ? "live" : "routine", mark: "live", at: s.start, k: live ? `Live now · ${prov}` : `Live session · ${prov}`, t: s.title,
        s: live ? `${code} · ${hm(s.start)} to ${hm(s.start + s.dur * 60000)}` : `${code} · ${dm(s.start)}, ${hm(s.start)}`, href: "session.html?s=" + encodeURIComponent(s.id) });
    });
    // assessments: the same assessment in several courses with the same window is one row
    const ex = {};
    if (C.examList) C.examList(e.current).forEach((x) => {
      if ((S.get("examsubs:" + x.id, {})[u.id] || {}).status === "submitted") return;
      const st = C.examState(x); if (st === "closed") return;
      const key = [x.title, st, st === "open" ? x.closes : x.opens].join("|");
      (ex[key] = ex[key] || { x, st, list: [] }).list.push(x);
    });
    Object.values(ex).forEach(({ x, st, list }) => {
      const codes = list.map((y) => C.course(y.course).code), what = codes.length > 2 ? `${codes.slice(0, 2).join(", ")} and ${codes.length - 2} more` : codes.join(" and ");
      const href = list.length > 1 ? "exams.html" : st === "open" ? `exam.html?e=${encodeURIComponent(x.id)}` : "exams.html";
      if (st === "open") { const soon = calDays(x.closes) <= 7; items.push({ kind: soon ? "due" : "routine", mark: "due", at: x.closes, k: soon ? C.closesIn(x.closes) : "Assessment open", t: `${x.title}: ${what}`, s: `Closes ${dm(x.closes)}, ${hm(x.closes)}`, href }); }
      else items.push({ kind: "routine", mark: "other", at: x.opens, k: "Assessment", t: `${x.title}: ${what}`, s: `Opens ${dm(x.opens)}, ${hm(x.opens)}`, href });
    });
    if (C.groups) C.groups().filter((g) => g.members.includes(u.id)).forEach((g) => g.meetings.filter((m) => m.at > now).forEach((m) =>
      items.push({ kind: "routine", mark: "other", at: m.at, k: "Cohort network", t: m.title, s: `${hm(m.at)} · ${g.name}`, href: `group.html?g=${g.id}#meet` })));
    const rank = { live: 0, due: 1, routine: 2 };
    return items.sort((a, b) => rank[a.kind] - rank[b.kind] || a.at - b.at);
  }
  // the This week ribbon: Monday to Sunday, today marked, up to three markers a day (live, closes, other)
  function weekRibbon(items, pick) {
    const t0 = midnight(Date.now()), mon = t0 - ((new Date(t0).getDay() + 6) % 7) * DAY;
    const names = { live: "live session", due: "closing", other: "other" };
    return el("ol", { class: "week", "aria-label": "This week" }, ...Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon + i * DAY + 3600000), iso = isoDay(d), today = midnight(d) === t0, past = midnight(d) < t0;
      const marks = ["live", "due", "other"].filter((m) => items.some((x) => x.mark === m && isoDay(x.at) === iso));
      const long = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      return el("li", {}, el("button", { type: "button", class: "wday" + (today ? " today" : "") + (past ? " past" : ""), "aria-current": today ? "date" : null, "data-day": iso,
        "aria-label": `${long}${today ? " (today)" : ""}: ${marks.length ? marks.map((m) => names[m]).join(", ") : "nothing scheduled"}`, onclick: () => pick(iso, long) },
        el("span", { class: "wd", text: d.toLocaleDateString("en-GB", { weekday: "short" }) }), el("span", { class: "dn", text: d.getDate() }),
        el("span", { class: "wm", "aria-hidden": "true" }, ...marks.map((m) => el("i", { class: "m-" + m })))));
    }));
  }
  function dashboardPage() {
    const u = C.requireUser(), main = $("#main");
    if (C.isStaff(u)) { location.replace("staff.html"); return; }
    const e = C.enrol(u), ud = C.ud(u), pos = ud.get("pos", {}), prog = ud.get("prog", {});
    const first = u.n.split(" ")[0];
    const contOf = (list) => Object.keys(pos).filter((s) => list.includes(s)).sort((a, b) => (prog[b] || 0) - (prog[a] || 0))[0];
    const cont = contOf(e.current) || e.current[0] || contOf(e.retro);
    const until = e.alumni.filter((a) => Date.now() < a.until).map((a) => a.until)[0];
    // programme banner with the hemicycle: one seat per course
    const seats = e.current.length ? e.current : e.retro;
    const curSeat = e.current.includes(cont) ? cont : e.current.find((s) => (prog[s] || 0) < 95);
    const states = seats.map((s) => (!e.current.length ? "alum" : (prog[s] || 0) >= 95 ? "done" : s === curSeat ? "cur" : "todo"));
    const started = e.current.filter((s) => (prog[s] || 0) > 0 || pos[s]).length;
    let cap, sub;
    if (e.K) {
      const st = C.offState(e.K), s0 = new Date(e.K.start + "T00:00:00").getTime(), e0 = new Date(e.K.end + "T00:00:00").getTime();
      const weeks = Math.max(1, Math.ceil((e0 - s0 + DAY) / (7 * DAY))), wk = Math.min(weeks, Math.max(1, Math.floor((midnight(Date.now()) - s0) / (7 * DAY)) + 1));
      cap = st === "upcoming" ? `${seats.length} courses · starts ${C.fmtDay(e.K.start)}` : `${started} of ${seats.length} courses started · Week ${wk} of ${weeks}`;
      sub = [`${C.fmtDay(e.K.start)} to ${C.fmtDay(e.K.end)} · ${e.K.venue}. `, el("span", { class: "hide-ph", text: st === "upcoming" ? "Your online preparation is open now." : "Read online, download for offline study, or print a personal copy." })];
    } else { cap = seats.length ? `${seats.length} alumni courses · read-only until ${C.fmt(until)}` : "No courses at present"; sub = "Browse the calendar to join another programme; your alumni access continues below."; }
    const items = comingUp(u, e);
    const upList = el("div", { class: "uplist" + (items.length <= 6 ? " few6" : "") });
    const upCard = el("section", { class: "card pad upcard", id: "upcoming", "aria-labelledby": "uph" }, el("h2", { id: "uph", class: "h3", text: "Coming up" }), upList);
    const seeAll = el("button", { type: "button", class: "linkbtn seeall", "aria-expanded": "false", text: `See all (${items.length})`,
      onclick: () => { const on = upList.classList.toggle("all"); seeAll.setAttribute("aria-expanded", String(on)); seeAll.textContent = on ? "Show fewer" : `See all (${items.length})`; } });
    upList.append(...(items.length ? items.map((x, i) => el("a", { class: "uprow " + x.kind + (i >= 3 ? " m3" : "") + (i >= 6 ? " more" : ""), href: x.href, "data-day": isoDay(x.at) },
      el("div", { class: "d", "aria-hidden": "true" }, el("b", { text: new Date(x.at).getDate() }), el("small", { text: new Date(x.at).toLocaleDateString("en-GB", { month: "short" }).toUpperCase() })),
      el("div", { class: "ut" }, el("div", { class: "k", text: x.k }), el("b", { text: x.t }), el("div", { class: "muted small", text: x.s })))) : [el("p", { class: "small muted", text: "Nothing scheduled." })]));
    if (items.length > 3) upCard.append(seeAll);
    const pick = (iso, long) => {
      const rows = $$(`.uprow[data-day="${iso}"]`, upList);
      if (!rows.length) return C.say(`Nothing is scheduled on ${long}.`);
      if (rows.some((r) => getComputedStyle(r).display === "none")) { upList.classList.add("all"); seeAll.setAttribute("aria-expanded", "true"); seeAll.textContent = "Show fewer"; }
      upCard.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
      $$(".uprow.pick", upList).forEach((r) => r.classList.remove("pick"));
      rows.forEach((r) => { void r.offsetWidth; r.classList.add("pick"); });
      rows[0].focus({ preventScroll: true });
    };
    const hemi = C.hemicycle(states, e.current.length ? `Programme progress: ${cap}` : `Alumni courses: ${cap}`);
    const banner = el("section", { class: "card pbanner", "aria-label": "My programme" },
      el("div", { class: "pbtop" }, el("div", { class: "pbh" }, hemi),
        el("div", { class: "pbt" }, el("div", { class: "label", text: e.K ? `Programme · ${e.K.id}` : "Alumni access" }),
          el("h2", {}, e.P ? el("a", { href: `programme-${e.P.slug}.html`, text: e.P.name }) : "No current programme"),
          el("div", { class: "pbcap", text: cap }), el("div", { class: "small muted" }, sub),
          e.K ? null : el("a", { class: "small", href: "programmes.html#calendar", text: "Programmes and calendar" }))),
      el("div", { class: "weekwrap" }, el("div", { class: "label", text: "This week" }), weekRibbon(items, pick)));
    // Continue reading: the single deep-navy hero of the page
    let hero = null;
    if (cont) {
      const c = C.course(cont), p = C.progress(cont, u), pg = pos[cont];
      hero = el("a", { class: "dhero", href: `reader.html?c=${cont}` }, C.mcover(c, e.current.includes(cont) ? "" : "alum"),
        el("div", { class: "dht" }, el("div", { class: "ey", text: pg ? (p ? `Continue reading · ${p}% read` : "Continue reading") : "Start reading" }), el("div", { class: "h", text: `${c.code} ${c.title}` }),
          el("div", { class: "s", text: pg ? `Page ${pg}${e.current.includes(cont) ? "" : " · alumni access, read-only"}` : "Your first course book is ready: begin on page 1." }),
          el("div", { class: "bar" }, el("i", { style: { width: Math.max(p, 2) + "%" } }))),
        el("span", { class: "btn red" }, icon("book"), pg ? "Open book" : "Start reading"));
    }
    const dmain = el("div", { class: "dmain" });
    if (hero) dmain.append(hero);
    if (e.current.length) dmain.append(el("section", { class: "myprog" }, el("div", { class: "sech" }, el("h2", { text: "My programme" }), el("span", { class: "muted small", text: "Full access" })),
      el("div", { class: "grid g-courses" }, ...e.current.map((s) => courseCard(u, s)))));
    const alumni = el("section", { class: "alumni" + (e.retro.length ? "" : " none") });
    const accBody = el("div", { class: "accbody", id: "accbody" });
    if (e.retro.length) {
      const tog = el("button", { type: "button", class: "card acctog", "aria-expanded": "false", "aria-controls": "accbody", onclick: () => { const on = alumni.classList.toggle("open"); tog.setAttribute("aria-expanded", String(on)); } },
        el("span", { class: "chip gold", text: "Alumni" }), el("span", { class: "at" }, el("b", { text: "Alumni access" }), el("span", { class: "small muted", text: `${e.retro.length} courses · read-only until ${C.fmt(until)}` })), icon("chev", "i go"));
      accBody.append(el("div", { class: "grid g-courses" }, ...e.retro.map((s) => courseCard(u, s, true, until))));
      alumni.append(el("div", { class: "sech" }, el("h2", { text: "Alumni access" }), el("span", { class: "pill gold" }, icon("eye", "i sm"), "Read-only until " + C.fmt(until))), tog, accBody);
    } else alumni.append(el("div", { class: "sech" }, el("h2", { text: "Alumni access" }), el("span", { class: "muted small", text: "None yet: completed programmes appear here for twelve months." })));
    dmain.append(alumni);

    const side = el("aside", { class: "dside", "aria-label": "Coming up and more" }, upCard);
    const certs = C.certsOf(u);
    side.append(el("div", { class: "card pad sidecard" }, el("h3", {}, icon("check"), " Certificates"),
      el("p", { class: "small", text: certs.length ? `${certs.length} certificate${certs.length > 1 ? "s" : ""} · ${certs.reduce((a, c) => a + c.P.cpd, 0)} CPD hours` : "Your certificate appears here when you complete your programme." }),
      el("a", { class: "btn sec sm", href: "certificates.html", text: "My certificates" })));
    if (C.quizzesFor && e.current.length) {
      const qs = e.current.flatMap((s) => C.quizzesFor(s)), done = qs.filter((q) => C.quizStats(u, q.id).n);
      side.append(el("div", { class: "card pad sidecard" }, el("h3", {}, icon("quiz"), " Quizzes"), el("p", { class: "small", text: `${done.length} of ${qs.length} practice quizzes completed.` }), el("div", { class: "bar mt" }, el("i", { style: { width: (qs.length ? done.length / qs.length * 100 : 0) + "%" } })), el("a", { class: "btn sec sm mt", href: "quizzes.html", text: "Open quizzes" })));
    }
    if (C.groups) {
      const all = C.groups(), mine = all.filter((g) => g.members.includes(u.id)), inv = all.filter((g) => g.invites.includes(u.id));
      side.append(el("div", { class: "card pad sidecard" }, el("h3", {}, icon("users"), " Cohort networks"),
        inv.length ? el("div", { class: "banner flat mt" }, icon("bell"), el("div", { class: "small" }, el("b", { text: `${inv.length} invitation${inv.length > 1 ? "s" : ""}. ` }), el("a", { href: "groups.html", text: "View" }))) : null,
        ...mine.slice(0, 3).map((g) => el("a", { class: "grow-link", href: "group.html?g=" + g.id }, el("span", { class: "gav sm", text: g.name.split(" ").map((x) => x[0]).slice(0, 2).join("") }), el("span", { text: g.name }))),
        el("a", { class: "btn sec sm mt", href: "groups.html", text: mine.length ? "All my networks" : "Create or join a network" })));
    }
    if (e.current.length) side.append(el("div", { class: "card pad sidecard" }, el("h3", {}, icon("spark"), " AI study assistant"),
      el("p", { class: "small muted", text: "Explanations, summaries and practice from your course books and practice questions, with page references. Included in your programme." }),
      el("a", { class: "btn sec sm", href: "ai.html", text: "Open the assistant" })));
    const live = C.liveBar(u, "inline");
    main.append(el("div", { class: "crumb" }, "Dashboard"), el("h1", { text: `Welcome back, ${first}` }),
      el("div", { class: "muted" }, `${u.pos} · ${C.orgName(u.o)} · ${u.id}`),
      el("div", { class: "dash" }, banner, live, dmain, side));
  }

  // ------------------------------------------------------------------ course page (static shell enhanced here)
  function coursePage() {
    const slug = document.body.dataset.slug, c = C.course(slug), u = C.me(), acc = C.access(slug, u);
    const st = $("#cstatus");
    if (st) st.replaceChildren(el("span", { class: "pill " + (acc === "full" || acc === "staff" ? "ok" : acc === "retro" ? "" : "grey") }, icon(acc === "preview" ? "lock" : acc === "retro" ? "eye" : "check", "i sm"), u ? C.accessLabel[acc] : "Sign in for full access"));
    const p = C.progress(slug, u);
    const pb = $("#cprog"); if (pb) { pb.style.width = Math.max(p, 2) + "%"; $("#cprogt").textContent = u ? `${p}% read · bookmarks and notes are saved to your account` : "Sign in to track your reading"; }
    // hemicycle of the course's units: done, the unit being read, to come (read-only for alumni)
    const hmc = $("#chemi");
    if (hmc) {
      const starts = (hmc.dataset.units || "").split(",").map(Number).filter(Boolean), n = starts.length, pg = u ? C.ud(u).get("pos", {})[slug] || 0 : 0;
      const cur = pg ? starts.filter((x) => x <= pg).length || 1 : 0;
      const states = starts.map((_, i) => (acc === "retro" ? "alum" : !pg ? "todo" : i + 1 < cur ? "done" : i + 1 === cur ? "cur" : "todo"));
      const cap = acc === "retro" ? `${n} units · read-only` : pg ? `Unit ${cur} of ${n}${p ? ` · ${p}% read` : ""}` : `${n} units · not started`;
      hmc.replaceChildren(C.hemicycle(states, "Course progress: " + cap), el("div", { class: "hcap", text: cap }));
    }
    const ed = S.get("edition:" + slug, null); if (ed && $("#cedition")) $("#cedition").textContent = `Edition ${ed.n} · updated ${C.fmt(ed.at)}${ed.note ? ": " + ed.note : ""}`;
    const dl = $("#cdl");
    if (dl) {
      if (C.offline(slug, u)) { dl.replaceChildren(icon("check"), "Offline ready"); }
      dl.addEventListener("click", () => {
        if (acc !== "full" && acc !== "staff") return C.say(acc === "retro" ? "Not available during alumni access: read online only." : u ? "Downloading is for participants in this programme." : "Sign in to download.");
        const d = C.ud(u).get("dl", {}); d[slug] = Date.now(); C.ud(u).set("dl", d); C.log(u, "download", { c: slug }); dl.replaceChildren(icon("check"), "Offline ready"); C.say("Downloaded for offline reading, watermarked with your participant ID.");
      });
    }
    const pr = $("#cprint"); if (pr && acc !== "full" && acc !== "staff") { pr.classList.add("dis"); pr.addEventListener("click", (e) => { e.preventDefault(); C.say(acc === "retro" ? "Not available during alumni access." : "Printing is for participants in this programme."); }); }
    const rep = $("#creport"); if (rep) rep.addEventListener("click", async () => {
      if (!u) return C.say("Sign in to report an error.");
      const pg = el("input", { class: "input", type: "number", min: 1, "aria-label": "Page" }), tx = el("textarea", { class: "input ta", rows: 4, "aria-label": "What is wrong?" });
      const r = await C.modal({ title: "Report an error in the course book", body: el("div", { class: "stack" }, el("div", { class: "field" }, el("label", { text: "Page (if known)" }), pg), el("div", { class: "field" }, el("label", { text: "What is wrong?" }), tx)),
        actions: [{ label: "Cancel", cls: "ghost", id: null }, { label: "Send to the course team", value: () => (tx.value.trim() ? true : (C.say("Describe the error."), false)) }] });
      if (!r) return; const ref = "CB-" + (C.hashNum(slug + Date.now()) % 90000 + 10000);
      const all = S.get("errata", []); all.push({ ref, slug, by: u.id, page: +pg.value || null, text: tx.value.trim(), at: Date.now(), status: "open" }); S.set("errata", all); C.say("Thank you. Reference " + ref + ".");
    });
    const lv = $("#clive"); if (lv && u && C.liveCourseCard && (acc === "full" || acc === "retro" || acc === "staff")) lv.replaceWith(C.liveCourseCard(u, slug));
    const team = $("#cteam");
    if (team) { const ts = C.tutorsFor(slug); team.replaceChildren(...ts.slice(0, 3).map((t) => el("div", { class: "person" }, el("div", { class: "avatar", text: t.n.split(" ").map((x) => x[0]).join("").slice(0, 2) }), el("div", {}, el("b", { text: t.n }), el("div", { class: "muted small", text: C.roleName(t) + " · replies within 2 working days" }))))); }
    const disc = $("#cdisc");
    if (disc) {
      if (acc === "full" || acc === "retro" || acc === "staff") {
        const f = C.forum(slug).slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.posts[b.posts.length - 1].at - a.posts[a.posts.length - 1].at).slice(0, 4);
        disc.replaceChildren(...f.map((t) => el("a", { class: "trow sm", href: `forum.html?c=${slug}&t=${t.id}` }, el("div", { class: "tt" }, el("b", { text: t.title }), el("div", { class: "tiny muted", text: `${t.posts.length - 1} repl${t.posts.length === 2 ? "y" : "ies"} · ${C.ago(t.posts[t.posts.length - 1].at)}` })))));
      } else disc.replaceChildren(el("p", { class: "small muted", text: "Open to participants in the current cohort of this programme." }));
    }
    const ann = $("#cann");
    if (ann) { const a = S.get("announce:" + slug, []).slice(-3).reverse(); if (a.length) ann.replaceChildren(el("div", { class: "banner" }, icon("bell", "i lg"), el("div", { class: "small" }, ...a.map((x) => el("div", {}, el("b", { text: C.fmt(x.at) + ": " }), x.text, el("span", { class: "tiny muted", text: " · " + who(x.by).n })))))); }
    const ex = $("#cexams");
    if (ex && C.examList) { const xs = C.examList([slug]).filter((x) => C.examState(x) !== "closed"); ex.replaceChildren(...xs.map((x) => el("a", { class: "act", href: acc === "staff" ? `exam.html?e=${x.id}&preview=1` : acc === "full" ? (C.examState(x) === "open" ? `exam.html?e=${x.id}` : "exams.html") : "#" }, el("div", { class: "ic v" }, icon(acc === "staff" ? "eye" : "timer")), el("div", { class: "t" }, el("b", { text: (acc === "staff" ? "Preview: " : "") + x.title }), el("span", { text: `${x.dur} min · ${C.examState(x) === "open" ? "open until " + C.fmtTime(x.closes) : "opens " + C.fmtTime(x.opens)}` })), icon("chev", "i go")))); }
    $$("[data-quiz]").forEach((a) => { const q = C.quizById ? C.quizById(a.dataset.quiz) : null; const s = q && u ? C.quizStats(u, q.id) : null; if (s && s.n) a.querySelector(".t span").textContent = `Best score ${s.best}% · ${s.n} attempt${s.n > 1 ? "s" : ""}`; });
  }

  // ------------------------------------------------------------------ print copy (watermarked)
  function printPage() {
    const u = C.requireUser(), main = $("#main"), slug = C.Q.get("c"), id = C.Q.get("id");
    const rec = slug && (C.ud(u).get("prints", {})[slug] || []).find((x) => x.id === id);
    if (rec && !["full", "staff"].includes(C.access(slug, u))) { main.append(el("div", { class: "wrap" }, el("h1", { text: "Printing is not available" }), el("p", { text: "This course book is read-only for you now, so copies cannot be printed." }), el("a", { class: "btn", href: `reader.html?c=${slug}`, text: "Back to the book" }))); return; }
    if (!rec) { main.append(el("div", { class: "wrap" }, el("h1", { text: "Print copy not found" }), el("p", { text: "Create a print copy from the course book reader." }), el("a", { class: "btn", href: slug ? `reader.html?c=${slug}` : "dashboard.html", text: "Back" }))); return; }
    const c = C.course(slug), when = C.fmtTime(rec.at);
    main.append(el("div", { class: "printbar noprint" }, el("a", { class: "btn ghost sm", href: `reader.html?c=${slug}` }, icon("back"), "Back to the book"),
      el("div", { class: "small", text: `Copy ${rec.id} · Units ${rec.units.join(", ")} · watermarked for ${u.n} (${u.id})` }), el("button", { class: "btn sm", onclick: () => window.print() }, icon("print"), "Print now")));
    const host = el("div", { class: "pcopy" }); main.append(host);
    C.loadBook(slug).then((B) => {
      const blocks = {}; B.units.forEach((un) => un.blocks.forEach((b) => (blocks[b.id] = b)));
      B.pages.filter((P) => P.kind === "text" && rec.units.includes(P.unit)).forEach((P) => {
        const pg = el("section", { class: "ppage" }, el("div", { class: "wm", "aria-hidden": "true", text: `${u.n.toUpperCase()} · ${u.id} · PERSONAL STUDY COPY` }),
          el("div", { class: "ph2" }, el("span", { text: `${c.code} ${c.title}` }), el("span", { text: `Unit ${P.unit}` })));
        if (P.opener) pg.append(el("div", { class: "u", text: "UNIT " + P.unit }), el("h2", { text: B.units[P.unit - 1].title }));
        P.blocks.forEach((bid) => { const b = blocks[bid]; pg.append(b.t === "h" ? el("h3", { text: b.x }) : b.t === "ul" ? el("ul", {}, ...b.items.map((x) => el("li", { text: x }))) : el("p", { class: b.t === "callout" ? "callout" : "", text: b.x })); });
        pg.append(el("div", { class: "pf" }, el("span", { text: `${u.n} · ${u.id} · ${when} · copy ${rec.id}` }), el("span", { text: "p. " + P.n })));
        host.append(pg);
      });
      host.prepend(el("section", { class: "ppage cov" }, C.cover(c, "big"), el("p", { class: "small", text: `Personal study copy for ${u.n}, participant ID ${u.id}. Reproduction or sale is prohibited.` }), el("p", { class: "tiny muted", text: `Copy ID ${rec.id} · ${when} · recorded in the IPA Africa print log` })));
    });
  }

  // ------------------------------------------------------------------ certificates
  function certificatesPage() {
    const u = C.requireUser(), main = $("#main");
    main.append(el("div", { class: "crumb" }, el("a", { href: u.r === "s" ? "dashboard.html" : "staff.html", text: "Home" }), " / My certificates"), el("h1", { text: "My certificates" }),
      el("p", { class: "muted", text: "A certificate is issued when you complete a programme. It shows your CPD hours and a verification code that employers and sponsors can check." }));
    if (u.r !== "s") { main.append(el("p", { class: "small muted", text: "Certificates belong to participants. Staff can check any certificate on the verification page." }), el("a", { class: "btn sec", href: "verify.html", text: "Verify a certificate" })); return; }
    const certs = C.certsOf(u), e = C.enrol(u);
    if (!certs.length) main.append(el("div", { class: "card pad" }, el("p", { class: "small", text: e.K ? `Your certificate for ${e.P.short} will appear here when the programme ends on ${C.fmtDay(e.K.end)} and your assessments are complete.` : "No certificates yet." })));
    main.append(el("div", { class: "stack" }, ...certs.map((x) => el("div", { class: "card certcard" },
      el("div", { class: "cert" }, el("div", { class: "label", text: "Institute of Parliamentary Affairs Africa" }), el("div", { class: "cname", text: u.n }), el("div", { class: "small", text: "has completed" }),
        el("h2", { text: x.P.name }), el("div", { class: "small muted", text: `${x.o.id} · ${C.fmtDay(x.o.start)} to ${C.fmtDay(x.o.end)} · ${x.o.venue}` }),
        el("div", { class: "pills mt" }, el("span", { class: "pill ok", text: `${x.P.cpd} CPD hours` }), el("span", { class: "pill grey", text: x.P.cert })),
        el("div", { class: "tiny mt", text: `Verification code ${x.code} · issued ${C.fmt(x.issued)}` })),
      el("div", { class: "btns" }, el("a", { class: "btn sec sm", href: `verify.html?code=${encodeURIComponent(x.code)}` }, icon("check", "i sm"), "Open the verification page"),
        el("button", { class: "btn ghost sm", "data-toast": "In the live service this downloads the PDF certificate with the verification code and address." }, icon("dl", "i sm"), "Download PDF"))))));
  }
  function verifyPage() {
    const main = $("#main");
    const inp = el("input", { class: "input", placeholder: "e.g. IPA-DPP202606-123456", "aria-label": "Verification code", value: C.Q.get("code") || "" });
    const out = el("div", { class: "mt" });
    const check = () => {
      const code = inp.value.trim().toUpperCase(); out.replaceChildren(); if (!code) return;
      let hit = null;
      C.users.filter((x) => x.r === "s").some((x) => C.certsOf(x).some((c) => (c.code === code ? (hit = { x, c }) : false)));
      out.append(hit ? el("div", { class: "card pad", style: { borderTop: "4px solid var(--ok)" } }, el("div", { class: "pill ok" }, icon("check", "i sm"), "Valid certificate"),
        el("h2", { class: "mt", text: hit.x.n }), el("p", { text: `completed ${hit.c.P.name} (${hit.c.o.id}), ${C.fmtDay(hit.c.o.start)} to ${C.fmtDay(hit.c.o.end)}, with ${hit.c.P.cpd} CPD hours.` }),
        el("p", { class: "tiny muted", text: "This page shows only what the certificate itself shows. It does not reveal marks or any other personal data." }))
        : el("div", { class: "banner warn" }, icon("flag", "i lg"), el("div", { class: "small", text: "No certificate has this code. Check the code, or contact the IPA Africa programme office." })));
    };
    main.append(el("div", { class: "crumb" }, el("a", { href: "index.html", text: "Home" }), " / Verify a certificate"), el("h1", { text: "Verify a certificate" }),
      el("p", { class: "muted", text: "Employers, sponsors and universities can check that an IPA Africa certificate is genuine. Enter the code printed on the certificate." }),
      el("div", { class: "toolbar" }, inp, el("button", { class: "btn", onclick: check }, icon("check"), "Check")), out);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
    if (inp.value) check();
  }

  // ------------------------------------------------------------------ staff home
  function staffPage() {
    const u = C.requireUser(), main = $("#main");
    if (!C.isStaff(u)) { location.replace("dashboard.html"); return; }
    main.append(el("div", { class: "crumb" }, "Staff home"), el("h1", { text: `Welcome, ${u.n.split(" ")[0]}` }), el("div", { class: "muted", text: `${C.roleName(u)} · ${u.id}${u.o ? " · " + C.orgName(u.o) : ""}${u.prog ? " · " + C.prog(u.prog).name : ""}` }));
    if (u.r === "t" || u.r === "c") tutorView(u, main);
    if (u.r === "w") main.append(el("div", { class: "sech" }, el("h2", { text: "My course books" })),
      el("p", { class: "small muted", text: "As a faculty author you prepare new editions. In the Moodle version you edit a draft edition and submit it for quality review; the programme director then publishes it and participants are notified." }),
      el("div", { class: "clist" }, ...u.cs.map((s) => el("a", { href: `reader.html?c=${s}` }, el("span", { class: "cd", text: C.course(s).code }), el("span", { class: "tt", text: C.course(s).title }), icon("chev", "i go")))));
    if (u.r === "sc") sponsorView(u, main);
    if (u.r === "h") helpdeskView(u, main);
    if (u.r === "a") { main.append(el("div", { class: "tiles mt" }, tile("Participants", C.users.filter((x) => x.r === "s").length, "demo accounts"), tile("Staff", C.users.filter((x) => x.r !== "s").length, "facilitators, directors, liaisons, support"), tile("Course books", Object.keys(C.D.courses).length), tile("Countries", new Set(C.users.filter((x) => x.r === "s").map((x) => x.ct)).size)),
      el("div", { class: "btns mt" }, el("a", { class: "btn", href: "admin.html" }, icon("chart"), "Reports and user directory"), el("a", { class: "btn sec", href: "exams.html" }, icon("clock"), "Assessments"))); helpdeskView(u, main); }
  }
  function tutorView(u, main) {
    const cs = u.cs;
    const flagged = [];
    cs.forEach((s) => (S.get("forum:" + s, []) || []).forEach((t) => t.posts.forEach((p) => { if (p.flags && p.flags.length && !p.hidden) flagged.push({ s, t, p }); })));
    const rows = cs.map((s) => { const c = C.course(s), r = C.roster(s).length, ed = S.get("edition:" + s, null);
      return el("tr", {}, el("td", {}, el("a", { href: `course-${s}.html` }, el("b", { text: c.code })), el("div", { class: "small", text: c.title })), el("td", { class: "n", text: r }), el("td", { class: "n", text: ed ? ed.n : 1 }),
        el("td", {}, el("div", { class: "btns" }, el("a", { class: "btn sec sm", href: `forum.html?c=${s}` }, icon("chat", "i sm"), "Forum"), el("a", { class: "btn sec sm", href: `exams.html?c=${s}` }, icon("clock", "i sm"), "Assessments"),
          el("a", { class: "btn ghost sm", href: `quizzes.html?c=${s}` }, "Quizzes"), el("button", { class: "btn ghost sm", onclick: () => announce(u, s) }, icon("bell", "i sm"), "Announce"),
          u.r === "c" ? el("button", { class: "btn ghost sm", onclick: () => publishEdition(u, s) }, icon("upload", "i sm"), "New edition") : null))); });
    main.append(el("div", { class: "tiles mt" }, tile("My courses", cs.length), tile("Participants", new Set(cs.flatMap((s) => C.roster(s).map((x) => x.id))).size, "current and forthcoming cohorts"), tile("Reported posts", flagged.length, "waiting for you"), tile("Error reports", S.get("errata", []).filter((x) => cs.includes(x.slug) && x.status === "open").length, "on course books")));
    main.append(el("div", { class: "sech", id: "moderation" }, el("h2", { text: "Moderation" })), flagged.length ? el("div", { class: "stack" }, ...flagged.map(({ s, t, p }) => el("div", { class: "card pad" },
      el("div", { class: "small muted", text: `${C.course(s).code} · ${t.title} · ${who(p.by).n} · ${C.fmtTime(p.at)}` }), el("p", { text: p.text }), el("div", { class: "pills" }, ...p.flags.map((f) => el("span", { class: "pill red", text: f.reason }))),
      el("div", { class: "btns mt" }, el("a", { class: "btn sec sm", href: `forum.html?c=${s}&t=${t.id}#${p.id}`, text: "Open thread" }),
        el("button", { class: "btn sm red", onclick: () => modPost(s, t.id, p.id, "hide"), text: "Hide post" }), el("button", { class: "btn ghost sm", onclick: () => modPost(s, t.id, p.id, "dismiss"), text: "Dismiss reports" })))))
      : el("p", { class: "small muted", text: "No reported posts. Participants can report posts from any discussion." }));
    const errs = S.get("errata", []).filter((x) => cs.includes(x.slug));
    if (errs.length) main.append(el("div", { class: "sech" }, el("h2", { text: "Course-book error reports" })), el("div", { class: "stack" }, ...errs.map((x) => el("div", { class: "card pad" }, el("div", { class: "small muted", text: `${x.ref} · ${C.course(x.slug).code}${x.page ? " · p. " + x.page : ""} · ${who(x.by).n} · ${C.fmtTime(x.at)}` }), el("p", { text: x.text }),
      el("div", { class: "btns" }, x.page ? el("a", { class: "btn sec sm", href: `reader.html?c=${x.slug}&p=${x.page}`, text: "Open page" }) : null, x.status === "open" ? el("button", { class: "btn sm", onclick: () => { const a = S.get("errata", []); a.find((y) => y.ref === x.ref).status = "fixed"; S.set("errata", a); location.reload(); }, text: "Mark as fixed" }) : el("span", { class: "pill ok", text: "Fixed" }))))));
    main.append(el("div", { class: "sech" }, el("h2", { text: "My courses" })), el("div", { class: "tablewrap card" }, el("table", { class: "t" }, el("tr", {}, ...["Course", "Participants", "Edition", ""].map((h, i) => el("th", { class: i === 1 || i === 2 ? "n" : null, text: h }))), ...rows)));
    if (C.liveUpcomingFor) {
      const ls = C.liveUpcomingFor(u, 21);
      main.append(el("div", { class: "sech" }, el("h2", { text: "Live sessions" }), el("a", { class: "btn sec sm", href: "live.html", text: "All live sessions" })),
        ls.length ? el("div", { class: "clist card" }, ...ls.map((s) => el("a", { href: "session.html?s=" + encodeURIComponent(s.id) }, el("span", { class: "cd", text: C.course(s.course).code }),
          el("span", { class: "tt", text: `${s.title} · ${C.fmtTime(s.start)} · ${C.liveProviders[s.prov].name}${C.liveState(s) === "open" ? " · open now" : ""}` }), icon("chev", "i go"))))
          : el("p", { class: "small muted", text: "No live sessions scheduled in the next three weeks. Schedule one from a course's Live sessions page." }));
    }
  }
  function modPost(s, tid, pid, what) {
    const f = S.get("forum:" + s, []), t = f.find((x) => x.id === tid), p = t && t.posts.find((x) => x.id === pid); if (!p) return;
    if (what === "hide") p.hidden = true; p.flags = []; S.set("forum:" + s, f); C.say(what === "hide" ? "Post hidden." : "Reports dismissed."); setTimeout(() => location.reload(), 400);
  }
  async function announce(u, s) {
    const tx = el("textarea", { class: "input ta", rows: 3, "aria-label": "Announcement" });
    const r = await C.modal({ title: "Announcement to " + C.course(s).code, body: el("div", { class: "stack" }, el("p", { class: "small muted", text: `Sent to the ${C.roster(s).length} participants as a notification.` }), tx), actions: [{ label: "Cancel", cls: "ghost", id: null }, { label: "Send", value: () => tx.value.trim() || (C.say("Write the announcement."), false) }] });
    if (!r) return; const a = S.get("announce:" + s, []); a.push({ id: C.uid("a"), by: u.id, text: r, at: Date.now() }); S.set("announce:" + s, a); C.say("Announcement sent.");
  }
  async function publishEdition(u, s) {
    const cur = S.get("edition:" + s, null), n = (cur ? cur.n : 1) + 1;
    const tx = el("input", { class: "input", placeholder: "e.g. Updated for the 2027 budget cycle", "aria-label": "What changed" });
    const r = await C.modal({ title: `Publish edition ${n} of ${C.course(s).code}`, body: el("div", { class: "stack" }, el("p", { class: "small", text: "Participants see the new edition at once. Their bookmarks, highlights and notes are kept; any on changed pages are flagged for them to check." }), el("div", { class: "field" }, el("label", { text: "What changed" }), tx)),
      actions: [{ label: "Cancel", cls: "ghost", id: null }, { label: "Publish", value: () => tx.value.trim() || "Corrections" }] });
    if (!r) return; S.set("edition:" + s, { n, at: Date.now(), note: r, by: u.id }); C.say(`Edition ${n} published. Participants are notified.`); setTimeout(() => location.reload(), 500);
  }
  // sponsor liaison: enrolment, completion and certificates of the organisation's nominees; never notes, discussions or marks
  function sponsorView(u, main) {
    const st = C.users.filter((x) => x.r === "s" && x.o === u.o);
    const cur = st.filter((x) => C.enrol(x).current.length), certs = st.flatMap((x) => C.certsOf(x).map((c) => ({ x, c })));
    main.append(el("div", { class: "banner flat mt" }, icon("shield", "i lg"), el("div", { class: "small", text: "As a sponsor you see your nominees' enrolment, completion and certificates. Notes, discussions, cohort-network content and individual marks stay private to participants." })),
      el("div", { class: "tiles mt" }, tile("Nominees", st.length), tile("In a programme now", cur.length), tile("Certificates", certs.length), tile("CPD hours earned", certs.reduce((a, y) => a + y.c.P.cpd, 0))),
      el("div", { class: "sech" }, el("h2", { text: "Nominees" }), el("button", { class: "btn sec sm", "data-toast": "In the live service this opens the nomination form, with an invoice to your organisation." }, icon("plus", "i sm"), "Nominate participants")),
      el("div", { class: "tablewrap card" }, el("table", { class: "t" }, el("tr", {}, ...["Participant", "Position", "Current programme", "Status", "Certificates"].map((h) => el("th", { text: h }))),
        ...st.map((x) => { const e = C.enrol(x); return el("tr", {}, el("td", {}, el("b", { text: x.n }), el("div", { class: "tiny muted", text: x.id })), el("td", { text: x.pos }), el("td", { text: e.P ? `${e.P.short} (${e.K.id})` : "–" }),
          el("td", {}, e.K ? el("span", { class: "pill " + (C.offState(e.K) === "progress" ? "ok" : ""), text: C.offLabel[C.offState(e.K)] }) : el("span", { class: "pill grey", text: "Alumnus" })),
          el("td", { text: C.certsOf(x).map((c) => c.P.short).join(", ") || "–" })); }))));
  }
  function helpdeskView(u, main) {
    const q = el("input", { class: "input", type: "search", placeholder: "Participant ID, staff ID or name", "aria-label": "Look up an account" });
    const out = el("div", { class: "stack" });
    main.append(el("div", { class: "sech" }, el("h2", { text: "Account lookup" })), el("div", { class: "toolbar" }, q), out);
    q.addEventListener("input", () => {
      const v = q.value.trim().toLowerCase(); out.replaceChildren(); if (v.length < 3) return;
      C.users.filter((x) => x.id.toLowerCase().includes(v) || x.n.toLowerCase().includes(v)).slice(0, 8).forEach((x) => out.append(accountCard(x)));
    });
    const tickets = S.get("tickets", []);
    main.append(el("div", { class: "sech" }, el("h2", { text: "Helpdesk tickets" }), el("span", { class: "small muted", text: tickets.filter((t) => t.status === "open").length + " open" })),
      tickets.length ? el("div", { class: "stack" }, ...tickets.slice().reverse().map((t) => el("div", { class: "card pad" }, el("div", { class: "small muted", text: `${t.ref} · ${who(t.by).n} (${t.by}) · ${t.topic} · ${C.fmtTime(t.at)}` }), el("p", { text: t.text }),
        t.reply ? el("p", { class: "small" }, el("b", { text: "Reply: " }), t.reply) : null,
        t.status === "open" ? el("button", { class: "btn sm", onclick: async () => { const tx = el("textarea", { class: "input ta", rows: 3 }); const r = await C.modal({ title: "Reply and resolve " + t.ref, body: tx, actions: [{ label: "Cancel", cls: "ghost", id: null }, { label: "Send reply", value: () => tx.value.trim() || false }] }); if (!r) return; const all = S.get("tickets", []); const x = all.find((y) => y.ref === t.ref); x.reply = r; x.status = "resolved"; x.by2 = u.id; S.set("tickets", all); location.reload(); } }, "Reply and resolve") : el("span", { class: "pill ok", text: "Resolved" }))))
        : el("p", { class: "small muted", text: "No tickets yet. Participants open tickets from the Help page." }));
  }
  function accountCard(x) {
    const e = C.enrol(x), ud = C.ud(x), prints = Object.values(ud.get("prints", {})).reduce((a, b) => a + b.length, 0);
    const last = S.get("activity", []).filter((a) => a.id === x.id).slice(-1)[0];
    return el("div", { class: "card pad" }, el("div", { class: "btns between" }, el("div", {}, el("h3", { text: x.n }), el("div", { class: "small muted", text: `${x.id} · ${C.roleName(x)}${x.o ? " · " + C.orgName(x.o) : ""}` })),
      el("div", { class: "btns" }, el("button", { class: "btn sec sm", "data-toast": "In the live service this sends a password-reset link to the participant's registered email.", text: "Send reset link" }),
        el("button", { class: "btn ghost sm", onclick: async () => { if (await C.confirm("Clear this account’s reading data?", "Removes bookmarks, highlights, notes, quiz attempts, downloads and AI chats stored on this device for " + x.n + ". The print record is kept.", "Clear", "red")) { ud.resetReading(); C.say("Cleared."); } }, text: "Clear reading data" }))),
      x.r === "s" ? el("div", { class: "small mt" }, el("div", { text: e.P ? `${e.P.name} · ${e.K.id} (${C.offLabel[C.offState(e.K)].toLowerCase()})` : "No current programme" }),
        el("div", { text: `Current courses: ${e.current.map((s) => C.course(s).code).join(", ") || "none"}` }), el("div", { text: `Alumni courses: ${e.retro.map((s) => C.course(s).code).join(", ") || "none"}` }),
        el("div", { text: `Prints: ${prints} · certificates: ${C.certsOf(x).length} · last activity: ${last ? last.what + ", " + C.ago(last.at) : "none on this device"}` })) : el("div", { class: "small mt", text: x.cs ? `Courses: ${x.cs.map((s) => C.course(s).code).join(", ")}` : "" }));
  }
  function directory(list, per = 50) {
    const q = el("input", { class: "input", type: "search", placeholder: "Filter by name, ID, programme, organisation or country", "aria-label": "Filter" });
    const tb = el("tbody"), more = el("button", { class: "btn sec sm", text: "Show more" });
    let n = per;
    const prog = (x) => (x.p ? C.prog(x.p).short : x.cs ? x.cs.length + " courses" : x.r === "s" ? "Alumnus" : "–");
    const draw = () => {
      const v = q.value.trim().toLowerCase();
      const rows = list.filter((x) => !v || x.id.toLowerCase().includes(v) || x.n.toLowerCase().includes(v) || prog(x).toLowerCase().includes(v) || C.roleName(x).toLowerCase().includes(v) || (x.o && C.orgName(x.o).toLowerCase().includes(v)));
      tb.replaceChildren(...rows.slice(0, n).map((x) => el("tr", {}, el("td", {}, el("b", { text: x.n }), el("div", { class: "tiny muted", text: x.id })), el("td", { text: C.roleName(x) }), el("td", { text: prog(x) }), el("td", { text: x.o ? C.orgName(x.o) : "–" }))));
      more.hidden = rows.length <= n; more.textContent = `Show more (${rows.length - n} left)`;
    };
    q.addEventListener("input", () => { n = per; draw(); }); more.addEventListener("click", () => { n += per; draw(); }); draw();
    return el("div", { class: "stack" }, q, el("div", { class: "tablewrap card" }, el("table", { class: "t" }, el("thead", {}, el("tr", {}, ...["Name", "Role", "Programme", "Organisation"].map((h) => el("th", { text: h })))), tb)), more);
  }

  // ------------------------------------------------------------------ reports (administrators, helpdesk, programme directors, sponsors)
  function adminPage() {
    const u = C.requireUser(), main = $("#main");
    if (!["a", "h", "sc", "c"].includes(u.r)) { main.append(el("h1", { text: "Reports" }), el("p", { text: "Reports are available to administrators, programme directors, sponsor liaisons and the helpdesk." })); return; }
    const all = C.users.filter((x) => x.r === "s"), st = u.r === "sc" ? all.filter((x) => x.o === u.o) : all, act = S.get("activity", []), plog = S.get("printlog", []);
    const count = (k) => act.filter((a) => a.what === k).length;
    const offers = C.D.programmes.flatMap((P) => P.offerings.map((o) => ({ P, o, n: all.filter((x) => x.k === o.id).length })));
    main.append(el("div", { class: "crumb" }, el("a", { href: "staff.html", text: "Staff home" }), " / Reports"), el("h1", { text: u.r === "sc" ? `Reports for ${C.orgName(u.o)}` : "Learning operations" }),
      el("p", { class: "muted small", text: "Programmes and offerings follow the IPA Africa strategy. Accounts are fictional demo users; activity figures are what has happened in this browser." }),
      el("div", { class: "tiles mt" }, tile("Programmes", C.D.programmes.length), tile("Offerings", offers.length, "scheduled"), tile("Participants", st.length, "demo accounts"), tile("Countries", new Set(st.map((x) => x.ct)).size)),
      el("div", { class: "tiles mt" }, tile("Sign-ins", count("signin") + count("signin-demo"), "on this device"), tile("Downloads", count("download")), tile("Quiz attempts", count("quiz")), tile("AI questions", count("ai"))));
    const byC = [...new Set(st.map((x) => x.ct))].map((cc) => [C.country(cc), st.filter((x) => x.ct === cc).length]).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...byC.map((x) => x[1]));
    main.append(el("div", { class: "two" }, el("div", { class: "card pad" }, el("h2", { text: "Participants by country" }),
      ...byC.map(([n, k]) => el("div", { class: "hrow" }, el("span", { text: n }), el("span", { class: "hb", style: { width: Math.max(4, k / mx * 240) + "px" } }), el("b", { text: k })))),
      el("div", { class: "card pad" }, el("h2", { text: "Enrolment by offering" }), ...offers.filter((x) => x.n || C.offState(x.o) !== "completed").map((x) => el("div", { class: "hrow" }, el("a", { href: `programme-${x.P.slug}.html`, text: `${x.o.id}` }),
        el("span", { class: "hb", style: { width: Math.max(4, x.n / x.o.seats * 200) + "px" } }), el("b", { text: `${x.n}/${x.o.seats}` }))))));
    main.append(el("div", { class: "sech" }, el("h2", { text: "Print log" }), el("span", { class: "small muted", text: plog.length + " copies" })),
      plog.length ? el("div", { class: "tablewrap card" }, el("table", { class: "t" }, el("tr", {}, ...["Copy ID", "Participant", "Course", "Units", "When"].map((h) => el("th", { text: h }))), ...plog.slice().reverse().map((p) => el("tr", {}, el("td", { text: p.id }), el("td", { text: `${who(p.user).n} · ${p.user}` }), el("td", { text: C.course(p.c).code }), el("td", { text: p.units.join(", ") }), el("td", { text: C.fmtTime(p.at) })))))
        : el("p", { class: "small muted", text: "No copies printed on this device yet." }));
    main.append(el("div", { class: "sech" }, el("h2", { text: "Recent activity" })), act.length ? el("div", { class: "tablewrap card" }, el("table", { class: "t" }, el("tr", {}, ...["When", "Account", "Action", "Detail"].map((h) => el("th", { text: h }))), ...act.slice(-25).reverse().map((a) => el("tr", {}, el("td", { text: C.fmtTime(a.at) }), el("td", { text: `${who(a.id).n} · ${a.id}` }), el("td", { text: a.what }), el("td", { text: a.c ? C.course(a.c)?.code || "" : a.q || a.e || "" })))))
      : el("p", { class: "small muted", text: "No activity yet." }));
    if (u.r === "a" || u.r === "h") main.append(el("div", { class: "sech" }, el("h2", { text: "User directory" }), el("button", { class: "btn sec sm", onclick: () => download("ipa-demo-users.csv", ["id,name,role,programme,offering,organisation,country"].concat(C.users.map((x) => [x.id, x.n, C.roleName(x), x.p ? C.prog(x.p).short : "", x.k || "", x.o ? C.org(x.o)[1] : "", x.ct ? C.country(x.ct) : ""].map(csvCell).join(","))).join("\n"), "text/csv") }, icon("dl"), "Export CSV (no passwords)")), directory(C.users));
  }

  // ------------------------------------------------------------------ profile
  function profilePage() {
    const u = C.requireUser(), main = $("#main"), ud = C.ud(u), prefs = ud.get("readerPrefs", { view: "scroll", size: 1, dark: false });
    const e = C.enrol(u);
    const view = el("select", { class: "input", "aria-label": "Default reading view" }, el("option", { value: "scroll", text: "Scroll view" }), el("option", { value: "flip", text: "Flip-book view" })); view.value = prefs.view;
    view.addEventListener("change", () => { prefs.view = view.value; ud.set("readerPrefs", prefs); C.say("Saved."); });
    const all = ud.all(), notes = Object.keys(all).filter((k) => k.startsWith("notes:")).reduce((a, k) => a + all[k].length, 0), bms = Object.keys(all).filter((k) => k.startsWith("bm:")).reduce((a, k) => a + all[k].length, 0), hls = Object.keys(all).filter((k) => k.startsWith("hl:")).reduce((a, k) => a + all[k].length, 0);
    main.append(el("div", { class: "crumb" }, el("a", { href: u.r === "s" ? "dashboard.html" : "staff.html", text: "Home" }), " / My profile"), el("h1", { text: "My profile and settings" }),
      el("div", { class: "two" }, el("div", { class: "stack" },
        el("div", { class: "card pad" }, el("div", { class: "gtop" }, el("div", { class: "avatar lg", text: u.n.split(" ").map((x) => x[0]).join("").slice(0, 2) }), el("div", {}, el("h2", { text: u.n }), el("div", { class: "small muted", text: `${C.roleName(u)} · ${u.id}` }))),
          u.r === "s" ? el("dl", { class: "dl mt" }, el("dt", { text: "Position" }), el("dd", { text: u.pos }), el("dt", { text: "Organisation" }), el("dd", { text: C.orgName(u.o) }),
            el("dt", { text: "Programme" }), el("dd", { text: e.P ? `${e.P.name} (${e.K.id})` : "None at present" }), el("dt", { text: "Completed" }), el("dd", { text: e.alumni.map((a) => `${a.P.short} (${a.o.id})`).join(", ") || "None yet" }),
            el("dt", { text: "Sponsor" }), el("dd", { text: C.orgName(u.o) + " (sees enrolment, completion and certificates only)" })) : null),
        el("div", { class: "card pad" }, el("h3", { text: "Reading" }), el("div", { class: "field mt" }, el("label", { text: "Default reading view" }), view),
          el("p", { class: "small muted mt", text: `You have ${bms} bookmarks, ${hls} highlights and ${notes} notes across your course books.` })),
        el("div", { class: "card pad" }, el("h3", { text: "Demo data on this device" }), el("p", { class: "small muted", text: "Everything in this prototype is stored in this browser only. Use these buttons to start a demonstration afresh." }),
          el("div", { class: "btns mt" }, el("button", { class: "btn sec", onclick: async () => { if (await C.confirm("Reset my data?", "Removes your bookmarks, highlights, notes, quiz attempts, practice answers, downloads, reading positions and AI chats on this device. Your print record is kept.", "Reset", "red")) { ud.resetReading(); C.say("Your data were reset."); setTimeout(() => location.reload(), 500); } } }, "Reset my data"),
            el("button", { class: "btn ghost red-t", onclick: async () => { if (await C.confirm("Reset the whole demo?", "Removes all users’ data on this device: forums, networks, assessments, announcements and activity. You will be signed out.", "Reset everything", "red")) { S.keys("").forEach((k) => S.del(k)); location.href = "login.html"; } } }, "Reset the whole demo")))),
        el("aside", { class: "stack" }, el("div", { class: "card pad" }, el("h3", { text: "Privacy" }), el("p", { class: "small muted", text: "In the live service, study data stay on IPA Africa's own server, and AI requests go through that server. Your name and participant ID appear on downloaded and printed copies. Your sponsor sees only enrolment, completion and certificates." })),
          el("button", { class: "btn sec", onclick: () => C.signOut() }, icon("back"), "Sign out"))));
  }

  // ------------------------------------------------------------------ help
  function helpPage() {
    const u = C.me();
    const btn = $("#ticket"); if (!btn) return;
    btn.removeAttribute("data-toast");
    btn.addEventListener("click", async () => {
      if (!u) return C.say("Sign in to open a ticket, or call the helpdesk.");
      const topic = el("select", { class: "input", "aria-label": "Topic" }, ...["Cannot see my programme", "Course book will not open or download", "Printing", "Password or sign-in", "Assessment", "Certificate or CPD hours", "Invoice or payment", "Other"].map((x) => el("option", { text: x })));
      const tx = el("textarea", { class: "input ta", rows: 4, "aria-label": "Describe the problem" });
      const r = await C.modal({ title: "Open a helpdesk ticket", body: el("div", { class: "stack" }, el("div", { class: "field" }, el("label", { text: "Topic" }), topic), el("div", { class: "field" }, el("label", { text: "What happened?" }), tx)),
        actions: [{ label: "Cancel", cls: "ghost", id: null }, { label: "Open ticket", value: () => tx.value.trim() || (C.say("Describe the problem."), false) }] });
      if (!r) return; const ref = "HD-" + (C.hashNum(u.id + Date.now()) % 90000 + 10000);
      const all = S.get("tickets", []); all.push({ ref, by: u.id, topic: topic.value, text: r, at: Date.now(), status: "open" }); S.set("tickets", all); C.say("Ticket opened. Reference " + ref + "."); drawMine();
    });
    const mine = $("#mytickets");
    const drawMine = () => { if (!mine || !u) return; const t = S.get("tickets", []).filter((x) => x.by === u.id); mine.replaceChildren(...(t.length ? [el("h3", { text: "My tickets" }), ...t.slice().reverse().map((x) => el("div", { class: "small mt" }, el("b", { text: `${x.ref} · ${x.topic} · ` }), el("span", { class: "pill " + (x.status === "open" ? "" : "ok"), text: x.status }), x.reply ? el("div", { class: "muted", text: "Reply: " + x.reply }) : null))] : [])); };
    drawMine();
  }

  // ------------------------------------------------------------------ overview page: signed-in hint
  function indexPage() {
    const u = C.me(), h = $("#who"); if (!h || !u) return;
    const home = u.r === "s" ? "dashboard.html" : "staff.html";
    h.replaceChildren(el("div", { class: "banner flat" }, icon("user", "i lg"), el("div", { class: "small" }, "Signed in as ", el("b", { text: u.n }), ` (${C.roleName(u)}). `, el("a", { href: home, text: "Go to your home page" }))));
    // once signed in, the hero's "Sign in" button leads home instead
    $$('a.btn.red[href="login.html"]').forEach((b) => { b.setAttribute("href", home); b.replaceChildren(u.r === "s" ? "Go to my dashboard " : "Go to staff home ", icon("chev")); });
  }

  C.ready(() => {
    const p = C.page;
    try {
      if (p === "login") loginPage(); else if (p === "programmes") programmesPage(); else if (p === "programme") offeringStatus(); else if (p === "dashboard") dashboardPage(); else if (p === "course") coursePage();
      else if (p === "print") printPage(); else if (p === "staff") staffPage(); else if (p === "admin") adminPage(); else if (p === "profile") profilePage(); else if (p === "help") helpPage(); else if (p === "index") indexPage();
      else if (p === "certificates") certificatesPage(); else if (p === "verify") verifyPage();
    } catch (e) { if (e.message !== "redirect") throw e; }
  });
})();
