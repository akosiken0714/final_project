import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function Flash() {
    const { flash }: any = usePage().props;
    const msg = flash?.success;
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!msg) return;
        setShow(true);
        const t = setTimeout(() => setShow(false), 4500);
        return () => clearTimeout(t);
    }, [msg]);

    if (!msg || !show) return null;

    return (
        <div role="status" className="fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-full bg-[#F0A98B] px-6 py-3 text-sm font-semibold text-[#0F1E2B] shadow-xl">
            {msg}
        </div>
    );
}