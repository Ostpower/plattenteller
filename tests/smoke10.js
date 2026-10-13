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
const CD = 1500;
function boot(url, uid, storage){
  const tag = Symbol(uid); const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if(!/Not implemented|Could not parse CSS/.test(e.message)) unexpected.push(uid+': '+e.message); });
  vc.on('error', (...a)=>{ const m=a.join(' '); if(!/Raum nicht gefunden/.test(m)) unexpected.push(uid+' console.error: '+m.slice(0,200)); });
  const dom = new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.firebase = makeFirebase(shared, uid, tag); w.eval(qrSrc+';window.qrcode=qrcode;'); w.confirm=()=>true; w.crypto=require('crypto').webcrypto;
    w.fetch=()=>Promise.reject(new Error('no net')); w.PT_HEARTBEAT_MS=100000; w.PT_QUIZ_COUNTDOWN_MS=CD;
    for(const [k,v] of Object.entries(storage||{})) w.localStorage.setItem(k,v);
  }}); dom.__tag=tag; return dom;
}
const ART=['Oasis','Nirvana','The Killers','Coldplay','Queen','Blur','Muse','Radiohead'];
const mkTrack=(n,y)=>({id:'sp_ID'+n,source:'spotify',uri:'spotify:track:ID'+n,title:'Titel '+n+(n===3?' - Remastered 2011':''),artist:ART[n-1],artistKey:'AR'+n,cover:'',year:y});
const YEARS=[1995,1991,2004,2000,1975,1994,2001,1997];
const TRACKS=ART.map((_,i)=>mkTrack(i+1,YEARS[i]));
let CODE; const room=()=>shared.tree.rooms[CODE];
const reload = (old, uid) => { const st={}; for(let i=0;i<old.window.localStorage.length;i++){ const k=old.window.localStorage.key(i); st[k]=old.window.localStorage.getItem(k); }
  for(let i=shared.listeners.length-1;i>=0;i--) if(shared.listeners[i].owner===old.__tag) shared.listeners.splice(i,1); old.window.close(); return boot(URL0,uid,st); };

