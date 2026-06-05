/**
 * Upcoming Callbacks — Dashboard Home widget
 * src/components/UpcomingCallbacks.jsx
 *
 * Shows audition callbacks in the next 7 days.
 * Meant to be dropped into DashboardHome alongside the existing stats/charts.
 *
 * Usage in Dashboard/Home/index.jsx:
 *   import UpcomingCallbacks from '../../../components/UpcomingCallbacks';
 *   // Then inside the JSX:
 *   <UpcomingCallbacks />
 */

import { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { fetchTrackerThunk } from '../redux/features/auditions/auditionsSlice';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const TYPE_DOT = {
  film: 'bg-orange-400',
  commercial: 'bg-blue-400',
  theatrical: 'bg-violet-400',
  industrial: 'bg-gray-400',
  theater: 'bg-green-400',
  voiceover: 'bg-yellow-400',
};

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const dMid = new Date(d);
  dMid.setHours(0, 0, 0, 0);
  const nowMid = new Date();
  nowMid.setHours(0, 0, 0, 0);
  const diff = Math.round((dMid - nowMid) / 86400000);
  if (diff === 0) return { text: 'Today', urgent: true };
  if (diff === 1) return { text: 'Tomorrow', urgent: true };
  return {
    text: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    urgent: false,
  };
}

export default function UpcomingCallbacks() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tracker } = useSelector((state) => state.auditions);

  useEffect(() => {
    // If tracker hasn't loaded yet (e.g. landing on Home first), fetch it
    if (!tracker?.data) {
      dispatch(fetchTrackerThunk());
    }
  }, [dispatch, tracker?.data]);

  const upcoming = useMemo(() => {
    const data = tracker?.data || {};
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(todayStart.getTime() + 7 * 86400000);
    const all = [];

    // Collect from all columns
    for (const colItems of Object.values(data)) {
      for (const item of colItems) {
        if (!item.callback_date) continue;
        const cbDate = new Date(item.callback_date);
        if (cbDate >= todayStart && cbDate <= weekFromNow) {
          all.push(item);
        }
      }
    }

    // Sort nearest first
    all.sort((a, b) => new Date(a.callback_date) - new Date(b.callback_date));
    return all;
  }, [tracker]);

  if (upcoming.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar size={16} className="text-[#7A5A18]" />
            Upcoming Callbacks
          </CardTitle>
          <button
            onClick={() => navigate('/dashboard/auditions')}
            className="text-xs text-[#7A5A18] hover:text-[#A040C8] font-medium flex items-center gap-0.5 transition-colors"
          >
            View all <ChevronRight size={12} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.map((item) => {
          const dl = dayLabel(item.callback_date);
          return (
            <div
              key={item.id}
              onClick={() => navigate('/dashboard/auditions')}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                transition-all duration-150 hover:bg-[#F4F4EE]
                ${dl.urgent ? 'bg-[#F4F4EE]/60 ring-1 ring-[#FF8280]/20' : 'bg-[#F4F4EE]'}
              `}
            >
              {/* Type dot */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[item.project_type] || 'bg-gray-400'}`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0A0A0A] truncate">
                  {item.project_title}
                </p>
                {item.character && (
                  <p className="text-xs text-[rgba(10,10,10,0.62)] truncate">as {item.character}</p>
                )}
              </div>

              {/* Date label */}
              <span
                className={`
                  shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
                  ${dl.urgent
                    ? 'bg-[#D4A85F] text-[#0A0A0A]'
                    : 'bg-[#F4F4EE] text-[rgba(10,10,10,0.62)]'
                  }
                `}
              >
                {dl.urgent && <AlertCircle size={10} />}
                {dl.text}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
