import { expect, test } from '@playwright/test';

// Phone rules from docs/DESIGN-SYSTEM.md. These run on the two phone projects and a plain 360px-wide window.
test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

const FIELDS = "input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]):not([data-input-otp]), select, textarea";

for (const path of ['/login', '/register']) {
    test(`${path}: fields are 16px+ (no iPhone zoom) and 44px+ tall`, async ({ page }) => {
        await page.goto(path);
        const bad = await page.$$eval(FIELDS, (els) =>
            els
                .filter((e) => (e as HTMLElement).offsetParent !== null)
                .map((e) => {
                    const r = (e as HTMLElement).getBoundingClientRect();
                    return { name: (e as HTMLInputElement).name || e.tagName, size: parseFloat(getComputedStyle(e).fontSize), h: Math.round(r.height) };
                })
                .filter((f) => f.size < 16 || f.h < 44),
        );
        expect(bad, 'fields that are too small on a phone').toEqual([]);
    });
}

test('landing: no sideways scroll at 360px', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
});

test('landing: every .btn is at least 44px tall', async ({ page }) => {
    await page.goto('/');
    const small = await page.$$eval('.btn', (els) =>
        els.filter((e) => (e as HTMLElement).offsetParent !== null && e.getBoundingClientRect().height < 43.5).map((e) => e.textContent?.trim()),
    );
    expect(small).toEqual([]);
});

test('landing: scrolling does not freeze the page (long-task budget)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'PerformanceObserver longtask is Chromium only');
    await page.goto('/');
    await page.evaluate(() => {
        (window as any).__long = 0;
        new PerformanceObserver((l) => l.getEntries().forEach((e) => ((window as any).__long += e.duration))).observe({ entryTypes: ['longtask'] });
    });
    for (let i = 0; i < 12; i++) {
        await page.mouse.wheel(0, 700);
        await page.waitForTimeout(80);
    }
    const blocked = await page.evaluate(() => (window as any).__long as number);
    // Total main-thread blocking while scrolling the whole page. This number is a guide, tune it after your first run.
    expect(blocked, 'ms of long tasks while scrolling').toBeLessThan(1500);
});
