import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { launchBrowser } from './browser.mjs';

test('casting profiles confirm saves, reject private links, preserve failed settings and isolate accounts', async () => {
  const root = new URL('../', import.meta.url).pathname;
  const bundle = await build({
    stdin: { resolveDir: root, loader: 'jsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { Provider } from 'react-redux';
      import { configureStore } from '@reduxjs/toolkit';
      import settings from './src/redux/features/userSettings/userSettingsSlice';
      import CastingConnections from './src/components/Shared/CastingConnections';
      window.calls = [];
      window.patch = async (url, payload) => {
        window.calls.push(payload);
        if (window.fail) throw new Error('404');
        if (window.defer) await new Promise(resolve => window.resolveSave = resolve);
        return { data: { data: { data: payload.data } } };
      };
      window.store = configureStore({reducer: {userSettings: settings,
        auth: (state = {user:{id:1}}, action) => action.type === 'switch' ? {user:{id:2}} : state},
        preloadedState: {userSettings:{data:{},loaded:true,loading:false}}});
      createRoot(document.getElementById('root')).render(<Provider store={window.store}><CastingConnections /></Provider>);
    ` },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', loader: {'.css':'empty'},
    plugins: [{ name: 'services', setup(b) {
      b.onResolve({filter: /(?:redux\/http|\.\.\/\.\.\/http)$/}, () => ({path:'http',namespace:'mock'}));
      b.onResolve({filter: /\/constant$/}, () => ({path:'constant',namespace:'mock'}));
      b.onResolve({filter: /usePushNotifications$/}, () => ({path:'push',namespace:'mock'}));
      b.onResolve({filter: /openExternal$/}, () => ({path:'external',namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'}, ({path}) => ({contents: {
        http: 'export default {patch:(...args)=>window.patch(...args),get:async()=>({data:{data:{data:{}}}})};',
        constant: 'export const baseURL="";',
        push: 'export const usePushNotifications=()=>({supported:true,subscribe:()=>window.pushClicked=true}); export const openNotificationSettings=()=>{};',
        external: 'export const openExternal=async url=>{window.opened=url;return true;};',
      }[path]}));
    }}],
  });
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({width:390,height:844});
    await page.setContent('<div id="root"></div>');
    await page.addStyleTag({content:readFileSync(new URL('../src/components/Shared/CastingConnections.css',import.meta.url),'utf8')});
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.waitForSelector('#actors_access_profile_url');
    const fill = async value => page.$eval('#actors_access_profile_url', (el, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);
      el.dispatchEvent(new Event('input',{bubbles:true}));
    }, value);
    const save = () => page.click('.casting-provider button[type=submit]');
    await page.click('summary');
    assert.match(await page.$eval('details',el=>el.innerText), /CMail/);
    await fill('https://actorsaccess.com/comcenter/'); await save();
    await page.waitForFunction(()=>document.querySelector('[role=alert]').textContent.includes('Inbox'));
    assert.equal(await page.evaluate(()=>calls.length),0);
    await fill('resumes.actorsaccess.com/alex');
    await page.evaluate(()=>window.fail=true); await save();
    await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('Could not save'));
    assert.equal(await page.evaluate(()=>store.getState().userSettings.data.actors_access_profile_url),undefined);
    await page.evaluate(()=>window.fail=false); await save();
    await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('Saved'));
    assert.equal(await page.evaluate(()=>store.getState().userSettings.data.actors_access_profile_url),'https://resumes.actorsaccess.com/alex');
    await page.evaluate(()=>window.fail=true);
    await page.click('[role=switch]');
    await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('Could not save'));
    assert.equal(await page.$eval('[role=switch]',el=>el.checked),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=390),true);
    await fill('resumes.actorsaccess.com/another');
    await page.evaluate(()=>{window.fail=false;window.defer=true;}); await save();
    await page.waitForFunction(()=>!!window.resolveSave);
    await page.evaluate(()=>{
      store.dispatch({type:'userSettings/resetSettings'});
      store.dispatch({type:'switch'});
      window.resolveSave();
    });
    await page.waitForFunction(()=>document.querySelector('#actors_access_profile_url').value==='');
    assert.equal(await page.evaluate(()=>store.getState().userSettings.data.actors_access_profile_url),undefined);
  } finally { await browser.close(); }
});
