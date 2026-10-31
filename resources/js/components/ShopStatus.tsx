import { useEffect, useState } from 'react';

// Opening hours, by weekday (0 = Sunday), 24-hour clock: [open, close].
// Keep this in step with SHOP.hours in pages/welcome.tsx (Mon-Sat 8 AM-7 PM, Sun 9 AM-5 PM).
const HOURS: Record<number, [number, number]> = {
    0: [9, 17],
    1: [8, 19],
    2: [8, 19],
    3: [8, 19],
    4: [8, 19],
    5: [8, 19],
    6: [8, 19],
};

const DAYS: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};

const clock = (h: number) => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;

// "Now" in the Philippines, whatever the visitor's phone clock says.
function manilaNow() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';

    return {
        day: DAYS[get('weekday')] ?? 0,
        minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
    };
}

function statusNow(): { open: boolean; text: string } {
    const { day, minutes } = manilaNow();
    const [open, close] = HOURS[day];

    if (minutes >= open * 60 && minutes < close * 60) {
        return close * 60 - minutes <= 60
            ? {
                  open: true,
                  text: `Malapit nang magsara · sara ${clock(close)}`,
              }
            : { open: true, text: `Bukas na · sara ${clock(close)}` };
    }

    if (minutes < open * 60) {
        return { open: false, text: `Sarado pa · bukas ${clock(open)}` };
    }

    return {
        open: false,
        text: `Sarado na · bukas ${clock(HOURS[(day + 1) % 7][0])}`,
    };
}

// Small live "open / closed" badge. Worked out in the browser so it is never stale.
export default function ShopStatus() {
    const [s, setS] = useState<{ open: boolean; text: string } | null>(null);

    useEffect(() => {
        setS(statusNow());
        const id = window.setInterval(() => setS(statusNow()), 60_000);

        return () => window.clearInterval(id);
    }, []);

    if (!s) return null;

    return (
        <span
            role="status"
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-pw-cream/20 px-3 py-1 text-sm text-pw-cream"
        >
            <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${s.open ? 'bg-pw-peach' : 'bg-pw-cream/40'}`}
            />
            {s.text}
        </span>
    );
}
