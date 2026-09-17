# Coding — feat-clb-exclusive-cluster-mgmt

## 执行顺序

1. 双入口  `entry-rsc` 切换「负载均衡 / 独占集群」，radio 插入各页 toolbar
2. 独占集群列表  筛选 + 表格
3. 分配  单条/批量，已分配不可再分配

> 排序依据：入口壳切开 CLB / 独占集群后，各自列表与分配互不依赖。接口未上环境时页面照发真实请求、失败即空列表，不在仓库里放占位数据。

## 落码入口

- Design §3.y 未回填。本轮**不新建菜单/路由**。资源 tab 仍是「负载均衡」；`entry-rsc.vue` 做双入口壳（`query.subtype`），radio 经 `toolbar-prefix` 插进当前页自己的 toolbar。`load-balancer-manage.vue` 只保留 CLB，不 import 独占集群。
- 列表表格走 `comp-data-list` / `comp-field-model`（单云腾讯云，不做多 vendor Factory）。资源接入筛选走 `page-list-rsc`：公共 `resource-search-select` 吃搜索字段模型，`route.query` 闭环请求，不用局部网格 Search，也不在 `option-common.ts` 再写一份字段。
- 分配扩展现网 `BatchDistribution`：批量按钮仍用表格勾选；单条「分配」调用组件暴露的 `open([row])`，共用同一弹窗与同一 `assign/bizs`。不另写 CLB 那种独立单条 dialog。

## 共享改动 / 提交策略

- 跨单公共改动：无（本工作流只绑一张子单）
- 提交：本分支首条带 `--story=独占集群管理页面` 对应 TAPD；后续按文件总结标题

---

## 单据 1: 独占集群管理页面

