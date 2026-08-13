import type { Batch, ProtocolStep, ProtocolStepKey } from "@/types";

/** 6 bước bắt buộc của Quy trình Thực địa BioFresh. */
export const PROTOCOL_STEPS: {
  key: ProtocolStepKey;
  label: string;
  hint: string;
}[] = [
  {
    key: "sort",
    label: "Phân loại",
    hint: "Loại bỏ trái dập, nứt, nấm trước khi xử lý.",
  },
  {
    key: "solution",
    label: "Chuẩn bị dung dịch",
    hint: "Pha dung dịch bảo quản đúng tỉ lệ, ghi lại mẻ pha.",
  },
  {
    key: "dip",
    label: "Nhúng / Phun",
    hint: "Nhúng hoặc phun đều toàn bộ bề mặt trái.",
  },
  {
    key: "dry",
    label: "Làm khô",
    hint: "Làm khô hoàn toàn trước khi đóng gói, tránh đọng nước.",
  },
  {
    key: "pack",
    label: "Đóng gói",
    hint: "Đóng gói theo quy cách khách mua, dán mã lô.",
  },
  {
    key: "sync",
    label: "Đồng bộ dữ liệu",
    hint: "Đồng bộ dữ liệu lô lên hệ thống để mở Hộ chiếu Quy trình.",
  },
];

export const PROTOCOL_LABEL: Record<ProtocolStepKey, string> = Object.fromEntries(
  PROTOCOL_STEPS.map((s) => [s.key, s.label])
) as Record<ProtocolStepKey, string>;

export function emptyProtocol(): ProtocolStep[] {
  return PROTOCOL_STEPS.map((s) => ({ key: s.key, status: "pending" }));
}

export function protocolDoneCount(batch: Batch): number {
  return batch.protocol.filter((s) => s.status === "done").length;
}

export function isProtocolComplete(batch: Batch): boolean {
  return protocolDoneCount(batch) === PROTOCOL_STEPS.length;
}

/** Bước kế tiếp cần ghi nhận (theo đúng thứ tự quy trình). */
export function nextProtocolStep(batch: Batch): ProtocolStep | undefined {
  for (const def of PROTOCOL_STEPS) {
    const step = batch.protocol.find((s) => s.key === def.key);
    if (step && step.status !== "done") return step;
  }
  return undefined;
}

export function protocolCompletedAt(batch: Batch): string | undefined {
  if (!isProtocolComplete(batch)) return undefined;
  const times = batch.protocol
    .map((s) => s.at)
    .filter((x): x is string => Boolean(x))
    .sort();
  return times[times.length - 1];
}
