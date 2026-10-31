// PhineWash snapshot: visits every main page, saves screenshots + a report.
// Put this file in the "scripts" folder, then run it (steps are in the chat).
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8000';
const OUT = 'snapshots';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);

const VIEWPORTS = {
    desktop: { width: 1366, height: 768 },
    phone: { width: 390, height: 844 },
};

const GROUPS = [
    { name: 'public', email: null, paths: ['/', '/login', '/register', '/privacy', '/terms', '/refund'] },
    {
        name: 'customer',
        email: process.env.CUST_EMAIL, password: process.env.CUST_PASSWORD,
        paths: ['/dashboard', '/orders', '/orders/create'],
    },
    {
        name: 'admin',
        email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
        paths: ['/admin', '/admin/walk-in', '/admin/customers', '/admin/services', '/admin/history', '/admin/report'],
    },
];

const report = [`PhineWash snapshot report  (${new Date().toISOString()})`, `Site: ${BASE}`, ''];
const browser = await chromium.launch();

for (const group of GROUPS) {
    if (group.name !== 'public' && (!group.email || !group.password)) {
        report.push(`[${group.name}] SKIPPED (no email/password given)`, '');
        continue;
    }
    for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        const problems = [];
        page.on('pageerror', (e) => problems.push('script error: ' + e.message));
        page.on('console', (m) => m.type() === 'error' && problems.push('console error: ' + m.text().slice(0, 200)));
        page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url().replace(BASE, '')}`));

        if (group.email) {
            await page.goto(BASE + '/login');
            await page.getByLabel('Email').fill(group.email);
            await page.getByLabel('Password').fill(group.password);
            await page.getByRole('button', { name: /log in/i }).click();
            await page.waitForLoadState('networkidle').catch(() => {});
            if (page.url().includes('/login')) {
                report.push(`[${group.name}/${vpName}] LOGIN FAILED - check the email/password or 2FA`, '');
                await context.close();
                continue;
            }
            problems.length = 0;
        }

        for (const path of group.paths) {
            problems.length = 0;
            let status = 'no response';
            try {
                const res = await page.goto(BASE + path, { waitUntil: 'load', timeout: 30000 });
                status = res ? res.status() : 'no response';
                await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
            } catch (e) {
                problems.push('could not load: ' + e.message.slice(0, 150));
            }
            const slug = (path === '/' ? 'home' : path.replace(/^\//, '').replace(/\//g, '-'));
            const file = `${group.name}-${slug}-${vpName}.png`;
            await page.screenshot({ path: `${OUT}/${file}`, fullPage: true }).catch(() => {});

            const stats = await page.evaluate(() => ({
                title: document.title,
                overflowPx: document.documentElement.scrollWidth - window.innerWidth,
                brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
                finalUrl: location.pathname,
            })).catch(() => ({}));

            report.push(
                `[${group.name}/${vpName}] ${path}  -> status ${status}, landed on ${stats.finalUrl}`,
                `    title: ${stats.title} | sideways overflow: ${stats.overflowPx}px | broken images: ${stats.brokenImages}`,
                ...[...new Set(problems)].slice(0, 8).map((p) => '    ! ' + p),
            );
        }
        report.push('');
        await context.close();
    }
}

await browser.close();
fs.writeFileSync(`${OUT}/report.txt`, report.join('\n'));
console.log(report.join('\n'));
console.log(`\nDone. Zip the "${OUT}" folder and send it.`);
