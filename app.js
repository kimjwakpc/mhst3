/* 즈3 몬스터 도감 — 사이트에 포함된 data/monsters.csv를 읽어 화면에 그린다.
 * (원본 구글시트에서 한 번 가져온 고정 자료. 시트와 연동하지 않음)
 */
'use strict';

const ORIGIN_URL = 'https://docs.google.com/spreadsheets/d/1_OgFiA32kDbcPGc1JAtOQfj1T5HDRnwIdxXWd4oCqGU/edit?gid=1768099903';
const DATA_URL = 'data/monsters.csv';
const OLD_CACHE_KEY = 'mhst3.sheetCache.v1'; // 예전 시트 연동 시절 캐시 — 지우기만 함
const CMP_KEY = 'mhst3.compare.v1';
const SORT_KEY = 'mhst3.sort.v1';
const CMP_MAX = 4;

/* ── 시트 열 위치 (헤더 행 기준, 0부터) ───────────────────────── */
const C = {
  no: 1, name: 2, rank: 4, total: 6,
  hp: 8, atk: 9, def: 10, gCrit: 12, gSpd: 13, gRec: 14, gStam: 15,
  bingo2: 17, bingo3: 18, bingo5: 19,
  stam: 21, stamB: 22, stamT: 23,
  rec: 25, recB: 26, recT: 27,
  crit: 29, critB: 30, critT: 31,
  spd: 33, spdB: 34, spdT: 35,
  drag: 37, dragB: 38, dragT: 39,
  type: 41, el: 42, fly: 43, climb: 44, swim: 45, dig: 46,
  sSkill: 48, group: 50, hatch0: 51, passive0: 58, passiveN: 18,
};
const ELEMENTS = ['무속성', '불속성', '물속성', '번개속성', '얼음속성', '용속성'];
const TYPES = ['파워', '스피드', '테크닉'];
const MOVES = [['fly', '비행'], ['climb', '등반'], ['swim', '수영'], ['dig', '땅 파기']];
const GROUPS = ['그룹 1', '그룹 2', '그룹 3', '그룹 4', '그룹 5'];

/* 시트 상단 환산표 */
const REF = {
  stamInit: { label: '초기 스테', grades: [4, 7, 10], values: [30, 50, 70] },
  stamRec: { label: '스테 회복', grades: [4, 7, 10], values: [4, 8, 12] },
  crit: { label: '회심률', grades: [1, 6, 8, 10], values: [0, 10, 15, 20] },
  speed: { label: '스피드', grades: [3, 4, 5, 6, 7, 8, 9, 10], values: [8, 9, 10, 11, 12, 13, 14, 15] },
  regionBonus: { label: '스테 회복 지역 보너스', grades: [1, 2, 3], values: ['?', 3, 5] },
  bingo: {
    cols: ['초기 스테', '스테 회복', '회심률', '스피드', '파룡력'],
    rows: [['2빙고', 5, 2, 3, 1, 5], ['3빙고', 10, 3, 5, 2, 10], ['5빙고', 15, 4, 7, 3, 15]],
  },
};

const SORTS = {
  no: { label: '순번', get: m => m.no, asc: true },
  rank: { label: '랭크', get: m => m.rank },
  total: { label: '총합', get: m => m.total },
  hp: { label: '체력', get: m => m.hp },
  atk: { label: '공격력', get: m => m.atk },
  def: { label: '방어력', get: m => m.def },
  critT: { label: '회심률', get: m => m.crit.tot },
  spdT: { label: '스피드', get: m => m.spd.tot },
  stamT: { label: '초기 스테', get: m => m.stam.tot },
  recT: { label: '스테 회복', get: m => m.rec.tot },
  dragT: { label: '파룡력', get: m => m.drag.tot },
  name: { label: '이름', get: m => m.name, asc: true },
};

/* ── 상태 ──────────────────────────────────────────────── */
const state = {
  monsters: [],
  q: '',
  sort: 'no',
  desc: false,
  f: { el: new Set(), type: new Set(), rank: new Set(), move: new Set(), group: new Set() },
  compare: [],
};

