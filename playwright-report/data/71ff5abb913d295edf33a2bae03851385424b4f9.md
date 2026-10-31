# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-pages.spec.ts >> public page /login >> does not scroll sideways
- Location: tests\e2e\public-pages.spec.ts:19:9

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:8000/login", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | // Every public page must: load, have a title, throw no script errors, and never scroll sideways.
  4  | const PAGES = ['/', '/login', '/register', '/privacy', '/terms', '/refund'];
  5  | 
  6  | for (const path of PAGES) {
  7  |     test.describe(`public page ${path}`, () => {
  8  |         test('loads cleanly', async ({ page }) => {
  9  |             const errors: string[] = [];
  10 |             page.on('pageerror', (e) => errors.push(e.message));
  11 | 
  12 |             const res = await page.goto(path);
  13 |             expect(res?.status(), 'HTTP status').toBeLessThan(400);
  14 |             await expect(page).toHaveTitle(/\S/);
  15 |             await expect(page.locator('h1').first()).toBeVisible();
  16 |             expect(errors, 'script errors on the page').toEqual([]);
  17 |         });
  18 | 
  19 |         test('does not scroll sideways', async ({ page }) => {
> 20 |             await page.goto(path);
     |                        ^ Error: page.goto: Test timeout of 30000ms exceeded.
  21 |             await page.waitForLoadState('networkidle');
  22 |             const overflow = await page.evaluate(
  23 |                 () => document.documentElement.scrollWidth - window.innerWidth,
  24 |             );
  25 |             expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);
  26 |         });
  27 |     });
  28 | }
  29 | 
  30 | test('landing page: skip link, nav and a way to order', async ({ page }) => {
  31 |     await page.goto('/');
  32 |     await expect(page.getByRole('link', { name: /skip to content/i })).toBeAttached();
  33 |     await expect(page.getByRole('link', { name: /get started|order|log in/i }).first()).toBeVisible();
  34 | });
  35 | 
  36 | test('every image has alt text', async ({ page }) => {
  37 |     await page.goto('/');
  38 |     const missing = await page.$$eval('img', (imgs) =>
  39 |         imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src')),
  40 |     );
  41 |     expect(missing, 'images without an alt attribute').toEqual([]);
  42 | });
  43 | 
  44 | test('keyboard focus is visible on the first link', async ({ page, browserName }) => {
  45 |     test.skip(browserName === 'webkit', 'Safari does not Tab to links by default');
  46 |     await page.goto('/login');
  47 |     await page.keyboard.press('Tab');
  48 |     await page.keyboard.press('Tab');
  49 |     const outline = await page.evaluate(() => {
  50 |         const el = document.activeElement as HTMLElement | null;
  51 |         if (!el) return 'none';
  52 |         const s = getComputedStyle(el);
  53 |         return `${s.outlineStyle} ${s.outlineWidth} ${s.boxShadow}`;
  54 |     });
  55 |     expect(outline, 'focused element must show a ring').not.toMatch(/^none 0px none$/);
  56 | });
  57 | 
```