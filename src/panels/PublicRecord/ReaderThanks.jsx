// What the friend sees once their takes are in.
//
// THE WHOLE POINT OF THIS SCREEN: the page they were sent ends here, and
// until now the end was a dead end. This person just did a favour for an
// actor, which makes them the warmest audience we will ever get in front
// of, and they have an account with nobody.
//
// Two rules about the offer below:
//   1. The favour comes first. The confirmation is the heading; the offer
//      is under a rule, further down the page, and it never covers, gates
//      or delays anything.
//   2. One action. Not a tour, not a feature list, not an email capture.

const ReaderThanks = ({ title, body, actionLabel, onAction, onCtaClick }) => (
  <>
    <h1 className='rdr__thanks-title'>{title}</h1>
    <p className='rdr__body'>{body}</p>

    {actionLabel ? (
      <div className='rdr__controls'>
        <button type='button' className='rdr__btn' onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    ) : null}

    <section className='rdr__offer'>
      <h2>Want to know how your own tape reads?</h2>
      <p>
        Dr Self Tape watches your take and tells you what casting will see, before
        casting sees it. Specific notes on what landed and what did not, back in a
        couple of minutes. Your first one is free.
      </p>
      <a
        className='rdr__btn rdr__btn--cta'
        href='/signup?src=reader_invite'
        onClick={onCtaClick}
      >
        Get a read on my tape
      </a>
      <p className='rdr__fineprint'>Nothing to install. It runs in this browser.</p>
    </section>
  </>
);

export default ReaderThanks;
