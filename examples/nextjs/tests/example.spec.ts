import { test, expect } from '../../../src/index';

test('my test', async ({ page, webServer }) => {
  webServer.route('**/*', async route => {
    await route.fulfill({
      status: 200,
      json: [{ id: 1, name: 'Pavel123DimaYury' }, { id: 2, name: 'Doe' }],
    })
  });
  await page.goto("http://localhost:3000")
  await expect(page.getByRole('listitem')).toHaveText([
    'Pavel123DimaYury',
    'Doe',
  ])
});