const chromium = require('@sparticuz/chromium').default;
const puppeteer = require('puppeteer-core');
const FILE = 'file://' + require('path').resolve(__dirname, '..', '..', 'index.html');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser = await puppeteer.launch({ args:[...chromium.args,'--no-sandbox','--allow-file-access-from-files'], executablePath: await chromium.executablePath(), headless:'shell' });
  async function newPage(url,w=390,h=844){
    const page = await browser.newPage(); await page.setViewport({width:w,height:h,deviceScaleFactor:2});
    await page.setRequestInterception(true);
    page.on('request', r => { const u=r.url(); if(u.startsWith('file:')||u.startsWith('data:')) r.continue(); else r.abort(); });
    page.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0,200)));
    await page.evaluateOnNewDocument(()=>localStorage.setItem('plattenteller_gate_unlocked','yes'));
    await page.goto(url,{waitUntil:'load'}); await sleep(300); return page;
  }
  // Handy: Einsortieren
  let page = await newPage(FILE + '?join=GA4H');
  await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    $('pvJoinPanel').style.display='none'; $('pvHitPanel').style.display='block';
    $('pvHitNo').textContent='3'; $('pvHitTotal').textContent='12'; $('pvHitEq').classList.add('spin');
    $('pvHitHint').textContent='Wo gehört der Song hin? Tippe auf die Stelle in deiner Zeitleiste (älter oben, neuer unten) und bestätige.';
    const cards=[{y:1965,t:'Satisfaction',a:'The Rolling Stones'},{y:1981,t:'Under Pressure',a:'Queen & David Bowie'},{y:1994,t:'Zombie',a:'The Cranberries'},{y:2009,t:'Poker Face',a:'Lady Gaga'}];
    let h='';
    for(let i=0;i<=cards.length;i++){
      const sel = i===2;
      h+='<button class="tl-slot'+(sel?' sel':'')+'" data-slot="'+i+'">'+(sel?'? Hier einsortieren':'hier einsortieren')+'</button>';
      if(i<cards.length){ const c=cards[i]; h+='<div class="tl-card"><span class="y">'+c.y+'</span><span class="m"><b>'+c.t+'</b><br>'+c.a+'</span></div>'; }
    }
    $('pvTimelineEl').innerHTML=h; $('pvHitSend').disabled=false; $('pvHitCards').textContent='4';
  });
  await sleep(300);
  await page.screenshot({path:'40_hitster_phone_place.png', fullPage:true});
  // Handy: Auflösung
  await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    $('pvHitPanel').style.display='none'; $('pvHitRevealPanel').style.display='block';
    $('pvHitYear').textContent='1991'; $('pvHitTitle').textContent='Smells Like Teen Spirit'; $('pvHitArtist').textContent='Nirvana';
    $('pvHitResult').innerHTML='<span style="color:var(--gold); font-weight:600;">Richtig!</span> Die Karte ist in deiner Zeitleiste.';
    const cards=[{y:1965,t:'Satisfaction',a:'The Rolling Stones'},{y:1981,t:'Under Pressure',a:'Queen & David Bowie'},{y:1991,t:'Smells Like Teen Spirit',a:'Nirvana',n:1},{y:1994,t:'Zombie',a:'The Cranberries'},{y:2009,t:'Poker Face',a:'Lady Gaga'}];
    $('pvTimelineAfter').innerHTML=cards.map(c=>'<div class="tl-card'+(c.n?' new':'')+'" style="margin-bottom:6px;"><span class="y">'+c.y+'</span><span class="m"><b>'+c.t+'</b><br>'+c.a+'</span></div>').join('');
    $('pvHitScoreList').innerHTML='<div class="mp-player me"><span style="color:var(--slate);width:18px;">1</span><span class="nm">Anna</span><span style="font-weight:600;color:var(--gold);">5</span></div><div class="mp-player"><span style="color:var(--slate);width:18px;">2</span><span class="nm">Ben</span><span style="font-weight:600;">3</span></div>';
  });
  await sleep(200);
  await page.screenshot({path:'41_hitster_phone_reveal.png', fullPage:true});
  await page.close();
  // Host: Setup mit Modus Hitster + Jahr-Leiste
  page = await newPage(FILE);
  await page.evaluate(()=>{
    document.querySelector('#modeChips .pick-chip[data-mode="hitster"]').click();
  });
  await sleep(200);
  const el = await page.$('#mpHostPanel'); 
  await page.evaluate(()=>document.getElementById('modeChips').scrollIntoView());
  const modeEl = await page.$('#modeChips'); 
  await page.screenshot({path:'42_host_mode.png', clip:{x:0,y:0,width:390,height:300}});
  await browser.close(); console.log('ok');
})().catch(e=>{console.error('ERR', e.stack.slice(0,400)); process.exit(1)});
