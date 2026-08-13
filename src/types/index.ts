// ============================================================
// BioFresh OS — MVP domain types
// Phạm vi: 4 điểm đứt gãy thông tin + hỗ trợ quyết định hàng dư thừa.
// Khách mua KHÔNG phải người dùng hệ thống (chỉ quét QR xem Hộ chiếu Quy trình).
// ============================================================

export type Role = "sales" | "field" | "packhouse" | "manager";

export const ROLE_META: Record<
  Role,
  { label: string; home: string; screen: string; short: string }
> = {
  sales: {
    label: "Bộ phận Bán hàng",
    home: "/sales",
    screen: "Bàn làm việc Bán hàng",
    short: "Bán hàng",
  },
  field: {
    label: "Giám sát ngoài vườn",
    home: "/field",
    screen: "Thu hoạch hôm nay",
    short: "Ngoài vườn",
  },
  packhouse: {
    label: "Kho đóng gói / Kiểm soát chất lượng",
    home: "/packhouse",
    screen: "Nhận hàng và Phân loại",
    short: "Kho đóng gói",
  },
  manager: {
    label: "Quản lý / Giám đốc HTX",
    home: "/manager",
    screen: "Trung tâm điều hành + Phòng quyết định",
    short: "Quản lý",
  },
};

// ---------- Sản phẩm & hạng ----------

export type ProductKey =
  | "strawberry"
  | "dragon_fruit"
  | "mango"
  | "avocado"
  | "passion_fruit";

export interface ProductMeta {
  key: ProductKey;
  label: string;
  emoji: string;
  unit: "kg";
  /** Số giờ khuyến nghị phải hành động sau khi kiểm soát chất lượng (cấu hình nội bộ, không phải AI dự báo). */
  actionWindowHours: number;
  /** Giá tham chiếu nội bộ do HTX ghi nhận (VND/kg) theo hạng. */
  refPrice: Record<Grade, number>;
}

/** Hạng chất lượng nhập thủ công tại kho đóng gói. */
export type Grade = "A" | "B" | "PROCESS" | "REJECT";

export const GRADE_LABEL: Record<Grade, string> = {
  A: "Hạng A",
  B: "Hạng B",
  PROCESS: "Hàng chế biến",
  REJECT: "Hàng loại",
};

/** Hạng có thể bán tươi cho khách mua. */
export const SELLABLE_GRADES: Grade[] = ["A", "B"];

// ---------- Đơn hàng / yêu cầu khách mua ----------

export type OrderChannel = "zalo" | "email" | "phone" | "pdf_excel" | "walk_in";

export const CHANNEL_LABEL: Record<OrderChannel, string> = {
  zalo: "Zalo",
  email: "Thư điện tử",
  phone: "Điện thoại",
  pdf_excel: "PDF / Excel",
  walk_in: "Gặp trực tiếp",
};

export type SalesChannel =
  | "supermarket"
  | "wholesale"
  | "export"
  | "processing"
  | "retail";

export const SALES_CHANNEL_LABEL: Record<SalesChannel, string> = {
  supermarket: "Siêu thị",
  wholesale: "Chợ đầu mối",
  export: "Xuất khẩu",
  processing: "Nhà máy chế biến",
  retail: "Bán lẻ / cửa hàng",
};

/** Tiêu chuẩn khách mua — nguồn duy nhất để sinh hướng dẫn hái & phân loại. */
export interface BuyerSpec {
  grade: Grade;
  /** Đường kính / kích thước mong muốn, mm. */
  sizeMinMm?: number;
  sizeMaxMm?: number;
  /** Mô tả màu / độ chín mong muốn. */
  colorNote?: string;
  /** Độ ngọt tối thiểu (Brix) nếu khách mua yêu cầu. */
  brixMin?: number;
  /** Các lỗi bị từ chối. */
  rejectNotes?: string;
}

