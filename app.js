/* Mon Épargne — v0.1 (premier test)
 * Application web locale : toutes les données restent dans le navigateur du téléphone (localStorage).
 */
'use strict';

// ---------------------------------------------------------------- Constantes & outils
const KEY = 'mon-epargne-v1';
const TAX = 0.314;            // 18,6 % prélèvements sociaux + 12,8 % acompte
const PS = 0.186, ACOMPTE = 0.128;
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const TYPES = {
  fine: { title: 'In fine', sub: 'Capital et intérêts rendus à la fin' },
  mens: { title: 'Intérêts mensuels', sub: 'Intérêts chaque mois, capital à la fin' },
  amort: { title: 'Mensualités constantes', sub: 'Capital + intérêts chaque mois' }
};
const NBSP = ' ', NNBSP = ' ';

const r2 = (x) => Math.round(x * 100 + (x >= 0 ? 1e-9 : -1e-9)) / 100;
const sum = (arr, f) => arr.reduce((a, x) => a + (typeof f === 'function' ? f(x) : x[f]), 0);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function parts(n) {
  const neg = n < 0;
  const p = Math.abs(n).toFixed(2).split('.');
  return { e: (neg ? '−' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP), c: ',' + p[1] + NBSP + '€' };
}
const eur = (n) => { const p = parts(n); return p.e + p.c; };
const money = (n) => { const p = parts(n); return `${p.e}<span class="ct">${p.c}</span>`; };
const pct = (x) => String(x).replace('.', ',') + NBSP + '%';

/** Lit un montant saisi en français. null = vide d'origine ; NaN = invalide. */
function parseAmt(str) {
  if (str === null || str === undefined) return null;
  const c = String(str).replace(/[\s  €%]/g, '').replace(',', '.');
  if (c === '') return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(c) && !/^\.\d{1,2}$/.test(c)) return NaN;
  return parseFloat(c) || 0;
}

const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = new URLSearchParams(location.search).get('today') || isoLocal(new Date());
const monthOf = (iso) => iso.slice(0, 7);
const ym = (k) => { const [y, m] = k.split('-').map(Number); return { y, m }; };
const addMonthKey = (k, n) => { const { y, m } = ym(k); const t = y * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`; };
const monthLabel = (k) => { const { y, m } = ym(k); return cap1(MOIS[m - 1]) + ' ' + y; };
function addMonthsISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  const ny = Math.floor(t / 12), nm = (t % 12) + 1;
  const last = new Date(ny, nm, 0).getDate();
  return `${ny}-${pad(nm)}-${pad(Math.min(d, last))}`;
}
function fmtDay(iso, withYear) {
  const [y, m, d] = iso.split('-').map(Number);
  const s = (d === 1 ? '1er' : d) + ' ' + MOIS_C[m - 1];
  return withYear || y !== +TODAY.slice(0, 4) ? s + ' ' + y : s;
}
const shortDate = (iso) => { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y.slice(2)}`; };
function parseFrDate(str) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(str || '').trim());
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > new Date(y, mo, 0).getDate()) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}
const frDate = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

