import { PropsWithChildren, useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';

// React Bits style "SpotlightCard": a soft light follows your mouse over the card.
export default function SpotlightCard({
    children,
    className = '',
}: PropsWithChildren<{ className?: string }>) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(-200);
    const y = useMotionValue(-200);
    const glow = useMotionTemplate`radial-gradient(220px circle at ${x}px ${y}px, rgba(240,169,139,0.18), transparent 70%)`;

    const move = (e: React.PointerEvent<HTMLDivElement>) => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        x.set(e.clientX - box.left);
        y.set(e.clientY - box.top);
    };

    return (
        <div
            ref={ref}
            onPointerMove={move}
            className={`relative overflow-hidden ${className}`}
        >
            <motion.div
                className="pointer-events-none absolute inset-0"
                style={{ background: glow }}
                aria-hidden="true"
            />
            <div className="relative">{children}</div>
        </div>
    );
}