export type OrderStatus = "draft" | "confirmed" | "fulfilled" | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Nháp",
  confirmed: "Đã chốt",
  fulfilled: "Đã giao xong",
  cancelled: "Đã huỷ",
};

export interface Order {
  id: string;
  buyerName: string;
  product: ProductKey;
  qtyKg: number;
  spec: BuyerSpec;
  dueDate: string; // ISO
  /** Giá chào nếu có (VND/kg). */
  offerPrice?: number;
  salesChannel: SalesChannel;
  source: OrderChannel;
  notes?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  /** Lịch sử sửa tiêu chuẩn để truy vết thông báo xuống ngoài vườn / kho. */
  specRevisions: number;
}

// ---------- Tín hiệu thị trường ----------

export interface MarketSignal {
  id: string;
  market: string; // khách mua hoặc thị trường
  product: ProductKey;
  grade: Grade;
  qtyKg: number;
  price: number; // VND/kg
  validUntil: string; // ISO
  source: OrderChannel;
  enteredBy: string;
  createdAt: string;
}

// ---------- Lệnh thu hoạch ----------

export type HarvestOrderStatus = "pending" | "in_progress" | "done";

export const HARVEST_STATUS_LABEL: Record<HarvestOrderStatus, string> = {
  pending: "Chưa bắt đầu",
  in_progress: "Đang hái",
  done: "Đã xong",
};

/** Hướng dẫn hái trực quan, rút gọn — sinh tự động từ tiêu chuẩn khách mua. */
export interface PickingGuide {
  headline: string;
  colorHint: string;
  sizeHint: string;
  doList: string[];
  dontList: string[];
  /** Tăng mỗi lần Bán hàng sửa tiêu chuẩn -> ngoài vườn thấy dấu "đã cập nhật". */
  revision: number;
}

export interface HarvestIncident {
  id: string;
  at: string;
  by: string;
  note: string;
}

export interface HarvestOrder {
  id: string;
  product: ProductKey;
  targetKg: number;
  farm: string;
  deadline: string; // ISO
  orderId?: string;
  guide: PickingGuide;
  status: HarvestOrderStatus;
  pickedKg: number;
  incidents: HarvestIncident[];
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

// ---------- Lô hàng ----------

export type BatchStatus =
  | "planned"
  | "harvesting"
  | "intake"
  | "qc_done"
  | "decision"
  | "processing"
  | "shipped"
  | "closed";

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  planned: "Đã lên kế hoạch",
  harvesting: "Đang thu hoạch",
  intake: "Đã nhập kho",
  qc_done: "Đã kiểm soát chất lượng",
  decision: "Quyết định xử lý",
  processing: "Xử lý / Đóng gói",
  shipped: "Xuất hàng",
  closed: "Đóng lô",
};

export const BATCH_STATUS_ORDER: BatchStatus[] = [
  "planned",
  "harvesting",
  "intake",
  "qc_done",
  "decision",
  "processing",
  "shipped",
  "closed",
];

/** Kết quả kiểm soát chất lượng / phân loại — nhập tay tại kho. */
export interface QcResult {
  gradeKg: Record<Grade, number>;
  notes?: string;
  /** Ảnh dạng data URL hoặc tên tệp (demo). */
  photos: string[];
  confirmedAt: string;
  confirmedBy: string;
}

/** 6 bước Quy trình Thực địa BioFresh. */
export type ProtocolStepKey =
  | "sort"
  | "solution"
  | "dip"
  | "dry"
  | "pack"
  | "sync";

export interface ProtocolStep {
  key: ProtocolStepKey;
  status: "pending" | "done";
  at?: string;
  by?: string;
  note?: string;
}

export interface BatchOutcome {
  shippedKg: number;
  acceptedKg: number;
  rejectedKg: number;
  actualRevenue: number;
  closedAt: string;
}

