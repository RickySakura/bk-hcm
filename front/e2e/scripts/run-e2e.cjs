'use strict';

const { spawnSync } = require('node:child_process');
const { createServer } = require('node:net');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

(async () => {
  let port = Number(process.env.E2E_PORT);
  if (!Number.isInteger(port) || port <= 0) {
    const start = Number(process.env.E2E_PORT_START) || 5002;
    const end = Number(process.env.E2E_PORT_END) || 5100;
    port = 0;
    for (let candidate = start; candidate <= end; candidate += 1) {
      if (await isPortFree(candidate)) {
        port = candidate;
        break;
      }
    }
  }
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(
      `No free E2E port in ${process.env.E2E_PORT_START || 5002}..${
        process.env.E2E_PORT_END || 5100
      }`,
    );
  }

  const result = spawnSync(
    process.execPath,
    [
      require.resolve('@playwright/test/cli'),
      'test',
      '--config',
      path.join(projectRoot, 'e2e', 'playwright.config.ts'),
      ...process.argv.slice(2),
    ],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        E2E_PORT: String(port),
        BROWSER: 'none',
      },
    },
  );
  process.exit(result.status ?? 1);
})().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
