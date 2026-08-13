import {
  DECISION_LABEL,
  GRADE_LABEL,
  SALES_CHANNEL_LABEL,
  type CoopConfig,
  type DecisionCase,
  type DecisionOption,
  type DecisionTask,
  type MarketSignal,
  type Order,
  type Urgency,
} from "@/types";
import { PRODUCTS } from "./catalog";
import { hoursUntil, kg, vnd } from "./format";
import type { Lot } from "./inventory";

/** Chi phí thêm ước tính (VND/kg) — cấu hình nội bộ, minh bạch cho Quản lý. */
const COST_PER_KG = {
  transportSpot: 1200,
  transportChannel: 2000,
  preserve: 3500, // dung dịch + nhân công + làm khô + đóng gói lại
  process: 2500, // vận chuyển tới nhà máy chế biến
  hold: 300, // lưu kho thường
};

/** Hệ số giá theo kênh khi đổi kênh bán (so với giá tham chiếu nội bộ). */
const CHANNEL_FACTOR = {
  wholesale: 0.78,
  retail: 0.95,
  supermarket: 1.0,
  export: 1.15,
  processing: 0.45,
} as const;

function urgencyOf(lot: Lot, config: CoopConfig, now: number): Urgency {
  const h = hoursUntil(lot.actionDeadline, now);
  if (h <= 0) return "high";
  if (h <= config.urgentWithinHours) return "high";
  if (h <= config.urgentWithinHours * 2) return "medium";
  return "low";
}

function activeSignals(
  signals: MarketSignal[],
  lot: Lot,
  now: number
): MarketSignal[] {
  return signals
    .filter(
      (s) =>
        s.product === lot.product &&
        s.grade === lot.grade &&
        new Date(s.validUntil).getTime() > now
    )
    .sort((a, b) => b.price - a.price);
}

/**
 * Sinh các phương án xử lý hàng dư thừa cho một lô con.
 * Toàn bộ số liệu đến từ: đơn hàng đang mở, tín hiệu thị trường do Bán hàng nhập,
 * và giá tham chiếu nội bộ. Không có mô hình dự báo — mọi con số đều truy được nguồn.
 */
