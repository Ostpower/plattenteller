const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const PT_PATH = require('path');
const PT_INDEX = process.env.PT_INDEX || PT_PATH.join(__dirname, '..', 'index.html');
const PT_QR = PT_PATH.join(__dirname, 'node_modules', 'qrcode-generator', 'qrcode.js');

let html = fs.readFileSync(PT_INDEX,'utf8').replace(/<script src="[^"]+"[^>]*><\/script>/g, '');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
const errs=[]; let mbCalls=[];
const json = (obj, status=200) => Promise.resolve({ ok: status<400, status, headers:{get:()=>null}, json:()=>Promise.resolve(obj) });
const SP = { // Spotify-Einzelabfragen
  ID1:{isrc:'ISRC0000001'}, ID2:{isrc:'ISRC0000002'}, ID3:{isrc:'ISRC0000003'}, ID4:{isrc:'ISRC0000004'}, ID5:{}, ID6:{isrc:'ISRC0000006'}, ID7:{isrc:'ISRC0000007'} };
function fetchMock(url){
  const u=String(url);
  if(u.startsWith('https://accounts.spotify.com/api/token')) return json({access_token:'AT',expires_in:3600,refresh_token:'RT2',scope:'playlist-read-private playlist-read-collaborative'});
  let m;
  if((m=u.match(/api\.spotify\.com\/v1\/tracks\/(\w+)$/))){ const d=SP[m[1]]||{}; return json({ id:m[1], name:'x', external_ids: d.isrc?{isrc:d.isrc}:undefined, album:{release_date:'2000-01-01', album_type: m[1]==='ID6'?'compilation':'album'} }); }
  if(u.includes('musicbrainz.org')){
    mbCalls.push(decodeURIComponent(u));
    const iso = u.match(/\/isrc\/(\w+)/);
    if(iso){
      const c=iso[1];
      if(c==='ISRC0000001') return json({recordings:[{id:'a',title:'Song Studio','first-release-date':'1985-03-01','artist-credit':[{name:'Interpret A',artist:{id:'x',name:'Interpret A'}}]}]});
      if(c==='ISRC0000002') return json({recordings:[{id:'b',title:'Remaster Song','first-release-date':'1980-06-01'}]});
      if(c==='ISRC0000003') return json({recordings:[{id:'c',title:'Live Song',disambiguation:'live, 2003-03-03: Rock City','first-release-date':'2023-04-07'}]});
      if(c==='ISRC0000004') return json({recordings:[{id:'d',title:'Only Live',disambiguation:'live','first-release-date':'2020-01-01'}]});
      return json({error:'Not Found'},404);
    }
    if(u.includes('/recording/?query')){
      const q=decodeURIComponent(u);
      if(q.includes('recording:"Live Song"')) return json({recordings:[
        {score:100,title:'Live Song',disambiguation:'live','first-release-date':'2001-01-01','artist-credit':[{name:'Interpret C'}]},
        {score:98,title:'Live Song','first-release-date':'2003-03-03','artist-credit':[{name:'Interpret C'}],releases:[{title:'Studioalbum'}]},
        {score:97,title:'Live Song','first-release-date':'1999-01-01','artist-credit':[{name:'Ganz Anderer Interpret'}]}]});
      if(q.includes('recording:"No Isrc Song"')) return json({recordings:[{score:100,title:'No Isrc Song','first-release-date':'1997-05-05','artist-credit':[{name:'Interpret E'}]}]});
      return json({recordings:[]});
    }
  }
  return Promise.reject(new Error('unmocked '+u));
}
const T=(n,title,artist,year,extra)=>Object.assign({id:'sp_ID'+n,source:'spotify',uri:'spotify:track:ID'+n,title,artist,artistKey:'AR'+n,cover:'',year},extra||{});
function boot(tracks, extraStore){
  const vc=new VirtualConsole(); vc.on('jsdomError',e=>{ if(!/Not implemented|Could not parse CSS/.test(e.message)) errs.push(e.message); });
  return new JSDOM(html,{url:'https://ostpower.github.io/plattenteller/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('plattenteller_gate_unlocked','yes'); w.localStorage.setItem('plattenteller_refresh_token','RT1'); w.localStorage.setItem('plattenteller_spotify_scope','playlist-read-private');
    if(tracks) w.localStorage.setItem('plattenteller_tracks', JSON.stringify(tracks));
    for(const [k,v] of Object.entries(extraStore||{})) w.localStorage.setItem(k,v);
    w.confirm=()=>true; w.fetch=fetchMock; w.PT_MB_GAP_MS=3;
  }});
}
(async()=>{
  const tracks=[ T(1,'Song Studio','Interpret A',1983), T(2,'Remaster Song - Remastered 2011','Interpret B',2011), T(3,'Live Song - Live In Nottingham 2003','Interpret C',2023),
    T(4,'Only Live - Live At Wembley','Interpret D',2020), T(5,'No Isrc Song','Interpret E',1999), T(6,'Compilation Song','Interpret F',2010,{albumType:'compilation'}), T(7,'Plain Spotify Only','Interpret G',1990) ];
  let dom=boot(tracks); let w=dom.window, D=w.document, $=id=>D.getElementById(id);
  await sleep(150);
  ok($('yearBar').style.display==='block' && /0 Songs mit sicherem Jahr, 7 noch nicht geprüft/.test($('yearStatus').textContent), 'Vor dem Prüfen: „0 Songs mit sicherem Jahr, 7 noch nicht geprüft“');
  ok($('yearsBtn').style.display!=='none', '„Jahre ermitteln“ sichtbar');
  $('yearsBtn').click();
  ok(/Jahre werden geprüft/.test($('yearStatus').textContent) && $('yearsCancelBtn').style.display!=='none', 'Während der Prüfung: Fortschritt und „Abbrechen“');
  await sleep(1500);
  const saved = JSON.parse(w.localStorage.getItem('plattenteller_tracks'));
  const yr = n => saved[n-1].yr;
  ok(yr(1).y===1985 && yr(1).src==='mb' && !yr(1).unsure, '1 Studio-Song: MusicBrainz-Jahr 1985 statt Spotify 1983');
  ok(yr(2).y===1980 && yr(2).src==='mb' && !yr(2).unsure, '2 Remaster: MusicBrainz 1980 statt Albumjahr 2011 (kein Warnzeichen)');
  ok(yr(3).y===2003 && yr(3).src==='mb-orig' && !yr(3).unsure, '3 Live-Version: Originalaufnahme gefunden → 2003 (nicht 2023, kein fremder Interpret)');
  ok(yr(4).unsure===true && yr(4).y===2020, '4 Live ohne Original: unsicher ⚠');
  ok(yr(5).y===1997 && yr(5).src==='mb-orig' && !yr(5).unsure, '5 Ohne ISRC: per Textsuche gefunden → 1997');
  ok(yr(6).unsure===true && yr(6).src==='spotify', '6 Compilation ohne Bestätigung: unsicher ⚠');
  ok(yr(7).y===1990 && yr(7).src==='spotify' && !yr(7).unsure, '7 Normaler Song nur mit Spotify-Jahr: 1990, nicht unsicher');
  ok(saved[4].isrc===undefined || saved[4].isrc==='' , 'Song ohne ISRC bleibt ohne ISRC');
  ok(saved[0].isrc==='ISRC0000001', 'ISRC wurde per Spotify nachgeladen und gespeichert');
  ok($('yearsCancelBtn').style.display==='none' && /5 Songs mit sicherem Jahr, 2 unsicher ⚠/.test($('yearStatus').textContent), 'Ergebnis: „5 Songs mit sicherem Jahr, 2 unsicher ⚠“ ('+$('yearStatus').textContent+')');
  const items=[...D.querySelectorAll('#trackList .track-item')];
  ok(items[0].querySelector('.yr.ok') && /1985/.test(items[0].textContent), 'Stapel: geprüftes Jahr grün (1985)');
  ok(items[3].querySelector('.yr.warn') && /⚠/.test(items[3].textContent), 'Stapel: unsicheres Jahr mit ⚠ markiert');
  ok($('dropUnsureBtn').style.display!=='none', '„Unsichere entfernen“ erscheint');
  ok(JSON.parse(w.localStorage.getItem('plattenteller_year_cache'))['isrc:ISRC0000001'].y===1985, 'Ergebnisse im Merk-Speicher (Cache)');

  // Cache: gleiche Songs ohne Ergebnis nochmal prüfen → keine neuen MusicBrainz-Anfragen
  const cache = w.localStorage.getItem('plattenteller_year_cache');
  const fresh = tracks.map(t=>Object.assign({},t));  // ohne yr
  mbCalls=[]; dom.window.close();
  dom=boot(fresh,{plattenteller_year_cache:cache}); w=dom.window; D=w.document; await sleep(100);
  D.getElementById('yearsBtn').click(); await sleep(600);
  ok(mbCalls.length===0, 'Mit Cache: keine einzige MusicBrainz-Anfrage nötig ('+mbCalls.length+')');
  ok(/5 Songs mit sicherem Jahr, 2 unsicher/.test(D.getElementById('yearStatus').textContent), 'Mit Cache: gleiches Ergebnis sofort');

  // Unsichere entfernen
  D.getElementById('dropUnsureBtn').click();
  ok(D.querySelectorAll('#trackList .track-item').length===5 && D.getElementById('dropUnsureBtn').style.display==='none', '„Unsichere entfernen“: 5 Songs bleiben');
  // Abbrechen
  dom.window.close(); mbCalls=[];
  dom=boot(fresh); w=dom.window; D=w.document; await sleep(100);
  w.PT_MB_GAP_MS=60; // (wirkt nur bei neuem Laden – hier nur Verhalten prüfen)
  D.getElementById('yearsBtn').click(); await sleep(20); D.getElementById('yearsCancelBtn').click(); await sleep(800);
  ok(D.getElementById('yearsCancelBtn').style.display==='none' && D.querySelectorAll('#trackList .track-item').length===7, 'Abbrechen: Prüfung stoppt, Songs bleiben erhalten');
  console.log(errs.length? 'UNERWARTET:\n'+errs.join('\n'):'Keine unerwarteten Fehler');
  console.log(fails?'\n'+fails+' FEHLER':'\nALLE TESTS OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
