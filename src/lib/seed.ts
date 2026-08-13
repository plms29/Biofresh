import {
  type Allocation,
  type Batch,
  type CoopConfig,
  type DecisionCase,
  type HarvestOrder,
  type MarketSignal,
  type Order,
  type ProtocolStep,
  type ProtocolStepKey,
} from "@/types";
import { buildPickingGuide } from "./domain/guide";
import { emptyProtocol, PROTOCOL_STEPS } from "./domain/protocol";

export interface SeedData {
  config: CoopConfig;
  orders: Order[];
  signals: MarketSignal[];
  harvestOrders: HarvestOrder[];
  batches: Batch[];
  allocations: Allocation[];
  cases: DecisionCase[];
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Dữ liệu trình diễn — sinh tương đối theo thời điểm mở hệ thống lần đầu. */
export function buildSeed(now: number): SeedData {
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  const config: CoopConfig = {
    coopName: "HTX Nông sản Đà Lạt Xanh",
    surplusThresholdKg: 80,
    urgentWithinHours: 12,
  };

  const orders: Order[] = [
    {
      id: "DH-1042",
      buyerName: "Siêu thị FreshMart",
      product: "strawberry",
      qtyKg: 300,
      spec: {
        grade: "A",
        sizeMinMm: 28,
        sizeMaxMm: 40,
        colorNote: "Đỏ đều từ vai xuống chóp, cuống xanh còn tươi",
        brixMin: 9,
        rejectNotes: "trái dập, đốm nấm trắng, cuống khô",
      },
      dueDate: iso(2 * DAY),
      offerPrice: 168000,
      salesChannel: "supermarket",
      source: "zalo",
      notes: "Giao 2 chuyến, mỗi chuyến 150 kg. Thùng 500 g có nắp.",
      status: "confirmed",
      createdAt: iso(-5 * DAY),
      updatedAt: iso(-20 * HOUR),
      specRevisions: 1,
    },
    {
      id: "DH-1043",
      buyerName: "Công ty XK Mekong Fruits",
      product: "mango",
      qtyKg: 500,
      spec: {
        grade: "A",
        sizeMinMm: 90,
        colorNote: "Vỏ xanh chuyển vàng nhẹ, không rám nắng",
        brixMin: 12,
        rejectNotes: "vết rám > 2 cm, xì mủ",
      },
      dueDate: iso(4 * DAY),
      offerPrice: 47000,
      salesChannel: "export",
      source: "email",
      notes: "Cần ảnh phân loại kèm mỗi lô.",
      status: "confirmed",
      createdAt: iso(-3 * DAY),
      updatedAt: iso(-3 * DAY),
      specRevisions: 0,
    },
    {
      id: "DH-1044",
      buyerName: "Vựa Thủ Đức — anh Bảy",
      product: "dragon_fruit",
      qtyKg: 800,
      spec: {
        grade: "B",
        sizeMinMm: 0,
        colorNote: "Cho phép sai màu nhẹ, tai còn tươi",
      },
      dueDate: iso(3 * DAY),
      offerPrice: 19500,
      salesChannel: "wholesale",
      source: "phone",
      notes: "Chốt qua điện thoại, chờ xác nhận số lượng cuối.",
      status: "draft",
      createdAt: iso(-1 * DAY),
      updatedAt: iso(-1 * DAY),
      specRevisions: 0,
    },
    {
      id: "DH-1045",
      buyerName: "Chuỗi cửa hàng Organic Home",
      product: "avocado",
      qtyKg: 200,
      spec: {
        grade: "A",
        sizeMinMm: 70,
        colorNote: "Vỏ xanh bóng, cứng vừa, chưa mềm tay",
      },
      dueDate: iso(28 * HOUR),
      offerPrice: 60000,
      salesChannel: "retail",
      source: "zalo",
      status: "fulfilled",
      createdAt: iso(-2 * DAY),
      updatedAt: iso(-2 * DAY),
      specRevisions: 0,
    },
  ];

  const signals: MarketSignal[] = [
    {
      id: "TT-201",
      market: "Siêu thị GreenLine",
      product: "strawberry",
      grade: "B",
      qtyKg: 120,
      price: 112000,
      validUntil: iso(2 * DAY),
      source: "zalo",
      enteredBy: "Bán hàng — Trang",
      createdAt: iso(-6 * HOUR),
    },
    {
      id: "TT-202",
      market: "Chợ đầu mối Bình Điền",
      product: "dragon_fruit",
      grade: "B",
      qtyKg: 1000,
      price: 17500,
      validUntil: iso(1 * DAY),
      source: "phone",
      enteredBy: "Bán hàng — Khoa",
      createdAt: iso(-10 * HOUR),
    },
    {
      id: "TT-203",
      market: "Nhà máy nước ép Vfruit",
      product: "mango",
      grade: "PROCESS",
      qtyKg: 2000,
      price: 12500,
      validUntil: iso(5 * DAY),
      source: "email",
      enteredBy: "Bán hàng — Trang",
      createdAt: iso(-30 * HOUR),
    },
  ];

  const harvestOrders: HarvestOrder[] = [
    {
      id: "LTH-501",
      product: "strawberry",
      targetKg: 350,
      farm: "Vườn A2 — hộ ông Tuấn",
      deadline: iso(9 * HOUR),
      orderId: "DH-1042",
      guide: buildPickingGuide(
        "strawberry",
        orders[0].spec,
        1,
        "Siêu thị FreshMart"
      ),
      status: "in_progress",
      pickedKg: 180,
      incidents: [
        {
          id: "SC-1",
          at: iso(-3 * HOUR),
          by: "Ngoài vườn — chú Hùng",
          note: "Luống cuối bị sương muối nhẹ, trái nhỏ hơn tiêu chuẩn.",
        },
      ],
      createdAt: iso(-20 * HOUR),
      startedAt: iso(-6 * HOUR),
    },
    {
      id: "LTH-502",
      product: "mango",
      targetKg: 520,
      farm: "Vườn C1 — hộ bà Liên",
      deadline: iso(2 * DAY),
      orderId: "DH-1043",
      guide: buildPickingGuide(
        "mango",
        orders[1].spec,
        0,
        "Công ty XK Mekong Fruits"
      ),
      status: "pending",
      pickedKg: 0,
      incidents: [],
      createdAt: iso(-8 * HOUR),
    },
    {
      id: "LTH-499",
      product: "strawberry",
      targetKg: 400,
      farm: "Vườn A1 — hộ ông Tuấn",
      deadline: iso(-30 * HOUR),
      orderId: "DH-1042",
      guide: buildPickingGuide("strawberry", orders[0].spec, 0),
      status: "done",
      pickedKg: 392,
      incidents: [],
      createdAt: iso(-3 * DAY),
      startedAt: iso(-2 * DAY),
      finishedAt: iso(-30 * HOUR),
    },
    {
      id: "LTH-498",
      product: "dragon_fruit",
      targetKg: 900,
      farm: "Vườn D3 — HTX Long Bình",
      deadline: iso(-3 * DAY),
      orderId: "DH-1044",
      guide: buildPickingGuide("dragon_fruit", orders[2].spec, 0),
      status: "done",
      pickedKg: 880,
      incidents: [],
      createdAt: iso(-5 * DAY),
      startedAt: iso(-4 * DAY),
      finishedAt: iso(-3 * DAY),
    },
  ];

  const proto = (doneKeys: ProtocolStepKey[], base: number): ProtocolStep[] =>
    emptyProtocol().map((step, i) =>
      doneKeys.includes(step.key)
        ? {
            ...step,
            status: "done" as const,
            at: iso(base + i * 25 * 60_000),
            by: "Kho — Nhung",
          }
        : step
    );

  const batches: Batch[] = [
    {
      id: "BF-2608-01",
      harvestOrderId: "LTH-499",
      product: "strawberry",
      origin: "Vườn A1 — hộ ông Tuấn",
      harvestedAt: iso(-30 * HOUR),
      intakeAt: iso(-27 * HOUR),
      totalKg: 392,
      status: "qc_done",
      qc: {
        gradeKg: { A: 240, B: 96, PROCESS: 42, REJECT: 14 },
        notes: "Trái luống ngoài nhỏ hơn tiêu chuẩn, xuống hạng B.",
        photos: [],
        confirmedAt: iso(-20 * HOUR),
        confirmedBy: "Kiểm soát chất lượng — Nhung",
      },
      protocol: emptyProtocol(),
      createdAt: iso(-30 * HOUR),
    },
    {
      id: "BF-2608-02",
      harvestOrderId: "LTH-498",
      product: "dragon_fruit",
      origin: "Vườn D3 — HTX Long Bình",
      harvestedAt: iso(-3 * DAY),
      intakeAt: iso(-3 * DAY + 4 * HOUR),
      totalKg: 880,
      status: "processing",
      qc: {
        gradeKg: { A: 210, B: 540, PROCESS: 105, REJECT: 25 },
        notes: "Tai hơi héo do vận chuyển giữa trưa.",
        photos: [],
        confirmedAt: iso(-2 * DAY - 18 * HOUR),
        confirmedBy: "Kiểm soát chất lượng — Nhung",
      },
      publicNote: "Lô được xử lý bảo quản theo Quy trình Thực địa BioFresh.",
      protocol: proto(["sort", "solution", "dip", "dry"], -20 * HOUR),
      createdAt: iso(-3 * DAY),
    },
    {
      id: "BF-2608-03",
      product: "mango",
      origin: "Vườn C2 — hộ ông Sáu",
      harvestedAt: iso(-5 * HOUR),
      totalKg: 310,
      status: "intake",
      protocol: emptyProtocol(),
      createdAt: iso(-5 * HOUR),
    },
    {
      id: "BF-2607-24",
      product: "avocado",
      origin: "Vườn B4 — hộ bà Thanh",
      harvestedAt: iso(-9 * DAY),
      intakeAt: iso(-9 * DAY + 3 * HOUR),
      totalKg: 260,
      status: "closed",
      qc: {
        gradeKg: { A: 205, B: 40, PROCESS: 10, REJECT: 5 },
        notes: "Lô đạt tiêu chuẩn cửa hàng, đóng gói thùng 5 kg.",
        photos: [],
        confirmedAt: iso(-8 * DAY - 20 * HOUR),
        confirmedBy: "Kiểm soát chất lượng — Nhung",
      },
      publicNote:
        "Lô hoàn tất đủ 6 bước Quy trình Thực địa BioFresh trước khi xuất hàng.",
      protocol: proto(
        PROTOCOL_STEPS.map((s) => s.key),
        -8 * DAY - 12 * HOUR
      ),
      outcome: {
        shippedKg: 205,
        acceptedKg: 199,
        rejectedKg: 6,
        actualRevenue: 199 * 58000,
        closedAt: iso(-6 * DAY),
      },
      createdAt: iso(-9 * DAY),
    },
  ];

  const allocations: Allocation[] = [
    {
      id: "PB-9001",
      batchId: "BF-2608-01",
      grade: "A",
      kg: 150,
      orderId: "DH-1042",
      channel: "supermarket",
      label: "Siêu thị FreshMart — chuyến 1",
      status: "confirmed",
      createdAt: iso(-19 * HOUR),
      createdBy: "Bán hàng — Trang",
    },
    {
      id: "PB-9002",
      batchId: "BF-2608-02",
      grade: "B",
      kg: 400,
      orderId: "DH-1044",
      channel: "wholesale",
      label: "Vựa Thủ Đức — anh Bảy",
      status: "planned",
      createdAt: iso(-2 * DAY),
      createdBy: "Bán hàng — Khoa",
    },
    {
      id: "PB-8990",
      batchId: "BF-2607-24",
      grade: "A",
      kg: 205,
      orderId: "DH-1045",
      channel: "retail",
      label: "Organic Home — đơn tháng 7",
      status: "shipped",
      createdAt: iso(-8 * DAY),
      createdBy: "Bán hàng — Trang",
    },
  ];

  const cases: DecisionCase[] = [];

  return { config, orders, signals, harvestOrders, batches, allocations, cases };
}
