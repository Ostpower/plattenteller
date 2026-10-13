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
  const dom = new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.firebase = makeFirebase(shared, uid, tag); w.eval(qrSrc+';window.qrcode=qrcode;'); w.confirm=()=>true; w.crypto=require('crypto').webcrypto;
    w.fetch=()=>Promise.reject(new Error('no net')); w.PT_HEARTBEAT_MS = 100000;
    if(storage) for(const [k,v] of Object.entries(storage)) w.localStorage.setItem(k,v);
  }}); dom.__tag=tag; return dom;
}
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
const HOURS = 3600*1000;
const seedRoom = (code, meta, indexed=true, hostUid='HOST') => {
  shared.tree.rooms = shared.tree.rooms || {};
  shared.tree.rooms[code] = { meta: { hostUid, phase:'lobby', createdAt: Date.now(), ...meta }, players: { PX: { name:'Alt', connected:false, score:0, joinedAt:1 } } };
  if(indexed){ shared.tree.hostRooms = shared.tree.hostRooms || {}; shared.tree.hostRooms[hostUid] = shared.tree.hostRooms[hostUid] || {}; shared.tree.hostRooms[hostUid][code] = meta && meta.createdAt || Date.now(); }
};
(async()=>{
  // Vorbereitung: alte Räume des Hosts + fremde
  const now = Date.now();
  seedRoom('ENDD', { phase:'ended', hostConnected:false });                          // geschlossen, Löschen war nicht angekommen -> weg
  seedRoom('LOST', { hostConnected:false, createdAt: now - 7*HOURS });               // Host seit >6 h weg -> weg
  seedRoom('REC1', { hostConnected:false, createdAt: now - 1*HOURS });               // Host erst 1 h weg -> BLEIBT (könnte zurückkehren)
  seedRoom('TAB2', { hostConnected:true,  createdAt: now - 3*HOURS });               // läuft in anderem Tab -> BLEIBT
  seedRoom('OLDD', { hostConnected:true,  createdAt: now - 50*HOURS });              // >48 h -> weg
  seedRoom('FORE', { hostConnected:false, createdAt: now - 80*HOURS }, true, 'OTHER');// steht fälschlich in MEINER Liste, gehört aber einem anderen -> bleibt, Eintrag weg
  shared.tree.hostRooms.HOST.FORE = now - 80*HOURS;
  shared.tree.hostRooms.HOST.GONE = now - 80*HOURS;                                  // Raum existiert nicht mehr -> Eintrag weg
  seedRoom('ELSE', { hostConnected:false, createdAt: now - 90*HOURS }, true, 'OTHER');// fremder Host, nicht in meiner Liste -> BLEIBT unangetastet
  delete shared.tree.hostRooms.OTHER; // (Liste des fremden Hosts ist für uns ohnehin nicht lesbar)

  let host = boot(URL0,'HOST',{plattenteller_gate_unlocked:'yes'});
  let H = host.window.document;
  H.getElementById('mpCreateBtn').click(); await sleep(500);
  const code = H.getElementById('mpRoomCode').textContent;
  const rooms = () => shared.tree.rooms || {};
  ok(typeof shared.tree.hostRooms.HOST[code]==='number', 'Neuer Raum steht in der privaten Raumliste');
  ok(!rooms().ENDD, 'Aufräumen: geschlossener Raum gelöscht');
  ok(!rooms().LOST, 'Aufräumen: Raum mit seit >6 h abwesendem Host gelöscht');
  ok(!rooms().OLDD, 'Aufräumen: Raum älter als 48 h gelöscht');
  ok(!!rooms().REC1, 'Aufräumen: Raum mit erst 1 h abwesendem Host bleibt (Host könnte zurückkehren)');
  ok(!!rooms().TAB2, 'Aufräumen: Raum eines anderen Tabs (Host verbunden) bleibt');
  ok(!!rooms()[code] , 'Aufräumen: der aktuelle Raum bleibt');
  ok(!!rooms().FORE && !!rooms().ELSE, 'Aufräumen: fremde Räume bleiben unberührt');
  ok(!shared.tree.hostRooms.HOST.FORE && !shared.tree.hostRooms.HOST.GONE && !shared.tree.hostRooms.HOST.ENDD, 'Raumliste bereinigt (fremde/fehlende/gelöschte Einträge weg)');
  ok(/3 alte Räume aufgeräumt/.test(H.getElementById('mpHostMsg').textContent), 'Hinweis: „3 alte Räume aufgeräumt.“ ('+H.getElementById('mpHostMsg').textContent+')');

  // Handy tritt bei, dann Host schließt: Handy sieht „geschlossen“ (nicht „entfernt“), danach ist alles weg
  const pc = boot(URL0+'?join='+code,'PC'); await sleep(80);
  pc.window.document.getElementById('pvNameInput').value='pc'; pc.window.document.getElementById('pvJoinBtn').click(); await sleep(120);
  ok(!!rooms()[code].players.PC, 'PC ist im Raum');
  H.getElementById('mpCloseBtn').click(); await sleep(200);
  ok(rooms()[code] && rooms()[code].meta.phase==='ended', 'Schließen: Phase zuerst „ended“ (Handys werden informiert)');
  ok(/geschlossen/.test(pc.window.document.getElementById('pvJoinMsg').textContent) && !/entfernt/.test(pc.window.document.getElementById('pvJoinMsg').textContent), 'PC-Handy zeigt „Raum geschlossen“ (nicht „entfernt“)');
  await sleep(2300);
  ok(!rooms()[code], 'Schließen: Raum danach komplett gelöscht');
  ok(!(shared.tree.hostRooms.HOST||{})[code], 'Schließen: Eintrag in der Raumliste entfernt');
  ok(!JSON.stringify(shared.tree.rooms||{}).includes(code), 'Keine Reste (Spieler/Präsenz) des geschlossenen Raums');
  // Verspäteter Verbindungsabbruch darf nichts neu anlegen
  shared.fireDisconnect(host.__tag); shared.fireDisconnect(pc.__tag); await sleep(50);
  console.log('   [Info] Reste nach verspätetem Disconnect (Attrappe ohne Regeln):', JSON.stringify((shared.tree.rooms||{})[code]||null));

  // ===== Alte Firebase-Regeln (Raum nicht als Ganzes löschbar, keine Raumliste) =====
  shared.denyRoomRemove = true; shared.denyIndex = true;
  host = boot(URL0,'HOST',{plattenteller_gate_unlocked:'yes'}); H = host.window.document;
  H.getElementById('mpCreateBtn').click(); await sleep(400);
  const code2 = H.getElementById('mpRoomCode').textContent;
  console.log('   [debug] code2="'+code2+'" msg="'+H.getElementById('mpHostMsg').textContent+'"');
  ok(/^[A-Z0-9]{4}$/.test(code2) && !!rooms()[code2], 'Alte Regeln: Raum lässt sich trotz fehlender Raumliste anlegen');
  const pc2 = boot(URL0+'?join='+code2,'PC2'); await sleep(80);
  pc2.window.document.getElementById('pvNameInput').value='zwei'; pc2.window.document.getElementById('pvJoinBtn').click(); await sleep(120);
  H.getElementById('mpCloseBtn').click(); await sleep(2500);
  ok(!rooms()[code2], 'Alte Regeln: Raum wird trotzdem gelöscht (Teile einzeln)');

  // ===== Resume löst ebenfalls das Aufräumen aus =====
  shared.denyRoomRemove = false; shared.denyIndex = false;
  host = boot(URL0,'HOST',{plattenteller_gate_unlocked:'yes'}); H = host.window.document;
  H.getElementById('mpCreateBtn').click(); await sleep(400);
  const code3 = H.getElementById('mpRoomCode').textContent;
  seedRoom('STAL', { hostConnected:false, createdAt: Date.now() - 9*HOURS });
  const stor={}; for(let i=0;i<host.window.localStorage.length;i++){ const k=host.window.localStorage.key(i); stor[k]=host.window.localStorage.getItem(k); }
  for(let i=shared.listeners.length-1;i>=0;i--) if(shared.listeners[i].owner===host.__tag) shared.listeners.splice(i,1);
  host.window.close();
  host = boot(URL0,'HOST',stor); H = host.window.document; await sleep(500);
  ok(H.getElementById('mpRoomCode').textContent===code3, 'Neuladen: eigener Raum wird wieder aufgenommen');
  ok(!rooms().STAL && !!rooms()[code3], 'Neuladen: veralteter Raum aufgeräumt, aktueller bleibt');

  console.log(unexpected.length? '\nUNERWARTET:\n'+unexpected.join('\n') : '\nKeine unerwarteten Fehler');
  console.log(fails?'\n'+fails+' FEHLER':'\nALLE TESTS OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