/* ── 유틸 ──────────────────────────────────────────────── */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
const yes = v => String(v ?? '').trim().toUpperCase() === 'O';
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 무시 */ } },
};

/* CSV 파서 (따옴표·줄바꿈 포함 셀 처리) */
function parseCSV(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function parseMonsters(text) {
  const rows = parseCSV(text.replace(/^﻿/, ''));
  const hi = rows.findIndex(r => (r[C.name] || '').trim() === '몬스터 이름');
  if (hi < 0) throw new Error('헤더 행(몬스터 이름)을 찾지 못함');
  const h = rows[hi];
  if ((h[C.group] || '').trim() && h[C.group].trim() !== '그룹') throw new Error('열 구성이 바뀜 (그룹 열 위치)');
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const t = i => (r[i] || '').trim();
    const name = t(C.name);
    if (!name || name === '새 몬스터') continue;
    const trip = (a, b, c) => ({ base: num(r[a]), bonus: num(r[b]), tot: num(r[c]) });
    const hatch = {};
    ELEMENTS.forEach((el, i) => { const v = t(C.hatch0 + i); if (v) hatch[el] = v; });
    const passives = [];
    for (let i = 0; i < C.passiveN; i++) { const v = t(C.passive0 + i); if (v) passives.push(v); }
    out.push({
      no: num(r[C.no]), name, rank: num(r[C.rank]), total: num(r[C.total]),
      hp: num(r[C.hp]), atk: num(r[C.atk]), def: num(r[C.def]),
      gCrit: num(r[C.gCrit]), gSpd: num(r[C.gSpd]), gRec: num(r[C.gRec]), gStam: num(r[C.gStam]),
      bingo: [t(C.bingo2), t(C.bingo3), t(C.bingo5)],
      stam: trip(C.stam, C.stamB, C.stamT), rec: trip(C.rec, C.recB, C.recT),
      crit: trip(C.crit, C.critB, C.critT), spd: trip(C.spd, C.spdB, C.spdT),
      drag: trip(C.drag, C.dragB, C.dragT),
      type: t(C.type), el: t(C.el),
      fly: yes(r[C.fly]), climb: yes(r[C.climb]), swim: yes(r[C.swim]), dig: yes(r[C.dig]),
      sSkill: t(C.sSkill), group: t(C.group), hatch, passives,
    });
  }
  if (out.length < 10) throw new Error(`몬스터 수가 너무 적음 (${out.length})`);
  out.forEach(m => {
    m.hay = [m.name, m.sSkill, m.el, m.type, m.group, ...m.passives, ...Object.values(m.hatch)].join(' ').toLowerCase();
  });
  return out;
}

/* ── 데이터 불러오기 ───────────────────────────────────── */
function apply(monsters) {
  state.monsters = monsters;
  renderFilters();
  renderList();
  renderCompare();
  routeFromHash();
}

async function load() {
  try { localStorage.removeItem(OLD_CACHE_KEY); } catch { /* 저장 불가 환경 무시 */ }
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    apply(parseMonsters(await res.text()));
  } catch (e) {
    console.warn('데이터 불러오기 실패', e);
    $('#list').innerHTML = '<li class="empty">데이터를 불러오지 못했습니다.</li>';
  }
}

/* ── 필터 ──────────────────────────────────────────────── */
function renderFilters() {
  const ranks = [...new Set(state.monsters.map(m => m.rank))].sort((a, b) => a - b);
  const groups = GROUPS.filter(g => state.monsters.some(m => m.group === g));
  const chip = (key, val, label = val) =>
    `<button class="chip" data-f="${key}" data-v="${esc(val)}" aria-pressed="${state.f[key].has(String(val))}">${esc(label)}</button>`;
  $('#filters').innerHTML = `
    <div class="fgroup"><span>속성</span><div class="chips">${ELEMENTS.map(e => chip('el', e, e.replace('속성', ''))).join('')}</div></div>
    <div class="fgroup"><span>타입</span><div class="chips">${TYPES.map(t => chip('type', t)).join('')}</div></div>
    <div class="fgroup"><span>랭크</span><div class="chips">${ranks.map(r => chip('rank', r, '★' + r)).join('')}</div></div>
    <div class="fgroup"><span>이동 (모두 가능)</span><div class="chips">${MOVES.map(([k, l]) => chip('move', k, l)).join('')}</div></div>
    <div class="fgroup"><span>부화기술 그룹</span><div class="chips">${groups.map(g => chip('group', g)).join('')}</div></div>
    <button class="reset" type="button" id="resetF">필터 초기화</button>`;
}
function activeFilterCount() { return Object.values(state.f).reduce((a, s) => a + s.size, 0); }

