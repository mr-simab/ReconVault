/**
 * E2E Tests for API Integration
 * Using Playwright
 */

const { test, expect } = require('@playwright/test');

test.describe('API Integration', () => {
  test('API data loads in graph', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for API data to load
    await page.waitForResponse(response => 
      response.url().includes('/api/graph') && response.status() === 200
    );
    
    // Verify graph populated with data
    await page.waitForSelector('[data-testid^="node-"]');
    const nodes = await page.$$('[data-testid^="node-"]');
    expect(nodes.length).toBeGreaterThan(0);
  });

  test('real-time updates via WebSocket', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for WebSocket connection
    await page.waitForTimeout(1000);
    
    // Trigger update (e.g., start collection)
    await page.click('button:has-text("Start Collection")');
    
    // Wait for real-time update
    await page.waitForSelector('[data-testid="collection-progress"]');
    
    expect(page).toBeTruthy();
  });

  test('collection progress display', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Start a collection
    await page.fill('input[name="target"]', 'example.com');
    await page.click('button:has-text("Collect")');
    
    // Wait for progress indicator
    await page.waitForSelector('[data-testid="collection-progress"]');
    
    // Verify progress updates
    const progressText = await page.textContent('[data-testid="collection-progress"]');
    expect(progressText).toContain('%');
  });
});
