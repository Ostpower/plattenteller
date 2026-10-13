const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const PT_PATH = require('path');
const PT_INDEX = process.env.PT_INDEX || PT_PATH.join(__dirname, '..', 'index.html');
const PT_QR = PT_PATH.join(__dirname, 'node_modules', 'qrcode-generator', 'qrcode.js');

let html = fs.readFileSync(PT_INDEX,'utf8').replace(/<script src="[^"]+"[^>]*><\/script>/g, '');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
(async()=>{
  const vc = new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>{ if(!/Not implemented|Could not parse CSS/.test(e.message)) errs.push(e.message); });
  const dom = new JSDOM(html,{url:'https://ostpower.github.io/plattenteller/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){ w.localStorage.setItem('plattenteller_gate_unlocked','yes'); w.confirm=()=>true; w.fetch=()=>Promise.reject(new Error('no net')); }});
  const w=dom.window, D=w.document, $=id=>D.getElementById(id);
  for(let i=1;i<=4;i++){ $('trackUrlInput').value='https://open.spotify.com/track/ID000'+i+'aaaaaaaaaaaaaa'; $('trackTitleInput').value='Song '+i; $('trackArtistInput').value='Interpret '+i; $('addTrackBtn').click(); }
  for(const n of ['Anna','Ben','Cem']){ $('playerInput').value=n; $('addPlayerBtn').click(); }
  $('startGameBtn').click(); await sleep(150);

  // Rangliste ganz am Anfang: niemand hat Punkte -> kein Rang
  let rows=[...D.querySelectorAll('#scoreboard .score-chip')];
  ok(rows.length===3, 'Rangliste: 3 Zeilen');
  ok(rows.every(r=>r.querySelector('.rank').textContent==='–'), 'Ohne Punkte: überall „–“ statt „1“');
  ok(rows[0].classList.contains('active') && /Am Zug/.test(rows[0].textContent), 'Erster Spieler ist „Am Zug“');
  ok(D.getElementById('deckCurrent').textContent==='01' && D.querySelectorAll('#deckTicks i').length===4 && D.querySelectorAll('#deckTicks i.on').length===1, 'Fortschritt: „01“, 4 Striche, 1 gefüllt');

  // Wiedergabe-Zustand: Equalizer + Pause-Knopf
  ok(!$('turntableStage').classList.contains('playing') && !$('vinyl').classList.contains('spin'), 'Anfangs: kein Equalizer, Knopf „Abspielen“');
  $('deezerAudio').dispatchEvent(new w.Event('play')); await sleep(30);
  ok($('turntableStage').classList.contains('playing') && $('vinyl').classList.contains('spin') && $('brandDot').classList.contains('is-playing'), 'Läuft: Equalizer an, Knopf zeigt „Pause“, Punkt grün');
  ok(/Läuft/.test($('nowStatus').textContent), 'Status „Läuft…“');
  $('deezerAudio').dispatchEvent(new w.Event('pause')); await sleep(30);
  ok(!$('vinyl').classList.contains('spin') && /Pausiert/.test($('nowStatus').textContent), 'Pause: Equalizer steht');
  ok($('playBtn') && $('playBtn').getAttribute('role')==='button', 'Play-Knopf (#playBtn) vorhanden');

  // Punkte: Ben bekommt 2 -> Rang 1, Reihenfolge nach Punkten
  $('revealBtn').click(); await sleep(50);
  ok(/Song \d/.test($('revealTitle').textContent), 'Auflösung zeigt den Titel');
  const judgeBtns=[...D.querySelectorAll('#revealPanel .judge-grid button')];
  // Wer ist dran? Anna (Index 0). Wir bewerten Anna mit 2
  judgeBtns.find(b=>b.getAttribute('data-score')==='2').click(); await sleep(50);
  rows=[...D.querySelectorAll('#scoreboard .score-chip')];
  ok(/Anna/.test(rows[0].textContent) && rows[0].classList.contains('lead') && rows[0].querySelector('.rank').textContent==='1' && rows[0].querySelector('.pts').textContent==='2', 'Anna führt mit 2 Punkten (Rang 1, hervorgehoben)');
  ok(rows[1].querySelector('.rank').textContent==='2' && rows[2].querySelector('.rank').textContent==='2', 'Ben und Cem teilen Rang 2');

  // Nächste Runde: Ben ist dran, bekommt Streak/Bonus? -> nur Reihenfolge prüfen
  $('nextRoundBtn').click(); await sleep(50);
  ok(D.getElementById('deckCurrent').textContent==='02' && D.querySelectorAll('#deckTicks i.on').length===2, 'Runde 2: „02“, 2 Striche gefüllt');
  rows=[...D.querySelectorAll('#scoreboard .score-chip')];
  ok(rows.find(r=>r.classList.contains('active')).textContent.includes('Ben'), 'Ben ist jetzt „Am Zug“ (Markierung folgt dem Zug, nicht der Sortierung)');

  // Lokaler Zusammen-Modus: Felder untereinander (stack), nicht nebeneinander
  $('cancelGameBtn').click(); await sleep(30);
  [...D.querySelectorAll('#modeChips .pick-chip')].find(c=>c.getAttribute('data-mode')==='together').click();
  $('startGameBtn').click(); await sleep(100);
  const firstRow = D.querySelector('#togetherGuessList .field');
  ok(!!firstRow && !firstRow.querySelector('.row') && !!firstRow.querySelector('.stack input.together-guess-title') && !!firstRow.querySelector('.stack input.together-guess-artist'), 'Lokaler Zusammen-Modus: Titel- und Interpret-Feld untereinander (.stack)');
  console.log(errs.length? 'FEHLER: '+errs.join(' | ') : 'Keine unerwarteten Fehler');
  console.log(fails?'\n'+fails+' FEHLER':'\nALLE TESTS OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
