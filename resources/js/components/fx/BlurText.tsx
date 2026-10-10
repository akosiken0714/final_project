import { motion } from 'motion/react';

// React Bits style "BlurText": every word fades in from a blur, one after another.
export default function BlurText({
    text,
    className = '',
    delay = 0,
}: {
    text: string;
    className?: string;
    delay?: number;
}) {
    const words = text.split(' ');

    return (
        <p className={className}>
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    className="inline-block"
                    initial={{ opacity: 0, filter: 'blur(10px)', y: 12 }}
                    whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                        duration: 0.6,
                        delay: delay + i * 0.08,
                        ease: 'easeOut',
                    }}
                >
                    {word}
                    {i < words.length - 1 ? '\u00A0' : ''}
                </motion.span>
            ))}
        </p>
    );
}
