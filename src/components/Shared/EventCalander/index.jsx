import { useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// Local Imports
import './index.css';
import { getStatusStyles } from '../../../utils/utils';

const CustomEvent = ({ title, status }) => {
  return (
    <div className={`${getStatusStyles(status)} p-1 rounded text-white min-h-fit hover:shadow-[0_2px_5px_0px_rgba(0,0,0,0.5)] transition-all duration-200`}>
      <p className='font-medium text-xs flex flex-wrap'>{title}</p>
    </div>
  );
};

const CalendarEvent = ({
  events,
  initialView = 'dayGridMonth',
  onEventClick,
  calendarRef,
}) => {

  const [searchParams, setSearchParams] = useSearchParams();
  initialView = searchParams.get('view') === 'month' ? 'dayGridMonth' : searchParams.get('view') === 'week' ? 'timeGridWeek' : searchParams.get('view') === 'day' ? 'timeGridDay' : initialView;

  return (
    <div className='bg-white rounded-xl h-full'>
      <div className='font-sans calendar-wrapper'>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={initialView}
          events={events}
          calendarRef={calendarRef}
          eventClick={onEventClick}
          eventMouseEnter={(info) => {
            info.el.style.cursor = 'pointer';
          }}
          datesSet={(info) => {
            if (info.view.type === 'dayGridMonth') {
              setSearchParams({ view: 'month' });
            } else if (info.view.type === 'timeGridWeek') {
              setSearchParams({ view: 'week' });
            } else if (info.view.type === 'timeGridDay') {
              setSearchParams({ view: 'day' });
            }
          }}
          headerToolbar={{
            left: 'title',
            right: 'prev,next,today,dayGridMonth,timeGridWeek,timeGridDay',
          }}
          views={{
            dayGridMonth: {
              dayMaxEventRows: 3,
            },
            timeGridWeek: {
              allDayText: 'All Day',
            },
            timeGridDay: {
              allDayText: 'All Day',
            },
          }}
          customButtons={{}}
          fixedWeekCount={false}
          eventContent={(info) => (
            <CustomEvent
              title={info.event.title}
              status={info.event.extendedProps.audition_status}
            />
          )}
          height='100%'
        />
      </div>
    </div>
  );
};

export default CalendarEvent;
