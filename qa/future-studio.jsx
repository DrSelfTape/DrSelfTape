import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/App.css';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { store as appStore } from '../src/redux/store';
import http from '../src/redux/http';
import { HomeScreen, ScenesScreen, MoreScreen, PanelScreen, AuditionsScreen, ConnectScreen } from '../src/panels/Mobile/MobileApp';
import TapeReviewNotes from '../src/panels/Dashboard/Jericho/TapeReviewNotes';
import CompareTakes from '../src/panels/Dashboard/Jericho/CompareTakes';
import LoginPage from '../src/panels/Auth/LoginPage';
import { Signup } from '../src/panels/Authentication/SignUp';
import CDReport from '../src/panels/Dashboard/CDSim/CDReport';
import WhatsNewModal from '../src/components/WhatsNewModal';
import ReportProblemModal from '../src/components/ReportProblemModal';
import '../src/studio.css';
import StudioHomeHero from '../src/components/FutureStudio/StudioHomeHero';
import StudioTabGlow from '../src/components/FutureStudio/StudioTabGlow';
import StudioReviewLoading from '../src/components/FutureStudio/StudioReviewLoading';
import BootSplash from '../src/components/Shared/BootSplash';
import StudioReviewSummary from '../src/panels/Dashboard/Jericho/StudioReviewSummary';

