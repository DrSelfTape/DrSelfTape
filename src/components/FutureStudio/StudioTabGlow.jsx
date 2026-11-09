import { useLayoutEffect, useRef } from 'react';

/** Measures the existing buttons; keeps all navigation and badge logic intact. */
export default function StudioTabGlow({ activeKey }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const glow = ref.current;
    const nav = glow?.parentElement;
    if (!nav) return;
    const position = () => {
      const active = nav.querySelector('[aria-current="page"]');
      glow.style.opacity = active ? '1' : '0';
      if (!active) return;
      glow.style.width = `${active.offsetWidth}px`;
      glow.style.height = `${active.offsetHeight}px`;
      glow.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    };
    position();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position);
    observer?.observe(nav);
    window.addEventListener('resize', position);
    return () => { observer?.disconnect(); window.removeEventListener('resize', position); };
  }, [activeKey]);
  return <span ref={ref} className="future-tab-glow" aria-hidden="true" />;
}
