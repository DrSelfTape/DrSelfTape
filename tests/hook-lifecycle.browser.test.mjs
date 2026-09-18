import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

let browser, bundle;
before(async () => {
  const result = await build({
    stdin: { resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'jsx', contents: `
      import React, {useEffect} from 'react';
      import {createRoot} from 'react-dom/client';
      import {flushSync} from 'react-dom';
      import {useLatestCallback} from './src/hooks/useLatestCallback';
      import {usePeerConnection} from './src/components/MeetingRoom/Hooks/usePeerConnection';
      import {useScriptAudioPlayer} from './src/hooks/useScriptAudioPlayer';
      const root = createRoot(document.getElementById('root'));
      const noop = () => {};
      const ref = current => ({current});
      window.effects = 0; window.cleanups = []; window.peers = []; window.mediaRequests = 0;
      window.state = {sceneStudyScripts: {audioData: null}};
      const options = {
        meetingId: 'test-room', isHost: true, hasJoined: true,
        displayNameRef: ref('Actor'), localStreamRef: ref(null), remoteStreamRef: ref(null),
        screenVideoRef: ref(null), dataConnectionsRef: ref(new Set()), currentCallRef: ref(null),
        activeCallsRef: ref(new Set()), peerRef: ref(null), localVideoRef: ref(null),
        remoteVideoRef: ref(null), screenStreamRef: ref(null), previousCameraTrackRef: ref(null),
        setRemoteConnected: noop, setRemoteDisplayName: noop, setRemoteRole: noop,
        setRemoteStreamVersion: noop, setMeetingError: noop, setIsRemoteCameraOff: noop,
        setIsRemoteMuted: noop, setRemoteAudioLevel: noop, setLocalStreamVersion: noop,
        setParticipants: noop, setIsRemoteScreenSharing: noop,
      };
      const tracks = ['video','audio'].map(kind => ({kind, enabled: true, stopped: false, stop() {this.stopped = true;}}));
      window.tracks = tracks;
      const stream = {getTracks: () => tracks, getVideoTracks: () => [tracks[0]], getAudioTracks: () => [tracks[1]]};
      Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: {
        getUserMedia: () => {window.mediaRequests++; return new Promise(resolve => {window.grantMedia = () => resolve(stream);});}
      }});
      function Latest({value}) {
        const callback = useLatestCallback(() => value);
        window.latest = callback;
        useEffect(() => {window.effects++; return () => window.cleanups.push(callback());}, [callback]);
        return null;
      }
      function Peer({joined = true, muted = false, cameraOff = false}) {
        window.connection = usePeerConnection({...options, hasJoined: joined, isMuted: muted, isCameraOff: cameraOff});
        return null;
      }
      const audioOptions = {scriptLines: [{lineId: 7}], recordings: [], autoAdvance: false};
      function Audio() {window.player = useScriptAudioPlayer(audioOptions); return null;}
      window.render = (kind, props = {}) => flushSync(() => root.render(
        kind === 'latest' ? <Latest {...props}/> : kind === 'peer' ? <Peer {...props}/> : <Audio/>
      ));
      window.unmount = () => flushSync(() => root.unmount());
    ` },
    bundle: true, write: false, jsx: 'automatic',
    plugins: [{name: 'isolated-platform', setup(b) {
      b.onResolve({filter: /^(peerjs|react-redux)$/}, ({path}) => ({path, namespace: 'mock'}));
      b.onResolve({filter: /utils\/meeting$/}, () => ({path: 'meeting', namespace: 'mock'}));
      b.onLoad({filter: /.*/, namespace: 'mock'}, ({path}) => ({loader: 'js', contents:
        path === 'peerjs' ? 'export default class Peer {constructor(id) {this.id=id; this.handlers={}; window.peers.push(this);} on(name, cb) {this.handlers[name]=cb;} destroy() {this.destroyed=true;}}' :
        path === 'react-redux' ? 'export const useSelector = selector => selector(window.state);' :
        'export const clearMeetingHostFlag = () => {};'
      }));
    }}],
  });
  bundle = result.outputFiles[0].text;
  browser = await launchBrowser();
});
after(async () => browser?.close());

async function open(t) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({content: bundle});
  t.after(async () => {await page.close(); assert.deepEqual(errors, []);});
  return page;
}

test('one-shot subscriptions keep their identity but read the latest callback on cleanup', async t => {
  const page = await open(t);
  assert.deepEqual(await page.evaluate(() => {
    render('latest', {value: 'first'});
    const first = latest;
    render('latest', {value: 'second'});
    const result = {same: first === latest, value: first(), effects};
    unmount();
    return {...result, cleanups};
  }), {same: true, value: 'second', effects: 1, cleanups: ['second']});
});

test('mute/camera updates during permission prompt do not restart the join and apply to the granted stream', async t => {
  const page = await open(t);
  await page.evaluate(() => render('peer'));
  await page.waitForFunction(() => mediaRequests === 1);
  await page.evaluate(() => {render('peer', {muted: true, cameraOff: true}); grantMedia();});
  await page.waitForFunction(() => peers.length === 1);
  assert.deepEqual(await page.evaluate(() => ({requests: mediaRequests, tracks: tracks.map(t => ({enabled:t.enabled, stopped:t.stopped}))})),
    {requests: 1, tracks: [{enabled:false, stopped:false}, {enabled:false, stopped:false}]});
  await page.evaluate(() => render('peer', {muted: false}));
  assert.equal(await page.evaluate(() => peers.length), 1);
});

test('leaving before media permission resolves stops the late stream and creates no peer', async t => {
  const page = await open(t);
  await page.evaluate(() => render('peer'));
  await page.waitForFunction(() => mediaRequests === 1);
  await page.evaluate(() => {render('peer', {joined: false}); grantMedia();});
  await page.waitForFunction(() => tracks.every(t => t.stopped));
  assert.equal(await page.evaluate(() => peers.length), 0);
});

test('completed audio arriving from Redux is available without changing lines or tone', async t => {
  const page = await open(t);
  assert.deepEqual(await page.evaluate(() => {
    render('audio');
    const before = player.getAudioUrlForLine(0);
    state = {sceneStudyScripts: {audioData: {clips: [{line_id:7, status:'completed', audio_url:'https://audio.test/new.mp3', tone:'neutral'}]}}};
    render('audio');
    return [before, player.getAudioUrlForLine(0)];
  }), [null, 'https://audio.test/new.mp3']);
});
