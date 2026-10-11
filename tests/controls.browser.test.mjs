// CustomButton / CustomModal — the MUI-free implementations.
//
// These two components were the only thing holding @mui on the first-paint
// critical path (428KB for a Button, a spinner, a Modal and a close icon).
// Reimplementing them touched the default button on every non-Studio screen
// and 10 modals, and a green unit suite says nothing about whether a button
// still looks or behaves like a button. These assertions pin the parts that
// would otherwise regress silently: the 44px tap floor, the dense hit area,
// disabled/loading semantics, sx pass-through, and the four jobs MUI's Modal
// used to do (portal, backdrop close, escape, scroll lock).
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { launchBrowser } from './browser.mjs';

let browser, bundle, css;
before(async () => {
  css = readFileSync(new URL('../src/components/Shared/controls.css', import.meta.url), 'utf8');
  const out = await build({
    stdin: {
      resolveDir: fileURLToPath(new URL('../', import.meta.url)),
      loader: 'jsx',
      contents: `
        import React, {useState} from 'react';
        import {createRoot} from 'react-dom/client';
        import {CustomButton} from './src/components/Shared/CustomButton';
        import {CustomModal} from './src/components/Shared/CustomModal';
        const root = createRoot(document.getElementById('root'));
        window.clicks = 0;
        window.closes = [];
        window.renderButton = props => root.render(
          <CustomButton onClick={() => {window.clicks++;}} {...props}>Go</CustomButton>
        );
        window.renderModal = props => root.render(
          <CustomModal open title="Test dialog" close={(e, reason) => window.closes.push(reason || 'icon')} {...props}>
            <p id="body">body</p>
          </CustomModal>
        );
      `,
    },
    bundle: true, write: false, jsx: 'automatic',
    // The component pulls its own stylesheet; the page injects it separately.
    plugins: [{ name: 'stub-css', setup(b) {
      b.onResolve({ filter: /\.css$/ }, a => ({ path: a.path, namespace: 'css-stub' }));
      b.onLoad({ filter: /.*/, namespace: 'css-stub' }, () => ({ loader: 'js', contents: '' }));
    }}],
  });
  bundle = out.outputFiles[0].text;
  browser = await launchBrowser();
});
after(async () => browser?.close());

async function open(t) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // #outside sits AFTER #root deliberately: the button tests use
  // querySelector('button'), which takes the first in document order, so the
  // rendered component must come first.
  await page.setContent(
    `<style>${css}</style><div id="root"></div><button id="outside">behind</button>`
  );
  await page.addScriptTag({ content: bundle });
  t.after(async () => { await page.close(); assert.deepEqual(errors, []); });
  return page;
}

test('renders a real <button> that clears the 44px tap floor', async t => {
  const page = await open(t);
  await page.evaluate(() => renderButton({}));
  await page.waitForFunction(() => document.querySelector('button'));
  assert.deepEqual(await page.evaluate(() => {
    const b = document.querySelector('button');
    return { tag: b.tagName, height: Math.round(b.getBoundingClientRect().height), type: b.type };
  }), { tag: 'BUTTON', height: 44, type: 'submit' });
  // A real <button> is what the App.jsx touchend delegate looks for, so the
  // WKWebView synthetic-click belt keeps working without a per-button patch.
});

test('dense shrinks the box but keeps a 44px hit area', async t => {
  const page = await open(t);
  await page.evaluate(() => renderButton({ dense: true }));
  await page.waitForFunction(() => document.querySelector('button.dst-btn--dense'));
  const { box, hit } = await page.evaluate(() => {
    const b = document.querySelector('button');
    return { box: b.getBoundingClientRect().height, hit: getComputedStyle(b, '::after').height };
  });
  // Assert the invariant, not a pixel: the drawn box is shorter than the floor
  // while the touch target still clears it. (It lands at 36.5 — min-height 36
  // plus MUI's 1.75 line-height and 6px padding — so pinning "36" would fail
  // on a rounding difference that means nothing.)
  assert.ok(box < 44, `dense box should be under 44px, got ${box}`);
  assert.ok(box >= 36, `dense box should be at least 36px, got ${box}`);
  assert.equal(hit, '44px');
});

test('disabled and loading both block the click, and loading shows a spinner', async t => {
  const page = await open(t);
  await page.evaluate(() => renderButton({ disabled: true }));
  await page.click('button', { force: true }).catch(() => {});
  await page.evaluate(() => renderButton({ loading: true }));
  await page.waitForFunction(() => document.querySelector('.dst-spinner'));
  assert.deepEqual(await page.evaluate(() => ({
    clicks: window.clicks,
    busy: document.querySelector('button').getAttribute('aria-busy'),
    spinner: !!document.querySelector('.dst-spinner'),
    disabled: document.querySelector('button').disabled,
  })), { clicks: 0, busy: 'true', spinner: true, disabled: true });
});

