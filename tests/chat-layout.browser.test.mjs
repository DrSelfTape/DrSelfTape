// The Green Room chat composer must be reachable.
//
// GreenRoomChat sized itself with `height: calc(100dvh - 80px)` while the
// mobile shell's content box already reserves BOTH bars:
//   paddingTop:    calc(54px + env(safe-area-inset-top))
//   paddingBottom: calc(84px + env(safe-area-inset-bottom))
// That is ~138px before insets and ~231px on an iPhone 17, against a flat 80px
// subtraction — so the bottom of the chat column, and with it the message
// input, sat well below the fold behind the floating tab pill. You could read
// messages and not reply.
//
// This reproduces the real shell geometry and asserts the composer lands inside
// the viewport. It fails against the old magic number and passes against
// `height: 100%`, which fills the content box exactly.
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { launchBrowser } from './browser.mjs';

const CHAT = new URL('../src/panels/Dashboard/FindAReader/GreenRoomChat.jsx', import.meta.url);

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => browser?.close());

// iPhone-17-ish: 402x874 points with a Dynamic Island and a home indicator.
const VIEWPORT = { width: 402, height: 874 };
const SAFE_TOP = 59;
const SAFE_BOTTOM = 34;

function page(childHeight) {
  return `<!doctype html><html><head><style>
    * { margin: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    #root { height: 100dvh; overflow: hidden; position: fixed; inset: 0; }
    #shell { display: flex; flex-direction: column; height: 100dvh; min-height: 0; }
    #topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 50;
              height: calc(54px + ${SAFE_TOP}px); }
    #content { flex: 1; min-height: 0; overflow-y: auto;
               padding-top: calc(54px + ${SAFE_TOP}px);
               padding-bottom: calc(84px + ${SAFE_BOTTOM}px); }
    #chat { display: flex; flex-direction: column; height: ${childHeight}; }
    #chat-header { flex: none; height: 56px; }
    #messages { flex: 1; min-height: 0; overflow-y: auto; }
    #composer { flex: none; height: 64px; }
  </style></head><body>
    <div id="root"><div id="shell">
      <div id="topbar"></div>
      <div id="content">
        <div id="chat">
          <div id="chat-header"></div>
          <div id="messages"></div>
          <div id="composer"></div>
        </div>
      </div>
    </div></div>
  </body></html>`;
}

async function measure(childHeight) {
  const p = await browser.newPage();
  await p.setViewport(VIEWPORT);
  await p.setContent(page(childHeight));
  const out = await p.evaluate(() => {
    const c = document.getElementById('composer').getBoundingClientRect();
    return { top: c.top, bottom: c.bottom, viewport: window.innerHeight };
  });
  await p.close();
  return out;
}

test('the OLD magic number pushed the composer off-screen (regression captured)', async () => {
  const { bottom, viewport } = await measure('calc(100dvh - 80px)');
  assert.ok(
    bottom > viewport,
    `expected the old value to overflow the viewport, got bottom=${bottom} vs ${viewport} — ` +
    'if this now fits, the shell padding changed and this test should be revisited'
  );
});

test('height:100% keeps the composer fully inside the viewport', async () => {
  const { top, bottom, viewport } = await measure('100%');
  assert.ok(bottom <= viewport, `composer bottom ${bottom} must be within viewport ${viewport}`);
  // And clear of the floating tab pill, which the content box reserves 84px +
  // the home indicator for.
  assert.ok(
    bottom <= viewport - SAFE_BOTTOM,
    `composer bottom ${bottom} should clear the ${SAFE_BOTTOM}px home indicator`
  );
  assert.ok(top > 0, 'composer should not be scrolled above the fold');
});

test('GreenRoomChat does not reintroduce a hardcoded viewport subtraction', async () => {
  const src = readFileSync(CHAT, 'utf8');
  const magic = [...src.matchAll(/height:\s*['"`]calc\(100d?vh\s*-\s*\d+px\)/g)].map(m => m[0]);
  assert.deepEqual(
    magic, [],
    'the shell content box already reserves both bars — fill it with 100% rather than ' +
    `re-deriving it: ${magic.join(', ')}`
  );
});
