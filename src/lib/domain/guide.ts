import { GRADE_LABEL, type BuyerSpec, type PickingGuide, type ProductKey } from "@/types";
import { PRODUCTS } from "./catalog";

/**
 * Sinh hướng dẫn hái trực quan từ tiêu chuẩn khách mua.
 * Đây là cầu nối "tiêu chuẩn buyer xuống được field": Bán hàng chỉ nhập tiêu chuẩn,
 * ngoài vườn luôn thấy bản rút gọn mới nhất.
 */
export function buildPickingGuide(
  product: ProductKey,
  spec: BuyerSpec,
  revision: number,
  buyerName?: string
): PickingGuide {
  const meta = PRODUCTS[product];
  const size =
    spec.sizeMinMm && spec.sizeMaxMm
      ? `Đường kính ${spec.sizeMinMm}–${spec.sizeMaxMm} mm`
      : spec.sizeMinMm
        ? `Đường kính từ ${spec.sizeMinMm} mm trở lên`
        : spec.sizeMaxMm
          ? `Đường kính tối đa ${spec.sizeMaxMm} mm`
          : "Kích thước đều tay, không lẫn trái quá nhỏ";

  const color = spec.colorNote?.trim()
    ? spec.colorNote.trim()
    : spec.grade === "A"
      ? "Màu chín đều, không đốm, cuống còn tươi"
      : "Màu chín tương đối đều, cho phép sai màu nhẹ";

  const doList: string[] = [
    `Chỉ hái trái đạt ${GRADE_LABEL[spec.grade]}: ${color.toLowerCase()}`,
    size,
    "Đặt nhẹ vào sọt, lót đáy, không xếp quá 3 lớp",
    "Hái theo lô nhỏ và chuyển về kho trong vòng 2 giờ",
  ];
  if (spec.brixMin) {
    doList.splice(2, 0, `Ưu tiên trái đủ ngọt (mục tiêu Brix ≥ ${spec.brixMin})`);
  }

  const dontList: string[] = [
    "Không hái trái dập, nứt, chảy nước",
    "Không hái trái còn xanh cứng hoặc đã quá chín mềm",
    "Không để sọt phơi nắng trực tiếp trên bờ vườn",
  ];
  if (spec.rejectNotes?.trim()) {
    dontList.unshift(`Khách mua từ chối: ${spec.rejectNotes.trim()}`);
  }

  return {
    headline: `${meta.emoji} ${meta.label} — ${GRADE_LABEL[spec.grade]}${
      buyerName ? ` cho ${buyerName}` : ""
    }`,
    colorHint: color,
    sizeHint: size,
    doList,
    dontList,
    revision,
  };
}
