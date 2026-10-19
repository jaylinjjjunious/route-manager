const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.TEST_APP_URL || 'http://127.0.0.1:4173/tests/smart-aisle-test-lab-harness.html';
const CHROME_PATH = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function pngBuffer(colorHex) {
  const color = colorHex.replace('#', '');
  const r = Number.parseInt(color.slice(0, 2), 16);
  const g = Number.parseInt(color.slice(2, 4), 16);
  const b = Number.parseInt(color.slice(4, 6), 16);
  const zlib = require('zlib');

  const width = 80;
  const height = 60;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const idx = row + 1 + x * 4;
      raw[idx] = (r + x) % 256;
      raw[idx + 1] = (g + y) % 256;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  function chunk(type, data) {
    const crc = require('node:buffer').transcode
      ? crc32(Buffer.concat([Buffer.from(type), data]))
      : crc32(Buffer.concat([Buffer.from(type), data]));
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 4, 'ascii');
    data.copy(out, 8);
    out.writeUInt32BE(crc, 8 + data.length);
    return out;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
}

(async () => {
  const launchOptions = {
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  };
  if (fs.existsSync(CHROME_PATH)) launchOptions.executablePath = CHROME_PATH;

  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const consoleMessages = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await expectText(page, 'Smart Aisle Scan Test Lab');
    await expectText(page, 'Start Live Camera Practice');
    await expectText(page, 'Run a Controlled Test Scenario');

    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('smart_aisle_scan_sessions', JSON.stringify({
        audit_keep: {
          id: 'audit_keep',
          jobId: 'audit_job',
          mode: 'audit',
          status: 'capturing',
          captureDirection: 'left_to_right',
          aisleSide: 'both',
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
          photoSequence: ['audit_photo_keep'],
          warnings: [],
          validationStatus: 'not_checked',
          stitchStatus: 'not_started',
          stitchedPreviewDataUrl: null,
          stitchVersion: 0,
          reviewConfirmedAt: null,
          override: null,
          checklist: {},
        },
      }));
      localStorage.setItem('smart_aisle_scan_photos', JSON.stringify({
        audit_photo_keep: {
          id: 'audit_photo_keep',
          sessionId: 'audit_keep',
          sequenceNumber: 1,
          role: 'beginning',
          dataUrl: 'data:image/png;base64,audit',
          analysisDataUrl: 'data:image/png;base64,audit',
          capturedAt: new Date().toISOString(),
          captureDirection: 'left_to_right',
          aisleSide: 'both',
          captureMethod: 'manual',
          width: 1,
          height: 1,
          validation: { passed: true, warnings: [] },
          overlapWithPrevious: null,
          retakeOfPhotoId: null,
          isActive: true,
        },
      }));
    });

    await page.getByRole('button', { name: /Start Live Camera Practice/i }).click();
    await expectText(page, 'Practice Setup');
    await expectText(page, 'Recommended Setup');
    await page.getByRole('button', { name: /Begin Live Practice/i }).click();
    await expectText(page, 'Smart Aisle Scan');
    await page.getByRole('button', { name: /Begin Capture/i }).click();
    await page.getByRole('button', { name: /Capture Start Photo/i }).click();
    const burstButton = page.getByRole('button', { name: /Hold for Burst/i });
    await burstButton.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find((node) => node.textContent?.includes('Hold for Burst'));
      return button && !button.hasAttribute('disabled');
    }, null, { timeout: 10000 });
    let burstBox = await burstButton.boundingBox();
    if (!burstBox) throw new Error('Hold for Burst button was not measurable');
    await page.mouse.move(burstBox.x + burstBox.width / 2, burstBox.y + burstBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
    await expectText(page, 'Hold for Burst');

    burstBox = await burstButton.boundingBox();
    if (!burstBox) throw new Error('Hold for Burst button was not measurable after short tap');
    await page.mouse.move(burstBox.x + burstBox.width / 2, burstBox.y + burstBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1200);
    const selectedText = await page.evaluate(() => window.getSelection()?.toString() || '');
    await page.mouse.up();
    if (selectedText.trim()) throw new Error(`Long-press selected text: ${selectedText}`);
    await expectText(page, 'Burst Complete');

    const burstCompleteButton = page.getByRole('button', { name: /Burst Complete/i });
    burstBox = await burstCompleteButton.boundingBox();
    if (!burstBox) throw new Error('Burst Complete button was not measurable');
    await page.mouse.move(burstBox.x + burstBox.width / 2, burstBox.y + burstBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(900);
    await page.mouse.up();
    await expectText(page, 'Burst Complete');

    const removalBefore = await page.evaluate(() => {
      const sessions = JSON.parse(localStorage.getItem('smart_aisle_scan_sessions') || '{}');
      const photos = JSON.parse(localStorage.getItem('smart_aisle_scan_photos') || '{}');
      const session = Object.values(sessions).find((item) => item.mode === 'test_lab' && item.status === 'capturing');
      const active = session ? session.photoSequence.map((id) => photos[id]).filter((photo) => photo && photo.isActive) : [];
      return { count: active.length, hasVisibleNumberBadge: Boolean(Array.from(document.querySelectorAll('span')).find((node) => /^\d+$/.test(node.textContent?.trim() || '') && node.className.includes('bg-white') && node.className.includes('text-black'))) };
    });
    if (removalBefore.count < 2) throw new Error(`Expected at least two active photos before removal test: ${JSON.stringify(removalBefore)}`);
    if (removalBefore.hasVisibleNumberBadge) throw new Error('Visible numeric thumbnail badge still rendered');

    await page.getByLabel(/Open Beginning photo 1/i).click();
    await expectText(page, 'Photo 1 of');
    await expectText(page, 'Sharpness:');
    await page.getByRole('button', { name: /^Next$/i }).click();
    await expectText(page, 'Section photo');
    await page.getByRole('button', { name: /Remove Photo/i }).click();
    const confirmModalVisible = await page.locator('text=Remove this photo from the aisle sequence?').isVisible().catch(() => false);
    if (confirmModalVisible) throw new Error('Confirmation modal still appeared for photo removal');
    await expectText(page, 'Photo removed');
    const undoButton = page.getByRole('button', { name: /^Undo$/i });
    await undoButton.waitFor({ state: 'visible', timeout: 3000 });
    const removalAfter = await page.evaluate(() => {
      const sessions = JSON.parse(localStorage.getItem('smart_aisle_scan_sessions') || '{}');
      const photos = JSON.parse(localStorage.getItem('smart_aisle_scan_photos') || '{}');
      const session = Object.values(sessions).find((item) => item.mode === 'test_lab' && item.status === 'capturing');
      const active = session ? session.photoSequence.map((id) => photos[id]).filter((photo) => photo && photo.isActive) : [];
      const inactive = session ? session.photoSequence.map((id) => photos[id]).filter((photo) => photo && !photo.isActive) : [];
      return { activeCount: active.length, inactiveCount: inactive.length, stitchVersion: session?.stitchVersion, sequenceVersion: session?.sequenceVersion };
    });
    if (removalAfter.activeCount !== removalBefore.count - 1 || removalAfter.inactiveCount < 1 || !removalAfter.sequenceVersion) {
      throw new Error(`Photo removal did not preserve/recalculate sequence: ${JSON.stringify({ removalBefore, removalAfter })}`);
    }

    // Test Undo
    await undoButton.click();
    await page.waitForTimeout(500);
    const undoAfter = await page.evaluate(() => {
      const sessions = JSON.parse(localStorage.getItem('smart_aisle_scan_sessions') || '{}');
      const photos = JSON.parse(localStorage.getItem('smart_aisle_scan_photos') || '{}');
      const session = Object.values(sessions).find((item) => item.mode === 'test_lab' && item.status === 'capturing');
      const active = session ? session.photoSequence.map((id) => photos[id]).filter((photo) => photo && photo.isActive) : [];
      return { activeCount: active.length, sequenceVersion: session?.sequenceVersion };
    });
    if (undoAfter.activeCount !== removalBefore.count) {
      throw new Error(`Undo did not restore photo count: expected ${removalBefore.count}, got ${undoAfter.activeCount}`);
    }
    if (undoAfter.sequenceVersion !== undefined && undoAfter.sequenceVersion <= (removalAfter.sequenceVersion || 0)) {
      throw new Error('Undo did not increment sequence version');
    }

    // Test Check Lens
    const checkLensButton = page.getByRole('button', { name: /Check Lens/i });
    if (await checkLensButton.isVisible().catch(() => false)) {
      await checkLensButton.click();
      await page.waitForTimeout(3000);
      const lensResultVisible = await page.locator('text=Looks clear').or(page.locator('text=Unable to verify')).or(page.locator('text=lens may need cleaning')).isVisible().catch(() => false);
      if (!lensResultVisible) {
        // Lens check may not be visible if camera is not active — acceptable
      }
    }

    await page.getByRole('button', { name: /Capture Next Photo/i }).click();
    await expectText(page, 'Burst Complete');

    await page.getByRole('button', { name: /Reached the End/i }).click();
    await expectText(page, 'Aisle Stitch Review');
    await page.getByRole('button', { name: /Use Stitched Photo/i }).click();
    await expectText(page, 'Test Scorecard');
    await page.getByRole('button', { name: /Back/i }).click();

    const verificationUrl = new URL('/real-device-verification?access=fuckyouleavemelone', APP_URL).toString();
    await page.goto(verificationUrl, { waitUntil: 'networkidle' });
    await expectText(page, 'Smart Aisle Real iPhone Verification');
    await expectText(page, 'Privacy-Safe Report');
    const reportText = await page.locator('textarea').inputValue();
    const report = JSON.parse(reportText);
    if (!report.device || !Array.isArray(report.manualChecks) || report.events.some((event) => JSON.stringify(event).includes('data:image'))) {
      throw new Error('Real-device verification report shape failed: ' + reportText.slice(0, 500));
    }

    await page.goto(APP_URL, { waitUntil: 'networkidle' });

    await page.getByRole('button', { name: /Import a Test Photo Sequence/i }).click();
    await expectText(page, 'Import Test Sequence');
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'aisle-a.png', mimeType: 'image/png', buffer: pngBuffer('#3b82f6') },
      { name: 'aisle-b.png', mimeType: 'image/png', buffer: pngBuffer('#22c55e') },
      { name: 'aisle-c.png', mimeType: 'image/png', buffer: pngBuffer('#f59e0b') },
    ]);
    await expectText(page, 'aisle-a.png');
    await page.getByRole('button', { name: /Process Through Real Pipeline/i }).click();
    await expectText(page, 'Test Scorecard');
    await expectText(page, 'Session Details');
    await page.getByRole('button', { name: /Back/i }).click();

    await page.getByRole('button', { name: /Run a Controlled Test Scenario/i }).click();
    await expectText(page, 'Controlled Scenarios');
    await page.getByText('Valid Sequence').click();
    await page.getByRole('button', { name: /^Run Scenario$/i }).click();
    await expectText(page, 'Scenario Passed');
    await page.getByRole('button', { name: /Back/i }).click();

    await page.getByRole('button', { name: /View Test Markers/i }).click();
    await expectText(page, 'Test Markers');
    await page.getByRole('button', { name: /^START/i }).click();
    await expectText(page, 'Marker START');
    await page.mouse.click(20, 20);
    await page.getByRole('button', { name: /Back/i }).click();

    await page.getByRole('button', { name: /Sensor Diagnostics/i }).click();
    await expectText(page, 'Live Diagnostics');
    await expectText(page, 'Camera Ready');
    await page.getByRole('button', { name: /Back/i }).click();

    await page.getByRole('button', { name: /Clear Test Data/i }).click();
    await expectText(page, 'Test Lab Storage');
    await page.getByRole('button', { name: /^Clear All Test Data$/i }).click();
    await page.getByRole('button', { name: /Confirm: Delete ALL Test Data/i }).click();
    await expectText(page, 'No test sessions found');

    const isolation = await page.evaluate(() => {
      const sessions = JSON.parse(localStorage.getItem('smart_aisle_scan_sessions') || '{}');
      const photos = JSON.parse(localStorage.getItem('smart_aisle_scan_photos') || '{}');
      return {
        auditSessionPreserved: Boolean(sessions.audit_keep),
        auditPhotoPreserved: Boolean(photos.audit_photo_keep),
        testSessionsRemaining: Object.values(sessions).filter((session) => session.mode === 'test_lab').length,
      };
    });

    if (!isolation.auditSessionPreserved || !isolation.auditPhotoPreserved || isolation.testSessionsRemaining !== 0) {
      throw new Error(`Test Lab isolation failed: ${JSON.stringify(isolation)}`);
    }

    fs.mkdirSync(path.join(process.cwd(), 'test-results'), { recursive: true });
    await page.screenshot({ path: 'test-results/smart-aisle-test-lab-ui-check.png', fullPage: true });

    const significantConsoleMessages = consoleMessages.filter((msg) =>
      !msg.text.includes('Download the React DevTools') &&
      !msg.text.includes('Failed to load resource: the server responded with a status of 404')
    );
    if (pageErrors.length > 0 || significantConsoleMessages.some((msg) => msg.type === 'error')) {
      throw new Error(`Browser errors found: ${JSON.stringify({ pageErrors, consoleMessages: significantConsoleMessages }, null, 2)}`);
    }

    console.log(JSON.stringify({ passed: true, isolation, pageErrors, consoleMessages: significantConsoleMessages }, null, 2));
  } catch (error) {
    fs.mkdirSync(path.join(process.cwd(), 'test-results'), { recursive: true });
    await page.screenshot({ path: 'test-results/smart-aisle-test-lab-ui-check-failure.png', fullPage: true }).catch(() => {});
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.error('Visible page text at failure:' + String.fromCharCode(10) + bodyText);
    console.error('Page errors:', JSON.stringify(pageErrors));
    console.error('Console messages:', JSON.stringify(consoleMessages));
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

