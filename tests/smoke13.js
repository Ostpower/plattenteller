// Gemeinsamer Jahre-Speicher (Firebase years/<ISRC>): Treffer, Schreiben, Rückfälle
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const PT_PATH = require('path');
const PT_INDEX = process.env.PT_INDEX || PT_PATH.join(__dirname, '..', 'index.html');
const makeFirebase = require('./fakefb');

const html = fs.readFileSync(PT_INDEX,'utf8').replace(/<script src="[^"]+"[^>]*><\/script>/g, '');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
const errs=[]; let mbCalls=[];
const json = (obj, status=200) => Promise.resolve({ ok: status<400, status, headers:{get:()=>null}, json:()=>Promise.resolve(obj) });
const I = n => 'AAAAA000000' + n;   // 12 Zeichen
function fetchMock(url){
  const u = decodeURIComponent(String(url));
  if(!u.includes('musicbrainz.org')) return Promise.reject(new Error('unmocked '+u));
  mbCalls.push(u);
  const iso = u.match(/\/isrc\/(\w+)/);
  if(iso){
    if(iso[1]===I(1)) return json({recordings:[{id:'a',title:'Song Eins','first-release-date':'1985-01-01'}]});
    if(iso[1]===I(2)) return json({recordings:[{id:'b',title:'Song Zwei','first-release-date':'1986-01-01'}]});
    if(iso[1]===I(3)) return json({recordings:[{id:'c',title:'Song Drei','first-release-date':'1990-02-02'}]});
    if(iso[1]===I(4)) return json({recordings:[{id:'d',title:'Only Live',disambiguation:'live','first-release-date':'2020-01-01'}]});
    return json({error:'Not Found'},404);
  }
  if(u.includes('/recording/?query')){
    if(u.includes('recording:"Netz Song"')) return Promise.reject(new Error('Netzwerkfehler'));
    return json({recordings:[]});
  }
  return Promise.reject(new Error('unmocked '+u));
}
const T=(n,title,artist,year,extra)=>Object.assign({id:'sp_ID'+n,source:'spotify',uri:'spotify:track:ID'+n,title,artist,artistKey:'AR'+n,cover:'',year,isrc:I(n)},extra||{});
const TRACKS=()=>[ T(1,'Song Eins','Interpret A',1983), T(2,'Song Zwei','Interpret B',1984), T(3,'Song Drei','Interpret C',1990),
  T(4,'Only Live - Live At Wembley','Interpret D',2020), T(5,'Compilation Song','Interpret F',2010,{albumType:'compilation'}), T(6,'Netz Song','Interpret G',1995) ];
function boot(shared, opts){
  opts = opts || {};
  const vc=new VirtualConsole(); vc.on('jsdomError',e=>{ if(!/Not implemented|Could not parse CSS/.test(e.message)) errs.push(e.message); });
  return new JSDOM(html,{url:'https://ostpower.github.io/plattenteller/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('plattenteller_gate_unlocked','yes');
    w.localStorage.setItem('plattenteller_tracks', JSON.stringify(TRACKS()));
    if(!opts.noFb) w.firebase = makeFirebase(shared, opts.uid||'DEV', Symbol(opts.uid||'DEV'));
    w.crypto=require('crypto').webcrypto; w.confirm=()=>true; w.fetch=fetchMock; w.PT_MB_GAP_MS=3;
    if(opts.timeout) w.PT_YEARS_TIMEOUT_MS = opts.timeout;
  }});
}
const fresh = () => ({ tree:{}, listeners:[] });
const savedYr = w => JSON.parse(w.localStorage.getItem('plattenteller_tracks')).map(t=>t.yr);
const isrcCalls = n => mbCalls.filter(u => u.includes('/isrc/'+I(n))).length;

