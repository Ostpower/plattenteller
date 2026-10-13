const chromium = require('@sparticuz/chromium').default;
const puppeteer = require('puppeteer-core');
const FILE = 'file://' + require('path').resolve(__dirname, '..', '..', 'index.html');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const MOCK = () => {
  const json = (obj) => Promise.resolve({ ok:true, status:200, headers:{get:()=>null}, json:()=>Promise.resolve(obj) });
  const names=['Wonderwall','Smells Like Teen Spirit','Mr. Brightside','Seven Nation Army','Back In Black','Livin on a Prayer'];
  const arts=['Oasis','Nirvana','The Killers','The White Stripes','AC/DC','Bon Jovi'];
  const yrs=[1995,1991,2004,2003,1980,1986];
  const T = n => ({ type:'track', id:'ID'+n, uri:'spotify:track:ID'+n, name:names[n-1], artists:[{id:'AR'+n,name:arts[n-1]}], album:{ id:'AL'+n, name:'Album '+n, images:[], release_date:yrs[n-1]+'-03-01', release_date_precision:'day', album_type:'album', total_tracks:12 } });
  window.fetch = (url) => {
    const u=String(url);
    if(u.startsWith('https://accounts.spotify.com/api/token')) return json({access_token:'AT', expires_in:3600, refresh_token:'RT2', scope:'playlist-read-private playlist-read-collaborative'});
    if(u==='https://api.spotify.com/v1/me') return json({id:'marcel'});
    if(u.startsWith('https://api.spotify.com/v1/me/playlists')) return json({items:[
      {id:'PL1',name:'Plattenteller Rock',items:{total:120},owner:{id:'marcel',display_name:'Marcel'}},
      {id:'PL2',name:'Plattenteller 80er',items:{total:95},owner:{id:'marcel'}},
      {id:'PL3',name:'Today’s Top Hits',items:{total:50},owner:{id:'spotify',display_name:'Spotify'}},
      {id:'PL4',name:'Urlaub 2026',items:{total:31},owner:{id:'marcel'}}], next:null});
    if(/\/playlists\/\w+\?fields/.test(u)) return json({name:'Plattenteller Rock', items:{total:120}});
    if(/\/playlists\/\w+\/items\?limit=100/.test(u)) return json({ items:[1,2,3,4,5,6].map(n=>({item:T(n)})), next:null });
    if(/\/v1\/tracks\/\w+$/.test(u)) return json(T(1));
    if(/\/v1\/albums\//.test(u)) return json({ id:'AL1', genres:[] });
    if(/\/v1\/artists\//.test(u)) return json({ id:'AR1', name:'Oasis', genres:[] });
    if(u.startsWith('https://musicbrainz.org/ws/2/recording/')) return json({ recordings:[{ score:100, title:'Wonderwall', 'first-release-date':'1995-10-30', releases:[{title:'(What’s the Story) Morning Glory?'}], 'artist-credit':[{artist:{id:'MBID'}}] }] });
    if(u.startsWith('https://musicbrainz.org/ws/2/artist/')) return json({ country:'GB', area:{name:'United Kingdom'}, 'begin-area':{name:'Manchester'} });
    return Promise.reject(new Error('unmocked '+u));
  };
};
(async()=>{
  const browser = await puppeteer.launch({ args:[...chromium.args,'--no-sandbox','--allow-file-access-from-files'], executablePath: await chromium.executablePath(), headless:'shell' });
  const page = await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:2});
  await page.setRequestInterception(true);
  page.on('request', r => { const u=r.url(); if(u.startsWith('file:')||u.startsWith('data:')) r.continue(); else r.abort(); });
  page.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0,200)));
  await page.evaluateOnNewDocument(()=>{ localStorage.setItem('plattenteller_gate_unlocked','yes'); localStorage.setItem('plattenteller_refresh_token','RT1'); localStorage.setItem('plattenteller_spotify_scope',''); });
  await page.evaluateOnNewDocument(MOCK);
  await page.goto(FILE,{waitUntil:'load'}); await sleep(500);
  const shot = async (sel, name) => { const el = await page.$(sel); await el.screenshot({path:name}); };
  // 1) Anfangszustand: Hinweis Berechtigung, leere Liste
  await page.evaluate(()=>document.getElementById('playlistBlock').scrollIntoView());
  await shot('#playlistBlock','30_playlists_start.png');
  // 2) Meine Playlists holen + eine merken + Laden
  await page.evaluate(()=>{ document.getElementById('myPlaylistsBtn').click(); });
  await sleep(400);
  await page.evaluate(()=>{ document.querySelectorAll('#myPlaylistsList .pl-row')[0].querySelectorAll('button')[1].click(); document.querySelectorAll('#myPlaylistsList .pl-row')[1].querySelectorAll('button')[1].click(); });
  await sleep(200);
  await page.evaluate(()=>{ document.querySelector('#savedPlaylists .pl-row button').click(); });
  await sleep(500);
  await shot('#playlistBlock','31_playlists_gemerkt.png');
  await shot('#trackListWrap','32_stapel_mit_jahr.png');
  // 3) Debug
  await page.evaluate(()=>{ document.getElementById('debugBlock').open = true; document.getElementById('debugInput').value='https://open.spotify.com/track/ID1'; document.getElementById('debugSpotifyBtn').click(); });
  await sleep(500);
  await shot('#debugBlock','33_debug_spotify.png');
  await browser.close();
  console.log('ok');
})().catch(e=>{console.error('ERR', e.stack.slice(0,400)); process.exit(1)});
