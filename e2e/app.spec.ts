import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Auto Annex J E2E', () => {
  test('should upload CSV and display Results Table', async ({ page }) => {
    await page.goto('/');

    // Check initial state
    await expect(page.getByRole('heading', { level: 1, name: 'Auto Annex J' })).toBeVisible();
    await expect(page.locator('text=Awaiting Data')).toBeVisible();

    // Verify footer is present and contains correct links & copyright
    const footer = page.locator('#app-footer');
    await expect(footer).toBeVisible();
    await expect(page.locator('#footer-github-link')).toHaveAttribute('href', 'https://github.com/tbmsilva');
    await expect(page.locator('#footer-linkedin-link')).toHaveAttribute('href', 'https://linkedin.com/in/tbmsilva');
    await expect(footer).toContainText('tbmsilva');
    await expect(footer).toContainText(new Date().getFullYear().toString());

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

    // Test Export Dropdown and Downloads
    await page.locator('[title="More export & copy options"]').click();
    await expect(page.locator('text=Export Standard CSV')).toBeVisible();
    await expect(page.locator('text=Export Excel CSV')).toBeVisible();

    // Capture standard CSV download
    const downloadPromiseStandard = page.waitForEvent('download');
    await page.locator('text=Export Standard CSV').click();
    const downloadStandard = await downloadPromiseStandard;
    expect(downloadStandard.suggestedFilename()).toBe('anexo_j_standard.csv');

    // Capture Excel CSV download
    await page.locator('[title="More export & copy options"]').click();
    const downloadPromiseExcel = page.waitForEvent('download');
    await page.locator('text=Export Excel CSV').click();
    const downloadExcel = await downloadPromiseExcel;
    expect(downloadExcel.suggestedFilename()).toBe('anexo_j_excel_pt.csv');

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
