import { test, expect } from 'playwright-ssr';

test('should work', async ({ page, webServer }) => {
  webServer.route('**/*', async route => {
    await route.fulfill({
      status: 200,
      json: [{ name: 'John' }, { name: 'Doe' }],
    })
  });
  await page.goto("http://localhost:3000")
  await page.getByRole('button', { name: 'Fetch Fruits' }).click()
  await expect(page.getByRole('listitem')).toHaveText([
    'John',
    'Doe',
  ])
}); 

test('should have all the request/response properties', async ({ page, webServer }) => {
  webServer.route('**/*', async (route, request) => {
    expect(route.request()).toEqual(request);
    expect(request.method()).toBe('GET');
    expect(request.url()).toBe('https://demo.playwright.dev/api-mocking/api/v1/fruits')
    expect(await request.headerValue('authorization')).toBe('Bearer very-secure-token')
    expect(request.headers()).toEqual({"authorization": "Bearer very-secure-token"})
    expect(await request.headersArray()).toEqual([{ name: 'authorization', value: 'Bearer very-secure-token' }])
    expect(await request.allHeaders()).toEqual(({"authorization": "Bearer very-secure-token"}))
    await route.fulfill({
      status: 200,
      json: [{ name: 'John' }, { name: 'Doe' }],
    })
  });
  await page.goto("http://localhost:3000")
  await page.getByRole('button', { name: 'Fetch Fruits' }).click()
  await expect(page.getByRole('listitem')).toHaveText([
    'John',
    'Doe',
  ])
}); 
