import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

let browser, bundle, css;
before(async () => {
  const mocks = {
    'react-redux': 'export const useSelector = f => f(window.state);',
    '@capacitor/core': 'export const Capacitor = { isNativePlatform: () => window.platform !== "web", getPlatform: () => window.platform };',
    '@capacitor/app': 'export const App = { getInfo: async () => { if(window.versionError) throw Error("missing"); return {version: window.installed}; }, addListener: async (name, cb) => { window.resume=cb; return {remove(){}}; } };',
    'http': 'export default {get: async url => ({data: url.includes("latest-version") ? {ios:window.latest,android:window.latest} : {announcement:window.announcement}})};',
    'openExternal': 'export async function openExternal() { window.opens++; if(window.openFails) throw Error("blocked"); return true; }',
    'analytics': 'export function trackEvent(event, properties) { window.events.push({event,properties}); }',
  };
  const out = await build({
    stdin: { resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'jsx', contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import UpdateBanner from './src/components/UpdateBanner.jsx';
      import AnnouncementBanner from './src/components/AnnouncementBanner.jsx';
      const root=createRoot(document.getElementById('root'));
      window.render = kind => root.render(kind === 'update' ? <UpdateBanner/> : <AnnouncementBanner/>);
    ` }, outfile: 'test.js', bundle: true, write: false, jsx: 'automatic',
    plugins: [{name:'mocks',setup(b) {
      b.onResolve({filter:/.*/},({path})=> {const key=Object.keys(mocks).find(k=>path===k || path.endsWith('/'+k)); if(key)return {path:key,namespace:'mock'};});
      b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:mocks[path],loader:'js'}));
    }}],
  });
  bundle=out.outputFiles.find(f=>f.path.endsWith('.js')).text;
  css=out.outputFiles.find(f=>f.path.endsWith('.css')).text;
  browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,pipe:true});
});
after(async()=>{await browser?.close();});
async function mount(kind, overrides={}, width=390) {
  const page=await browser.newPage();
  await page.setViewport({width,height:844});
  await page.setRequestInterception(true);
  page.on('request',r=>r.respond({status:200,contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://banner.test');
  await page.evaluate(options=>{
    localStorage.clear(); sessionStorage.clear();
    Object.assign(window,{platform:'ios',installed:'1.0.26',latest:'1.0.27',events:[],opens:0,openFails:false,
      state:{auth:{user:{id:1}},userSettings:{data:{}}},announcement:{id:10,title:'Your next great take',body:'Upload a self-tape and get notes to practice with.',cta_label:'Review my tape',cta_url:'tape-review'},...options});
  },overrides);
  await page.addStyleTag({content:css}); await page.addScriptTag({content:bundle});
  await page.evaluate(k=>window.render(k),kind);
  return page;
}
test('unknown or current installed version never shows an update',async()=>{
  for(const overrides of [{versionError:true},{installed:'1.0.27'},{platform:'web'}]) {
    const p=await mount('update',overrides);
    await p.evaluate(()=>new Promise(r=>setTimeout(r,100)));
    assert.equal(await p.$('.dst-banner'),null);await p.close();
  }
});
test('failed store launch stays retryable; successful launch also resets button',async()=>{
  const p=await mount('update',{openFails:true});await p.waitForSelector('button');
  await p.click('button');await p.waitForSelector('[role=alert]');
  assert.equal(await p.$eval('button',e=>e.disabled),false);
  await p.evaluate(()=>window.openFails=false);await p.click('button');
  await p.waitForFunction(()=>window.opens===2 && !document.querySelector('button').disabled);
  await p.click('.dst-banner__secondary');
  await p.waitForFunction(()=>!document.querySelector('.dst-banner'));
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('dst_update_snooze_v2')).version),'1.0.27');
  await p.close();
});
test('Android copy names Google Play and layout fits a small screen',async()=>{
  const p=await mount('update',{platform:'android'},320);await p.waitForSelector('button');
  assert.match(await p.$eval('.dst-banner',e=>e.textContent),/Google Play/);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await p.$$eval('button',es=>es.every(e=>e.getBoundingClientRect().height>=44)),true);
  await p.screenshot({path:'/private/tmp/dst-update-banner.png'});await p.close();
});
test('announcement tracks visible impression, navigation, dismissal and scopes it by account',async()=>{
  const p=await mount('announcement');await p.waitForSelector('button');
  await p.waitForFunction(()=>window.events.some(e=>e.event==='announcement_banner_viewed'));
  await p.click('button');await p.waitForFunction(()=>!document.querySelector('.dst-banner'));
  assert.equal(await p.evaluate(()=>JSON.parse(sessionStorage.getItem('dst_banner_action')).userId),1);
  await p.evaluate(()=>{window.state.auth.user.id=2;window.render('announcement');});
  await p.waitForSelector('.dst-banner');
  await p.screenshot({path:'/private/tmp/dst-announcement-banner.png'});await p.close();
});
test('expired announcement disappears while app stays open',async()=>{
  const p=await mount('announcement',{announcement:{id:11,title:'Ending soon',body:'Limited time',ends_at:new Date(Date.now()+2500).toISOString()}});
  await p.waitForSelector('.dst-banner');
  await p.waitForFunction(()=>!document.querySelector('.dst-banner'),{timeout:6000});await p.close();
});