(async()=>{
  let host = boot(URL0,'HOST',{plattenteller_gate_unlocked:'yes', plattenteller_tracks: JSON.stringify(TRACKS)}); await sleep(120);
  let H = host.window.document;
  H.getElementById('mpCreateBtn').click(); await sleep(120);
  CODE = H.getElementById('mpRoomCode').textContent;
  const phones={};
  const join = async (uid,name) => { const d=boot(URL0+'?join='+CODE,uid); await sleep(80); const D=d.window.document; D.getElementById('pvNameInput').value=name; D.getElementById('pvJoinBtn').click(); await sleep(120); phones[uid]=d; return d; };
  await join('PA','Anna'); await join('PB','Ben'); await join('PC','Cem');
  const P=uid=>phones[uid].window.document;

  // ===== Auswahl =====
  ok(H.getElementById('quizSettings').style.display==='none', 'Quiz-Einstellungen anfangs versteckt');
  H.querySelector('#modeChips .pick-chip[data-mode="quiz"]').click(); await sleep(30);
  ok(H.getElementById('quizSettings').style.display==='block', 'Modus „Quiz“: Einstellungen (Frage, Countdown) erscheinen');
  ok(H.querySelectorAll('#quizKindChips .pick-chip').length===3 && H.querySelectorAll('#quizCountdownChips .pick-chip').length===3, 'Frage: Band/Titel/Gemischt; Countdown: 5/10/15 s');
  H.querySelector('#quizCountdownChips .pick-chip[data-sec="5"]').click();
  ok(H.querySelector('#quizCountdownChips .pick-chip[data-sec="5"]').classList.contains('selected') && !H.querySelector('#quizCountdownChips .pick-chip[data-sec="10"]').classList.contains('selected'), 'Countdown-Wahl wird markiert');
  ok(H.getElementById('startGameBtn').disabled===false && /Quiz mit 3 Handy-Spielern: 8 Songs → 8 Runden/.test(H.getElementById('remoteStartHint').textContent), 'Hinweis: „Quiz mit 3 Handy-Spielern: 8 Songs → 8 Runden“');

  const corr = () => JSON.parse(host.window.localStorage.getItem('plattenteller_host_game')).quizCorrect;
  const cur = () => { const g=JSON.parse(host.window.localStorage.getItem('plattenteller_host_game')); return g.tracks[g.currentTrackId]; };
  const wrong = () => [0,1,2,3].filter(i=>i!==corr())[0];
  const tap = async (uid, idx, wait=40) => { P(uid).querySelector('#pvQuizAnswers .qz-btn[data-choice="'+idx+'"]').click(); await sleep(wait); };
  const startSong = async () => { host.window.document.getElementById('deezerAudio').dispatchEvent(new host.window.Event('play')); await sleep(150); };

  H.getElementById('startGameBtn').click(); await sleep(350);
  ok(room().meta.phase==='playing' && room().meta.mode==='quiz', 'DB: mode=quiz');
  const r1 = room().round;
  ok(r1.kind==='artist' && r1.options.length===4 && new Set(r1.options).size===4 && r1.countdownMs===CD && r1.state==='guessing', 'Runde 1: Frage „Band“, 4 verschiedene Antworten, Countdown festgelegt');
  ok(r1.options[corr()]===cur().artist, 'Die richtige Antwort ist unter den vier ('+cur().artist+') — Position nur dem Host bekannt');
  ok(!('correct' in r1) && !JSON.stringify(r1).match(/Titel \d|Remastered|19\d\d|20\d\d/), 'DB: richtige Position/Titel/Jahr NICHT in der Runde');
  ok(r1.options.every(o=>ART.includes(o)), 'Falsche Antworten kommen aus demselben Stapel');
  ok(P('PA').getElementById('pvQuizPanel').style.display==='block' && P('PA').querySelectorAll('#pvQuizAnswers .qz-btn').length===4, 'Handy: 4 Antwort-Knöpfe');
  ok([...P('PA').querySelectorAll('#pvQuizAnswers .qz-btn')].every(b=>b.disabled) && /Warte, bis der Host den Song startet/.test(P('PA').getElementById('pvQuizHint').textContent), 'Vor Songstart: Knöpfe gesperrt');
  ok(/Welche Band/.test(P('PA').getElementById('pvQuizQ').textContent), 'Frage „Welche Band / welcher Interpret?“');

  // ===== Runde 1: ändern, dann Countdown =====
  await startSong();
  ok([...P('PA').querySelectorAll('#pvQuizAnswers .qz-btn')].every(b=>!b.disabled), 'Nach Songstart: Knöpfe frei');
  await tap('PA', wrong());
  const at1 = room().guesses.PA.at;
  ok(room().guesses.PA.choice===wrong() && /eingecheckt/.test(P('PA').getElementById('pvQuizHint').textContent) && P('PA').querySelector('#pvQuizAnswers .qz-btn.sel'), 'Anna wählt (falsch): „Antwort eingecheckt ✓“, Knopf markiert');
  await tap('PA', corr(), 60);
  ok(room().guesses.PA.choice===corr() && room().guesses.PA.at>at1, 'Anna ändert auf die richtige: überschrieben, neue Zeit ('+(room().guesses.PA.at-at1)+' ms später)');
  ok(P('PA').querySelectorAll('#pvQuizAnswers .qz-btn.sel').length===1, 'Nur eine Antwort markiert');
  await tap('PB', corr(), 60);
  ok(/2 von 3 haben geantwortet/.test(H.getElementById('togetherGuessList').textContent) && room().round.deadlineStart===undefined, 'Host: „2 von 3“, noch KEIN Countdown');
  await tap('PC', wrong(), 40); await sleep(100);
  ok(typeof room().round.deadlineStart==='number', 'Alle 3 geantwortet: Countdown gestartet (Serverzeit)');
  ok(/Alle haben geantwortet — Auflösung in \d+ s/.test(H.getElementById('quizStatusLine').textContent) && H.getElementById('quizStatusLine').style.display!=='none', 'Host zeigt „Auflösung in N s“');
  ok(/Noch \d+ s/.test(P('PB').getElementById('pvQuizCountdown').textContent), 'Handy zeigt Countdown („Noch N s“)');
  // Während des Countdowns ändern: Anna wechselt weg und zurück -> ihre endgültige Zeit ist jetzt LATER als Bens
  await tap('PA', wrong(), 60); await tap('PA', corr(), 60);
  ok(room().guesses.PA.choice===corr() && room().guesses.PA.at>room().guesses.PB.at, 'Im Countdown geändert: Annas endgültige Zeit ist später als Bens');
  ok([...P('PA').querySelectorAll('#pvQuizAnswers .qz-btn')].every(b=>!b.disabled), 'Während des Countdowns noch änderbar');
  await sleep(CD + 600);
  ok([...P('PC').querySelectorAll('#pvQuizAnswers .qz-btn')].length===0 || P('PC').getElementById('pvQuizRevealPanel').style.display==='block', 'Nach dem Countdown: Auflösung (Antwortknöpfe weg)');
  ok(room().round.state==='reveal' && room().round.reveal.correct===corr() && room().round.reveal.title===cur().title, 'Automatisch aufgedeckt: richtige Antwort und Titel in der Datenbank');
  ok(room().results.PA.ok===true && room().results.PB.ok===true && room().results.PC.ok===false, 'Ergebnis: Anna ✓, Ben ✓, Cem ✗');
  ok(room().results.PB.bonus===true && room().results.PA.bonus===false, 'Schnellster-Bonus geht an Ben (Annas letzte Antwort war später)');
  ok(room().players.PB.score===2 && room().players.PA.score===1 && room().players.PC.score===0, 'Punkte: Ben 2, Anna 1, Cem 0');
  ok(/Richtig!/.test(P('PA').getElementById('pvQuizResult').textContent) && /\+1 Punkt/.test(P('PA').getElementById('pvQuizResult').textContent), 'Anna: „Richtig! +1 Punkt“');
  ok(/\+2 Punkte \(schnellste richtige Antwort\)/.test(P('PB').getElementById('pvQuizResult').textContent), 'Ben: „+2 Punkte (schnellste richtige Antwort)“');
  ok(/Leider falsch/.test(P('PC').getElementById('pvQuizResult').textContent) && P('PC').querySelectorAll('#pvQuizAfter .qz-btn.good').length===1 && P('PC').querySelectorAll('#pvQuizAfter .qz-btn.bad').length===1, 'Cem: „Leider falsch“, richtige Antwort grün, eigene rot');
  const rows=[...H.querySelectorAll('#togetherJudgeList .mp-player')].map(r=>r.textContent.replace(/\s+/g,' '));
  ok(rows.length===3 && /Ben.*✓ richtig \+2 \(schnellste\)/.test(rows[1]) && /Anna.*✓ richtig \+1/.test(rows[0]) && /Cem.*✗/.test(rows[2]), 'Host-Liste: Anna +1, Ben +2 (schnellste), Cem ✗ mit Antwort');
  ok(/Richtig war: „/.test(H.getElementById('togetherJudgeHint').textContent), 'Host: „Richtig war: …“');
  ok(H.getElementById('togetherNextRoundBtn').disabled===false, '„Nächster Song“ sofort frei');
  ok(H.getElementById('quizStatusLine').style.display==='none', 'Countdown-Anzeige nach dem Aufdecken weg');

  // ===== Runde 2: Ben offline blockiert den Countdown nicht =====
  H.getElementById('togetherNextRoundBtn').click(); await sleep(300);
  ok(room().round.n===2 && room().round.deadlineStart===undefined && room().round.state==='guessing', 'Runde 2: alter Countdown ist weg');
  shared.fireDisconnect(phones.PB.__tag); await sleep(80);
  await startSong();
  await tap('PA', corr(), 40); await tap('PC', wrong(), 40); await sleep(120);
  ok(typeof room().round.deadlineStart==='number', 'Ben offline (ohne Antwort): Countdown startet trotzdem, wenn alle Verbundenen geantwortet haben');
  await sleep(CD + 600);
  ok(room().round.state==='reveal' && room().results.PB.choice===-1 && room().results.PB.ok===false && room().results.PB.pts===0, 'Ben ohne Antwort: 0 Punkte');
  ok(room().results.PA.ok===true && room().results.PA.bonus===false && room().players.PA.score===2, 'Nur Anna richtig: +1, KEIN Schnellster-Bonus (Bonus erst ab 2 Richtigen)');
  ok(/keine Antwort/.test(H.getElementById('togetherJudgeList').textContent), 'Host: „keine Antwort“');

  // ===== Runde 3: manuell aufdecken =====
  shared.tree.rooms[CODE].players.PB.connected=true;
  H.getElementById('togetherNextRoundBtn').click(); await sleep(300);
  await startSong();
  await tap('PA', corr(), 40);
  H.getElementById('togetherRevealBtn').click(); await sleep(250);
  ok(room().round.state==='reveal' && room().results.PA.ok===true, 'Manuell aufdecken (ohne Countdown) klappt');
  const before = JSON.stringify(room().results)+room().players.PA.score;
  await sleep(CD + 500);
  ok(JSON.stringify(room().results)+room().players.PA.score===before, 'Nach manuellem Aufdecken kommt kein zweites automatisches Aufdecken');

  // ===== Runde 4: Neuladen mitten im Countdown =====
  H.getElementById('togetherNextRoundBtn').click(); await sleep(300);
  await startSong();
  await tap('PA', corr(), 30); await tap('PB', wrong(), 30); await tap('PC', corr(), 30); await sleep(100);
  ok(typeof room().round.deadlineStart==='number', 'Runde 4: Countdown läuft');
  host = reload(host,'HOST'); H = host.window.document; await sleep(400);
  ok(H.getElementById('game-screen').style.display==='block' && /Auflösung in \d+ s|Alle haben geantwortet/.test(H.getElementById('quizStatusLine').textContent), 'Neuladen im Countdown: Host zeigt den Countdown weiter');
  await sleep(CD + 400);
  ok(room().round.state==='reveal' && room().results.PA.ok===true, 'Nach dem Neuladen wird zum Ablauf trotzdem automatisch aufgedeckt');

  // ===== Neuladen in der Auflösung =====
  host = reload(host,'HOST'); H = host.window.document; await sleep(400);
  ok(H.querySelectorAll('#togetherJudgeList .mp-player').length===3 && /Richtig war/.test(H.getElementById('togetherJudgeHint').textContent) && H.getElementById('togetherNextRoundBtn').disabled===false, 'Neuladen in der Auflösung: Ergebnisse wiederhergestellt');
  const scoreBefore = JSON.stringify(Object.fromEntries(Object.entries(room().players).map(([k,v])=>[k,v.score])));

  // ===== Späteinsteiger sind im Quiz erlaubt =====
  const late = boot(URL0+'?join='+CODE,'PD'); await sleep(80);
  late.window.document.getElementById('pvNameInput').value='Dora'; late.window.document.getElementById('pvJoinBtn').click(); await sleep(150);
  ok(!!room().players.PD && room().players.PD.score===0, 'Späteinsteiger (Dora) darf im Quiz mitspielen');
  phones.PD=late;

  // ===== Runden bis zum Ende =====
  for(let r=5;r<=8;r++){
    H.getElementById('togetherNextRoundBtn').click(); await sleep(300);
    if(room().round.n!==r) break;
    await startSong();
    const ids=['PA','PB','PC']; for(const u of ids){ await tap(u, Math.random()<0.7?corr():wrong(), 25); }
    await tap('PD', corr(), 25); await sleep(100);
    await sleep(CD + 500);
  }
  H.getElementById('togetherNextRoundBtn').click(); await sleep(300);
  ok(H.getElementById('end-screen').style.display==='block' && room().meta.phase==='finished', 'Nach der letzten Runde: Endscreen');
  const fin=[...H.querySelectorAll('#finalList .final-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim());
  ok(fin.length===4 && /Pkt\./.test(fin[0]) && !/Karte/.test(fin[0]), 'Endstand in „Pkt.“ mit allen 4 Spielern ('+fin[0]+')');
  ok(P('PA').getElementById('pvFinalPanel').style.display==='block', 'Handy: Endstand sichtbar');

  // ===== Frage „Titel“ =====
  host.window.close();
  const h2 = boot(URL0,'HOST2',{plattenteller_gate_unlocked:'yes', plattenteller_tracks: JSON.stringify(TRACKS)}); await sleep(120); const D2=h2.window.document;
  D2.getElementById('mpCreateBtn').click(); await sleep(120); CODE = D2.getElementById('mpRoomCode').textContent;
  for(const [u,n] of [['T1','Eins'],['T2','Zwei']]){ await join(u,n); }
  D2.querySelector('#modeChips .pick-chip[data-mode="quiz"]').click(); D2.querySelector('#quizKindChips .pick-chip[data-kind="title"]').click(); await sleep(30);
  D2.getElementById('startGameBtn').click(); await sleep(350);
  const rt=room().round;
  ok(rt.kind==='title' && rt.options.length===4 && rt.options.every(o=>/^Titel \d$/.test(o)||o==='Titel 3'), 'Frage „Titel“: Antworten sind Titel, Zusätze wie „- Remastered 2011“ sind entfernt ('+rt.options.join(' | ')+')');
  ok(/Welcher Titel/.test(P('T1').getElementById('pvQuizQ').textContent), 'Handy: „Welcher Titel läuft?“');

  // ===== Zu wenige Interpreten =====
  h2.window.close();
  const few = TRACKS.map((t,i)=>Object.assign({},t,{artist:['A1','A2','A3'][i%3]}));
  const h3 = boot(URL0,'HOST3',{plattenteller_gate_unlocked:'yes', plattenteller_tracks: JSON.stringify(few)}); await sleep(120); const D3=h3.window.document;
  D3.getElementById('mpCreateBtn').click(); await sleep(120); CODE = D3.getElementById('mpRoomCode').textContent;
  await join('U1','Uno');
  D3.querySelector('#modeChips .pick-chip[data-mode="quiz"]').click(); await sleep(30);
  ok(/mindestens 4 verschiedene Interpreten \(aktuell 3\)/.test(D3.getElementById('remoteStartHint').textContent), 'Hinweis: 3 Interpreten sind zu wenig für „Welche Band?“');
  D3.getElementById('startGameBtn').click(); await sleep(150);
  ok(D3.getElementById('game-screen').style.display!=='block', 'Start verweigert (zu wenige Interpreten)');
  D3.querySelector('#quizKindChips .pick-chip[data-kind="title"]').click(); await sleep(30);
  ok(!/mindestens 4 verschiedene Interpreten/.test(D3.getElementById('remoteStartHint').textContent), 'Mit Frage „Titel“ ist die Warnung weg');

  console.log(unexpected.length? '\nUNERWARTET:\n'+unexpected.join('\n') : '\nKeine unerwarteten Fehler');
  console.log(fails?'\n'+fails+' FEHLER':'\nALLE TESTS OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
