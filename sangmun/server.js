// 尙古圖會 멀티플레이 서버 — 의존성 없음 (Node 18+). SSE로 상태를 푸시하고 POST로 행동을 받는다.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/gosa.json'), 'utf8'));
const PUBLIC = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;
const WRITE_SEC = +process.env.WRITE_SEC || 180;
const VOTE_SEC = +process.env.VOTE_SEC || 60;
const ROUNDS = +process.env.ROUNDS || 6;
const BOARD = 30; // 말이 이 점수에 닿으면 종료

const rooms = new Map();
const rid = () => crypto.randomBytes(8).toString('hex');
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (;;) { let c = ''; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; if (!rooms.has(c)) return c; }
}

function createRoom(name) {
  const room = { code: newCode(), phase: 'lobby', players: new Map(), order: [], hostId: null, round: 0, rounds: 0, deck: [],
    card: null, face: null, genre: null, rollerId: null, subs: {}, anon: [], votes: {}, deadline: null, timer: null, token: 0,
    last: null, clients: new Set(), log: [] };
  rooms.set(room.code, room);
  return room;
}
function addPlayer(room, name) {
  const id = rid();
  room.players.set(id, { id, name: String(name || '무명').slice(0, 12), piece: null, score: 0, connected: false });
  room.order.push(id);
  if (!room.hostId) room.hostId = id;
  return id;
}

function setTimer(room, sec, fn) {
  clearTimeout(room.timer);
  const tok = ++room.token;
  room.deadline = sec ? Date.now() + sec * 1000 : null;
  if (sec) room.timer = setTimeout(() => { if (room.token === tok) fn(); }, sec * 1000);
}

// ── 상태 흐름 ──
function startRound(room) {
  room.card = room.deck[room.round];
  room.rollerId = room.order[room.round % room.order.length];
  room.face = room.genre = null; room.subs = {}; room.anon = []; room.votes = {}; room.last = null;
  room.phase = 'roll';
  setTimer(room, 0);
}
function doRoll(room) {
  room.face = 1 + Math.floor(Math.random() * 6);
  room.genre = room.card.dice[room.face - 1];
  room.phase = 'write';
  setTimer(room, WRITE_SEC, () => toVote(room));
  broadcast(room);
}
function toVote(room) {
  const authors = Object.keys(room.subs);
  if (authors.length < 2) return toResult(room);
  room.anon = shuffle(authors).map((pid, i) => ({ label: String.fromCharCode(65 + i), pid }));
  room.phase = 'vote';
  setTimer(room, VOTE_SEC, () => toResult(room));
  broadcast(room);
}
function toResult(room) {
  const gain = {}; const got = {};
  for (const a of room.anon) got[a.pid] = 0;
  for (const target of Object.values(room.votes)) got[target] = (got[target] || 0) + 1;
  for (const pid of Object.keys(room.subs)) {
    const p = room.players.get(pid);
    let g = 1 + (got[pid] || 0) * 2;
    const bonus = p.piece && p.piece === room.card.theme ? 1 : 0;
    gain[pid] = { base: 1, votes: got[pid] || 0, bonus, total: g + bonus };
    p.score += g + bonus;
  }
  room.last = { gain };
  room.phase = 'result';
  setTimer(room, 0);
  broadcast(room);
}
function nextRound(room) {
  const over = room.round + 1 >= room.rounds || [...room.players.values()].some((p) => p.score >= BOARD);
  if (over) { room.phase = 'end'; setTimer(room, 0); return; }
  room.round++; startRound(room);
}

// ── 직렬화 (비공개 정보 가림) ──
function view(room, pid) {
  const you = room.players.get(pid);
  const reveal = room.phase === 'result' || room.phase === 'end';
  const v = {
    code: room.code, phase: room.phase, you: pid, hostId: room.hostId, round: room.round + 1, rounds: room.rounds, board: BOARD,
    deadline: room.deadline, serverNow: Date.now(), rollerId: room.rollerId, face: room.face, genre: room.genre,
    pieces: DATA.pieces,
    players: room.order.map((id) => { const p = room.players.get(id); return { id, name: p.name, piece: p.piece, score: p.score, connected: p.connected, submitted: id in room.subs, voted: id in room.votes }; }),
    card: room.card && { id: room.card.id, title: room.card.title, theme: room.card.theme, part: room.card.part, source: room.card.source, text: room.card.text, gyusu: room.card.gyusu, dice: room.card.dice },
    mySub: room.subs[pid] || null, myVote: room.votes[pid] || null,
  };
  if (room.phase === 'vote' || reveal) {
    v.entries = room.anon.map((a) => ({ label: a.label, text: room.subs[a.pid], mine: a.pid === pid, author: reveal ? a.pid : undefined,
      votes: reveal ? Object.values(room.votes).filter((t) => t === a.pid).length : undefined }));
    v.myVoteLabel = room.anon.find((a) => a.pid === room.votes[pid])?.label;
    if (reveal && !room.anon.length) v.entries = Object.entries(room.subs).map(([a, t]) => ({ label: '-', text: t, mine: a === pid, author: a, votes: 0 }));
  }
  if (reveal && room.last) v.gain = room.last.gain;
  if (room.phase === 'end') v.winner = [...room.players.values()].sort((a, b) => b.score - a.score)[0].id;
  return v;
}
function broadcast(room) { for (const c of room.clients) send(room, c); }
function send(room, c) { c.res.write(`data: ${JSON.stringify(view(room, c.pid))}\n\n`); }

