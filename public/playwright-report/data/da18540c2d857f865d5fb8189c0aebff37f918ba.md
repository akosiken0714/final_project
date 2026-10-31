# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phone.spec.ts >> landing: no sideways scroll at 360px
- Location: tests\e2e\phone.spec.ts:24:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://127.0.0.1:8000/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | // Phone rules from docs/DESIGN-SYSTEM.md. These run on the two phone projects and a plain 360px-wide window.
  4  | test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });
  5  | 
  6  | const FIELDS = "input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]):not([data-input-otp]), select, textarea";
  7  | 
  8  | for (const path of ['/login', '/register']) {
  9  |     test(`${path}: fields are 16px+ (no iPhone zoom) and 44px+ tall`, async ({ page }) => {
  10 |         await page.goto(path);
  11 |         const bad = await page.$$eval(FIELDS, (els) =>
  12 |             els
  13 |                 .filter((e) => (e as HTMLElement).offsetParent !== null)
  14 |                 .map((e) => {
  15 |                     const r = (e as HTMLElement).getBoundingClientRect();
  16 |                     return { name: (e as HTMLInputElement).name || e.tagName, size: parseFloat(getComputedStyle(e).fontSize), h: Math.round(r.height) };
  17 |                 })
  18 |                 .filter((f) => f.size < 16 || f.h < 44),
  19 |         );
  20 |         expect(bad, 'fields that are too small on a phone').toEqual([]);
  21 |     });
  22 | }
  23 | 
  24 | test('landing: no sideways scroll at 360px', async ({ page }) => {
> 25 |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  26 |     await page.waitForLoadState('networkidle');
  27 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  28 |     expect(overflow).toBeLessThanOrEqual(1);
  29 | });
  30 | 
  31 | test('landing: every .btn is at least 44px tall', async ({ page }) => {
  32 |     await page.goto('/');
  33 |     const small = await page.$$eval('.btn', (els) =>
  34 |         els.filter((e) => (e as HTMLElement).offsetParent !== null && e.getBoundingClientRect().height < 43.5).map((e) => e.textContent?.trim()),
  35 |     );
  36 |     expect(small).toEqual([]);
  37 | });
  38 | 
  39 | test('landing: scrolling does not freeze the page (long-task budget)', async ({ page, browserName }) => {
  40 |     test.skip(browserName !== 'chromium', 'PerformanceObserver longtask is Chromium only');
  41 |     await page.goto('/');
  42 |     await page.evaluate(() => {
  43 |         (window as any).__long = 0;
  44 |         new PerformanceObserver((l) => l.getEntries().forEach((e) => ((window as any).__long += e.duration))).observe({ entryTypes: ['longtask'] });
  45 |     });
  46 |     for (let i = 0; i < 12; i++) {
  47 |         await page.mouse.wheel(0, 700);
  48 |         await page.waitForTimeout(80);
  49 |     }
  50 |     const blocked = await page.evaluate(() => (window as any).__long as number);
  51 |     // Total main-thread blocking while scrolling the whole page. This number is a guide, tune it after your first run.
  52 |     expect(blocked, 'ms of long tasks while scrolling').toBeLessThan(1500);
  53 | });
  54 | 
```