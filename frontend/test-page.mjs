import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check button styles
  const button = await page.$('button[type="submit"]');
  if (button) {
    const styles = await page.evaluate(el => {
      const s = window.getComputedStyle(el);
      return {
        backgroundColor: s.backgroundColor,
        color: s.color,
        borderRadius: s.borderRadius,
      };
    }, button);
    console.log('Button computed styles:', styles);
  }

  // Check card background
  const card = await page.$('[data-slot="card"]');
  if (card) {
    const styles = await page.evaluate(el => {
      const s = window.getComputedStyle(el);
      return {
        backgroundColor: s.backgroundColor,
      };
    }, card);
    console.log('Card computed styles:', styles);
  }

  // Check body background
  const bodyBg = await page.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor;
  });
  console.log('Body background:', bodyBg);

  // Check CSS file directly
  const cssResp = await fetch('http://localhost:3000/_next/static/css/app/layout.css?v=' + Date.now());
  const cssContent = await cssResp.text();

  console.log('\nCSS file info:');
  console.log('  Length:', cssContent.length);
  console.log('  Contains @tailwind:', cssContent.includes('@tailwind'));
  console.log('  Contains .bg-primary:', cssContent.includes('.bg-primary'));
  console.log('  Contains .text-primary:', cssContent.includes('.text-primary'));

  // Check if CSS has expanded Tailwind classes
  console.log('  Contains rounded-xl:', cssContent.includes('rounded-xl'));
  console.log('  Contains px-2.5:', cssContent.includes('px-2.5'));

  await browser.close();
})();