test('sx still applies, including a theme token and a hover override', async t => {
  // This used to assert the hover VARIABLE and call it done, while the rendered
  // hover was dead: the base colour was also spread into the inline style, and
  // an inline declaration outranks .dst-btn:hover, so the button never
  // repainted. Assert the painted colour in both states instead — the variable
  // being right is not the contract, the button changing colour is.
  const page = await open(t);
  await page.evaluate(() => renderButton({
    sx: { backgroundColor: '#123456', color: 'primary.contrastText', '&:hover': { backgroundColor: '#abcdef' } },
  }));
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector('button')).backgroundColor === 'rgb(18, 52, 86)'
  );
  assert.deepEqual(await page.evaluate(() => {
    const b = document.querySelector('button');
    return {
      bg: getComputedStyle(b).backgroundColor,
      fg: getComputedStyle(b).color,
      hoverVar: b.style.getPropertyValue('--dst-btn-bg-hover').trim(),
      // The colours travel as custom properties ONLY; inline would win over :hover.
      inlineBg: b.style.backgroundColor,
    };
  }), { bg: 'rgb(18, 52, 86)', fg: 'rgb(255, 255, 255)', hoverVar: '#abcdef', inlineBg: '' });

  await page.hover('button');
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector('button')).backgroundColor === 'rgb(171, 205, 239)',
    { timeout: 4000 },
  ).catch(() => { throw new Error('hovering did not repaint the button to the sx &:hover colour'); });
});

test('a responsive sx value is dropped rather than emitted as [object Object]', async t => {
  const page = await open(t);
  await page.evaluate(() => renderButton({ sx: { width: { xxs: '100%', xs: 'fit-content' } } }));
  await page.waitForFunction(() => document.querySelector('button'));
  assert.equal(await page.evaluate(() => document.querySelector('button').style.width), '');
});

test('modal portals to body, traps nothing it should not, and closes on backdrop / escape', async t => {
  const page = await open(t);
  await page.evaluate(() => renderModal({}));
  await page.waitForFunction(() => document.body.style.overflow === 'hidden');
  // portal: the dialog is a child of body, not of #root
  assert.deepEqual(await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return {
      portalled: d.closest('#root') === null,
      labelled: d.getAttribute('aria-label'),
      modal: d.getAttribute('aria-modal'),
      scrollLocked: document.body.style.overflow,
      hasBody: !!document.getElementById('body'),
    };
  }), { portalled: true, labelled: 'Test dialog', modal: 'true', scrollLocked: 'hidden', hasBody: true });

  // a press that starts inside the panel and ends on the backdrop must NOT close
  await page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"]');
    panel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    document.querySelector('.dst-modal-backdrop').click();
  });
  assert.deepEqual(await page.evaluate(() => window.closes), []);

  // a press that both starts and ends on the backdrop closes it
  await page.evaluate(() => {
    const back = document.querySelector('.dst-modal-backdrop');
    back.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    back.click();
  });
  assert.deepEqual(await page.evaluate(() => window.closes), ['backdropClick']);

  await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(() => window.closes), ['backdropClick', 'escapeKeyDown']);
});

test('disableBackdropClick and disableEscapeKeyDown are both honoured', async t => {
  const page = await open(t);
  await page.evaluate(() => renderModal({ disableBackdropClick: true, disableEscapeKeyDown: true }));
  await page.waitForFunction(() => document.querySelector('.dst-modal-backdrop'));
  await page.evaluate(() => {
    const back = document.querySelector('.dst-modal-backdrop');
    back.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    back.click();
  });
  await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(() => window.closes), []);
});

test('closing restores body scroll', async t => {
  const page = await open(t);
  await page.evaluate(() => renderModal({}));
  await page.waitForFunction(() => document.body.style.overflow === 'hidden');
  await page.evaluate(() => renderModal({ open: false }));
  await page.waitForFunction(() => document.body.style.overflow === '');
  assert.equal(await page.evaluate(() => !!document.querySelector('[role="dialog"]')), false);
});

