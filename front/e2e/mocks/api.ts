import type { Page, Route } from '@playwright/test';

import * as data from './data';

/**
 * 统一拦截 /api/**，为 E2E 提供确定性的 mock 响应。
 * 归属工作流：feat-clb-exclusive-cluster-purchase
 * 约定：只有本文件与 data.ts 提供数据；用例内的写后读状态请放回用例自身。
 */

function ok(payload: unknown): string {
  return JSON.stringify({ code: 0, message: 'ok', result: true, data: payload });
}

export interface MockApiOptions {
  /** 覆盖单据详情响应（缺省用独占型样例） */
  applicationDetail?: Record<string, unknown>;
  /** 覆盖 CLB 详情响应（缺省用独占型样例） */
  lbDetails?: Record<string, unknown>;
  /** 覆盖独占集群标签响应 */
  exclusiveClusterTags?: Record<string, unknown>;
  /** 覆盖四层空闲 IP 响应，按 cloud_cluster_id 取 */
  idleVipsByCluster?: Record<string, { count: number; details: string[] }>;
  /** 覆盖共享带宽包候选 */
  bandwidthPackages?: Array<Record<string, unknown>>;
  /** 命中这些路径子串的接口返回 HTTP 500（异常分支） */
  failUrls?: string[];
  /** 逐用例兜底：返回 undefined 表示继续走默认分发 */
  override?: (ctx: { method: string; pathname: string; body: any }) => unknown;
}

function resolve(pathname: string, method: string, body: any, opt: MockApiOptions): unknown | undefined {
  const bizs = data.TEST_BIZS;
  const bizBase = `/api/v1/cloud/bizs/${bizs}`;

  // ---------- 全局布局层 ----------
  if (pathname === '/api/v1/web/users' && method === 'GET') return data.mockUser;
  if (pathname === '/api/v1/web/bk_bizs/list') return data.mockBizList;
  if (pathname === '/api/v1/web/authorized/bizs/list') return data.mockBizList;
  if (pathname === '/api/v1/web/auth/verify') {
    // 鉴权结果按请求里的 resources 顺序一一对应（前端按下标取 authData[i].id）
    const resources: unknown[] = Array.isArray(body?.resources) ? body.resources : [];
    return { results: resources.map(() => ({ authorized: true })), permission: null };
  }
  if (pathname === '/api/v1/web/all/cloud_areas/list') return data.mockCloudAreas;
  if (/^\/api\/v1\/cloud\/vendors\/[^/]+\/regions\/list$/.test(pathname)) return data.mockRegionList;

  // ---------- 购买页 ----------
  if (/^\/api\/v1\/cloud\/accounts\/bizs\/\d+$/.test(pathname) && method === 'GET') return data.mockCloudAccounts;
  if (/^\/api\/v1\/cloud\/vendors\/[^/]+\/accounts\/[^/]+\/network_type$/.test(pathname)) {
    return data.mockNetworkType;
  }
  if (/^\/api\/v1\/web\/bizs\/\d+\/vendors\/[^/]+\/vpcs\/with\/subnet_count\/list$/.test(pathname)) return data.mockVpcs;
  if (/^\/api\/v1\/cloud\/vendors\/[^/]+\/regions\/[^/]+\/zones\/list$/.test(pathname)) return data.mockZones;
  if (/^\/api\/v1\/cloud\/vendors\/[^/]+\/load_balancers\/resources\/describe$/.test(pathname)) {
    return data.mockZoneResources;
  }
  if (pathname === `${bizBase}/load_balancers/quotas`) return data.mockQuotas;
  if (pathname === `${bizBase}/load_balancers/exclusive_clusters/tags/list`) {
    return opt.exclusiveClusterTags ?? data.mockExclusiveClusterTags;
  }
  if (pathname === `${bizBase}/load_balancers/exclusive_clusters/idle_vips/list`) {
    const idleVips = opt.idleVipsByCluster ?? data.mockIdleVipsByCluster;
    return idleVips?.[body?.cloud_cluster_id] ?? { count: 0, details: [] };
  }
  if (pathname === `${bizBase}/bandwidth_packages/query`) {
    const packages = opt.bandwidthPackages ?? data.mockBandwidthPackages;
    // 独占场景走 roll-request，按 offset/limit 全量拉取；非独占走 page 分页
    if (body && 'offset' in body) return { total_count: packages.length, packages };
    return { total_count: packages.length, packages };
  }
  if (pathname === `/api/v1/web/bizs/${bizs}/subnets/with/ip_count/list`) return { details: [], count: 0 };

  // ---------- 单据详情 ----------
  if (method === 'GET' && new RegExp(`^${bizBase}/applications/[^/]+$`).test(pathname)) {
    return opt.applicationDetail ?? data.mockApplicationDetails.exclusive;
  }

  // ---------- CLB 资源详情 ----------
  if (pathname === `${bizBase}/load_balancers/with/delete_protection/list`) return data.mockLbList;
  if (new RegExp(`^${bizBase}/load_balancers/[^/]+$`).test(pathname) && method === 'GET') {
    return opt.lbDetails ?? data.mockLbDetails.exclusive;
  }
  if (pathname === `${bizBase}/load_balancers/listeners/count`) return data.mockListenerCount;
  if (/^\/api\/v1\/cloud\/bizs\/\d+\/load_balancers\/[^/]+\/listeners\/list$/.test(pathname)) {
    return data.mockListenerList;
  }
  if (/^\/api\/v1\/cloud\/bizs\/\d+\/listeners\/rs_weight_stat$/.test(pathname)) return data.mockRsWeightStat;
  if (method === 'GET' && new RegExp(`^${bizBase}/vpcs/[^/]+$`).test(pathname)) return { id: data.TEST_VPC_ID };
  if (/^\/api\/v1\/cloud\/bizs\/\d+\/vendors\/[^/]+\/vpcs\/list$/.test(pathname)) return { details: [], count: 0 };

  return undefined;
}

async function handle(route: Route, opt: MockApiOptions): Promise<void> {
  const request = route.request();
  const { pathname } = new URL(request.url());
  const method = request.method();
  const failUrls = opt.failUrls ?? [];

  if (failUrls.some((fragment) => pathname.includes(fragment))) {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 500, message: 'e2e mocked failure' }) });
    return;
  }

  let body: any;
  try {
    body = request.postDataJSON();
  } catch {
    body = undefined;
  }

  const payload = opt.override?.({ method, pathname, body }) ?? resolve(pathname, method, body, opt);
  await route.fulfill({
    contentType: 'application/json',
    body: ok(payload ?? { details: [], count: 0, total_count: 0, total: 0 }),
  });
}

export async function mockApis(page: Page, opt: MockApiOptions = {}): Promise<void> {
  await page.route('**/api/**', (route) => handle(route, opt));
}

export async function mockBootApis(page: Page, opt: MockApiOptions = {}): Promise<void> {
  await mockApis(page, opt);
}
