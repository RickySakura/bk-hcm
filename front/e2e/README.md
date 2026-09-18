# E2E

本目录由 E2E 工具层生成，改动会被 `--force` 覆盖；`mocks/` 里的业务数据请自由扩展。

## 目录

```text
e2e/
  playwright.config.ts   # Playwright 配置（读取 .env.local / .env）
  scripts/run-e2e.cjs    # 入口：探测空闲端口后拉起 playwright test
  mocks/api.ts           # 接口拦截入口，项目按需扩展
  mocks/data.ts          # mock 数据，项目按需扩展
  .e2e-kit-manifest.json # 安装清单，卸载依据（不要手改）
  test-results/          # 运行产物（trace / 截图），已 gitignore
  playwright-report/     # HTML 报告，已 gitignore
```

## 用例放哪

默认识别两类文件，可在安装时用 `--test-match` 自定义：

- `**/e2e.spec.ts`
- `**/*.e2e.spec.ts`

推荐与工作流产物放在一起，用例与手测清单互相印证：

```text
<dataDir>/workflow/<id>/
  prd.md  design.md  api.md  coding.md
  test.md        # 手测清单 + 验证结论
  e2e.spec.ts    # 自动化用例
```

这样工作流 test 阶段可以只跑当前这一个 spec，不必全量回归。

## 运行

```bash
npm run e2e                                  # 全量
npm run e2e -- path/to/e2e.spec.ts           # 指定用例
npm run e2e:ci                               # CI 入口：按需构建、起服务、跑测试、收尾
npm run e2e:headed                           # 有头 + 单 worker，便于调试
npm run e2e:report                           # 打开上次运行的 HTML 报告
npm run e2e:codegen                          # 录制生成用例代码

bkdevbuddy e2e run --workflow <id>           # 只跑某个工作流的 spec
```

## 前端服务

服务怎么起来由环境变量决定，写在项目根目录的 `.env.local`（不必在命令行手传）：

| 变量 | 作用 | 不设置时 |
|---|---|---|
| `E2E_DEV_SERVER_COMMAND` | Playwright 自动拉起服务的命令 | 不自动拉起，需外部已有服务 |
| `E2E_BASE_URL` | 测试访问的地址 | `http://127.0.0.1:<E2E_PORT>` |
| `E2E_PORT` | 固定端口 | 从 5002 起探测第一个空闲端口 |
| `E2E_REUSE_SERVER` | `1` 表示复用已运行的服务，不新起也不杀 | 由 Playwright 托管 |
| `E2E_SLOW_MS` | 放慢操作节奏，调试用 | `0` |
| `E2E_CHANNEL` | 指定浏览器 channel（如 `chrome`） | 用 Playwright 自带浏览器 |
| `E2E_DEV_SERVER_ENV` | 把探测到的端口透给 dev server，JSON，值可写 `{port}` | 只透传 `PORT` / `E2E_PORT` |

已有环境变量优先于 `.env.local`，`.env.local` 优先于 `.env`。

## 端口：已经起了服务也不会冲突

`run-e2e.cjs` 会先从 5002 起探测一个空闲端口（或直接用 `E2E_PORT` 指定的），
再把它传给 Playwright，所以**常驻的 dev server 占着 5001 也不影响**——
测试会另起一个服务在不同端口上。

前提是 dev server 得用这个端口启动，而不是自己写死：

- 多数工具读 `PORT`，已自动透传，无需配置；
- 读自定义变量的（比如蓝鲸的 `BK_APP_PORT`），配一行（JSON 与 KV 两种写法都支持）：

```bash
E2E_DEV_SERVER_ENV="BK_APP_PORT={port},BK_APP_HOST=127.0.0.1"
E2E_DEV_SERVER_ENV='{"BK_APP_PORT":"{port}","BK_APP_HOST":"127.0.0.1"}'
```

`{port}` 会被替换成探测到的端口；启动命令里也可以直接写 `{port}`。

