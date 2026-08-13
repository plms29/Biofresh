import type { Batch, ProtocolStep, ProtocolStepKey } from "@/types";

/** The six mandatory steps of the BioFresh Field Protocol. */
export const PROTOCOL_STEPS: {
  key: ProtocolStepKey;
  label: string;
  hint: string;
}[] = [
  {
    key: "sort",
    label: "Sorting",
    hint: "Remove bruised, split or mouldy fruit before treatment.",
  },
  {
    key: "solution",
    label: "Solution prep",
    hint: "Mix the preservation solution to ratio and record the batch mixed.",
  },
  {
    key: "dip",
    label: "Dip / Spray",
    hint: "Dip or spray evenly across the whole surface of the fruit.",
  },
  {
    key: "dry",
    label: "Drying",
    hint: "Dry completely before packing so no moisture is trapped.",
  },
  {
    key: "pack",
    label: "Packing",
    hint: "Pack to the buyer's specification and apply the batch code.",
  },
  {
    key: "sync",
    label: "Data sync",
    hint: "Sync batch data to the system to publish the Process Passport.",
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

/** The next step to record, following the protocol order. */
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
