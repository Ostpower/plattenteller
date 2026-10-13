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
const URL0 = 'https://ostpower.github.io/plattenteller/';
const unexpected = [];
function boot(url, uid, storage){
  const tag = Symbol(uid); const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if(!/Not implemented|Could not parse CSS/.test(e.message)) unexpected.push(uid+': '+e.message); });
  vc.on('error', (...a)=>{ const m=a.join(' '); if(!/Raum nicht gefunden/.test(m)) unexpected.push(uid+' console.error: '+m.slice(0,200)); });
  const dom = new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.firebase = makeFirebase(shared, uid, tag); w.eval(qrSrc+';window.qrcode=qrcode;'); w.confirm=()=>true; w.crypto=require('crypto').webcrypto;
    w.fetch=()=>Promise.reject(new Error('no net')); w.PT_HEARTBEAT_MS = 100000; w.PT_OFFLINE_DELAY_MS = 200;
    if(storage) for(const [k,v] of Object.entries(storage)) w.localStorage.setItem(k,v);
  }}); dom.__tag=tag; return dom;
}
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
const type = (w, el, text) => { el.value = text; el.dispatchEvent(new w.Event('input', {bubbles:true})); };
const btn = (blk, sc) => blk.querySelector('button[data-score="'+sc+'"]');
const nameOf = blk => blk.querySelector('label').textContent;

