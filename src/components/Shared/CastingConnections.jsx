import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import axios from '../../redux/http';
import { baseURL } from '../../redux/constant';
import { fetchUserSettings, setLocalSetting } from '../../redux/features/userSettings/userSettingsSlice';
import { usePushNotifications, openNotificationSettings } from '../../hooks/usePushNotifications';
import { openExternal } from '../../utils/openExternal';
import { CASTING_PROVIDERS, normalizeCastingProfile } from '../../utils/castingProfiles';
import './CastingConnections.css';

const identity = (state) => state.auth?.user?.id ?? state.auth?.user?.email;

export default function CastingConnections() {
  const account = useSelector(identity);
  // Remount all drafts when accounts change; never carry a previous actor's URL.
  return <Connections key={account || 'signed-out'} account={account} />;
}

function Connections({ account }) {
  const dispatch = useDispatch();
  const store = useStore();
  const settings = useSelector(s => s.userSettings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  const push = usePushNotifications();
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const current = () => mounted.current && identity(store.getState()) === account;
  const save = async (key, value) => {
    if (busy || !account || !settings?.loaded) return false;
    setBusy(true); setMessage('');
    try {
      const response = await axios.patch(`${baseURL}/v1/users/settings/`, { data: { [key]: value } });
      if (response.data?.data?.data?.[key] !== value) throw new Error('Unconfirmed save');
      if (!current()) return false;
      dispatch(setLocalSetting({ key, value }));
      setMessage('Saved to your DST account.');
      return true;
    } catch {
      if (current()) setMessage('Could not save. Your previous setting is unchanged. Please try again.');
      return false;
    } finally { if (current()) setBusy(false); }
  };
  const disabled = busy || !account || !settings?.loaded;
  return <section className="casting-connections" aria-label="Casting profiles and alerts">
    <p className="casting-eyebrow">YOUR ACTING CAREER</p>
    <h2>Profiles & audition alerts</h2>
    <p>Keep your public casting profiles close. These links stay in your DST account; saving one does not connect your private inbox or verify profile ownership.</p>
    {!settings?.loaded && <button type="button" onClick={() => dispatch(fetchUserSettings())}>Load profile settings</button>}
    {CASTING_PROVIDERS.map(provider => <Provider key={provider.key} provider={provider}
      saved={settings?.data?.[provider.key] || ''} disabled={disabled} save={save} />)}
    <div className="casting-alerts">
      <h3>Stay ahead of your next audition</h3>
      <p>Reminders cover auditions with deadlines saved in DST. Public profile links do not bring in new messages from Actors Access or Casting Networks.</p>
      <label><input type="checkbox" role="switch" disabled={disabled}
        checked={!settings?.data?.audition_nudges_opt_out}
        onChange={e => save('audition_nudges_opt_out', !e.target.checked)} /> Audition reminders</label>
      <p className="casting-small">Includes deadline reminders in the two days before an audition and occasional practice nudges. Quiet hours are 10 pm–8 am in your account timezone. Delivery depends on notification permissions and service availability.</p>
      {push.subscribed ? <p>Notifications registered on this device.</p> : push.permission === 'denied'
        ? <button type="button" onClick={openNotificationSettings}>Open notification settings</button>
        : push.supported ? <button type="button" onClick={push.subscribe}>Enable device notifications</button>
          : <p className="casting-small">For push alerts, use the DST app or a supported browser. On iPhone Safari, add DST to your Home Screen first.</p>}
      <p className="casting-small">Open More → Auditions to track your auditions. Always check the original casting notice for the latest deadline and instructions.</p>
    </div>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}

function Provider({ provider, saved, disabled, save }) {
  const [draft, setDraft] = useState(saved);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  // A late settings load may populate untouched drafts, but must not erase edits.
  useEffect(() => { if (!editing) setDraft(saved); }, [saved, editing]);
  let validSaved = '';
  try { validSaved = normalizeCastingProfile(provider.key, saved); } catch { /* unsafe stored URL is never opened */ }
  const open = async url => {
    try { if (!await openExternal(url)) setError('Could not open the page. Please try again.'); }
    catch { setError('Could not open the page. Please try again.'); }
  };
  return <div className="casting-provider">
    <h3>{provider.name}</h3>
    <p className="casting-small">{validSaved ? 'Public profile link saved' : 'Add your public profile link'}</p>
    <details><summary>How to find your {provider.name} link</summary>
      <ol>{provider.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <button type="button" onClick={() => open(provider.help)}>Official step-by-step guide ↗</button>
    </details>
    <form onSubmit={async e => {
      e.preventDefault(); setError('');
      try {
        const value = normalizeCastingProfile(provider.key, draft);
        if (!value) { setError('Paste a profile link, or use Remove to unlink.'); return; }
        if (await save(provider.key, value)) { setDraft(value); setEditing(false); }
      } catch (err) { setError(err.message); }
    }}>
      <label htmlFor={provider.key}>{provider.name} public URL</label>
      <input id={provider.key} type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
        placeholder={provider.placeholder} value={draft} disabled={disabled}
        aria-invalid={!!error} aria-describedby={`${provider.key}-error`}
        onChange={e => { setDraft(e.target.value); setEditing(true); setError(''); }} />
      <div className="casting-actions">
        <button type="submit" disabled={disabled}>Save link</button>
        {validSaved && <button type="button" onClick={() => open(validSaved)}>View profile ↗</button>}
        {saved && <button type="button" disabled={disabled} onClick={async () => {
          if (await save(provider.key, '')) { setDraft(''); setEditing(false); setError(''); }
        }}>Remove</button>}
      </div>
      <p id={`${provider.key}-error`} role="alert">{error}</p>
    </form>
  </div>;
}
