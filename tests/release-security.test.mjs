import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditReleaseDirectory, validateReleaseEnvironment, releaseSecurityPlugin } from '../scripts/release-security.mjs';
import { build } from 'vite';

test('release environment requires HTTPS and rejects private keys while allowing public SDK keys', () => {
  const valid = { VITE_API_URL:'https://api.example.test/api', VITE_REVENUECAT_IOS_KEY:'appl_public', VITE_POSTHOG_KEY:'phc_public' };
  assert.doesNotThrow(() => validateReleaseEnvironment(valid));
  for (const url of ['http://api.example.test/api','https://user:pass@api.example.test/api','https://api.example.test/api?token=x','https://api.example.test/api#x','not a URL']) {
    assert.throws(() => validateReleaseEnvironment({ ...valid,VITE_API_URL:url }), /HTTPS API base/);
  }
  assert.throws(() => validateReleaseEnvironment({ ...valid,VITE_OPENAI_API_KEY:'any-provider-value' }), /VITE_OPENAI_API_KEY/);
  const privateKey = 'sk-' + 'a'.repeat(40);
  assert.throws(() => validateReleaseEnvironment({ ...valid,VITE_MISC:privateKey }), error => !error.message.includes(privateKey) && /VITE_MISC/.test(error.message));
});

test('real custom-mode builds clean maps after other hooks and reject leaked public files', async t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'dst-release-build-')));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'index.html'),'<script type="module" src="/app.js"></script>');
  fs.writeFileSync(path.join(root,'app.js'),'document.body.textContent = "ready";');
  const config = { root,configFile:false,mode:'staging',logLevel:'silent',plugins:[
    {name:'simulate-private-upload-hook',closeBundle:async () => {
      await new Promise(resolve => setTimeout(resolve,20));
      if (fs.existsSync(path.join(root,'custom'))) fs.writeFileSync(path.join(root,'custom','late.js.map'),'private source');
    }},
    releaseSecurityPlugin(),
  ],build:{outDir:'custom',sourcemap:true}};
  await build(config);
  assert.ok(!fs.existsSync(path.join(root,'custom','late.js.map')));
  assert.doesNotThrow(() => auditReleaseDirectory(path.join(root,'custom')));
  fs.mkdirSync(path.join(root,'public'));
  fs.writeFileSync(path.join(root,'public','AuthKey_secret.p8'),'not for distribution');
  await assert.rejects(build(config), /private file or source map/);
});

test('artifact scan rejects secrets and private files without leaking values in diagnostics', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'dst-release-security-'));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'app.js'),'export const publicKey = "appl_public";');
  assert.deepEqual(auditReleaseDirectory(root), {files:1});
  const secret = 'sk_live_' + 'b'.repeat(30);
  fs.writeFileSync(path.join(root,'leak.js'),`const key = '${secret}';`);
  assert.throws(() => auditReleaseDirectory(root), error => /leak.js: Stripe private key/.test(error.message) && !error.message.includes(secret));
  fs.unlinkSync(path.join(root,'leak.js'));
  for (const name of ['.env.production','AuthKey_test.p8','data.sqlite3','app.js.map']) {
    fs.writeFileSync(path.join(root,name),'private');
    assert.throws(() => auditReleaseDirectory(root), /private file or source map/);
    fs.unlinkSync(path.join(root,name));
  }
  fs.writeFileSync(path.join(root,'inline.js'),'//# sourceMappingURL=data:application/json;base64,e30=');
  assert.throws(() => auditReleaseDirectory(root), /inline source map/);
});
