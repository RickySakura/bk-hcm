# feat-clb-list-spec-field 测试清单

> 工作流: `feat-clb-list-spec-field`（lite，无 prd/design/api）
> 关联文档: [coding.md](./coding.md)
> TAPD: CLB列表实例规格字段 #1069995598138114064（F-004 / AC-001~AC-004）

## 验证范围

- 功能边界: 两个 CLB 列表（资源接入-负载均衡入口列表、业务下 CLB 列表）在「网络类型」之后新增「实例规格」列，展示三段式合成值，并新增「实例规格」搜索条件（独占型 / 共享型），该列不排序。
- 不在范围: CLB 详情「实例规格」、单据展示、购买页独占型规格（兄弟单）；性能容量型档位筛选项（本轮不暴露）；老列表迁模型驱动。

## 测试环境

- 前端入口:
  - `<测试环境「资源接入 → 负载均衡」列表页>`
  - `<测试环境「业务 → 负载均衡」CLB 列表页>`
- 测试账号: `<test_account>`
- 数据准备:
  - **后端尚未返回 `exclusive` / `sla_type`**（PR #2078 只含 api-docs + DAO + 表结构，web-server 接口层在兄弟单「负载均衡-购买支持独占集群-后端」）。因此真实环境默认只能验到「该列显示 `--` 且页面不报错」（= AC-004）。
  - 要验三段式展示，用 devtools 改写 `load_balancers/with/delete_protection/list` 的响应，给 details 里几行分别造：`exclusive: 1`、`exclusive: 0` + `sla_type: 'clb.c2.medium'`、`exclusive: 0` + `sla_type: ''`、两个字段都不给。
  - 搜索条件的验证以**请求 body 的 filter rules** 为准（Network 面板），命中结果等后端上环境复验。
  - 本项目前端无单测底座，`covered-by` 一律留空，全部为人工点。

## 用例清单

### P0 - 主流程（必测）

| ID | 场景 | 前置 | 操作 | 期望 | covered-by | 回滚 |
|----|------|------|------|------|------------|------|
| P0-01 | 列位置（资源接入列表） | 打开资源接入-负载均衡 | 看表头顺序 | 「实例规格」紧跟在「网络类型」之后，默认可见，不需要手动勾字段设置 | | — |
| P0-02 | 列位置（业务下列表） | 打开业务下 CLB 列表 | 看表头顺序 | 同上 | | — |
| P0-03 | 展示-独占型 | 造一行 `exclusive: 1`（可同时给 `sla_type`） | 看该行 | 显示「独占型」；`exclusive` 优先于 `sla_type` | | 关闭响应改写 |
| P0-04 | 展示-性能容量型档位 | 造一行 `exclusive: 0` + `sla_type: 'clb.c2.medium'` | 看该行 | 显示「标准型规格」（与 CLB 详情页规格字段共用 `CLB_SPECS`）；换 `clb.c3.small` 显示「高阶型1规格」 | | 同上 |
| P0-05 | 展示-共享型 | 造一行 `exclusive: 0` + `sla_type: ''` | 看该行 | 显示「共享型」 | | 同上 |
| P0-06 | 展示-字段缺失 | 用真实响应（当前后端就是不返回） | 打开两个列表 | 该列显示 `--`，页面不报错、控制台无异常（AC-004） | | — |
| P0-07 | 筛选-独占型（业务下列表） | Network 面板已打开 | 搜索框选「实例规格 = 独占型」 | 请求 filter 出现单条 `extension.exclusive` / `json_eq` / `1` | | 清空搜索 |
| P0-08 | 筛选-共享型（业务下列表） | 同上 | 选「实例规格 = 共享型」 | 请求 filter 出现 `and` 组：`extension.exclusive json_eq 0` **且** `extension.sla_type json_eq ''`（缺后一条就会把性能容量型算成共享型） | | 清空搜索 |
| P0-09 | 筛选-资源接入列表 | 同上 | 在资源接入列表用同两个条件 | 下发规则与 P0-07 / P0-08 一致（老列表会多包一层 `or`，属预期）；接口返回 200，不是 400 | | 清空搜索 |
| P0-10 | 该列不可排序 | 两个列表 | 点「实例规格」表头 | 无排序控件，点击不改变顺序、不发新请求（AC-003） | | — |

### P1 - 异常与边界（必测）

| ID | 场景 | 前置 | 操作 | 期望 | covered-by |
|----|------|------|------|------|------------|
| P1-01 | 筛选项只有两项 | 打开搜索的「实例规格」下拉 | 观察选项 | 只有「独占型」「共享型」，没有 7 个性能容量型档位 | |
| P1-02 | 多选实例规格 | 支持多选时 | 同时选独占型 + 共享型 | 请求 filter 是 `or` 包住两条子规则，且各子规则内部结构不变；接口 200 | |
| P1-03 | 未知档位兜底 | 造一行 `sla_type: 'clb.cX.unknown'` + `exclusive: 0` | 看该行 | 直接显示原始值 `clb.cX.unknown`，不显示空白也不报错 | |
| P1-04 | 搜索条件 URL 闭环（业务下列表） | 选好实例规格条件后 | 刷新页面 / 复制 URL 新开 | 条件从 URL 还原，搜索框回填「实例规格 独占型」，列表请求带同样的规则 | |
| P1-05 | 与其它条件组合 | Network 面板已打开 | 实例规格 + 网络类型 + 地域 一起筛 | 各条件在同一个 `and` 下并存，互不覆盖 | |
| P1-06 | 未污染其它入口 | 打开批量删除弹窗、CLB 详情页 | 观察 | 批量删除弹窗列表、详情页字段不受影响（都按显式 id 列表取字段） | |

### P2 - UI 细节（按需）

- [ ] 列宽 100 下「标准型规格」等较长文案不折行错位，超出有 tooltip
- [ ] 页宽 1280 / 1440 / 1920 下两个列表都不因多一列出现横向滚动
- [ ] 字段设置（表格设置）里能看到「实例规格」并可勾选/取消
- [ ] 业务下列表与资源接入列表的该列文案完全一致

## 验证结论

> 每条填写：PASS / FAIL / Skipped + 简要说明（FAIL 附复现步骤与截图/日志）

| ID | 结果 | 备注 |
|----|------|------|
| P0-01 | <PASS / FAIL / Skipped> | |
| P0-02 | <PASS / FAIL / Skipped> | |
| P0-03 | <PASS / FAIL / Skipped> | |
| P0-04 | <PASS / FAIL / Skipped> | |
| P0-05 | <PASS / FAIL / Skipped> | |
| P0-06 | <PASS / FAIL / Skipped> | |
| P0-07 | <PASS / FAIL / Skipped> | |
| P0-08 | <PASS / FAIL / Skipped> | |
| P0-09 | <PASS / FAIL / Skipped> | |
| P0-10 | <PASS / FAIL / Skipped> | |
| P1-01 | <PASS / FAIL / Skipped> | |
| P1-02 | <PASS / FAIL / Skipped> | |
| P1-03 | <PASS / FAIL / Skipped> | |
| P1-04 | <PASS / FAIL / Skipped> | |
| P1-05 | <PASS / FAIL / Skipped> | |
| P1-06 | <PASS / FAIL / Skipped> | |

- 执行日期: <YYYY-MM-DD>
- 总体结论: PASS / FAIL
- 待后端复验（不阻塞本轮）: 真实响应下的三段式展示；`extension.exclusive` / `extension.sla_type` 两个 `json_eq` 是否被列表接口 RuleFields 放行；筛选命中结果
- 后续行动: <例如：回 coding 修 P0-xx / 提测 / 开 MR>
