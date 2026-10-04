import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import axios from '../../redux/http';
import { setAiConsentAcceptedAt } from '../../redux/features/auth/authSlice';
import { requestAiConsent } from './consentRequest';

export default function AIConsentSettings() {
  const user = useSelector(state => state.auth?.user);
  const store = useStore();
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const invalidate = () => { generation.current++; };
    let id = store.getState().auth?.user?.id;
    const unsubscribe = store.subscribe(() => {
      const next = store.getState().auth?.user?.id;
      if (next !== id) {
        id = next; generation.current++; pending.current = false;
        setBusy(false); setError('');
      }
    });
    return () => { invalidate(); unsubscribe(); };
  }, [store]);

  const change = async () => {
    if (pending.current || !user?.id) return;
    pending.current = true; setBusy(true); setError('');
    const version = generation.current;
    try {
      if (user.ai_consent_accepted_at) {
        const { data } = await axios.delete('/v1/users/ai-consent/');
        if (version !== generation.current) return;
        if (data?.data?.ai_consent_accepted_at !== null) throw new Error('Not confirmed');
        dispatch(setAiConsentAcceptedAt(null));
      } else {
        await requestAiConsent();
      }
    } catch {
      if (version === generation.current) setError('Could not update AI consent. Please try again.');
    } finally {
      if (version === generation.current) { pending.current = false; setBusy(false); }
    }
  };
  if (!user?.id) return null;
  return <section className="aurora-card p-5 my-5" aria-label="AI privacy">
    <h2 className="text-lg font-semibold" style={{ color: 'var(--aurora-text)' }}>AI privacy</h2>
    <p className="text-sm my-3" style={{ color: 'var(--aurora-sub)' }}>
      {user.ai_consent_accepted_at
        ? 'AI consent is on. You can turn it off for future AI requests. This does not delete existing reviews or cancel work already submitted.'
        : 'AI consent is off. You can still use the rest of the app. Review what is shared before choosing to turn it on.'}
    </p>
    <button type="button" disabled={busy} onClick={change} className="px-4 py-3 rounded-xl border font-semibold"
      style={{ color: 'var(--aurora-text)', borderColor: 'var(--aurora-line)' }}>
      {busy ? 'Updating…' : user.ai_consent_accepted_at ? 'Turn off AI consent' : 'Review AI consent'}
    </button>
    {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
  </section>;
}
