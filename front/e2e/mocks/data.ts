/**
 * E2E mock 数据（全部为构造数据，不含真实账号 / 域名 / 凭据）
 *
 * 归属工作流：feat-clb-exclusive-cluster-purchase
 * 改动 mock 数据等于改动用例前置条件，需同步更新同工作流 test.md
 */

export const TEST_BIZS = 2;
export const TEST_BIZ_NAME = 'E2E测试业务';
export const TEST_ACCOUNT_ID = 'acc-e2e-0001';
export const TEST_ACCOUNT_NAME = 'E2E云账号';
export const TEST_VENDOR = 'tcloud';
export const TEST_REGION = 'ap-guangzhou';
export const TEST_REGION_NAME = '广州';
export const TEST_ZONE = 'ap-guangzhou-2';
export const TEST_ZONE_NAME = '广州二区';
export const TEST_ZONE_B = 'ap-guangzhou-3';
export const TEST_ZONE_B_NAME = '广州三区';
export const TEST_VPC_ID = 'vpc-e2e-0001';
export const TEST_APP_ID = 'app-e2e-0001';
export const TEST_LB_ID = 'lb-e2e-0001';
export const TEST_LB_VIP = '10.0.0.11';

/** 四层 / 七层标签与集群 */
export const L4_TAG = 'L4-TAG-A';
export const L4_CLUSTER_CLOUD_ID = 'qcs-l4-a';
export const L4_CLUSTER_NAME = 'l4-cluster-a';
export const L4_EGRESS = 'egress-a';
export const L4_CLUSTER_B_CLOUD_ID = 'qcs-l4-b';
export const L4_CLUSTER_B_NAME = 'l4-cluster-b';
export const L4_EGRESS_B = 'egress-b';
export const L4_CLUSTER_NO_VIP_ID = 'qcs-l4-empty';
export const L4_CLUSTER_NO_VIP_NAME = 'l4-cluster-no-ip';
export const L4_IDLE_VIP = '10.0.0.21';
export const L7_TAG_WITH_EGRESS = 'L7-TAG-A';
export const L7_TAG_NO_EGRESS = 'L7-TAG-C';

// ---------- 全局布局层 ----------

export const mockUser = { username: 'test_user', display_name: '测试用户' };

export const mockBizList = [{ id: TEST_BIZS, name: TEST_BIZ_NAME }];

export const mockAuthVerify = {
  results: [{ authorized: true }],
  permission: null,
};

export const mockCloudAreas = { info: [{ id: 0, name: '默认云区域' }] };

export const mockRegionList = {
  details: [{ region_id: TEST_REGION, region_name: TEST_REGION_NAME }],
  count: 1,
};

// ---------- 购买页 ----------

export const mockCloudAccounts = [
  { id: TEST_ACCOUNT_ID, name: TEST_ACCOUNT_NAME, vendor: TEST_VENDOR },
];

export const mockNetworkType = { NetworkAccountType: 'STANDARD' };

export const mockVpcs = {
  details: [
    {
      id: TEST_VPC_ID,
      cloud_id: TEST_VPC_ID,
      name: TEST_VPC_ID,
      cloud_subnet_count: 1,
    },
  ],
  count: 1,
};

export const mockZones = {
  details: [
    { name: TEST_ZONE, name_cn: TEST_ZONE_NAME },
    { name: TEST_ZONE_B, name_cn: TEST_ZONE_B_NAME },
  ],
};

export const mockQuotas = [
  { quota_id: 'TOTAL_OPEN_CLB_QUOTA', quota_limit: 100, quota_current: 0 },
  { quota_id: 'TOTAL_INTERNAL_CLB_QUOTA', quota_limit: 100, quota_current: 0 },
];

