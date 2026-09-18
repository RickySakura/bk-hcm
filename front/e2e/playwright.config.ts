import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

const projectRoot = path.resolve(__dirname, '..');

function loadEnvFile(file: string): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf-8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env'));

const manifestPath = path.join(projectRoot, 'e2e', '.e2e-kit-manifest.json');
const manifest = existsSync(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, any>)
  : {};

const testMatch: string[] = manifest.testMatch ?? [
  '**/e2e.spec.ts',
  '**/*.e2e.spec.ts',
];
const devServerCommand = process.env.E2E_DEV_SERVER_COMMAND;
/**
 * `e2e/scripts/run-e2e.cjs` 会先探测一个空闲端口并把它放进 E2E_PORT，
 * 测试访问的就是这个端口，所以 dev server 也必须起在同一个端口上。
 */
const devServerPort = Number(process.env.E2E_PORT) || 5002;
const baseUrl =
  process.env.E2E_BASE_URL || `http://127.0.0.1:${devServerPort}`;

/**
 * 把端口透给 dev server。多数工具读 PORT；蓝鲸这类读自定义变量的，
 * 用 E2E_DEV_SERVER_ENV 指名（JSON），值里可写 {port} 占位符：
 *   E2E_DEV_SERVER_ENV={"BK_APP_PORT":"{port}","BK_APP_HOST":"127.0.0.1"}
 */
function devServerEnv(): Record<string, string> {
  const raw = process.env.E2E_DEV_SERVER_ENV?.trim();
  if (!raw) return {};
  let entries: Array<[string, unknown]>;
  if (raw.startsWith('{')) {
    try {
      entries = Object.entries(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      return {};
    }
  } else {
    // 逗号分隔的 KV，写在 .env 里不用转义引号：
    //   E2E_DEV_SERVER_ENV="BK_APP_PORT={port},BK_APP_HOST=127.0.0.1"
    entries = raw.split(',').map((pair) => {
      const separator = pair.indexOf('=');
      return separator > 0
        ? [pair.slice(0, separator).trim(), pair.slice(separator + 1).trim()]
        : [pair.trim(), ''];
    });
  }
  return Object.fromEntries(
    entries.map(([key, value]) => [
      key,
      String(value).replace(/\{port\}/g, String(devServerPort)),
    ]),
  );
}

const webServer = devServerCommand
  ? {
      // 命令里也可直接写 {port}
      command: devServerCommand.replace(/\{port\}/g, String(devServerPort)),
      url: baseUrl,
      reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
      timeout: 300_000,
      cwd: projectRoot,
      env: {
        ...process.env,
        BROWSER: 'none',
        PORT: String(devServerPort),
        E2E_PORT: String(devServerPort),
        ...devServerEnv(),
      },
    }
  : undefined;

export default defineConfig({
  testDir: projectRoot,
  testMatch,
  testIgnore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
  outputDir: './test-results',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {}),
    launchOptions: {
      slowMo: Number(process.env.E2E_SLOW_MS) || 0,
    },
  },
  ...(webServer && { webServer }),
});
