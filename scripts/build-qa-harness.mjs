// Real UI, local account fixtures, no production services. Shared by axe and Maestro.
import { build } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startHarness } from '../tests/first-review-sample-harness.mjs';

export const qaDir = fileURLToPath(new URL('../output/qa/harness/', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));
export async function buildQaHarness() {
  await mkdir(qaDir, { recursive: true });
  const harness = await startHarness();
  try {
    const script = await fetch(`${harness.url}/bundle.js`).then(r => r.text());
    await writeFile(path.join(qaDir, 'onboarding.js'), script);
  } finally { await harness.close(); }
  const result = await build({stdin:{resolveDir:root,loader:'jsx',contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';
    import CommunicationPreferences from './src/components/CommunicationPreferences.jsx';
    createRoot(document.getElementById('root')).render(<CommunicationPreferences/>);
  `},bundle:true,write:false,outfile:'preferences.js',jsx:'automatic',plugins:[{name:'offline-account',setup(b){
    b.onResolve({filter:/redux\/http$/},()=>({path:'offline-http',namespace:'fixture'}));
    b.onResolve({filter:/\/analytics$/},()=>({path:'analytics',namespace:'qa-mock'}));
    b.onResolve({filter:/\/openExternal$/},()=>({path:'external',namespace:'qa-mock'}));
    b.onLoad({filter:/.*/,namespace:'qa-mock'},({path:p})=>({contents:p==='analytics'?'export function trackEvent(){}':'export async function openExternal(){return false;}'}));
    b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`
      const defaults={campaign_push:true,campaign_email:false,timezone:'America/Los_Angeles',quiet_start:20,quiet_end:9};
      export default {get:async()=>({data:JSON.parse(localStorage.getItem('dst_qa_preferences')||'null')||defaults}),
      patch:async(_url,value)=>{localStorage.setItem('dst_qa_preferences',JSON.stringify(value));return {data:value};},
      post:async()=>{throw Error('Network operations are disabled in DST QA');}};
    `}));
  }}]});
  for(const f of result.outputFiles) await writeFile(path.join(qaDir,path.basename(f.path)),f.contents);
  // Production stylesheet, not an approximation of the UI. Build the app first.
  const assets=path.join(root,'dist/assets');
  const css=await Promise.all((await readdir(assets)).filter(f=>f.endsWith('.css')).map(f=>readFile(path.join(assets,f),'utf8')));
  if(!css.length) throw Error('Run the production-configured build before building QA assets');
  await writeFile(path.join(qaDir,'app.css'),css.join('\n'));
  const html=(title,body,scripts='')=>`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:"><title>DST QA - ${title}</title><link rel="stylesheet" href="app.css"><link rel="stylesheet" href="preferences.css"><style>body{margin:0;background:#f7f4ed;color:#28251f;font-family:Arial} .qa-shell{padding:calc(env(safe-area-inset-top,0px) + 24px) 20px 24px;max-width:640px;margin:auto}.qa-shell h1{font:28px Georgia}.qa-link{display:block;margin:16px 0;padding:16px;border:1px solid #856122;border-radius:12px;color:#624719;background:#fffdf8}.qa-note{font-size:13px;line-height:1.5;color:#625849}</style></head><body>${body}${scripts}</body></html>`;
  await writeFile(path.join(qaDir,'index.html'),html('Offline pilot',`<main class="qa-shell"><h1>DST QA</h1><p class="qa-note">Real components. Fictional account. No production requests.</p><a class="qa-link" href="onboarding.html">Open onboarding</a><a class="qa-link" href="preferences.html">Notification preferences</a></main>`));
  await writeFile(path.join(qaDir,'onboarding.html'),html('Onboarding','<main id="root"></main>','<script src="onboarding.js"></script>'));
  await writeFile(path.join(qaDir,'preferences.html'),html('Notification preferences','<main class="qa-shell"><h1>Notification preferences</h1><p class="qa-note">Saved only to this test device.</p><div id="root"></div><a class="qa-link" href="index.html">QA home</a></main>','<script src="preferences.js"></script>'));
  return qaDir;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) console.log(await buildQaHarness());