export const mockZoneResources = {
  ZoneResourceSet: [
    {
      MasterZone: TEST_ZONE,
      SlaveZone: null,
      IPVersion: 'IPv4',
      ZoneRegion: TEST_REGION,
      LocalZone: true,
      ZoneResourceType: 'SHARED',
      EdgeZone: false,
      Egress: L4_EGRESS,
      ResourceSet: [
        {
          Isp: 'BGP',
          Type: ['BGP'],
          AvailabilitySet: [{ Type: 'BGP', Availability: 'Available' }],
          TypeSet: [{ Type: 'BGP', SpecAvailabilitySet: [{ SpecType: 'shared', Availability: 'Available' }] }],
        },
      ],
    },
    {
      MasterZone: TEST_ZONE_B,
      SlaveZone: null,
      IPVersion: 'IPv4',
      ZoneRegion: TEST_REGION,
      LocalZone: true,
      ZoneResourceType: 'SHARED',
      EdgeZone: false,
      Egress: L4_EGRESS,
      ResourceSet: [
        {
          Isp: 'BGP',
          Type: ['BGP'],
          AvailabilitySet: [{ Type: 'BGP', Availability: 'Available' }],
          TypeSet: [{ Type: 'BGP', SpecAvailabilitySet: [{ SpecType: 'shared', Availability: 'Available' }] }],
        },
      ],
    },
  ],
  TotalCount: 2,
};

export const mockExclusiveClusterTags = {
  details: [
    {
      cluster_tag: L4_TAG,
      cluster_type: 'TGW',
      clusters: [
        {
          cloud_cluster_id: L4_CLUSTER_CLOUD_ID,
          cluster_id: 'l4-a',
          cluster_name: L4_CLUSTER_NAME,
          egress: L4_EGRESS,
          isp: 'BGP',
          zone: TEST_ZONE,
        },
        {
          cloud_cluster_id: L4_CLUSTER_B_CLOUD_ID,
          cluster_id: 'l4-b',
          cluster_name: L4_CLUSTER_B_NAME,
          egress: L4_EGRESS_B,
          isp: 'BGP',
          zone: TEST_ZONE,
        },
        {
          cloud_cluster_id: L4_CLUSTER_NO_VIP_ID,
          cluster_id: 'l4-empty',
          cluster_name: L4_CLUSTER_NO_VIP_NAME,
          egress: L4_EGRESS_B,
          isp: 'BGP',
          zone: TEST_ZONE,
        },
      ],
    },
    {
      // 七层标签的出口取同 cluster_tag 的 TGW 集群集合
      cluster_tag: L7_TAG_WITH_EGRESS,
      cluster_type: 'TGW',
      clusters: [
        {
          cloud_cluster_id: 'qcs-l7-a',
          cluster_id: 'l7-a',
          cluster_name: 'l7-cluster-a',
          egress: L4_EGRESS,
          isp: 'BGP',
          zone: TEST_ZONE,
        },
      ],
    },
    { cluster_tag: L7_TAG_WITH_EGRESS, cluster_type: 'STGW', clusters: [] },
    { cluster_tag: L7_TAG_NO_EGRESS, cluster_type: 'STGW', clusters: [] },
  ],
};

/** 指定集群的可用 IP：无空闲 IP 的集群返回 count=0 */
export const mockIdleVipsByCluster: Record<string, { count: number; details: string[] }> = {
  [L4_CLUSTER_CLOUD_ID]: { count: 1, details: [L4_IDLE_VIP] },
  [L4_CLUSTER_B_CLOUD_ID]: { count: 0, details: [] },
};

export const mockBandwidthPackages = [
  {
    id: 'bp-egress-a-1',
    name: 'bp-egress-a-1',
    network_type: 'BGP',
    charge_type: 'BANDWIDTH_PACKAGE',
    status: 'CREATED',
    bandwidth: 100,
    egress: L4_EGRESS,
    create_time: '2026-01-01 00:00:00',
    deadline: '2026-12-31 00:00:00',
    resource_set: [],
  },
  {
    id: 'bp-egress-a-2',
    name: 'bp-egress-a-2',
    network_type: 'BGP',
    charge_type: 'BANDWIDTH_PACKAGE',
    status: 'CREATED',
    bandwidth: 200,
    egress: L4_EGRESS,
    create_time: '2026-01-01 00:00:00',
    deadline: '2026-12-31 00:00:00',
    resource_set: [],
  },
  {
    id: 'bp-egress-b-1',
    name: 'bp-egress-b-1',
    network_type: 'BGP',
    charge_type: 'BANDWIDTH_PACKAGE',
    status: 'CREATED',
    bandwidth: 300,
    egress: L4_EGRESS_B,
    create_time: '2026-01-01 00:00:00',
    deadline: '2026-12-31 00:00:00',
    resource_set: [],
  },
];

