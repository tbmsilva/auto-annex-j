import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Auto Annex J E2E', () => {
  test('should upload CSV and display Results Table', async ({ page }) => {
    await page.goto('/');

    // Check initial state
    await expect(page.locator('text=Auto Annex J')).toBeVisible();
    await expect(page.locator('text=Awaiting Data')).toBeVisible();

    // Setup file to upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    // Click the dropzone to trigger file input
    await page.locator('.dropzone').click();
    const fileChooser = await fileChooserPromise;
    
    // Upload mock file
    await fileChooser.setFiles(path.resolve('mock_t212.csv'));

    // Wait for processing
    await expect(page.locator('text=Resultados para o Anexo J')).toBeVisible();
    
    // Verify table has rows
    const tableRows = page.locator('tbody tr');
    await expect(tableRows).toHaveCount(3); // mock has 3 sales outputs

    // Verify file is in the list
    await expect(page.locator('text=mock_t212.csv')).toBeVisible();

    // Test persistence by reloading
    await page.reload();

    // Table should still be there
    await expect(page.locator('text=Resultados para o Anexo J')).toBeVisible();
    await expect(tableRows).toHaveCount(3);
    
    // Test clear all
    await page.locator('text=Clear All').click();

    // Table should disappear
    await expect(page.locator('text=Awaiting Data')).toBeVisible();
    await expect(page.locator('text=mock_t212.csv')).toBeHidden();
  });
});