(async()=>{
  // ===== A) Gerät 1: Treffer aus Firebase, Rest über MusicBrainz, sichere Ergebnisse werden geteilt =====
  let shared = fresh();
  shared.tree.years = { [I(1)]:{y:1971,s:'mb',t:1}, [I(2)]:{y:1972,s:'mb-orig',t:2} };
  let dom = boot(shared,{uid:'A'}); let w = dom.window, D = w.document;
  await sleep(150);
  D.getElementById('yearsBtn').click();
  await sleep(2500);
  let yr = savedYr(w);
  ok(yr[0] && yr[0].y===1971 && yr[0].src==='mb' && !yr[0].unsure, 'A: Song 1 kommt aus Firebase (1971, nicht MusicBrainz 1985)');
  ok(yr[1] && yr[1].y===1972 && yr[1].src==='mb-orig' && !yr[1].unsure, 'A: Song 2 kommt aus Firebase (1972, Quelle mb-orig bleibt)');
  ok(isrcCalls(1)===0 && isrcCalls(2)===0, 'A: für Treffer aus Firebase keine MusicBrainz-Anfrage');
  ok(yr[2] && yr[2].y===1990 && yr[2].src==='mb' && !yr[2].unsure && isrcCalls(3)===1, 'A: Song 3 nicht in Firebase → MusicBrainz 1990 (eine Anfrage)');
  ok(yr[3] && yr[3].unsure===true, 'A: Song 4 (Live ohne Original) unsicher ⚠');
  ok(yr[4] && yr[4].unsure===true, 'A: Song 5 (Compilation ohne Bestätigung) unsicher ⚠');
  ok(yr[5] && yr[5].y===1995 && yr[5].src==='spotify' && !yr[5].unsure, 'A: Song 6 mit gescheiterter Originalsuche: Spotify-Jahr 1995, lokal sicher');
  ok((shared.yearReads||[]).length===6 && new Set(shared.yearReads).size===6, 'A: genau eine Firebase-Abfrage je ISRC (6), keine doppelten ('+(shared.yearReads||[]).length+')');
  const Y = shared.tree.years || {};
  ok(Y[I(3)] && Y[I(3)].y===1990 && Y[I(3)].s==='mb' && typeof Y[I(3)].t==='number' && Object.keys(Y[I(3)]).sort().join()==='s,t,y', 'A: sicheres Ergebnis (Song 3) in Firebase gespeichert: { y, s, t }');
  ok(!Y[I(4)] && !Y[I(5)], 'A: unsichere Ergebnisse (Song 4, 5) werden NICHT geteilt');
  ok(!Y[I(6)], 'A: Ergebnis nach gescheiterter Originalsuche (Song 6) wird NICHT geteilt');
  ok(Y[I(1)].y===1971 && Y[I(2)].y===1972 && Object.keys(Y).length===3, 'A: vorhandene Einträge unverändert, nur 1 neuer (3 insgesamt)');
  ok((shared.yearWriteTries||[]).length===1, 'A: nur ein Schreibversuch (Song 3) ('+(shared.yearWriteTries||[]).length+')');
  const cacheA = JSON.parse(w.localStorage.getItem('plattenteller_year_cache'));
  ok(cacheA['isrc:'+I(1)] && cacheA['isrc:'+I(1)].y===1971, 'A: Firebase-Treffer liegen auch im lokalen Cache');
  w.close();

  // ===== B) Gerät 2 (leerer Browser): Song 3 jetzt aus Firebase =====
  mbCalls = []; shared.yearReads = []; shared.yearWriteTries = [];
  dom = boot(shared,{uid:'B'}); w = dom.window; D = w.document;
  await sleep(150);
  D.getElementById('yearsBtn').click();
  await sleep(2500);
  yr = savedYr(w);
  ok(yr[2] && yr[2].y===1990 && isrcCalls(3)===0, 'B: neues Gerät bekommt Song 3 sofort aus Firebase (keine MusicBrainz-Anfrage)');
  ok(yr[0].y===1971 && yr[1].y===1972 && isrcCalls(1)===0 && isrcCalls(2)===0, 'B: Songs 1–3 ohne MusicBrainz');
  ok(isrcCalls(4)>=1 && isrcCalls(5)>=1, 'B: nicht geteilte (unsichere) Songs werden weiter über MusicBrainz geprüft');
  ok((shared.yearWriteTries||[]).length===0, 'B: nichts Neues zu teilen → kein Schreibversuch');
  w.close();

  // ===== C) Ohne Firebase (nicht geladen): Rückfall wie bisher =====
  mbCalls = [];
  dom = boot(fresh(),{noFb:true}); w = dom.window; D = w.document;
  await sleep(150);
  D.getElementById('yearsBtn').click();
  await sleep(2500);
  yr = savedYr(w);
  ok(yr[0] && yr[0].y===1985 && yr[2] && yr[2].y===1990 && isrcCalls(1)===1, 'C: ohne Firebase läuft alles über MusicBrainz (Song 1 = 1985)');
  ok(/4 Songs mit sicherem Jahr, 2 unsicher/.test(D.getElementById('yearStatus').textContent), 'C: Ermittlung schließt vollständig ab');
  w.close();

  // ===== D) Regeln nicht veröffentlicht / Zugriff verweigert: stiller Rückfall, keine Wiederholungen =====
  mbCalls = [];
  shared = fresh(); shared.denyYears = true;
  dom = boot(shared,{uid:'D'}); w = dom.window; D = w.document;
  await sleep(150);
  D.getElementById('yearsBtn').click();
  await sleep(2500);
  yr = savedYr(w);
  ok(yr.every(Boolean) && yr[0].y===1985 && yr[2].y===1990, 'D: bei verweigertem Zugriff läuft alles über MusicBrainz');
  ok((shared.yearReads||[]).length===6, 'D: nach der Ablehnung keine weiteren Firebase-Abfragen ('+(shared.yearReads||[]).length+')');
  ok((shared.yearWriteTries||[]).length===0, 'D: nach der Ablehnung kein Schreibversuch');
  ok(!shared.tree.years, 'D: nichts gespeichert');
  w.close();

  // ===== E) Firebase antwortet nicht (hängt): Ermittlung blockiert nicht =====
  mbCalls = [];
  shared = fresh(); shared.hangYears = true;
  dom = boot(shared,{uid:'E', timeout:150}); w = dom.window; D = w.document;
  await sleep(150);
  D.getElementById('yearsBtn').click();
  await sleep(2500);
  yr = savedYr(w);
  ok(yr.every(Boolean) && yr[0].y===1985, 'E: hängende Abfrage → nach Zeitlimit weiter mit MusicBrainz, alles ermittelt');
  ok(D.getElementById('yearsCancelBtn').style.display==='none', 'E: Prüfung ist beendet (blockiert nicht)');
  w.close();

  // ===== F) Ungültige Einträge werden ignoriert; bestehender Eintrag wird nie überschrieben =====
  mbCalls = [];
  shared = fresh();
  shared.tree.years = { [I(1)]:{y:1500,s:'mb',t:1}, [I(2)]:{y:'abc',s:'mb',t:1}, [I(3)]:{y:1990,s:'unbekannt',t:1} };
  dom = boot(shared,{uid:'F'}); w = dom.window; D = w.document;
  await sleep(150);
  D.getElementById('yearsBtn').click();
  await sleep(2500);
  yr = savedYr(w);
  ok(yr[0].y===1985 && yr[1].y===1986 && yr[2].y===1990, 'F: ungültige Firebase-Einträge (Jahr 1500, Text, falsche Quelle) werden ignoriert → MusicBrainz');
  ok(shared.tree.years[I(1)].y===1500 && shared.tree.years[I(2)].y==='abc', 'F: bestehende Einträge werden nicht überschrieben (Korrektur nur in der Console)');
  w.close();

  console.log(errs.length? 'UNERWARTET:\n'+errs.join('\n'):'Keine unerwarteten Fehler');
  console.log(fails||errs.length?'\n'+(fails+errs.length)+' FEHLER':'\nALLE TESTS OK'); process.exit(fails||errs.length?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
