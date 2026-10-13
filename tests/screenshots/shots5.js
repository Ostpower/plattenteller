const chromium = require('@sparticuz/chromium').default;
const puppeteer = require('puppeteer-core');
const FILE = 'file://' + require('path').resolve(__dirname, '..', '..', 'index.html');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser = await puppeteer.launch({ args:[...chromium.args,'--no-sandbox','--allow-file-access-from-files'], executablePath: await chromium.executablePath(), headless:'shell' });
  async function newPage(url){
    const page = await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2});
    await page.setRequestInterception(true);
    page.on('request', r => { const u=r.url(); if(u.startsWith('file:')||u.startsWith('data:')) r.continue(); else r.abort(); });
    page.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0,200)));
    await page.evaluateOnNewDocument(()=>localStorage.setItem('plattenteller_gate_unlocked','yes'));
    await page.goto(url,{waitUntil:'load'}); await sleep(300); return page;
  }
  let page = await newPage(FILE + '?join=GA4H');
  await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    $('pvJoinPanel').style.display='none'; $('pvQuizPanel').style.display='block';
    $('pvQuizNo').textContent='4'; $('pvQuizTotal').textContent='12'; $('pvQuizEq').classList.add('spin');
    $('pvQuizQ').textContent='Welche Band / welcher Interpret ist das?';
    $('pvQuizHint').textContent='Antwort eingecheckt ✓ — du kannst sie noch ändern, bis der Countdown abläuft.';
    const opts=['Nirvana','Oasis','The Killers','Coldplay'];
    $('pvQuizAnswers').innerHTML=opts.map((o,i)=>'<button class="qz-btn'+(i===1?' sel':'')+'" data-choice="'+i+'"><span class="k">'+'ABCD'[i]+'</span><span>'+o+'</span></button>').join('');
    $('pvQuizCountdown').textContent='Noch 7 s'; $('pvQuizScore').textContent='5';
  });
  await sleep(300);
  await page.screenshot({path:'50_quiz_phone.png', fullPage:true});
  await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    $('pvQuizPanel').style.display='none'; $('pvQuizRevealPanel').style.display='block';
    $('pvQuizResult').innerHTML='<span style="color:var(--gold);">Richtig!</span> +2 Punkte (schnellste richtige Antwort)';
    const opts=['Nirvana','Oasis','The Killers','Coldplay'];
    $('pvQuizAfter').innerHTML=opts.map((o,i)=>'<div class="qz-btn'+(i===1?' good':(i===3?' bad':''))+'"><span class="k">'+'ABCD'[i]+'</span><span>'+o+'</span></div>').join('');
    $('pvQuizTitle').textContent='Wonderwall'; $('pvQuizArtist').textContent='Oasis · 1995';
    $('pvQuizScoreList').innerHTML='<div class="mp-player me"><span style="color:var(--slate);width:18px;">1</span><span class="nm">Anna</span><span style="font-weight:600;color:var(--gold);">7</span></div><div class="mp-player"><span style="color:var(--slate);width:18px;">2</span><span class="nm">Ben</span><span style="font-weight:600;">5</span></div>';
  });
  await sleep(200);
  await page.screenshot({path:'51_quiz_phone_reveal.png', fullPage:true});
  await page.close();
  page = await newPage(FILE);
  await page.evaluate(()=>{ document.querySelector('#modeChips .pick-chip[data-mode="quiz"]').click(); document.getElementById('modeChips').scrollIntoView(); });
  await sleep(300);
  await page.screenshot({path:'52_quiz_setup.png'});
  await browser.close(); console.log('ok');
})().catch(e=>{console.error('ERR', e.stack.slice(0,400)); process.exit(1)});
