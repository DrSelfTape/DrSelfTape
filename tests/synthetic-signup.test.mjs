import {test} from 'node:test';
import assert from 'node:assert/strict';
import {config,identity,cleanup} from '../scripts/synthetic-signup.mjs';
const email='synthetic-'+ 'a'.repeat(32)+'@synthetic.drselftapes.invalid';
const cfg={api:'http://localhost:8000/api'};
const journal={api:cfg.api,email,password:'generated-password'};
const ok=data=>({response:{ok:true,status:200},json:{success:true,data}});

test('configuration rejects insecure remote targets and embedded credentials',()=>{
  assert.throws(()=>config({DST_SYNTHETIC_WEB_URL:'http://example.com'}));
  assert.throws(()=>config({DST_SYNTHETIC_WEB_URL:'https://user:secret@example.com'}));
  assert.equal(config({DST_SYNTHETIC_WEB_URL:'http://localhost:5173'}).web,'http://localhost:5173');
});
test('identity refuses a real customer and mismatched returned email',()=>{
  assert.throws(()=>identity({id:1,email:'real@example.com'},'real@example.com'));
  assert.throws(()=>identity({id:1,email:'real@example.com'},email));
});
test('cleanup verifies matching identity before deleting and checks token invalidation',async()=>{
  const calls=[];
  const request=async(c,url,opts)=>{
    calls.push([url,opts]);
    if(url.endsWith('login/'))return ok({id:7,email,token:{access:'test-token'}});
    if(url.endsWith('account/'))return ok({});
    if(calls.length===2)return ok({id:7,email});
    return {response:{ok:false,status:401},json:{}};
  };
  await cleanup(cfg,journal,request);
  assert.deepEqual(calls.map(c=>c[0]),['/v1/users/login/','/v1/users/profile/','/v1/users/account/','/v1/users/profile/']);
  assert.equal(calls[2][1].body.confirm_email,email);
});
test('cleanup never deletes when API or authenticated profile identity differs',async()=>{
  await assert.rejects(cleanup(cfg,{...journal,api:'https://other.example/api'},()=>{throw Error('must not call');}));
  let deleted=false;
  await assert.rejects(cleanup(cfg,journal,async(c,url)=>{
    if(url.endsWith('login/'))return ok({id:7,email,token:'test-token'});
    if(url.endsWith('account/'))deleted=true;
    return ok({id:8,email});
  }),/IDs differ/);
  assert.equal(deleted,false);
});
test('HTTP 200 with success false and deletion verification outages fail',async()=>{
  await assert.rejects(cleanup(cfg,journal,async()=>({response:{ok:true,status:200},json:{success:false}})),/Cleanup login failed/);
  let count=0;
  await assert.rejects(cleanup(cfg,journal,async()=>{
    count++;
    return count===4?{response:{status:503,ok:false},json:{}}:ok({id:7,email,token:'test-token'});
  }),/Deletion not confirmed/);
});
