# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phone.spec.ts >> landing: every .btn is at least 44px tall
- Location: tests\e2e\phone.spec.ts:31:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.$$eval: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]: Internal Server Error
    - button "Copy as Markdown" [ref=e11] [cursor=pointer]
  - generic [ref=e18]:
    - generic [ref=e19]:
      - heading "Illuminate\\Database\\QueryException" [level=1] [ref=e20]
      - generic [ref=e21]: vendor\laravel\framework\src\Illuminate\Database\Connection.php:857
      - paragraph [ref=e23]: "SQLSTATE[HY000] [2002] No connection could be made because the target machine actively refused it (Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: phinewash, SQL: select * from `sessions` where `id` = IlSMZGafDt5LfKIzkPK9SwDFyphi61gkiZb81e5S limit 1)"
    - generic [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]: LARAVEL
          - generic [ref=e28]: 13.32.0
        - generic [ref=e29]:
          - generic [ref=e30]: PHP
          - generic [ref=e31]: 8.5.11
      - generic [ref=e32]: UNHANDLED
      - generic [ref=e36]: CODE 2002
    - generic [ref=e38]:
      - generic [ref=e39]: "500"
      - generic [ref=e43]: GET
      - generic [ref=e47]: http://127.0.0.1:8000
      - button [ref=e48] [cursor=pointer]
  - generic [ref=e53]:
    - generic [ref=e54]:
      - generic [ref=e55]:
        - heading "Exception trace" [level=3] [ref=e60]
        - link "1 previous exception" [ref=e61] [cursor=pointer]:
          - /url: "#previous-exceptions"
      - generic [ref=e62]:
        - generic [ref=e64] [cursor=pointer]:
          - generic [ref=e69]: 54 vendor frames
          - button [ref=e70]
        - generic [ref=e75]:
          - generic [ref=e76] [cursor=pointer]:
            - generic [ref=e79]:
              - code [ref=e83]:
                - generic [ref=e84]: Illuminate\Foundation\Application->handleRequest(object(Illuminate\Http\Request))
              - generic [ref=e85]: public\index.php:20
            - button [ref=e88]
          - code [ref=e97]:
            - generic [ref=e98]: "15"
            - generic [ref=e99]: 16// Bootstrap Laravel and handle the request...
            - generic [ref=e100]: 17/** @var Application $app */
            - generic [ref=e101]: 18$app = require_once __DIR__.'/../bootstrap/app.php';
            - generic [ref=e102]: "19"
            - generic [ref=e103]: 20$app->handleRequest(Request::capture());
            - generic [ref=e104]: "21"
        - generic [ref=e106] [cursor=pointer]:
          - generic [ref=e111]: 1 vendor frame
          - button [ref=e112]
    - generic [ref=e117]:
      - heading "Previous exception" [level=3] [ref=e123]
      - generic [ref=e127] [cursor=pointer]:
        - generic [ref=e128]:
          - heading "PDOException" [level=4] [ref=e129]
          - paragraph [ref=e130]: SQLSTATE[HY000] [2002] No connection could be made because the target machine actively refused it
        - button [ref=e131]
    - generic [ref=e136]:
      - heading "Queries" [level=3] [ref=e142]
      - generic [ref=e143]: // No queries executed
  - generic [ref=e146]:
    - generic [ref=e147]:
      - heading "Headers" [level=2] [ref=e148]
      - generic [ref=e149]:
        - generic [ref=e150]:
          - generic [ref=e151]: host
          - generic [ref=e153]: 127.0.0.1:8000
        - generic [ref=e154]:
          - generic [ref=e155]: connection
          - generic [ref=e157]: keep-alive
        - generic [ref=e158]:
          - generic [ref=e159]: sec-ch-ua
          - generic [ref=e161]: "\"Not:A-Brand\";v=\"8\", \"Chromium\";v=\"156\", \"HeadlessChrome\";v=\"156\""
        - generic [ref=e162]:
          - generic [ref=e163]: sec-ch-ua-mobile
          - generic [ref=e165]: "?0"
        - generic [ref=e166]:
          - generic [ref=e167]: sec-ch-ua-platform
          - generic [ref=e169]: "\"Windows\""
        - generic [ref=e170]:
          - generic [ref=e171]: upgrade-insecure-requests
          - generic [ref=e173]: "1"
        - generic [ref=e174]:
          - generic [ref=e175]: user-agent
          - generic [ref=e177]: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.8078.4 Safari/537.36
        - generic [ref=e178]:
          - generic [ref=e179]: accept-language
          - generic [ref=e181]: en-US
        - generic [ref=e182]:
          - generic [ref=e183]: accept
          - generic [ref=e185]: text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
        - generic [ref=e186]:
          - generic [ref=e187]: sec-fetch-site
          - generic [ref=e189]: none
        - generic [ref=e190]:
          - generic [ref=e191]: sec-fetch-mode
          - generic [ref=e193]: navigate
        - generic [ref=e194]:
          - generic [ref=e195]: sec-fetch-user
          - generic [ref=e197]: "?1"
        - generic [ref=e198]:
          - generic [ref=e199]: sec-fetch-dest
          - generic [ref=e201]: document
        - generic [ref=e202]:
          - generic [ref=e203]: accept-encoding
          - generic [ref=e205]: gzip, deflate, br, zstd
    - generic [ref=e206]:
      - heading "Body" [level=2] [ref=e207]
      - generic [ref=e208]: // No request body
    - generic [ref=e209]:
      - heading "Routing" [level=2] [ref=e210]
      - generic [ref=e211]:
        - generic [ref=e212]:
          - generic [ref=e213]: controller
          - generic [ref=e215]: App\Http\Controllers\HomeController
        - generic [ref=e216]:
          - generic [ref=e217]: route name
          - generic [ref=e219]: home
        - generic [ref=e220]:
          - generic [ref=e221]: middleware
          - generic [ref=e223]: web
    - generic [ref=e224]:
      - heading "Routing parameters" [level=2] [ref=e225]
      - generic [ref=e226]: // No routing parameters
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
  25 |     await page.goto('/');
  26 |     await page.waitForLoadState('networkidle');
  27 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  28 |     expect(overflow).toBeLessThanOrEqual(1);
  29 | });
  30 | 
  31 | test('landing: every .btn is at least 44px tall', async ({ page }) => {
  32 |     await page.goto('/');
> 33 |     const small = await page.$$eval('.btn', (els) =>
     |                              ^ Error: page.$$eval: Test timeout of 30000ms exceeded.
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