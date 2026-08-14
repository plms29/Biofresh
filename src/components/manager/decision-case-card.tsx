"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Info, Sparkles } from "lucide-react";
import {
  CASE_ORIGIN_LABEL,
  ROLE_META,
  type DecisionCase,
  type DecisionOption,
} from "@/types";
import {
  expectedValue,
  explainOption,
  recommendedOption,
} from "@/lib/domain/decisions";
import { kg, untilText, vnd, vndShort } from "@/lib/domain/format";
import { useBio } from "@/store/use-biofresh";
import { GradeTag, UrgencyTag } from "@/components/common/badges";
import { ProductLabel } from "@/components/common/product-mark";
import { AdvisorPanel } from "@/components/manager/advisor-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function DecisionCaseCard({
  kase,
  now,
}: {
  kase: DecisionCase;
  now: number;
}) {
  const batches = useBio((s) => s.batches);
  const chooseOption = useBio((s) => s.chooseOption);
  const toggleTask = useBio((s) => s.toggleTask);
  const { toast } = useToast();

  const batch = batches.find((b) => b.id === kase.batchId);
  const recommended = recommendedOption(kase.options);
  const [selectedId, setSelectedId] = React.useState(recommended.id);
  const [explainId, setExplainId] = React.useState<string | null>(null);

  const chosen = kase.chosenOptionId
    ? kase.options.find((o) => o.id === kase.chosenOptionId)
    : undefined;

  const lotForExplain = {
    batchId: kase.batchId,
    grade: kase.grade,
    availableKg: kase.unallocatedKg,
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <Link href={`/batches/${kase.batchId}`} className="hover:underline">
                {kase.batchId}
              </Link>
              <GradeTag grade={kase.grade} />
              <UrgencyTag urgency={kase.urgency} />
              {kase.origin === "buyer_rejection" ? (
                <span className="rounded-full bg-risk-100 px-2 py-0.5 text-xs font-medium text-risk-700 ring-1 ring-inset ring-risk-300">
                  {CASE_ORIGIN_LABEL.buyer_rejection}
                </span>
              ) : null}
            </CardTitle>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              {batch ? (
                <>
                  <ProductLabel product={batch.product} />
                  <span>· {batch.origin}</span>
                </>
              ) : (
                kase.batchId
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="tnum font-heading text-lg font-semibold">
              {kg(kase.unallocatedKg)}
            </p>
            <p className="text-xs text-muted-foreground">
              {chosen ? "covered by the decision" : "unallocated"}
            </p>
            {chosen ? null : (
              <p
                className={cn(
                  "tnum mt-1 text-xs",
                  kase.urgency === "high"
                    ? "font-medium text-risk-700"
                    : "text-muted-foreground"
                )}
              >
                action deadline · {now ? untilText(kase.actionDeadline, now) : "—"}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {chosen ? (
          <div className="rounded-xl bg-leaf-50 p-4 ring-1 ring-leaf-200">
            <p className="flex items-center gap-2 font-medium text-leaf-800">
              <CheckCircle2 className="size-4" /> Decided: {chosen.label}
            </p>
            <p className="tnum mt-1 text-sm text-leaf-900/80">
              Expected net value {vnd(chosen.netValue)} · cash in{" "}
              {chosen.cashInDays} days · {kase.decidedBy}
            </p>
            <div className="mt-3">
              <p className="text-xs font-semibold tracking-wide text-leaf-700 uppercase">
                Follow-up tasks
              </p>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {kase.tasks.map((t) => (
                  <li key={t.id}>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleTask(kase.id, t.id)}
                        className="mt-0.5 size-4 accent-leaf-600"
                      />
                      <span className={t.done ? "text-muted-foreground line-through" : ""}>
                        {t.label}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          · {ROLE_META[t.owner].short}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {kase.options.map((o) => (
                <OptionRow
                  key={o.id}
                  option={o}
                  selected={selectedId === o.id}
                  recommended={recommended.id === o.id}
                  onSelect={() => setSelectedId(o.id)}
                  onExplain={() =>
                    setExplainId((prev) => (prev === o.id ? null : o.id))
                  }
                  explaining={explainId === o.id}
                  explanation={explainOption(o, kase.options, lotForExplain)}
                />
              ))}
            </div>

            <AdvisorPanel kase={kase} now={now} onFollow={setSelectedId} />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="lg"
                onClick={() => {
                  chooseOption(kase.id, selectedId);
                  const opt = kase.options.find((o) => o.id === selectedId);
                  toast(
                    `Decided: "${opt?.label}" — the follow-up tasks have been sent to each team.`
                  );
                }}
              >
                Confirm selected option
              </Button>
              <p className="text-xs text-muted-foreground">
                Every figure comes from orders, market signals entered by Sales and
                the internal reference price. The assistant reads those figures; it
                does not produce them.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OptionRow({
  option,
  selected,
  recommended,
  onSelect,
  onExplain,
  explaining,
  explanation,
}: {
  option: DecisionOption;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
  onExplain: () => void;
  explaining: boolean;
  explanation: string[];
}) {
  return (
    <div
      className={cn(
        "rounded-xl ring-1 transition-colors",
        selected ? "bg-leaf-50 ring-leaf-300" : "bg-card ring-foreground/10"
      )}
    >
      <button
        onClick={onSelect}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span
          className={cn(
            "mt-0.5 size-4 shrink-0 rounded-full ring-2",
            selected ? "bg-leaf-600 ring-leaf-600" : "bg-card ring-border"
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{option.label}</span>
            {recommended ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-leaf-600 px-2 py-0.5 text-xs font-medium text-white">
                <Sparkles className="size-3" /> Recommended
              </span>
            ) : null}
            <UrgencyTag
              urgency={option.risk}
              label={
                option.risk === "high"
                  ? "High risk"
                  : option.risk === "medium"
                    ? "Medium risk"
                    : "Low risk"
              }
            />
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            {option.detail}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="tnum block font-heading text-base font-semibold">
            {vndShort(expectedValue(option))}
          </span>
          <span className="tnum block text-xs text-muted-foreground">
            expected · net {vndShort(option.netValue)}
          </span>
          <span className="tnum block text-xs text-muted-foreground">
            +{vndShort(option.extraCost)} cost
          </span>
          <span className="tnum block text-xs text-muted-foreground">
            {option.cashInDays} days to cash
          </span>
        </span>
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-border/70 px-4 py-2">
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          Confidence {Math.round(option.certainty * 100)}% · Source:{" "}
          {option.basis}
        </p>
        <Button size="xs" variant="ghost" onClick={onExplain}>
          <Info className="size-3" /> Explain
          <ChevronDown
            className={cn(
              "size-3 transition-transform",
              explaining && "rotate-180"
            )}
          />
        </Button>
      </div>

      {explaining ? (
        <ul className="flex flex-col gap-1.5 border-t border-border/70 bg-muted/40 px-4 py-3 text-sm">
          {explanation.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-leaf-500" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
