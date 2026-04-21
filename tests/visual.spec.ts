import { test, expect } from "@playwright/test";

const LOCALES = ["ko", "en"] as const;
const VIEWPORTS = [
  { name: "mobile", width: 320, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

for (const locale of LOCALES) {
  const path = locale === "ko" ? "/" : `/${locale}`;

  for (const vp of VIEWPORTS) {
    test(`[${locale}] ${vp.name} (${vp.width}px) — full page snapshot`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(path, { waitUntil: "networkidle" });

      // Wait for fonts and above-fold animations to settle
      await page.waitForTimeout(800);

      await expect(page).toHaveScreenshot(`${locale}-${vp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
}

test.describe("critical paths", () => {
  test("ko home — hero visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Tuz");
  });

  test("en home — hero visible", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("#hero")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Tuz");
  });

  test("keyboard nav — header focus ring visible", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focusedEl = await page.evaluate(() => document.activeElement?.tagName);
    expect(["A", "BUTTON"]).toContain(focusedEl);
  });

  test("mobile sheet opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.click('button[aria-label]');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
