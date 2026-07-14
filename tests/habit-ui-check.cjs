const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Habits' }).click();
  await page.locator('#tab-view-habits').waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const text = document.querySelector('#tab-view-habits')?.innerText || '';
    return text.includes('BACKEND SAVED') && !text.includes('LOADING');
  }, { timeout: 10000 });

  const result = await page.locator('#tab-view-habits').evaluate((panel) => {
    const text = panel.innerText;
    const textLines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const streakIndex = textLines.indexOf('STREAK');
    return {
      hasAllLoggedSessions: text.includes('All Logged Sessions'),
      hasNoStreetTraining: !text.includes('Street Training'),
      hasNoStreetNote: !text.includes('Tested multi task logging'),
      hasOneTotal: text.toLowerCase().includes('1 total'),
      hasDailyFocus: text.includes('Daily Focus Task'),
      hasTwentyMinuteLog: text.includes('20 minutes'),
      hasTwentyToday: text.includes('20 / 30 min'),
      hasOneDayStreak: streakIndex >= 0 && textLines[streakIndex + 1] === '1' && textLines[streakIndex + 2] === 'days',
      hasOneOfSevenDays: text.includes('1 of 7 days'),
      textLines,
    };
  });

  await page.locator('#tab-view-habits').screenshot({ path: 'test-results/habit-ui-check.png' });
  console.log(JSON.stringify(result, null, 2));
  const failedChecks = Object.entries(result)
    .filter(([key, value]) => key.startsWith('has') && value !== true)
    .map(([key]) => key);
  if (failedChecks.length > 0) {
    throw new Error(`Habit UI check failed: ${failedChecks.join(', ')}`);
  }
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
