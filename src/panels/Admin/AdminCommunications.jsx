import { useCallback, useEffect, useRef, useState } from 'react';
import axiosInstance from '../../redux/http';
import { COMMUNICATIONS_URL } from '../../utils/communications';
import '../../components/communications.css';

const emptyDraft = () => ({ title: '', body: '', cta_label: '', cta_url: '', audience: 'app_users',
  channels: ['inbox', 'banner'], target_ios_version: '', scheduled_at: '', expires_at: '', priority: 0 });
const audienceOptions = [['app_users', 'App accounts'], ['all', 'All customers, including studio accounts'],
  ['new_users', 'New app users · last 7 days'], ['dormant', 'App users · no recorded activity in 30 days'],
  ['needs_review', 'App users · first review not completed'], ['studio', 'Studio customers']];
const errorMessage = error => {
  const data = error.response?.data;
  return data?.detail || data?.message || (data && typeof data === 'object' ? Object.entries(data).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : String(val)}`).join(' · ') : 'Could not connect. Please try again.');
};
const localDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function AdminCommunications() {
  const [draft, setDraft] = useState(emptyDraft);
  const [id, setId] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const guard = useRef(false);
  const refresh = useCallback(async () => {
    const { data } = await axiosInstance.get(COMMUNICATIONS_URL);
    setCampaigns(data.campaigns || []);
  }, []);
  useEffect(() => { refresh().catch(error => setMessage(errorMessage(error))); }, [refresh]);
  const change = (key, val) => { setDraft(d => ({ ...d, [key]: val })); setPreview(null); setMessage(''); };
  const run = async action => {
    if (guard.current) return;
    guard.current = true; setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(errorMessage(error)); }
    finally { guard.current = false; setBusy(false); }
  };
  const save = async (withPreview = false) => {
    const payload = { ...draft, scheduled_at: draft.scheduled_at ? new Date(draft.scheduled_at).toISOString() : null,
      expires_at: draft.expires_at ? new Date(draft.expires_at).toISOString() : null };
    const { data } = id ? await axiosInstance.put(`${COMMUNICATIONS_URL}${id}/`, payload) : await axiosInstance.post(COMMUNICATIONS_URL, payload);
    setId(data.id);
    if (withPreview) {
      const response = await axiosInstance.post(`${COMMUNICATIONS_URL}${data.id}/preview/`);
      setPreview(response.data);
    } else { setPreview(null); setMessage('Draft saved. Nothing has been sent.'); }
    await refresh();
  };
  const launch = () => run(async () => {
    await axiosInstance.post(`${COMMUNICATIONS_URL}${id}/schedule/`, { preview_token: preview.preview_token });
    setDraft(emptyDraft()); setId(null); setPreview(null);
    setMessage('Campaign scheduled. Check delivery progress below.');
    await refresh();
  });
  const edit = c => {
    setDraft({ ...emptyDraft(), ...Object.fromEntries(Object.keys(emptyDraft()).map(k => [k, c[k]])), scheduled_at: localDate(c.scheduled_at), expires_at: localDate(c.expires_at) });
    setId(c.id); setPreview(null); setMessage('Draft opened.');
  };
  return <div className="comms-center">
    <span className="comms-eyebrow">Dr Self Tape · Communications</span>
    <h1>A thoughtful connection.</h1>
    <p>One message. The right audience. A clear next step.</p>
    <div className="comms-actions"><button className="secondary" disabled={busy} onClick={() => { setId(null); setDraft(emptyDraft()); setPreview(null); setMessage('New draft.'); }}>New campaign</button><button className="secondary" disabled={busy} onClick={() => run(refresh)}>Refresh delivery status</button></div>
    {message && <div className="comms-message" role="status">{message}</div>}
    <div className="comms-grid">
      <form onSubmit={e => { e.preventDefault(); run(() => save(true)); }}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <label>Campaign title<input required maxLength={120} value={draft.title} onChange={e => change('title', e.target.value)} placeholder="Your next great take starts here" /></label>
          <label>Message<textarea required maxLength={400} value={draft.body} onChange={e => change('body', e.target.value)} placeholder="A useful, personal note for your actors." /><small>{draft.body.length}/400 characters</small></label>
          <div className="comms-hours"><label>Action label<input maxLength={40} value={draft.cta_label} onChange={e => change('cta_label', e.target.value)} placeholder="Review my tape" /></label><label>Destination<input maxLength={400} value={draft.cta_url} onChange={e => change('cta_url', e.target.value)} placeholder="tape-review or https://…" /></label></div>
          <label>Audience<select value={draft.audience} onChange={e => change('audience', e.target.value)}>{audienceOptions.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select><small>Staff and recognized test accounts are excluded. Activity uses signup, login, device registration, and AI sessions; it does not include every app visit.</small></label>
          <fieldset className="comms-channels"><legend>Where should it appear?</legend>{['inbox', 'banner', 'push', 'email'].map(channel => <label key={channel}><input type="checkbox" checked={draft.channels.includes(channel)} onChange={e => change('channels', e.target.checked ? [...draft.channels, channel] : draft.channels.filter(c => c !== channel))} />{channel.charAt(0).toUpperCase() + channel.slice(1)}</label>)}</fieldset>
          <small>Push takes priority; email is a fallback for people with explicit email permission. Inbox and banner do not require a push token.</small>
          <div className="comms-hours" style={{ marginTop: 20 }}><label>Schedule<input type="datetime-local" value={draft.scheduled_at} onChange={e => change('scheduled_at', e.target.value)} /><small>Leave blank to queue now. Times are in {Intl.DateTimeFormat().resolvedOptions().timeZone}.</small></label><label>Expires<input type="datetime-local" value={draft.expires_at} onChange={e => change('expires_at', e.target.value)} /></label></div>
          <label>iOS release gate (optional)<input value={draft.target_ios_version} onChange={e => change('target_ios_version', e.target.value)} placeholder="1.0.28" /><small>Waits for public App Store availability and limits the audience to accounts with an iOS push token. Use https://apps.apple.com/app/id6770320460 as the destination.</small></label>
          <div className="comms-actions"><button type="button" className="secondary" onClick={() => run(() => save(false))}>Save draft</button><button type="submit">{busy ? 'Working…' : 'Preview audience'}</button></div>
        </fieldset>
      </form>
      <aside className="comms-preview" aria-label="Message preview">
        <span className="comms-eyebrow">Member experience · preview</span>
        <h2>{draft.title || 'A little direction. A stronger take.'}</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{draft.body || 'Your message will appear here as you write. Keep it useful, warm, and easy to act on.'}</p>
        {draft.cta_label && <span className="comms-cta">{draft.cta_label} →</span>}
        <div className="comms-summary">
          {preview ? <>
            <span className="comms-eyebrow">Audience preview · nothing sent yet</span>
            <div className="comms-metrics"><div><strong>{preview.unique_reach}</strong><small>unique accounts</small></div><div><strong>{preview.audience}</strong><small>in audience</small></div></div>
            {Object.entries(preview.channels).map(([channel, count]) => <p key={channel}>{channel === 'ios' ? 'iOS push' : channel === 'android' ? 'Android push' : channel}: <strong>{count}</strong></p>)}
            {Object.entries(preview.exclusions).map(([reason, count]) => <small key={reason}>{reason.replaceAll('_', ' ')}: {count}</small>)}
            {!!Object.keys(preview.exclusions).length && <small>Exclusion reasons can overlap.</small>}
            <p><small>{preview.policy}</small></p>
            {preview.release_gate && <p>{preview.release_gate}</p>}
            <button disabled={busy || !preview.unique_reach} onClick={launch}>{draft.scheduled_at ? 'Schedule this campaign' : 'Queue this campaign now'}</button>
            <small style={{ marginTop: 12 }}>This queues delivery to the previewed audience. Quiet hours may delay push and email. Counts are accounts, not verified human recipients.</small>
          </> : <p>Save and preview to see unique reach, channel eligibility, and exclusions before scheduling.</p>}
        </div>
      </aside>
    </div>
    <section className="comms-history" aria-label="Campaign history"><span className="comms-eyebrow">Campaign journal</span>
      {!campaigns.length && <p>No campaigns yet. Your first draft starts above.</p>}
      {campaigns.map(c => <article key={c.id}><h3>{c.title}</h3><small>{c.status} · {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : 'Not scheduled'}</small>
        {c.block_reason && <p>{c.block_reason}</p>}
        {c.email_paused && ['running', 'scheduled'].includes(c.status) && <><p><small>Check the email provider first. Resuming continues untouched recipients; messages with an unknown outcome are never resent.</small></p><button className="secondary" disabled={busy} onClick={() => run(async () => { await axiosInstance.post(`${COMMUNICATIONS_URL}${c.id}/resume-email/`); await refresh(); })}>Resume remaining email</button></>}
        {!!c.delivery_counts?.length && <table><thead><tr><th>Channel</th><th>Outcome</th><th>Accounts</th></tr></thead><tbody>{c.delivery_counts.map(row => <tr key={`${row.channel}:${row.status}`}><td>{row.channel}</td><td>{row.status === 'accepted' ? (['inbox', 'banner'].includes(row.channel) ? 'Available in app' : 'Provider accepted') : row.status}</td><td>{row.count}</td></tr>)}</tbody></table>}
        {c.status !== 'draft' && <p><small>{c.engagement?.opened || 0} opened · {c.engagement?.clicked || 0} clicked · {c.engagement?.completed_reviews || 0} completed reviews · {c.engagement?.dismissed || 0} dismissed. Reviews are attributed to the last campaign click within 30 minutes. Provider acceptance does not confirm delivery or an open.</small></p>}
        {c.status === 'draft' ? <button disabled={busy} className="secondary" onClick={() => edit(c)}>Edit draft</button> : ['scheduled', 'running', 'completed'].includes(c.status) && <button disabled={busy} className="secondary" onClick={() => run(async () => { await axiosInstance.post(`${COMMUNICATIONS_URL}${c.id}/cancel/`); await refresh(); setMessage('Remaining deliveries cancelled and campaign banner removed. Already accepted messages cannot be recalled.'); })}>Cancel remaining / hide banner</button>}
      </article>)}
    </section>
  </div>;
}
