import { test, expect } from '@playwright/test';

test('Super Admin Homepage Builder Flow', async ({ page }) => {
  // 1. Login as Super Admin (Simulated)
  // In a real test, you'd perform login. Here we assume session cookie is set or we mock it.
  await page.goto('/admin/homepage-builder');
  await expect(page).toHaveTitle(/Homepage Builder/);

  // 2. Create Hero Slide
  await page.click('text=Add Slide');
  // Upload would be handled by setting input files
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/hero-test.jpg');
  
  // Wait for upload
  await expect(page.locator('text=New Slide')).toBeVisible();
  
  // Edit Title
  await page.fill('input[placeholder*="Headline"]', 'Test Hero Title');
  await page.click('button[title="Save"]'); // Or rely on auto-save actions if implemented

  // 3. Preview
  const previewPage = await page.context().newPage();
  await previewPage.goto('/?preview=1');
  await expect(previewPage.locator('h1')).toContainText('Test Hero Title');
  await previewPage.close();

  // 4. Publish
  await page.click('text=Publish Changes');
  await expect(page.locator('text=Published')).toBeVisible({ timeout: 10000 }); // Assuming toast or redirect

  // 5. Verify Storefront (No Preview)
  const storefrontPage = await page.context().newPage();
  await storefrontPage.goto('/');
  await expect(storefrontPage.locator('h1')).toContainText('Test Hero Title');
});




















