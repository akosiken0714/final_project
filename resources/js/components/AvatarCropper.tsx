import { useEffect, useRef, useState, type PointerEvent } from 'react';

const STAGE = 280; // size of the square crop area on screen (px)
const OUTPUT = 400; // size of the finished picture (px)

// A small crop window: drag the picture to move it, use the slider to zoom.
// Gives back a square JPEG File that is exactly what the circle shows.
export default function AvatarCropper({
    src,
    onCancel,
    onDone,
}: {
    src: string;
    onCancel: () => void;
    onDone: (file: File) => void;
}) {
    const imgRef = useRef<HTMLImageElement>(null);
    const [size, setSize] = useState<{ w: number; h: number } | null>(null); // the picture's real size
    const [zoom, setZoom] = useState(1); // 1 = just fills the square, 3 = three times closer
    const [pos, setPos] = useState({ x: 0, y: 0 }); // where the picture's top-left corner sits in the square
    const drag = useRef<{
        startX: number;
        startY: number;
        x: number;
        y: number;
    } | null>(null);

    // How big the picture is drawn at a given zoom.
    const scaleFor = (z: number) =>
        size ? Math.max(STAGE / size.w, STAGE / size.h) * z : 1;

    // Keeps the picture covering the whole square (no empty edges).
    const keepInside = (x: number, y: number, z: number) => {
        if (!size) return { x, y };
        const s = scaleFor(z);
        return {
            x: Math.min(0, Math.max(STAGE - size.w * s, x)),
            y: Math.min(0, Math.max(STAGE - size.h * s, y)),
        };
    };

    // When the picture loads, centre it.
    const loaded = () => {
        const img = imgRef.current;
        if (!img) return;
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const s = Math.max(STAGE / w, STAGE / h);
        setSize({ w, h });
        setPos({ x: (STAGE - w * s) / 2, y: (STAGE - h * s) / 2 });
    };

    // Escape closes the window.
    useEffect(() => {
        const esc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', esc);
        return () => document.removeEventListener('keydown', esc);
    }, [onCancel]);

    const down = (e: PointerEvent) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = {
            startX: e.clientX,
            startY: e.clientY,
            x: pos.x,
            y: pos.y,
        };
    };

    const move = (e: PointerEvent) => {
        if (!drag.current) return;
        const nx = drag.current.x + (e.clientX - drag.current.startX);
        const ny = drag.current.y + (e.clientY - drag.current.startY);
        setPos(keepInside(nx, ny, zoom));
    };

    const up = () => {
        drag.current = null;
    };

    // Zooming keeps whatever is in the middle of the square in the middle.
    const changeZoom = (z: number) => {
        if (!size) return;
        const oldS = scaleFor(zoom);
        const newS = scaleFor(z);
        const centreX = (STAGE / 2 - pos.x) / oldS;
        const centreY = (STAGE / 2 - pos.y) / oldS;
        setZoom(z);
        setPos(
            keepInside(
                STAGE / 2 - centreX * newS,
                STAGE / 2 - centreY * newS,
                z,
            ),
        );
    };

    // Draw the visible part onto a canvas and hand it back as a file.
    const finish = () => {
        const img = imgRef.current;
        if (!img || !size) return;
        const s = scaleFor(zoom);

        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT;
        canvas.height = OUTPUT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, OUTPUT, OUTPUT);
        ctx.drawImage(
            img,
            -pos.x / s,
            -pos.y / s,
            STAGE / s,
            STAGE / s,
            0,
            0,
            OUTPUT,
            OUTPUT,
        );

        canvas.toBlob(
            (blob) => {
                if (blob)
                    onDone(
                        new File([blob], 'profile.jpg', { type: 'image/jpeg' }),
                    );
            },
            'image/jpeg',
            0.9,
        );
    };

    const s = scaleFor(zoom);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Crop your picture"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
            <div className="bg-background text-foreground w-full max-w-sm rounded-2xl border p-5 shadow-2xl">
                <p className="text-base font-semibold">Crop your picture</p>
                <p className="text-muted-foreground mt-1 text-xs">
                    Drag to move it. Use the slider to zoom. The circle is what
                    people will see.
                </p>

                <div
                    className="relative mx-auto mt-4 cursor-grab touch-none overflow-hidden rounded-xl bg-black select-none active:cursor-grabbing"
                    style={{ width: STAGE, height: STAGE }}
                    onPointerDown={down}
                    onPointerMove={move}
                    onPointerUp={up}
                    onPointerCancel={up}
                >
                    <img
                        ref={imgRef}
                        src={src}
                        alt="Picture to crop"
                        draggable={false}
                        onLoad={loaded}
                        style={{
                            position: 'absolute',
                            left: pos.x,
                            top: pos.y,
                            width: size ? size.w * s : 'auto',
                            height: size ? size.h * s : 'auto',
                            maxWidth: 'none',
                        }}
                    />
                    {/* the circle guide: everything outside it is dimmed */}
                    <div
                        className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90"
                        style={{ boxShadow: '0 0 0 999px rgba(0,0,0,0.55)' }}
                    />
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">Zoom</span>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => changeZoom(Number(e.target.value))}
                        aria-label="Zoom"
                        className="w-full"
                    />
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={finish}
                        disabled={!size}
                        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    >
                        Use this picture
                    </button>
                </div>
            </div>
        </div>
    );
}
