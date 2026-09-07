import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from '../../../redux/http';
import { useTokenBalance } from '../../../hooks/useTokenBalance';
import { goUpgrade } from '../../../utils/goUpgrade';
import DesktopPerformanceDNA from './DesktopPerformanceDNA';
import { DNA_KEYS, dnaNumber } from './dnaReviewHistory';

// Read the latest gated review, never the unrestricted actor-memory aggregate.
export default function DesktopDNAOverview() {
  const { isPaid, loading, error, balance } = useTokenBalance();
  const userId = useSelector(state => state.auth?.user?.id);
  const firstName = useSelector(state => state.profile?.profile?.first_name);
  const locked = !loading && !error && balance !== null && !isPaid;
  const [result, setResult] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (locked) return;
    const controller = new AbortController();
    setResult(null); setFailed(false);
    axios.get('/v1/ai/session-log/latest-review/', { signal: controller.signal }).then(({ data }) => {
      if (data?.success === false) throw new Error('Could not load DNA');
      if (!controller.signal.aborted) setResult({ userId, row: data && Object.hasOwn(data, 'data') ? data.data : data });
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [locked, userId, attempt]);
  if (locked) return <section className="noir-dna"><h3>Performance DNA</h3><p>Your full performance profile is included with a plan.</p><button type="button" onClick={() => goUpgrade({ source: 'performance_dna', returnTo: 'jericho' })}>Unlock your full read</button></section>;
  if (failed) return <section className="noir-dna"><p role="alert">Your latest DNA could not be loaded.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></section>;
  if (!result || result.userId !== userId) return <section className="noir-dna"><p role="status">Loading your latest DNA…</p></section>;
  const dna = result.row?.ai_feedback?.performance_dna;
  if (!DNA_KEYS.some(key => dnaNumber(dna?.[key]) !== null)) return <section className="noir-dna"><h3>Performance DNA</h3><p>No DNA scores are available for your latest review.</p></section>;
  return <DesktopPerformanceDNA key={`${userId}:${result.row.id}`} dna={dna} firstName={firstName} />;
}
