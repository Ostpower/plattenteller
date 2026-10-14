// „PT“-Kürzel als Ordner-Ersatz für „Meine Playlists“ und eingeklappte Songliste
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const PT_PATH = require('path');
const PT_INDEX = process.env.PT_INDEX || PT_PATH.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(PT_INDEX,'utf8').replace(/<script src="[^"]+"[^>]*><\/script>/g, '');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
const errs=[];
const json = (obj, status=200) => Promise.resolve({ ok: status<400, status, headers:{get:()=>null}, json:()=>Promise.resolve(obj) });
const P = (id,name,extra) => Object.assign({ id, name, items:{total:300}, owner:{id:'marcel'} }, extra||{});
const MIXED = [ P('A1','PT Rock'), P('A2','pt-pop'), P('A3','PT'), P('A4','Ptolemäus Hörspiel'), P('A5','PTX Mix'), P('A6','Urlaub'),
  P('A7','Metal',{description:'Meine Auswahl #pt'}), P('A8','Metal 2',{description:'#ptx nein'}), P('A9','Party PT') ];
const NONE = [ P('B1','Urlaub'), P('B2','Mix') ];
function boot(list, tracks){
  const vc=new VirtualConsole(); vc.on('jsdomError',e=>{ if(!/Not implemented|Could not parse CSS/.test(e.message)) errs.push(e.message); });
  return new JSDOM(html,{url:'https://ostpower.github.io/plattenteller/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('plattenteller_gate_unlocked','yes'); w.localStorage.setItem('plattenteller_refresh_token','RT1');
    w.localStorage.setItem('plattenteller_spotify_scope','playlist-read-private');
    if(tracks) w.localStorage.setItem('plattenteller_tracks', JSON.stringify(tracks));
    w.confirm=()=>true;
    w.fetch=(url)=>{ const u=String(url);
      if(u.startsWith('https://accounts.spotify.com/api/token')) return json({access_token:'AT',expires_in:3600,refresh_token:'RT2',scope:'playlist-read-private playlist-read-collaborative'});
      if(u==='https://api.spotify.com/v1/me') return json({id:'marcel'});
      if(u.startsWith('https://api.spotify.com/v1/me/playlists')) return json({items:list,next:null});
      return Promise.reject(new Error('unmocked '+u)); };
  }});
}
const mkTrack = n => ({id:'sp_ID'+n,source:'spotify',uri:'spotify:track:ID'+n,title:'Song '+n,artist:'Interpret '+n,artistKey:'AR'+n,cover:'',year:1980+n});

(async()=>{
  // ===== A) Nur Playlists mit Kürzel „PT“ =====
  let dom = boot(MIXED); let w = dom.window, D = w.document; const $ = id => D.getElementById(id);
  await sleep(200);
  $('myPlaylistsBtn').click(); await sleep(300);
  let names = [...D.querySelectorAll('#myPlaylistsList .pl-row .t')].map(e=>e.textContent);
  ok(names.length===4, '9 Playlists in Spotify, nur 4 mit Kürzel werden gezeigt ('+names.join(', ')+')');
  ok(names.includes('PT Rock') && names.includes('pt-pop') && names.includes('PT'), 'Name beginnt mit „PT“ (auch klein, mit Bindestrich, allein)');
  ok(names.includes('Metal'), 'Beschreibung mit #pt genügt');
  ok(!names.includes('Ptolemäus Hörspiel') && !names.includes('PTX Mix') && !names.includes('Party PT') && !names.includes('Metal 2'), 'Kein Treffer bei „Ptolemäus“, „PTX“, „PT“ mitten im Namen, „#ptx“');
  ok(/4 Playlists mit Kürzel „PT“ gefunden \(von 9 insgesamt\)/.test($('myPlaylistsStatus').textContent), 'Statuszeile nennt 4 von 9 ('+$('myPlaylistsStatus').textContent+')');
  ok(/Songs/.test(D.querySelector('#myPlaylistsList .pl-row .a').textContent) && !/Urlaub/.test($('myPlaylistsList').textContent), '„Urlaub“ und andere Privat-Playlists erscheinen nicht');
  ok(/PT/.test($('myPlaylistsBtn').textContent) && /beginnen/.test(D.querySelector('#playlistBlock .hint').textContent), 'Knopf und Hinweistext nennen das Kürzel');
  $('myPlaylistsFilter').value='rock'; $('myPlaylistsFilter').dispatchEvent(new w.Event('input'));
  ok(D.querySelectorAll('#myPlaylistsList .pl-row').length===1, 'Textfilter wirkt zusätzlich (nur „PT Rock“)');
  $('myPlaylistsFilter').value='zzz'; $('myPlaylistsFilter').dispatchEvent(new w.Event('input'));
  ok(/Keine passende Playlist/.test($('myPlaylistsList').textContent), 'Textfilter ohne Treffer: „Keine passende Playlist“');
  w.close();

  // ===== B) Keine Playlist mit Kürzel: Hinweis, wie benennen =====
  dom = boot(NONE); w = dom.window; D = w.document;
  await sleep(200);
  D.getElementById('myPlaylistsBtn').click(); await sleep(300);
  ok(D.querySelectorAll('#myPlaylistsList .pl-row').length===0 && /Keine Playlist mit dem Kürzel „PT“/.test(D.getElementById('myPlaylistsList').textContent) && /PT Metal 90er/.test(D.getElementById('myPlaylistsList').textContent), 'Ohne Treffer: Hinweis „so umbenennen, z. B. PT Metal 90er“');
  ok(/0 Playlists mit Kürzel „PT“ gefunden \(von 2 insgesamt\)/.test(D.getElementById('myPlaylistsStatus').textContent), 'Statuszeile: 0 von 2');
  w.close();

  // ===== C) Songliste eingeklappt =====
  dom = boot([], [1,2,3,4,5].map(mkTrack)); w = dom.window; D = w.document;
  await sleep(250);
  const det = D.getElementById('trackDetails'), sum = D.getElementById('trackSummary');
  ok(det.style.display==='block' && det.open===false, 'Mit Songs im Stapel: Liste da, aber zugeklappt');
  ok(/Songliste öffnen \(5\)/.test(sum.textContent) && /5 Songs im Stapel/.test(D.getElementById('trackCount').textContent), 'Zusammenfassung „Songliste öffnen (5)“, Zähler „5 Songs im Stapel“ bleibt sichtbar');
  ok(D.querySelectorAll('#trackList .track-item').length===5, 'Die 5 Songs sind im Aufklappbereich vorhanden');
  det.open = true;
  D.querySelector('#trackList .track-item button').click();
  ok(D.querySelectorAll('#trackList .track-item').length===4 && det.open===true && /\(4\)/.test(sum.textContent), 'Einmal geöffnet, bleibt sie beim Entfernen offen; Zähler (4)');
  D.getElementById('clearTracksBtn').click();
  ok(det.style.display==='none' && det.open===false, 'Alle entfernt: Bereich verschwindet und ist beim nächsten Mal wieder zu');
  w.close();
  dom = boot([]); w = dom.window; D = w.document; await sleep(200);
  ok(D.getElementById('trackDetails').style.display==='none', 'Ohne Songs: kein Aufklappbereich sichtbar');
  w.close();

  console.log(errs.length? 'UNERWARTET:\n'+errs.join('\n'):'Keine unerwarteten Fehler');
  console.log(fails||errs.length?'\n'+(fails+errs.length)+' FEHLER':'\nALLE TESTS OK'); process.exit(fails||errs.length?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