const I = {
  home: '<path d="M4 10.5L12 4l8 6.5V20h-5v-6H9v6H4z"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4M9 14.5l2 2 4-4"/>',
  grid: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
  trend: '<path d="M4 19h16M5 15l4.5-4.5 3.5 3L19 7.5M15 7.5h4v4"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  pen: '<path d="M5 19h4L19.5 8.5l-4-4L5 15z"/><path d="M13.5 6.5l4 4"/>',
  alert: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  right: '<path d="M9 6l6 6-6 6"/>', left: '<path d="M15 6l-6 6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', arrow: '<path d="M4 12h15M14 7l5 5-5 5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.3"/>',
  up: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4 15v5h16v-5"/>', dl: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4 15v5h16v-5"/>'
};
const svg = (name, size = 20, sw = 1.9) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name]}</svg>`;

// ---------------------------------------------------------------- Données
function seed() {
  const P = (id, name, amount, rate, type, end, extra = {}) => ({ id, pf: 'lpb', name, amount, rate, type, end, start: null, status: 'en_cours', capLeft: amount, own: false, ...extra });
  return {
    v: 1,
    base: '2026-10-06',
    theme: 'system',
    motion: 'system',
    platforms: [
      { id: 'lep', name: 'LEP', short: 'LEP', kind: 'Livret · 2,5 % net · exonéré', taxed: false, base: 10000, invest: false, note: 'Intérêts versés le 31 déc.' },
      { id: 'lpb', name: 'La Première Brique', short: '1ère Brique', kind: 'Prêts immobiliers · 11,7 %', taxed: true, base: 1257.89, invest: true },
      { id: 'bp', name: 'BienPrêter', short: 'BienPrêter', kind: 'Prêts aux PME · 14,5 % brut/an', taxed: true, base: 998, invest: true }
    ],
    projects: [
      P('echo', "L'Echo", 750, 11.5, 'mens', '2026-12-18', { capLeft: 390.41, received: 71.88, late: { count: 7, amount: 26.19, since: '2026-03-18' } }),
      P('elvira', "L'Elvira", 500, 11.5, null, null, { status: 'rembourse', capLeft: 0 }),
      P('duroc', 'Le Duroc', 250, 13, 'fine', '2027-05-13'),
      P('paillette', 'La Paillette', 500, 11.5, 'fine', '2027-07-10'),
      P('jylou', 'Le Jylou 2', 18, 11, 'mens', '2027-07-31', { late: { count: 5, amount: 0.82, since: '2026-05-31' } }),
      P('julia', 'La Julia', 15, 11.5, null, '2027-09-22', { note: '10 € + 5 €' }),
      P('riviera', 'La Riviera', 5, 11, 'amort', '2027-10-04', { capLeft: null }),
      P('cevenis', 'Le Cévénis', 69, 12, null, '2027-12-27'),
      P('bonbon', 'Le Bonbon', 1, 11.5, null, '2028-02-25'),
      P('silence', 'Le Silence', 10, 11.5, null, '2028-03-20')
    ],
    dues: [
      { id: 'd-bp-2610', date: '2026-10-01', pf: 'bp', project: null, label: 'BienPrêter', int: 10.25, cap: 0 },
      { id: 'd-riv-2610', date: '2026-10-04', pf: 'lpb', project: 'riviera', label: 'La Riviera', int: 0.04, cap: 1.23 },
      { id: 'd-echo-2610', date: '2026-10-18', pf: 'lpb', project: 'echo', label: "L'Echo", int: 3.74, cap: 0 },
      { id: 'd-bp-2611', date: '2026-11-01', pf: 'bp', project: null, label: 'BienPrêter', int: 12.44, cap: 0 },
      { id: 'd-bp-2612c', date: '2026-12-01', pf: 'bp', project: null, label: 'BienPrêter', int: 0, cap: 26 },
      { id: 'd-echo-2612c', date: '2026-12-18', pf: 'lpb', project: 'echo', label: "L'Echo", int: 0, cap: 390.41 },
      { id: 'd-duroc', date: '2027-05-13', pf: 'lpb', project: 'duroc', label: 'Le Duroc', int: 65, cap: 250 },
      { id: 'd-paillette', date: '2027-07-10', pf: 'lpb', project: 'paillette', label: 'La Paillette', int: 115, cap: 500 }
    ],
    invs: [],
    months: {}
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw); if (d && d.v === 1) return d; }
  } catch (e) { /* données illisibles : on repart des données de départ */ }
  return seed();
}

let D = load();
let persistAsked = false;
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(D));
    if (!persistAsked && navigator.storage && navigator.storage.persist) { persistAsked = true; navigator.storage.persist().catch(() => {}); }
    return true;
  } catch (e) {
    toast('Échec de l’enregistrement', { error: true, action: 'Réessayer', onAction: save });
    return false;
  }
}

const PF = (id) => D.platforms.find((p) => p.id === id);
const PROJ = (id) => D.projects.find((p) => p.id === id);
const ORDER = () => D.platforms.map((p) => p.id).sort((a, b) => ['bp', 'lpb', 'lep'].indexOf(a) - ['bp', 'lpb', 'lep'].indexOf(b));
const dueAmount = (d) => r2(d.int + d.cap);
function dueSub(d) {
  const day = fmtDay(d.date);
  if (d.cap && d.int) return `dont ${eur(d.cap)} de capital · ${day}`;
  if (d.cap) return `Capital · ${day}`;
  return `Intérêts · ${day}`;
}
const BLANK = () => ({ rec: {}, verse: null, retire: '', pertes: '', int: null, tax: null, cap: null, valeur: '', note: '' });
function draft(k, pf, create) {
  if (!D.months[k]) { if (!create) return BLANK(); D.months[k] = { saved: false, pf: {} }; }
  const m = D.months[k];
  if (!m.pf[pf]) { if (!create) return BLANK(); m.pf[pf] = BLANK(); }
  return m.pf[pf];
}
const isSaved = (k) => !!(D.months[k] && D.months[k].saved);
const savedMonths = () => Object.keys(D.months).filter(isSaved).sort();

/** Calcule les montants d'une plateforme pour un mois (saisies + valeurs proposées). */
function calc(k, pfId) {
  const pf = PF(pfId);
  const dr = draft(k, pfId, false);
  const dues = D.dues.filter((d) => monthOf(d.date) === k && d.pf === pfId).sort((a, b) => a.date.localeCompare(b.date));
  const got = dues.filter((d) => dr.rec[d.id]);
  const n = (x) => (x === null || Number.isNaN(x) ? 0 : x);
  const autoInt = r2(sum(got, 'int'));
  const autoCap = r2(sum(got, 'cap'));
  const pi = parseAmt(dr.int), pt = parseAmt(dr.tax), pc = parseAmt(dr.cap), pv = parseAmt(dr.verse);
  const int = pi === null ? autoInt : n(pi);
  const autoTax = pf.taxed ? r2(int * TAX) : 0;
  const tax = pt === null ? autoTax : n(pt);
  const cap = pc === null ? autoCap : n(pc);
  const invs = D.invs.filter((v) => v.month === k && v.pf === pfId);
  const autoVerse = r2(sum(invs.filter((v) => v.src === 'verse'), 'amount'));
  const verse = pv === null ? autoVerse : n(pv);
  const retire = n(parseAmt(dr.retire)), pertes = n(parseAmt(dr.pertes));
  const bad = ['verse', 'retire', 'pertes', 'int', 'tax', 'cap'].some((f) => dr[f] !== null && dr[f] !== '' && Number.isNaN(parseAmt(dr[f])));
  return {
    dues, got: got.length, autoInt, autoCap, autoTax, autoVerse, int, tax, cap, verse, retire, pertes,
    invested: r2(sum(invs, 'amount')), invs, bad, net: r2(int - tax + cap)
  };
}

function pfDelta(pfId, upTo) {
  let s = 0;
  for (const k of savedMonths()) {
    if (upTo && k > upTo) continue;
    const c = calc(k, pfId);
    s += c.verse - c.retire - c.pertes + c.int - c.tax;
  }
  return r2(s);
}
const pfValue = (pfId, upTo) => r2(PF(pfId).base + pfDelta(pfId, upTo));
const patrimoine = (upTo) => r2(sum(D.platforms, (p) => pfValue(p.id, upTo)));
function dispo(pfId) {
  let s = 0;
  for (const k of savedMonths()) { const c = calc(k, pfId); s += c.verse + c.int - c.tax + c.cap - c.retire - c.invested; }
  return r2(s);
}
function receivedDue(id) {
  for (const k of Object.keys(D.months)) { const m = D.months[k]; for (const p of Object.keys(m.pf)) if (m.pf[p].rec[id]) return true; }
  return false;
}
function capLeft(p) {
  if (!p.own) return p.capLeft;
  const recCap = sum(D.dues.filter((d) => d.project === p.id && receivedDue(d.id) && isSaved(monthOf(d.date))), 'cap');
  return r2(p.amount - recCap);
}
function netInterestYear(y) {
  let s = 0;
  for (const k of savedMonths()) if (k.startsWith(y)) for (const id of ORDER()) { const c = calc(k, id); s += c.int - c.tax; }
  return r2(s);
}
const lateProjects = (pfId) => D.projects.filter((p) => p.late && p.status !== 'rembourse' && (!pfId || p.pf === pfId));

// ---------------------------------------------------------------- État de l'interface
const UI = {
  view: 'home', month: monthOf(TODAY) < monthOf(D.base) ? monthOf(D.base) : monthOf(TODAY), step: 0,
  retOpen: false, filter: 'all', showRepaid: false, sheet: null, barSel: null, proj: { monthly: '250', rate: '14,5', years: '7', loss: '0' }
};
let toastTimer = null;
function toast(text, opts = {}) {
  clearTimeout(toastTimer);
  const el = document.getElementById('toast');
  el.className = document.getElementById('app').classList.contains('has-footer') ? 'lift' : '';
  el.innerHTML = `<div class="t${opts.error ? ' err' : ''}"><span style="display:flex;align-items:center;gap:10px">${svg(opts.error ? 'info' : 'check', 18, 2.4)}${esc(text)}</span>${opts.action ? `<button type="button" data-toast="1">${esc(opts.action)}</button>` : ''}</div>`;
  const b = el.querySelector('button');
  if (b) b.onclick = () => { clearTimeout(toastTimer); el.innerHTML = ''; opts.onAction && opts.onAction(); };
  toastTimer = setTimeout(() => { el.innerHTML = ''; }, opts.error ? 8000 : 5000);
}
/** Modifie les données avec possibilité d'annuler pendant 5 s. */
function withUndo(label, fn) {
  const snap = JSON.stringify(D);
  fn();
  save(); render();
  toast(label, { action: 'Annuler', onAction: () => { D = JSON.parse(snap); save(); render(); } });
}

// ---------------------------------------------------------------- Rendu
function render() {
  const app = document.getElementById('app');
  const views = { home: viewHome, month: viewMonth, projects: viewProjects, projection: viewProjection, settings: viewSettings, impots: viewImpots };
  const out = (views[UI.view] || viewHome)();
  app.className = out.footer ? 'has-footer' : '';
  app.innerHTML = out.html + (out.footer || '') + nav();
  renderSheet();
  applyTheme();
}
function go(view, opts = {}) {
  UI.view = view; UI.barSel = null;
  Object.assign(UI, opts);
  render(); window.scrollTo(0, 0);
}
function applyTheme() {
  const r = document.documentElement;
  if (D.theme === 'light' || D.theme === 'dark') r.setAttribute('data-theme', D.theme); else r.removeAttribute('data-theme');
  if (D.motion === 'reduce') r.setAttribute('data-motion', 'reduce'); else r.removeAttribute('data-motion');
}

function nav() {
  const tabs = [['home', 'Accueil', 'home'], ['month', 'Mon mois', 'cal'], ['projects', 'Projets', 'grid'], ['projection', 'Projection', 'trend'], ['settings', 'Réglages', 'sliders']];
  const active = UI.view === 'impots' ? 'home' : UI.view;
  return `<nav class="nav" aria-label="Navigation principale"><div class="in2">${tabs.map(([v, l, i]) =>
    `<button type="button" class="tab" data-go="${v}" ${active === v ? 'aria-current="page"' : ''}>${svg(i, 24, active === v ? 1.9 : 1.7)}${l}</button>`).join('')}</div></nav>`;
}

// ---- Accueil
function viewHome() {
  const total = patrimoine();
  const p = parts(total);
  const order = ['lep', 'lpb', 'bp'].filter((id) => PF(id));
  const vals = order.map((id) => ({ id, v: pfValue(id) }));
  const last = savedMonths().slice(-1)[0];
  const delta = last ? r2(total - patrimoine(addMonthKey(last, -1))) : null;
  const cur = monthOf(TODAY);
  const curDues = D.dues.filter((d) => monthOf(d.date) === cur);
  const year = TODAY.slice(0, 4);
  const netYear = netInterestYear(year);
  const late = lateProjects();
  const todoCount = (isSaved(cur) ? 0 : 1) + late.length;

  let h = `<header class="hdr"><span class="brand">Mon Épargne</span><span class="m xs mu">${fmtDay(TODAY, true)}</span></header>`;
  h += `<section class="hero" aria-label="Patrimoine">
    <div class="lbl" style="display:flex;justify-content:space-between"><span>Patrimoine total</span><span>${D.platforms.length} plateformes</span></div>
    <div class="big"><span class="e">${p.e}</span><span class="c">${p.c}</span></div>
    ${delta !== null ? `<span class="small" style="font-weight:600;color:${delta >= 0 ? 'var(--ok)' : 'var(--er)'}">${delta >= 0 ? '+' : ''}${eur(delta)} en ${MOIS[ym(last).m - 1]} · versements, retraits et intérêts nets</span>` : ''}
    <div class="split" role="img" aria-label="Répartition : ${vals.map((x) => `${PF(x.id).name} ${pct((x.v / total * 100).toFixed(1))}`).join(', ')}">${vals.map((x) => `<div class="dot-${x.id}" style="flex:${Math.max(x.v, 0)} 1 0"></div>`).join('')}</div>
    <div class="legend">${vals.map((x) => `<div class="legend-row"><span class="sw dot-${x.id}"></span><span>${esc(PF(x.id).name)}</span><span style="font-weight:600">${money(x.v)}</span><span class="mu" style="text-align:right">${pct((x.v / total * 100).toFixed(1))}</span></div>`).join('')}</div>
  </section>`;
  h += `<section class="kpis" aria-label="Chiffres clés">
    <button type="button" class="kpi" data-go="impots"><span class="lbl">Intérêts nets ${year}</span><span class="v">${money(netYear)}</span><span class="xs mu">${savedMonths().filter((k) => k.startsWith(year)).length} mois saisi(s) ›</span></button>
    <div class="kpi"><span class="lbl">Intérêts prévus · ${MOIS_C[ym(cur).m - 1]}</span><span class="v">${money(r2(sum(curDues, 'int')))}</span><span class="xs mu">bruts · ${curDues.filter((d) => d.int > 0).length} échéance(s)</span></div>
    <div class="kpi"><span class="lbl">Capital attendu · ${MOIS_C[ym(cur).m - 1]}</span><span class="v">${money(r2(sum(curDues, 'cap')))}</span><span class="xs mu">${esc(curDues.filter((d) => d.cap > 0).map((d) => d.label).join(', ') || '—')}</span></div>
  </section>`;
  h += `<section class="sec" aria-label="À faire"><div class="sec-h"><h2 class="h2">À faire</h2><span class="m xs mu">${todoCount}</span></div>`;
  if (!isSaved(cur)) h += `<button type="button" class="todo" data-go="month" data-month="${cur}"><span class="ico ac">${svg('pen')}</span><span class="stack"><span class="t1">Saisir ${MOIS[ym(cur).m - 1]} ${ym(cur).y}</span><span class="small mu">Bilan du mois · ${D.platforms.length} plateformes</span></span><span class="mu">${svg('right')}</span></button>`;
  else h += `<div class="todo"><span class="ico ok">${svg('check', 20, 2.4)}</span><span class="stack"><span class="t1">${cap1(MOIS[ym(cur).m - 1])} enregistré</span><span class="small c-ok" style="font-weight:600">Fait</span></span><span></span></div>`;
  for (const p of late) {
    const sev = p.late.count >= 6 ? 'er' : 'wa';
    h += `<button type="button" class="todo" data-proj="${p.id}"><span class="ico ${sev}">${svg(sev === 'er' ? 'alert' : 'clock')}</span><span class="stack"><span class="t1">${esc(p.name)} <span class="mu" style="font-weight:400;font-size:14px">· ${esc(PF(p.pf).name)}</span></span><span class="small mu">${p.late.count} échéance(s) non reçue(s) depuis le ${fmtDay(p.late.since)}</span><span class="stat c-${sev}">${sev === 'er' ? 'Problème' : 'Attention'} · retard</span></span><span style="font-weight:700">${money(p.late.amount)}</span></button>`;
  }
  h += `</section>`;

  h += `<section class="sec" aria-label="Plateformes"><div class="sec-h"><h2 class="h2">Plateformes</h2><span class="lbl">valeur · part</span></div>`;
  for (const x of vals) {
    const pf = PF(x.id);
    const nx = D.dues.filter((d) => d.pf === pf.id && d.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))[0];
    const lt = lateProjects(pf.id).length;
    const dp = dispo(pf.id);
    h += `<button type="button" class="pfrow" data-go="projects" data-filter="${pf.id}">
      <span class="top"><span class="name"><span class="sw dot-${pf.id}"></span>${esc(pf.name)}</span><span class="val">${money(x.v)}</span></span>
      <span class="sub"><span>${esc(pf.kind)}</span><span>${pct((x.v / total * 100).toFixed(1))}</span></span>
      <span class="nx"><span>${nx ? `Prochaine : ${eur(dueAmount(nx))} le ${fmtDay(nx.date)}` : esc(pf.note || '—')}</span>${lt ? `<span class="c-er" style="display:flex;align-items:center;gap:4px;font-family:var(--ff);font-weight:600">${svg('alert', 14, 2.2)}${lt} retard${lt > 1 ? 's' : ''}</span>` : ''}</span>
      ${pf.invest && savedMonths().length ? `<span class="nx mu"><span>Disponible sur le compte</span><span>${eur(dp)}</span></span>` : ''}
    </button>`;
  }
  h += `</section>`;

  // Revenus prévus 12 mois
  const months12 = Array.from({ length: 12 }, (_, i) => addMonthKey(cur, i));
  const agg = months12.map((k) => { const ds = D.dues.filter((d) => monthOf(d.date) === k); return { k, i: r2(sum(ds, 'int')), c: r2(sum(ds, 'cap')) }; });
  const max = Math.max(1, ...agg.map((a) => a.i + a.c));
  const scale = 112 / max;
  const sel = UI.barSel;
  h += `<section class="sec" aria-label="Revenus prévus sur 12 mois" style="gap:14px"><div class="sec-h"><h2 class="h2">Revenus prévus</h2><span class="lbl">${MOIS_C[ym(cur).m - 1]} ${String(ym(cur).y).slice(2)} → ${MOIS_C[ym(months12[11]).m - 1]} ${String(ym(months12[11]).y).slice(2)}</span></div>
    <div class="legend-inline"><span><span class="sw" style="background:var(--ac)"></span>Intérêts</span><span><span class="sw" style="background:var(--cap)"></span>Capital</span><span class="xs">Toucher une barre</span></div>
    <div class="chart" role="img" aria-label="Revenus prévus par mois">
      <div class="grid" style="top:${120 - Math.round(max / 2 * scale)}px"></div><div class="yl" style="top:${120 - Math.round(max / 2 * scale) - 14}px">${Math.round(max / 2)} €</div>
      <div class="axis"></div>
      <div class="bars">${agg.map((a, i) => `<button type="button" class="bar${sel !== null && sel !== i ? ' dim' : ''}" data-bar="${i}" aria-label="${monthLabel(a.k)} : intérêts ${eur(a.i)}, capital ${eur(a.c)}"><span class="i" style="height:${a.i ? Math.max(2, Math.round(a.i * scale)) : 0}px"></span><span class="k" style="height:${a.c ? Math.max(2, Math.round(a.c * scale)) : 0}px"></span></button>`).join('')}</div>
      ${sel !== null ? `<div class="tip" style="${sel < 6 ? `left:calc(${(sel + 1) / 12 * 100}% + 2px)` : `right:calc(${(11 - sel + 1) / 12 * 100}% + 2px)`}"><span class="lbl">${monthLabel(agg[sel].k)}</span><span style="font-weight:600">Intérêts ${eur(agg[sel].i)}</span><span style="font-weight:600">Capital ${eur(agg[sel].c)}</span></div>` : ''}
      <div class="xl">${agg.map((a, i) => `<span style="${sel === i ? 'color:var(--ink);font-weight:500' : ''}">${MOIS_C[ym(a.k).m - 1].charAt(0).toUpperCase()}</span>`).join('')}</div>
    </div>
    <span class="xs mu">Seules les échéances connues de l'app sont comptées.</span>
  </section>`;

  // Capital qui revient
  const capSoon = D.dues.filter((d) => d.cap > 0 && d.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  h += `<section class="sec" aria-label="Capital qui revient bientôt"><div class="sec-h"><h2 class="h2">Capital qui revient</h2><span style="font-size:14px;font-weight:700">${money(r2(sum(capSoon, dueAmount)))}</span></div>
    ${capSoon.map((d) => { const pr = d.project && PROJ(d.project); return `<div class="caprow"><span class="m xs mu">${shortDate(d.date)}</span><span class="stack"><span style="display:flex;align-items:center;gap:8px;font-size:15px"><span class="sw dot-${d.pf}" style="width:8px;height:8px"></span>${esc(d.label)}</span>${pr && pr.late ? `<span class="xs c-er" style="display:flex;align-items:center;gap:4px;padding-left:16px;font-weight:600">${svg('alert', 12, 2.4)}Projet en retard</span>` : d.int && d.cap ? `<span class="xs mu" style="padding-left:16px">${eur(d.cap)} capital + ${eur(d.int)} intérêts</span>` : ''}</span><span style="font-weight:600;font-size:15px">${money(dueAmount(d))}</span></div>`; }).join('') || '<p class="small mu">Aucun remboursement de capital prévu.</p>'}
  </section>`;

  // Évolution
  const sm = savedMonths();
  h += `<section class="sec" aria-label="Évolution" style="gap:14px"><div class="sec-h"><h2 class="h2">Évolution</h2><span class="lbl">patrimoine</span></div>`;
  if (sm.length < 2) {
    h += `<div class="empty"><span class="mu">${svg('trend', 32, 1.6)}</span><span style="font-size:15px;font-weight:600">La courbe apparaît après 2 mois saisis.</span><span class="xs mu">${sm.length} mois saisi(s) pour l'instant.</span></div>`;
  } else {
    const pts = sm.map((k) => ({ k, v: patrimoine(k) }));
    const mn = Math.min(...pts.map((x) => x.v)), mx = Math.max(...pts.map((x) => x.v));
    const W = 342, H = 130, rng = mx - mn || 1;
    const xy = pts.map((x, i) => [Math.round(i / (pts.length - 1) * (W - 10) + 5), Math.round(H - 10 - (x.v - mn) / rng * (H - 30))]);
    h += `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Patrimoine fin de mois"><path d="M${xy.map((p) => p.join(' ')).join('L')}" fill="none" stroke="var(--ink)" stroke-width="2"/>${xy.map((p) => `<rect x="${p[0] - 4}" y="${p[1] - 4}" width="8" height="8" fill="var(--bg)" stroke="var(--ink)" stroke-width="2"/>`).join('')}</svg>
    <div class="m xs mu" style="display:flex;justify-content:space-between"><span>${monthLabel(pts[0].k)} · ${eur(pts[0].v)}</span><span>${monthLabel(pts[pts.length - 1].k)} · ${eur(pts[pts.length - 1].v)}</span></div>`;
  }
  h += `</section>`;
  return { html: h };
}

