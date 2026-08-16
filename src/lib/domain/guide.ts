import {
  GRADE_LABEL,
  type BuyerSpec,
  type CorrectiveHarvest,
  type PickingGuide,
  type ProductKey,
} from "@/types";
import { PRODUCTS } from "./catalog";

/**
 * Turns the buyer specification into a short, visual picking guide.
 * This is the bridge that carries the buyer standard down to the field:
 * Sales enters the spec once, and the field always sees the latest summary.
 *
 * `corrective` is set only when the packhouse graded a batch short of the
 * confirmed order and sent the work back. It is carried through every later
 * rebuild of the guide so the field never loses the reason for the re-pick.
 */
export function buildPickingGuide(
  product: ProductKey,
  spec: BuyerSpec,
  revision: number,
  buyerName?: string,
  corrective?: CorrectiveHarvest
): PickingGuide {
  const meta = PRODUCTS[product];
  const size =
    spec.sizeMinMm && spec.sizeMaxMm
      ? `Diameter ${spec.sizeMinMm}–${spec.sizeMaxMm} mm`
      : spec.sizeMinMm
        ? `Diameter ${spec.sizeMinMm} mm and above`
        : spec.sizeMaxMm
          ? `Diameter up to ${spec.sizeMaxMm} mm`
          : "Even sizing — no undersized fruit mixed in";

  const color = spec.colorNote?.trim()
    ? spec.colorNote.trim()
    : spec.grade === "A"
      ? "Evenly ripe colour, no blemishes, stem still fresh"
      : "Fairly even colour, slight variation allowed";

  const doList: string[] = [
    `Pick only fruit meeting ${GRADE_LABEL[spec.grade]}: ${color.toLowerCase()}`,
    size,
    "Place gently into lined crates, no more than 3 layers deep",
    "Pick in small lots and move to the packhouse within 2 hours",
  ];
  if (spec.brixMin) {
    doList.splice(2, 0, `Favour fully sweet fruit (target Brix ≥ ${spec.brixMin})`);
  }

  const dontList: string[] = [
    "No bruised, split or weeping fruit",
    "No hard green fruit, and nothing overripe or soft",
    "Never leave crates in direct sun at the edge of the plot",
  ];
  if (spec.rejectNotes?.trim()) {
    dontList.unshift(`Buyer rejects: ${spec.rejectNotes.trim()}`);
  }

  if (corrective) {
    doList.unshift(
      `Make up the ${corrective.shortfallKg} kg batch ${corrective.batchId} was short of — ${GRADE_LABEL[spec.grade]} only, nothing borderline.`
    );
  }

  const headline = `${meta.label} — ${GRADE_LABEL[spec.grade]}${
    buyerName ? ` for ${buyerName}` : ""
  }`;

  return {
    headline: corrective ? `Corrective pick: ${headline}` : headline,
    colorHint: color,
    sizeHint: size,
    doList,
    dontList,
    revision,
    corrective,
  };
}
