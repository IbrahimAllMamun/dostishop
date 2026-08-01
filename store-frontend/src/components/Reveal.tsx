'use client';
import { useEffect, useRef, useState } from 'react';

/** Fades a section up as it scrolls into view.
 *
 *  Two safety rails, both deliberate:
 *  - the hidden state is a class, and `globals.css` has a <noscript> override plus a
 *    reduced-motion override, so content is never left invisible when JS or motion is off
 *  - it disconnects after the first reveal; re-animating on every scroll is noise
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already in view on first paint (above the fold): show immediately, no observer.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? 'animate-fade-up' : ''} ${className}`}
      style={shown && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