// ---- Bilan du mois
const FIELDS = [
  { f: 'verse', label: 'Versé', auto: 'autoVerse', hint: (c) => (c.autoVerse ? 'D’après tes nouveaux investissements' : 'Argent viré sur la plateforme') },
  { f: 'retire', label: 'Retiré' },
  { f: 'int', label: 'Intérêts bruts', auto: 'autoInt', hint: () => 'Somme des échéances reçues' },
  { f: 'tax', label: 'Impôts prélevés', auto: 'autoTax', hint: () => '31,4 % des intérêts bruts', taxedOnly: true },
  { f: 'cap', label: 'Capital remboursé', auto: 'autoCap' },
  { f: 'pertes', label: 'Pertes' }
];
const fieldsFor = (pf) => FIELDS.filter((x) => !x.taxedOnly || pf.taxed);

function viewMonth() {
  const k = UI.month;
  const order = ORDER();
  const saved = isSaved(k);
  const step = saved ? order.length : Math.min(UI.step, order.length);
  const maxMonth = addMonthKey(monthOf(TODAY), 1);
  let h = `<div class="topbar"><button type="button" class="iconbtn" data-go="home" aria-label="Retour à l'accueil">${svg('left', 22, 2)}</button><span class="ttl">Bilan du mois</span><span class="m xs mu" style="text-align:right;padding-right:8px">${saved ? '' : `${Math.min(step + 1, order.length + 1)} / ${order.length + 1}`}</span></div>`;
  h += `<div class="monthsel"><button type="button" class="iconbtn" data-month-shift="-1" aria-label="Mois précédent" ${k <= monthOf(D.base) ? 'disabled' : ''}>${svg('left', 20, 2)}</button>
    <div class="mid"><span class="lbl" style="font-size:10px">Mois</span><strong>${monthLabel(k)}</strong></div>
    <button type="button" class="iconbtn" data-month-shift="1" aria-label="Mois suivant" ${k >= maxMonth ? 'disabled' : ''} style="justify-content:flex-end">${svg('right', 20, 2)}</button></div>`;
  if (!saved) {
    h += `<nav class="steps" aria-label="Étapes du bilan">${order.map((id, i) => `<button type="button" class="step${i === step ? ' cur' : ''}${i < step ? ' done' : ''}" data-step="${i}" ${i === step ? 'aria-current="step"' : ''} style="${i < step ? `border-top-color:var(--${id})` : ''}">${esc(PF(id).short)}<span class="s">${i < step ? 'Vu' : i === step ? 'En cours' : 'À faire'}</span></button>`).join('')}
      <button type="button" class="step${step === order.length ? ' cur' : ''}" data-step="${order.length}">Récap<span class="s">${step === order.length ? 'En cours' : '—'}</span></button></nav>`;
  }
  if (step < order.length) return stepPlatform(h, k, order[step], step, order);
  return stepRecap(h, k, order, saved);
}

