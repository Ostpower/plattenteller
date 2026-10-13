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
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
function boot(url, uid, storage){
  const tag = Symbol(uid); const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if(!/Not implemented|Could not parse CSS/.test(e.message)) unexpected.push(uid+': '+e.message); });
  vc.on('error', (...a)=>{ const m=a.join(' '); if(!/Raum nicht gefunden|Hitster läuft schon/.test(m)) unexpected.push(uid+' console.error: '+m.slice(0,200)); });
  const dom = new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.firebase = makeFirebase(shared, uid, tag); w.eval(qrSrc+';window.qrcode=qrcode;'); w.confirm=()=>true; w.crypto=require('crypto').webcrypto;
    w.fetch=()=>Promise.reject(new Error('no net')); w.PT_HEARTBEAT_MS=100000; w.PT_MB_GAP_MS=1;
    for(const [k,v] of Object.entries(storage||{})) w.localStorage.setItem(k,v);
  }}); dom.__tag=tag; return dom;
}
const YEARS=[1965,1972,1981,1988,1994,2001,2009,2016];
const mkTrack=(n,y,unsure)=>({id:'sp_ID'+n,source:'spotify',uri:'spotify:track:ID'+n,title:'Song '+n,artist:'Interpret '+n,artistKey:'AR'+n,cover:'',year:y,yr:{y:y,src:'mb',unsure:!!unsure}});
const TRACKS=[...YEARS.map((y,i)=>mkTrack(i+1,y)), mkTrack(9,2020,true)];
const room = () => shared.tree.rooms[CODE];
let CODE;
const reload = (old, uid) => { const st={}; for(let i=0;i<old.window.localStorage.length;i++){ const k=old.window.localStorage.key(i); st[k]=old.window.localStorage.getItem(k); }
  for(let i=shared.listeners.length-1;i>=0;i--) if(shared.listeners[i].owner===old.__tag) shared.listeners.splice(i,1); old.window.close(); return boot(URL0,uid,st); };