**TAPD**: [#1069995598138113967](https://<TAPD_HOST>/tapd_fe/69995598/story/detail/1069995598138113967)

**文件**: `src/views/load-balancer/entry-rsc.vue` `src/views/load-balancer/children/resource-subtype-switch.vue` `src/views/load-balancer/constants.ts` `src/views/resource/resource-manage/children/manage/load-balancer-manage.vue` `src/views/load-balancer/exclusive-cluster/index.vue` `src/views/load-balancer/exclusive-cluster/data-list.vue` `src/views/load-balancer/exclusive-cluster/column.ts` `src/views/load-balancer/exclusive-cluster/search-condition.ts` `src/views/load-balancer/exclusive-cluster/constants.ts` `src/store/load-balancer/exclusive-cluster.ts` `src/views/resource/resource-manage/children/dialog/batch-distribution/index.tsx` `src/common/resource-constant.ts` `src/components/resource-search-select/index.vue` `src/components/resource-search-select/map-search-fields.ts` `src/components/resource-search-select/option-common.ts`

**改动点**:

- 双入口在 `entry-rsc.vue`：`v-if` 挂独占集群、`v-else` 挂 CLB 页。`LOAD_BALANCER_SUBTYPE` 放在 `views/load-balancer/constants.ts`。radio 抽 `children/resource-subtype-switch.vue`（模块内子组件统一放 `children/`），经具名 slot `toolbar-prefix` 插进当前页 toolbar 最左侧，壳上不再单独占一行。默认 `clb`；query `subtype=exclusive-cluster` 刷新后仍停在独占集群，默认负载均衡不写该参数。购买默认 slot 只转给 CLB。切换子类型时清掉 `filter`/`page`，避免搜索条件串台。`activeType` 是 `query.subtype` 的可写 computed（getter 读 query、setter 里 `router.replace`），**不是** `ref` + 两个 watch 双向同步：后者会让子页在导航落地前就挂载，`watch(route.query, immediate)` 先按旧 query 请求一次、导航完成后再请求一次，首次切到独占集群就发双份。
- `load-balancer-manage.vue` 只负责 CLB 列表与操作（购买/批量分配/删除/同步/搜索），不再 import 独占集群。工具栏第一项是 `toolbar-prefix`。工具栏与表格仍包在 `Loading` 内，对齐现网 `.bk-tab-panel > .bk-nested-loading` 高度。
- 新建 `views/load-balancer/exclusive-cluster/`：toolbar 为 `toolbar-prefix` + 批量分配 + 显式导入的 `<ResourceSearchSelect :fields>`，根节点 `height: 100%`，`defineOptions` name 为 `ExclusiveClusterList`。筛选项只在 `search-condition.ts`，顺序对齐 `column.ts` 的表格列序：集群ID、集群名称、类型、集群标签、可用区、运营商、业务（「最大连接数」「集群内实例数」不做筛选）。PRD §筛选 的枚举顺序是业务在前，按用户确认以表格列序为准。业务下拉不含「未分配」（未分配只出现在表格列 `--` / 分配操作）。字符串多 token 用 `filterRules` + `CS`。入口走 `useSearchQs` + `usePage()` + `watch route.query` + `transformSimpleCondition`。列表固定参数先吃账号树 `props.filter`（含 tab 右上角分配状态：未分配 `bk_biz_id eq -1`、已分配 `bk_biz_id neq -1`），再按安全组补洞：`vendorInResourcePage` / `selectedAccountId` 缺了才补（选中账号时 vendor 仍要带）。账号/云厂商/分配状态切换会清 `query.filter`，并按当前账号对齐 `query.accountId`（与现网资源列表一致）。空值统一 `--`（HCM 规范，不用 `—` / `-`）：`max_conn` 空、业务列走 `display-value`（`-1` 查不到名称即 `--`）。未分配操作「分配」；已分配行操作仍展示「分配」但禁用，tooltip「已分配」，复选框禁用。表格字段模型：`column.ts`，「最大连接数」「集群内实例数」标 `sort: true`，走后端排序：`data-list` 把 `column-sort` 抛给入口，入口用 `usePage` 的 `handleSort` 写 `query.sort`/`order`，再 `getPageParams(pagination, sortParams)` 带进 `page`。未点排序时不传 `sort`/`order`。操作列前多一列「分配状态」：`bk_biz_id === -1` 为默认 tag「未分配」，否则 success tag「已分配」，hover 提示业务名（对齐 `use-columns` 的是否分配）。重试/分配成功 `routeQuery.refresh()`，不直接 `fetchList()`。
- `ResourceSearchSelect` 增加可选 `fields`：有则从字段模型映射 `data`（`map-search-fields.ts`），不再读 `option-common` 的独占集群表；CVM 仍走 `resourceType`。`getOptionMenu` 的 `bk_biz_id` 只返回真实业务。回填展示名在组件内解析：`name` 等于 `id` 且字段 async 时用 `getOptionMenu(option, '')` 取一次并缓存，只改展示不 `emit`；入口不写业务名映射。bkui `SearchSelect` 的 `modelValue` watcher 不 `emit`，所以入口不需要挡回填触发搜索。
- 请求层放 `src/store/load-balancer/exclusive-cluster.ts`（pinia，与 `clb.ts` / `listener.ts` 同族），不在 `views/` 下新建 `api.ts`；DTO（`IExclusiveClusterItem` / `ExclusiveClusterType`）随 store 走，模块 `constants.ts` 只留展示映射与 `UNASSIGNED_BIZ_ID`。列表用 `enableCount` 并发取 details + count，失败 `reject`、入口把 list 置空，表格仍在（默认空态）；loading 用 store 的 `exclusiveClusterListLoading`（挂法见下）。不要用入口级 `bk-exception` 把表格换掉。
- 接口契约按 PR #2078：`load_balancers/exclusive_clusters/list`、`.../assign/bizs`（body `cluster_ids` + `bk_biz_id`）。列按 PRD：类型只 TGW/STGW；「集群内实例数」绑 `clb_resource_count`；运营商复用 CLB 映射。列表响应必须带 `account_id`：分配弹窗的目标业务是 `useAccountBusiness(行的 account_id)` 取的，空 `account_id` 会让它不发请求、下拉为空（`hcm-form-business` 的 `data` 是 `[]` 就渲染空，`null` 才回落全部业务）。
- 联调期曾在 store 目录下放过一份 404/501 回落的占位数据文件（exclusive-cluster-mock），**提交前已整体删除**：仓库里不留 mock，后端未上环境时就是空列表 + 错误提示；本地要造数据用 devtools 改写响应，别再往 store 里塞。
- 两个请求都不传 `globalError: false`（与 `clb.ts` 一致）。http 层的 `handleResponse` 里 `code !== 0` 只在 `globalError` 为真时 reject，传 false 会把业务错误 resolve 成成功——分配失败会弹「分配成功」。非 2xx 的 toast 由 http 层统一出，不受这个开关影响。
- **表格单元格里的悬浮提示用 `bk-popover` 组件，不要用 `v-bk-tooltips` 指令**（本页两处：分配状态 tag 的业务名、已分配行「分配」按钮的禁用说明）。现象：小屏下横向滚动条跑到表头正下方而不是表格底部。根因链（浏览器实测 + 完整调用栈）：指令的 `beforeMount` 会同步调 Vue 的独立 `render()` 去渲染浮层，而 `render()` 结尾调 `flushPostFlushCbs()` 排干的是**全局** post-flush 队列——表格 virtual-render 的 `mounted` 于是在本轮 `mountElement` 中途被提前触发，此时表体还挂在尚未插入文档、也还没打上 class 的半成品 `.bk-table` 上；`BkScrollbar` 构造时 `getComputedStyle(轨道)` 全返回空串，`parseInt("") === NaN` 走进 `isScrollbarXUsingBottom = false` 分支，此后永久用 `top = scrollTop` 定位轨道。正常页面这里读到 `bottom: 0px`，走 bottom 分支贴表体底边。这个分支只在构造时判定一次，所以 CSS 覆盖 `top/bottom` 只会破坏 PS 对纵向滚动的补偿，延后一帧渲染也无效。指令在不在模板里，bug 就复现/消失，A/B 实测过两轮。
  - 触发点与数据无关：表格首次挂载时列表是空的（游离子树里表体就是 `bk-exception「暂无数据」`），但 bkui 会渲染一个隐藏的 `GhostBody`（`z-index:-1;width:0;height:0;display:none`）把 `<bk-table-column>` 子节点渲染一遍来收集列定义（`resolveColumns` 取 `props.render ?? children.default`），**列的 `#default` 插槽因此在挂载时就被用一个空行对象执行了一次**，指令的 `beforeMount` 就在这一次里触发。副作用之一是控制台会刷 `DisplayValue value=undefined at <GhostBody>` 的告警，属既有噪声。
  - 全仓没有第二处把 `v-bk-tooltips` 写进表格列插槽的 `.vue`（`rg` 交叉筛过），老列表的悬浮提示都在列配置的 `render()` 里、GhostBody 只收集不调用，这才是它们没暴雷的原因——不是「数据还没到」。
  - 换 `bk-popover` 要显式补 `placement="top"` + `arrow` 才和现网指令式提示同款：指令默认 `placement: 'top'`、`arrow: true`、`theme: 'dark'`、`distance: 8`，而组件默认 `top-start`、`arrow: false`，不补就会左对齐且没箭头。触发区套一层 inline 的 `<span>`（宽度贴合按钮），气泡才会居中在按钮而不是整个单元格上。
  - 观感还差一层皮：组件与指令是两套 CSS，`.bk-popover.bk-pop2-content` 是 `padding: 12px` + `#26323d` + 无边框（气泡 42px 高），指令的 `.bk-popper` 是 `padding: 7px 14px` + `#333` + `1px solid #dcdee5`（34px 高）。组件的 `padding` prop **不是**内容内边距，它被塞进 floating-ui 的碰撞 middleware，调它只影响贴边避让。所以新增全局类 `src/style/override/bkpopover.scss` 的 `.hcm-tooltips-popover`（`override/` 是仓库放 bkui 覆盖的既有目录，浮层被 teleport 到 body、scoped 样式管不到），两处 popover 用 `ext-cls="hcm-tooltips-popover"` 引用，实测 padding/行高/底色/边框/高度全部与指令一致。余一处 1px 差异未追：指令 `distance: 8` 给出 8px 间距，组件默认 `offset: 6` 实测 7px。
- loading 用指令 `v-bkloading="{ loading: store.exclusiveClusterListLoading }"` 挂在入口的 `<DataList>` 上（对齐 `views/task/clb.vue`、`permission-template/index.vue`、`load-balancer/clb/load-balancer-table.vue` 的模型驱动列表写法），`data-list.vue` 不接 `loading` prop、不包 `bk-loading`。两点注意：
  - `v-bkloading` 只有 `mounted/updated/unmounted` 钩子，独立 `mount()` 发生在 post-flush 阶段（Vue 对 `flushPostFlushCbs` 有重入保护），不会重演上面那条滚动条问题；`v-bk-tooltips` 是 `beforeMount`，才会。
  - 指令要透传到组件根元素，`data-list.vue` 必须**单根**：模板顶部放 HTML 注释会让它变成 fragment，Vue 只报一句 `Runtime directive used on component with non-element root node` 然后静默失效（遮罩不出现）。注释要写在根元素内部。
- 表格不传 `max-height="100%"`，`index.vue` 里**一条样式覆盖都不需要**：根节点 `height: 100% + flex column`，`.bk-table` 作为 flex 项基准取内容高、`flex-shrink` 收缩到剩余空间，库自带 `min-height: 42px` 已是足够小的下限，表体内部自行出滚动区。实测单行时表格 144px、31 行时收缩到可用的 378px 且分页仍在裁切线内。之前的 `height: 100%` / `max-height: 100% !important` / `margin-top: 0 !important` 是给 `bk-loading` 包出来的 `.bk-nested-loading` 中间层擦屁股的（现网那条 `.bk-tab-panel > .bk-nested-loading .bk-table { margin-top: 16px; max-height: calc(100% - 52px) }` 只匹配 tab 面板的直接子元素，我们嵌得更深、从没吃到），去掉 wrapper 后一并删除。
- `BatchDistribution`：新增 `exclusive_clusters`（路径 `load_balancers/exclusive_clusters`，body key `cluster_ids`）；实际提交走 `submit` 注入的 store 方法，失败展示后端 `message`（已分配整批拒绝）。现网 CLB 是工具栏批量组件 + 页内独立单条 dialog，本轮不跟那套。在批量组件上扩展单条：
  - `defineExpose({ open })`，`open(rows)` 用入参行打开弹窗（不改表格勾选）。
  - 工具栏「批量分配」仍读 `selections`；行内「分配」`open([row])`。
  - `rows.length === 1` 时标题/文案用「独占集群分配」并展示该行名称；多条仍用「批量分配」+ 已选数量。
  - 确认走注入的 `submit`（store 的 `assignExclusiveClusterToBiz`）；id 列表来自本次 `open` 的 rows（批量则来自 selections）。不走通用 `assignBusiness`，因为独占集群路径挂在 `load_balancers/` 下，body 是 `cluster_ids`。
- 不改菜单、不新建容量管理、不改购买/单据/CLB 列表规格字段。

## 不做

- 后端 Go / `docs/api-docs`（后端已在 PR #2078 出契约文档，前端只对齐消费）
- `page-list` 整页新路由
- 启用/禁用、再次分配