function stepPlatform(h, k, pfId, step, order) {
  const pf = PF(pfId);
  const c = calc(k, pfId);
  const dr = draft(k, pfId, false);
  h += `<section class="pftitle"><div class="row"><span class="sw dot-${pfId}"></span><h1>${esc(pf.name)}</h1></div><span class="small mu" style="padding-left:22px">Valeur avant ce mois : ${eur(pfValue(pfId, addMonthKey(k, -1)))}</span></section>`;
  h += `<section class="sec" style="padding-top:22px" aria-label="Échéances prévues"><div class="sec-h"><h2 class="h3">Échéances prévues</h2><span class="m xs mu">${c.dues.length ? `${c.got} / ${c.dues.length} reçue${c.got > 1 ? 's' : ''}` : '0'}</span></div>`;
  if (!c.dues.length) h += `<p class="small mu" style="margin:0;padding:16px 0;border-bottom:1px solid var(--ln)">Aucune échéance connue ce mois-ci.${pfId === 'lep' ? ' Les intérêts du LEP sont versés le 31 décembre.' : ''}</p>`;
  for (const d of c.dues) {
    const rec = !!dr.rec[d.id];
    h += `<div class="swipe${rec ? ' rec' : ''}" data-due="${d.id}" data-rec="${rec ? 1 : 0}"><div class="bgl" aria-hidden="true">${svg('check', 18, 2.8)}Reçu</div>
      <div class="swipe-fg"><label class="box"><input type="checkbox" class="sr" data-check="${d.id}" ${rec ? 'checked' : ''} aria-label="${esc(d.label)}, ${eur(dueAmount(d))}, ${rec ? 'reçu' : 'à recevoir'}"><span class="b">${rec ? svg('check', 16, 3) : ''}</span></label>
      <span class="stack"><span class="t1">${esc(d.label)}</span><span class="small mu">${dueSub(d)}</span></span>
      <span class="amtcol"><span>${money(dueAmount(d))}</span><span class="stat" style="font-size:10.5px;color:${rec ? 'var(--ok)' : 'var(--mu)'}">${rec ? 'Reçu' : 'À recevoir'}</span></span></div></div>`;
  }
  if (c.dues.length) h += `<span class="xs mu" style="display:flex;align-items:center;gap:6px;padding-top:10px">${svg('arrow', 16)}Balayer vers la droite ou toucher la case</span>`;
  h += `<button type="button" class="linkbtn" data-action="add-due" style="margin-top:8px">+ Échéance non prévue</button>`;
  const late = lateProjects(pfId);
  if (late.length) {
    const n = sum(late, (p) => p.late.count), amt = r2(sum(late, (p) => p.late.amount));
    h += `<div class="group${UI.retOpen ? ' open' : ''}"><button type="button" data-action="toggle-ret" aria-expanded="${UI.retOpen}"><span class="ico er">${svg('alert', 18, 2)}</span><span class="stack"><span style="font-weight:600;font-size:15px">${n} échéances en retard · ${eur(amt)}</span><span class="xs mu">${late.map((p) => `${esc(p.name)} (${p.late.count})`).join(' · ')}</span></span><span class="chev mu">${svg('down', 20, 2)}</span></button>
      ${UI.retOpen ? `<div class="items">${late.map((p) => `<div><span><strong>${esc(p.name)}</strong><span class="mu"> · depuis le ${fmtDay(p.late.since)}</span></span><span style="font-weight:700">${eur(p.late.amount)}</span></div>`).join('')}</div>` : ''}</div>`;
  }
  h += `</section>`;
  if (pf.invest) {
    h += `<section class="sec" style="padding-top:30px" aria-label="Nouveaux investissements"><div class="sec-h"><h2 class="h3">Nouveaux investissements</h2><span class="m xs mu">${c.invs.length}</span></div>
      ${c.invs.map((v) => `<div class="invrow"><span class="stack"><span class="t1">${esc(v.name)}</span><span class="xs mu">${eur(v.amount)} · ${pct(v.rate)} · ${TYPES[v.type].title.toLowerCase()} · ${v.months} mois</span></span><span class="chip ${v.src === 'verse' ? 'ac' : 'ok'}">${v.src === 'verse' ? 'Versement' : 'Réinvesti'}</span><button type="button" class="iconbtn" data-del-inv="${v.id}" aria-label="Retirer ${esc(v.name)}">${svg('x', 18, 2)}</button></div>`).join('')}
      <button type="button" class="btn sec2 full" data-action="add-inv" style="margin-top:12px;font-size:15px">${svg('plus', 18, 2.2)}Ajouter un investissement</button>
      <span class="xs mu" style="padding-top:8px">Nouvel argent versé ou intérêts réinvestis depuis ton compte.</span></section>`;
  }
  h += `<section class="sec" style="padding-top:30px;gap:16px" aria-label="Montants du mois" data-k="${k}" data-pf="${pfId}"><div class="sec-h"><h2 class="h3">Montants du mois</h2><span class="xs mu" style="display:flex;align-items:center;gap:6px"><span class="autotag">Auto</span>= proposé</span></div>
    <div class="fields">${fieldsFor(pf).map((x) => fieldHTML(x, c, dr)).join('')}</div>
    <div class="fld"><label for="f-valeur">Valeur affichée sur la plateforme <span class="mu" style="font-weight:400">facultatif</span></label><input id="f-valeur" class="in txt" inputmode="decimal" autocomplete="off" placeholder="ex. 1 259,00 €" data-plain="valeur" value="${esc(dr.valeur)}"></div>
    <div class="fld"><label for="f-note">Note</label><textarea id="f-note" class="in" rows="2" placeholder="Une remarque sur ce mois ?" data-plain="note">${esc(dr.note)}</textarea></div>
  </section>`;
  h += `<section class="total" aria-label="Total net reçu"><div class="stack" style="gap:4px"><span class="lbl">Total net reçu</span><span class="m xs mu" id="formula">${formula(c)}</span></div><span class="v" id="net">${money(c.net)}</span></section>`;
  const nextLabel = step + 1 < order.length ? 'Ensuite : ' + PF(order[step + 1]).name : 'Rien n’est enregistré avant le récapitulatif';
  const footer = `<div class="footer"><div class="in2"><button type="button" class="btn pri full" id="next" data-step="${step + 1}" ${c.bad ? 'disabled' : ''}>${step + 1 < order.length ? 'Continuer' : 'Voir le récapitulatif'}</button><span class="note" id="nextnote">${c.bad ? 'Corrige le montant en rouge pour continuer' : nextLabel}</span></div></div>`;
  return { html: h, footer };
}
const formula = (c) => `${eur(c.int).replace(NBSP + '€', '')} − ${eur(c.tax).replace(NBSP + '€', '')} + ${eur(c.cap).replace(NBSP + '€', '')}`;
function fieldHTML(x, c, dr) {
  const raw = dr[x.f];
  const isAuto = !!x.auto && (raw === null || raw === undefined);
  const bad = raw !== null && raw !== '' && Number.isNaN(parseAmt(raw));
  const value = isAuto ? eur(c[x.auto]) : (raw ?? '');
  const hint = x.hint ? x.hint(c) : '';
  return `<div class="fld${isAuto ? ' is-auto' : ''}${bad ? ' is-bad' : ''}" data-fld="${x.f}">
    <label for="f-${x.f}">${x.label}</label>
    <span class="inwrap"><input id="f-${x.f}" class="in" inputmode="decimal" autocomplete="off" placeholder="0,00 €" data-f="${x.f}" ${x.auto ? 'data-auto="1"' : ''} value="${esc(value)}" aria-invalid="${bad}"><span class="tag">Auto</span></span>
    <span class="err" ${bad ? '' : 'hidden'}>Montant invalide</span>
    ${hint ? `<span class="hint" ${bad ? 'hidden' : ''}>${hint}</span>` : ''}
    ${x.auto ? `<button type="button" class="reset" data-reset="${x.f}" ${isAuto ? 'hidden' : ''}>Rétablir le calcul (${eur(c[x.auto])})</button>` : ''}
  </div>`;
}
/** Met à jour les montants calculés sans redessiner l'écran (garde le clavier ouvert). */
function refreshNumbers() {
  const sec = document.querySelector('[data-k][data-pf]');
  if (!sec) return;
  const k = sec.dataset.k, pfId = sec.dataset.pf;
  const c = calc(k, pfId), dr = draft(k, pfId, false);
  for (const x of fieldsFor(PF(pfId))) {
    const wrap = sec.querySelector(`[data-fld="${x.f}"]`);
    if (!wrap) continue;
    const el = wrap.querySelector('input');
    const raw = dr[x.f];
    const isAuto = !!x.auto && (raw === null || raw === undefined);
    const bad = raw !== null && raw !== '' && Number.isNaN(parseAmt(raw));
    wrap.classList.toggle('is-auto', isAuto);
    wrap.classList.toggle('is-bad', bad);
    el.setAttribute('aria-invalid', String(bad));
    if (isAuto && document.activeElement !== el) el.value = eur(c[x.auto]);
    wrap.querySelector('.err').hidden = !bad;
    const hn = wrap.querySelector('.hint'); if (hn) { hn.hidden = bad; hn.textContent = x.hint(c); }
    const rs = wrap.querySelector('.reset'); if (rs) { rs.hidden = isAuto; rs.textContent = `Rétablir le calcul (${eur(c[x.auto])})`; }
  }
  document.getElementById('net').innerHTML = money(c.net);
  document.getElementById('formula').textContent = formula(c);
  const nb = document.getElementById('next');
  if (nb) {
    nb.disabled = c.bad;
    const order = ORDER(); const st = order.indexOf(pfId);
    document.getElementById('nextnote').textContent = c.bad ? 'Corrige le montant en rouge pour continuer' : (st + 1 < order.length ? 'Ensuite : ' + PF(order[st + 1]).name : 'Rien n’est enregistré avant le récapitulatif');
  }
}

