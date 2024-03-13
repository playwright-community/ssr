# Playwright Server Side Request Interception

> [!WARNING]
This project is experimental, we are actively looking for the feedback based on your scenarios.

## Motivation

Playwright's networking interception works great for mocking requests/responses inside the Browser. Modern Meta-Frameworks like Remix, Next, Nuxt etc. often make requests from the backend. This project aims to explore ways on how to solve this by enabling mocking capabilities, like in Playwright for server side requests.

## Usage

### 1. Install the package

```bash
npm install -D playwright-ssr
```

### 2. Have a WebServer per worker (project):

```ts
import { defineConfig, devices } from '@playwright/test';
import type { WorkerConfigOptions } from 'playwright-ssr'

export default defineConfig<WorkerConfigOptions>({
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        webServer: {
          command: 'npm',
          args: ['run', 'dev'],
          url: 'http://localhost:3000',
          cwd: __dirname,
        }
      },
    },
  ],
});
```

### 3. Use the `webServer` fixture inside the tests

```ts
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
```

## Acknowledgments

[MSW Interceptors](https://github.com/mswjs/interceptors/) - a Low-level network interception library.
