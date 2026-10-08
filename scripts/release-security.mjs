import fs from 'node:fs';
import path from 'node:path';

// Pattern checks are a release tripwire, not proof that an artifact is secret-free.
// Reports name the file and credential type only; never print a matching value.
const credentials = [
  ['private signing key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['AI provider secret', /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{30,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub private token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['Slack private token', /\bxox[baprs]-[A-Za-z0-9-]{20,}/],
  ['Stripe private key', /\b[rs]k_(?:live|test)_[A-Za-z0-9]{20,}/],
];

export function validateReleaseEnvironment(env) {
  let api;
  try { api = new URL(env.VITE_API_URL); } catch { /* rejected below */ }
  if (!api || api.protocol !== 'https:' || api.username || api.password || api.search || api.hash) {
    throw new Error('VITE_API_URL must be an HTTPS API base URL without credentials, query, or fragment.');
  }
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_') || !value) continue;
    if (/(?:SECRET|PASSWORD|PRIVATE_KEY|AUTH_TOKEN|OPENAI.*KEY|ANTHROPIC.*KEY|ELEVENLABS.*KEY)/i.test(name)
        || credentials.some(([, pattern]) => pattern.test(String(value)))) {
      throw new Error(`Private credential must not be exposed through client environment variable ${name}.`);
    }
  }
}

export function auditReleaseDirectory(directory) {
  const findings = [];
  let files = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const relative = path.relative(directory, full);
      if (entry.isSymbolicLink()) {
        findings.push(`${relative}: symbolic link in release output`);
        continue;
      }
      if (entry.name === '.git' || entry.name === '.DS_Store' || /^\.env(?:\.|$)/i.test(entry.name)
          || /\.(?:p8|pem|key|sqlite3?|map)$/i.test(entry.name) || /^id_(?:rsa|ed25519)$/.test(entry.name)) {
        findings.push(`${relative}: private file or source map in release output`);
      }
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.isFile()) continue;
      files++;
      const content = fs.readFileSync(full).toString('utf8');
      for (const [label, pattern] of credentials) {
        if (pattern.test(content)) findings.push(`${relative}: ${label}`);
      }
      if (/\.(?:js|css|html)$/i.test(entry.name) && /sourceMappingURL\s*=\s*data:/i.test(content)) {
        findings.push(`${relative}: inline source map in release output`);
      }
    }
  }
  walk(directory);
  if (findings.length) throw new Error(`Release security check failed:\n${findings.join('\n')}`);
  return { files };
}

export function releaseSecurityPlugin() {
  let outDir;
  return {
    name: 'release-security-check',
    apply: 'build',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir); },
    closeBundle: {
      order: 'post',
      sequential: true,
      handler() {
        if (!outDir || !fs.existsSync(outDir)) return;
        let removed = 0;
        function removeMaps(directory) {
          for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
            const full = path.join(directory,entry.name);
            if (entry.isDirectory()) removeMaps(full);
            else if (entry.isFile() && entry.name.endsWith('.map')) { fs.unlinkSync(full); removed++; }
          }
        }
        removeMaps(outDir);
        if (removed) this.warn(`removed ${removed} private source map(s) from release output`);
        const { files } = auditReleaseDirectory(outDir);
        this.info(`release security check passed (${files} files)`);
      },
    },
  };
}