function filtered() {
  const toks = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  const f = state.f;
  let list = state.monsters.filter(m =>
    (!f.el.size || f.el.has(m.el)) &&
    (!f.type.size || f.type.has(m.type)) &&
    (!f.rank.size || f.rank.has(String(m.rank))) &&
    (!f.group.size || f.group.has(m.group)) &&
    [...f.move].every(k => m[k]) &&
    toks.every(t => m.hay.includes(t)));
  const s = SORTS[state.sort];
  const dir = state.desc ? -1 : 1;
  list.sort((a, b) => {
    const va = s.get(a), vb = s.get(b);
    const c = typeof va === 'string' ? va.localeCompare(vb, 'ko') : va - vb;
    return c * dir || a.no - b.no;
  });
  return list;
}

/* ── 목록 ──────────────────────────────────────────────── */
function miniBar(label, v, hl) {
  return `<div class="mbar${hl ? ' hl' : ''}"><span>${label}</span><div class="track"><div class="fill" style="width:${Math.min(100, v * 10)}%"></div></div><b>${v}</b></div>`;
}
function cardHTML(m) {
  const k = state.sort;
  const sub = [
    ['critT', '회심', m.crit.tot + '%'], ['spdT', '스피드', m.spd.tot], ['stamT', '스테', m.stam.tot],
    ['recT', '회복', m.rec.tot], ['dragT', '파룡', m.drag.tot],
  ];
  return `<li><button class="card el-${esc(m.el)}" data-no="${m.no}" type="button">
    <div class="card-head">
      <div class="rank"><div class="rank-inner">${m.rank}<small>RANK</small></div></div>
      <div class="name">${esc(m.name)}<span class="no">#${m.no}</span></div>
      <div class="tags"><span class="tag el">${esc(m.el.replace('속성', ''))}</span><span class="tag ty-${esc(m.type)}">${esc(m.type)}</span></div>
    </div>
    <div class="mini">${miniBar('체력', m.hp, k === 'hp')}${miniBar('공격', m.atk, k === 'atk')}${miniBar('방어', m.def, k === 'def')}</div>
    <div class="sub">${sub.map(([key, l, v]) => `<span class="${key === k ? 'hl' : ''}">${l} <b>${v}</b></span>`).join('')}
      <span class="${k === 'total' ? 'hl' : ''}">총합 <b>${m.total}</b></span></div>
  </button></li>`;
}
function renderList() {
  const list = filtered();
  $('#list').innerHTML = list.length ? list.map(cardHTML).join('') : '<li class="empty">조건에 맞는 몬스터가 없습니다.</li>';
  const n = activeFilterCount();
  $('#filterCount').hidden = !n; $('#filterCount').textContent = n;
  $('#resultInfo').textContent = `${list.length} / ${state.monsters.length}종 · ${SORTS[state.sort].label} ${state.desc ? '높은순' : '낮은순'}`;
  $('#dir').textContent = state.desc ? '↓ 높은순' : '↑ 낮은순';
  store.set(SORT_KEY, { sort: state.sort, desc: state.desc });
}