function stepRecap(h, k, order, saved) {
  const C = Object.fromEntries(order.map((id) => [id, calc(k, id)]));
  const T = (f) => r2(sum(order, (id) => C[id][f]));
  const net = T('net');
  const np = parts(net);
  const anyBad = order.some((id) => C[id].bad);
  h += `<section style="margin:${saved ? '0' : '18px'} 24px 0;padding:22px 0 24px;border-top:${saved ? '0' : '2px solid var(--rule)'};display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="lbl">${monthLabel(k)}</span>${saved ? `<span class="chip ok">${svg('check', 13, 2.8)}Enregistré${D.months[k].savedAt ? ' · ' + new Date(D.months[k].savedAt).toLocaleDateString('fr-FR') : ''}</span>` : '<span class="chip wa">Brouillon</span>'}</div>
    <span class="mu" style="font-size:15px">Total net reçu</span>
    <div class="big"><span class="e">${np.e}</span><span class="c">${np.c}</span></div></section>`;
  h += `<section style="margin:0 24px;border-top:1px solid var(--ln)">${order.map((id) => {
    const c = C[id]; const bits = [];
    if (c.int || c.tax || c.cap || PF(id).taxed) bits.push('brut ' + eur(c.int).replace(NBSP + '€', ''), 'impôts −' + eur(c.tax).replace(NBSP + '€', ''), 'capital ' + eur(c.cap).replace(NBSP + '€', ''));
    if (c.verse) bits.push('versé ' + eur(c.verse).replace(NBSP + '€', ''));
    if (c.retire) bits.push('retiré ' + eur(c.retire).replace(NBSP + '€', ''));
    if (c.pertes) bits.push('pertes ' + eur(c.pertes).replace(NBSP + '€', ''));
    if (!bits.length) bits.push('rien ce mois-ci');
    return `<div class="recrow"><span class="top"><span style="display:flex;align-items:center;gap:10px;font-weight:600;font-size:16px"><span class="sw dot-${id}"></span>${esc(PF(id).name)}</span><span style="font-weight:700">${money(c.net)}</span></span><span class="m xs mu" style="padding-left:20px">${bits.join(' · ')}</span>${C[id].bad ? '<span class="xs c-er" style="padding-left:20px;font-weight:600">Montant invalide à corriger</span>' : ''}</div>`;
  }).join('')}</section>`;
  h += `<section class="tot3" style="margin:0 24px"><div><span class="lbl" style="font-size:10px">Intérêts bruts</span><span class="v">${money(T('int'))}</span></div><div><span class="lbl" style="font-size:10px">Impôts</span><span class="v">${money(T('tax'))}</span></div><div><span class="lbl" style="font-size:10px">Capital</span><span class="v">${money(T('cap'))}</span></div></section>`;
  h += `<section style="margin:0 24px"><div class="kv"><span>Versé ce mois</span><strong>${eur(T('verse'))}</strong></div><div class="kv"><span>Retiré ce mois</span><strong>${eur(T('retire'))}</strong></div><div class="kv"><span>Pertes</span><strong>${eur(T('pertes'))}</strong></div></section>`;
  const invs = D.invs.filter((v) => v.month === k);
  if (invs.length) h += `<section class="sec" style="padding-top:28px"><div class="sec-h"><h2 class="h3">Nouveaux projets</h2></div>${invs.map((v) => `<div class="invrow" style="grid-template-columns:1fr auto"><span class="stack"><span style="display:flex;align-items:center;gap:8px;font-weight:600"><span class="sw dot-${v.pf}" style="width:8px;height:8px"></span>${esc(v.name)}</span><span class="xs mu" style="padding-left:16px">${eur(v.amount)} · ${pct(v.rate)} · ${TYPES[v.type].title.toLowerCase()}</span></span><span class="chip ${v.src === 'verse' ? 'ac' : 'ok'}">${v.src === 'verse' ? 'Versement' : 'Réinvesti'}</span></div>`).join('')}</section>`;
  const pend = [];
  for (const id of order) for (const d of C[id].dues) if (!draft(k, id, false).rec[d.id]) pend.push(d);
  const late = lateProjects();
  h += `<section class="sec" style="padding-top:28px;padding-bottom:12px"><div class="sec-h"><h2 class="h3">Toujours en attente</h2></div>
    ${pend.map((d) => `<div class="kv"><span class="stack"><span style="font-weight:600;font-size:15px">${esc(d.label)}</span><span class="xs c-wa" style="font-weight:600">Non reçue ce mois-ci</span></span><strong>${eur(dueAmount(d))}</strong></div>`).join('')}
    ${late.length ? `<div class="kv"><span class="stack"><span style="font-weight:600;font-size:15px">${sum(late, (p) => p.late.count)} échéances en retard</span><span class="xs c-er" style="font-weight:600">${late.map((p) => esc(p.name)).join(' · ')}</span></span><strong>${eur(r2(sum(late, (p) => p.late.amount)))}</strong></div>` : ''}
    ${!pend.length && !late.length ? '<p class="small mu">Rien en attente.</p>' : ''}</section>`;
  const footer = saved
    ? `<div class="footer"><div class="in2"><div style="display:grid;grid-template-columns:1fr 1.4fr;gap:10px"><button type="button" class="btn sec2" data-action="unsave">Modifier</button><button type="button" class="btn pri" data-go="home">Accueil</button></div></div></div>`
    : `<div class="footer"><div class="in2"><button type="button" class="btn pri full" data-action="save-month" ${anyBad ? 'disabled' : ''}>Enregistrer ${MOIS[ym(k).m - 1]}</button><span class="note">${anyBad ? 'Un montant est invalide : reviens à l’étape concernée' : 'Annulation possible pendant 5 secondes'}</span></div></div>`;
  return { html: h, footer };
}

// ---- Projets
function viewProjects() {
  const f = UI.filter;
  const match = (p) => f === 'all' || (f === 'watch' ? !!p.late : p.pf === f);
  const list = D.projects.filter(match);
  const watch = list.filter((p) => p.late && p.status !== 'rembourse');
  const run = list.filter((p) => !p.late && p.status !== 'rembourse');
  const done = list.filter((p) => p.status === 'rembourse');
  let h = `<header class="pagehead"><div class="stack" style="gap:2px"><h1 class="h1">Projets</h1><span class="small mu">${D.projects.filter((p) => p.status !== 'rembourse').length} en cours · ${D.projects.filter((p) => p.status === 'rembourse').length} remboursé(s)</span></div></header>`;
  const chips = [['all', 'Tous'], ['watch', `À surveiller · ${lateProjects().length}`], ...D.platforms.filter((p) => p.invest).map((p) => [p.id, p.short])];
  h += `<div class="filters" role="group" aria-label="Filtres">${chips.map(([id, l]) => `<button type="button" class="fchip" data-filter="${id}" aria-pressed="${f === id}">${id !== 'all' && id !== 'watch' ? `<span class="sw dot-${id}" style="width:8px;height:8px"></span>` : ''}${l}</button>`).join('')}</div>`;
  const group = (title, arr) => arr.length ? `<section style="padding:14px 24px 8px;display:flex;flex-direction:column;gap:10px"><div class="ghead"><h2 class="lbl" style="margin:0;color:var(--ink)">${title}</h2><span class="m xs mu">${arr.length}</span></div>${arr.map(projCard).join('')}</section>` : '';
  h += group('À surveiller', watch) + group('En cours', run);
  if (!watch.length && !run.length) h += `<p class="small mu" style="padding:16px 24px">Aucun projet pour ce filtre.${f === 'bp' ? ' Ajoute tes prêts BienPrêter depuis le bilan du mois.' : ''}</p>`;
  if (done.length) {
    h += `<section style="padding:14px 24px 0"><button type="button" class="setrow" data-action="toggle-repaid" aria-expanded="${UI.showRepaid}"><span class="lbl" style="color:var(--ink)">Remboursés</span><span class="m xs mu" style="display:flex;align-items:center;gap:8px">${done.length}<span class="chev" style="${UI.showRepaid ? 'transform:rotate(180deg)' : ''}">${svg('down', 18, 2)}</span></span></button>
      ${UI.showRepaid ? `<div style="display:flex;flex-direction:column;gap:10px;padding-top:10px">${done.map(projCard).join('')}</div>` : ''}</section>`;
  }
  return { html: h };
}
function nextDueOf(p) { return D.dues.filter((d) => d.project === p.id && d.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))[0]; }
function projCard(p) {
  const sev = p.late ? (p.late.count >= 6 ? 'er' : 'wa') : null;
  const chip = p.status === 'rembourse' ? '<span class="chip out">Remboursé</span>' : sev ? `<span class="chip ${sev}">Retard · ${p.late.count} éch.</span>` : '<span class="chip mu">En cours</span>';
  const nx = nextDueOf(p);
  const cl = capLeft(p);
  let prog = '';
  if (p.start && p.end) {
    const t0 = Date.parse(p.start), t1 = Date.parse(p.end), t = Date.parse(TODAY);
    const v = Math.max(0, Math.min(100, Math.round((t - t0) / (t1 - t0) * 100)));
    prog = `<span class="prog"><span style="width:${v}%;background:${sev ? `var(--${sev})` : 'var(--ink)'}"></span></span>`;
  }
  const left = p.end ? Math.max(0, Math.round((Date.parse(p.end) - Date.parse(TODAY)) / (30.44 * 864e5))) : null;
  return `<button type="button" class="pcard ${sev || ''}" data-proj="${p.id}">
    <span class="top"><span class="nm">${esc(p.name)}</span>${chip}</span>
    <span class="small mu" style="display:flex;align-items:center;gap:7px"><span class="sw dot-${p.pf}" style="width:8px;height:8px"></span>${esc(PF(p.pf).name)} · ${p.note ? esc(p.note) : eur(p.amount)} · ${pct(p.rate)}${p.type ? ' · ' + TYPES[p.type].title.toLowerCase() : ''}</span>
    ${p.status === 'rembourse' ? '' : `<span class="two"><span class="stack" style="gap:2px"><span class="lbl">Capital restant</span><span style="font-size:15px;font-weight:700">${cl === null || cl === undefined ? '<span class="mu" style="font-weight:500">à saisir</span>' : eur(cl)}</span></span>
      <span class="stack" style="gap:2px"><span class="lbl">Prochaine échéance</span><span style="font-size:14px">${nx ? `${eur(dueAmount(nx))} · ${fmtDay(nx.date)}` : p.end ? 'à la fin du projet' : '—'}</span></span></span>
      ${prog}<span class="m xs mu" style="display:flex;justify-content:space-between"><span>${p.end ? 'fin ' + shortDate(p.end) : 'date de fin à saisir'}</span><span>${left !== null ? left + ' mois restants' : ''}</span></span>`}
  </button>`;
}

// ---- Projection (modèle simple)
function projCalc() {
  const P = UI.proj;
  const monthly = parseAmt(P.monthly), rate = parseAmt(P.rate), years = parseInt(P.years, 10), loss = parseAmt(P.loss);
  if ([monthly, rate, loss].some((x) => x === null || Number.isNaN(x)) || !(years >= 1 && years <= 40)) return null;
  let bal = pfValue('bp'), paid = bal, taxes = 0;
  const startBal = bal;
  for (let i = 0; i < years * 12; i++) {
    bal += monthly; paid += monthly;
    const gross = bal * rate / 100 / 12;
    const tx = gross * TAX;
    taxes += tx;
    bal += gross - tx - bal * loss / 100 / 12;
  }
  const end = addMonthKey(monthOf(TODAY), years * 12);
  return { end, value: r2(bal), gain: r2(bal - paid), taxes: r2(taxes), paid: r2(paid), startBal };
}
function viewProjection() {
  const r = projCalc();
  let h = `<header class="pagehead"><div class="stack" style="gap:2px"><h1 class="h1">Projection</h1><span class="small mu">BienPrêter · intérêts réinvestis chaque mois</span></div></header>`;
  h += `<section class="hero" id="proj-out">${projOut(r)}</section>`;
  h += `<section class="sec" style="padding-top:8px;gap:16px"><div class="sec-h"><h2 class="h3">Hypothèses</h2></div>
    <div class="fields">
      <div class="fld"><label for="p-monthly">Versement mensuel</label><span class="inwrap"><input id="p-monthly" class="in" inputmode="decimal" data-proj-in="monthly" value="${esc(UI.proj.monthly)}"><span class="unit">€</span></span></div>
      <div class="fld"><label for="p-rate">Taux brut</label><span class="inwrap"><input id="p-rate" class="in" inputmode="decimal" data-proj-in="rate" value="${esc(UI.proj.rate)}"><span class="unit">%</span></span></div>
      <div class="fld"><label for="p-years">Durée</label><span class="inwrap"><input id="p-years" class="in" inputmode="numeric" data-proj-in="years" value="${esc(UI.proj.years)}"><span class="unit">ans</span></span></div>
      <div class="fld"><label for="p-loss">Pertes / an</label><span class="inwrap"><input id="p-loss" class="in" inputmode="decimal" data-proj-in="loss" value="${esc(UI.proj.loss)}"><span class="unit">%</span></span></div>
    </div>
    <span class="xs mu">Modèle simple : part de la valeur actuelle de BienPrêter, impôt de 31,4 % prélevé sur chaque intérêt. Les aires empilées par plateforme arriveront dans une prochaine version.</span></section>`;
  return { html: h };
}
function projOut(r) {
  if (!r) return '<span class="small c-er" style="font-weight:600">Vérifie les hypothèses : un montant est invalide.</span>';
  const p = parts(r.value);
  return `<span class="lbl">Valeur au retrait · ${MOIS_C[ym(r.end).m - 1]} ${ym(r.end).y}</span>
    <div class="big"><span class="e">${p.e}</span><span class="c">${p.c}</span></div>
    <div class="tot3" style="border-top:1px solid var(--ln);border-bottom:1px solid var(--ln)"><div><span class="lbl" style="font-size:10px">Versé au total</span><span class="v">${money(r.paid)}</span></div><div><span class="lbl" style="font-size:10px">Gain net</span><span class="v">${money(r.gain)}</span></div><div><span class="lbl" style="font-size:10px">Impôts</span><span class="v">${money(r.taxes)}</span></div></div>`;
}

