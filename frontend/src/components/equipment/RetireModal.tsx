import { Alert, Input, Modal, Space, Tag } from "antd";
import { useMemo, useState } from "react";
import type { EquipmentDetail } from "../../types/equipment";

type Props = {
  open: boolean;
  detail: EquipmentDetail | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
};

export function RetireModal({ open, detail, loading = false, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  const blockers = useMemo(() => {
    if (!detail) return { activeBorrows: [], futureReservations: [] };
    return detail.retireBlockers;
  }, [detail]);

  const hasBlockers = blockers.activeBorrows.length > 0 || blockers.futureReservations.length > 0;

  const handleConfirm = async () => {
    await onConfirm(reason.trim());
    setReason("");
  };

  return (
    <Modal
      title={`报废设备${detail ? `：${detail.name}` : ""}`}
      open={open}
      okText="确认报废"
      cancelText="取消"
      okButtonProps={{ danger: true, loading }}
      onOk={handleConfirm}
      onCancel={() => {
        setReason("");
        onCancel();
      }}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {detail && hasBlockers ? (
          <Alert
            type="warning"
            showIcon
            message="该设备存在未办结记录，提交后将被系统拒绝"
            description={
              <Space direction="vertical" size={2}>
                {blockers.activeBorrows.length > 0 && (
                  <span>未归还借用：{blockers.activeBorrows.map((record) => <Tag key={record.id} color="red">{record.id}</Tag>)}</span>
                )}
                {blockers.futureReservations.length > 0 && (
                  <span>未来已批准预约：{blockers.futureReservations.map((record) => <Tag key={record.id} color="red">{record.id}</Tag>)}</span>
                )}
              </Space>
            }
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="无未归还借用和未来已批准预约，报废将标记设备为 Retired，并自动驳回待审批的借用与预约。"
          />
        )}
        <div>
          <div style={{ marginBottom: 6 }}>报废原因</div>
          <Input.TextArea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="请填写报废原因，例如：核心部件损坏、维修成本超过重置价值"
          />
        </div>
      </Space>
    </Modal>
  );
}
