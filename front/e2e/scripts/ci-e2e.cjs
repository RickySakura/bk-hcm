#!/usr/bin/env node
'use strict';

/**
 * CI 用的 E2E 入口：按需构建并拉起前端服务，等服务就绪后执行 Playwright，
 * 结束后收掉服务并透传退出码。
 *
 * 之所以把编排放在脚本里而不是 CI 的 shell 里，是为了让本地与 CI 跑同一条命令，
 * 流水线失败时能在本地原样复现。
 *
 * 环境变量：
 *   E2E_CI_BUILD_COMMAND   跑测试前先执行的构建命令（可选），如 "npm run build"
 *   E2E_CI_SERVER_COMMAND  拉起前端服务的命令（可选），如 "PORT=5000 node server.js"
 *   E2E_BASE_URL           服务地址，用于探活与访问（默认 http://127.0.0.1:5000）
 *   E2E_CI_TIMEOUT_MS      等待服务就绪的超时（默认 120000）
 *   E2E_CI_SKIP_SERVER     设为 1 时跳过起服务与探活（服务由外部提供）
 *
 * 不设 E2E_CI_SERVER_COMMAND 时只跑测试，假设 E2E_BASE_URL 已经可用。
 * 命令行参数原样透传给 playwright test，例如：
 *   npm run e2e:ci -- .hcmfe/workflow/<id>/e2e.spec.ts
 */

const { spawn, spawnSync } = require('node:child_process');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:5000';
const timeoutMs = Number(process.env.E2E_CI_TIMEOUT_MS) || 120_000;
const buildCommand = process.env.E2E_CI_BUILD_COMMAND;
const serverCommand = process.env.E2E_CI_SERVER_COMMAND;
const skipServer = process.env.E2E_CI_SKIP_SERVER === '1';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runShell(command, label) {
  console.log(`\n[ci-e2e] ${label}: ${command}`);
  const result = spawnSync(command, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  });
  return result.status ?? 1;
}

function probe(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https://') ? https : http;
    const request = lib.get(url, (response) => {
      response.resume();
      resolve(response.statusCode < 500);
    });
    request.on('error', () => resolve(false));
    request.setTimeout(3000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeout) {
  const deadline = Date.now() + timeout;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    if (await probe(url)) {
      console.log(`[ci-e2e] server ready at ${url} (attempt ${attempt})`);
      return true;
    }
    await sleep(1000);
  }
  return false;
}

/** 终止服务进程树：POSIX 用进程组，Windows 用 taskkill /T */
function killTree(child) {
  if (!child || child.pid === undefined) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
    } else {
      process.kill(-child.pid, 'SIGTERM');
    }
  } catch {
    try {
      process.kill(child.pid, 'SIGTERM');
    } catch {
      // 进程已退出
    }
  }
}

(async () => {
  if (buildCommand) {
    const status = runShell(buildCommand, 'build');
    if (status !== 0) {
      console.error(`[ci-e2e] build failed (exit ${status})`);
      process.exit(status);
    }
  }

  let server = null;
  if (serverCommand && !skipServer) {
    console.log(`[ci-e2e] start server: ${serverCommand}`);
    server = spawn(serverCommand, {
      cwd: projectRoot,
      // detached 让子进程自成进程组，便于整体回收
      detached: process.platform !== 'win32',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const prefix = (chunk, stream) => {
      const text = String(chunk).trimEnd();
      if (text) stream.write(`[server] ${text}\n`);
    };
    server.stdout?.on('data', (chunk) => prefix(chunk, process.stdout));
    server.stderr?.on('data', (chunk) => prefix(chunk, process.stderr));

    const ready = await waitForServer(baseUrl, timeoutMs);
    if (!ready) {
      console.error(
        `[ci-e2e] server did not become ready within ${timeoutMs}ms: ${baseUrl}`,
      );
      killTree(server);
      process.exit(1);
    }
  } else if (skipServer) {
    console.log(`[ci-e2e] skip starting server, expecting ${baseUrl} to be up`);
  }

  let status;
  try {
    status = runPlaywright();
  } finally {
    if (server) {
      console.log('[ci-e2e] stopping server');
      killTree(server);
    }
  }

  process.exit(status);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});

function runPlaywright() {
  const args = [
    require.resolve('@playwright/test/cli'),
    'test',
    '--config',
    path.join(projectRoot, 'e2e', 'playwright.config.ts'),
    ...process.argv.slice(2),
  ];
  console.log(`\n[ci-e2e] run: playwright test (baseURL=${baseUrl})`);
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      E2E_BASE_URL: baseUrl,
      // 服务由本脚本托管，不要让 Playwright 再拉一个
      E2E_REUSE_SERVER: '1',
    },
  });
  return result.status ?? 1;
}
