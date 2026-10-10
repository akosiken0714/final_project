import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

// Moving gradient behind the hero. Only shows on big screens and
// when the visitor has not turned on "reduce motion".
export default function GradientBackground() {
    const [ok, setOk] = useState(false);

    useEffect(() => {
        const bigScreen = window.matchMedia('(min-width: 768px)').matches;
        const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setOk(bigScreen && !calm);
    }, []);

    if (!ok) return null;

    return (
        <motion.div
            className="pointer-events-none absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            transition={{ duration: 2 }}
            style={{
                // fade the bottom edge so it blends into the page
                maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
            }}
            aria-hidden="true"
        >
            <ShaderGradientCanvas style={{ position: 'absolute', inset: 0 }} pixelDensity={1} pointerEvents="none">
                <ShaderGradient
                    control="props"
                    type="waterPlane"
                    animate="on"
                    uSpeed={0.15}
                    uStrength={2}
                    uDensity={1.2}
                    color1="#0F1E2B"
                    color2="#5C8CA8"
                    color3="#F0A98B"
                    grain="off"
                    lightType="3d"
                    brightness={1}
                    cAzimuthAngle={180}
                    cPolarAngle={90}
                    cDistance={3.6}
                    cameraZoom={1}
                />
            </ShaderGradientCanvas>
        </motion.div>
    );
}
