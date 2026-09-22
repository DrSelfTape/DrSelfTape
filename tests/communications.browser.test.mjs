import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

let browser, bundle, css;
before(async () => {
  const mocks = {
    http: `export default {
      get: async url => ({data: url.includes('preferences') ? {campaign_push:true,campaign_email:false,timezone:'America/Los_Angeles',quiet_start:20,quiet_end:9} : {campaigns:window.campaigns}}),
      post: async (url,body) => { window.requests.push({url,body});
        if(window.fail) throw {response:{data:{detail:'Could not save. Please retry.'}}};
        if(url.endsWith('/preview/')) return {data:{unique_reach:128,audience:128,channels:{inbox:128,banner:128},exclusions:{},preview_token:'signed-preview',policy:'One contact per day. Quiet hours respected.'}};
        if(url.endsWith('/schedule/')) {window.scheduled++;return {data:{}};}
        const row={...body,id:'campaign-one',status:'draft',delivery_counts:[]}; window.campaigns=[row]; return {data:row}; },
      put: async (url,body) => {window.requests.push({url,body});return {data:{...body,id:'campaign-one'}};},
      patch: async (url,body) => {window.requests.push({url,body}); if(window.fail) throw Error('offline'); return {data:body};}
    };`,
    analytics: 'export function trackEvent(){}',
    openExternal: 'export async function openExternal(url){window.external=url;return true;}',
  };
  const output = await build({ stdin: { resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'jsx', contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import AdminCommunications from './src/panels/Admin/AdminCommunications.jsx';
    import CommunicationPreferences from './src/components/CommunicationPreferences.jsx';
    import {openCampaign,takeCampaignNavigation} from './src/utils/communications.js';
    const root=createRoot(document.getElementById('root')); window.openCampaign=openCampaign; window.takeCampaignNavigation=takeCampaignNavigation;
    window.render=kind=>root.render(kind==='preferences'?<CommunicationPreferences/>:<AdminCommunications/>);
  ` }, outfile: 'comms.js', bundle: true, write: false, jsx: 'automatic', plugins: [{name:'mocks',setup(b){
    b.onResolve({filter:/.*/},({path})=> {const key=Object.keys(mocks).find(k=>path===k||path.endsWith('/'+k)); if(key)return {path:key,namespace:'mock'};});
    b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:mocks[path],loader:'js'}));
  }}] });
  bundle=output.outputFiles.find(f=>f.path.endsWith('.js')).text;
  css=output.outputFiles.find(f=>f.path.endsWith('.css')).text;
  browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,pipe:true});
});
after(async()=>{await browser?.close();});
async function mount(kind='admin',width=1280){
  const p=await browser.newPage(); await p.setViewport({width,height:1000});
  await p.setRequestInterception(true); p.on('request',r=>r.respond({status:200,contentType:'text/html',body:'<style>body{margin:0;padding:16px;background:#24211d;font-family:Arial}button,input,select,textarea{font:inherit}</style><div id="root"></div>'}));
  await p.goto('https://communications.test');
  await p.evaluate(()=>Object.assign(window,{requests:[],campaigns:[],scheduled:0,fail:false}));
  await p.addStyleTag({content:css});await p.addScriptTag({content:bundle});await p.evaluate(k=>window.render(k),kind);
  await p.waitForSelector(kind==='admin'?'form':'input');return p;
}
async function clickText(p,text){
  await p.evaluate(text=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===text);if(!b)throw Error('Missing button '+text);b.click();},text);
}
async function compose(p){
  await p.type('input[maxlength="120"]','Your next great take starts here');
  await p.type('textarea','Bring your next audition to life. Upload a self-tape and get specific notes you can use before your callback.');
  await p.type('input[maxlength="40"]','Review my tape');
  await p.type('input[maxlength="400"]','tape-review');
}
test('draft and audience preview never send; only explicit queue schedules',async()=>{
  const p=await mount();await compose(p);await clickText(p,'Preview audience');
  await p.waitForFunction(()=>document.body.textContent.includes('128'));
  assert.equal(await p.evaluate(()=>window.scheduled),0);
  await p.addStyleTag({content:'body::before{content:"DESIGN PREVIEW · SAMPLE DATA";display:block;color:#e4d4b4;font-size:11px;letter-spacing:2px;padding:4px 20px 16px}'});
  await p.screenshot({path:'/private/tmp/dst-communications-preview.png',fullPage:true});
  await clickText(p,'Queue this campaign now');await p.waitForFunction(()=>window.scheduled===1);
  assert.equal(await p.evaluate(()=>window.requests.find(r=>r.url.endsWith('/schedule/')).body.preview_token),'signed-preview');
  await p.close();
});
test('editing copy invalidates audience confirmation; failed save stays retryable',async()=>{
  const p=await mount();await compose(p);await clickText(p,'Preview audience');await p.waitForFunction(()=>document.body.textContent.includes('Queue this campaign now'));
  await p.type('textarea',' A new sentence.');assert.equal(await p.evaluate(()=>document.body.textContent.includes('Queue this campaign now')),false);
  await p.evaluate(()=>window.fail=true);await clickText(p,'New campaign');await compose(p);await clickText(p,'Save draft');
  await p.waitForFunction(()=>document.body.textContent.includes('Could not save'));
  assert.equal(await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Save draft').disabled),false);
  assert.equal(await p.evaluate(()=>window.scheduled),0);await p.close();
});
test('preferences save only after explicit action and fit a small phone',async()=>{
  const p=await mount('preferences',360);
  assert.equal(await p.evaluate(()=>window.requests.length),0);
  await p.click('input[type=checkbox]');await clickText(p,'Save preferences');
  await p.waitForFunction(()=>document.body.textContent.includes('Your preferences are saved.'));
  assert.equal(await p.evaluate(()=>window.requests[0].body.campaign_push),false);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await p.screenshot({path:'/private/tmp/dst-communications-preferences.png',fullPage:true});await p.close();
});
test('campaign action goes to the actual review route and rejects unsafe URLs',async()=>{
  const p=await mount();
  const result=await p.evaluate(async()=>{
    const safe=await window.openCampaign({campaign_id:'campaign-one',cta_url:'tape-review'},'inbox',p=>window.destination=p);
    const unsafe=await window.openCampaign({campaign_id:'campaign-one',cta_url:'javascript:alert(1)'});
    return {safe,unsafe,destination:window.destination};
  });
  assert.deepEqual(result,{safe:true,unsafe:false,destination:'/dashboard/jericho?tab=tape'});await p.close();
});
test('composer fits a phone without horizontal overflow',async()=>{
  const p=await mount('admin',390);await compose(p);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.close();
});

test('cold-start campaign navigation is consumed once and belongs to its recipient',async()=>{
  const p=await mount();
  const result=await p.evaluate(async()=>{
    const data={campaign_id:'campaign-one',cta_url:'tape-review',recipient_id:42};
    await window.openCampaign(data,'ios');
    const own=window.takeCampaignNavigation(42);
    const twice=window.takeCampaignNavigation(42);
    await window.openCampaign(data,'ios');
    const wrong=window.takeCampaignNavigation(43);
    return {own,twice,wrong};
  });
  assert.deepEqual(result,{own:{tab:'tape-review',campaign_id:'campaign-one'},twice:null,wrong:null});await p.close();
});
