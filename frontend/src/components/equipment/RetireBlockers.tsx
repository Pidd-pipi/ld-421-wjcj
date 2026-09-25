import { Alert, Empty, List, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { StatusBadge } from "../common/StatusBadge";
import type { BorrowRecord } from "../../types/borrow";
import type { Reservation } from "../../types/reservation";
import type { EquipmentDetail, RetireBlockerIds } from "../../types/equipment";

const { Text, Title } = Typography;

type FailureState = {
  message: string;
  details?: RetireBlockerIds | null;
};

const borrowColumns: ColumnsType<BorrowRecord> = [
  { title: "借用编号", dataIndex: "id", width: 110, render: (id: string) => <Text strong>{id}</Text> },
  { title: "借用人", dataIndex: "borrowerId", width: 120 },
  { title: "预计归还", dataIndex: "expectedReturnAt", width: 120 },
  { title: "状态", dataIndex: "status", width: 100, render: (value: string) => <StatusBadge value={value} /> }
];

const reservationColumns: ColumnsType<Reservation> = [
  { title: "预约编号", dataIndex: "id", width: 110, render: (id: string) => <Text strong>{id}</Text> },
  { title: "预约人", dataIndex: "reserverId", width: 120 },
  { title: "开始", dataIndex: "startsAt", width: 190 },
  { title: "结束", dataIndex: "endsAt", width: 190 }
];

export function RetireBlockers({ detail, failure }: { detail: EquipmentDetail; failure: FailureState | null }) {
  if (detail.status === "Retired") {
    return (
      <Alert
        type="info"
        showIcon
        message="该设备已报废，不能再借用或预约"
        description={
          <Space direction="vertical" size={2}>
            <Text type="secondary">报废原因：{detail.retireReason ?? "未登记"}</Text>
            <Text type="secondary">报废时间：{detail.retiredAt ?? "—"}</Text>
          </Space>
        }
      />
    );
  }

  const { activeBorrows, futureReservations } = detail.retireBlockers;
  const hasBlockers = activeBorrows.length > 0 || futureReservations.length > 0;

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      {failure && (
        <Alert
          type="error"
          showIcon
          message={`报废失败：${failure.message}`}
          description={
            <Space direction="vertical" size={2}>
              <Text>请先办结以下记录后再提交报废：</Text>
              {failure.details?.activeBorrows?.length ? (
                <Text>未归还借用：{failure.details.activeBorrows.map((id) => <Tag key={id} color="red">{id}</Tag>)}</Text>
              ) : null}
              {failure.details?.futureReservations?.length ? (
                <Text>未来已批准预约：{failure.details.futureReservations.map((id) => <Tag key={id} color="red">{id}</Tag>)}</Text>
              ) : null}
            </Space>
          }
        />
      )}

      <Title level={5}>
        需优先处理的记录 <Tag color={hasBlockers ? "red" : "green"}>{hasBlockers ? `${activeBorrows.length + futureReservations.length} 项待办结` : "无冲突，可报废"}</Tag>
      </Title>

      {hasBlockers ? (
        <>
          {activeBorrows.length > 0 && (
            <>
              <Text strong>未归还借用（{activeBorrows.length}）</Text>
              <Table<BorrowRecord> rowKey="id" size="small" pagination={false} columns={borrowColumns} dataSource={activeBorrows} />
            </>
          )}
          {futureReservations.length > 0 && (
            <>
              <Text strong>未来已批准预约（{futureReservations.length}）</Text>
              <Table<Reservation> rowKey="id" size="small" pagination={false} columns={reservationColumns} dataSource={futureReservations} />
            </>
          )}
        </>
      ) : (
        <List
          size="small"
          header={<Text type="secondary">报废提交后，以下待审批记录将被自动驳回</Text>}
          dataSource={[
            `待审批借用 ${detail.borrowHistory.filter((record) => record.status === "Pending").length} 条`,
            `待审批预约 ${detail.reservationCalendar.filter((record) => record.status === "Pending").length} 条`
          ]}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      )}

      {!hasBlockers && detail.borrowHistory.length === 0 && detail.reservationCalendar.length === 0 && <Empty description="暂无借用/预约记录" />}
    </Space>
  );
}
