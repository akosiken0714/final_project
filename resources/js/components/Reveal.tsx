import { motion, useReducedMotion } from 'motion/react';
import { PropsWithChildren } from 'react';

type Props = { delay?: number; className?: string };

// Fades and slides up a little when it scrolls into view.
// Short (0.3 s) and small (16 px), and it does nothing at all if the visitor asked for less motion.
export default function Reveal({
    children,
    delay = 0,
    className = '',
}: PropsWithChildren<Props>) {
    const calm = useReducedMotion();

    return (
        <motion.div
            className={className}
            initial={calm ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
                duration: calm ? 0 : 0.3,
                delay: calm ? 0 : delay / 1000,
                ease: [0.2, 0.8, 0.2, 1],
            }}
        >
            {children}
        </motion.div>
    );
}
