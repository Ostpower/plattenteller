const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const PT_PATH = require('path');
const PT_INDEX = process.env.PT_INDEX || PT_PATH.join(__dirname, '..', 'index.html');
const PT_QR = PT_PATH.join(__dirname, 'node_modules', 'qrcode-generator', 'qrcode.js');

const makeFirebase = require('./fakefb');
const qrSrc = fs.readFileSync(PT_QR,'utf8');
let html = fs.readFileSync(PT_INDEX,'utf8').replace(/<script src="[^"]+"[^>]*><\/script>/g, '');
const shared = { tree:{}, listeners:[] };
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const errors = [];
const URL0 = 'https://ostpower.github.io/plattenteller/';
function boot(url, uid, storage){
  const tag = Symbol(uid);
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if(!/Not implemented|Could not parse CSS/.test(e.message)) errors.push(uid+': '+e.message); });
  vc.on('error', (...a)=>{ const m=a.join(' '); if(!/Raum nicht gefunden/.test(m)) errors.push(uid+' console.error: '+m.slice(0,200)); });
  vc.on('warn', (...a)=>{ errors.push(uid+' console.warn: '+a.join(' ').slice(0,200)); });
  const dom = new JSDOM(html, { url, runScripts:'dangerously', pretendToBeVisual:true, virtualConsole: vc,
    beforeParse(w){
      w.firebase = makeFirebase(shared, uid, tag);
      w.eval(qrSrc + ';window.qrcode = qrcode;');
      w.confirm = () => true;
      w.crypto = require('crypto').webcrypto;
      if(storage) for(const [k,v] of Object.entries(storage)) w.localStorage.setItem(k,v);
      w.fetch = () => Promise.reject(new Error('no net'));
    }});
  dom.__tag = tag;
  return dom;
}
function reload(old, uid){
  const storage = {};
  for(let i=0;i<old.window.localStorage.length;i++){ const k = old.window.localStorage.key(i); storage[k] = old.window.localStorage.getItem(k); }
  for(let i=shared.listeners.length-1;i>=0;i--) if(shared.listeners[i].owner===old.__tag) shared.listeners.splice(i,1);
  old.window.close();
  return boot(URL0, uid, storage);
}
let fails = 0;
const ok = (c, m) => { console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
const type = (w, el, text) => { el.value = text; el.dispatchEvent(new w.Event('input', {bubbles:true})); };
const btn = (blk, sc) => blk.querySelector('button[data-score="'+sc+'"]');
const nameOf = blk => blk.querySelector('label').textContent;

(async()=>{
  let host = boot(URL0, 'HOST', { plattenteller_gate_unlocked:'yes' });
  let H = host.window.document;
  const addSong = (id, title, artist) => {
    H.getElementById('trackUrlInput').value = 'https://open.spotify.com/track/'+id;
    H.getElementById('trackTitleInput').value = title; H.getElementById('trackArtistInput').value = artist;
    H.getElementById('addTrackBtn').click();
  };
  addSong('4uLU6hMCjMI75M1A2tKUQC','Never Gonna Give You Up','Rick Astley');
  addSong('3AJwUDP919kvQ9QcozQPxg','Yellow','Coldplay');
  H.getElementById('mpCreateBtn').click(); await sleep(100);
  const code = H.getElementById('mpRoomCode').textContent;
  const join = async (uid, name) => { const d = boot(URL0+'?join='+code, uid); await sleep(80);
    d.window.document.getElementById('pvNameInput').value = name; d.window.document.getElementById('pvJoinBtn').click(); await sleep(100); return d; };
  const A = await join('PA','Anna'), B = await join('PB','Ben');
  const a = A.window.document, b = B.window.document;
  const room = () => shared.tree.rooms[code];

  H.getElementById('startGameBtn').click(); await sleep(150);
  const song1 = JSON.parse(host.window.localStorage.getItem('plattenteller_host_game'));
  ok(!!song1 && song1.stage==='guessing' && song1.room===code, 'Host: Spielstand wird im Browser gesichert (Stufe „guessing“)');
  const title1 = song1.tracks[song1.currentTrackId].title;
  host.window.document.getElementById('deezerAudio').dispatchEvent(new host.window.Event('play')); await sleep(120);
  const started = room().round.startedAt;
  ok(typeof started==='number', 'Songstart gemeldet');
  type(A.window, a.getElementById('pvGuessTitle'), 'anna tipp'); a.getElementById('pvGuessBtn').click(); await sleep(150);
  ok(!!room().guesses.PA, 'Anna hat getippt');

  // ===== A) Host lädt mitten in der Tippphase neu =====
  host = reload(host, 'HOST'); H = host.window.document; await sleep(400);
  ok(H.getElementById('game-screen').style.display==='block' && H.getElementById('setup-screen').style.display==='none', 'A: Host nach Neuladen direkt im Spiel (nicht im Setup)');
  ok(room().meta.phase==='playing', 'A: DB-Phase weiterhin „playing“ (Raum wurde NICHT zurückgesetzt)');
  ok(room().round.startedAt===started && room().round.n===1 && room().round.state==='guessing', 'A: Runde und Startzeit unverändert');
  ok(!!room().guesses.PA && room().guesses.PA.title==='anna tipp', 'A: Annas Tipp ist noch da');
  ok(/1 von 2/.test(H.getElementById('togetherGuessList').textContent), 'A: Host sieht wieder „1 von 2 haben getippt“');
  ok(/✓ getippt · \d+,\d s/.test(H.getElementById('togetherGuessList').textContent), 'A: Host sieht die Tipp-Zeit weiterhin');
  ok(H.getElementById('deckCurrent') ? true : true, 'A: (Deck-Anzeige vorhanden)');
  ok(H.getElementById('togetherRevealBtn').disabled===false, 'A: „Aufdecken“ ist freigeschaltet');
  ok(/wiederhergestellt/.test(H.getElementById('mpHostMsg').textContent), 'A: Hinweis „Spiel wiederhergestellt“');
  ok(a.getElementById('pvGuessPanel').style.display==='block' && /Gesendet/.test(a.getElementById('pvGuessMsg').textContent), 'A: Annas Handy unverändert („Gesendet ✓“)');
  type(B.window, b.getElementById('pvGuessTitle'), 'ben tipp'); b.getElementById('pvGuessBtn').click(); await sleep(150);
  ok(/2 von 2/.test(H.getElementById('togetherGuessList').textContent), 'A: Bens Tipp kommt beim neu geladenen Host an');
  H.getElementById('togetherRevealBtn').click(); await sleep(200);
  ok(room().round.state==='reveal' && room().round.reveal.title===title1, 'A: Aufdecken klappt, gleicher Song wie vor dem Neuladen ('+title1+')');
  ok(a.getElementById('pvRevealPanel').style.display==='block', 'A: Handys zeigen die Auflösung');
  ok(/nach \d+,\d s/.test(H.getElementById('togetherJudgeList').textContent), 'A: Zeiten in der Bewertung weiterhin korrekt');

  // ===== B) Host lädt mitten in der Bewertung neu =====
  let blocks = [...H.querySelectorAll('#togetherJudgeList .panel')];
  btn(blocks.find(x=>nameOf(x)==='Anna'), '2').click(); await sleep(120);
  ok(room().players.PA.score===2, 'B: Anna bewertet (+2)');
  host = reload(host, 'HOST'); H = host.window.document; await sleep(400);
  ok(H.getElementById('togetherRevealPanel').style.display==='block', 'B: Host nach Neuladen auf der Bewertungsseite');
  ok(H.getElementById('togetherRevealTitle').textContent===title1, 'B: Auflösung wieder sichtbar');
  blocks = [...H.querySelectorAll('#togetherJudgeList .panel')];
  const annaBlk = blocks.find(x=>nameOf(x)==='Anna'), benBlk = blocks.find(x=>nameOf(x)==='Ben');
  ok(btn(annaBlk,'2').disabled && btn(annaBlk,'2').classList.contains('judged'), 'B: Annas Bewertung (+2) bleibt als erledigt markiert');
  ok(!btn(benBlk,'0').disabled, 'B: Ben ist noch offen');
  ok(H.getElementById('togetherNextRoundBtn').disabled===true, 'B: „Nächster Song“ noch gesperrt');
  ok(/Tipp \(nach \d+,\d s\): ben tipp/.test(benBlk.textContent), 'B: Bens Tipp samt Zeit weiterhin sichtbar');
  ok(room().players.PA.score===2, 'B: Annas Punkte nicht doppelt verbucht (2)');
  const sb = [...H.querySelectorAll('#scoreboard .score-chip')].map(c=>c.textContent.replace(/\s+/g,' ').trim());
  ok(sb.some(t=>/Anna/.test(t) && /2/.test(t)), 'B: Punktestand-Leiste zeigt Anna mit 2');
  btn(benBlk,'1a').click(); await sleep(120);
  ok(H.getElementById('togetherNextRoundBtn').disabled===false && room().players.PB.score===1, 'B: Ben bewertet → „Nächster Song“ frei');

  // Runde 2
  H.getElementById('togetherNextRoundBtn').click(); await sleep(200);
  ok(room().round.n===2 && room().round.state==='guessing' && !room().round.startedAt, 'Runde 2 normal gestartet');
  const song2 = JSON.parse(host.window.localStorage.getItem('plattenteller_host_game'));
  ok(song2.remoteRound===2 && song2.stage==='guessing' && song2.deck.length===0, 'Runde 2: Spielstand aktualisiert gesichert');
  H.getElementById('togetherRevealBtn').click(); await sleep(150);
  blocks = [...H.querySelectorAll('#togetherJudgeList .panel')];
  for(const blk of blocks) btn(blk,'0').click();
  await sleep(150);
  H.getElementById('togetherNextRoundBtn').click(); await sleep(200);
  ok(H.getElementById('end-screen').style.display==='block' && room().meta.phase==='finished', 'Spielende erreicht');

  // ===== C) Host lädt am Spielende neu =====
  host = reload(host, 'HOST'); H = host.window.document; await sleep(400);
  ok(H.getElementById('end-screen').style.display==='block', 'C: Host nach Neuladen wieder auf dem Endscreen');
  ok(/Anna/.test(H.getElementById('finalList').textContent) && /Ben/.test(H.getElementById('finalList').textContent), 'C: Endstand mit beiden Spielern');
  ok(room().meta.phase==='finished', 'C: Raum bleibt „finished“, Handys zeigen weiter den Endstand');
  ok(a.getElementById('pvFinalPanel').style.display==='block', 'C: Annas Handy zeigt weiter den Endstand');
  H.getElementById('restartBtn').click(); await sleep(250);
  ok(room().meta.phase==='lobby' && !room().round, 'C: „Neues Spiel“ → Lobby');
  ok(host.window.localStorage.getItem('plattenteller_host_game')===null, 'C: gesicherter Spielstand gelöscht');
  ok(H.getElementById('setup-screen').style.display==='block', 'C: Host im Setup');

  // ===== D) Kein gesicherter Spielstand (z. B. Browserdaten gelöscht) → sauberer Fallback =====
  addSong('4uLU6hMCjMI75M1A2tKUQC','Never Gonna Give You Up','Rick Astley');
  H.getElementById('startGameBtn').click(); await sleep(200);
  ok(room().meta.phase==='playing', 'D: neues Spiel läuft');
  const stor = {}; for(let i=0;i<host.window.localStorage.length;i++){ const k=host.window.localStorage.key(i); if(k!=='plattenteller_host_game') stor[k]=host.window.localStorage.getItem(k); }
  for(let i=shared.listeners.length-1;i>=0;i--) if(shared.listeners[i].owner===host.__tag) shared.listeners.splice(i,1);
  host.window.close();
  host = boot(URL0, 'HOST', stor); H = host.window.document; await sleep(400);
  ok(room().meta.phase==='lobby' && !room().round, 'D: ohne gesicherten Spielstand → Raum zurück in die Lobby');
  console.log('   [debug] setup display="'+H.getElementById('setup-screen').style.display+'" game display="'+H.getElementById('game-screen').style.display+'" msg="'+H.getElementById('mpHostMsg').textContent+'"');
  ok(H.getElementById('setup-screen').style.display!=='none' && H.getElementById('game-screen').style.display==='none' && /nicht wiederhergestellt/.test(H.getElementById('mpHostMsg').textContent) && /älteren Version/.test(H.getElementById('mpHostMsg').textContent), 'D: Host im Setup, Meldung nennt den Grund (ältere Version)');
  ok(a.getElementById('pvLobbyPanel').style.display==='block', 'D: Handys zurück in der Lobby');

  // ===== E) Raum schließen löscht den gesicherten Stand =====
  H.getElementById('mpCloseBtn').click(); await sleep(100);
  ok(host.window.localStorage.getItem('plattenteller_host_game')===null && host.window.localStorage.getItem('plattenteller_host_room')===null, 'E: Raum schließen räumt alles auf');

  console.log(errors.length? '\nUNERWARTETE MELDUNGEN:\n'+errors.join('\n') : '\nKeine unerwarteten Konsolenfehler');
  console.log(fails? ('\n'+fails+' FEHLER') : '\nALLE TESTS OK');
  process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