export function buildOptions(
  lot: Lot,
  orders: Order[],
  signals: MarketSignal[],
  config: CoopConfig,
  now: number
): DecisionOption[] {
  const meta = PRODUCTS[lot.product];
  const ref = meta.refPrice[lot.grade];
  const qty = lot.availableKg;
  const urgency = urgencyOf(lot, config, now);
  const options: DecisionOption[] = [];

  // 1. Bán ngay — ưu tiên tín hiệu thị trường còn hiệu lực, nếu không có thì bán theo giá tham chiếu có chiết khấu.
  const best = activeSignals(signals, lot, now)[0];
  const spotQty = best ? Math.min(qty, best.qtyKg) : qty;
  const spotPrice = best ? best.price : Math.round(ref * 0.88);
  const spotCost = spotQty * COST_PER_KG.transportSpot;
  options.push({
    id: "sell_now",
    kind: "sell_now",
    label: DECISION_LABEL.sell_now,
    detail: best
      ? `Bán ${kg(spotQty)} cho ${best.market} theo tín hiệu ${vnd(
          best.price
        )}/kg (hiệu lực tới ${new Date(best.validUntil).toLocaleDateString(
          "vi-VN"
        )}).`
      : `Chưa có tín hiệu thị trường còn hiệu lực. Bán nhanh theo giá tham chiếu trừ 12% để xả hàng: ${vnd(
          spotPrice
        )}/kg.`,
    netValue: spotQty * spotPrice - spotCost,
    extraCost: spotCost,
    cashInDays: best ? 3 : 2,
    risk: best ? "low" : "medium",
    riskNote: best
      ? "Đã có người mua xác định, rủi ro thấp."
      : "Chưa có người mua xác định, có thể phải giảm giá thêm.",
    basis: best
      ? `Tín hiệu thị trường ${best.id} (${best.enteredBy})`
      : "Giá tham chiếu nội bộ − 12%",
    requiresProtocol: false,
    certainty: best ? 0.95 : 0.75,
    certaintyNote: best
      ? `Đã có người mua hỏi hàng (${best.market}).`
      : "Chưa có người mua hỏi hàng, phải đi chào lại.",
  });

  // 2. Đổi kênh bán — dùng kênh của đơn hàng đang mở khác, hoặc kênh chợ đầu mối.
  const otherChannels = [
    ...new Set(
      orders
        .filter((o) => o.product === lot.product && o.status !== "cancelled")
        .map((o) => o.salesChannel)
    ),
  ];
  const channel =
    otherChannels.find((c) => c !== "supermarket") ?? ("wholesale" as const);
  const chPrice = Math.round(ref * CHANNEL_FACTOR[channel]);
  const chCost = qty * COST_PER_KG.transportChannel;
  options.push({
    id: "switch_channel",
    kind: "switch_channel",
    label: `${DECISION_LABEL.switch_channel} → ${SALES_CHANNEL_LABEL[channel]}`,
    detail: `Chuyển toàn bộ ${kg(qty)} sang kênh ${
      SALES_CHANNEL_LABEL[channel]
    } với giá ước tính ${vnd(chPrice)}/kg (${Math.round(
      CHANNEL_FACTOR[channel] * 100
    )}% giá tham chiếu). Không cần thêm xử lý.`,
    netValue: qty * chPrice - chCost,
    extraCost: chCost,
    cashInDays: 5,
    risk: "low",
    riskNote: "Kênh nhận số lượng lớn, tiêu chuẩn thấp hơn nên ít bị từ chối.",
    basis: `Giá tham chiếu × hệ số kênh ${SALES_CHANNEL_LABEL[channel]}`,
    requiresProtocol: false,
    certainty: 0.85,
    certaintyNote: "Kênh quen, nhận số lượng lớn nhưng vẫn phải chốt giá lại.",
  });

  // 3. Bảo quản theo Quy trình Thực địa BioFresh — giữ được hạng, bán sau theo giá tốt hơn.
  const preserveCost = qty * COST_PER_KG.preserve;
  const preserveKeep = 0.94; // 6% hao hụt vật lý khi xử lý lại
  options.push({
    id: "preserve",
    kind: "preserve",
    label: DECISION_LABEL.preserve,
    detail: `Xử lý bảo quản để giữ ${GRADE_LABEL[lot.grade]} thêm ${
      meta.actionWindowHours
    } giờ, chờ đơn giá tốt. Ước tính còn ${kg(
      qty * preserveKeep
    )} sau hao hụt, bán ở ${vnd(ref)}/kg. Bắt buộc ghi đủ 6 bước quy trình.`,
    netValue: qty * preserveKeep * ref - preserveCost,
    extraCost: preserveCost,
    cashInDays: 8,
    risk: urgency === "high" ? "high" : "medium",
    riskNote:
      urgency === "high"
        ? "Lô đã sát hạn hành động, xử lý bảo quản có thể không kịp."
        : "Cần nhân công và đủ dung dịch trong ngày; phụ thuộc đơn hàng tương lai.",
    basis: "Giá tham chiếu nội bộ − chi phí xử lý bảo quản",
    requiresProtocol: true,
    certainty: urgency === "high" ? 0.55 : 0.7,
    certaintyNote:
      "Giữ được hạng nhưng vẫn phải tìm đơn sau khi bảo quản xong.",
  });

  // 4. Chế biến — chắc chắn tiêu thụ hết, giá thấp.
  const procPrice = meta.refPrice.PROCESS;
  const procCost = qty * COST_PER_KG.process;
  options.push({
    id: "process",
    kind: "process",
    label: DECISION_LABEL.process,
    detail: `Bán toàn bộ ${kg(qty)} cho nhà máy chế biến ở ${vnd(
      procPrice
    )}/kg. Chắc chắn tiêu thụ hết, không lo hàng hỏng.`,
    netValue: qty * procPrice - procCost,
    extraCost: procCost,
    cashInDays: 12,
    risk: "low",
    riskNote: "Giá thấp nhất nhưng gần như không có rủi ro tồn hàng.",
    basis: "Giá hàng chế biến trong danh mục nội bộ",
    requiresProtocol: false,
    certainty: 0.98,
    certaintyNote: "Nhà máy nhận hết, gần như chắc chắn bán được.",
  });

  // 5. Giữ hàng chờ tín hiệu — chỉ hợp lý khi còn nhiều thời gian.
  const holdCost = qty * COST_PER_KG.hold;
  options.push({
    id: "hold",
    kind: "hold",
    label: DECISION_LABEL.hold,
    detail:
      urgency === "high"
        ? `Không khuyến nghị: lô chỉ còn dưới ${config.urgentWithinHours} giờ tới hạn hành động.`
        : `Giữ nguyên trong kho, chờ Bán hàng nhập tín hiệu tốt hơn ${vnd(
            ref
          )}/kg. Rà lại trước hạn hành động.`,
    netValue: urgency === "high" ? qty * ref * 0.5 - holdCost : qty * ref - holdCost,
    extraCost: holdCost,
    cashInDays: 10,
    risk: urgency === "high" ? "high" : "medium",
    riskNote:
      urgency === "high"
        ? "Rủi ro mất giá rất cao nếu không hành động trong hôm nay."
        : "Chưa có người mua; giá trị dự kiến chỉ là kỳ vọng.",
    basis: "Giá tham chiếu nội bộ, chưa có người mua xác nhận",
    requiresProtocol: false,
    certainty: urgency === "high" ? 0.25 : 0.5,
    certaintyNote:
      urgency === "high"
        ? "Chưa có ai hỏi mua và lô sắp tới hạn — khả năng bán được đúng giá rất thấp."
        : "Chưa có ai hỏi mua; con số chỉ là kỳ vọng nếu tín hiệu tốt xuất hiện.",
  });

  return options;
}

/**
 * Giá trị kỳ vọng = giá trị ròng × khả năng thực hiện được.
 * Một phương án chưa có người mua thì con số đẹp cũng chỉ là kỳ vọng.
 */
export function expectedValue(option: DecisionOption): number {
  return option.netValue * option.certainty;
}

