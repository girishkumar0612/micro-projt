import { useEffect, useRef } from 'react';

// Keeps a container scrolled to the bottom unless the user has scrolled up.
export function useAutoScroll<T>(dep: T) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (pinned.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [dep]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const threshold = 80;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  return { ref, onScroll, pinned };
}
