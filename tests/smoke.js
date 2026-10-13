const { JSDOM } = require('jsdom');
const fs = require('fs');
const PT_PATH = require('path');
const PT_INDEX = process.env.PT_INDEX || PT_PATH.join(__dirname, '..', 'index.html');
const PT_QR = PT_PATH.join(__dirname, 'node_modules', 'qrcode-generator', 'qrcode.js');

const makeFirebase = require('./fakefb');
const qrSrc = fs.readFileSync(PT_QR,'utf8');
let html = fs.readFileSync(PT_INDEX,'utf8');
// externe Skripte nicht laden, Firebase/QR injizieren wir selbst
html = html.replace(/<script src="[^"]+"[^>]*><\/script>/g, '');
const shared = { tree:{}, listeners:[] };
const sleep = ms => new Promise(r=>setTimeout(r,ms));
function boot(url, uid, storage){
  const dom = new JSDOM(html, { url, runScripts:'dangerously', pretendToBeVisual:true,
    beforeParse(w){
      w.firebase = makeFirebase(shared, uid);
      w.eval(qrSrc + ';window.qrcode = qrcode;');
      w.confirm = () => true;
      w.crypto = require('crypto').webcrypto;
      if(storage) for(const [k,v] of Object.entries(storage)) w.localStorage.setItem(k,v);
      w.fetch = () => Promise.reject(new Error('no net'));
    }});
  return dom;
}
let fails = 0;
const ok = (c, m) => { console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
(async()=>{
  // HOST
  const host = boot('https://ostpower.github.io/plattenteller/', 'HOST1', { plattenteller_gate_unlocked:'yes' });
  const H = host.window.document;
  ok(H.getElementById('appWrap').style.display==='block', 'Host: Gate entsperrt');
  H.getElementById('mpCreateBtn').click();
  await sleep(100);
  const code = H.getElementById('mpRoomCode').textContent;
  ok(/^[A-HJ-NP-Z2-9]{4}$/.test(code), 'Host: Raumcode erzeugt: '+code);
  ok(H.getElementById('mpQr').innerHTML.includes('<svg'), 'Host: QR-SVG gerendert');
  ok(H.getElementById('mpRoomLink').textContent === 'https://ostpower.github.io/plattenteller/?join='+code, 'Host: Link korrekt');
  ok(shared.tree.rooms[code].meta.hostUid==='HOST1' && shared.tree.rooms[code].meta.phase==='lobby', 'DB: meta geschrieben');

  // SPIELER ohne Gate
  const pl = boot('https://ostpower.github.io/plattenteller/?join='+code, 'P1');
  const P = pl.window.document;
  await sleep(100);
  ok(P.getElementById('gateOverlay').style.display==='none', 'Spieler: Gate übersprungen');
  ok(P.getElementById('appWrap').style.display==='none', 'Spieler: Setup bleibt versteckt');
  ok(P.getElementById('playerView').style.display==='block', 'Spieler: Spieleransicht sichtbar');
  ok(P.getElementById('pvRoomCode').textContent===code, 'Spieler: Raumcode angezeigt');
  P.getElementById('pvNameInput').value = 'Anna';
  P.getElementById('pvJoinBtn').click();
  await sleep(100);
  ok(P.getElementById('pvLobbyPanel').style.display==='block', 'Spieler: Lobby offen');
  ok(P.getElementById('pvMyName').textContent==='Anna', 'Spieler: Name angezeigt');
  ok(H.getElementById('mpCount').textContent==='1' && H.getElementById('mpPlayerList').textContent.includes('Anna'), 'Host: sieht Anna live');
  ok(shared.tree.rooms[code].players.P1.score===0 && shared.tree.rooms[code].players.P1.connected===true, 'DB: Spieler-Knoten ok');

  // 2. Spieler, falscher Raum
  const pl2 = boot('https://ostpower.github.io/plattenteller/?join=ZZZZ', 'P2');
  await sleep(100);
  const P2 = pl2.window.document;
  P2.getElementById('pvNameInput').value = 'Ben'; P2.getElementById('pvJoinBtn').click(); await sleep(100);
  ok(/nicht gefunden/.test(P2.getElementById('pvJoinMsg').textContent), 'Falscher Code: Fehlermeldung');

  // 2. Spieler richtig
  const pl3 = boot('https://ostpower.github.io/plattenteller/?join='+code.toLowerCase(), 'P3');
  await sleep(100);
  const P3 = pl3.window.document;
  P3.getElementById('pvNameInput').value = 'Cem'; P3.getElementById('pvJoinBtn').click(); await sleep(100);
  ok(H.getElementById('mpCount').textContent==='2', 'Host: sieht 2 Spieler (Code auch klein geschrieben ok)');

  // Neuladen Spieler 1 → automatisch wieder in der Lobby
  const pl1b = boot('https://ostpower.github.io/plattenteller/?join='+code, 'P1');
  await sleep(150);
  ok(pl1b.window.document.getElementById('pvLobbyPanel').style.display==='block', 'Spieler 1 nach Neuladen: direkt in Lobby');

  // Kick
  H.querySelector('.mp-kick').click(); await sleep(100);
  ok(H.getElementById('mpCount').textContent==='1', 'Host: Kick entfernt Spieler');
  ok(P.getElementById('pvJoinPanel').style.display==='block' && /entfernt/.test(P.getElementById('pvJoinMsg').textContent), 'Spieler 1: sieht "entfernt"');

  // Raum schließen
  H.getElementById('mpCloseBtn').click(); await sleep(100);
  ok(P3.getElementById('pvJoinPanel').style.display==='block' && /geschlossen/.test(P3.getElementById('pvJoinMsg').textContent), 'Spieler: sieht "Raum geschlossen"');
  ok(H.getElementById('mpRoomBox').style.display==='none', 'Host: Raum-Box zu');

  // Host-Resume nach Neuladen
  const host2 = boot('https://ostpower.github.io/plattenteller/', 'HOST1', { plattenteller_gate_unlocked:'yes' });
  host2.window.document.getElementById('mpCreateBtn').click(); await sleep(100);
  const code2 = host2.window.document.getElementById('mpRoomCode').textContent;
  const keep = host2.window.localStorage.getItem('plattenteller_host_room');
  const host3 = boot('https://ostpower.github.io/plattenteller/', 'HOST1', { plattenteller_gate_unlocked:'yes', plattenteller_host_room: code2 });
  await sleep(150);
  ok(host3.window.document.getElementById('mpRoomCode').textContent===code2, 'Host: Raum nach Neuladen wiederhergestellt');

  // Gate: Raumcode-Eingabe vorhanden
  const g = boot('https://ostpower.github.io/plattenteller/', 'X');
  ok(!!g.window.document.getElementById('gateJoinBtn'), 'Gate: Beitreten-Feld vorhanden');
  console.log(fails? ('\n'+fails+' FEHLER') : '\nALLE TESTS OK');
  process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