// ---- Impôts
function viewImpots() {
  const y = TODAY.slice(0, 4);
  const ms = savedMonths().filter((k) => k.startsWith(y));
  let brut = 0, tax = 0, pertes = 0;
  for (const k of ms) for (const id of ORDER()) { const c = calc(k, id); if (PF(id).taxed) { brut += c.int; tax += c.tax; } pertes += c.pertes; }
  brut = r2(brut); tax = r2(tax); pertes = r2(pertes);
  const ps = r2(tax * PS / TAX), ac = r2(tax - ps);
  let h = `<div class="topbar"><button type="button" class="iconbtn" data-go="home" aria-label="Retour">${svg('left', 22, 2)}</button><span></span><span></span></div>
    <section style="padding:0 24px 16px;border-bottom:2px solid var(--rule)" class="stack"><h1 class="h1">Impôts ${y}</h1><span class="small mu">Revenus ${y} · déclaration au printemps ${+y + 1}</span></section>
    <div class="banner info" style="margin:14px 24px 0">${svg('info', 20)}<span class="small">Calculé sur ${ms.length} mois enregistré(s). Les montants se complètent à chaque bilan.</span></div>
    <section style="padding:20px 24px 0">
      <div class="kv"><span>Intérêts bruts</span><strong style="font-size:17px">${money(brut)}</strong></div>
      <div class="kv"><span class="stack"><span>Prélèvements sociaux</span><span class="m xs mu">18,6 % · prélevés à la source</span></span><strong style="font-size:17px">${money(ps)}</strong></div>
      <div class="kv"><span class="stack"><span>Acompte d'impôt versé</span><span class="m xs mu">12,8 % · prélevé à la source</span></span><strong style="font-size:17px">${money(ac)}</strong></div>
      <div class="kv"><span>Pertes reportables</span><strong style="font-size:17px">${money(pertes)}</strong></div>
      <div class="kv" style="border-bottom:2px solid var(--rule)"><span class="stack"><span>LEP</span><span class="xs mu">exonéré · rien à déclarer</span></span><span class="chip ok">${svg('check', 12, 2.8)}Exonéré</span></div>
    </section>
    <section style="margin:26px 24px 0;background:var(--sf);border:1px solid var(--ln);border-radius:4px;padding:16px" class="stack">
      <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:6px"><h2 class="h3">À reporter sur la 2042</h2><span class="autotag">Auto</span></div>
      <div class="kv" style="border-top:1px solid var(--ln);border-bottom:0;min-height:58px"><span style="display:flex;align-items:center;gap:12px"><span class="m" style="border:1.5px solid var(--ink);border-radius:3px;padding:5px 8px">2TR</span><span class="xs mu">Intérêts et revenus assimilés</span></span><strong class="c-ac" style="font-size:18px">${eur(brut)}</strong></div>
      <div class="kv" style="border-top:1px solid var(--ln);border-bottom:0;min-height:58px"><span style="display:flex;align-items:center;gap:12px"><span class="m" style="border:1.5px solid var(--ink);border-radius:3px;padding:5px 8px">2CK</span><span class="xs mu">Acompte de 12,8 % déjà versé</span></span><strong class="c-ac" style="font-size:18px">${eur(ac)}</strong></div>
      <span class="xs mu" style="padding-top:6px">À vérifier avec les relevés fiscaux (IFU) des plateformes.</span>
    </section>`;
  return { html: h };
}

// ---- Réglages
function viewSettings() {
  const seg = (name, val, opts) => `<div class="seg" role="radiogroup" style="grid-template-columns:repeat(${opts.length},minmax(0,1fr))">${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${val === v}" data-set="${name}" data-val="${v}">${l}</button>`).join('')}</div>`;
  let h = `<header class="pagehead"><h1 class="h1">Réglages</h1></header>`;
  h += `<section class="sec" style="padding-top:22px"><h2 class="lbl" style="margin:0 0 6px">Plateformes</h2><div style="border-top:1px solid var(--ln)">${D.platforms.map((p) => `<div class="setrow"><span style="display:flex;align-items:center;gap:12px"><span class="sw dot-${p.id}" style="width:22px;height:22px"></span><span class="stack" style="gap:1px"><span style="font-weight:600">${esc(p.name)}</span><span class="xs mu">${esc(p.kind)}</span></span></span><span class="m xs mu">${p.taxed ? '31,4 %' : 'exonéré'}</span></div>`).join('')}</div>
    <span class="xs mu" style="padding-top:8px">Ajouter, renommer ou archiver une plateforme : prochaine version.</span></section>`;
  h += `<section class="sec" style="padding-top:26px"><h2 class="lbl" style="margin:0 0 6px">Fiscalité</h2><div class="kv" style="border-top:1px solid var(--ln)"><span>Mode d'imposition</span><strong>Flat tax · 31,4 %</strong></div><button type="button" class="setrow" data-go="impots"><span>Impôts ${TODAY.slice(0, 4)}</span><span class="mu">${svg('right')}</span></button></section>`;
  h += `<section class="sec" style="padding-top:26px"><h2 class="lbl" style="margin:0 0 6px">Données</h2><div style="border-top:1px solid var(--ln)">
    <button type="button" class="setrow" data-action="export"><span style="display:flex;align-items:center;gap:12px">${svg('dl', 22, 1.8)}<span class="stack" style="gap:1px"><span>Exporter une sauvegarde</span><span class="xs mu">Fichier .json à garder hors du téléphone</span></span></span><span class="m xs mu">.json</span></button>
    <label class="setrow" style="cursor:pointer"><span style="display:flex;align-items:center;gap:12px">${svg('up', 22, 1.8)}<span class="stack" style="gap:1px"><span>Restaurer une sauvegarde</span><span class="xs mu">Remplace les données actuelles</span></span></span><span class="m xs mu">.json</span><input type="file" accept="application/json,.json" class="sr" data-action="import"></label>
    <div class="setrow"><span class="stack" style="gap:1px"><span>Stockage persistant</span><span class="xs mu" id="persist">Vérification…</span></span><span></span></div>
    <button type="button" class="setrow" data-action="reset"><span class="c-er" style="font-weight:600">Repartir des données de départ</span><span></span></button>
  </div></section>`;
  h += `<section class="sec" style="padding-top:26px;gap:12px"><h2 class="lbl" style="margin:0">Apparence</h2><span>Thème</span>${seg('theme', D.theme, [['system', 'Système'], ['light', 'Clair'], ['dark', 'Sombre']])}<span>Animations</span>${seg('motion', D.motion, [['system', 'Système'], ['reduce', 'Réduites']])}</section>`;
  h += `<p class="m xs mu" style="padding:24px 24px 0">Mon Épargne · v0.1 (test) · données sur cet appareil uniquement</p>`;
  setTimeout(() => {
    const el = document.getElementById('persist');
    if (!el) return;
    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then((p) => { el.textContent = p ? 'Accordé : le navigateur ne videra pas les données' : 'Non accordé : installe l’app et exporte régulièrement'; });
    else el.textContent = 'Non disponible sur ce navigateur';
  }, 0);
  return { html: h };
}

// ---------------------------------------------------------------- Feuilles modales
function renderSheet() {
  const box = document.getElementById('sheet');
  const s = UI.sheet;
  if (!s) { box.innerHTML = ''; document.body.style.overflow = ''; return; }
  document.body.style.overflow = 'hidden';
  if (s.type === 'inv') box.innerHTML = sheetInv(s);
  else if (s.type === 'due') box.innerHTML = sheetDue(s);
  else if (s.type === 'proj') box.innerHTML = sheetProj(s);
}
const shell = (title, sub, body, foot, label) => `<button type="button" class="scrim" data-action="close-sheet" aria-label="Fermer"></button>
  <div class="panel" role="dialog" aria-modal="true" aria-label="${esc(label || title)}"><form data-form="1" novalidate>
  <div class="grab"><span></span></div>
  <header class="shead"><span class="stack" style="gap:4px"><span style="font-size:22px;font-weight:800;letter-spacing:-.03em">${title}</span>${sub}</span><button type="button" class="iconbtn boxed" data-action="close-sheet" aria-label="Fermer">${svg('x', 18, 2)}</button></header>
  <div class="sbody">${body}</div>${foot ? `<div class="sfoot">${foot}</div>` : ''}</form></div>`;
const pfSub = (pfId, k) => `<span class="small mu" style="display:flex;align-items:center;gap:7px"><span class="sw dot-${pfId}" style="width:8px;height:8px"></span>${esc(PF(pfId).name)}${k ? ' · ' + monthLabel(k).toLowerCase() : ''}</span>`;
const errSpan = (s, key, msg) => `<span class="err xs c-er" data-err="${key}" style="font-weight:600" ${s.tried && s.errs && s.errs[key] ? '' : 'hidden'}>${msg}</span>`;

