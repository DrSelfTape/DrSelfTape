import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {launchBrowser} from './browser.mjs';
import {buildQaHarness,qaDir} from '../scripts/build-qa-harness.mjs';

const require=createRequire(import.meta.url);
let browser,axe;
before(async()=>{await buildQaHarness();axe=await readFile(require.resolve('axe-core/axe.min.js'),'utf8');browser=await launchBrowser();});
after(async()=>{await browser?.close();});
async function pageAt(file,width=390){
  const page=await browser.newPage();await page.setViewport({width,height:844});
  await page.setRequestInterception(true);
  page.on('request',async r=>{
    const u=new URL(r.url());
    if(u.origin!=='https://dst-qa.test') {await r.abort();return;}
    const name=u.pathname==='/'?'index.html':u.pathname.slice(1);
    if(name.includes('..')){await r.abort();return;}
    try {const body=await readFile(path.join(qaDir,name));await r.respond({status:200,contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html',body});}
    catch {await r.respond({status:404,body:''});}
  });
  await page.goto(`https://dst-qa.test/${file}`);return page;
}
async function audit(page,name){
  // Scan the settled screen, not transient low opacity during the reveal animation.
  await page.evaluate(async()=>{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));
  });
  await page.addScriptTag({content:axe});
  const results=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
  const dir=new URL('../output/qa/accessibility/',import.meta.url);await mkdir(dir,{recursive:true});
  await writeFile(new URL(`${name}.json`,dir),JSON.stringify(results,null,2));
  const violations=results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
  assert.deepEqual(violations,[],`${name}: accessibility issues; see output/qa/accessibility/${name}.json`);
}
test('notification preferences: labels, contrast, and saved status on phone',async()=>{
  const p=await pageAt('preferences.html');try{
    await p.waitForSelector('input[type=checkbox]');await audit(p,'preferences-phone');
    await p.click('input[type=checkbox]');await p.click('.comms-preferences button');
    await p.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('saved'));
    await audit(p,'preferences-saved');
  }finally{await p.close();}
});
test('notification preferences: desktop layout',async()=>{
  const p=await pageAt('preferences.html',1280);try{await p.waitForSelector('input');await audit(p,'preferences-desktop');}finally{await p.close();}
});
test('onboarding offer and sample: automated WCAG checks',async()=>{
  const p=await pageAt('onboarding.html');try{
    await p.waitForFunction(()=>document.body.textContent.includes('Get my free review'));
    await audit(p,'onboarding-offer');
    await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='See what a review looks like').click());
    await p.waitForSelector('[role=dialog]');await audit(p,'sample-review');
  }finally{await p.close();}
});
