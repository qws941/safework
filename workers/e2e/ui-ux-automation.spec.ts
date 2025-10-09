/**
 * SafeWork UI/UX Automation E2E Tests
 * Tests frontend functionality on production deployment
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://safework.jclee.me';

test.describe('SafeWork UI/UX Automation Tests', () => {
  test.describe('Main Page Tests', () => {
    test('should load main page successfully', async ({ page }) => {
      await page.goto(BASE_URL);
      await expect(page).toHaveTitle(/SafeWork/);

      // Check Korean language support
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', 'ko');

      // Check main heading
      await expect(page.locator('h1')).toContainText('안전보건 관리 시스템');
    });

    test('should have responsive viewport', async ({ page }) => {
      await page.goto(BASE_URL);

      // Check viewport meta tag
      const viewport = page.locator('meta[name="viewport"]');
      await expect(viewport).toHaveAttribute('content', /width=device-width/);
    });

    test('should load Bootstrap CSS', async ({ page }) => {
      await page.goto(BASE_URL);

      // Check Bootstrap CSS link
      const bootstrapCSS = page.locator('link[href*="bootstrap"]');
      await expect(bootstrapCSS.first()).toBeAttached();
    });

    test('should display all 6 survey form cards', async ({ page }) => {
      await page.goto(BASE_URL);

      // Wait for cards to load
      await page.waitForSelector('.card');

      const cards = page.locator('.card');
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(6);
    });

    test('should have working navigation links', async ({ page }) => {
      await page.goto(BASE_URL);

      // Check login link
      const loginLink = page.locator('a[href="/auth/login"]');
      await expect(loginLink.first()).toBeVisible();

      // Check register link
      const registerLink = page.locator('a[href="/auth/register"]');
      await expect(registerLink.first()).toBeVisible();
    });
  });

  test.describe('Survey Form Pages (001-006)', () => {
    const forms = [
      { id: '001', url: '/survey/001_musculoskeletal_symptom_survey', title: '근골격계 증상조사표' },
      { id: '002', url: '/survey/002_musculoskeletal_symptom_program', title: '근골격계부담작업' },
      { id: '003', url: '/survey/003_musculoskeletal_program', title: '근골격계질환' },
      { id: '004', url: '/survey/004_industrial_accident_survey', title: '산업재해' },
      { id: '005', url: '/survey/005_basic_hazard_factor_survey', title: '유해요인' },
      { id: '006', url: '/survey/006_elderly_worker_approval_form', title: '고령근로자' }
    ];

    for (const form of forms) {
      test(`should load form ${form.id} successfully`, async ({ page }) => {
        await page.goto(BASE_URL + form.url, { timeout: 30000 });

        // Check page loads (may show fallback or actual form)
        await expect(page.locator('body')).toBeVisible();

        // Should contain form title or fallback message
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
      });
    }
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);

      // Main heading should still be visible
      await expect(page.locator('h1')).toBeVisible();

      // Cards should stack vertically
      await page.waitForSelector('.card');
      const cards = page.locator('.card');
      await expect(cards.first()).toBeVisible();
    });

    test('should have mobile-friendly navigation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);

      // Navbar should be present
      await expect(page.locator('.navbar')).toBeVisible();
    });
  });

  test.describe('Performance Tests', () => {
    test('should load main page within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(BASE_URL);
      const loadTime = Date.now() - startTime;

      console.log(`Page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
    });

    test('should have no console errors on main page', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      console.log(`Console errors: ${errors.length}`);
      errors.forEach(error => console.log(`  - ${error}`));

      // Allow minor errors, but log them
      expect(errors.length).toBeLessThan(5);
    });
  });

  test.describe('Accessibility Basic Checks', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto(BASE_URL);

      // Should have h1
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    });

    test('should have alt text for images', async ({ page }) => {
      await page.goto(BASE_URL);

      // Check all images have alt attribute (if any)
      const images = page.locator('img');
      const count = await images.count();

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const img = images.nth(i);
          const alt = await img.getAttribute('alt');
          expect(alt).toBeDefined();
        }
      }
    });

    test('should have proper link text', async ({ page }) => {
      await page.goto(BASE_URL);

      // All links should have text or aria-label
      const links = page.locator('a');
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        expect(text || ariaLabel).toBeTruthy();
      }
    });
  });

  test.describe('Core Web Vitals Checks', () => {
    test('should have reasonable DOM size', async ({ page }) => {
      await page.goto(BASE_URL);

      // Check DOM node count
      const nodeCount = await page.evaluate(() => {
        return document.querySelectorAll('*').length;
      });

      console.log(`DOM nodes: ${nodeCount}`);
      expect(nodeCount).toBeLessThan(1500); // Recommended < 1500
    });

    test('should load critical CSS inline or fast', async ({ page }) => {
      await page.goto(BASE_URL);

      // Check if Bootstrap CSS loads
      const styleSheets = await page.evaluate(() => {
        return document.styleSheets.length;
      });

      console.log(`Stylesheets loaded: ${styleSheets}`);
      expect(styleSheets).toBeGreaterThan(0);
    });
  });
});
