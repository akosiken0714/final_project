import { expect, test } from '@playwright/test';

// Every public page must: load, have a title, throw no script errors, and never scroll sideways.
const PAGES = ['/', '/login', '/register', '/privacy', '/terms', '/refund'];

for (const path of PAGES) {
    test.describe(`public page ${path}`, () => {
        test('loads cleanly', async ({ page }) => {
            const errors: string[] = [];
            page.on('pageerror', (e) => errors.push(e.message));

            const res = await page.goto(path);
            expect(res?.status(), 'HTTP status').toBeLessThan(400);
            await expect(page).toHaveTitle(/\S/);
            await expect(page.locator('h1').first()).toBeVisible();
            expect(errors, 'script errors on the page').toEqual([]);
        });

        test('does not scroll sideways', async ({ page }) => {
            await page.goto(path);
            await page.waitForLoadState('networkidle');
            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth - window.innerWidth,
            );
            expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);
        });
    });
}

test('landing page: skip link, nav and a way to order', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /skip to content/i })).toBeAttached();
    await expect(page.getByRole('link', { name: /get started|order|log in/i }).first()).toBeVisible();
});

test('every image has alt text', async ({ page }) => {
    await page.goto('/');
    const missing = await page.$$eval('img', (imgs) =>
        imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src')),
    );
    expect(missing, 'images without an alt attribute').toEqual([]);
});

test('keyboard focus is visible on the first link', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari does not Tab to links by default');
    await page.goto('/login');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return 'none';
        const s = getComputedStyle(el);
        return `${s.outlineStyle} ${s.outlineWidth} ${s.boxShadow}`;
    });
    expect(outline, 'focused element must show a ring').not.toMatch(/^none 0px none$/);
});
