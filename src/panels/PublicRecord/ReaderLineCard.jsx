// One line the friend has been asked to read.
//
// The shape is fixed by what a reader actually needs, in this order: what
// was just said to them, what they say back, where they are in the pile,
// and one obvious control. Everything else is a distraction on a phone.

const pad = (n) => String(n).padStart(2, '0');
const clock = (seconds) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

const ReaderLineCard = ({
  line,
  cue,
  position,
  total,
  take,
  isRecording,
  busy,
  recordTimer,
  skipped,
  onRecord,
  onStop,
  onRedo,
  onSkip,
  onUnskip,
}) => {
  const done = Boolean(take);

  return (
    <article
      className={`rdr__card${done ? ' rdr__card--done' : ''}`}
      id={`rdr-line-${line.id}`}
    >
      {cue ? (
        <p className='rdr__cue'>
          <b>{cue.character}:</b> {cue.text}
        </p>
      ) : null}

      <span className='rdr__speaker'>{line.character}</span>
      <p className='rdr__text'>{line.text}</p>

      <div className='rdr__meta'>
        <span>{`Line ${position} of ${total}`}</span>
        {done ? <span>Recorded</span> : null}
        {!done && skipped ? <span>Skipped</span> : null}
      </div>

      {isRecording ? (
        <div className='rdr__controls'>
          <button type='button' className='rdr__btn rdr__btn--stop' onClick={onStop}>
            <span className='rdr__dot rdr__dot--live' aria-hidden='true' />
            Stop
            <span className='rdr__timer'>{clock(recordTimer)}</span>
          </button>
        </div>
      ) : (
        <>
          {done ? <audio className='rdr__player' src={take.url} controls preload='none' /> : null}
          <div className='rdr__controls'>
            {done ? (
              <button type='button' className='rdr__btn' onClick={onRedo} disabled={busy}>
                Record again
              </button>
            ) : (
              <button type='button' className='rdr__btn rdr__btn--record' onClick={onRecord} disabled={busy}>
                <span className='rdr__dot' aria-hidden='true' />
                Record
              </button>
            )}
            {!done && !skipped ? (
              <button type='button' className='rdr__btn rdr__btn--ghost' onClick={onSkip}>
                Skip
              </button>
            ) : null}
            {!done && skipped ? (
              <button type='button' className='rdr__btn rdr__btn--ghost' onClick={onUnskip}>
                Put it back
              </button>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
};

export default ReaderLineCard;