function sheetInv(s) {
  const body = `
    <div class="fld"><label for="s-name">Nom du projet</label><input id="s-name" class="in txt" autocomplete="off" placeholder="ex. Le Duroc" data-s="name" value="${esc(s.name)}">${errSpan(s, 'name', 'Donne un nom au projet')}</div>
    <div class="fields">
      <div class="fld"><label for="s-amt">Montant</label><input id="s-amt" class="in" inputmode="decimal" autocomplete="off" placeholder="0,00 €" data-s="amt" value="${esc(s.amt)}">${errSpan(s, 'amt', 'Montant invalide')}</div>
      <div class="fld"><label for="s-rate">Taux annuel brut</label><span class="inwrap"><input id="s-rate" class="in" inputmode="decimal" autocomplete="off" placeholder="0,0" data-s="rate" value="${esc(s.rate)}" style="padding-right:34px"><span class="unit">%</span></span>${errSpan(s, 'rate', 'Taux invalide')}</div>
    </div>
    <div class="stack" role="radiogroup" aria-label="Type de remboursement" style="gap:8px"><span style="font-size:13px;font-weight:600">Remboursement</span>
      ${Object.entries(TYPES).map(([k, t]) => `<button type="button" class="radio" role="radio" aria-checked="${s.kind === k}" data-s-kind="${k}"><span class="r"></span><span class="stack" style="gap:2px"><span style="font-weight:600;font-size:15px">${t.title}</span><span class="xs mu">${t.sub}</span></span></button>`).join('')}</div>
    <div class="fields">
      <div class="fld"><label for="s-months">Durée</label><span class="inwrap"><input id="s-months" class="in" inputmode="numeric" autocomplete="off" placeholder="24" data-s="months" value="${esc(s.months)}" style="padding-right:54px"><span class="unit" style="font-size:14px">mois</span></span>${errSpan(s, 'months', 'Entre 1 et 240 mois')}</div>
      <div class="fld"><label for="s-start">Date de début</label><input id="s-start" class="in txt" inputmode="numeric" autocomplete="off" placeholder="jj/mm/aaaa" data-s="start" value="${esc(s.start)}">${errSpan(s, 'start', 'Format jj/mm/aaaa')}</div>
    </div>
    <div class="stack" style="gap:8px"><span style="font-size:13px;font-weight:600">Origine de l'argent</span>
      <div class="seg" role="radiogroup" aria-label="Origine de l'argent" style="grid-template-columns:repeat(2,minmax(0,1fr))"><button type="button" role="radio" aria-checked="${s.src === 'verse'}" data-s-src="verse">Nouveau versement</button><button type="button" role="radio" aria-checked="${s.src === 'reinv'}" data-s-src="reinv">Réinvesti</button></div>
      <span class="xs mu">${s.src === 'verse' ? 'Ajouté au champ « Versé » du mois : ton patrimoine augmente.' : 'Pris sur le solde de ton compte (intérêts reçus) : ton patrimoine ne change pas.'}</span></div>
    <div id="preview">${invPreview(s)}</div>`;
  const foot = `<button type="button" class="btn sec2" data-action="close-sheet">Annuler</button><button type="submit" class="btn pri">Ajouter</button>`;
  return shell('Nouvel investissement', pfSub(s.pf, s.month), body, foot);
}
function invValidate(s) {
  const amt = parseAmt(s.amt), rate = parseAmt(s.rate);
  const months = /^\d{1,3}$/.test(String(s.months).trim()) ? parseInt(s.months, 10) : NaN;
  const start = parseFrDate(s.start);
  const errs = {
    name: !String(s.name).trim(), amt: !(amt > 0), rate: !(rate > 0 && rate <= 100),
    months: !(months >= 1 && months <= 240), start: !start
  };
  return { ok: !Object.values(errs).some(Boolean), errs, amt, rate, months, start };
}
function schedule(amount, rate, n, type) {
  const i = rate / 100 / 12;
  if (type === 'amort') {
    const pay = i === 0 ? amount / n : amount * i / (1 - Math.pow(1 + i, -n));
    return { pay: r2(pay), first: r2(amount * i), totalInt: r2(pay * n - amount) };
  }
  return { pay: type === 'mens' ? r2(amount * i) : 0, first: 0, totalInt: r2(amount * rate / 100 * n / 12) };
}
function invPreview(s) {
  const v = invValidate(s);
  if (v.errs.amt || v.errs.rate || v.errs.months) return '';
  const sc = schedule(v.amt, v.rate, v.months, s.kind);
  const p1 = s.kind === 'fine' ? `À la fin : ${eur(v.amt)} + ${eur(sc.totalInt)} d’intérêts` : s.kind === 'mens' ? `Chaque mois : ${eur(sc.pay)} d’intérêts bruts` : `Chaque mois : ${eur(sc.pay)} (capital + intérêts)`;
  const end = v.start ? addMonthsISO(v.start, v.months) : null;
  return `<div class="preview" aria-live="polite"><span class="lbl" style="font-size:10px;color:var(--ac)">Aperçu · calculé</span><span style="font-size:15px;font-weight:700">${p1}</span><span class="small">Intérêts sur la durée : ${eur(sc.totalInt)} bruts · ${eur(r2(sc.totalInt * (1 - TAX)))} nets</span><span class="small mu">Fin prévue : ${end ? fmtDay(end, true) : '—'}${s.kind === 'mens' ? ' · capital rendu à la fin' : ''}${s.kind === 'amort' ? ` · 1re échéance : ${eur(sc.first)} d’intérêts` : ''}</span></div>`;
}
function genDues(inv) {
  const out = [];
  const i = inv.rate / 100 / 12, n = inv.months;
  if (inv.type === 'fine') out.push({ date: addMonthsISO(inv.start, n), int: r2(inv.amount * inv.rate / 100 * n / 12), cap: inv.amount });
  else if (inv.type === 'mens') { const m = r2(inv.amount * i); for (let j = 1; j <= n; j++) out.push({ date: addMonthsISO(inv.start, j), int: m, cap: j === n ? inv.amount : 0 }); }
  else {
    const pay = i === 0 ? inv.amount / n : inv.amount * i / (1 - Math.pow(1 + i, -n));
    let bal = inv.amount;
    for (let j = 1; j <= n; j++) { const it = r2(bal * i); let cp = r2(pay - it); if (j === n) cp = r2(bal); bal = r2(bal - cp); out.push({ date: addMonthsISO(inv.start, j), int: it, cap: cp }); }
  }
  return out.map((d, j) => ({ id: `d-${inv.id}-${j}`, date: d.date, pf: inv.pf, project: inv.id, label: inv.name, int: d.int, cap: d.cap }));
}
function submitInv() {
  const s = UI.sheet;
  const v = invValidate(s);
  if (!v.ok) { s.tried = true; s.errs = v.errs; renderSheet(); return; }
  const id = 'p' + Date.now().toString(36);
  const inv = { id, month: s.month, pf: s.pf, name: String(s.name).trim(), amount: v.amt, rate: v.rate, type: s.kind, months: v.months, start: v.start, src: s.src };
  UI.sheet = null;
  withUndo('Ajouté · ' + inv.name, () => {
    D.invs.push(inv);
    D.projects.push({ id, pf: s.pf, name: inv.name, amount: inv.amount, rate: inv.rate, type: inv.type, start: inv.start, end: addMonthsISO(inv.start, inv.months), status: 'en_cours', capLeft: inv.amount, own: true });
    D.dues.push(...genDues(inv));
  });
}
function removeInv(id) {
  const inv = D.invs.find((v) => v.id === id);
  withUndo('Retiré · ' + (inv ? inv.name : ''), () => {
    D.invs = D.invs.filter((v) => v.id !== id);
    D.projects = D.projects.filter((p) => p.id !== id);
    D.dues = D.dues.filter((d) => d.project !== id);
  });
}

function sheetDue(s) {
  const body = `<p class="small mu" style="margin:0">Une échéance reçue que l'app ne connaissait pas. Elle est ajoutée au mois et cochée « reçue ».</p>
    <div class="fld"><label for="s-label">Projet</label><input id="s-label" class="in txt" autocomplete="off" placeholder="ex. La Julia" data-s="label" value="${esc(s.label)}">${errSpan(s, 'label', 'Indique le projet')}</div>
    <div class="fields">
      <div class="fld"><label for="s-total">Montant reçu</label><input id="s-total" class="in" inputmode="decimal" autocomplete="off" placeholder="0,00 €" data-s="total" value="${esc(s.total)}">${errSpan(s, 'total', 'Montant invalide')}</div>
      <div class="fld"><label for="s-capd">Dont capital</label><input id="s-capd" class="in" inputmode="decimal" autocomplete="off" placeholder="0,00 €" data-s="capd" value="${esc(s.capd)}">${errSpan(s, 'capd', 'Doit être ≤ au montant')}</div>
    </div>
    <div class="fld"><label for="s-date">Date</label><input id="s-date" class="in txt" inputmode="numeric" autocomplete="off" placeholder="jj/mm/aaaa" data-s="date" value="${esc(s.date)}">${errSpan(s, 'date', 'Date du mois, au format jj/mm/aaaa')}</div>`;
  return shell('Échéance non prévue', pfSub(s.pf, s.month), body, `<button type="button" class="btn sec2" data-action="close-sheet">Annuler</button><button type="submit" class="btn pri">Ajouter</button>`);
}
function submitDue() {
  const s = UI.sheet;
  const total = parseAmt(s.total), capd = parseAmt(s.capd || '0'), date = parseFrDate(s.date);
  const errs = { label: !String(s.label).trim(), total: !(total > 0), capd: Number.isNaN(capd) || capd === null || capd > total, date: !date || monthOf(date) !== s.month };
  if (Object.values(errs).some(Boolean)) { s.tried = true; s.errs = errs; renderSheet(); return; }
  const id = 'd-x' + Date.now().toString(36);
  UI.sheet = null;
  withUndo('Échéance ajoutée', () => {
    D.dues.push({ id, date, pf: s.pf, project: null, label: String(s.label).trim(), int: r2(total - capd), cap: r2(capd) });
    draft(s.month, s.pf, true).rec[id] = true;
  });
}

