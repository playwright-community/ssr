import path from 'path';
import fs from 'fs';
import { test, expect } from "@playwright/test"
import cp, { spawn } from 'child_process';

const kExamplesRootDirectory = path.join(__dirname, '../examples')
const examples = fs.readdirSync(kExamplesRootDirectory);

for (const example of examples) {
  test(`example ${example} should work`, async ({  }) => {
    const exampleDirectory = path.join(kExamplesRootDirectory, example);
    spawnAndAssert('npm', ['ci'], exampleDirectory);
    spawnAndAssert('npm', ['run', 'test'], exampleDirectory);
  });
}

function spawnAndAssert(command: string, args: string[], cwd: string) {
  const result = cp.spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });
  expect(result.status).toBe(0);
}