export interface Batch {
  id: string; // mã lô, ví dụ BF-2026-0801
  harvestOrderId?: string;
  product: ProductKey;
  origin: string; // vườn / nông hộ / HTX
  harvestedAt: string;
  intakeAt?: string;
  totalKg: number;
  status: BatchStatus;
  qc?: QcResult;
  protocol: ProtocolStep[];
  /** Ghi chú chất lượng HTX chọn công khai trên Hộ chiếu Quy trình. */
  publicNote?: string;
  outcome?: BatchOutcome;
  createdAt: string;
}

// ---------- Phân bổ hàng ----------

export type AllocationStatus = "planned" | "confirmed" | "shipped";

export const ALLOCATION_STATUS_LABEL: Record<AllocationStatus, string> = {
  planned: "Dự kiến",
  confirmed: "Đã xác nhận",
  shipped: "Đã xuất",
};

export interface Allocation {
  id: string;
  batchId: string;
  grade: Grade;
  kg: number;
  /** Phân bổ cho đơn hàng, hoặc cho kênh bán khi xử lý hàng dư thừa. */
  orderId?: string;
  channel?: SalesChannel;
  label: string;
  status: AllocationStatus;
  createdAt: string;
  createdBy: string;
}

// ---------- Ca quyết định hàng dư thừa ----------

export type DecisionKind =
  | "sell_now"
  | "switch_channel"
  | "preserve"
  | "process"
  | "hold";

export const DECISION_LABEL: Record<DecisionKind, string> = {
  sell_now: "Bán ngay",
  switch_channel: "Đổi kênh bán",
  preserve: "Bảo quản (Quy trình BioFresh)",
  process: "Chế biến",
  hold: "Giữ hàng chờ tín hiệu",
};

export type Urgency = "low" | "medium" | "high";

export const URGENCY_LABEL: Record<Urgency, string> = {
  low: "Bình thường",
  medium: "Cần theo dõi",
  high: "Khẩn cấp",
};

export interface DecisionOption {
  id: string;
  kind: DecisionKind;
  label: string;
  detail: string;
  /** Giá trị ròng dự kiến (VND) = doanh thu dự kiến - chi phí thêm. */
  netValue: number;
  extraCost: number;
  /** Số ngày dự kiến thu được tiền. */
  cashInDays: number;
  risk: Urgency;
  riskNote: string;
  /** Nguồn số liệu: đơn hàng / tín hiệu thị trường / giá tham chiếu nội bộ. */
  basis: string;
  requiresProtocol: boolean;
  /**
   * Khả năng thực hiện được phương án (0–1): đã có người mua xác định hay chưa.
   * Giá trị ròng nhân với hệ số này ra giá trị kỳ vọng — tránh việc phương án
   * "giữ hàng" trông đẹp nhất chỉ vì chưa ai trả giá.
   */
  certainty: number;
  certaintyNote: string;
}

export interface DecisionTask {
  id: string;
  label: string;
  owner: Role;
  done: boolean;
}

export interface DecisionCase {
  id: string;
  batchId: string;
  grade: Grade;
  unallocatedKg: number;
  urgency: Urgency;
  /** Hạn phải hành động (do cấu hình nội bộ, không phải mô hình dự báo). */
  actionDeadline: string;
  options: DecisionOption[];
  chosenOptionId?: string;
  decidedAt?: string;
  decidedBy?: string;
  tasks: DecisionTask[];
  createdAt: string;
}

// ---------- Cảnh báo ----------

export type AlertKind =
  | "order_shortage"
  | "surplus"
  | "batch_at_risk"
  | "spec_updated"
  | "protocol_incomplete";

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: Urgency;
  title: string;
  detail: string;
  /** Vai trò cần thấy cảnh báo này. */
  roles: Role[];
  href?: string;
}

// ---------- Cấu hình HTX ----------

export interface CoopConfig {
  coopName: string;
  /** Ngưỡng kg chưa phân bổ để mở ca quyết định. */
  surplusThresholdKg: number;
  /** Số giờ trước hạn hành động thì coi là khẩn cấp. */
  urgentWithinHours: number;
}
