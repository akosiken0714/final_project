import { animate, useInView } from 'motion/react';
import { useEffect, useRef } from 'react';

// React Bits style "CountUp": counts from 0 to a number when it scrolls into view.
export default function CountUp({
    to,
    duration = 1.4,
}: {
    to: number;
    duration?: number;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true });

    useEffect(() => {
        if (!inView || !ref.current) return;
        const el = ref.current;
        const controls = animate(0, to, {
            duration,
            ease: 'easeOut',
            onUpdate: (v) => {
                el.textContent = Math.round(v).toString();
            },
        });
        return () => controls.stop();
    }, [inView, to, duration]);

    // starts at 0, then the effect above counts up to the real number
    return <span ref={ref}>0</span>;
}
