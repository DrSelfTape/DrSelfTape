// Real consent UI and broker, synthetic Redux/network. No remote requests.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function startConsentHarness(port = 0) {
  const bundle = await build({
    stdin: { resolveDir: root, loader: 'jsx', contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import {Provider} from 'react-redux'; import {configureStore} from '@reduxjs/toolkit';
      import Modal from './src/components/AIConsent/AIConsentModal.jsx';
      import Settings from './src/components/AIConsent/AIConsentSettings.jsx';
      import {requestAiConsent} from './src/components/AIConsent/consentRequest.js';
      import {SessionCard} from './src/panels/Dashboard/MyStudio/index.jsx';
      import Notice from './src/components/Shared/AIServiceNotice.jsx';
      import {MemoryRouter,Routes,Route} from 'react-router-dom';
      import PublicRoutes from './src/routes/PublicRoutes.jsx';
      import {holdAgeGate} from './src/components/AgeGate/ageGateHold.js';
      window.__calls=[]; window.__answers=[]; window.__fail=false; window.__hold=false;
      const store=configureStore({reducer:{_persist:()=>({rehydrated:true}),auth:(s={user:{id:42}},a)=>a.type==='consent'?{user:{...s.user,ai_consent_accepted_at:a.payload}}:a.type==='switch'?{user:a.payload}:s}});
      window.__store=store;
      window.__open=(force=false)=>requestAiConsent({force}).then(a=>window.__answers.push(a));
      const booking={id:1,service_name:'Fictional studio session',session_date:'2026-10-03T12:00:00Z',tapes:[{id:1}],delivery_path:'/fictional-delivery'};
      createRoot(document.getElementById('root')).render(<Provider store={store}>
        <aside aria-label="QA controls"><h1>Isolated DST reliability QA — fictional data</h1>
          <button onClick={()=>window.__open()}>Open consent</button>
          <button onClick={()=>{window.__open();window.__open();}}>Open twice</button>
          <button onClick={()=>window.__open(true)}>Server requires consent</button>
          <button onClick={()=>store.dispatch({type:'switch',payload:{id:99}})}>Switch account</button>
        </aside>
        {location.search.includes('apple-flow') ? <MemoryRouter initialEntries={['/login']}><Routes>
          <Route element={<PublicRoutes/>}><Route path="/login" element={<section aria-label="Apple birthday capture">
            <button onClick={()=>{window.__releaseAge=holdAgeGate();store.dispatch({type:'switch',payload:{id:42,role:'actor',token:'fictional-token'}});}}>Begin Apple birthday step</button>
            <button onClick={()=>window.__releaseAge?.()}>Finish birthday step</button><Settings/>
          </section>}/></Route>
          <Route path="/dashboard" element={<section aria-label="Actor profile"><Settings/></section>}/>
        </Routes></MemoryRouter> : <Settings/>}<Modal/>

        <section aria-label="Tape without notes"><SessionCard booking={booking}/></section>
        <section aria-label="Tape with notes"><SessionCard booking={{...booking,delivery_has_notes:true}}/></section>
        <Notice degraded={true}/>
      </Provider>);` },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    loader: {'.css':'empty'}, define: {'import.meta.env': JSON.stringify({DEV:true})},
    plugins:[{name:'fictional-services',setup(b){
      b.onResolve({filter:/\/(http|authSlice|openExternal|RoleSelectionModal)$/},({path})=>({path:path.split('/').at(-1),namespace:'fixture'}));
      b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents: path==='http' ? `
        async function call(method) { window.__calls.push(method); if(window.__hold) await new Promise(r=>window.__release=r); if(window.__fail) throw new Error('offline'); return {data:{data:{ai_consent_accepted_at:method==='DELETE'?null:'2026-10-02T00:00:00Z'}}}; }
        export const setAuthToken=()=>{}; export default {post:()=>call('POST'),delete:()=>call('DELETE')};`
        :path==='RoleSelectionModal'?`export const RoleSelectionModal=()=>null;`
        :path==='authSlice'?`export const setAiConsentAcceptedAt=payload=>({type:'consent',payload});`
        :`export const openExternal=()=>{};`}));
    }}],
  });
  let css='';
  try { for(const file of await readdir(root+'dist/assets')) if(/^index-.*\.css$/.test(file)) css+=await readFile(root+'dist/assets/'+file,'utf8'); } catch { /* Unit-only use can omit the built theme. */ }
  const server=createServer((req,res)=>{
    res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:");
    if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}
    else if(req.url==='/theme.css'){res.setHeader('Content-Type','text/css');res.end(css);}
    else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated DST reliability QA</title><link rel="stylesheet" href="/theme.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();})};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) console.log((await startConsentHarness(5175)).url);
