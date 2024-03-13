import path from 'path';
import fs from 'fs';
import { test, expect } from "@playwright/test"
import cp from 'child_process';

const kExamplesRootDirectory = path.join(__dirname, '../examples')
const examples = fs.readdirSync(kExamplesRootDirectory);

for (const example of examples) {
  test(`example ${example} should work`, async ({  }) => {
    const exampleDirectory = path.join(kExamplesRootDirectory, example);
    const result = cp.spawnSync('npm', ['run', 'test'], {
      cwd: exampleDirectory,
      stdio: 'inherit',
      shell: true,
    });
    expect(result.status).toBe(0);
  });
}