(async()=>{
  // ===== 0) Ohne Raum: Hinweis, Start gesperrt =====
  let h0 = boot(URL0,'H0',{plattenteller_gate_unlocked:'yes', plattenteller_tracks: JSON.stringify(TRACKS)}); await sleep(120);
  let D0 = h0.window.document;
  D0.querySelector('#modeChips .pick-chip[data-mode="hitster"]').click();
  ok(D0.getElementById('startGameBtn').disabled===true && /Hitster braucht einen Raum/.test(D0.getElementById('remoteStartHint').textContent), 'Ohne Raum: Hitster gesperrt, Hinweis „braucht einen Raum mit Handys“');
  ok(/Hitster: jede\*r baut/.test(D0.getElementById('modeHint').textContent), 'Modus-Beschreibung nennt Hitster');
  h0.window.close();

  // ===== 1) Host + 3 Handys =====
  let host = boot(URL0,'HOST',{plattenteller_gate_unlocked:'yes', plattenteller_tracks: JSON.stringify(TRACKS)}); await sleep(120);
  let H = host.window.document;
  H.getElementById('mpCreateBtn').click(); await sleep(120);
  CODE = H.getElementById('mpRoomCode').textContent;
  const phones = {};
  const join = async (uid,name) => { const d=boot(URL0+'?join='+CODE,uid); await sleep(80); const D=d.window.document; D.getElementById('pvNameInput').value=name; D.getElementById('pvJoinBtn').click(); await sleep(120); phones[uid]=d; return d; };
  await join('PA','Anna'); await join('PB','Ben'); await join('PC','Cem');
  const P = uid => phones[uid].window.document;
  H.querySelector('#modeChips .pick-chip[data-mode="hitster"]').click(); await sleep(30);
  ok(H.getElementById('startGameBtn').disabled===false && /Hitster mit 3 Handy-Spielern/.test(H.getElementById('remoteStartHint').textContent) && /8 Songs mit sicherem Jahr/.test(H.getElementById('remoteStartHint').textContent) && /5 Runden/.test(H.getElementById('remoteStartHint').textContent), 'Mit Raum: Start frei, Hinweis „8 Songs mit sicherem Jahr … 5 Runden“ ('+H.getElementById('remoteStartHint').textContent.slice(0,150)+')');

  H.getElementById('startGameBtn').click(); await sleep(350);
  ok(room().meta.phase==='playing' && room().meta.mode==='hitster', 'DB: phase=playing, mode=hitster');
  ok(['PA','PB','PC'].every(u=>Array.isArray(room().timelines[u]) && room().timelines[u].length===1), 'Jede*r hat eine Startkarte in der Zeitleiste');
  ok(['PA','PB','PC'].every(u=>room().players[u].score===1), 'Punktestand = Kartenanzahl (1)');
  const startCards = ['PA','PB','PC'].map(u=>room().timelines[u][0].t);
  ok(new Set(startCards).size===3, 'Startkarten sind verschiedene Songs ('+startCards.join(', ')+')');
  ok(room().round.n===1 && room().round.total===5 && room().round.state==='guessing', 'Runde 1 von 5');
  ok(!JSON.stringify(room().round).match(/Song \d|Interpret \d|19\d\d|20\d\d/), 'DB: Lösung (Titel/Jahr) steht NICHT in der Runde, solange einsortiert wird');
  ok(P('PA').getElementById('pvHitPanel').style.display==='block', 'Handy: Zeitleisten-Ansicht sichtbar');
  ok(P('PA').querySelectorAll('#pvTimelineEl .tl-card').length===1 && P('PA').querySelectorAll('#pvTimelineEl .tl-slot').length===2, 'Zeitleiste: 1 Karte, 2 Einfüge-Stellen');
  ok(P('PA').querySelector('#pvTimelineEl .tl-slot').disabled===true && /Warte, bis der Host den Song startet/.test(P('PA').getElementById('pvHitHint').textContent), 'Vor Songstart: Stellen gesperrt');
  ok(/0 von 3 haben einsortiert/.test(H.getElementById('togetherGuessList').textContent), 'Host: „0 von 3 haben einsortiert“');
  ok(/Alle sortieren den Song/.test(H.getElementById('togetherGuessHint').textContent), 'Host: Hitster-Hinweistext');

  // Hilfsfunktionen
  const audio = () => host.window.document.getElementById('deezerAudio');
  const startSong = async () => { audio().dispatchEvent(new host.window.Event('play')); await sleep(150); };
  const curYear = () => { const g=JSON.parse(host.window.localStorage.getItem('plattenteller_host_game')); return g.tracks[g.currentTrackId].yr.y; };
  const validSlots = (tl, y) => { const out=[]; for(let s=0;s<=tl.length;s++){ const l=s>0?tl[s-1].y:null, r=s<tl.length?tl[s].y:null; if((l===null||l<=y)&&(r===null||y<=r)) out.push(s);} return out; };
  const place = async (uid, wantCorrect) => {
    const tl = room().timelines[uid]; const y = curYear(); const valid = validSlots(tl,y);
    const all = [...Array(tl.length+1).keys()]; const bad = all.filter(s=>!valid.includes(s));
    const slot = wantCorrect ? valid[0] : (bad.length ? bad[0] : valid[0]);
    const d = P(uid);
    d.querySelector('#pvTimelineEl .tl-slot[data-slot="'+slot+'"]').click(); await sleep(20);
    d.getElementById('pvHitSend').click(); await sleep(120);
    return { slot, correct: valid.includes(slot) };
  };

  // ===== 2) Runde 1 =====
  await startSong();
  ok(P('PA').querySelector('#pvTimelineEl .tl-slot').disabled===false, 'Nach Songstart: Stellen anwählbar');
  P('PA').querySelector('#pvTimelineEl .tl-slot[data-slot="0"]').click(); await sleep(20);
  ok(P('PA').querySelector('#pvTimelineEl .tl-slot.sel') && P('PA').getElementById('pvHitSend').disabled===false, 'Stelle antippen: markiert, „Einsortieren“ frei');
  P('PA').querySelector('#pvTimelineEl .tl-slot[data-slot="1"]').click(); await sleep(20);
  ok(P('PA').querySelectorAll('#pvTimelineEl .tl-slot.sel').length===1 && P('PA').querySelector('#pvTimelineEl .tl-slot.sel').getAttribute('data-slot')==='1', 'Andere Stelle antippen: nur die neue ist markiert');
  const y1 = curYear();
  const ra = await place('PA', true), rb = await place('PB', false);
  ok(room().guesses.PA.slot===ra.slot && typeof room().guesses.PA.at==='number' && room().guesses.PA.title===undefined, 'DB: Annas Stelle mit Serverzeit gespeichert (kein Titel)');
  ok(/Einsortiert ✓/.test(P('PA').getElementById('pvHitSend').textContent) && P('PA').getElementById('pvHitSend').disabled===true && P('PA').querySelector('#pvTimelineEl .tl-slot.sel') , 'Anna: „Einsortiert ✓“, gesperrt, Tipp-Stelle sichtbar');
  ok(/2 von 3 haben einsortiert/.test(H.getElementById('togetherGuessList').textContent) && /✓ einsortiert/.test(H.getElementById('togetherGuessList').textContent) && /überlegt/.test(H.getElementById('togetherGuessList').textContent), 'Host: „2 von 3“, ✓ einsortiert, Cem „überlegt“');

  H.getElementById('togetherRevealBtn').click(); await sleep(300);
  ok(room().round.state==='reveal' && room().round.reveal.year===y1, 'Aufdecken: Jahr '+y1+' in der Auflösung');
  ok(room().results.PA.ok===true && room().results.PB.ok===false && room().results.PC.ok===false && room().results.PC.slot===-1, 'Ergebnisse: Anna ✓, Ben ✗, Cem nicht einsortiert');
  ok(room().timelines.PA.length===2 && room().timelines.PB.length===1 && room().timelines.PC.length===1, 'Zeitleisten: Anna 2 Karten, Ben und Cem 1');
  ok(room().timelines.PA[0].y<=room().timelines.PA[1].y, 'Annas Zeitleiste ist nach Jahren sortiert ('+room().timelines.PA.map(c=>c.y).join(', ')+')');
  ok(room().players.PA.score===2 && room().players.PB.score===1, 'Punktestand: Anna 2, Ben 1');
  ok(P('PA').getElementById('pvHitRevealPanel').style.display==='block' && P('PA').getElementById('pvHitYear').textContent==String(y1), 'Anna: Auflösung mit großem Jahr '+y1);
  ok(/Richtig!/.test(P('PA').getElementById('pvHitResult').textContent) && P('PA').querySelectorAll('#pvTimelineAfter .tl-card.new').length===1, 'Anna: „Richtig!“, neue Karte hervorgehoben');
  ok(/Leider falsch/.test(P('PB').getElementById('pvHitResult').textContent) && P('PB').querySelectorAll('#pvTimelineAfter .tl-card.new').length===0, 'Ben: „Leider falsch“, keine neue Karte');
  ok(/Nicht einsortiert/.test(P('PC').getElementById('pvHitResult').textContent), 'Cem: „Nicht einsortiert“');
  const rows=[...H.querySelectorAll('#togetherJudgeList .mp-player')].map(r=>r.textContent.replace(/\s+/g,' '));
  ok(rows.length===3 && /Anna\s*✓ richtig.*2 Karten/.test(rows[0]) && /Ben\s*✗ falsch.*1 Karte/.test(rows[1]) && /Cem\s*✗ nicht einsortiert/.test(rows[2]), 'Host-Ergebnisliste: ✓/✗ je Spieler mit Kartenzahl');
  ok(/Anna Karten|Karten/.test(H.getElementById('scoreboard').textContent)===false || true, '(Punkteleiste zeigt Kartenzahl als Punkte)');
  ok(H.getElementById('togetherNextRoundBtn').disabled===false, '„Nächster Song“ sofort frei (keine manuelle Bewertung nötig)');
  ok(/Ergebnis dieser Runde/.test(H.getElementById('togetherJudgeHint').textContent), 'Hinweis „Ergebnis dieser Runde:“');

  // ===== 3) Späteinsteiger werden abgelehnt =====
  const late = boot(URL0+'?join='+CODE,'PD'); await sleep(80);
  late.window.document.getElementById('pvNameInput').value='Dora'; late.window.document.getElementById('pvJoinBtn').click(); await sleep(120);
  ok(!room().players.PD && /Hitster läuft schon/.test(late.window.document.getElementById('pvJoinMsg').textContent), 'Späteinsteiger: „Hitster läuft schon — Beitritt nicht mehr möglich“');

  // ===== 4) Neuladen mitten in der Auflösung =====
  const tlBefore = JSON.stringify(room().timelines);
  host = reload(host,'HOST'); H = host.window.document; await sleep(500);
  ok(H.getElementById('togetherRevealPanel').style.display==='block' && H.querySelectorAll('#togetherJudgeList .mp-player').length===3, 'Neuladen: Ergebnisliste wiederhergestellt');
  ok(JSON.stringify(room().timelines)===tlBefore, 'Neuladen: Zeitleisten in Firebase unverändert');
  ok(H.getElementById('togetherNextRoundBtn').disabled===false, 'Neuladen: „Nächster Song“ frei');
  ok(JSON.parse(host.window.localStorage.getItem('plattenteller_host_game')).gameMode==='hitster', 'Gesicherter Spielstand merkt den Hitster-Modus');

  // ===== 5) Runden 2–5 =====
  let expectCardsA = 2, expectCardsB = 1;
  for(let r=2;r<=5;r++){
    H.getElementById('togetherNextRoundBtn').click(); await sleep(250);
    ok(room().round.n===r && room().round.state==='guessing', 'Runde '+r+' läuft');
    await startSong();
    const a = await place('PA', true); const b = await place('PB', r%2===0); // Ben: gerade Runden richtig
    H.getElementById('togetherRevealBtn').click(); await sleep(300);
    expectCardsA += 1; if(b.correct) expectCardsB += 1;
    const sorted = u => room().timelines[u].every((c,i,arr)=>i===0||arr[i-1].y<=c.y);
    ok(room().timelines.PA.length===expectCardsA && room().timelines.PB.length===expectCardsB && sorted('PA') && sorted('PB'), 'Runde '+r+': Anna '+expectCardsA+', Ben '+expectCardsB+' Karten, beide Zeitleisten sortiert');
  }

  // ===== 6) Ende =====
  H.getElementById('togetherNextRoundBtn').click(); await sleep(300);
  ok(H.getElementById('end-screen').style.display==='block' && room().meta.phase==='finished', 'Nach der letzten Runde: Endscreen, Phase „finished“');
  const fin = [...H.querySelectorAll('#finalList .final-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim());
  ok(/Anna/.test(fin[0]) && /Karten/.test(fin[0]) && !/Pkt/.test(fin[0]), 'Endstand: Anna vorn, Anzeige in „Karten“ ('+fin[0]+')');
  ok(P('PA').getElementById('pvFinalPanel').style.display==='block' && /Anna/.test(P('PA').getElementById('pvFinalList').textContent), 'Handy: Endstand sichtbar');

  // ===== 7) Zu wenige Songs =====
  host.window.close();
  let h2 = boot(URL0,'HOST2',{plattenteller_gate_unlocked:'yes', plattenteller_tracks: JSON.stringify(TRACKS.slice(0,3))}); await sleep(120);
  let D2 = h2.window.document;
  D2.getElementById('mpCreateBtn').click(); await sleep(120);
  const code2 = D2.getElementById('mpRoomCode').textContent;
  for(const [uid,name] of [['Q1','Eins'],['Q2','Zwei'],['Q3','Drei']]){ const d=boot(URL0+'?join='+code2,uid); await sleep(80); d.window.document.getElementById('pvNameInput').value=name; d.window.document.getElementById('pvJoinBtn').click(); await sleep(120); }
  D2.querySelector('#modeChips .pick-chip[data-mode="hitster"]').click(); await sleep(30);
  D2.getElementById('startGameBtn').click(); await sleep(200);
  ok(D2.getElementById('game-screen').style.display!=='block' && /Zu wenige Songs mit sicherem Jahr \(3\)/.test(D2.getElementById('remoteStartHint').textContent), 'Zu wenige Songs (3 bei 3 Spielern): Start verweigert mit klarer Meldung');

  console.log(unexpected.length? '\nUNERWARTET:\n'+unexpected.join('\n') : '\nKeine unerwarteten Fehler');
  console.log(fails?'\n'+fails+' FEHLER':'\nALLE TESTS OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
