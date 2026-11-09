import { ArrowUpRight, ArrowRight, FileText, Users, Film } from 'lucide-react';
import './future-studio.css';

export default function StudioHomeHero({ firstReview = false, onReview, onPractice, onReaders, balance, unlimited, balanceLoading, balanceError, onMembership }) {
  const balanceLabel = balanceLoading ? 'Checking AI balance…'
    : balanceError || balance == null ? 'View your AI plan'
      : unlimited ? 'Unlimited AI · fair use applies' : `${balance} AI tokens available`;
  return (
    <section className="future-home-feature" aria-label="Your acting studio">
      <div className="future-home-intro">
        <span className="future-eyebrow">Your next great take starts here</span>
        <h2>Make the scene<br />your own.</h2>
        <p>A little preparation. A stronger performance.</p>
      </div>
      <div className="future-hero-card">
        <div className="future-hero-top"><span className="future-eyebrow">Your performance, in focus</span><Film size={19} aria-hidden="true" /></div>
        <h3>{firstReview ? 'Your first review.\nA fresh perspective.' : 'Your take.\nYour next breakthrough.'}</h3>
        <p>See what landed, what needs attention, and an adjustment to try before your next take.</p>
        <button type="button" className="future-primary" onClick={onReview}>{firstReview ? 'Get my first notes' : 'Review a new tape'}<ArrowRight size={19} aria-hidden="true" /></button>
        {onMembership && <button type="button" className="future-balance" onClick={onMembership}>{balanceLabel}<ArrowUpRight size={14} aria-hidden="true" /></button>}
      </div>
      <div className="future-tools" aria-label="Studio tools">
        {[
          { label: 'Bring your sides', detail: 'Run lines with AI', action: onPractice, icon: <FileText size={23} aria-hidden="true" /> },
          { label: 'Review a take', detail: 'Find your next adjustment', action: onReview, icon: <Film size={23} aria-hidden="true" /> },
          { label: 'Find a reader', detail: 'Work with another actor', action: onReaders, icon: <Users size={23} aria-hidden="true" /> },
        ].map(({ label, detail, action, icon }) => <button type="button" key={label} onClick={action} className="future-tool">{icon}<strong>{label}</strong><span>{detail}</span></button>)}
      </div>
    </section>
  );
}
