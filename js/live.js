// IPA Africa Learning prototype: live sessions (online classes) and a simulated virtual classroom.
// Same rules as the Moodle plugin local_ipalive: a session belongs to one course and one offering; facilitators choose the
// provider (Google Meet, Microsoft Teams, Zoom, BigBlueButton or any link); participants join through the platform, which
// records attendance; a check-in code confirms presence; recordings stay for the offering's participants and alumni.
// Everything is stored in this browser; the classroom is a simulation (no camera, microphone or network is used).
(function () {
  "use strict";
  const C = window.C, S = C.store, el = C.el, icon = C.icon, $ = C.$;
  const MIN = 60000, HOUR = 3600000, DAY = 86400000;
  const JOIN_BEFORE = 15, JOIN_AFTER = 15, CHECKIN_MIN = 10, THRESHOLD = 75, KEEP_DAYS = 365;
  const PROVIDERS = {
    meet: { name: "Google Meet", example: "https://meet.google.com/abc-defg-hij", re: /^https:\/\/meet\.google\.com\/[a-z]{3,4}-[a-z]{4}-[a-z]{3,4}(\?\S*)?$/i },
    teams: { name: "Microsoft Teams", example: "https://teams.microsoft.com/l/meetup-join/…", re: /^https:\/\/teams\.(microsoft|live)\.com\/\S+$/i },
    zoom: { name: "Zoom", example: "https://us02web.zoom.us/j/81234567890", re: /^https:\/\/([a-z0-9-]+\.)*zoom\.us\/(j|my|w|wc)\/\S+$/i },
    bbb: { name: "BigBlueButton", off: true },
    link: { name: "Other meeting link", example: "https://…", re: /^https:\/\/[^\s<>"]+$/i },
  };
  C.liveProviders = PROVIDERS;
  const day0 = (iso) => new Date(iso + "T00:00:00").getTime();
  const at = (days, h, m = 0) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.getTime(); };
  const who = (id) => C.userById[String(id).toLowerCase()];
  // replaceChildren would write "null" for an empty slot: leave empty slots out
  const fill = (node, ...kids) => node.replaceChildren(...kids.flat().filter((k) => k != null && k !== false));

  // ------------------------------------------------------------------ sessions: the demo's own, plus those made in this browser
  function seeds() {
    const out = [];
    const now = Date.now();
    for (const P of C.D.programmes) {
      for (const o of P.offerings) {
        if (C.offState(o) !== "progress") continue;
        P.courses.forEach((slug, i) => {
          const c = C.course(slug), by = (C.tutorsFor(slug)[0] || {}).id || null, h = C.hashNum(slug);
          const base = { course: slug, off: o.id, by, record: true, used: false, rec: false, status: "scheduled" };
          if (slug === "foa102") {
            out.push({ ...base, id: "ls-foa102-1", title: "Welcome and programme overview", desc: "Introductions, how the programme works, and the residential weeks.", prov: "meet", link: "https://meet.google.com/ipa-foaw-elc", start: at(-12, 10), dur: 90, rec: true },
              { ...base, id: "ls-foa102-2", title: "Unit 1: reading the Auditor-General's report", desc: "Bring the latest audit report of your country.", prov: "meet", link: "https://meet.google.com/ipa-foau-one", start: at(-5, 10), dur: 90, used: true, rec: true },
              { ...base, id: "ls-foa102-3", title: "Unit 2: the audit opinion and what it means for the committee", desc: "Read Unit 2 first. We will work through a qualified and an adverse opinion.", prov: "meet", link: "https://meet.google.com/ipa-foau-two", start: Math.floor(now / (5 * MIN)) * 5 * MIN - 10 * MIN, dur: 90 },
              { ...base, id: "ls-foa102-4", title: "Unit 3 discussion: following up recommendations", desc: "A committee simulation in breakout rooms.", prov: "zoom", link: "https://us02web.zoom.us/j/81234567890", start: at(7, 10), dur: 90 },
              { ...base, id: "ls-foa102-5", title: "Guest session: a Public Accounts Committee chair", desc: "Questions from participants to an experienced chair, under the Chatham House rule (not recorded).", prov: "teams", link: "https://teams.microsoft.com/l/meetup-join/ipa-demo-foa102-guest", start: at(14, 14), dur: 60, record: false });
          } else {
            const prov = ["meet", "zoom", "teams"][h % 3];
            out.push({ ...base, id: `ls-${slug}-1`, title: `${c.code}: introduction and Unit 1`, desc: "An overview of the course and the first unit.", prov: "meet", link: "https://meet.google.com/ipa-intr-ono", start: at(-4 - (i % 3), 14), dur: 60, rec: true },
              { ...base, id: `ls-${slug}-2`, title: `${c.code}: Units 2 and 3 in practice`, desc: "Examples from African parliaments and your questions.", prov, link: PROVIDERS[prov].example.replace("…", "ipa-demo-" + slug), start: at(3 + (h % 8), 14), dur: 90 });
          }
        });
      }
    }
    // the persona's alumni course: a past session whose recording alumni can still watch
    const dpp = C.offering("DPP-2026-06");
    if (dpp) out.push({ id: "ls-dpp101-1", course: "dpp101", off: "DPP-2026-06", by: (C.tutorsFor("dpp101")[0] || {}).id || null, title: "Data protection impact assessments in practice",
      desc: "A worked example from a Ghanaian public body.", prov: "meet", link: "https://meet.google.com/ipa-dppd-pia", start: new Date(dpp.o.start + "T14:00:00").getTime() + DAY, dur: 90, record: true, rec: true, used: false, status: "scheduled" });
    return out;
  }
  let _all = null;
  C.liveAll = () => {
    if (_all) return _all;
    const mine = S.get("live:sessions", {});
    const list = seeds().map((s) => ({ ...s, ...(mine[s.id] || {}) }));
    Object.values(mine).filter((s) => s.created && !list.some((x) => x.id === s.id)).forEach((s) => list.push(s));
    return (_all = list.sort((a, b) => a.start - b.start));
  };
  C.liveGet = (id) => C.liveAll().find((s) => s.id === id) || null;
  function saveSession(s) {
    const mine = S.get("live:sessions", {});
    mine[s.id] = { ...(mine[s.id] || {}), ...s };
    S.set("live:sessions", mine); _all = null;
  }
  C.liveState = (s, now = Date.now()) => s.status === "cancelled" ? "cancelled" : now < s.start - JOIN_BEFORE * MIN ? "upcoming" : now <= s.start + (s.dur + JOIN_AFTER) * MIN ? "open" : "ended";
  const STATE = { upcoming: ["Scheduled", ""], open: ["Open now", "ok"], ended: ["Ended", "dark"], cancelled: ["Cancelled", "red"] };

  // who may do what
  const inOffering = (u, s) => u && u.r === "s" && (u.k === s.off || (u.alum || []).some(([, k]) => k === s.off));
  C.liveCanManage = (u, s) => u && (u.r === "a" || ((u.r === "t" || u.r === "c") && (u.cs || []).includes(s.course)));
  C.liveCanAttend = (u, s) => inOffering(u, s) && u.k === s.off;
  const alumniUntil = (s) => { const x = C.offering(s.off); return x ? C.alumniUntil(x.o) : 0; };
  C.liveCanWatch = (u, s) => s.rec && s.status !== "cancelled" && (C.liveCanManage(u, s) || (inOffering(u, s) && Date.now() <= Math.min(alumniUntil(s), s.start + KEEP_DAYS * DAY)));
  C.liveFor = (u) => C.liveAll().filter((s) => inOffering(u, s) || C.liveCanManage(u, s));
  const participantsOf = (off) => C.users.filter((x) => x.r === "s" && (x.k === off || (x.alum || []).some(([, k]) => k === off)));

  // ------------------------------------------------------------------ attendance
  function attendance(s) {
    const stored = S.get("liveatt:" + s.id, null);
    if (stored) return stored;
    const a = {};
    if (C.liveState(s) === "ended" || s.id === "ls-foa102-3") {
      participantsOf(s.off).forEach((x) => {
        const here = x.id === "P2600001" ? C.liveState(s) === "ended" : C.hashNum(x.id + s.id) % 10 < (C.liveState(s) === "ended" ? 8 : 6);
        if (!here) return;
        const join = s.start + ((C.hashNum(s.id + x.id) % 9) - 3) * MIN;
        const checked = s.used && (x.id === "P2600001" || C.hashNum("c" + x.id + s.id) % 6 > 0);
        a[x.id] = { joins: 1, first: join, checked: checked ? s.start + 25 * MIN : 0, mark: "" };
      });
    }
    return a;
  }
  const setAttendance = (s, a) => S.set("liveatt:" + s.id, a);
  C.liveStatus = (s, r) => {
    if (r && r.mark) return r.mark;
    if (!r) return "absent";
    if (r.checked) return "present";
    return !s.used && r.joins > 0 ? "present" : "absent";
  };
  C.liveRate = (u, off) => {
    const held = C.liveAll().filter((s) => s.off === off && s.status !== "cancelled" && C.liveState(s) === "ended");
    let present = 0, count = held.length;
    held.forEach((s) => { const st = C.liveStatus(s, attendance(s)[u.id]); if (st === "present") present++; else if (st === "excused") count--; });
    return { present, held: count, pct: count ? Math.round(present * 100 / count) : null };
  };
  function join(u, s) {
    const a = attendance(s), r = a[u.id] || { joins: 0, first: 0, checked: 0, mark: "" };
    r.joins++; r.first = r.first || Date.now(); a[u.id] = r; setAttendance(s, a);
  }

  // ------------------------------------------------------------------ shared bits
  const when = (s) => `${new Date(s.start).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${new Date(s.start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  const badge = (st) => el("span", { class: "lbadge " + STATE[st][1], text: STATE[st][0] });
  const crumb = (...parts) => el("div", { class: "crumb" }, el("a", { href: "dashboard.html", text: "Home" }), ...parts.flatMap((p) => [" / ", p]));
  function recordNotice(s) {
    return C.modal({ title: "This session is recorded", body: el("div", {}, el("p", { text: `The recording is shown only to the participants and alumni of ${s.off}, and is removed after ${KEEP_DAYS} days.` }),
      el("p", { class: "small muted", text: "You can switch off your camera if you prefer not to appear." })), actions: [{ label: "Cancel", cls: "ghost", id: false }, { label: "Join the session", id: true }] });
  }
  async function enterRoom(u, s) {
    if (s.record && !C.liveCanManage(u, s) && !(await recordNotice(s))) return;
    if (!C.liveCanManage(u, s)) join(u, s);
    location.href = "liveroom.html?s=" + encodeURIComponent(s.id);
  }

  // ------------------------------------------------------------------ list: all my sessions, or one course's
  function listPage() {
    const u = C.requireUser(), main = $("#main"), slug = C.Q.get("c");
    const c = slug ? C.course(slug) : null;
    let list = C.liveFor(u);
    if (c) list = list.filter((s) => s.course === slug);
    const manageable = c ? C.liveCanManage(u, { course: slug }) : false;
    main.append(c ? crumb(el("a", { href: `course-${slug}.html`, text: c.code }), "Live sessions") : crumb("Live sessions"),
      el("div", { class: "btns between" }, el("h1", { text: c ? `Live sessions · ${c.code}` : "Live sessions" }),
        manageable ? el("button", { class: "btn", type: "button", onclick: () => scheduleModal(u, slug) }, icon("plus"), "Schedule a live session") : null),
      el("p", { class: "muted", text: "Online classes with your facilitators on Google Meet, Microsoft Teams, Zoom or BigBlueButton. Join through the platform: the Join button opens 15 minutes before the start and records your attendance." }));
    if (!list.length) { main.append(el("p", { class: "muted", text: u.r === "s" ? "No live sessions for your offering yet. They appear here, on your Dashboard and in your notifications when your facilitator schedules them." : "No live sessions in your courses yet." })); return; }
    const grp = { open: [], upcoming: [], ended: [], cancelled: [] };
    list.forEach((s) => grp[C.liveState(s)].push(s));
    grp.ended.reverse();
    const row = (s) => {
      const st = C.liveState(s), c2 = C.course(s.course), mine = u.r === "s" ? C.liveStatus(s, attendance(s)[u.id]) : null;
      return el("div", { class: "lrow" + (st === "open" ? " hot" : "") },
        el("div", { class: "ld" }, el("b", { text: new Date(s.start).getDate() }), el("small", { text: new Date(s.start).toLocaleDateString("en-GB", { month: "short" }).toUpperCase() })),
        el("div", { class: "lt" }, el("a", { href: "session.html?s=" + encodeURIComponent(s.id) }, el("b", { text: s.title })),
          el("div", { class: "small muted", text: `${c2.code} · ${s.off} · ${PROVIDERS[s.prov].name} · ${new Date(s.start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, ${s.dur} min` }),
          el("div", { class: "pills", style: { marginTop: "6px" } }, badge(st), st === "ended" && mine ? el("span", { class: "lbadge " + (mine === "present" ? "ok" : mine === "excused" ? "" : "warn"), text: mine[0].toUpperCase() + mine.slice(1) }) : null,
            s.record && st !== "ended" ? el("span", { class: "lbadge", text: "Recorded" }) : null)),
        el("div", { class: "la" }, st === "open" && (C.liveCanAttend(u, s) || C.liveCanManage(u, s)) ? el("button", { class: "btn ok sm", type: "button", onclick: () => enterRoom(u, s) }, icon("video"), C.liveCanManage(u, s) ? "Start or join" : "Join") : null,
          C.liveCanWatch(u, s) ? el("a", { class: "btn sec sm", href: `liveroom.html?s=${encodeURIComponent(s.id)}&rec=1` }, icon("video"), "Recording") : null,
          el("a", { class: "btn ghost sm", href: "session.html?s=" + encodeURIComponent(s.id), text: C.liveCanManage(u, s) ? "Manage" : "Details" })));
    };
    [["open", "Open now"], ["upcoming", "Coming up"], ["ended", "Past sessions"], ["cancelled", "Cancelled"]].forEach(([k, t]) => {
      if (grp[k].length) main.append(el("h2", { class: "mt", text: t }), el("div", { class: "card lcard" }, ...grp[k].map(row)));
    });
    if (u.r === "s") {
      const offs = [...new Set(list.map((s) => s.off))];
      offs.forEach((off) => { const r = C.liveRate(u, off); if (r.held) main.append(el("p", { class: "small mt", text: `Your attendance in ${off}: ${r.present} of ${r.held} sessions (${r.pct}%). Certificates need ${THRESHOLD}%.` })); });
    }
    main.append(el("p", { class: "small muted mt", text: "Prototype: meeting links are illustrative; the classroom is a simulation. On the live platform the Join button opens the provider's own meeting." }));
  }

  // ------------------------------------------------------------------ schedule or change a session (facilitators)
  function scheduleModal(u, slug, s = null) {
    const c = C.course(slug), P = C.prog(c.subject);
    const offs = P.offerings.filter((o) => ["progress", "upcoming"].includes(C.offState(o)));
    if (!offs.length) return C.say("No offering of this programme is running or coming up.");
    const title = el("input", { class: "input", id: "lt-title", value: s ? s.title : "", placeholder: "Unit 2: reading the audit opinion" });
    const off = el("select", { class: "input", id: "lt-off" }, ...offs.map((o) => el("option", { value: o.id, selected: s ? s.off === o.id : C.offState(o) === "progress", text: `${o.id} · ${C.fmtDay(o.start)} to ${C.fmtDay(o.end)} (${C.offLabel[C.offState(o)]})` })));
    let prov = s ? s.prov : "meet";
    const link = el("input", { class: "input", id: "lt-link", type: "url", value: s ? s.link : "", placeholder: PROVIDERS[prov].example });
    const cards = el("div", { class: "lprov" }, ...Object.entries(PROVIDERS).map(([k, p]) => p.off
      ? el("div", { class: "lpc off", title: "The administrator enters IPA Africa's BigBlueButton server address and secret to make it available." }, el("b", { text: p.name }), el("span", { class: "tiny muted", text: "Not available yet: the administrator completes its set-up." }))
      : el("label", { class: "lpc" + (k === prov ? " on" : "") }, el("input", { type: "radio", name: "lprov", value: k, checked: k === prov, onchange: () => { prov = k; link.placeholder = p.example; cards.querySelectorAll(".lpc").forEach((x) => x.classList.toggle("on", !!x.querySelector("input:checked"))); } }),
        el("b", { text: p.name }), el("span", { class: "tiny muted", text: k === "link" ? "Paste a secure meeting link from any service." : `Create the meeting in ${p.name} and paste its link.` }))));
    const d0 = s ? new Date(s.start) : new Date(at(3, 10));
    const pad = (n) => String(n).padStart(2, "0");
    const date = el("input", { class: "input", id: "lt-date", type: "date", value: `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}` });
    const time = el("input", { class: "input", id: "lt-time", type: "time", value: `${pad(d0.getHours())}:${pad(d0.getMinutes())}` });
    const dur = el("select", { class: "input", id: "lt-dur" }, ...[30, 45, 60, 90, 120, 180].map((m) => el("option", { value: m, selected: (s ? s.dur : 90) === m, text: m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? "s" : ""}` })));
    const desc = el("textarea", { class: "input", rows: 2, id: "lt-desc" }, s ? s.desc : "");
    const rec = el("input", { type: "checkbox", id: "lt-rec", checked: s ? s.record : true });
    const f = (label, input, help) => el("div", { class: "field" }, el("label", { for: input.id || null, text: label }), input, help ? el("div", { class: "tiny muted", text: help }) : null);
    C.modal({ title: s ? "Change the live session" : "Schedule a live session", wide: true,
      body: el("div", { class: "stack" }, f("Title", title), f("For the participants of", off), el("div", { class: "field" }, el("div", { class: "flabel", text: "Meeting provider" }), cards),
        f("Meeting link", link, "Participants never see this link directly: they join through the platform, which records their attendance. On the live platform, providers the administrator has connected create the meeting automatically."),
        el("div", { class: "grid g3" }, f("Date", date), f("Start time", time), f("Length", dur)), f("What it covers", desc),
        el("label", { class: "chk" }, rec, " Record this session (participants are told before they join; kept for the offering's participants and alumni)")),
      actions: [{ label: "Cancel", cls: "ghost", id: null }, { label: s ? "Save changes" : "Schedule the session", value: () => {
        if (!title.value.trim()) return C.say("Give the session a title."), false;
        if (!PROVIDERS[prov].re.test(link.value.trim())) return C.say(`This is not a ${PROVIDERS[prov].name} meeting link (for example ${PROVIDERS[prov].example}).`), false;
        const start = new Date(`${date.value}T${time.value}:00`).getTime();
        if (!start) return C.say("Choose the date and start time."), false;
        const rec2 = { id: s ? s.id : C.uid("ls"), course: slug, off: off.value, by: u.id, title: title.value.trim(), desc: desc.value.trim(), prov, link: link.value.trim(), start, dur: +dur.value,
          record: rec.checked, rec: s ? s.rec : false, used: s ? s.used : false, status: "scheduled", created: s ? s.created : Date.now() };
        saveSession(rec2); return rec2.id;
      } }] }).then((id) => { if (id) { C.say(s ? "Session changed." : "Session scheduled. Participants see it on their Dashboard."); setTimeout(() => (location.href = "session.html?s=" + encodeURIComponent(id)), 500); } });
  }

  // ------------------------------------------------------------------ one session
  function sessionPage() {
    const u = C.requireUser(), main = $("#main"), s = C.liveGet(C.Q.get("s") || "");
    if (!s) { main.append(el("h1", { text: "Session not found" }), el("a", { class: "btn", href: "live.html", text: "Live sessions" })); return; }
    const c = C.course(s.course), manage = C.liveCanManage(u, s), attend = C.liveCanAttend(u, s);
    if (!manage && !inOffering(u, s)) { main.append(el("h1", { text: s.title }), el("p", { text: `This session is for the participants of ${s.off}.` })); return; }
    const st = C.liveState(s);
    main.append(crumb(el("a", { href: `course-${s.course}.html`, text: c.code }), el("a", { href: `live.html?c=${s.course}`, text: "Live sessions" }), s.title),
      el("div", { class: "card pad lhead" }, el("div", { class: "label", text: `Live session · ${s.off}` }), el("h1", { text: s.title }),
        el("div", { class: "muted" }, `${when(s)} · ${s.dur} minutes · ${PROVIDERS[s.prov].name} `, badge(st)), s.desc ? el("p", { class: "mt", text: s.desc }) : null));
    if (s.record && (st === "upcoming" || st === "open")) main.append(el("div", { class: "banner mt" }, icon("video", "i lg"), el("div", {}, el("b", { text: "This session is recorded. " }), `The recording is shown only to the participants and alumni of ${s.off} and is removed after ${KEEP_DAYS} days. Switch off your camera if you prefer not to appear.`)));
    const acts = el("div", { class: "btns mt" });
    if (st === "open" && (attend || manage)) acts.append(el("button", { class: "btn ok", id: "ljoin", type: "button", onclick: () => enterRoom(u, s) }, icon("video"), manage ? "Start or join as host" : "Join the session"));
    else if (st === "upcoming" && (attend || manage)) acts.append(el("span", { class: "muted small", text: `The Join button appears here ${JOIN_BEFORE} minutes before the start.` }));
    if (C.liveCanWatch(u, s)) acts.append(el("a", { class: "btn sec", href: `liveroom.html?s=${encodeURIComponent(s.id)}&rec=1` }, icon("video"), "Watch the recording"));
    main.append(acts);
    // participant: check-in and own attendance
    const a = attendance(s), mine = a[u.id];
    if (attend && !manage) {
      const open = s.checkin && Date.now() <= s.checkin.until;
      if (mine && mine.checked) main.append(el("div", { class: "banner ok mt", text: `You checked in at ${new Date(mine.checked).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.` }));
      else if (open) main.append(checkinForm(u, s, () => location.reload()));
      if (st === "ended") main.append(el("p", { class: "mt", text: `Your attendance: ${C.liveStatus(s, mine)}.` }));
    }
    if (!manage) return;
    // facilitator tools
    main.append(el("div", { class: "btns mt" }, st !== "cancelled" ? el("button", { class: "btn sec", type: "button", text: "Change", onclick: () => scheduleModal(u, s.course, s) }) : null,
      st !== "cancelled" ? el("button", { class: "btn ghost red-t", type: "button", text: "Cancel the session", onclick: async () => { if (await C.confirm("Cancel this session?", "Participants will see it as cancelled. Attendance already recorded is kept.", "Cancel the session", "red")) { saveSession({ id: s.id, status: "cancelled", checkin: null }); location.reload(); } } }) : null));
    if (st === "cancelled") return;
    const ci = el("div", { class: "card pad mt" }, el("h2", { text: "Check-in" }));
    const open = s.checkin && Date.now() <= s.checkin.until;
    if (open) ci.append(el("div", { class: "lcode" }, el("div", { class: "tiny muted", text: "Show this code in the meeting" }), el("b", { id: "lcode", text: s.checkin.code }), el("div", { class: "tiny", text: `Open until ${new Date(s.checkin.until).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` })),
      el("button", { class: "btn ghost sm", type: "button", text: "Close check-in", onclick: () => { saveSession({ id: s.id, checkin: null }); location.reload(); } }));
    else ci.append(el("p", { class: "small muted", text: s.used ? "Check-in was used for this session: participants who did not check in count as absent unless you mark them." : "Optional. Open a check-in during the session to confirm who is really there; without it, joining through the platform counts as present." }),
      el("button", { class: "btn", id: "lopen", type: "button", text: s.used ? "Open a new check-in code" : `Open check-in (${CHECKIN_MIN} minutes)`, onclick: () => { openCheckin(s); location.reload(); } }));
    main.append(ci);
    // register
    const people = participantsOf(s.off).filter((x) => x.k === s.off || st === "ended");
    const present = people.filter((x) => C.liveStatus(s, a[x.id]) === "present").length;
    const tb = el("tbody");
    people.sort((x, y) => x.n.split(" ").pop().localeCompare(y.n.split(" ").pop())).forEach((x) => {
      const r = a[x.id], stx = C.liveStatus(s, r);
      const sel = el("select", { class: "input sm", "aria-label": "Mark for " + x.n, onchange: () => { const aa = attendance(s); aa[x.id] = { joins: 0, first: 0, checked: 0, ...(aa[x.id] || {}), mark: sel.value }; setAttendance(s, aa); C.say("Register saved."); } },
        ...[["", "Automatic"], ["present", "Present"], ["absent", "Absent"], ["excused", "Excused"]].map(([v, t]) => el("option", { value: v, selected: (r && r.mark || "") === v, text: t })));
      tb.append(el("tr", {}, el("td", {}, el("b", { text: x.n }), el("div", { class: "tiny muted", text: x.id })), el("td", { text: r && r.first ? new Date(r.first).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + (r.joins > 1 ? ` (${r.joins}×)` : "") : "–" }),
        el("td", { text: r && r.checked ? new Date(r.checked).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "–" }), el("td", {}, el("span", { class: "lbadge " + (stx === "present" ? "ok" : stx === "excused" ? "" : "warn"), text: stx[0].toUpperCase() + stx.slice(1) })), el("td", {}, sel)));
    });
    const csv = () => {
      const rows = [["Participant", "ID", "Joined", "Checked in", "Attendance"]].concat(people.map((x) => { const r = a[x.id]; return [x.n, x.id, r && r.first ? new Date(r.first).toISOString() : "", r && r.checked ? new Date(r.checked).toISOString() : "", C.liveStatus(s, r)]; }));
      const blob = new Blob(["﻿" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n")], { type: "text/csv" });
      const link = el("a", { href: URL.createObjectURL(blob), download: `attendance-${s.off}-${new Date(s.start).toISOString().slice(0, 10)}.csv` }); document.body.append(link); link.click(); link.remove();
    };
    main.append(el("div", { class: "card pad mt" }, el("div", { class: "btns between" }, el("h2", { id: "lreg", text: `Attendance register: ${present} of ${people.length} present` }), el("button", { class: "btn sec sm", type: "button", onclick: csv }, icon("dl"), "Download (CSV)")),
      el("div", { class: "tablewrap" }, el("table", { class: "t" }, el("thead", {}, el("tr", {}, ...["Participant", "Joined", "Checked in", "Attendance", "Mark"].map((h) => el("th", { text: h })))), tb))));
    const recl = el("input", { class: "input", type: "url", placeholder: "https://… (sharing link of the recording)", value: s.recLink || "" });
    main.append(el("div", { class: "card pad mt" }, el("h2", { text: "Recording" }), el("p", { class: "small muted", text: "Added automatically when the provider has it (Google Meet, Zoom, BigBlueButton), or paste the sharing link (for example from OneDrive for Teams)." }),
      el("div", { class: "pwrow" }, recl, el("button", { class: "btn sec", type: "button", text: "Save", onclick: () => { saveSession({ id: s.id, rec: !!recl.value.trim() || s.rec, recLink: recl.value.trim() }); C.say("Recording link saved."); } }))));
  }
  function openCheckin(s) {
    const chars = "ACDEFHJKMNPRTUVWXY34679";
    let code = ""; for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    saveSession({ id: s.id, checkin: { code, until: Date.now() + CHECKIN_MIN * MIN }, used: true });
    return code;
  }
  function checkinForm(u, s, done) {
    const input = el("input", { class: "input lcin", id: "lcin", maxlength: 6, autocomplete: "off", "aria-label": "Check-in code" });
    const msg = el("div", { class: "lerr", role: "alert" });
    return el("form", { class: "card pad mt", onsubmit: (e) => {
      e.preventDefault(); const cur = C.liveGet(s.id);
      if (!cur.checkin || Date.now() > cur.checkin.until) { msg.textContent = "Check-in is not open."; return; }
      if (input.value.replace(/\s+/g, "").toUpperCase() !== cur.checkin.code) { msg.textContent = "That code is not right: check it on the facilitator's screen."; return; }
      const a = attendance(cur); a[u.id] = { joins: 0, first: Date.now(), mark: "", ...(a[u.id] || {}), checked: Date.now() }; setAttendance(cur, a);
      C.say("Checked in. Thank you."); done();
    } }, el("label", { for: "lcin", class: "flabel", text: "Check-in code" }), el("div", { class: "pwrow" }, input, el("button", { class: "btn", type: "submit", text: "Check in" })),
      el("div", { class: "tiny muted", text: "Enter the code your facilitator is showing in the meeting." }), msg);
  }

  // ------------------------------------------------------------------ the simulated classroom (and the recording player)
  async function roomPage() {
    const u = C.requireUser(), s = C.liveGet(C.Q.get("s") || ""), rec = C.Q.get("rec") === "1";
    const root = $("#room");
    if (!s || (!C.liveCanManage(u, s) && !(rec ? C.liveCanWatch(u, s) : C.liveCanAttend(u, s) && C.liveState(s) === "open"))) {
      root.append(el("div", { class: "lroom-msg" }, el("h1", { text: rec ? "Recording not available" : "This session is not open" }), el("a", { class: "btn", href: s ? "session.html?s=" + encodeURIComponent(s.id) : "live.html", text: "Back" }))); return;
    }
    const host = C.liveCanManage(u, s), c = C.course(s.course), fac = who(s.by) || { n: "Facilitator", id: "STF" };
    let book = null; try { book = await C.loadBook(s.course); } catch (e) { book = null; }
    // slides from the course book: title, then each unit with its section headings
    const slides = [{ k: "title", t: s.title, sub: `${c.code} ${c.title} · ${s.off}` }];
    if (book) book.units.forEach((un) => slides.push({ k: "unit", t: `Unit ${un.n}: ${un.title}`, pts: un.blocks.filter((b) => b.t === "h").map((b) => b.x).slice(0, 5) }));
    slides.push({ k: "q", t: "Questions and discussion", pts: ["What does this mean for your committee?", "Which step is hardest in your parliament?", "What will you do differently next week?"] });
    const slideKey = "live:slide:" + s.id;
    let n = Math.min(S.get(slideKey, rec ? 0 : 2), slides.length - 1);
    // people in the room
    const pool = participantsOf(s.off).filter((x) => x.k === s.off && x.id !== u.id);
    const inroom = pool.filter((x) => C.hashNum(x.id + s.id) % 10 < 6).slice(0, 18);
    const me = { id: u.id, n: u.n + " (you)" };
    const ppl = rec ? [{ id: fac.id, n: fac.n, host: true }] : [fac.id === u.id ? null : { id: fac.id, n: fac.n, host: true }, me, ...inroom].filter(Boolean);
    const hands = new Set(rec ? [] : inroom.slice(2, 3).map((x) => x.id));
    let mic = false, cam = false, low = false, hand = false;
    const chatKey = "livechat:" + s.id;
    const seedChat = [[fac.id, fac.n, "Welcome, everyone. We start in two minutes; please read the first section of Unit 2 if you have not yet."],
      [(inroom[0] || fac).id, (inroom[0] || fac).n, "Good morning from Nairobi."], [(inroom[1] || fac).id, (inroom[1] || fac).n, "Good morning. Will the slides be shared after the session?"],
      [fac.id, fac.n, "Yes: the recording and the slides will be on the session page within a day."]];
    const chat = () => S.get(chatKey, seedChat.map(([id, nm, t], i) => ({ id, n: nm, t, at: s.start + i * MIN })));
    const ini = (nm) => nm.replace(" (you)", "").split(" ").map((x) => x[0]).slice(0, 2).join("");
    // layout
    const timer = el("span", { class: "ltimer" });
    const top = el("div", { class: "lrtop" }, el("a", { class: "lrback", href: "session.html?s=" + encodeURIComponent(s.id), "aria-label": "Back to the session page" }, icon("back", "i lg")),
      el("div", { class: "lrtitle" }, el("b", { text: s.title }), el("span", { text: `${c.code} · ${s.off} · ${rec ? "Recording" : "Simulated " + PROVIDERS[s.prov].name + " room"}` })),
      s.record && !rec ? el("span", { class: "lrec", title: "This session is being recorded" }, el("i"), "REC") : null, rec ? null : timer);
    const stage = el("div", { class: "lstage", role: "region", "aria-label": "Shared presentation" });
    const drawSlide = () => {
      const sl = slides[n];
      fill(stage, el("div", { class: "lslide " + sl.k }, el("div", { class: "lsk", text: `IPA Africa · ${c.code}` }), el("h2", { text: sl.t }),
        sl.sub ? el("p", { text: sl.sub }) : null, sl.pts ? el("ul", {}, ...sl.pts.map((p) => el("li", { text: p }))) : null, el("div", { class: "lsn", text: `${n + 1} / ${slides.length}` })),
        low ? el("div", { class: "llow", text: "Low-data mode: audio and slides only" }) : null);
      const pres = $("#lpres"); if (pres) pres.textContent = `Presenting: ${fac.n}`;
    };
    const stageWrap = el("div", { class: "lstagewrap" }, stage, el("div", { class: "lstagebar" }, el("span", { id: "lpres", class: "tiny" }),
      host || rec ? el("div", { class: "btns" }, el("button", { class: "lctl sm", type: "button", "aria-label": "Previous slide", onclick: () => { n = Math.max(0, n - 1); S.set(slideKey, n); drawSlide(); } }, "‹"),
        el("button", { class: "lctl sm", type: "button", "aria-label": "Next slide", onclick: () => { n = Math.min(slides.length - 1, n + 1); S.set(slideKey, n); drawSlide(); } }, "›")) : null));
    const tiles = el("div", { class: "ltiles", "aria-label": "Participants' video" });
    const drawTiles = () => fill(tiles, ...ppl.slice(0, low ? 0 : 7).map((p) => el("div", { class: "ltile" + (p.host ? " host" : "") + (p.id === u.id && cam ? " cam" : "") },
      el("span", { class: "lav", text: ini(p.n) }), el("span", { class: "lname", text: (p.host ? "Facilitator · " : "") + p.n }),
      (p.id === u.id ? !mic : !p.host) ? el("span", { class: "lmute", title: "Muted" }, icon("mic", "i sm")) : null, hands.has(p.id) || (p.id === u.id && hand) ? el("span", { class: "lhand", text: "✋" }) : null)),
      ppl.length > 7 && !low ? el("div", { class: "ltile more" }, el("b", { text: `+${ppl.length - 7}` }), el("span", { class: "lname", text: "more" })) : null);
    // side panel: chat, people, check-in (or chapters for a recording)
    const panel = el("aside", { class: "lpanel" });
    const tabs = el("div", { class: "ltabs", role: "tablist" });
    const body = el("div", { class: "lpbody" });
    let tab = rec ? "chapters" : "chat";
    const drawPanel = () => {
      fill(tabs, ...(rec ? [["chapters", "Chapters"], ["chat", "Chat replay"]] : [["chat", "Chat"], ["people", `People (${ppl.length})`], ["checkin", "Check-in"]])
        .map(([k, t]) => el("button", { type: "button", role: "tab", "aria-selected": String(tab === k), class: tab === k ? "on" : "", text: t, onclick: () => { tab = k; drawPanel(); } })));
      if (tab === "chat") {
        const list = el("div", { class: "lchat", "aria-live": "polite" }, ...chat().map((m) => el("div", { class: "lmsg" + (m.id === u.id ? " me" : "") }, el("b", { text: m.n.replace(" (you)", "") }), el("span", { text: m.t }))));
        const inp = el("input", { class: "input", placeholder: rec ? "Chat is read-only in a recording" : "Send a message to everyone", "aria-label": "Chat message", disabled: rec });
        fill(body, list, rec ? null : el("form", { class: "pwrow", onsubmit: (e) => { e.preventDefault(); if (!inp.value.trim()) return; const m = chat(); m.push({ id: u.id, n: u.n, t: inp.value.trim().slice(0, 500), at: Date.now() }); S.set(chatKey, m); inp.value = ""; drawPanel(); } }, inp, el("button", { class: "btn sm", type: "submit", "aria-label": "Send" }, icon("send"))));
        list.scrollTop = list.scrollHeight;
      } else if (tab === "people") {
        fill(body, el("div", { class: "lpeople" }, ...ppl.map((p) => el("div", { class: "lperson" }, el("span", { class: "lav sm", text: ini(p.n) }), el("span", { text: p.n }), p.host ? el("span", { class: "lbadge", text: "Host" }) : null, hands.has(p.id) || (p.id === u.id && hand) ? el("span", { text: "✋" }) : null))));
      } else if (tab === "checkin") {
        const cur = C.liveGet(s.id), open = cur.checkin && Date.now() <= cur.checkin.until;
        if (host) fill(body, open ? el("div", { class: "lcode" }, el("div", { class: "tiny muted", text: "Show this code to the participants" }), el("b", { text: cur.checkin.code })) : el("p", { class: "small", text: "Open a check-in to confirm who is here." }),
          el("button", { class: "btn sm mt", type: "button", text: open ? "New code" : "Open check-in", onclick: () => { openCheckin(cur); drawPanel(); C.say("Check-in open for 10 minutes."); } }));
        else { const mine = attendance(cur)[u.id]; fill(body, mine && mine.checked ? el("p", { class: "small", text: "You have checked in." }) : open ? checkinForm(u, cur, drawPanel) : el("p", { class: "small muted", text: "Your facilitator will open the check-in during the session." })); }
      } else if (tab === "chapters") {
        fill(body, el("div", { class: "lpeople" }, ...slides.map((sl, i) => el("button", { type: "button", class: "lperson lchap" + (i === n ? " on" : ""), onclick: () => { n = i; drawSlide(); drawPanel(); } }, el("span", { class: "tiny muted", text: `${String(i * 6).padStart(2, "0")}:00` }), el("span", { text: sl.t })))));
      }
    };
    panel.append(tabs, body);
    // controls
    const ctl = (ic, label, on, fn, cls = "") => el("button", { class: "lctl " + cls + (on ? " on" : ""), type: "button", "aria-pressed": on == null ? null : String(!!on), onclick: fn }, icon(ic), el("span", { text: label }));
    const bar = el("div", { class: "lbar" });
    const drawBar = () => fill(bar, ...(rec ? [
      ctl("video", "Play", null, () => C.say("The recording plays here (sample). Captions and a low-data audio version are offered on the live platform.")),
      ctl("dl", "Audio only", null, () => C.say("Audio-only download (about 25 MB per hour) on the live platform.")),
      ctl("back", "Leave", null, () => (location.href = "session.html?s=" + encodeURIComponent(s.id)), "leave")] : [
      ctl("mic", mic ? "Mute" : "Unmute", mic, () => { mic = !mic; drawBar(); drawTiles(); }),
      ctl("video", cam ? "Stop camera" : "Camera", cam, () => { cam = !cam; drawBar(); drawTiles(); C.say(cam ? "Simulation: your camera would be shared now." : "Camera off."); }),
      ctl("full", "Share screen", null, () => C.say(host ? "Simulation: your screen would be shared with the room." : "Only facilitators can share their screen here.")),
      ctl("thumb", hand ? "Lower hand" : "Raise hand", hand, () => { hand = !hand; drawBar(); drawTiles(); drawPanel(); }),
      ctl("wifi", low ? "Full video" : "Low data", low, () => { low = !low; drawBar(); drawSlide(); drawTiles(); }),
      ctl("back", "Leave", null, () => (location.href = "session.html?s=" + encodeURIComponent(s.id)), "leave")]));
    root.append(top, el("div", { class: "lmain" }, el("div", { class: "lcol" }, stageWrap, tiles), panel), bar,
      el("div", { class: "lnote", text: rec ? "Sample recording: on the live platform the provider's player opens here." : `Simulation of a ${PROVIDERS[s.prov].name} meeting. On the live platform, Join opens the provider's own meeting; nothing here uses your camera or microphone.` }));
    drawSlide(); drawTiles(); drawPanel(); drawBar();
    const tick = () => { const m = Math.max(0, Math.floor((Date.now() - s.start) / MIN)); timer.textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} elapsed`; };
    if (!rec) { tick(); setInterval(tick, 30000); }
  }

  // ------------------------------------------------------------------ pieces for other pages
  // Dashboard "Coming up" and the course page card
  C.liveUpcomingFor = (u, days = 14) => C.liveFor(u).filter((s) => s.status !== "cancelled" && (C.liveState(s) === "open" || (C.liveState(s) === "upcoming" && s.start < Date.now() + days * DAY)) && (C.liveCanAttend(u, s) || C.liveCanManage(u, s)));
  C.liveCourseCard = (u, slug) => {
    const list = C.liveFor(u).filter((s) => s.course === slug && s.status !== "cancelled");
    const next = list.find((s) => C.liveState(s) !== "ended");
    const lastRec = list.filter((s) => C.liveCanWatch(u, s)).pop();
    const card = el("div", { class: "card pad", id: "clive" }, el("h3", {}, icon("video"), " Live sessions"));
    if (next) card.append(el("p", { class: "small", style: { margin: "6px 0 8px" } }, el("b", { text: next.title }), el("br"), `${C.fmtTime(next.start)} · ${PROVIDERS[next.prov].name}`),
      C.liveState(next) === "open" && (C.liveCanAttend(u, next) || C.liveCanManage(u, next)) ? el("button", { class: "btn ok sm", type: "button", onclick: () => enterRoom(u, next) }, icon("video"), "Join now") : null);
    else card.append(el("p", { class: "small muted", style: { margin: "6px 0 8px" }, text: "No session scheduled." }));
    if (lastRec) card.append(el("a", { class: "btn sec sm", style: { marginTop: "8px" }, href: `liveroom.html?s=${encodeURIComponent(lastRec.id)}&rec=1` }, "Latest recording"));
    card.append(el("a", { class: "btn ghost sm", style: { marginTop: "8px" }, href: `live.html?c=${slug}`, text: "All live sessions" }));
    return card;
  };

  C.ready(() => {
    if (C.page === "live") listPage();
    else if (C.page === "session") sessionPage();
    // the classroom is async: a redirect to sign-in must not surface as an error
    else if (C.page === "liveroom") roomPage().catch((e) => { if (!e || e.message !== "redirect") console.error(e); });
  });
})();