function sheetProj(s) {
  const p = PROJ(s.id);
  if (!p) return '';
  const cl = capLeft(p);
  const dues = D.dues.filter((d) => d.project === p.id).sort((a, b) => b.date.localeCompare(a.date));
  const st = (d) => receivedDue(d.id) ? ['ok', 'Reçue'] : d.date < TODAY ? ['er', 'Non reçue'] : ['mu', 'À venir'];
  let body = '';
  if (p.late) body += `<div class="banner er" role="alert">${svg('alert', 22, 2)}<span class="stack" style="gap:2px"><span style="font-weight:700">En retard depuis le ${fmtDay(p.late.since, true)}</span><span class="small" style="font-weight:500">${p.late.count} échéance(s) non reçue(s) · ${eur(p.late.amount)}</span></span></div>`;
  body += `<div class="tot3" style="border-top:1px solid var(--ln);border-bottom:1px solid var(--ln)"><div><span class="lbl" style="font-size:10px">Investi</span><span class="v">${money(p.amount)}</span></div><div><span class="lbl" style="font-size:10px">Capital restant</span><span class="v">${cl === null || cl === undefined ? '<span class="mu" style="font-size:14px">à saisir</span>' : money(cl)}</span></div><div><span class="lbl" style="font-size:10px">Intérêts reçus</span><span class="v">${p.received !== undefined ? money(p.received) : '<span class="mu" style="font-size:14px">—</span>'}</span></div></div>`;
  body += `<div class="stack" style="gap:8px">
    ${p.late ? `<button type="button" class="btn sec2 full" data-action="proj-normal" style="color:var(--ok);border-color:var(--ok)">${svg('check', 18, 2.2)}Revenu à la normale</button>` : `<button type="button" class="btn sec2 full" data-action="proj-late">${svg('clock', 18, 2)}Signaler un retard</button>`}
    ${p.status !== 'rembourse' ? `<button type="button" class="btn sec2 full" data-action="proj-repaid">Marquer comme remboursé</button>` : ''}
    ${p.own ? `<button type="button" class="btn dan full" data-action="proj-delete">Supprimer ce projet</button>` : ''}</div>`;
  body += `<div class="stack" style="gap:0"><div class="sec-h" style="padding-bottom:8px"><h2 class="h3">Échéances connues</h2><span class="m xs mu">${dues.length}</span></div>
    ${dues.slice(0, 40).map((d) => { const [c, l] = st(d); return `<div class="kv" style="min-height:44px"><span class="m xs mu" style="width:70px">${shortDate(d.date)}</span><span style="flex:1"><strong>${eur(dueAmount(d))}</strong> <span class="xs mu">${d.cap && d.int ? 'capital + intérêts' : d.cap ? 'capital' : 'intérêts'}</span></span><span class="chip ${c}">${l}</span></div>`; }).join('') || '<p class="small mu">Aucune échéance enregistrée pour ce projet.</p>'}</div>`;
  const sub = `<span class="small mu" style="display:flex;align-items:center;gap:7px"><span class="sw dot-${p.pf}" style="width:8px;height:8px"></span>${esc(PF(p.pf).name)} · ${pct(p.rate)}${p.end ? ' · fin ' + frDate(p.end) : ''}</span>`;
  return shell(esc(p.name), sub, body, '', p.name);
}

// ---------------------------------------------------------------- Actions
function markDue(id, v) {
  const d = D.dues.find((x) => x.id === id);
  const k = monthOf(d.date);
  draft(k, d.pf, true).rec[id] = v;
  save(); render();
  if (v) toast('Reçu · ' + d.label, { action: 'Annuler', onAction: () => { draft(k, d.pf, true).rec[id] = false; save(); render(); } });
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-go], [data-proj]');
  if (!t) return;
  const ds = t.dataset;
  if (ds.toast) return;
  if (ds.go) {
    const opts = {};
    if (ds.month) opts.month = ds.month;
    if (ds.filter) opts.filter = ds.filter;
    if (ds.go === 'month' && !ds.month) { opts.month = UI.month; }
    if (ds.go === 'month') opts.step = 0;
    go(ds.go, opts); return;
  }
  if (ds.proj && !ds.action) { UI.sheet = { type: 'proj', id: ds.proj }; renderSheet(); return; }
  if (ds.monthShift) { UI.month = addMonthKey(UI.month, +ds.monthShift); UI.step = 0; render(); window.scrollTo(0, 0); return; }
  if (ds.step !== undefined && !t.disabled) { UI.step = +ds.step; render(); window.scrollTo(0, 0); return; }
  if (ds.filter) { UI.filter = ds.filter; render(); return; }
  if (ds.bar !== undefined) { const i = +ds.bar; UI.barSel = UI.barSel === i ? null : i; render(); return; }
  if (ds.reset) {
    const sec = t.closest('[data-k]'); draft(sec.dataset.k, sec.dataset.pf, true)[ds.reset] = null; save(); refreshNumbers(); return;
  }
  if (ds.delInv) { removeInv(ds.delInv); return; }
  if (ds.set) { D[ds.set] = ds.val; save(); render(); return; }
  if (ds.sKind) { UI.sheet.kind = ds.sKind; renderSheet(); return; }
  if (ds.sSrc) { UI.sheet.src = ds.sSrc; renderSheet(); return; }
  const a = ds.action;
  if (!a) return;
  const order = ORDER();
  if (a === 'close-sheet') { UI.sheet = null; renderSheet(); }
  else if (a === 'toggle-ret') { UI.retOpen = !UI.retOpen; render(); }
  else if (a === 'toggle-repaid') { UI.showRepaid = !UI.showRepaid; render(); }
  else if (a === 'add-inv') {
    const pf = order[UI.step];
    UI.sheet = { type: 'inv', pf, month: UI.month, name: '', amt: '', rate: '', kind: pf === 'bp' ? 'mens' : 'fine', months: '', start: frDate(UI.month === monthOf(TODAY) ? TODAY : UI.month + '-01'), src: 'verse', tried: false };
    renderSheet();
  } else if (a === 'add-due') {
    UI.sheet = { type: 'due', pf: order[UI.step], month: UI.month, label: '', total: '', capd: '', date: frDate(UI.month === monthOf(TODAY) ? TODAY : UI.month + '-01'), tried: false };
    renderSheet();
  } else if (a === 'save-month') {
    const k = UI.month;
    withUndo(`${cap1(MOIS[ym(k).m - 1])} enregistré`, () => {
      if (!D.months[k]) D.months[k] = { saved: false, pf: {} };
      D.months[k].saved = true; D.months[k].savedAt = new Date().toISOString();
    });
  } else if (a === 'unsave') { D.months[UI.month].saved = false; UI.step = order.length; save(); render(); }
  else if (a === 'export') exportData();
  else if (a === 'reset') {
    if (confirm('Effacer toutes tes saisies et repartir des données de départ ?')) withUndo('Données réinitialisées', () => { D = seed(); });
  } else if (a === 'proj-normal') { const id = UI.sheet.id; UI.sheet = null; withUndo('Revenu à la normale', () => { delete PROJ(id).late; }); }
  else if (a === 'proj-late') {
    const id = UI.sheet.id; UI.sheet = null;
    withUndo('Retard signalé', () => { PROJ(id).late = { count: 1, amount: 0, since: TODAY }; });
  } else if (a === 'proj-repaid') { const id = UI.sheet.id; UI.sheet = null; withUndo('Marqué remboursé', () => { const p = PROJ(id); p.status = 'rembourse'; p.capLeft = 0; delete p.late; }); }
  else if (a === 'proj-delete') {
    const id = UI.sheet.id; UI.sheet = null;
    if (D.invs.some((v) => v.id === id)) removeInv(id);
    else withUndo('Projet supprimé', () => { D.projects = D.projects.filter((p) => p.id !== id); D.dues = D.dues.filter((d) => d.project !== id); });
  }
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.check) { markDue(el.dataset.check, el.checked); return; }
  if (el.dataset.action === 'import') { importData(el.files[0]); el.value = ''; return; }
  if (el.dataset.f) {
    const sec = el.closest('[data-k]');
    const dr = draft(sec.dataset.k, sec.dataset.pf, true);
    const v = el.value;
    if (el.dataset.auto && v.trim() === '') dr[el.dataset.f] = null;
    else { const p = parseAmt(v); dr[el.dataset.f] = Number.isNaN(p) ? v : (v.trim() === '' ? '' : eur(p)); if (!Number.isNaN(p) && v.trim() !== '') el.value = eur(p); }
    save(); refreshNumbers();
  }
});
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.f) {
    const sec = el.closest('[data-k]');
    draft(sec.dataset.k, sec.dataset.pf, true)[el.dataset.f] = el.value;
    save(); refreshNumbers();
  } else if (el.dataset.plain) {
    const sec = document.querySelector('[data-k][data-pf]');
    draft(sec.dataset.k, sec.dataset.pf, true)[el.dataset.plain] = el.value; save();
  } else if (el.dataset.s) {
    UI.sheet[el.dataset.s] = el.value;
    if (UI.sheet.tried) {
      const v = UI.sheet.type === 'inv' ? invValidate(UI.sheet).errs : null;
      if (v) for (const [key, bad] of Object.entries(v)) { const sp = document.querySelector(`[data-err="${key}"]`); if (sp) sp.hidden = !bad; }
    }
    if (UI.sheet.type === 'inv') document.getElementById('preview').innerHTML = invPreview(UI.sheet);
  } else if (el.dataset.projIn) {
    UI.proj[el.dataset.projIn] = el.value;
    document.getElementById('proj-out').innerHTML = projOut(projCalc());
  }
});
document.addEventListener('focusin', (e) => { const el = e.target; if (el.matches && el.matches('.in') && el.dataset.f) setTimeout(() => { try { el.select(); } catch (_) {} }, 0); });
document.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!UI.sheet) return;
  if (UI.sheet.type === 'inv') submitInv(); else if (UI.sheet.type === 'due') submitDue();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && UI.sheet) { UI.sheet = null; renderSheet(); } });

// Balayage d'une échéance
let drag = null;
document.addEventListener('pointerdown', (e) => {
  const row = e.target.closest('.swipe');
  if (!row || row.dataset.rec === '1' || e.target.closest('label, input, button')) return;
  drag = { id: row.dataset.due, x: e.clientX, y: e.clientY, dx: 0, el: row.querySelector('.swipe-fg'), on: false };
});
document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.on) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
    if (dx > 8) drag.on = true; else return;
  }
  drag.dx = Math.max(0, Math.min(140, dx));
  drag.el.style.transition = 'none';
  drag.el.style.transform = `translateX(${drag.dx}px)`;
});
function endDrag() {
  if (!drag) return;
  const d = drag; drag = null;
  d.el.style.transition = ''; d.el.style.transform = '';
  if (d.dx > 72) { if (navigator.vibrate) navigator.vibrate(12); markDue(d.id, true); }
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

// Sauvegarde / restauration
function exportData() {
  const blob = new Blob([JSON.stringify(D, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mon-epargne-${TODAY}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Sauvegarde exportée');
}
function importData(file) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result);
      if (!d || d.v !== 1 || !Array.isArray(d.platforms)) throw new Error('format');
      withUndo('Sauvegarde restaurée', () => { D = d; });
    } catch (err) { toast('Fichier non reconnu', { error: true }); }
  };
  rd.readAsText(file);
}

// ---------------------------------------------------------------- Démarrage
render();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