/**
 * Phương án được hệ thống gợi ý: giá trị kỳ vọng cao nhất, trừ điểm cho rủi ro
 * và cho thời gian chôn vốn (1%/ngày trên giá trị kỳ vọng).
 */
export function recommendedOption(options: DecisionOption[]): DecisionOption {
  const score = (o: DecisionOption) => {
    const ev = expectedValue(o);
    const riskFactor = o.risk === "high" ? 0.6 : o.risk === "medium" ? 0.85 : 1;
    return ev * riskFactor * (1 - Math.min(0.3, o.cashInDays * 0.01));
  };
  return [...options].sort((a, b) => score(b) - score(a))[0];
}

/** Lời giải thích dạng quy tắc — không gọi mô hình ngoài, mọi câu đều truy được nguồn. */
export function explainOption(
  option: DecisionOption,
  options: DecisionOption[],
  lot: Pick<Lot, "availableKg" | "grade">
): string[] {
  const rec = recommendedOption(options);
  const ev = expectedValue(option);
  const bestEv = Math.max(...options.map(expectedValue));
  const lines: string[] = [];

  lines.push(
    `${option.label}: giá trị ròng dự kiến ${vnd(option.netValue)} cho ${kg(
      lot.availableKg
    )} ${GRADE_LABEL[lot.grade]}, đã trừ chi phí thêm ${vnd(option.extraCost)}.`
  );
  lines.push(
    `Khả năng thực hiện ${Math.round(
      option.certainty * 100
    )}% — ${option.certaintyNote} Giá trị kỳ vọng còn ${vnd(ev)}.`
  );
  lines.push(`Cơ sở số liệu: ${option.basis}. Thu tiền sau khoảng ${option.cashInDays} ngày.`);
  lines.push(`Rủi ro: ${option.riskNote}`);

  if (ev < bestEv) {
    lines.push(
      `So với phương án có giá trị kỳ vọng cao nhất (${
        options.find((o) => expectedValue(o) === bestEv)!.label
      }), phương án này thấp hơn ${vnd(bestEv - ev)}.`
    );
  } else {
    lines.push("Đây là phương án có giá trị kỳ vọng cao nhất.");
  }

  if (option.id === rec.id) {
    lines.push("Hệ thống gợi ý phương án này sau khi cân giữa giá trị, rủi ro và thời gian thu tiền.");
  } else {
    lines.push(
      `Hệ thống gợi ý ${rec.label} vì cân bằng hơn giữa giá trị ròng, rủi ro và thời gian thu tiền.`
    );
  }

  if (option.requiresProtocol) {
    lines.push(
      "Bắt buộc ghi đủ 6 bước Quy trình Thực địa BioFresh trước khi đánh dấu hoàn tất xử lý."
    );
  }
  return lines;
}

/** Việc cần làm sinh ra sau khi Quản lý chốt phương án. */
export function tasksForOption(
  option: DecisionOption,
  lot: Pick<Lot, "batchId" | "availableKg">
): DecisionTask[] {
  const base = (label: string, owner: DecisionTask["owner"]): DecisionTask => ({
    id: `${option.id}-${owner}-${label.slice(0, 12)}`,
    label,
    owner,
    done: false,
  });

  switch (option.kind) {
    case "sell_now":
      return [
        base(`Chốt người mua và giá cho ${kg(lot.availableKg)} lô ${lot.batchId}`, "sales"),
        base(`Đóng gói và xuất ${kg(lot.availableKg)} trong hôm nay`, "packhouse"),
      ];
    case "switch_channel":
      return [
        base(`Liên hệ đầu mối kênh mới, xác nhận số lượng và giá`, "sales"),
        base(`Đóng gói theo quy cách kênh mới`, "packhouse"),
      ];
    case "preserve":
      return [
        base(`Pha dung dịch và ghi nhận 6 bước quy trình cho lô ${lot.batchId}`, "packhouse"),
        base(`Tìm đơn cho ${kg(lot.availableKg)} đã bảo quản`, "sales"),
      ];
    case "process":
      return [
        base(`Xác nhận đơn với nhà máy chế biến`, "sales"),
        base(`Cân, dồn thùng và giao cho nhà máy`, "packhouse"),
      ];
    case "hold":
      return [
        base(`Nhập tín hiệu thị trường mới trước hạn hành động`, "sales"),
        base(`Kiểm tra lại chất lượng lô trước hạn`, "packhouse"),
      ];
  }
}

/** Mở ca quyết định cho một lô con vượt ngưỡng hàng dư thừa do HTX cấu hình. */
export function buildDecisionCase(
  lot: Lot,
  orders: Order[],
  signals: MarketSignal[],
  config: CoopConfig,
  now: number
): DecisionCase {
  return {
    id: `DC-${lot.batchId}-${lot.grade}`,
    batchId: lot.batchId,
    grade: lot.grade,
    unallocatedKg: lot.availableKg,
    urgency: urgencyOf(lot, config, now),
    actionDeadline: lot.actionDeadline,
    options: buildOptions(lot, orders, signals, config, now),
    tasks: [],
    createdAt: new Date(now).toISOString(),
  };
}

export { urgencyOf };