/* ── 상세 ──────────────────────────────────────────────── */
function gradeBar(label, v) {
  return `<div class="gbar"><span>${label}</span><div class="track"><div class="fill" style="width:${v * 10}%"></div></div><b>${v}</b></div>`;
}
function detailHTML(m) {
  const inCmp = state.compare.includes(m.name);
  const row = (l, o, unit = '') => `<tr><td>${l}</td><td>${o.base}${unit}</td><td class="bonus">${o.bonus ? '+' + o.bonus : '–'}</td><td class="tot">${o.tot}${unit}</td></tr>`;
  const hatch = ELEMENTS.filter(e => m.hatch[e]).map(e =>
    `<div class="el-${e}"><small>${e.replace('속성', '')}</small>${esc(m.hatch[e])}</div>`).join('');
  return `
  <div class="sheet-top">
    <div class="grab"></div>
    <div class="sheet-title">
      <div class="rank"><div class="rank-inner">${m.rank}<small>RANK</small></div></div>
      <h2>${esc(m.name)}</h2>
      <button class="close" type="button" data-close aria-label="닫기">×</button>
    </div>
    <div class="sheet-actions">
      <span class="tag el el-${esc(m.el)}">${esc(m.el)}</span>
      <span class="tag ty-${esc(m.type)}">${esc(m.type)}</span>
      <span class="tag" style="color:var(--ink-3)">#${m.no}</span>
      <button class="btn ${inCmp ? '' : 'primary'}" type="button" data-cmp="${esc(m.name)}" style="margin-left:auto">${inCmp ? '비교에서 빼기' : '비교에 추가'}</button>
    </div>
  </div>

  <section class="sec">
    <h3>개체 등급</h3>
    <div class="grades">
      ${gradeBar('체력', m.hp)}${gradeBar('공격력', m.atk)}${gradeBar('방어력', m.def)}
      ${gradeBar('회심', m.gCrit)}${gradeBar('스피드', m.gSpd)}${gradeBar('스테 회복', m.gRec)}${gradeBar('초기 스테', m.gStam)}
    </div>
    <div class="gtotal">등급 총합 <b>${m.total}</b></div>
  </section>

  <section class="sec">
    <h3>실제 수치 (빙고 보너스 포함)</h3>
    <table class="vals">
      <thead><tr><th></th><th>기본</th><th>보너스</th><th>총합</th></tr></thead>
      <tbody>
        ${row('초기 스테', m.stam)}${row('스테 회복', m.rec)}${row('회심률', m.crit, '%')}${row('스피드', m.spd)}${row('파룡력', m.drag)}
      </tbody>
    </table>
  </section>

  <section class="sec">
    <h3>빙고 보너스</h3>
    <div class="bingo">${['2빙고', '3빙고', '5빙고'].map((l, i) => `<div><small>${l}</small><b>${esc(m.bingo[i] || '–')}</b></div>`).join('')}</div>
  </section>

  <section class="sec">
    <h3>이동 능력</h3>
    <div class="moves">${MOVES.map(([k, l]) => `<span class="move ${m[k] ? 'on' : ''}">${l}</span>`).join('')}</div>
  </section>

  <section class="sec">
    <h3>기술</h3>
    <dl class="kv"><dt>S기술</dt><dd>${esc(m.sSkill || '–')}</dd><dt>부화기술</dt><dd>${esc(m.group || '–')}</dd></dl>
    ${hatch ? `<div class="hatch" style="margin-top:8px">${hatch}</div>` : ''}
  </section>

  <section class="sec">
    <h3>드랍 패시브 ${m.passives.length ? `(${m.passives.length})` : ''}</h3>
    ${m.passives.length
      ? `<div class="passives">${m.passives.map(p => `<button type="button" data-search="${esc(p)}">${esc(p)}</button>`).join('')}</div>
         <p class="note">패시브를 누르면 같은 패시브를 가진 몬스터를 찾습니다.</p>`
      : '<p class="note">정보 없음</p>'}
  </section>`;
}

