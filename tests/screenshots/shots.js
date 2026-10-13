const chromium = require('@sparticuz/chromium').default;
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const FILE = FILE;
const FILE = 'file://' + require('path').resolve(__dirname, '..', '..', 'index.html');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser = await puppeteer.launch({ args:[...chromium.args,'--no-sandbox','--allow-file-access-from-files'], executablePath: await chromium.executablePath(), headless:'shell' });
  async function newPage(url, w=390, h=844, storage){
    const page = await browser.newPage();
    await page.setViewport({width:w,height:h,deviceScaleFactor:2});
    await page.setRequestInterception(true);
    page.on('request', r => { const u=r.url(); if(u.startsWith('file:')||u.startsWith('data:')) r.continue(); else r.abort(); });
    page.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0,200)));
    if(storage){ await page.evaluateOnNewDocument((st)=>{ for(const [k,v] of Object.entries(st)) localStorage.setItem(k,v); }, storage); }
    await page.goto(url, {waitUntil:'load'});
    await sleep(300);
    return page;
  }
  const unlocked = { plattenteller_gate_unlocked:'yes' };
  const addSong = (page, n) => page.evaluate((n)=>{
    for(let i=1;i<=n;i++){
      document.getElementById('trackUrlInput').value='https://open.spotify.com/track/ID'+String(i).padStart(4,'0')+'aaaaaaaaaaaaaa';
      document.getElementById('trackTitleInput').value='Song '+i;
      document.getElementById('trackArtistInput').value='Interpret '+i;
      document.getElementById('addTrackBtn').click();
    }
  }, n);

  // 1) Gate
  let page = await newPage(FILE);
  await page.screenshot({path:'01_gate.png'});
  await page.close();

  // 2) Setup (mobil + Desktop)
  page = await newPage(FILE, 390, 844, unlocked);
  await addSong(page, 3);
  await page.evaluate(()=>{ document.getElementById('searchPanel').style.display='block'; document.getElementById('playerInput').value='Anna'; document.getElementById('addPlayerBtn').click(); document.getElementById('playerInput').value='Ben'; document.getElementById('addPlayerBtn').click();
    document.querySelector('#genreChips') && (document.getElementById('genreChips').innerHTML='<div class="pick-chip selected">Rock</div><div class="pick-chip">Pop</div><div class="pick-chip">Hip-Hop</div>'); });
  await sleep(200);
  await page.screenshot({path:'02_setup_mobile.png', fullPage:true});
  await page.close();

  // 3) Spiel (lokal): Tippen -> läuft -> Aufdecken -> Ende
  page = await newPage(FILE, 390, 844, unlocked);
  await addSong(page, 10);
  await page.evaluate(()=>{ for(const n of ['Anna','Ben','Cem']){ document.getElementById('playerInput').value=n; document.getElementById('addPlayerBtn').click(); } });
  await page.evaluate(()=>document.getElementById('startGameBtn').click());
  await sleep(300);
  await page.screenshot({path:'03_game_idle.png', fullPage:true});
  await page.evaluate(()=>document.getElementById('deezerAudio').dispatchEvent(new Event('play')));
  await sleep(700);
  await page.screenshot({path:'04_game_playing.png', fullPage:true});
  await page.evaluate(()=>{ document.getElementById('guessTitle').value='Song 4'; document.getElementById('guessArtist').value='Interpret'; document.getElementById('revealBtn').click(); });
  await sleep(700);
  await page.screenshot({path:'05_game_reveal.png', fullPage:true});
  await page.close();

  // 3b) Desktop-Spiel
  page = await newPage(FILE, 1100, 900, unlocked);
  await addSong(page, 10);
  await page.evaluate(()=>{ for(const n of ['Anna','Ben','Cem']){ document.getElementById('playerInput').value=n; document.getElementById('addPlayerBtn').click(); } document.getElementById('startGameBtn').click(); });
  await sleep(300);
  await page.evaluate(()=>document.getElementById('deezerAudio').dispatchEvent(new Event('play')));
  await sleep(600);
  await page.setViewport({width:1100,height:900,deviceScaleFactor:1});
  await page.screenshot({path:'06_game_desktop.png', fullPage:true});
  await page.close();

  // 4) Langes Spiel: 100 Songs
  page = await newPage(FILE, 390, 844, unlocked);
  await addSong(page, 100);
  await page.evaluate(()=>{ document.getElementById('playerInput').value='Anna'; document.getElementById('addPlayerBtn').click(); document.getElementById('startGameBtn').click(); });
  await sleep(300);
  await page.screenshot({path:'07_game_100_songs.png', clip:{x:0,y:0,width:390,height:300}});
  const info100 = await page.evaluate(()=>({num:document.getElementById('deckCurrent').textContent, total:document.getElementById('deckTotal').textContent, cls:document.getElementById('deckTicks').className, ticks:document.querySelectorAll('#deckTicks i').length}));
  console.log('100 Songs:', JSON.stringify(info100));
  await page.close();
  // 24 vs 25 Songs
  for(const n of [24,25]){
    page = await newPage(FILE, 390, 844, unlocked);
    await addSong(page, n);
    await page.evaluate(()=>{ document.getElementById('playerInput').value='Anna'; document.getElementById('addPlayerBtn').click(); document.getElementById('startGameBtn').click(); });
    await sleep(200);
    console.log(n+' Songs:', JSON.stringify(await page.evaluate(()=>({cls:document.getElementById('deckTicks').className, ticks:document.querySelectorAll('#deckTicks i').length, num:document.getElementById('deckCurrent').textContent}))));
    await page.close();
  }

  // 5) Endscreen
  page = await newPage(FILE, 390, 844, unlocked);
  await addSong(page, 1);
  await page.evaluate(()=>{ for(const n of ['Anna','Ben','Cem']){ document.getElementById('playerInput').value=n; document.getElementById('addPlayerBtn').click(); } document.getElementById('startGameBtn').click(); });
  await sleep(200);
  await page.evaluate(()=>{ document.getElementById('revealBtn').click(); });
  await sleep(200);
  await page.evaluate(()=>{ document.getElementById('judgeBoth').click(); document.getElementById('nextRoundBtn').click(); });
  await sleep(300);
  await page.screenshot({path:'08_end.png', fullPage:true});
  await page.close();

  // 6) Handy-Ansichten (Spieler)
  page = await newPage(FILE+'?join=GA4H', 390, 844);
  await page.screenshot({path:'09_player_join.png', fullPage:true});
  await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    $('pvJoinPanel').style.display='none';
    $('pvGuessPanel').style.display='block'; $('pvRoundNo').textContent='3'; $('pvRoundTotal').textContent='12';
    $('pvGuessHint').textContent='Der Song läuft! Tippe Titel und Interpret und schicke deinen Tipp ab — die Zeit läuft mit.';
    $('pvEq').classList.add('spin'); $('pvMyScoreGuess').textContent='4';
  });
  await sleep(500);
  await page.screenshot({path:'10_player_guess.png', fullPage:true});
  await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    $('pvGuessPanel').style.display='none'; $('pvRevealPanel').style.display='block';
    $('pvRevealTitle').textContent='Wonderwall'; $('pvRevealArtist').textContent='Oasis';
    $('pvMyResult').innerHTML='Dein Tipp (nach 12,3 s): wonderwall / oasis<br><span style="color:var(--gold); font-size:15px;">+2 Punkte</span>';
    $('pvScoreList').innerHTML='<div class="mp-player me"><span style="color:var(--slate);width:18px;">1</span><span class="nm">Anna</span><span style="font-weight:600;color:var(--gold);">6</span></div><div class="mp-player"><span style="color:var(--slate);width:18px;">2</span><span class="nm">Ben</span><span style="font-weight:600;">4</span></div>';
  });
  await page.screenshot({path:'11_player_reveal.png', fullPage:true});
  await page.evaluate(()=>{ const $=id=>document.getElementById(id); $('pvOfflineBar').style.display='block'; });
  await page.screenshot({path:'12_player_offline.png', clip:{x:0,y:0,width:390,height:420}});
  await page.close();

  // 7) Raum-Box (Host)
  page = await newPage(FILE, 390, 844, unlocked);
  await page.evaluate(()=>{ const $=id=>document.getElementById(id); $('mpCreateBtn').style.display='none'; $('mpRoomBox').style.display='block'; $('mpRoomCode').textContent='GA4H'; $('mpRoomLink').textContent='https://ostpower.github.io/plattenteller/?join=GA4H'; $('mpQr').innerHTML='<svg viewBox="0 0 4 4"><rect width="4" height="4" fill="#000"/><rect x="1" y="1" width="2" height="2" fill="#fff"/></svg>';
    $('mpCount').textContent='2'; $('mpPlayerList').innerHTML='<div class="mp-player"><span class="dot ok"></span><span class="nm">Anna</span><button class="mp-kick">×</button></div><div class="mp-player"><span class="dot"></span><span class="nm">Ben</span><button class="mp-kick">×</button></div>'; document.getElementById('mpHostPanel').scrollIntoView(); });
  await sleep(200);
  const el = await page.$('#mpHostPanel');
  await el.screenshot({path:'13_host_room.png'});
  await page.close();
  await browser.close();
  console.log('fertig');
})().catch(e=>{console.error('ERR', e.stack.slice(0,500)); process.exit(1)});