// ── 행동 ──
function act(room, pid, b) {
  const me = room.players.get(pid); if (!me) return 'no player';
  const isHost = pid === room.hostId;
  switch (b.type) {
    case 'rename': me.name = String(b.name || me.name).slice(0, 12); break;
    case 'piece':
      if (room.phase !== 'lobby') return 'locked';
      if (b.piece && !DATA.pieces.includes(b.piece)) return 'bad piece';
      if (b.piece && [...room.players.values()].some((p) => p.piece === b.piece && p.id !== pid)) return '이미 다른 사람이 고른 말입니다';
      me.piece = b.piece || null; break;
    case 'start':
      if (!isHost || room.phase !== 'lobby') return 'host only';
      for (const p of room.players.values()) p.score = 0;
      room.deck = shuffle(DATA.cards); room.rounds = Math.min(ROUNDS, room.deck.length); room.round = 0; startRound(room); break;
    case 'roll':
      if (room.phase !== 'roll' || pid !== room.rollerId) return 'not your roll';
      return doRoll(room);
    case 'submit': {
      if (room.phase !== 'write') return 'not writing';
      const t = String(b.text || '').trim().slice(0, 1000); if (!t) return 'empty';
      room.subs[pid] = t;
      if (room.order.every((id) => id in room.subs || !room.players.get(id).connected)) return toVote(room);
      break; }
    case 'vote': {
      if (room.phase !== 'vote' || !(pid in room.subs)) return 'cannot vote';
      const t = room.anon.find((a) => a.label === b.label)?.pid;
      if (!t || t === pid) return 'bad target';
      room.votes[pid] = t;
      if (Object.keys(room.subs).every((id) => id in room.votes)) return toResult(room);
      break; }
    case 'next':
      if (!isHost || room.phase !== 'result') return 'host only';
      nextRound(room); break;
    case 'again':
      if (!isHost || room.phase !== 'end') return 'host only';
      room.phase = 'lobby'; room.card = null; for (const p of room.players.values()) p.score = 0; break;
    default: return 'unknown';
  }
  broadcast(room);
}

// ── HTTP ──
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
const body = (req) => new Promise((ok) => { let s = ''; req.on('data', (d) => { s += d; if (s.length > 1e5) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { ok({}); } }); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/events') {
    const room = rooms.get(url.searchParams.get('room')); const pid = url.searchParams.get('pid');
    if (!room || !room.players.has(pid)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const c = { res, pid }; room.clients.add(c); room.players.get(pid).connected = true;
    send(room, c); broadcast(room);
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => { clearInterval(ping); room.clients.delete(c); if (![...room.clients].some((x) => x.pid === pid)) { room.players.get(pid).connected = false; broadcast(room); } });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/create') { const b = await body(req); const room = createRoom(); const pid = addPlayer(room, b.name); return json(res, 200, { room: room.code, pid }); }
  if (req.method === 'POST' && url.pathname === '/api/join') {
    const b = await body(req); const room = rooms.get(String(b.room || '').toUpperCase());
    if (!room) return json(res, 404, { error: '방을 찾을 수 없습니다' });
    if (b.pid && room.players.has(b.pid)) return json(res, 200, { room: room.code, pid: b.pid });
    if (room.phase !== 'lobby') return json(res, 400, { error: '이미 시작된 방입니다' });
    if (room.players.size >= 6) return json(res, 400, { error: '방이 가득 찼습니다 (최대 6명)' });
    return json(res, 200, { room: room.code, pid: addPlayer(room, b.name) });
  }
  if (req.method === 'POST' && url.pathname === '/api/act') {
    const b = await body(req); const room = rooms.get(b.room);
    if (!room) return json(res, 404, { error: 'no room' });
    const err = act(room, b.pid, b); return err ? json(res, 400, { error: err }) : json(res, 200, { ok: true });
  }
  // 정적 파일
  let f = url.pathname === '/' ? '/index.html' : url.pathname;
  const fp = path.join(PUBLIC, path.normalize(f).replace(/^(\.\.[/\\])+/, ''));
  if (!fp.startsWith(PUBLIC) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); fs.createReadStream(fp).pipe(res);
}).listen(PORT, () => console.log(`尙古圖會 http://localhost:${PORT}`));