// Local component fixture only; not an app route or a backend connection.
http.defaults.adapter = async config => ({ data: { data: { balance: 8, unlimited: false, plan: null, status: 'inactive' } }, status: 200, statusText: 'OK', headers: {}, config });
const fixtureState = { ...appStore.getState(), auth: { user: { id: 'local-fixture', ai_consent_accepted_at: '2026-10-24T00:00:00Z' } }, jericho: { ...appStore.getState().jericho, memoryHasFetched: true, memoryLoading: false, memory: { total_sessions: 3, performance_dna: { emotional_range: 8, cold_read: 6, comedy_timing: 7, dramatic_depth: 8, physicality: 6, vocal_variety: 7 }, coaching_style: 'balanced' }, insights: [], recentSessions: [], evolution: {} }, userSettings: { loaded: true, data: { tutorial_progress: { first_review: true }, reader_onboarding_seen: true } }, profile: { profile: { first_name: 'Actor', needs_visual: false } } };
const fixtureStore = configureStore({ reducer: (state = fixtureState) => state, middleware: () => [() => next => action => typeof action === 'function' ? Promise.resolve({}) : next(action)] });
const comparedState = { ...fixtureState, jericho: { ...fixtureState.jericho, compareResult: { winner: 1, ranking: [1, 2], headline: 'Take 1 keeps the connection', why_winner: 'The thought stays alive through the silence.', takes: [1, 2].map(take => ({ take, score: take === 1 ? 84 : 72, one_line: 'A grounded response.', best_moment: 'The pause before answering.', steal: 'Keep the relaxed breath.', analysis: { verdict: 'The relationship is clear.', performance: { emotional_arc: 'Let urgency build.', listening_presence: 'Keep listening between lines.' }, adjustments: [{ note: 'Bring your reader closer to the lens.' }] } })) } } };
const comparedStore = configureStore({ reducer: (state = comparedState) => state, middleware: () => [() => next => action => typeof action === 'function' ? Promise.resolve({}) : next(action)] });
export default function QA() {
  useEffect(() => { document.documentElement.setAttribute('data-theme', 'dark'); document.documentElement.classList.add('future-theme'); return () => document.documentElement.classList.remove('future-theme'); }, []);
  const [view, setView] = useState('Home');
  const [destination, setDestination] = useState('');
  const [balance, setBalance] = useState(0);
  const [connectSection, setConnectSection] = useState('find');
  useEffect(() => {
    const navigate = event => { if (event.detail?.tab === 'auditions') setView('Auditions'); };
    window.addEventListener('drst-navigate', navigate);
    return () => window.removeEventListener('drst-navigate', navigate);
  }, []);
  return <Provider store={fixtureStore}><BrowserRouter><div className="studio-mobile-shell future-theme" style={{ minHeight: '100dvh', background: '#0b1516', color: '#ecf0df', fontFamily: 'Manrope, sans-serif' }}>
    <header style={{ display: view === 'Boot' ? 'none' : undefined, padding: 16, borderBottom: '1px solid #34483d', position: 'relative', zIndex: 100 }}>
      <strong>Local component QA · no live account</strong>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>{['Home', 'Full Home', 'Practice', 'Connect', 'More', 'Membership', 'Notes', 'Compare', 'Login', 'Coach report', 'Updates', 'Report issue', 'Boot', 'Uploading', 'Processing', 'Result'].map(name => <button key={name} onClick={() => setView(name)} style={{ padding: 10 }}>{name}</button>)}</div>
    </header>
    <main style={{ maxWidth: 700, margin: 'auto', padding: '16px 20px 110px' }}>
      {view === 'Home' && <><StudioHomeHero balance={balance} onReview={() => setDestination('Tape Review')} onPractice={() => setDestination('Scene Study')} onReaders={() => setDestination('Find a Reader')} onMembership={() => setDestination('Membership')} /><button onClick={() => setBalance(balance ? 0 : 8)}>Toggle test balance</button><p role="status">{destination}</p></>}
      {view === 'Boot' && <BootSplash />}
      {view === 'Full Home' && <HomeScreen setTab={setDestination} setCurrentPanel={setDestination} />}
      {view === 'Practice' && <ScenesScreen setTab={setDestination} />}
      {view === 'Auditions' && <AuditionsScreen />}
      {view === 'Connect' && <ConnectScreen section={connectSection} setSection={setConnectSection} onBack={() => setView('More')} />}
      {view === 'Login' && <LoginPage />}
      {view === 'Login' && <button onClick={() => setView('Signup')}>Preview signup</button>}
      {view === 'Signup' && <Signup />}
      {view === 'Coach report' && <CDReport report={{ interpretation: { tone: 'Grounded urgency.', subtext: 'Stay with your partner.' }, performance: { objective: 'Win their trust.' }, wardrobe: { recommendation: 'Simple, neutral clothing.' }, lighting: { recommendation: 'Soft light at eye level.' }, framing: { recommendation: 'Keep the reader beside the lens.' } }} onRunAgain={() => setView('More')} />}
      {view === 'Updates' && <WhatsNewModal forceOpen onClose={() => setView('More')} />}
      {view === 'Report issue' && <ReportProblemModal onClose={() => setView('More')} />}
      {view === 'More' && <MoreScreen setCurrentPanel={id => { setDestination(id); setView('Panel'); }} />}
      {view === 'Panel' && <PanelScreen key={destination} panelId={destination} onBack={() => setView('More')} />}
      {view === 'Membership' && <PanelScreen panelId="membership" onBack={() => setView('More')} />}
      {view === 'Compare' && <CompareTakes />}
      {view === 'Compare' && <button onClick={() => { http.defaults.adapter = async config => ({ data: { data: { balance: 8, unlimited: false, plan: 'premium', status: 'active' } }, status: 200, statusText: 'OK', headers: {}, config }); setView('Compared'); }}>Preview ranked results</button>}
      {view === 'Compared' && <Provider store={comparedStore}><CompareTakes /></Provider>}
      {view === 'Notes' && <div className="space-y-4"><TapeReviewNotes review={{ verdict: 'A grounded performance with room to sharpen the eyeline.', tone_tags: ['Grounded', 'Urgent'], whats_working: [{ title: 'Real thinking at the pivot', detail: 'Around 0:23 the turn-out and hand-to-mouth beat is a processing moment. Give the decision time to land.' }], performance: { emotional_arc: 'The urgency grows as the stakes become clear.', strongest_beat: 'The pause before the answer.', choices: 'Keep the partner close.', listening_presence: 'Stay available through the silence.', truth_vs_indicated: 'Let the thought arrive before the expression.' }, adjustments: [{ title: 'Anchor the eyeline', note: 'From about 0:34 through 0:48 your eyes keep dropping to the floor. Put your reader tight beside the lens.', why: 'The connection makes the stakes personal.' }], scores: { framing: 8, eyeline: 5, lighting: 7, energy_commitment: 8, dynamic_range: 6 }, performance_dna: { emotional_range: 8, cold_read: 6, comedy_timing: 5, dramatic_depth: 7, physicality: 6, vocal_variety: 8 } }} /></div>}
      {(view === 'Uploading' || view === 'Processing') && <StudioReviewLoading uploading={view === 'Uploading'} progress={44} />}
      {view === 'Result' && <div className="dst-review-result"><StudioReviewSummary review={{ verdict: 'Sample review for layout testing.', the_one_thing: 'Let the answer land before defending yourself. Give the next line room to arrive.' }} score={7.2} band={{ label: 'Sample result' }} /></div>}
    </main>
    {view !== 'Boot' && <nav className="studio-tab-bar" style={{ position: 'fixed', display: 'flex', alignItems: 'center' }}><StudioTabGlow activeKey={view} />{['Home', 'Uploading', 'Processing', 'Result'].map(name => <button key={name} className="aurora-tab-btn" aria-current={view === name ? 'page' : undefined} onClick={() => setView(name)} style={{ position: 'relative', flex: 1, minHeight: 48, background: 'transparent', border: 0 }}><span>{name}</span></button>)}</nav>}
  </div></BrowserRouter></Provider>;
}
const previewRoot = import.meta.hot?.data.root || createRoot(document.getElementById('root'));
if (import.meta.hot) import.meta.hot.data.root = previewRoot;
previewRoot.render(<QA />);