// ---------- 单据详情（单据展示独占集群参数） ----------

const exclusiveApplicationContent = {
  bk_biz_id: TEST_BIZS,
  vendor: TEST_VENDOR,
  account_id: TEST_ACCOUNT_ID,
  load_balancer_type: 'OPEN',
  address_ip_version: 'IPV4',
  cloud_vpc_id: TEST_VPC_ID,
  zones: [TEST_ZONE],
  vip_isp: 'BGP',
  exclusive: 1,
  sla_type: '',
  cluster_tag: L7_TAG_WITH_EGRESS,
  vip: TEST_LB_VIP,
  clusters: [
    {
      cloud_cluster_id: L4_CLUSTER_CLOUD_ID,
      cluster_id: 'l4-a',
      cluster_name: L4_CLUSTER_NAME,
      cluster_tag: L4_TAG,
      cluster_type: 'TGW',
      egress: L4_EGRESS,
    },
    { cluster_tag: L7_TAG_WITH_EGRESS, cluster_type: 'STGW', clusters: [] },
  ],
  internet_charge_type: 'BANDWIDTH_POSTPAID_BY_HOUR',
  internet_max_bandwidth_out: 100,
  require_count: 1,
  name: 'clb-e2e-exclusive',
};

const sharedApplicationContent = {
  ...exclusiveApplicationContent,
  exclusive: 0,
  sla_type: '',
  cluster_tag: '',
  vip: '',
  clusters: [],
  name: 'clb-e2e-shared',
};

const performanceApplicationContent = {
  ...exclusiveApplicationContent,
  exclusive: 0,
  sla_type: 'clb.c4.medium',
  cluster_tag: '',
  vip: '',
  clusters: [],
  name: 'clb-e2e-performance',
};

const baseApplicationDetail = {
  id: TEST_APP_ID,
  sn: 'SN-E2E-0001',
  operation: 'create_load_balancer',
  status: 'completed',
  applicant: 'test_user',
  creator: 'test_user',
  reviser: 'test_user',
  memo: 'E2E 构造单据',
  created_at: '2026-01-01 10:00:00',
  updated_at: '2026-01-01 10:00:00',
};

export const mockApplicationDetails = {
  /** 独占型：回显四层/七层字段 */
  exclusive: { ...baseApplicationDetail, content: JSON.stringify(exclusiveApplicationContent) },
  /** 共享型：不展示独占区块 */
  shared: { ...baseApplicationDetail, content: JSON.stringify(sharedApplicationContent) },
  /** 性能容量型：不展示独占区块，规格显示档位 */
  performance: { ...baseApplicationDetail, content: JSON.stringify(performanceApplicationContent) },
  /** content 非法 JSON：不得白屏 */
  broken: { ...baseApplicationDetail, content: '{not-valid-json' },
  /** 随机分配：集群名称与 IP 均为空 */
  random: {
    ...baseApplicationDetail,
    content: JSON.stringify({
      ...exclusiveApplicationContent,
      vip: '',
      clusters: [
        { cluster_tag: L4_TAG, cluster_type: 'TGW', cluster_name: '' },
        { cluster_tag: L7_TAG_WITH_EGRESS, cluster_type: 'STGW' },
      ],
    }),
  },
};

// ---------- CLB 资源详情（CLB 详情独占集群字段） ----------

