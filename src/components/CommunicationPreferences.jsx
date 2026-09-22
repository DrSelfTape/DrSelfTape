import { useEffect, useState } from 'react';
import axiosInstance from '../redux/http';
import { COMMUNICATIONS_URL } from '../utils/communications';
import './communications.css';

export default function CommunicationPreferences() {
  const [value, setValue] = useState(null);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let alive = true;
    axiosInstance.get(`${COMMUNICATIONS_URL}preferences/`).then(({ data }) => {
      if (alive) setValue(data);
    }).catch(() => { if (alive) setStatus('Preferences could not load. Close and reopen to retry.'); });
    return () => { alive = false; };
  }, []);
  const update = (key, val) => { setValue(v => ({ ...v, [key]: val })); setStatus(''); };
  const save = async () => {
    if (saving) return;
    setSaving(true); setStatus('');
    try {
      const { data } = await axiosInstance.patch(`${COMMUNICATIONS_URL}preferences/`, value);
      setValue(data); setStatus('Your preferences are saved.');
    } catch { setStatus('Could not save. Please try again.'); }
    finally { setSaving(false); }
  };
  return <section className="comms-preferences" aria-label="Notification preferences">
    <h3>Your time. Your preferences.</h3>
    <p>Choose how Dr Self Tape shares app news, offers, and practice tips. Your inbox stays available. Booking, account, and audition messages keep their existing settings.</p>
    {value && <>
      <label><input type="checkbox" checked={value.campaign_push} onChange={e => update('campaign_push', e.target.checked)} /> App news by push notification</label>
      <small>Also requires notifications to be enabled in your device settings.</small>
      <label><input type="checkbox" checked={value.campaign_email} onChange={e => update('campaign_email', e.target.checked)} /> I want app news and offers by email</label>
      <small>You can unsubscribe at any time.</small>
      <label>Timezone<input value={value.timezone} onChange={e => update('timezone', e.target.value)} placeholder="America/Los_Angeles" /></label>
      <div className="comms-hours">{[['quiet_start', 'Quiet hours start'], ['quiet_end', 'Quiet hours end']].map(([key, label]) => <label key={key}>{label}<select value={value[key]} onChange={e => update(key, Number(e.target.value))}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select></label>)}</div>
      <small>Applies to campaign push and email. Matching start and end times turn quiet hours off.</small>
      <button type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button>
    </>}
    <p role="status">{status || (!value ? 'Loading preferences…' : '')}</p>
  </section>;
}
