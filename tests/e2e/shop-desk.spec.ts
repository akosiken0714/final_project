import { expect, test } from '@playwright/test';

// Logged-in checks for the order desk. They only run when you give a shop account:
//   E2E_EMAIL=staff@example.com E2E_PASSWORD='...' E2E_ROLE=staff npx playwright test shop-desk
// Use E2E_ROLE=admin for an admin account. Use a TEST database, never your live one.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const role = process.env.E2E_ROLE ?? 'admin';

test.skip(!email || !password, 'set E2E_EMAIL and E2E_PASSWORD to run the shop-desk checks');

test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Password').fill(password!);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/(admin|orders|dashboard)/);
});

test('the order desk loads and offers a walk-in order', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('link', { name: /walk-in order/i })).toBeVisible();
});

test('staff never see revenue; admins do', async ({ page }) => {
    await page.goto('/admin');
    const revenue = page.getByText('Revenue', { exact: true });
    if (role === 'staff') await expect(revenue).toHaveCount(0);
    else await expect(revenue).toBeVisible();
});

test('staff are blocked from admin-only pages', async ({ page }) => {
    test.skip(role !== 'staff', 'staff accounts only');
    for (const url of ['/admin/customers', '/admin/history', '/admin/services']) {
        const res = await page.goto(url);
        expect(res?.status(), url).toBe(403);
    }
});

test('the walk-in form opens and its Create button waits for the required fields', async ({ page }) => {
    await page.goto('/admin/walk-in');
    await expect(page.getByRole('heading', { name: /walk-in/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /create order/i })).toBeDisabled();
});

test('the order desk does not scroll the whole page sideways on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'the table should scroll inside its own box').toBeLessThanOrEqual(1);
});
