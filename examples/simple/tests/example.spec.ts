import { test, expect } from '../../../src/index';

test('my test', async ({ page, webServer }) => {
  webServer.route('**/*', async route => {
    await route.fulfill({
      status: 200,
      json: [{ name: 'John1' }, { name: 'Doe' }],
    })
  });
  await page.goto("http://localhost:3000")
  await page.getByRole('button', { name: 'Fetch Fruits' }).click()
  await expect(page.getByRole('listitem')).toHaveText([
    'John1',
    'Doe',
  ], { timeout: 0 })
}); 

