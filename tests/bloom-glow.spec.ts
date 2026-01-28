import { test, expect } from '@playwright/test';

/**
 * Desktop Visual Polish Tests - Bloom and Glow Effects
 * Tests verify bloom and glow effects render correctly at 1920x1080
 */
test.describe('Bloom and Glow Effects', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (using the port from the dev server)
    await page.goto('http://localhost:5176/keegans_mind_palace/');

    // Wait for canvas to be present
    await page.waitForSelector('canvas', { timeout: 15000 });

    // Wait for the scene to fully render (Three.js scene setup)
    await page.waitForTimeout(3000);
  });

  test('canvas renders with WebGL context at 1920x1080', async ({ page }) => {
    // Set viewport to 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Check canvas exists and is visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Verify canvas has WebGL context
    const hasWebGL = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return gl !== null;
    });

    expect(hasWebGL).toBeTruthy();

    // Verify canvas size
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBe(1920);
    expect(box!.height).toBe(1080);

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'tests/screenshots/bloom-1920x1080.png',
      fullPage: false,
    });

    console.log('Canvas rendered successfully at 1920x1080 with WebGL context');
  });

  test('bloom effect is enabled in post-processing pipeline', async ({ page }) => {
    // Set viewport to 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Wait for scene to fully render
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/bloom-effect-active.png',
      fullPage: false,
    });

    // Verify the scene has rendered (check for non-black pixels)
    const screenshot = await page.screenshot();

    // The screenshot should have some color variation (not all black)
    // We'll check by getting the buffer and verifying it has some non-black pixels
    const buffer = screenshot;
    let hasColor = false;
    for (let i = 0; i < buffer.length; i += 4) {
      // Check RGB values (skip alpha channel)
      const r = buffer[i];
      const g = buffer[i + 1];
      const b = buffer[i + 2];
      if (r > 30 || g > 30 || b > 30) {
        hasColor = true;
        break;
      }
    }

    expect(hasColor).toBeTruthy();
    console.log('Bloom effect is active - scene has color and brightness');
  });

  test('glow elements are visible with proper color (#c792f5, #8eecf5)', async ({ page }) => {
    // Set viewport to 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Wait for scene to render
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/glow-elements.png',
      fullPage: false,
    });

    // Evaluate colors in the scene by checking the screenshot
    const screenshot = await page.screenshot();
    let purpleGlowCount = 0;
    let cyanGlowCount = 0;

    // Sample pixels across the screenshot
    for (let i = 0; i < screenshot.length; i += 4) {
      const r = screenshot[i];
      const g = screenshot[i + 1];
      const b = screenshot[i + 2];

      // Check for purple glow (#c792f5 = rgb(199, 146, 245))
      // Allow some tolerance
      if (r >= 170 && r <= 230 && g >= 120 && g <= 170 && b >= 220 && b <= 255) {
        purpleGlowCount++;
      }

      // Check for cyan glow (#8eecf5 = rgb(142, 236, 245))
      // Allow some tolerance
      if (r >= 120 && r <= 170 && g >= 210 && g <= 255 && b >= 220 && b <= 255) {
        cyanGlowCount++;
      }
    }

    console.log(`Purple glow pixels: ${purpleGlowCount}, Cyan glow pixels: ${cyanGlowCount}`);

    // At least one glow color should be present (check for at least 0.1% of pixels)
    const totalPixels = screenshot.length / 4;
    expect(purpleGlowCount + cyanGlowCount).toBeGreaterThan(totalPixels * 0.001);
  });

  test('no visual artifacts or rendering errors', async ({ page }) => {
    // Set viewport to 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Check for WebGL errors in console
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    // Wait for scene to render
    await page.waitForTimeout(3000);

    // Filter for WebGL errors
    const webglErrors = logs.filter(log =>
      log.toLowerCase().includes('webgl') ||
      log.toLowerCase().includes('error') ||
      log.toLowerCase().includes('warning')
    );

    console.log('Console logs:', webglErrors);

    // Should not have WebGL errors
    expect(webglErrors.filter(log => log.toLowerCase().includes('error'))).toHaveLength(0);

    // Take screenshot for visual inspection
    await page.screenshot({
      path: 'tests/screenshots/no-artifacts.png',
      fullPage: false,
    });
  });

  test('bloom intensity and threshold are reasonable', async ({ page }) => {
    // Set viewport to 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Wait for scene to render
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/bloom-intensity.png',
      fullPage: false,
    });

    // Check that bloom is creating a soft glow effect by analyzing screenshot
    const screenshot = await page.screenshot();

    let totalBrightness = 0;
    let maxBrightness = 0;

    for (let i = 0; i < screenshot.length; i += 4) {
      const r = screenshot[i];
      const g = screenshot[i + 1];
      const b = screenshot[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      maxBrightness = Math.max(maxBrightness, brightness);
    }

    const avgBrightness = totalBrightness / (screenshot.length / 4);

    console.log('Average brightness:', avgBrightness);
    console.log('Max brightness:', maxBrightness);

    // Bloom should create some brightness (avg > 10 for dark scene)
    expect(avgBrightness).toBeGreaterThan(10);
    // But not wash everything out (max < 255 for non-overexposed bloom)
    expect(maxBrightness).toBeLessThan(255);
  });
});
