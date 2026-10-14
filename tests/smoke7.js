const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const PT_PATH = require('path');
const PT_INDEX = process.env.PT_INDEX || PT_PATH.join(__dirname, '..', 'index.html');
const PT_QR = PT_PATH.join(__dirname, 'node_modules', 'qrcode-generator', 'qrcode.js');

let html = fs.readFileSync(PT_INDEX,'utf8').replace(/<script src="[^"]+"[^>]*><\/script>/g, '');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
const errs=[]; const calls=[];

function makeFetch(scopeAfterRefresh){
  const json = (obj, status=200) => Promise.resolve({ ok: status<400, status, headers:{get:()=>null}, json:()=>Promise.resolve(obj) });
  const T = n => ({ type:'track', id:'ID'+n, uri:'spotify:track:ID'+n, name:'Song '+n, artists:[{id:'AR'+n,name:'Interpret '+n}], external_ids: ({1:{isrc:'USSM10501327'},3:{isrc:'GBAAA0000003'},4:{isrc:'XXXX00000004'}})[n], album:{ id:'AL'+n, name:'Album '+n, images:[{url:'https://img/'+n+'.jpg'}], release_date:(1980+n*3)+'-03-01', release_date_precision:'day', album_type:'album', total_tracks:12 } });
  return (url, opts) => {
    const u=String(url); calls.push(u);
    if(u.startsWith('https://accounts.spotify.com/api/token')) return json({access_token:'AT', expires_in:3600, refresh_token:'RT2', scope: scopeAfterRefresh});
    if(u==='https://api.spotify.com/v1/me') return json({id:'marcel'});
    if(u.startsWith('https://api.spotify.com/v1/me/playlists')) return json({items:[
      {id:'PL1',name:'PT Rock',items:{total:120},owner:{id:'marcel',display_name:'Marcel'}},
      {id:'PL2',name:'PT Pop',tracks:{total:80},owner:{id:'marcel'}},
      {id:'PL3',name:'Spotify Mix',items:{total:50},owner:{id:'spotify',display_name:'Spotify'}},
      {id:'PL4',name:'Urlaub',items:{total:10},owner:{id:'marcel'}},
      {id:'PL5',name:'PT Fremd',items:{total:9},owner:{id:'spotify',display_name:'Spotify'}},
      {id:'PL6',name:'Metal 90er',description:'Meine Auswahl #pt',items:{total:30},owner:{id:'marcel'}},
      {id:'PL7',name:'Ptolemäus Hörspiel',items:{total:5},owner:{id:'marcel'}}], next:null});
    let m;
    if((m=u.match(/\/playlists\/(\w+)\?fields/))) return json({name: m[1]==='PL1'?'PT Rock':'Playlist '+m[1], items:{total:7}});
    if(/\/playlists\/\w+\/items\?limit=100/.test(u)) return json({ items:[1,2,3,4,5,6].map(n=>({item:T(n)})), next:null });
    if(/\/playlists\/\w+\/items\?limit=3/.test(u)) return json({ total:120, items:[1,2,3].map(n=>({added_at:'2026-01-01T00:00:00Z', item:T(n)})) });
    if((m=u.match(/\/v1\/tracks\/(\w+)$/))) return json(T(parseInt(m[1].replace('ID',''))||1));
    if(/\/v1\/albums\//.test(u)) return json({ id:'AL1', genres:[] });
    if(/\/v1\/artists\//.test(u)) return json({ id:'AR1', name:'Interpret 1', genres:[] });
    if(u.includes('musicbrainz.org/ws/2/isrc/USSM10501327')) return json({ isrc:'USSM10501327', recordings:[
        { id:'R1', title:'Song 1', disambiguation:'live', releases:[{title:'2005-11-09: ARCO Arena, Sacramento, CA, USA'}], 'artist-credit':[{artist:{id:'MBID'}}] },
        { id:'R2', title:'Song 1', 'first-release-date':'1981-03-01', 'artist-credit':[{artist:{id:'MBID'}}] } ] });
    if(u.includes('musicbrainz.org/ws/2/isrc/GBAAA0000003')) return json({ recordings:[ { id:'R3', title:'Song 3', 'first-release-date':'1989-05-05' } ] });
    if(u.includes('musicbrainz.org/ws/2/isrc/XXXX00000004')) return json({ error:'Not Found' }, 404);
    if(/musicbrainz\.org\/ws\/2\/recording\/R3/.test(u)) return json({ id:'R3', 'first-release-date':'1989-05-05', 'artist-credit':[{artist:{id:'MBID3'}}] });
    if(u.startsWith('https://musicbrainz.org/ws/2/recording/?query')) return json({ recordings:[
        { id:'L1', score:100, title:'Song', disambiguation:'', releases:[{title:'2005-11-09: ARCO Arena, Sacramento, CA, USA'}], 'artist-credit':[{artist:{id:'MBID'}}] },
        { id:'S1', score:96, title:'Song', 'first-release-date':'1986-05-01', releases:[{title:'Studioalbum'}], 'artist-credit':[{artist:{id:'MBID'}}] } ] });
    if(u.startsWith('https://musicbrainz.org/ws/2/artist/MBID3')) return json({ country:'DE', area:{name:'Germany'}, 'begin-area':{name:'Köln'} });
    if(u.startsWith('https://musicbrainz.org/ws/2/artist/')) return json({ country:'GB', area:{name:'United Kingdom'}, 'begin-area':{name:'Manchester'} });
    return Promise.reject(new Error('unmocked: '+u));
  };
}
function boot(storage, scopeAfterRefresh){
  const vc=new VirtualConsole(); vc.on('jsdomError',e=>{ if(!/Not implemented|Could not parse CSS/.test(e.message)) errs.push(e.message); });
  vc.on('error',(...a)=>errs.push('console.error: '+a.join(' ').slice(0,160)));
  return new JSDOM(html,{url:'https://ostpower.github.io/plattenteller/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    for(const [k,v] of Object.entries(storage||{})) w.localStorage.setItem(k,v);
    w.confirm=()=>true; w.fetch=makeFetch(scopeAfterRefresh);
  }});
}
const store = dom => { const o={}; const ls=dom.window.localStorage; for(let i=0;i<ls.length;i++){ o[ls.key(i)]=ls.getItem(ls.key(i)); } return o; };

(async()=>{
  // ===== A) Alte Anmeldung (ohne Playlist-Berechtigung) =====
  let dom = boot({ plattenteller_gate_unlocked:'yes', plattenteller_refresh_token:'RT1', plattenteller_spotify_scope:'' }, '');
  let w=dom.window, D=w.document, $=id=>D.getElementById(id);
  await sleep(200);
  ok($('searchPanel').style.display==='block', 'Verbunden: Songs-Panel sichtbar');
  ok($('scopeNote').style.display==='block', 'Alte Anmeldung ohne Berechtigung: Hinweis „Berechtigung erweitern“ sichtbar');
  ok(/Noch keine Playlists gemerkt/.test($('savedPlaylistsEmpty').textContent) && $('savedPlaylistsEmpty').style.display!=='none', 'Anfangs: „Noch keine Playlists gemerkt“');
  ok($('clearTracksBtn').style.display==='none', 'Ohne Songs: kein „Alle entfernen“');

  // ===== B) Meine Playlists aus Spotify =====
  $('myPlaylistsBtn').click(); await sleep(200);
  let rows=[...D.querySelectorAll('#myPlaylistsList .pl-row')];
  ok(rows.length===4, 'Meine Playlists: nur die 4 mit Kürzel „PT“ / #pt (von 7 insgesamt) ('+rows.length+')');
  ok(/120 Songs/.test(rows[0].textContent) && /80 Songs/.test(rows[1].textContent), 'Songanzahl aus „items.total“ UND „tracks.total“ gelesen');
  ok(/von Spotify/.test(rows[2].textContent), 'Fremde Playlist (PT Fremd) als „von Spotify“ gekennzeichnet');
  ok(!/von /.test(rows[0].textContent), 'Eigene Playlist ohne Fremd-Hinweis');
  $('myPlaylistsFilter').value='rock'; $('myPlaylistsFilter').dispatchEvent(new w.Event('input'));
  ok(D.querySelectorAll('#myPlaylistsList .pl-row').length===1, 'Filter „rock“: nur 1 Playlist');
  [...D.querySelectorAll('#myPlaylistsList .pl-row')][0].querySelectorAll('button')[1].click(); await sleep(50); // Merken
  ok(D.querySelectorAll('#savedPlaylists .pl-row').length===1, 'Merken: Playlist steht in der Liste oben');
  ok(JSON.parse(w.localStorage.getItem('plattenteller_playlists'))[0].id==='PL1', 'Merken: im Browser gespeichert');
  ok([...D.querySelectorAll('#myPlaylistsList .pl-row')][0].textContent.includes('✓ gemerkt'), 'In der Spotify-Liste steht jetzt „✓ gemerkt“');

  // ===== C) Gemerkte Playlist laden: Jahr kommt mit =====
  D.querySelector('#savedPlaylists .pl-row button').click(); await sleep(250);  // Laden
  const tr=[...D.querySelectorAll('#trackList .track-item')];
  ok(tr.length===6, 'Playlist geladen: 6 Songs im Stapel');
  ok(/Interpret \d · 19\d\d/.test(tr[0].textContent), 'Stapel zeigt das Jahr hinter dem Interpreten ('+tr[0].textContent.replace(/\s+/g,' ').trim()+')');
  ok(calls.some(u=>/items\?limit=100.*release_date/.test(decodeURIComponent(u))), 'Playlist-Abfrage verlangt das Feld release_date');
  ok($('clearTracksBtn').style.display!=='none', '„Alle entfernen“ erscheint');
  ok(JSON.parse(w.localStorage.getItem('plattenteller_tracks')).length===6 && JSON.parse(w.localStorage.getItem('plattenteller_tracks'))[0].year>1900, 'Songauswahl samt Jahr im Browser gesichert');

  // ===== D) Merken per Link + Entfernen =====
  $('playlistUrlInput').value='https://open.spotify.com/playlist/PL9?si=abc'; $('savePlaylistBtn').click(); await sleep(120);
  ok(D.querySelectorAll('#savedPlaylists .pl-row').length===2, 'Merken per Link: zweite Playlist gespeichert');
  ok(/Playlist PL9/.test(D.querySelector('#savedPlaylists').textContent), 'Name per Spotify geholt/Ersatzname verwendet');
  $('savePlaylistBtn').click(); await sleep(60);
  ok(/schon in deiner Liste/.test($('playlistImportStatus').textContent) && D.querySelectorAll('#savedPlaylists .pl-row').length===2, 'Doppeltes Merken wird abgefangen');

  // ===== E) Neuladen: alles bleibt =====
  const keep = store(dom); dom.window.close();
  dom = boot(keep, 'playlist-read-private playlist-read-collaborative'); w=dom.window; D=w.document; await sleep(250);
  ok(D.querySelectorAll('#savedPlaylists .pl-row').length===2, 'Nach Neuladen: gemerkte Playlists sind noch da');
  ok(D.querySelectorAll('#trackList .track-item').length===6, 'Nach Neuladen: Songstapel (6 Songs) wiederhergestellt');
  ok(D.getElementById('trackCount').textContent==='6 Songs im Stapel', 'Zähler „6 Songs im Stapel“');
  ok(D.getElementById('scopeNote').style.display==='none' && w.localStorage.getItem('plattenteller_spotify_scope').includes('playlist-read-private'), 'Neue Berechtigung erkannt und gespeichert: Hinweis verschwindet');

  // ===== F) Liste sichern / übertragen =====
  D.getElementById('exportPlaylistsBtn').click(); await sleep(60);
  const exp = D.getElementById('importPlaylistsText').value;
  ok(/PT Rock \| https:\/\/open\.spotify\.com\/playlist\/PL1/.test(exp), 'Export: „Name | Link“ pro Zeile ('+exp.split('\n')[0]+')');
  D.getElementById('importPlaylistsText').value = exp + '\nPop | https://open.spotify.com/playlist/PL5\nhttps://open.spotify.com/playlist/PL6\nKaputt ohne Link';
  D.getElementById('importPlaylistsBtn').click();
  ok(D.querySelectorAll('#savedPlaylists .pl-row').length===4 && /2 hinzugefügt, 2 schon vorhanden/.test(D.getElementById('playlistListStatus').textContent), 'Import: 2 neue, 2 vorhandene erkannt, Zeile ohne Link ignoriert ('+D.getElementById('playlistListStatus').textContent+')');
  const rm = [...D.querySelectorAll('#savedPlaylists .pl-row')][3].querySelectorAll('button')[1]; rm.click();
  ok(D.querySelectorAll('#savedPlaylists .pl-row').length===3, 'Entfernen (×): Playlist weg');

  // ===== G) Alle Songs entfernen =====
  D.getElementById('clearTracksBtn').click();
  ok(D.querySelectorAll('#trackList .track-item').length===0 && w.localStorage.getItem('plattenteller_tracks')===null, '„Alle entfernen“ leert Stapel und gesicherte Auswahl');

  // ===== H) Debug-Ansicht: Spotify =====
  D.getElementById('debugInput').value='https://open.spotify.com/track/ID1?si=x';
  D.getElementById('debugSpotifyBtn').click(); await sleep(200);
  const dbg = D.getElementById('debugOut').textContent.replace(/\s+/g,' ');
  ok(/Veröffentlichung \(Album\)\s*1983-03-01 \(day\)/.test(dbg), 'Debug: Veröffentlichungsdatum des Albums angezeigt (1983-03-01)');
  ok(/Popularität\s*nicht geliefert/.test(dbg) && /ISRC[^]*?nicht geliefert/.test(dbg) && /Interpret-Genres\s*nicht geliefert/.test(dbg), 'Debug: Popularität, ISRC, Genres als „nicht geliefert“ markiert');
  ok(D.querySelectorAll('#debugOut .dbg-row .v.ok').length>=5 && D.querySelectorAll('#debugOut .dbg-row .v.miss').length>=4, 'Debug: grün/rot-Markierung ('+D.querySelectorAll('#debugOut .dbg-row .v.ok').length+' vorhanden, '+D.querySelectorAll('#debugOut .dbg-row .v.miss').length+' fehlen)');
  ok(/"release_date": "1983-03-01"/.test(D.querySelector('#debugOut pre').textContent), 'Debug: Rohdaten (JSON) abrufbar');
  ok(D.getElementById('debugCopyBtn').style.display!=='none', 'Debug: „Ergebnis kopieren“ erscheint');
  // Playlist-Prüfung
  D.getElementById('debugInput').value='https://open.spotify.com/playlist/PL1';
  D.getElementById('debugSpotifyBtn').click(); await sleep(200);
  ok(/Aufbau eines Eintrags/.test(D.getElementById('debugOut').textContent) && /Felder des Eintrags\s*added_at, item/.test(D.getElementById('debugOut').textContent.replace(/\s+/g,' ')), 'Debug (Playlist): zeigt den Aufbau („added_at, item“)');
  // MusicBrainz (leer = erster Song im Stapel; Stapel ist leer -> Hinweis, dann mit Link)
  D.getElementById('debugInput').value=''; D.getElementById('debugMbBtn').click(); await sleep(60);
  ok(/Kein Song gefunden/.test(D.getElementById('debugOut').textContent), 'MusicBrainz ohne Song: klare Meldung');
  const mbRun = async (link, wait) => { D.getElementById('debugInput').value=link; D.getElementById('debugMbBtn').click(); await sleep(wait); return D.getElementById('debugOut').textContent.replace(/\s+/g,' '); };
  // 1) Mit ISRC: genau diese Aufnahme, Live-Treffer wird übergangen
  let mb = await mbRun('https://open.spotify.com/track/ID1', 2600);
  ok(/Gefunden über\s*ISRC/.test(mb) && /ISRC\s*USSM10501327/.test(mb), 'MusicBrainz: Suche über die ISRC');
  ok(/Erstveröffentlichung laut MusicBrainz\s*1981-03-01/.test(mb), 'MusicBrainz: Live-Aufnahme übergangen, Studio-Erstveröffentlichung gewählt (1981-03-01)');
  ok(/ISRC-Vorsilbe[^]*?US/.test(mb) && /Jahr laut Spotify \(Album\)\s*1983/.test(mb) && /Spotify 1983, MusicBrainz 1981 \(2 Jahre Unterschied\)/.test(mb), 'Vergleich Spotify-Jahr (1983) und MusicBrainz (1981) mit Abweichung');
  ok(/Interpret-Herkunft \(Land\)\s*GB/.test(mb) && /Manchester/.test(mb), 'Herkunftsland und -ort des Interpreten');
  // 2) ISRC-Treffer ohne Interpret: Aufnahme wird nachgeladen
  mb = await mbRun('https://open.spotify.com/track/ID3', 4600);
  ok(/Erstveröffentlichung laut MusicBrainz\s*1989-05-05/.test(mb) && /Interpret-Herkunft \(Land\)\s*DE/.test(mb) && /Köln/.test(mb), 'Fehlender Interpret wird per Einzelabfrage nachgeladen (DE, Köln)');
  // 3) Ohne ISRC: Textsuche, Live-Treffer mit Score 100 wird übergangen
  mb = await mbRun('https://open.spotify.com/track/ID2', 3600);
  ok(/Gefunden über\s*Textsuche/.test(mb) && /Erstveröffentlichung laut MusicBrainz\s*1986-05-01/.test(mb), 'Textsuche: Studio-Version (1986) statt Live-Treffer gewählt');
  // 4) ISRC unbekannt (404): Rückfall auf Textsuche mit Hinweis
  mb = await mbRun('https://open.spotify.com/track/ID4', 5600);
  ok(/Gefunden über\s*Textsuche/.test(mb) && /ISRC-Abfrage: MusicBrainz antwortet mit HTTP 404/.test(mb), 'Unbekannte ISRC (404): Rückfall auf Textsuche, Hinweis sichtbar');
  ok(calls.some(u=>u.includes('musicbrainz.org/ws/2/isrc/USSM10501327')), 'ISRC-Abfrage wurde gesendet');

  // ===== I) Berechtigung im Code =====
  ok(/scope: SPOTIFY_SCOPES/.test(html) && /SPOTIFY_SCOPES = 'playlist-read-private playlist-read-collaborative'/.test(html), 'Login fragt die Playlist-Berechtigung an');
  ok(/CLIENT_ID = '96426600438a4e27a76fd24f62f345a2'/.test(html) && /REDIRECT_URI = window\.location\.origin \+ window\.location\.pathname/.test(html), 'Client-ID und Redirect-URI unverändert');

  console.log(errs.length? '\nUNERWARTET:\n'+errs.join('\n') : '\nKeine unerwarteten Fehler');
  console.log(fails?'\n'+fails+' FEHLER':'\nALLE TESTS OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
