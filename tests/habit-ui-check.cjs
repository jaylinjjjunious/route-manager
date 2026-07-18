const { chromium } = require('playwright');

(async () => {
  const originalHabitState = await fetch('http://localhost:3000/api/habits').then((response) => response.json());
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Habits' }).click();
    await page.locator('#tab-view-habits').waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const text = document.querySelector('#tab-view-habits')?.innerText || '';
      return text.includes('BACKEND SAVED') && !text.includes('LOADING');
    }, { timeout: 10000 });

    await page.getByTestId('add-today-task-panel').locator('summary').click();
    await page.locator('#today-habit-task-name').fill('Same Day Test Task');
    await page.locator('#today-habit-task-minutes').fill('5');
    await page.locator('#today-habit-task-note').fill('Same day section check');
    await page.getByTestId('add-today-task-panel').getByRole('button', { name: 'Add' }).click();
    await page.waitForFunction(() => {
      const text = document.querySelector('#tab-view-habits')?.innerText || '';
      return text.includes('Same Day Test Task') && text.includes('Same day section check') && text.includes('2 TOTAL');
    }, { timeout: 10000 });

    const result = await page.locator('#tab-view-habits').evaluate((panel) => {
      const text = panel.innerText;
      const textLines = text.split('\n').map((line) => line.trim()).filter(Boolean);
      const streakIndex = textLines.indexOf('STREAK');
      return {
        hasAllLoggedSessions: text.includes('All Logged Sessions'),
        hasNoStreetTraining: !text.includes('Street Training'),
        hasNoStreetNote: !text.includes('Tested multi task logging'),
        hasTwoTotal: text.toLowerCase().includes('2 total'),
        hasDailyFocus: text.includes('Daily Focus Task'),
        hasCompactAddToToday: text.toLowerCase().includes('add to today'),
        hasSameDayTask: text.includes('Same Day Test Task'),
        hasSameDayNote: text.includes('Same day section check'),
        hasTwentyMinuteLog: text.includes('20 minutes'),
        hasFiveMinuteLog: text.includes('5 minutes'),
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
  } finally {
    await browser.close();
    await fetch('http://localhost:3000/api/habits', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(originalHabitState),
    });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
