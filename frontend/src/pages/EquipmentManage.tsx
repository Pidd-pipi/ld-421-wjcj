import { useCallback, useEffect, useState } from "react";
import { Button, Descriptions, Drawer, Empty, Input, message, Space, Spin, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";
import { RetireBlockers } from "../components/equipment/RetireBlockers";
import { RetireModal } from "../components/equipment/RetireModal";
import { useEquipmentStore } from "../stores/equipmentStore";
import type { Equipment, EquipmentDetail, RetireBlockerIds } from "../types/equipment";
import { formatCurrency } from "../utils/formatCurrency";

const { Title, Text } = Typography;

type RetireFailure = { message: string; details?: RetireBlockerIds | null } | null;

const columnsFactory = (onDetail: (id: string) => void, onRetire: (id: string) => void): ColumnsType<Equipment> => [
  { title: "设备", dataIndex: "name", render: (_: string, record) => (
    <Space direction="vertical" size={0}>
      <Text strong>{record.name}</Text>
      <Text type="secondary">{record.equipmentNo}</Text>
    </Space>
  ) },
  { title: "品牌型号", dataIndex: "brandModel", width: 200 },
  { title: "存放位置", dataIndex: "location", width: 200 },
  { title: "资产状态", dataIndex: "status", width: 120, render: (value: string) => <StatusBadge value={value} /> },
  { title: "操作", key: "actions", width: 200, render: (_: unknown, record) => (
    <Space>
      <Button size="small" onClick={() => onDetail(record.id)}>详情</Button>
      <Button size="small" danger disabled={record.status === "Retired"} onClick={() => onRetire(record.id)}>报废</Button>
    </Space>
  ) }
];

export function EquipmentManage() {
  const { items, current, load, loadDetail, retire } = useEquipmentStore();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [failure, setFailure] = useState<RetireFailure>(null);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    load().catch((error: Error) => messageApi.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = useCallback(async (id: string) => {
    setFailure(null);
    setDetailLoading(true);
    setDrawerOpen(true);
    try {
      await loadDetail(id);
    } catch (error) {
      messageApi.error((error as Error).message);
      setDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }, [loadDetail, messageApi]);

  const openRetire = useCallback(async (id: string) => {
    setFailure(null);
    setModalOpen(true);
    if (!current || current.id !== id) {
      try {
        await loadDetail(id);
      } catch (error) {
        messageApi.error((error as Error).message);
      }
    }
  }, [current, loadDetail, messageApi]);

  const confirmRetire = useCallback(async (reason: string) => {
    if (!current) return;
    setModalLoading(true);
    try {
      const result = await retire(current.id, reason);
      setModalOpen(false);
      await loadDetail(current.id);
      await load(search);
      messageApi.success(`已报废：${result.equipment.name}；自动驳回 ${result.rejectedBorrows.length} 条借用、${result.rejectedReservations.length} 条预约`);
    } catch (error) {
      const err = error as Error & { details?: RetireBlockerIds | null };
      setFailure({ message: err.message, details: err.details ?? null });
      setModalOpen(false);
      setDrawerOpen(true);
      try {
        await loadDetail(current.id);
      } catch (reloadError) {
        messageApi.error((reloadError as Error).message);
      }
    } finally {
      setModalLoading(false);
    }
  }, [current, retire, loadDetail, load, search, messageApi]);

  return (
    <section>
      {contextHolder}
      <Title level={2}>设备管理</Title>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="搜索设备名称 / 编号 / 位置"
          style={{ width: 320 }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onSearch={(value) => load(value).catch((error: Error) => messageApi.error(error.message))}
        />
        <Button onClick={() => load(search).catch((error: Error) => messageApi.error(error.message))}>刷新</Button>
      </Space>

      <Table<Equipment>
        rowKey="id"
        columns={columnsFactory(openDetail, openRetire)}
        dataSource={items}
        pagination={{ pageSize: 10 }}
      />

      <Drawer
        title="设备详情"
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          current?.status !== "Retired" ? (
            <Button danger onClick={() => setModalOpen(true)}>发起报废</Button>
          ) : undefined
        }
      >
        {detailLoading ? (
          <Spin />
        ) : current ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <Space>
                <Title level={4} style={{ margin: 0 }}>{current.name}</Title>
                <StatusBadge value={current.status} />
              </Space>
              <Descriptions column={2} size="small" style={{ marginTop: 12 }}>
                <Descriptions.Item label="设备编号">{current.equipmentNo}</Descriptions.Item>
                <Descriptions.Item label="品牌型号">{current.brandModel}</Descriptions.Item>
                <Descriptions.Item label="序列号">{current.serialNumber}</Descriptions.Item>
                <Descriptions.Item label="存放位置">{current.location}</Descriptions.Item>
                <Descriptions.Item label="购买日期">{current.purchaseDate}</Descriptions.Item>
                <Descriptions.Item label="购买价格">{formatCurrency(current.purchasePrice)}</Descriptions.Item>
                <Descriptions.Item label="保修到期">{current.warrantyExpiresAt}</Descriptions.Item>
                <Descriptions.Item label="供应商">{current.supplier}</Descriptions.Item>
              </Descriptions>
            </div>

            <RetireBlockers detail={current} failure={failure} />
          </Space>
        ) : (
          <EmptyState description="请选择设备查看详情" />
        )}
      </Drawer>

      <RetireModal
        open={modalOpen}
        detail={current}
        loading={modalLoading}
        onCancel={() => setModalOpen(false)}
        onConfirm={confirmRetire}
      />
    </section>
  );
}
