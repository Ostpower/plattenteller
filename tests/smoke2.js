const { JSDOM } = require('jsdom');
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
function boot(url, uid, storage){
  const { VirtualConsole } = require('jsdom');
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if(!/Not implemented|Could not parse CSS/.test(e.message)) errors.push(uid+': '+e.message); });
  vc.on('error', (...a)=>{ const m=a.join(' '); if(!/Raum nicht gefunden/.test(m)) errors.push(uid+' console.error: '+m.slice(0,200)); });
  return new JSDOM(html, { url, runScripts:'dangerously', pretendToBeVisual:true, virtualConsole: vc,
    beforeParse(w){
      w.firebase = makeFirebase(shared, uid);
      w.eval(qrSrc + ';window.qrcode = qrcode;');
      w.confirm = () => true;
      w.crypto = require('crypto').webcrypto;
      if(storage) for(const [k,v] of Object.entries(storage)) w.localStorage.setItem(k,v);
      w.fetch = () => Promise.reject(new Error('no net'));
    }});
}
let fails = 0;
const ok = (c, m) => { console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
const type = (w, el, text) => { el.value = text; el.dispatchEvent(new w.Event('input', {bubbles:true})); };
(async()=>{
  const host = boot('https://ostpower.github.io/plattenteller/', 'HOST', { plattenteller_gate_unlocked:'yes' });
  const hw = host.window, H = hw.document;

  // Songs manuell hinzufügen
  const addSong = (id, title, artist, fun) => {
    H.getElementById('trackUrlInput').value = 'https://open.spotify.com/track/'+id;
    H.getElementById('trackTitleInput').value = title;
    H.getElementById('trackArtistInput').value = artist;
    H.getElementById('trackFunFactInput').value = fun||'';
    H.getElementById('addTrackBtn').click();
  };
  addSong('4uLU6hMCjMI75M1A2tKUQC','Never Gonna Give You Up','Rick Astley','Rickroll');
  addSong('3AJwUDP919kvQ9QcozQPxg','Yellow','Coldplay','');
  ok(H.getElementById('startGameBtn').disabled===true, 'Start gesperrt: Songs da, aber noch keine Spieler');

  H.getElementById('mpCreateBtn').click(); await sleep(100);
  const code = H.getElementById('mpRoomCode').textContent;
  const join = async (uid, name) => {
    const d = boot('https://ostpower.github.io/plattenteller/?join='+code, uid); await sleep(80);
    d.window.document.getElementById('pvNameInput').value = name;
    d.window.document.getElementById('pvJoinBtn').click(); await sleep(100); return d;
  };
  const A = await join('PA','Anna'), B = await join('PB','Ben');
  const a = A.window.document, b = B.window.document;
  ok(H.getElementById('startGameBtn').disabled===false, 'Start frei sobald Handy-Spieler im Raum sind');
  ok(/2 Handy-Spielern/.test(H.getElementById('remoteStartHint').textContent), 'Hinweis „2 Handy-Spielern“ sichtbar');

  // Spiel starten
  H.getElementById('startGameBtn').click(); await sleep(150);
  const room = () => shared.tree.rooms[code];
  ok(H.getElementById('game-screen').style.display==='block', 'Host: Spielscreen offen');
  ok(room().meta.phase==='playing' && room().meta.mode==='together', 'DB: phase=playing, mode=together');
  ok(room().round && room().round.n===1 && room().round.state==='guessing' && room().round.total===2, 'DB: Runde 1/2 im Tipp-Status');
  ok(!JSON.stringify(room().round).match(/Rick|Yellow|Coldplay|Astley/), 'DB: Lösung NICHT sichtbar während getippt wird');
  ok(a.getElementById('pvGuessPanel').style.display==='block', 'Anna: Tippfeld sichtbar');
  ok(b.getElementById('pvGuessPanel').style.display==='block', 'Ben: Tippfeld sichtbar');
  ok(a.getElementById('pvRoundNo').textContent==='1' && a.getElementById('pvRoundTotal').textContent==='2', 'Anna: „Song 1 von 2“');
  ok(/0 von 2/.test(H.getElementById('togetherGuessList').textContent), 'Host: „0 von 2 haben getippt“');

  // Vor dem Songstart: Tippen gesperrt
  ok(a.getElementById('pvGuessBtn').disabled===true && a.getElementById('pvGuessTitle').disabled===true, 'Anna: vor Songstart Tippfeld/Knopf gesperrt');
  ok(/Warte, bis der Host den Song startet/.test(a.getElementById('pvGuessHint').textContent), 'Anna: Hinweis „Warte auf Songstart“');

  // Host startet den Song (Wiedergabe läuft)
  const audio = hw.document.getElementById('deezerAudio');
  audio.dispatchEvent(new hw.Event('play')); await sleep(150);
  ok(typeof room().round.startedAt==='number', 'DB: Startzeit (startedAt) gesetzt');
  const started1 = room().round.startedAt;
  audio.dispatchEvent(new hw.Event('pause')); await sleep(30);
  audio.dispatchEvent(new hw.Event('play')); await sleep(100);
  ok(room().round.startedAt===started1, 'Pause/Weiterspielen ändert die Startzeit NICHT');
  ok(a.getElementById('pvGuessBtn').disabled===false && a.getElementById('pvGuessTitle').disabled===false, 'Anna: nach Songstart Tippfeld frei');
  ok(/Der Song läuft/.test(a.getElementById('pvGuessHint').textContent), 'Anna: Hinweis „Der Song läuft“');

  // Tippen allein sendet NICHT mehr
  type(A.window, a.getElementById('pvGuessTitle'), 'never gonna give you up');
  type(A.window, a.getElementById('pvGuessArtist'), 'rick astley');
  type(B.window, b.getElementById('pvGuessTitle'), 'Yellow');
  await sleep(1000);
  ok(!room().guesses, 'DB: nichts gesendet, solange niemand auf „Abschicken“ klickt');
  ok(!/Gesendet/.test(a.getElementById('pvGuessMsg').textContent), 'Anna: KEIN „Gesendet“ ohne Knopfdruck');
  ok(/0 von 2/.test(H.getElementById('togetherGuessList').textContent), 'Host: weiterhin „0 von 2 haben getippt“');

  // Anna schickt ab
  await sleep(300);
  a.getElementById('pvGuessBtn').click(); await sleep(150);
  ok(room().guesses && room().guesses.PA && room().guesses.PA.title==='never gonna give you up' && typeof room().guesses.PA.at==='number', 'DB: Annas Tipp samt Zeitstempel gespeichert');
  ok(/Gesendet ✓ — nach \d+,\d s/.test(a.getElementById('pvGuessMsg').textContent), 'Anna: „Gesendet ✓ — nach X,Y s“ ('+a.getElementById('pvGuessMsg').textContent+')');
  ok(a.getElementById('pvGuessBtn').disabled===true && a.getElementById('pvGuessTitle').disabled===true, 'Anna: nach dem Senden alles gesperrt (endgültig)');
  ok(/1 von 2/.test(H.getElementById('togetherGuessList').textContent), 'Host: „1 von 2 haben getippt“ (live)');
  ok(/✓ getippt · \d+,\d s/.test(H.getElementById('togetherGuessList').textContent), 'Host: sieht die Zeit bei Anna ('+H.getElementById('togetherGuessList').textContent.replace(/\s+/g,' ').slice(0,90)+')');
  ok(/tippt …/.test(H.getElementById('togetherGuessList').textContent), 'Host: Ben noch „tippt …“');

  // Neuladen von Annas Handy: gesendeter Tipp bleibt, weiterhin gesperrt
  const A2 = boot('https://ostpower.github.io/plattenteller/?join='+code, 'PA'); await sleep(250);
  const a2 = A2.window.document;
  ok(a2.getElementById('pvGuessTitle').value==='never gonna give you up' && a2.getElementById('pvGuessTitle').disabled===true, 'Anna nach Neuladen: Tipp da und gesperrt');
  ok(/Gesendet ✓/.test(a2.getElementById('pvGuessMsg').textContent), 'Anna nach Neuladen: „Gesendet ✓“');

  // Ben leer abschicken → Hinweis; dann mit Tipp
  b.getElementById('pvGuessTitle').value=''; b.getElementById('pvGuessBtn').click(); await sleep(60);
  ok(/Bitte erst etwas eintippen/.test(b.getElementById('pvGuessMsg').textContent) && !room().guesses.PB, 'Ben: leerer Tipp wird nicht gesendet');
  type(B.window, b.getElementById('pvGuessTitle'), 'Yellow');
  b.getElementById('pvGuessBtn').click(); await sleep(150);
  ok(room().guesses.PB && room().guesses.PB.title==='Yellow', 'DB: Bens Tipp gesendet');
  ok(/2 von 2/.test(H.getElementById('togetherGuessList').textContent), 'Host: „2 von 2 haben getippt“');

  // Aufdecken
  H.getElementById('togetherRevealBtn').click(); await sleep(150);
  ok(room().round.state==='reveal' && room().round.reveal && room().round.reveal.title, 'DB: aufgedeckt, Lösung veröffentlicht');
  const sol = room().round.reveal;
  ok(a.getElementById('pvRevealPanel').style.display==='block' && a.getElementById('pvRevealTitle').textContent===sol.title, 'Anna: Auflösung sichtbar ('+sol.title+')');
  ok(/Wird bewertet/.test(a.getElementById('pvMyResult').textContent), 'Anna: „Wird bewertet …“');
  const judgeBlocks = [...H.querySelectorAll('#togetherJudgeList .panel')];
  ok(judgeBlocks.length===2, 'Host: 2 Bewertungsblöcke');
  ok(/Tipp \(nach \d+,\d s\): never gonna give you up \/ rick astley/.test(H.getElementById('togetherJudgeList').textContent), 'Host: sieht Annas Tipp samt Zeit');
  ok(/Tipp \(nach \d+,\d s\): Yellow/.test(H.getElementById('togetherJudgeList').textContent), 'Host: sieht Bens Tipp samt Zeit');
  ok(/Dein Tipp \(nach \d+,\d s\): never gonna give you up/.test(a.getElementById('pvMyResult').textContent), 'Anna: Auflösung zeigt eigenen Tipp mit Zeit');
  // Bewerten: Anna +2, Ben 0
  const btn = (blk, sc) => blk.querySelector('button[data-score="'+sc+'"]');
  const nameOf = blk => blk.querySelector('label').textContent;
  for(const blk of judgeBlocks){ btn(blk, nameOf(blk)==='Anna' ? '2' : '0').click(); }
  await sleep(150);
  ok(room().players.PA.score===2 && room().players.PB.score===0, 'DB: Anna 2, Ben 0');
  ok(room().results.PA.pts===2 && room().results.PA.round===1, 'DB: results/PA gesetzt');
  ok(/\+2 Punkte/.test(a.getElementById('pvMyResult').textContent), 'Anna: „+2 Punkte“');
  ok(H.getElementById('togetherNextRoundBtn').disabled===false, 'Host: „Nächster Song“ freigeschaltet');

  // Runde 2
  H.getElementById('togetherNextRoundBtn').click(); await sleep(200);
  ok(room().round.n===2 && room().round.state==='guessing' && !room().round.reveal, 'DB: Runde 2, keine alte Lösung mehr');
  ok(!room().guesses && !room().results, 'DB: Tipps/Ergebnisse der Vorrunde gelöscht');
  ok(a.getElementById('pvGuessPanel').style.display==='block' && a.getElementById('pvGuessTitle').value==='', 'Anna: neues leeres Tippfeld');
  ok(a.getElementById('pvGuessTitle').disabled===true, 'Runde 2: vor dem Songstart wieder gesperrt');
  ok(room().round.startedAt===undefined, 'Runde 2: noch keine Startzeit');
  audio.dispatchEvent(new hw.Event('pause')); audio.dispatchEvent(new hw.Event('play')); await sleep(150);
  ok(typeof room().round.startedAt==='number', 'Runde 2: Startzeit gesetzt');
  type(B.window, b.getElementById('pvGuessTitle'), 'Coldplay Song'); b.getElementById('pvGuessBtn').click(); await sleep(150);
  H.getElementById('togetherRevealBtn').click(); await sleep(150);
  const blocks2 = [...H.querySelectorAll('#togetherJudgeList .panel')];
  for(const blk of blocks2){ btn(blk, nameOf(blk)==='Ben' ? '1a' : '0').click(); }
  await sleep(150);
  ok(room().players.PB.score===1 && room().players.PA.score===2, 'DB: nach Runde 2 Anna 2, Ben 1');

  // Ende
  H.getElementById('togetherNextRoundBtn').click(); await sleep(200);
  ok(H.getElementById('end-screen').style.display==='block', 'Host: Endscreen');
  ok(room().meta.phase==='finished', 'DB: phase=finished');
  ok(a.getElementById('pvFinalPanel').style.display==='block' && /Anna/.test(a.getElementById('pvFinalList').textContent), 'Anna: Endstand sichtbar');
  const rows = [...a.querySelectorAll('#pvFinalList .mp-player')].map(r=>r.textContent);
  ok(/Anna/.test(rows[0]) && /Ben/.test(rows[1]), 'Endstand: Anna vor Ben');

  // Neues Spiel
  H.getElementById('restartBtn').click(); await sleep(250);
  ok(room().meta.phase==='lobby' && room().players.PA.score===0 && !room().round, 'DB: Raum zurück in Lobby, Scores 0, Runde weg');
  ok(a.getElementById('pvLobbyPanel').style.display==='block', 'Anna: zurück in der Lobby');
  ok(H.getElementById('setup-screen').style.display==='block', 'Host: zurück im Setup');
  ok(H.getElementById('mpCount').textContent==='2', 'Host: Spieler weiterhin im Raum');

  // Lokaler Modus unverändert: Raum schließen, lokale Spieler, Spiel
  H.getElementById('mpCloseBtn').click(); await sleep(100);
  H.getElementById('playerInput').value='Lokal1'; H.getElementById('addPlayerBtn').click();
  ok(H.getElementById('startGameBtn').disabled===false, 'Lokal: Start mit lokalem Spieler möglich');
  H.getElementById('startGameBtn').click(); await sleep(100);
  ok(H.getElementById('game-screen').style.display==='block' && H.getElementById('guessPanel').style.display==='block', 'Lokal: Reihenfolge-Modus startet wie gewohnt');

  console.log(errors.length? '\nUNERWARTETE FEHLER:\n'+errors.join('\n') : '\nKeine unerwarteten Konsolenfehler');
  console.log(fails? ('\n'+fails+' FEHLER') : '\nALLE TESTS OK');
  process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
