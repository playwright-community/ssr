import { test, expect } from 'playwright-ssr';

test('my test', async ({ page, webServer }) => {
  await webServer.route('**/*', async route => {
    await route.fulfill({
      status: 200,
      json: [{ id: 1, name: 'John' }, { id: 2, name: 'Doe' }],
    })
  });
  await page.goto("http://localhost:3000")
  await expect(page.getByRole('listitem')).toHaveText([
    'John',
    'Doe',
  ])
});