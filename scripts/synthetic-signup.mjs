// Real browser signup monitor. No bypass of validation, auth, or account deletion.
import {randomBytes, randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile, unlink} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const REG='/v1/users/personal-info-registration/';
const EMAIL=/^synthetic-[a-f0-9]{32}@synthetic\.drselftapes\.invalid$/;
const MAX_WAIT=30000;
export function config(env=process.env) {
  const web=new URL(env.DST_SYNTHETIC_WEB_URL || 'https://drselftape.app');
  const api=new URL(env.DST_SYNTHETIC_API_URL || 'https://drselftape-api-production.up.railway.app/api');
  for(const u of [web,api]) {
    if(u.username || u.password || u.search || u.hash) throw new Error('Use URLs without credentials, query, or fragment');
    if(u.protocol!=='https:' && !(u.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname))) throw new Error('HTTPS required except on localhost');
  }
  return {web:web.origin,api:api.href.replace(/\/$/,''),
    output:path.resolve(env.DST_SYNTHETIC_OUTPUT || 'output/synthetic-signup'),
    chrome:env.DST_SYNTHETIC_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'};
}

async function apiRequest(cfg, endpoint, {method='GET',token,body}={}) {
  const response=await fetch(cfg.api+endpoint,{method,redirect:'error',signal:AbortSignal.timeout(MAX_WAIT),
    headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  let json; try {json=await response.json();} catch {throw new Error(`Non-JSON response at ${endpoint} (${response.status})`);}
  return {response,json};
}
function success(r, stage) {
  if(!r.response.ok || r.json.success!==true) throw new Error(`${stage} failed (HTTP ${r.response.status})`);
  return r.json.data;
}
export function identity(data,email) {
  const user=data?.login_data || data;
  if(!EMAIL.test(email) || user?.email?.toLowerCase()!==email || user?.id==null) throw new Error('Synthetic account identity mismatch');
  return user;
}
function tokenOf(user) {
  const token=user?.token?.access || user?.token;
  if(typeof token!=='string' || !token) throw new Error('Signup/login returned no access token');
  return token;
}

export async function cleanup(cfg,journal,request=apiRequest) {
  if(!EMAIL.test(journal.email) || journal.api!==cfg.api || typeof journal.password!=='string') throw new Error('Refusing cleanup of an unrecognized identity or API');
  const login=await request(cfg,'/v1/users/login/',{method:'POST',body:{email:journal.email,password:journal.password}});
  const user=identity(success(login,'Cleanup login'),journal.email);
  const token=tokenOf(user);
  const profile=identity(success(await request(cfg,'/v1/users/profile/',{token}),'Cleanup identity check'),journal.email);
  if(String(profile.id)!==String(user.id)) throw new Error('Refusing cleanup: account IDs differ');
  success(await request(cfg,'/v1/users/account/',{method:'DELETE',token,
    body:{confirm_email:journal.email,current_password:journal.password}}),'Account deletion');
  const check=await request(cfg,'/v1/users/profile/',{token});
  if(![401,403].includes(check.response.status)) throw new Error('Deletion not confirmed: old token still resolves or server unavailable');
}

export async function run(cfg,{preflight=false,cleanupOnly=false}={}) {
  await mkdir(cfg.output,{recursive:true,mode:0o700});
  const journalPath=path.join(cfg.output,'pending-account.json');
  const lock=path.join(cfg.output,'running.lock');
  const result={check:'email-signup',mode:cleanupOnly?'cleanup':preflight?'preflight':'full',
    started_at:new Date().toISOString(),status:'FAIL',stage:'lock',steps:[],cleanup:'not_needed',
    coverage:'Web email signup only; no Apple login, native UI, email delivery, AI review, or purchase'};
  let browser,locked=false,journal,submitted=false;
  const step=(name)=>{result.stage=name;result.steps.push({name,at:new Date().toISOString()});};
  try {
    await writeFile(lock,JSON.stringify({pid:process.pid,started_at:result.started_at}),{flag:'wx',mode:0o600});locked=true;
    let pending=null;
    try {pending=JSON.parse(await readFile(journalPath,'utf8'));} catch(e) {if(e.code!=='ENOENT')throw e;}
    if(cleanupOnly) {
      if(!pending)throw new Error('No pending account to clean up');
      step('recover_pending_account');await cleanup(cfg,pending);await unlink(journalPath);
      result.cleanup='deleted';result.status='PASS';return result;
    }
    if(pending)throw new Error('Pending account exists; run --cleanup before another signup');
    if(!preflight) {
      step('backend_protections');
      const cap=await apiRequest(cfg,REG);
      if(!cap.response.ok || cap.json.synthetic_signup_version!==1 || cap.json.reserved_email_domain!=='synthetic.drselftapes.invalid') {
        result.status='BLOCKED';throw new Error('Deploy backend synthetic-signup protections before a full check');
      }
    }
    step('open_signup');
    const {default:puppeteer}=await import('puppeteer-core');
    browser=await puppeteer.launch({executablePath:cfg.chrome,headless:true});
    const page=await browser.newPage();
    await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
    page.setDefaultTimeout(MAX_WAIT);
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    const errors=[];page.on('pageerror',()=>errors.push('browser_runtime_error'));
    await page.setRequestInterception(true);
    let registrationCount=0;
    page.on('request',req=>{
      const url=new URL(req.url());
      const registration=url.href===cfg.api+REG && req.method()==='POST';
      if(registration) {
        registrationCount++;
        if(preflight || registrationCount>1)return req.abort();
        let body;try {body=JSON.parse(req.postData());}catch{return req.abort();}
        if(body.email!==journal?.email)return req.abort();
        submitted=true;return req.continue();
      }
      // Avoid third-party telemetry, provider calls, and any unrelated mutation.
      const own=url.origin===cfg.web || url.origin===new URL(cfg.api).origin;
      if(!own && !['data:','blob:'].includes(url.protocol))return req.abort();
      if(/\/analytics\/|\/capture\/?|\/batch\/?/.test(url.pathname))return req.abort();
      if(!['GET','HEAD','OPTIONS'].includes(req.method()))return req.abort();
      return req.continue();
    });
    const navigation=await page.goto(cfg.web+'/signup',{waitUntil:'domcontentloaded'});
    if(!navigation?.ok())throw new Error('Signup page did not return success');
    await page.waitForSelector('input[name="email"]',{visible:true});
    if(new URL(page.url()).origin!==cfg.web)throw new Error('Unexpected signup redirect');
    step('fill_form');
    const email=`synthetic-${randomUUID().replaceAll('-','')}@synthetic.drselftapes.invalid`;
    const password=`Dst!9${randomBytes(18).toString('hex')}`;
    for(const [name,value] of [['firstName','Synthetic Check'],['email',email],['password',password]]) await page.type(`input[name="${name}"]`,value);
    await page.$eval('input[name="dateOfBirth"]',el=>{
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'1990-01-01');
      el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
    });
    // Must remain disabled until terms are accepted.
    if(!await page.$eval('button[type="submit"]',el=>el.disabled))throw new Error('Terms acceptance gate is missing');
    await page.click('input[type="checkbox"]');
    await page.waitForFunction(()=>!document.querySelector('button[type="submit"]')?.disabled);
    if(preflight) {
      step('intercept_form_submission');
      // Exercise the client validator too. The interceptor aborts this POST
      // before it reaches the API, so even preflight detects form-only bugs.
      const [attempt]=await Promise.all([
        page.waitForRequest(r=>r.url()===cfg.api+REG && r.method()==='POST'),
        page.click('button[type="submit"]'),
      ]);
      const posted=JSON.parse(attempt.postData());
      if(posted.email!==email || posted.date_of_birth!=='1990-01-01')throw new Error('Signup form serialized incorrect fields');
      if(errors.length)throw new Error('Browser runtime error before signup');
      result.status='PASS';step('form_submission_intercepted_no_account');return result;
    }
    journal={email,password,api:cfg.api,created_at:new Date().toISOString()};
    await writeFile(journalPath,JSON.stringify(journal),{flag:'wx',mode:0o600});
    step('submit_signup');
    const [response]=await Promise.all([
      page.waitForResponse(r=>r.url()===cfg.api+REG && r.request().method()==='POST'),
      page.click('button[type="submit"]'),
    ]);
    let body;try {body=await response.json();} catch {throw new Error('Registration returned non-JSON');}
    const user=identity(success({response:{ok:response.ok(),status:response.status()},json:body},'Registration'),email);
    if(user.synthetic_check!==true)throw new Error('Registration did not confirm synthetic protections');
    tokenOf(user);
    step('authenticated_profile');
    const profile=identity(success(await apiRequest(cfg,'/v1/users/profile/',{token:tokenOf(user)}),'Profile'),email);
    if(String(user.id)!==String(profile.id))throw new Error('Profile is not the new account');
    step('post_signup_screen');
    await page.waitForFunction(()=>!['/signup','/login'].includes(location.pathname) &&
      [...document.querySelectorAll('h1,h2,button')].some(el=>el.getClientRects().length && /Welcome|Tell us|Practice|Review|Continue/i.test(el.textContent)));
    if(errors.length)throw new Error('Browser runtime error during signup');
    result.status='PASS';
  } catch(error) {
    result.error=error.message; // Our messages exclude response bodies/tokens/passwords.
    if(result.status!=='BLOCKED')result.status='FAIL';
  } finally {
    if(journal) {
      if(submitted) {
        try {await cleanup(cfg,journal);await unlink(journalPath);result.cleanup='deleted';}
        catch {result.cleanup='pending';result.status='FAIL';result.cleanup_error='Cleanup unconfirmed; protected recovery file retained. Run --cleanup.';}
      } else {await unlink(journalPath);result.cleanup='not_created';}
    }
    try {await browser?.close();}catch {result.status='FAIL';result.error='Browser shutdown failed';}
    result.finished_at=new Date().toISOString();
    result.duration_ms=Date.parse(result.finished_at)-Date.parse(result.started_at);
    if(locked) {
      await writeFile(path.join(cfg.output,'latest.json'),JSON.stringify(result,null,2),{mode:0o600});
      await writeFile(path.join(cfg.output,`${result.mode}.json`),JSON.stringify(result,null,2),{mode:0o600});
      await unlink(lock);
    }
  }
  return result;
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  if(args.some(a=>!['--preflight','--cleanup'].includes(a)) || args.length>1)throw new Error('Usage: node scripts/synthetic-signup.mjs [--preflight | --cleanup]');
  const result=await run(config(),{preflight:args.includes('--preflight'),cleanupOnly:args.includes('--cleanup')});
  console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='PASS'?0:result.status==='BLOCKED'?2:1;
}
