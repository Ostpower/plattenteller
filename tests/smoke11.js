// Playlist-Import: die GANZE Playlist wird übernommen (keine Zufallsauswahl, keine Max-2-Regel)
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const PT_PATH = require('path');
const PT_INDEX = process.env.PT_INDEX || PT_PATH.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(PT_INDEX,'utf8').replace(/<script src="[^"]+"[^>]*><\/script>/g, '');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+': '+m); if(!c) fails++; };
const errs=[]; const calls=[];
const json = (obj, status=200) => Promise.resolve({ ok: status<400, status, headers:{get:()=>null}, json:()=>Promise.resolve(obj) });
const song = (id, name, artistId, artist, year) => ({ type:'track', id, uri:'spotify:track:'+id, name, artists:[{id:artistId,name:artist}], album:{ images:[], release_date:year+'-01-01', album_type:'album' }, external_ids:{isrc:'ISRC'+id} });
let scenario = 'small';
function fetchMock(url){
  const u=String(url); calls.push(u);
  if(u.startsWith('https://accounts.spotify.com/api/token')) return json({access_token:'AT',expires_in:3600,refresh_token:'RT2',scope:'playlist-read-private playlist-read-collaborative'});
  if(/\/playlists\/\w+\/items/.test(u)){
    const page2 = /offset=100/.test(u), page3 = /offset=200/.test(u);
    if(scenario==='small'){
      if(!page2) return json({ next:'https://api.spotify.com/v1/playlists/PL1/items?offset=100&limit=100', items:[
        {item:song('A1','Lied A1','ARA','Interpret A',1980)}, {item:song('A2','Lied A2','ARA','Interpret A',1981)}, {item:song('A3','Lied A3','ARA','Interpret A',1982)},
        {item:song('A4','Lied A4','ARA','Interpret A',1983)}, {item:song('A5','Lied A5','ARA','Interpret A',1984)},
        {item:song('A1','Lied A1','ARA','Interpret A',1980)},                                   // doppelt
        {item:song('RU1','Привет мир','ARU','Группа',1990)},                                    // nicht-lateinisch -> übersprungen
        {item:{ type:'episode', id:'EP1', name:'Podcast', uri:'spotify:episode:EP1' }},          // Podcast -> übersprungen
        {track:song('OLD1','Altes Feld','ARO','Interpret O',1975)} ] });                        // altes Feld "track"
      return json({ next:null, items:[
        {item:song('B1','Lied B1','ARB','Interpret B',2001)}, {item:song('B2','Lied B2','ARB','Interpret B',2002)}, {item:song('B3','Lied B3','ARB','Interpret B',2003)},
        {item:song('C1','Lied C1','ARC','Interpret C',2010)} ] });
    }
    // große Playlist: 250 Songs über 3 Seiten, viele je Interpret
    const mk = (from,to)=>Array.from({length:to-from},(_,i)=>({item:song('S'+(from+i),'Song '+(from+i),'AR'+((from+i)%7),'Band '+((from+i)%7),1970+((from+i)%50))}));
    if(!page2 && !page3) return json({ next:'https://api.spotify.com/v1/playlists/PL2/items?offset=100&limit=100', items: mk(0,100) });
    if(page2) return json({ next:'https://api.spotify.com/v1/playlists/PL2/items?offset=200&limit=100', items: mk(100,200) });
    return json({ next:null, items: mk(200,250) });
  }
  if(/\/playlists\/\w+\?fields/.test(u)) return json({name:'Test', items:{total:1}});
  return Promise.reject(new Error('unmocked '+u));
}
function boot(extra){
  const vc=new VirtualConsole(); vc.on('jsdomError',e=>{ if(!/Not implemented|Could not parse CSS/.test(e.message)) errs.push(e.message); });
  return new JSDOM(html,{url:'https://ostpower.github.io/plattenteller/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.localStorage.setItem('plattenteller_gate_unlocked','yes'); w.localStorage.setItem('plattenteller_refresh_token','RT1'); w.localStorage.setItem('plattenteller_spotify_scope','playlist-read-private');
    w.confirm=()=>true; w.fetch=fetchMock; if(extra) extra(w);
  }});
}
(async()=>{
  const dom = boot(); const w=dom.window, D=w.document, $=id=>D.getElementById(id);
  await sleep(200);
  // Der Knopf „Andere Auswahl aus dieser Playlist“ gibt es nicht mehr
  ok(!$('reshufflePlaylistBtn') && !/Andere Auswahl aus dieser Playlist/.test(D.body.textContent) && !!$('reshuffleBtn'), 'Knopf „Andere Auswahl aus dieser Playlist“ ist entfernt (der Such-Knopf „Andere Auswahl laden“ bleibt)');
  ok(/ganze Playlist/.test($('playlistBlock').textContent), 'Hinweistext nennt „ganze Playlist“');
  ok(/Anzahl Songs bei der Suche/.test(D.body.textContent), 'Beschriftung: „Anzahl Songs bei der Suche“');

  // ===== kleine Playlist mit Sonderfällen =====
  $('deckSizeInput').value = '4'; // darf den Import NICHT begrenzen
  $('playlistUrlInput').value = 'https://open.spotify.com/playlist/PL1?si=x';
  $('importPlaylistBtn').click(); await sleep(400);
  const items=[...D.querySelectorAll('#trackList .track-item')].map(r=>r.textContent.replace(/\s+/g,' ').trim());
  ok(items.length===10, 'Ganze Playlist übernommen: 10 Songs (trotz „Anzahl Songs“ = 4) — ' + items.length);
  ok(items.filter(t=>/Interpret A/.test(t)).length===5, '5 Songs von „Interpret A“ bleiben drin (keine Max-2-Regel)');
  ok(items.filter(t=>/Interpret B/.test(t)).length===3, '3 Songs von „Interpret B“ bleiben drin');
  ok(!items.some(t=>/Группа|Привет/.test(t)), 'Nicht-lateinische Schrift wird weiterhin übersprungen (bewusste Regel)');
  ok(!items.some(t=>/Podcast/.test(t)), 'Podcast-Episoden werden übersprungen');
  ok(items.some(t=>/Altes Feld/.test(t)), 'Altes Feld „track“ wird weiterhin gelesen');
  ok(items.filter(t=>/Lied A1/.test(t)).length===1, 'Doppelte Song-ID wird entfernt');
  const st=$('playlistImportStatus').textContent;
  ok(/10 Songs aus der Playlist übernommen/.test(st) && /1 doppelte entfernt/.test(st) && /1 mit nicht-lateinischer Schrift übersprungen/.test(st), 'Meldung: „10 Songs … (1 doppelte entfernt) (1 … übersprungen)“ — ' + st);
  ok(calls.filter(u=>/playlists\/PL1\/items/.test(u)).length===2, 'Zwei Seiten (Paging über „next“) wurden geladen');
  ok(JSON.parse(w.localStorage.getItem('plattenteller_tracks')).length===10, 'Songauswahl (10) im Browser gesichert');
  ok($('trackCount').textContent==='10 Songs im Stapel', 'Zähler „10 Songs im Stapel“');

  // ===== zweite Playlist ersetzt den Stapel =====
  scenario='big';
  $('playlistUrlInput').value = 'https://open.spotify.com/playlist/PL2';
  $('importPlaylistBtn').click(); await sleep(700);
  ok(D.querySelectorAll('#trackList .track-item').length===250, 'Große Playlist: alle 250 Songs übernommen (3 Seiten) — ' + D.querySelectorAll('#trackList .track-item').length);
  ok($('trackCount').textContent==='250 Songs im Stapel', 'Zähler „250 Songs im Stapel“ (kein Zufall, keine Begrenzung)');
  ok(!D.querySelector('#trackList').textContent.includes('Interpret A'), 'Neue Playlist ersetzt den Stapel (nicht angehängt)');
  const perBand = {}; JSON.parse(w.localStorage.getItem('plattenteller_tracks')).forEach(t=>{ perBand[t.artist]=(perBand[t.artist]||0)+1; });
  ok(Math.max(...Object.values(perBand))>=30, 'Pro Interpret weit über 2 Songs (z. B. ' + Math.max(...Object.values(perBand)) + ')');
  ok(JSON.parse(w.localStorage.getItem('plattenteller_tracks')).length===250, '250 Songs im Browser gesichert');
  ok(/250 Songs aus der Playlist übernommen\./.test($('playlistImportStatus').textContent), 'Meldung „250 Songs aus der Playlist übernommen.“');

  // ===== „Alle entfernen“ funktioniert ohne den alten Knopf =====
  $('clearTracksBtn').click();
  ok(D.querySelectorAll('#trackList .track-item').length===0 && w.localStorage.getItem('plattenteller_tracks')===null, '„Alle entfernen“ leert den Stapel');

  // ===== Der Weg über die gemerkten Playlists importiert ebenfalls komplett =====
  scenario='small';
  const dom2 = boot(w2 => w2.localStorage.setItem('plattenteller_playlists', JSON.stringify([{id:'PL1',name:'Meine Liste',count:10}])));
  const D2=dom2.window.document; await sleep(250);
  D2.querySelector('#savedPlaylists .pl-row button').click(); await sleep(450);
  ok(D2.querySelectorAll('#trackList .track-item').length===10 && /10 Songs aus der Playlist übernommen/.test(D2.getElementById('playlistImportStatus').textContent), 'Gemerkte Playlist „Laden“: ebenfalls komplett (10 Songs)');

  console.log(errs.length? 'UNERWARTET:\n'+errs.join('\n') : 'Keine unerwarteten Fehler');
  console.log(fails?'\n'+fails+' FEHLER':'\nALLE TESTS OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