反过来，想复用已经跑起来的服务，就设 `E2E_BASE_URL` + `E2E_REUSE_SERVER=1`，
此时不会再拉起新服务。

## 在 CI 里运行

`npm run e2e:ci` 把「构建 → 起服务 → 探活 → 跑测试 → 收尾」封装成一条命令，
流水线与本地跑的是同一段逻辑，失败时能在本地原样复现。

由环境变量驱动，不写死任何项目特有的命令：

| 变量 | 作用 |
|---|---|
| `E2E_CI_BUILD_COMMAND` | 跑测试前先执行的构建命令，如 `npm run build` |
| `E2E_CI_SERVER_COMMAND` | 拉起前端服务的命令，如 `PORT=5000 node paas-server/index.js` |
| `E2E_BASE_URL` | 服务地址，用于探活与访问（默认 `http://127.0.0.1:5000`） |
| `E2E_CI_TIMEOUT_MS` | 等待服务就绪的超时（默认 120000） |
| `E2E_CI_SKIP_SERVER` | 设为 `1` 时不起服务，假定 `E2E_BASE_URL` 已可用 |

不设 `E2E_CI_SERVER_COMMAND` 时只跑测试。命令行参数原样透传给 `playwright test`。

推荐在 CI 里 **build 静态产物 + 起静态服务**，而不是起 dev server：
前者秒起、稳定、不占内存；后者编译慢且在容器里不稳定。
接口已被 mock 接管，页面从哪加载不影响断言。

流水线示例（蓝鲸）：

```yaml
- run: |
    set -e
    cd front
    npm ci
    npx playwright install --with-deps chromium
  name: 安装依赖

- run: |
    set -e
    cd front
    export E2E_CI_BUILD_COMMAND="npm run build"
    export E2E_CI_SERVER_COMMAND="PORT=5000 node paas-server/index.js"
    export E2E_BASE_URL="http://127.0.0.1:5000"
    npm run e2e:ci
  name: 运行 E2E

- uses: uploadArtifact@1.*
  name: 归档 E2E 报告
  with:
    filePath: front/e2e/playwright-report
```

注意：

- 起服务与跑测试必须在**同一个 step** 内，跨 step 时后台进程会随 step 结束被回收。
- CI 环境变量优先于 `.env.local`，所以流水线里显式设 `E2E_BASE_URL` 即可覆盖本地配置。
- 报告目录 `e2e/playwright-report/`、失败证据 `e2e/test-results/` 都要归档。

## Mock 约定

`mocks/api.ts` 统一拦截 `/api/**`，`mocks/data.ts` 提供数据。约定：

- 用例自己决定 mock 范围，需要写后读的状态就放在 spec 内，避免用例互相污染；
- 数据里不要放真实账号、cookie、token、生产域名；
- 新增页面或接口时，先补 `mocks/data.ts` 的数据和 `mocks/api.ts` 的分支，再写断言。

## 编写用例

用例怎么从工作流产物提取范围、选择器怎么定、mock 怎么扩、跑挂了该改用例还是改代码，
统一见 `e2e-authoring` skill：

- `assets/e2e-spec-template.ts` — 新建 spec 的骨架
- `reference/spec-authoring.md` — 范围提取、用例映射、断言与选择器、反模式
- `reference/failure-triage.md` — 失败分类与修复决策树

## 卸载

```bash
bkdevbuddy e2e uninstall
```

或在没有 bkdevbuddy 时：

```bash
node <e2e-setup>/scripts/uninstall-e2e.cjs .
node <e2e-setup>/scripts/uninstall-e2e.cjs . --yes
```

按 `.e2e-kit-manifest.json` 精确还原：删除生成文件、移除 npm scripts 与依赖、
清理写入的 `.gitignore` 行和环境变量，并还原安装前被覆盖的同名 npm scripts。
`e2e/` 下你自己写的文件会保留（除非加 `--full`）。