const lbBase = {
  id: TEST_LB_ID,
  cloud_id: 'lb-qcs-0001',
  name: 'clb-e2e',
  vendor: TEST_VENDOR,
  account_id: TEST_ACCOUNT_ID,
  bk_biz_id: TEST_BIZS,
  ip_version: 'IPV4',
  lb_type: 'OPEN',
  region: TEST_REGION,
  zones: [TEST_ZONE],
  backup_zones: [],
  vpc_id: TEST_VPC_ID,
  cloud_vpc_id: TEST_VPC_ID,
  subnet_id: '',
  cloud_subnet_id: '',
  private_ipv4_addresses: [],
  private_ipv6_addresses: [],
  public_ipv4_addresses: [TEST_LB_VIP],
  public_ipv6_addresses: [],
  domain: 'clb-e2e.example',
  status: 'RUNNING',
  bandwidth: 1024,
  isp: 'BGP',
  cloud_created_time: '2026-01-01 10:00:00',
  cloud_status_time: '2026-01-01 10:00:00',
  cloud_expired_time: '',
  tags: {},
  memo: '',
  creator: 'test_user',
  reviser: 'test_user',
  created_at: '2026-01-01 10:00:00',
  updated_at: '2026-01-01 10:00:00',
  sync_time: '2026-01-01 10:00:00',
  delete_protect: false,
  exclusive: 0,
  sla_type: '',
};

const lbExtensionBase = {
  charge_type: 'POSTPAID_BY_HOUR',
  internet_charge_type: 'TRAFFIC_POSTPAID_BY_HOUR',
  load_balancer_pass_to_target: true,
  snat: false,
  snat_pro: false,
  snat_ips: [],
};

export const mockLbDetails = {
  /** 独占型：配置信息追加四层/七层字段 */
  exclusive: {
    ...lbBase,
    name: 'clb-e2e-exclusive',
    exclusive: 1,
    extension: {
      ...lbExtensionBase,
      exclusive: 1,
      sla_type: '',
      clusters: [
        {
          cloud_cluster_id: L4_CLUSTER_CLOUD_ID,
          cluster_id: 'l4-a',
          cluster_name: L4_CLUSTER_NAME,
          cluster_tag: L4_TAG,
          cluster_type: 'TGW',
        },
        {
          cloud_cluster_id: 'qcs-l7-a',
          cluster_id: 'l7-a',
          cluster_name: 'l7-cluster-a',
          cluster_tag: L7_TAG_WITH_EGRESS,
          cluster_type: 'STGW',
        },
      ],
    },
  },
  /** 共享型：不追加独占字段，规格展示共享型 */
  shared: {
    ...lbBase,
    name: 'clb-e2e-shared',
    extension: { ...lbExtensionBase, exclusive: 0, sla_type: '', clusters: [] },
  },
  /** 性能容量型：规格展示档位 */
  performance: {
    ...lbBase,
    name: 'clb-e2e-performance',
    extension: { ...lbExtensionBase, exclusive: 0, sla_type: 'clb.c4.medium', clusters: [] },
  },
  /** 独占型但集群数据缺失：字段显示空值 */
  exclusiveMissingFields: {
    ...lbBase,
    name: 'clb-e2e-exclusive-missing',
    exclusive: 1,
    public_ipv4_addresses: [],
    extension: { ...lbExtensionBase, exclusive: 1, sla_type: '', clusters: [] },
  },
};

export const mockLbList = { details: [lbBase], count: 1 };
export const mockListenerList = { details: [], count: 0 };
export const mockListenerCount = { details: [{ num: 0 }] };
export const mockRsWeightStat = {};

export const mockData = {
  TEST_BIZS,
  mockUser,
  mockBizList,
  mockAuthVerify,
  mockCloudAreas,
  mockRegionList,
  mockCloudAccounts,
  mockNetworkType,
  mockVpcs,
  mockZones,
  mockQuotas,
  mockZoneResources,
  mockExclusiveClusterTags,
  mockIdleVipsByCluster,
  mockBandwidthPackages,
  mockApplicationDetails,
  mockLbDetails,
  mockLbList,
  mockListenerList,
  mockListenerCount,
  mockRsWeightStat,
};
