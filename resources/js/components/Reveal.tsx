import { motion } from 'motion/react';
import { PropsWithChildren } from 'react';

type Props = { delay?: number; className?: string };

// Fades and slides up when it scrolls into view (now powered by motion).
export default function Reveal({
    children,
    delay = 0,
    className = '',
}: PropsWithChildren<Props>) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
                duration: 0.9,
                delay: delay / 1000,
                ease: [0.2, 0.8, 0.2, 1],
            }}
        >
            {children}
        </motion.div>
    );
}
