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
const URL0='https://ostpower.github.io/plattenteller/';
function boot(url, uid, storage, extra){
  const tag = Symbol(uid); const vc = new VirtualConsole(); vc.on('jsdomError',()=>{});
  const dom = new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.firebase = makeFirebase(shared, uid, tag); w.eval(qrSrc+';window.qrcode=qrcode;'); w.confirm=()=>true; w.crypto=require('crypto').webcrypto;
    w.fetch=()=>Promise.reject(new Error('no net')); if(extra) Object.assign(w, extra);
    if(storage) for(const [k,v] of Object.entries(storage)) w.localStorage.setItem(k,v);
  }}); dom.__tag=tag; return dom;
}
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
(async()=>{
  const hb = Number(process.env.HB||0) || undefined;
  let host = boot(URL0,'HOST',{plattenteller_gate_unlocked:'yes'}, hb?{PT_HEARTBEAT_MS:hb}:undefined);
  host.window.document.getElementById('mpCreateBtn').click(); await sleep(100);
  const code = host.window.document.getElementById('mpRoomCode').textContent;
  const pc = boot(URL0+'?join='+code,'PC',undefined, hb?{PT_HEARTBEAT_MS:hb}:undefined); await sleep(80);
  pc.window.document.getElementById('pvNameInput').value='pc'; pc.window.document.getElementById('pvJoinBtn').click(); await sleep(100);
  const hint = () => pc.window.document.getElementById('pvLobbyHint').textContent;
  ok(!/offline/.test(hint()), 'PC: Host online vor dem Neuladen');
  // Host lädt neu: neue Seite verbindet sich ZUERST ...
  const storage={}; for(let i=0;i<host.window.localStorage.length;i++){ const k=host.window.localStorage.key(i); storage[k]=host.window.localStorage.getItem(k); }
  const old = host;
  host = boot(URL0,'HOST',storage, hb?{PT_HEARTBEAT_MS:hb}:undefined); await sleep(300);
  ok(shared.tree.rooms[code].meta.hostConnected===true, 'Neue Host-Seite meldet „online“');
  // ... und der Server bemerkt erst jetzt, dass die ALTE Verbindung weg ist
  for(let i=shared.listeners.length-1;i>=0;i--) if(shared.listeners[i].owner===old.__tag) shared.listeners.splice(i,1);
  old.window.close(); shared.fireDisconnect(old.__tag); await sleep(50);
  console.log('   [nach verspätetem Disconnect] hostConnected =', shared.tree.rooms[code].meta.hostConnected, '| PC-Hinweis:', hint());
  await sleep(hb ? hb*3 : 100);
  ok(shared.tree.rooms[code].meta.hostConnected===true, 'Host steht (wieder) auf „online“');
  ok(!/offline/.test(hint()), 'PC zeigt NICHT „Host offline“, obwohl der Host läuft');
  console.log(fails?'\n'+fails+' FEHLER':'\nALLE TESTS OK'); process.exit(fails?1:0);
})();