(async()=>{
  let host = boot(URL0,'HOST',{plattenteller_gate_unlocked:'yes'});
  let H = host.window.document;
  const addSong = (id,title,artist) => { H.getElementById('trackUrlInput').value='https://open.spotify.com/track/'+id; H.getElementById('trackTitleInput').value=title; H.getElementById('trackArtistInput').value=artist; H.getElementById('addTrackBtn').click(); };
  addSong('4uLU6hMCjMI75M1A2tKUQC','Song Eins','Interpret A'); addSong('3AJwUDP919kvQ9QcozQPxg','Song Zwei','Interpret B'); addSong('6habFhsOp2NvshLv26DqMb','Song Drei','Interpret C');
  H.getElementById('mpCreateBtn').click(); await sleep(150);
  const code = H.getElementById('mpRoomCode').textContent;
  const phones = {};
  const join = async (uid, name) => { const d = boot(URL0+'?join='+code, uid); await sleep(80); const D=d.window.document;
    D.getElementById('pvNameInput').value = name; D.getElementById('pvJoinBtn').click(); await sleep(120); phones[uid]=d; return d; };
  const A = await join('PA','Anna'), B = await join('PB','Ben'), C = await join('PC','Cem');
  const a=A.window.document, b=B.window.document, c=C.window.document;
  const room = () => shared.tree.rooms[code];
  const audio = () => host.window.document.getElementById('deezerAudio');
  const startSong = async () => { audio().dispatchEvent(new host.window.Event('play')); await sleep(150); };
  const tip = async (d, text) => { type(d.window, d.window.document.getElementById('pvGuessTitle'), text); d.window.document.getElementById('pvGuessBtn').click(); await sleep(150); };
  const statusText = () => H.getElementById('togetherGuessList').textContent.replace(/\s+/g,' ');
  const rowsOf = () => [...H.querySelectorAll('#togetherJudgeList .panel')];
  const row = n => rowsOf().find(x => nameOf(x)===n);

  H.getElementById('startGameBtn').click(); await sleep(200);
  ok(room().meta.phase==='playing', 'Spiel läuft mit 3 Handys');
  await startSong();

  // ===== 1) Offline-Hinweis auf dem Handy =====
  ok(b.getElementById('pvOfflineBar').style.display==='none', 'Ben: anfangs keine Offline-Leiste');
  shared.setConnected(B.__tag, false); await sleep(300);
  ok(b.getElementById('pvOfflineBar').style.display==='block' && /Keine Verbindung/.test(b.getElementById('pvOfflineBar').textContent), 'Ben: Offline-Leiste erscheint bei Verbindungsverlust');
  shared.setConnected(B.__tag, true); await sleep(60);
  ok(b.getElementById('pvOfflineBar').style.display==='none', 'Ben: Leiste verschwindet, sobald wieder online');
  shared.setConnected(B.__tag, false); await sleep(30); shared.setConnected(B.__tag, true); await sleep(300);
  ok(b.getElementById('pvOfflineBar').style.display==='none', 'Ben: kurzer Aussetzer (<Verzögerung) zeigt keine Leiste');

  // ===== 2) Ben geht offline: Host sieht es =====
  shared.fireDisconnect(B.__tag); await sleep(80);
  ok(room().players.PB.connected===false, 'DB: Ben „connected=false“');
  ok(/Ben[^✓]*offline/.test(statusText()), 'Host (Tippliste): Ben als „offline“ markiert ('+statusText().slice(0,120)+')');
  const sb = [...H.querySelectorAll('#scoreboard .score-chip')].map(x=>x.textContent.replace(/\s+/g,' '));
  ok(sb.some(t=>/Ben/.test(t) && /offline/.test(t)), 'Host (Punkteleiste): Ben „offline“');

  // ===== 3) Runde 1: Ben ohne Tipp -> automatisch 0, blockiert nicht =====
  await tip(A,'anna tipp'); await tip(C,'cem tipp');
  H.getElementById('togetherRevealBtn').click(); await sleep(200);
  ok(rowsOf().length===3, 'Bewertung: 3 Zeilen (Anna, Ben, Cem)');
  ok(btn(row('Ben'),'0').disabled && btn(row('Ben'),'0').classList.contains('judged'), 'Ben (offline, kein Tipp): automatisch mit 0 bewertet');
  ok(/automatisch 0 Punkte/.test(row('Ben').textContent), 'Hinweis „automatisch 0 Punkte“ steht in der Zeile');
  ok(room().results.PB && room().results.PB.pts===0, 'DB: Ben hat ein Ergebnis (0), seine Handy-Anzeige hängt nicht');
  ok(H.getElementById('togetherNextRoundBtn').disabled===true, '„Nächster Song“ noch gesperrt (Anna/Cem offen)');
  btn(row('Anna'),'2').click(); btn(row('Cem'),'1a').click(); await sleep(150);
  ok(H.getElementById('togetherNextRoundBtn').disabled===false, '„Nächster Song“ frei, obwohl Ben offline ist');
  ok(room().players.PA.score===2 && room().players.PC.score===1 && room().players.PB.score===0, 'Punkte: Anna 2, Cem 1, Ben 0');

  // ===== 4) Runde 2: Cem verlässt das Spiel =====
  H.getElementById('togetherNextRoundBtn').click(); await sleep(250);
  ok(room().round.n===2, 'Runde 2 läuft');
  c.querySelector('#pvGuessPanel .pv-leave').click(); await sleep(150);
  ok(room().players.PC.left===true && room().players.PC.connected===false, 'DB: Cem „left=true“ (Eintrag bleibt, Punkte bleiben)');
  ok(room().players.PC.score===1, 'Cems Punktestand bleibt erhalten');
  ok(c.getElementById('pvJoinPanel').style.display==='block' && /verlassen/.test(c.getElementById('pvJoinMsg').textContent), 'Cem: Handy zeigt „Du hast das Spiel verlassen …“');
  ok(/Cem[^✓]*ausgestiegen/.test(statusText()), 'Host (Tippliste): Cem „ausgestiegen“');
  ok(/0 von 2 haben getippt/.test(statusText()), 'Host: „0 von 2“ (Cem zählt nicht mehr mit)');

  // ===== 5) Späteinsteiger Dora mitten in der Runde =====
  const D = await join('PD','Dora'); const d = D.window.document;
  ok(!!room().players.PD && room().players.PD.score===0, 'Dora tritt mitten im Spiel bei (Score 0)');
  ok(d.getElementById('pvLobbyPanel').style.display!=='none' || d.getElementById('pvGuessPanel').style.display==='block', 'Dora sieht das laufende Spiel');
  ok(/Dora/.test(statusText()), 'Host: Dora steht in der Tippliste');
  await startSong();
  ok(d.getElementById('pvGuessPanel').style.display==='block' && d.getElementById('pvGuessBtn').disabled===false, 'Dora kann tippen');
  await tip(D,'dora tipp'); await tip(A,'anna zwei');
  ok(/2 von 3 haben getippt/.test(statusText()), 'Host: „2 von 3“ (Anna, Dora getippt; Ben offline zählt noch als Mitspieler)');
  H.getElementById('togetherRevealBtn').click(); await sleep(200);
  ok(rowsOf().length===3 && !!row('Dora') && !!row('Anna') && !!row('Ben') && !row('Cem'), 'Bewertung: Anna, Ben, Dora — Cem (ausgestiegen) nicht');
  ok(btn(row('Ben'),'0').classList.contains('judged'), 'Ben wieder automatisch 0 (kein Tipp)');

  // Späteinsteiger Eli, während aufgedeckt ist
  const E = await join('PE','Eli'); const e = E.window.document;
  ok(!!room().players.PE, 'Eli tritt während der Auflösung bei');
  ok(room().results.PE && room().results.PE.pts===0, 'Eli bekommt für die laufende Runde automatisch ein 0-Ergebnis (Handy hängt nicht auf „Wird bewertet“)');
  ok(rowsOf().length===3, 'Bewertung dieser Runde bleibt bei 3 Zeilen (Eli zählt ab der nächsten Runde)');
  btn(row('Anna'),'1b').click(); btn(row('Dora'),'2').click(); await sleep(150);
  ok(H.getElementById('togetherNextRoundBtn').disabled===false, '„Nächster Song“ frei (Eli blockiert nicht)');

  // ===== 6) Cem steigt wieder ein =====
  c.getElementById('pvNameInput').value='Cem'; c.getElementById('pvJoinBtn').click(); await sleep(200);
  ok(room().players.PC.left===undefined || room().players.PC.left===null, 'DB: „left“ von Cem entfernt');
  ok(c.getElementById('pvLobbyPanel').style.display==='block' || c.getElementById('pvGuessPanel').style.display==='block' || c.getElementById('pvRevealPanel').style.display==='block', 'Cem ist wieder im Spiel');

  // ===== 7) Runde 3: Host entfernt Ben =====
  H.getElementById('togetherNextRoundBtn').click(); await sleep(250);
  ok(room().round.n===3, 'Runde 3 läuft');
  ok(/Cem/.test(statusText()) && !/Cem[^✓]*ausgestiegen/.test(statusText()), 'Host: Cem wieder als aktiver Spieler');
  const kick = [...H.querySelectorAll('#togetherGuessList .mp-player')].find(x=>/Ben/.test(x.textContent)).querySelector('.mp-kick');
  kick.click(); await sleep(200);
  ok(!room().players.PB, 'DB: Ben aus dem Raum entfernt');
  ok(/entfernt/.test(b.getElementById('pvJoinMsg').textContent) && b.getElementById('pvJoinPanel').style.display==='block', 'Ben: Handy zeigt „Du wurdest vom Host entfernt“');
  ok(!/Ben/.test(statusText()), 'Host: Ben nicht mehr in der Tippliste');
  ok(![...H.querySelectorAll('#scoreboard .score-chip')].some(x=>/Ben/.test(x.textContent)), 'Host: Ben nicht mehr in der Punkteleiste');
  await startSong();
  await tip(A,'a drei'); await tip(C,'c drei'); await tip(D,'d drei'); await tip(E,'e drei');
  H.getElementById('togetherRevealBtn').click(); await sleep(250);
  ok(rowsOf().length===4 && !row('Ben') && !!row('Eli'), 'Runde 3: Bewertung mit Anna, Cem, Dora, Eli (kein Ben)');

  // ===== 8) Host lädt mitten in der Bewertung neu =====
  btn(row('Anna'),'2').click(); await sleep(100);
  const stor={}; for(let i=0;i<host.window.localStorage.length;i++){ const k=host.window.localStorage.key(i); stor[k]=host.window.localStorage.getItem(k); }
  for(let i=shared.listeners.length-1;i>=0;i--) if(shared.listeners[i].owner===host.__tag) shared.listeners.splice(i,1);
  host.window.close(); host = boot(URL0,'HOST',stor); H = host.window.document; await sleep(500);
  ok(H.getElementById('togetherRevealPanel').style.display==='block' && rowsOf().length===4, 'Neuladen: gleiche 4 Bewertungszeilen');
  ok(btn(row('Anna'),'2').classList.contains('judged') && !btn(row('Cem'),'0').disabled, 'Neuladen: Anna erledigt, Cem offen');
  ok(!row('Ben') && ![...H.querySelectorAll('#scoreboard .score-chip')].some(x=>/Ben/.test(x.textContent)), 'Neuladen: Ben bleibt entfernt');
  btn(row('Cem'),'1a').click(); btn(row('Dora'),'0').click(); btn(row('Eli'),'1b').click(); await sleep(150);
  ok(H.getElementById('togetherNextRoundBtn').disabled===false, 'Neuladen: nach Bewertung der Rest frei');

  // ===== 9) Eli steigt vor dem Ende aus; Endstand =====
  e.querySelector('#pvRevealPanel .pv-leave').click(); await sleep(150);
  H.getElementById('togetherNextRoundBtn').click(); await sleep(250);
  ok(H.getElementById('end-screen').style.display==='block', 'Spielende');
  const fin = H.getElementById('finalList').textContent.replace(/\s+/g,' ');
  ok(/Eli/.test(fin) && /ausgestiegen/.test(fin), 'Host-Endstand: Eli mit „(ausgestiegen)“, Punkte bleiben');
  ok(!/Ben/.test(fin), 'Host-Endstand: entfernter Ben nicht dabei');
  ok(/Anna/.test(fin) && /Cem/.test(fin) && /Dora/.test(fin), 'Host-Endstand: alle aktiven Spieler dabei');
  const pf = a.getElementById('pvFinalList').textContent.replace(/\s+/g,' ');
  ok(/Eli/.test(pf) && /ausgestiegen/.test(pf) && !/Ben/.test(pf), 'Handy-Endstand: Eli „(ausgestiegen)“, Ben fehlt');

  // ===== 10) Neues Spiel: Ausgestiegene sind aus dem Raum, Rest startet bei 0 =====
  H.getElementById('restartBtn').click(); await sleep(300);
  ok(room().meta.phase==='lobby' && !room().players.PE && !!room().players.PA && room().players.PA.score===0, 'Neues Spiel: Eli (ausgestiegen) entfernt, Rest wieder bei 0');

  console.log(unexpected.length? '\nUNERWARTET:\n'+unexpected.join('\n') : '\nKeine unerwarteten Fehler');
  console.log(fails?'\n'+fails+' FEHLER':'\nALLE TESTS OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
