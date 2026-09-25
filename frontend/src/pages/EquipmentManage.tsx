import { useEffect, useState } from "react";
import { Alert, Button, Card, Descriptions, Input, List, Popconfirm, Space, Table, Typography, message } from "antd";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";
import { useEquipmentStore } from "../stores/equipmentStore";
import { formatCurrency } from "../utils/formatCurrency";
import type { Equipment } from "../types/equipment";

export function EquipmentManage() {
  const { items, current, retireFailure, load, loadDetail, retire, clearRetireFailure } = useEquipmentStore();
  const [search, setSearch] = useState("");
  const [retiring, setRetiring] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const onRetire = async (id: string) => {
    setRetiring(true);
    try {
      const result = await retire(id);
      if (result) {
        message.success(
          `设备已报废，已驳回待审批借用 ${result.rejectedBorrowIds.length} 条、待审批预约 ${result.rejectedReservationIds.length} 条`
        );
        await load(search);
      }
    } finally {
      setRetiring(false);
    }
  };

  const blockers = current?.retireBlockers;
  const hasBlockers = Boolean(blockers && (blockers.unreturnedBorrows.length > 0 || blockers.upcomingReservations.length > 0));

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Input.Search
        placeholder="搜索设备名称 / 编号 / 位置"
        allowClear
        onSearch={(value) => {
          setSearch(value);
          void load(value);
        }}
        style={{ maxWidth: 360 }}
      />
      <Table<Equipment>
        rowKey="id"
        dataSource={items}
        pagination={false}
        locale={{ emptyText: <EmptyState description="暂无设备" /> }}
        onRow={(record) => ({ onClick: () => void loadDetail(record.id) })}
        columns={[
          { title: "设备名称", dataIndex: "name" },
          { title: "设备编号", dataIndex: "equipmentNo" },
          { title: "存放位置", dataIndex: "location" },
          { title: "状态", dataIndex: "status", render: (value: string) => <StatusBadge value={value} /> }
        ]}
      />
      {current && (
        <Card
          title={
            <Space>
              {current.name}
              <StatusBadge value={current.status} />
            </Space>
          }
          extra={
            current.status !== "Retired" && (
              <Popconfirm
                title="确认报废该设备？"
                description="存在未归还借用或未来已批准预约时将被拒绝；报废后不能再借用或预约。"
                onConfirm={() => void onRetire(current.id)}
              >
                <Button danger loading={retiring}>
                  报废
                </Button>
              </Popconfirm>
            )
          }
        >
          <Descriptions column={2} size="small">
            <Descriptions.Item label="设备编号">{current.equipmentNo}</Descriptions.Item>
            <Descriptions.Item label="品牌型号">{current.brandModel}</Descriptions.Item>
            <Descriptions.Item label="存放位置">{current.location}</Descriptions.Item>
            <Descriptions.Item label="采购价格">{formatCurrency(current.purchasePrice)}</Descriptions.Item>
            <Descriptions.Item label="供应商">{current.supplier}</Descriptions.Item>
            <Descriptions.Item label="保修到期">{current.warrantyExpiresAt}</Descriptions.Item>
          </Descriptions>

          {retireFailure && (
            <Alert
              style={{ marginTop: 16 }}
              type="error"
              showIcon
              message="报废失败"
              description={
                <>
                  <Typography.Paragraph style={{ marginBottom: 8 }}>{retireFailure.reason}</Typography.Paragraph>
                  <Typography.Text strong>需优先处理的记录：</Typography.Text>
                  <ul style={{ marginBottom: 0 }}>
                    {retireFailure.borrowIds.map((id) => (
                      <li key={id}>未归还借用：{id}（请先确认归还）</li>
                    ))}
                    {retireFailure.reservationIds.map((id) => (
                      <li key={id}>未来已批准预约：{id}（请先取消或改期）</li>
                    ))}
                  </ul>
                </>
              }
              closable
              onClose={clearRetireFailure}
            />
          )}

          {hasBlockers && blockers && (
            <Alert
              style={{ marginTop: 16 }}
              type="warning"
              showIcon
              message="报废交接提醒：以下记录未结清，提交报废将被拒绝"
              description={
                <List
                  size="small"
                  dataSource={[
                    ...blockers.unreturnedBorrows.map((record) => `未归还借用 ${record.id}：${record.purpose}（应还 ${record.expectedReturnAt}）`),
                    ...blockers.upcomingReservations.map((record) => `未来已批准预约 ${record.id}：${record.purpose}（${record.startsAt}）`)
                  ]}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
              }
            />
          )}
        </Card>
      )}
    </Space>
  );
}
