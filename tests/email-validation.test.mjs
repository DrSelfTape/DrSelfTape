import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateEmail} from '../src/utils/email.js';

test('valid actor emails include modern domains, subdomains and aliases',()=>{
  for(const email of ['a@example.com','actor+audition@example.com','actor@agency.studio',
    'actor@casting.example.technology','actor@my-agency.co.uk',
    'synthetic-'+ 'a'.repeat(32)+'@synthetic.drselftapes.invalid']) assert.equal(validateEmail(email),true,email);
});
test('invalid addresses still fail form validation',()=>{
  for(const email of ['',null,'a@','@example.com','a@@example.com','a b@example.com',
    'a@example','a@under_score.com','a@-agency.com','a@agency-.com','a@a..com',
    '.a@example.com','a..b@example.com','a.@example.com','a@'+ 'x'.repeat(64)+'.com']) assert.equal(validateEmail(email),false,String(email));
});