test('escape calls the CURRENT close prop, not the one captured when it opened', async t => {
  // The keydown listener is registered once per open, so a plain closure froze
  // whichever handleModalClose existed at that moment. A consumer that
  // re-rendered with a different `close` got the stale one on Escape, while
  // clicking the X got the new one — two buttons, two different behaviours.
  const page = await open(t);
  await page.evaluate(() => {
    window.whichClose = [];
    window.renderWithClose = (tag) => renderModal({ close: () => window.whichClose.push(tag) });
    window.renderWithClose('first');
  });
  await page.waitForFunction(() => document.querySelector('[role="dialog"]'));
  await page.evaluate(() => window.renderWithClose('second'));
  await page.waitForFunction(() => document.querySelector('[role="dialog"]'));
  await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(() => window.whichClose), ['second']);
});

test('keyboard focus cannot leave the dialog, and comes back on close', async t => {
  // MUI's Modal shipped a FocusTrap; the hand-rolled replacement had no focus
  // management at all, so Tab walked straight out and Enter could fire a
  // control behind the overlay.
  const page = await open(t);
  await page.evaluate(() => document.getElementById('outside').focus());
  await page.evaluate(() => renderModal({}));
  await page.waitForFunction(() => document.querySelector('[role="dialog"]'));

  // Focus moved INTO the dialog on open.
  assert.equal(
    await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)),
    true,
    'opening the dialog should move focus inside it',
  );

  // Tabbing all the way round must never land on the background button.
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), '',
    'Tab escaped the dialog and reached a background control');
  assert.equal(
    await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)),
    true,
    'focus should still be inside the dialog after cycling',
  );

  // Shift+Tab backwards from the first item must wrap, not escape.
  await page.keyboard.down('Shift');
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert.equal(
    await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)),
    true,
    'Shift+Tab escaped the dialog',
  );

  // Closing returns focus where the user left it.
  await page.evaluate(() => renderModal({ open: false }));
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  assert.equal(await page.evaluate(() => document.activeElement.id), 'outside',
    'closing should restore focus to whatever had it before');
});

test('shift+tab from the panel itself cannot walk out backwards', async t => {
  // The panel is focusable at tabIndex -1 and takes focus when you click blank
  // space inside the dialog. node.contains(node) is true, so the trap read that
  // as "already inside" while the panel matched neither end of the focus ring —
  // and Shift+Tab fell through to native backward navigation, out of the modal.
  const page = await open(t);
  await page.evaluate(() => document.getElementById('outside').focus());
  await page.evaluate(() => renderModal({}));
  await page.waitForFunction(() => document.querySelector('[role="dialog"]'));

  await page.evaluate(() => document.querySelector('[role="dialog"]').focus());
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'dialog');

  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert.equal(
    await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)),
    true,
    'shift+tab from the panel escaped the dialog',
  );
  assert.notEqual(await page.evaluate(() => document.activeElement.id), 'outside');
});

test('a dialog with no focusable control keeps focus on the panel', async t => {
  // Not reachable from any current caller (all render the close button), but a
  // trap waiting for the first hideCloseIcon + noFooter caller: with no items
  // to cycle, Tab fell through to native navigation and left the dialog.
  const page = await open(t);
  await page.evaluate(() => document.getElementById('outside').focus());
  await page.evaluate(() => renderModal({ hideCloseIcon: true, noFooter: true }));
  await page.waitForFunction(() => document.querySelector('[role="dialog"]'));
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('role')), 'dialog',
    'the panel should hold focus when it has no focusable child',
  );
  for (const shift of [false, true]) {
    if (shift) await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    if (shift) await page.keyboard.up('Shift');
    assert.equal(
      await page.evaluate(() => document.activeElement.getAttribute('role')), 'dialog',
      `${shift ? 'shift+tab' : 'tab'} left an empty dialog`,
    );
  }
});

test('a tabIndex -1 control cannot become a focus-trap boundary', async t => {
  // <button tabIndex={-1}> matches the button selector but native Tab skips
  // it. Treating it as the ring's first element meant the real edge was never
  // detected and Shift+Tab walked past it into the page behind.
  const page = await open(t);
  await page.evaluate(() => {
    const root = document.getElementById('root');
    root.insertAdjacentHTML('beforebegin', '<button id="before">ahead</button>');
  });
  await page.evaluate(() => renderModal({
    hideCloseIcon: true,
    noFooter: true,
    children: undefined,
  }));
  await page.waitForFunction(() => document.querySelector('[role="dialog"]'));
  await page.evaluate(() => {
    const body = document.querySelector('[role="dialog"] #body') || document.querySelector('[role="dialog"]');
    body.insertAdjacentHTML('afterend',
      '<button id="skipme" tabindex="-1">A</button><button id="real">B</button>');
  });
  await page.evaluate(() => document.getElementById('real').focus());
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert.equal(
    await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)),
    true,
    'shift+tab escaped past a tabIndex -1 control',
  );
});
