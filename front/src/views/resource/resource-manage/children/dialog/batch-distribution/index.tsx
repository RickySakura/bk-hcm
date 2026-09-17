import { Button, Dialog, Message } from 'bkui-vue';
import { PropType, computed, defineComponent, ref } from 'vue';
import './index.scss';
import { Senarios, useWhereAmI } from '@/hooks/useWhereAmI';
import { useResourceStore } from '@/store';
import { useAccountBusiness } from '@/views/resource/resource-manage/hooks/use-account-business';

export enum DResourceType {
  cvms = 'cvms',
  disks = 'disks',
  eips = 'eips',
  firewall = 'vendors/gcp/firewalls/rules',
  network_interfaces = 'network_interfaces',
  route_tables = 'route_table_ids',
  security_groups = 'security_groups',
  subnets = 'subnets',
  vpcs = 'vpcs',
  templates = 'argument_templates',
  load_balancers = 'load_balancers',
  certs = 'certs',
  exclusive_clusters = 'load_balancers/exclusive_clusters',
}

export const DResourceTypeMap = {
  [DResourceType.cvms]: {
    key: 'cvm_ids',
    name: '主机',
  },
  [DResourceType.disks]: {
    key: 'disk_ids',
    name: '云硬盘',
  },
  [DResourceType.eips]: {
    key: 'eip_ids',
    name: '弹性IP',
  },
  [DResourceType.firewall]: {
    key: 'firewall_rule_ids',
    name: '防火墙',
  },
  [DResourceType.network_interfaces]: {
    key: 'network_interface_ids	',
    name: '网络接口',
  },
  [DResourceType.route_tables]: {
    key: 'route_table_ids',
    name: '路由表',
  },
  [DResourceType.security_groups]: {
    key: 'security_group_ids',
    name: '安全组',
  },
  [DResourceType.subnets]: {
    key: 'subnet_ids',
    name: '子网',
  },
  [DResourceType.vpcs]: {
    key: 'vpc_ids',
    name: 'VPC',
  },
  [DResourceType.templates]: {
    key: 'template_ids',
    name: '参数模板',
  },
  [DResourceType.load_balancers]: {
    key: 'lb_ids',
    name: '负载均衡',
  },
  [DResourceType.certs]: {
    key: 'cert_ids',
    name: '证书',
  },
  [DResourceType.exclusive_clusters]: {
    key: 'cluster_ids',
    name: '独占集群',
  },
};

export const BatchDistribution = defineComponent({
  props: {
    selections: {
      type: Array as PropType<Array<any>>,
      required: true,
    },
    type: {
      type: String as PropType<DResourceType>,
      required: true,
    },
    getData: {
      type: Function as PropType<() => void>,
      required: true,
    },
    submit: {
      type: Function as PropType<(ids: string[], bkBizId: number) => Promise<void>>,
    },
  },
  setup(props, { expose }) {
    const { whereAmI } = useWhereAmI();
    const selectedBizId = ref('');
    const isShow = ref(false);
    const isLoading = ref(false);
    const pendingRows = ref<any[] | null>(null);
    const resourceStore = useResourceStore();
    const resourceMeta = computed(() => DResourceTypeMap[props.type]);
    const targetRows = computed(() => (pendingRows.value !== null ? pendingRows.value : props.selections) || []);
    const isSingle = computed(() => targetRows.value.length === 1);

    const hasDiffAccount = computed(() => {
      const accountSet = new Set();
      props.selections?.forEach((item) => accountSet.add(item.account_id));
      return accountSet.size > 1;
    });
    const accountId = computed(() => targetRows.value[0]?.account_id);

    const { accountBizList } = useAccountBusiness(accountId);

    const handleOpenBatch = () => {
      pendingRows.value = null;
      selectedBizId.value = '';
      isShow.value = true;
    };

    const open = (rows: any[] = []) => {
      pendingRows.value = rows;
      selectedBizId.value = '';
      isShow.value = true;
    };

    const handleClosed = () => {
      isShow.value = false;
      pendingRows.value = null;
    };

    const handleConfirm = async () => {
      isLoading.value = true;
      const ids = targetRows.value.map((item) => item.id);
      const bkBizId = Number(selectedBizId.value);
      try {
        if (props.submit) {
          await props.submit(ids, bkBizId);
        } else {
          await resourceStore.assignBusiness(props.type, {
            [resourceMeta.value.key]: ids,
            bk_biz_id: selectedBizId.value,
          });
        }
        Message({
          theme: 'success',
          message: isSingle.value ? '分配成功' : '批量分配成功！',
        });
        props.getData?.();
      } catch (error: any) {
        if (props.submit) {
          Message({
            theme: 'error',
            message: error?.message || '分配失败',
          });
        } else {
          Message({
            theme: 'error',
            message: '批量分配失败！',
          });
        }
      } finally {
        isLoading.value = false;
        handleClosed();
      }
    };

    expose({ open });

    return () => (
      <>
        {whereAmI.value === Senarios.resource ? (
          <Button
            class={'mw88'}
            onClick={handleOpenBatch}
            v-bk-tooltips={{ content: '所选资源处于不同账号，不允许分配', disabled: !hasDiffAccount.value }}
            disabled={!props.selections.length || hasDiffAccount.value}>
            批量分配
          </Button>
        ) : null}
        <Dialog
          class={'batch-dialog'}
          isShow={isShow.value}
          title={isSingle.value ? `${resourceMeta.value.name}分配` : `批量分配/${resourceMeta.value.name}分配`}
          theme={'primary'}
          quickClose
          onClosed={handleClosed}
          onConfirm={handleConfirm}
          isLoading={isLoading.value}>
          {isSingle.value ? (
            <>
              <p class='mb16'>
                当前操作{resourceMeta.value.name}为：{targetRows.value[0]?.name}
              </p>
              <p class='mb6'>请选择所需分配的目标业务</p>
            </>
          ) : (
            <>
              <p class='selected-host-count-tip'>
                已选择
                <span class='selected-host-count'>{targetRows.value.length}</span>个{resourceMeta.value.name}
                ，可选择所需分配的目标业务
              </p>
              <p class='mb6'>目标业务</p>
            </>
          )}
          <hcm-form-business data={accountBizList.value} v-model={selectedBizId.value} />
        </Dialog>
      </>
    );
  },
});