let sheetPushed = false;
function openDetail(no) {
  if (location.hash !== '#m=' + no) { location.hash = 'm=' + no; sheetPushed = true; }
  else routeFromHash();
}
function closeDetail() {
  if (sheetPushed) { sheetPushed = false; history.back(); }
  else { history.replaceState(null, '', location.pathname + location.search); routeFromHash(); }
}
function routeFromHash() {
  const mt = location.hash.match(/^#m=(\d+)/);
  const m = mt && state.monsters.find(x => x.no === +mt[1]);
  const sheet = $('#sheet');
  if (m) {
    sheet.innerHTML = detailHTML(m);
    sheet.hidden = false; $('#sheetBackdrop').hidden = false;
    document.body.classList.add('lock');
    sheet.scrollTop = 0;
  } else {
    sheet.hidden = true; $('#sheetBackdrop').hidden = true;
    document.body.classList.remove('lock');
    sheetPushed = false;
  }
}

/* ── 비교 ──────────────────────────────────────────────── */
function toggleCompare(name) {
  const i = state.compare.indexOf(name);
  if (i >= 0) state.compare.splice(i, 1);
  else { if (state.compare.length >= CMP_MAX) state.compare.shift(); state.compare.push(name); }
  store.set(CMP_KEY, state.compare);
  renderCompare();
}
function renderCompare() {
  const ms = state.compare.map(n => state.monsters.find(m => m.name === n)).filter(Boolean);
  $('#cmpCount').hidden = !ms.length; $('#cmpCount').textContent = ms.length;
  if (!ms.length) { $('#compare').innerHTML = ''; return; }
  const line = (label, get, best = 'max', fmt = v => v) => {
    const vs = ms.map(get);
    const top = best ? (best === 'max' ? Math.max(...vs) : Math.min(...vs)) : null;
    const allSame = vs.every(v => v === vs[0]);
    return `<tr><th>${label}</th>${vs.map(v => `<td class="${best && !allSame && v === top ? 'best' : ''}">${esc(fmt(v))}</td>`).join('')}</tr>`;
  };
  const grp = l => `<tr class="grp"><th>${l}</th>${ms.map(() => '<td></td>').join('')}</tr>`;
  const text = (label, get) => `<tr><th>${label}</th>${ms.map(m => `<td class="wrap">${esc(get(m))}</td>`).join('')}</tr>`;
  $('#compare').innerHTML = `<div class="cmp-wrap"><table class="cmp">
    <thead><tr><th></th>${ms.map(m => `<th>${esc(m.name)}<button class="x" type="button" data-cmp="${esc(m.name)}">빼기 ×</button></th>`).join('')}</tr></thead>
    <tbody>
      ${text('속성 / 타입', m => `${m.el.replace('속성', '')} · ${m.type}`)}
      ${line('랭크', m => m.rank, null)}
      ${grp('개체 등급')}
      ${line('체력', m => m.hp)}${line('공격력', m => m.atk)}${line('방어력', m => m.def)}
      ${line('회심', m => m.gCrit)}${line('스피드', m => m.gSpd)}${line('스테 회복', m => m.gRec)}${line('초기 스테', m => m.gStam)}
      ${line('등급 총합', m => m.total)}
      ${grp('실제 수치 (총합)')}
      ${line('초기 스테', m => m.stam.tot)}${line('스테 회복', m => m.rec.tot)}${line('회심률', m => m.crit.tot, 'max', v => v + '%')}
      ${line('스피드', m => m.spd.tot)}${line('파룡력', m => m.drag.tot)}
      ${grp('기타')}
      ${text('빙고', m => m.bingo.filter(Boolean).join(' / '))}
      ${text('이동', m => MOVES.filter(([k]) => m[k]).map(([, l]) => l).join(', ') || '–')}
      ${text('S기술', m => m.sSkill || '–')}
      ${text('부화기술', m => m.group || '–')}
      ${text('드랍 패시브', m => m.passives.join(', ') || '–')}
    </tbody></table></div>
    <p class="note" style="margin-top:8px">주황색 = 비교 대상 중 가장 높은 값</p>`;
}

/* ── 참고표 ────────────────────────────────────────────── */
function renderRef() {
  const t = r => `<div class="ref-scroll"><table class="ref"><tr><th>등급</th>${r.grades.map(g => `<td>${g}</td>`).join('')}</tr>
    <tr><th>실제 수치</th>${r.values.map(v => `<td><b>${v}</b></td>`).join('')}</tr></table></div>`;
  const b = REF.bingo;
  $('#ref').innerHTML = `
    <div class="ref-card"><h3>빙고 보너스</h3>
      <div class="ref-scroll"><table class="ref"><tr><th></th>${b.cols.map(c => `<td><b>${c}</b></td>`).join('')}</tr>
      ${b.rows.map(r => `<tr><th>${r[0]}</th>${r.slice(1).map(v => `<td>+${v}</td>`).join('')}</tr>`).join('')}</table></div>
      <p>각 몬스터의 2·3·5빙고 칸에 적힌 항목에 위 보너스가 더해집니다.</p></div>
    <div class="ref-card"><h3>초기 스테미나</h3>${t(REF.stamInit)}</div>
    <div class="ref-card"><h3>스테미나 회복</h3>${t(REF.stamRec)}
      <p>지역 랭크 보너스: ${REF.regionBonus.grades.map((g, i) => `${g}랭크 ${REF.regionBonus.values[i]}`).join(' · ')}</p></div>
    <div class="ref-card"><h3>회심률 (%)</h3>${t(REF.crit)}</div>
    <div class="ref-card"><h3>스피드</h3>${t(REF.speed)}</div>
    <div class="ref-card"><h3>등급 총합</h3><p>체력 + 공격력 + 방어력 + 회심 + 스피드 + 스테 회복 + 초기 스테 등급의 합입니다. 파룡력은 등급이 아닌 고정 수치입니다.</p></div>
    <div class="ref-card"><h3>데이터 출처</h3><p>수치는 <a href="${ORIGIN_URL}" target="_blank" rel="noopener">즈3 몬스터 수치</a> 구글시트에서 가져온 자료를 바탕으로 합니다.</p></div>`;
}

/* ── 이벤트 ────────────────────────────────────────────── */
function switchTab(name) {
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  document.querySelectorAll('.tab').forEach(s => { s.hidden = s.id !== 'tab-' + name; });
  window.scrollTo({ top: 0 });
}

function bind() {
  $('#srcLink').href = ORIGIN_URL;
  document.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]'); if (b) switchTab(b.dataset.tab);
  });
  let qt;
  $('#q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value.trim(); renderList(); }, 120); });
  $('#sort').addEventListener('change', e => {
    state.sort = e.target.value;
    state.desc = !SORTS[state.sort].asc;
    renderList();
  });
  $('#dir').addEventListener('click', () => { state.desc = !state.desc; renderList(); });
  $('#filterToggle').addEventListener('click', e => {
    const f = $('#filters'); f.hidden = !f.hidden; e.currentTarget.setAttribute('aria-expanded', String(!f.hidden));
  });
  $('#filters').addEventListener('click', e => {
    if (e.target.id === 'resetF') { Object.values(state.f).forEach(s => s.clear()); renderFilters(); renderList(); return; }
    const c = e.target.closest('.chip'); if (!c) return;
    const set = state.f[c.dataset.f]; const v = c.dataset.v;
    set.has(v) ? set.delete(v) : set.add(v);
    c.setAttribute('aria-pressed', String(set.has(v)));
    renderList();
  });
  $('#list').addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openDetail(+c.dataset.no); });
  $('#sheetBackdrop').addEventListener('click', closeDetail);
  $('#sheet').addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return closeDetail();
    const cb = e.target.closest('[data-cmp]');
    if (cb) { toggleCompare(cb.dataset.cmp); routeFromHash(); return; }
    const sb = e.target.closest('[data-search]');
    if (sb) {
      $('#q').value = sb.dataset.search; state.q = sb.dataset.search;
      closeDetail(); switchTab('list'); renderList();
    }
  });
  $('#compare').addEventListener('click', e => { const b = e.target.closest('[data-cmp]'); if (b) toggleCompare(b.dataset.cmp); });
  window.addEventListener('hashchange', routeFromHash);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) closeDetail(); });
}

/* ── 시작 ──────────────────────────────────────────────── */
(function init() {
  const s = store.get(SORT_KEY, null);
  if (s && SORTS[s.sort]) { state.sort = s.sort; state.desc = !!s.desc; $('#sort').value = s.sort; }
  state.compare = store.get(CMP_KEY, []);
  bind();
  renderRef();
  load();
})();
