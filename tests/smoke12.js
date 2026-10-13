// Runden pro Spiel (10/20/30/50/Alle) und sparsames Jahre-Prüfen im Hitster-Modus
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
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
const errs=[]; const mbCalls=[];
const json = (obj, status=200) => Promise.resolve({ ok: status<400, status, headers:{get:()=>null}, json:()=>Promise.resolve(obj) });
function fetchMock(url){
  const u=String(url);
  const iso=u.match(/musicbrainz\.org\/ws\/2\/isrc\/ISRC(\d+)/);
  if(iso){ mbCalls.push(u); const n=parseInt(iso[1],10); return json({recordings:[{id:'r'+n,title:'Song '+n,'first-release-date':(1960+n)+'-01-01','artist-credit':[{name:'Band '+n}]}]}); }
  if(u.includes('musicbrainz.org')){ mbCalls.push(u); return json({recordings:[]}); }
  return Promise.reject(new Error('no net '+u));
}
function boot(url, uid, storage, extra){
  const tag = Symbol(uid); const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if(!/Not implemented|Could not parse CSS/.test(e.message)) errs.push(uid+': '+e.message); });
  const dom = new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.firebase = makeFirebase(shared, uid, tag); w.eval(qrSrc+';window.qrcode=qrcode;'); w.confirm=()=>true; w.crypto=require('crypto').webcrypto;
    w.fetch=fetchMock; w.PT_HEARTBEAT_MS=100000; w.PT_MB_GAP_MS=1; w.PT_QUIZ_COUNTDOWN_MS=500;
    for(const [k,v] of Object.entries(storage||{})) w.localStorage.setItem(k,v);
    if(extra) extra(w);
  }}); dom.__tag=tag; return dom;
}
const mk=(n,withYear)=>Object.assign({id:'sp_ID'+n,source:'spotify',uri:'spotify:track:ID'+n,title:'Song '+n,artist:'Band '+n,artistKey:'AR'+n,cover:'',year:1990,isrc:'ISRC'+n}, withYear?{yr:{y:1960+n,src:'mb',unsure:false}}:{});
const TRACKS_PLAIN = Array.from({length:40},(_,i)=>mk(i+1,false));  // 40 Songs OHNE geprüftes Jahr
const TRACKS_PLAIN14 = Array.from({length:14},(_,i)=>mk(i+1,false));
const TRACKS_YEARS = Array.from({length:14},(_,i)=>mk(i+1,true));
let CODE; const room=()=>shared.tree.rooms[CODE];
const joinPhones = async (host, names) => {
  const D=host.window.document; D.getElementById('mpCreateBtn').click(); await sleep(120); CODE=D.getElementById('mpRoomCode').textContent;
  const phones=[];
  for(const [uid,name] of names){ const d=boot(URL0+'?join='+CODE,uid); await sleep(80); d.window.document.getElementById('pvNameInput').value=name; d.window.document.getElementById('pvJoinBtn').click(); await sleep(120); phones.push(d); }
  return phones;
};
(async()=>{
  // ===== A) Auswahl und Merken =====
  let h = boot(URL0,'H1',{plattenteller_gate_unlocked:'yes', plattenteller_tracks: JSON.stringify(TRACKS_YEARS)}); await sleep(150);
  let D = h.window.document;
  const chips=[...D.querySelectorAll('#roundsChips .pick-chip')];
  ok(chips.map(c=>c.textContent.trim()).join(',')==='10,20,30,50,Alle', 'Rundenzahl: 10, 20, 30, 50, Alle');
  ok(chips[4].classList.contains('selected'), 'Standard: „Alle“');
  ok(/Alle 14 Songs werden gespielt/.test(D.getElementById('roundsHint').textContent), 'Hinweis: „Alle 14 Songs werden gespielt.“');
  chips[0].click();
  ok(chips[0].classList.contains('selected') && !chips[4].classList.contains('selected') && h.window.localStorage.getItem('plattenteller_rounds')==='10', 'Wahl „10“: markiert und im Browser gemerkt');
  console.log('   Hinweis bei 10: ' + D.getElementById('roundsHint').textContent);
  ok(/10 von 14 Songs werden gespielt \(zufällig gewählt\)/.test(D.getElementById('roundsHint').textContent), 'Hinweis: „10 von 14 Songs werden gespielt (zufällig gewählt).“');
  chips[3].click();
  ok(/Alle 14 Songs werden gespielt/.test(D.getElementById('roundsHint').textContent), '50 Runden bei 14 Songs: alle 14');
  chips[1].click(); h.window.close();
  // Neu laden: Wahl bleibt
  h = boot(URL0,'H1b',{plattenteller_gate_unlocked:'yes', plattenteller_rounds:'20', plattenteller_tracks: JSON.stringify(TRACKS_YEARS)}); await sleep(150); D=h.window.document;
  ok(D.querySelector('#roundsChips .pick-chip[data-rounds="20"]').classList.contains('selected'), 'Nach Neuladen: gemerkte Wahl „20“ ist gesetzt');
  h.window.close();

  // ===== B) Lokales Spiel mit begrenzten Runden =====
  h = boot(URL0,'H2',{plattenteller_gate_unlocked:'yes', plattenteller_rounds:'10', plattenteller_tracks: JSON.stringify(TRACKS_YEARS)}); await sleep(150); D=h.window.document;
  D.getElementById('playerInput').value='Anna'; D.getElementById('addPlayerBtn').click();
  D.getElementById('startGameBtn').click(); await sleep(150);
  ok(D.getElementById('game-screen').style.display==='block' && D.getElementById('deckTotal').textContent==='10', 'Lokales Spiel: „von 10“ (nicht 14)');
  ok(/9 danach übrig/.test(D.getElementById('deckRemainingLabel').textContent), '„9 danach übrig“');
  ok(D.querySelectorAll('#deckTicks i').length===10, 'Fortschritt mit 10 Strichen');
  // alle 5 Runden spielen
  for(let r=1;r<=10;r++){
    D.getElementById('revealBtn').click(); await sleep(30);
    [...D.querySelectorAll('#revealPanel .judge-grid button')].find(b=>b.getAttribute('data-score')==='2').click(); await sleep(20);
    D.getElementById('nextRoundBtn').click(); await sleep(60);
  }
  ok(D.getElementById('end-screen').style.display==='block', 'Nach 10 Runden: Endscreen (nicht erst nach 14)');
  h.window.close();

  // ===== C) Quiz mit begrenzten Runden =====
  let host = boot(URL0,'HQ',{plattenteller_gate_unlocked:'yes', plattenteller_rounds:'10', plattenteller_tracks: JSON.stringify(TRACKS_YEARS)}); await sleep(150);
  let phones = await joinPhones(host,[['Q1','Eins'],['Q2','Zwei']]);
  D=host.window.document;
  D.querySelector('#modeChips .pick-chip[data-mode="quiz"]').click(); await sleep(30);
  ok(/14 Songs → 10 Runden/.test(D.getElementById('remoteStartHint').textContent), 'Quiz-Hinweis: „14 Songs → 10 Runden“');
  D.getElementById('startGameBtn').click(); await sleep(350);
  ok(room().round.total===10 && D.getElementById('deckTotal').textContent==='10', 'Quiz: Runde 1 von 10');
  for(let r=1;r<=10;r++){
    host.window.document.getElementById('deezerAudio').dispatchEvent(new host.window.Event('play')); await sleep(120);
    D.getElementById('togetherRevealBtn').click(); await sleep(250);
    D.getElementById('togetherNextRoundBtn').click(); await sleep(250);
  }
  ok(D.getElementById('end-screen').style.display==='block' && room().meta.phase==='finished', 'Quiz endet nach 10 Runden');
  host.window.close();

  // ===== D) Hitster: nur so viele Jahre prüfen, wie nötig =====
  mbCalls.length=0;
  host = boot(URL0,'HH',{plattenteller_gate_unlocked:'yes', plattenteller_rounds:'10', plattenteller_tracks: JSON.stringify(TRACKS_PLAIN)}); await sleep(150);
  phones = await joinPhones(host,[['H3x','Anna'],['H4x','Ben']]);
  D=host.window.document;
  D.querySelector('#modeChips .pick-chip[data-mode="hitster"]').click(); // wärmt im Hintergrund nur so viele Jahre vor, wie nötig
  await sleep(1200);
  const warm = JSON.parse(host.window.localStorage.getItem('plattenteller_tracks')).filter(t=>t.yr).length;
  console.log('   nach dem Anklicken von „Hitster“ vorgewärmt: ' + warm + ' von 40');
  ok(warm>=11 && warm<=14, 'Anklicken von „Hitster“ prüft nur ca. 11 Songs vor (1 Startkarte + 10 Runden), nicht alle 40 — ' + warm);
  D.getElementById('startGameBtn').click(); await sleep(1800);
  const saved = JSON.parse(host.window.localStorage.getItem('plattenteller_tracks'));
  const withYear = saved.filter(t=>t.yr).length;
  ok(D.getElementById('game-screen').style.display==='block', 'Hitster startet');
  ok(withYear>=12 && withYear<=15, 'Beim Start nur so viele geprüft wie nötig: ' + withYear + ' von 40 (nötig: 2 Startkarten + 10 Runden = 12)');
  ok(withYear<40 && mbCalls.length<=withYear+3, 'MusicBrainz wurde nur ca. ' + mbCalls.length + '-mal gefragt, nicht 40-mal');
  ok(room().round.total===10, 'Hitster: 10 Runden (nach 2 Startkarten)');
  host.window.close();

  // ===== E) Hitster mit „Alle“: alles wird geprüft =====
  mbCalls.length=0;
  host = boot(URL0,'HA',{plattenteller_gate_unlocked:'yes', plattenteller_rounds:'all', plattenteller_tracks: JSON.stringify(TRACKS_PLAIN14)}); await sleep(150);
  phones = await joinPhones(host,[['H5x','Anna'],['H6x','Ben']]);
  D=host.window.document;
  D.querySelector('#modeChips .pick-chip[data-mode="hitster"]').click(); await sleep(1500);
  D.getElementById('startGameBtn').click(); await sleep(1500);
  const saved2 = JSON.parse(host.window.localStorage.getItem('plattenteller_tracks'));
  ok(saved2.filter(t=>t.yr).length===14, '„Alle“: alle 14 Songs haben ein geprüftes Jahr');
  ok(room().round.total===12, 'Hitster mit „Alle“: 12 Runden (14 − 2 Startkarten)');

  console.log(errs.length? 'UNERWARTET:\n'+errs.join('\n') : 'Keine unerwarteten Fehler');
  console.log(fails?'\n'+fails+' FEHLER':'\nALLE TESTS OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
