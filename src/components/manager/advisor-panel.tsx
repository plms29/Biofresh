"use client";

import * as React from "react";
import { Bot, Loader2, TriangleAlert } from "lucide-react";
import type { AdvisorVerdict, DecisionCase, DecisionPriority } from "@/types";
import { useBio } from "@/store/use-biofresh";
import { askAdvisor, buildAdvisorRequest } from "@/lib/domain/advisor";
import { recommendedOption } from "@/lib/domain/decisions";
import { cn } from "@/lib/utils";

/**
 * The Gemini assistant for one decision case.
 *
 * It argues over figures that were already computed — it is not allowed to
 * produce any of its own, and the API route drops an answer that names an
 * option outside the list it was given. The panel labels its output as an
 * opinion for exactly that reason: the numbers on the option rows are audited
 * arithmetic, this text is not.
 */
export function AdvisorPanel({
  kase,
  now,
  priority,
  onFollow,
}: {
  kase: DecisionCase;
  now: number;
  /** What the Manager is ranking by — the assistant is shown the same objective. */
  priority: DecisionPriority;
  onFollow: (optionId: string) => void;
}) {
  const batches = useBio((s) => s.batches);
  const orders = useBio((s) => s.orders);
  const signals = useBio((s) => s.signals);
  const allocations = useBio((s) => s.allocations);

  const [verdict, setVerdict] = React.useState<AdvisorVerdict | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  /** The options the current verdict was written about. */
  const [answeredFor, setAnsweredFor] = React.useState<string | null>(null);

  const rulePick = recommendedOption(kase.options, priority);

  /**
   * The options change as stock is allocated and signals expire. Prose written
   * about the old figures would sit next to the new ones and read as if it
   * described them, which is exactly the confusion this feature must not
   * create — so an answer is held only for as long as its figures stand.
   */
  const signature = React.useMemo(
    () =>
      [
        // The priority is part of the question, not just the figures: an answer
        // written under "cash first" does not stand under "profit first".
        priority,
        ...kase.options.map(
          (o) =>
            `${o.id}:${Math.round(o.netValue)}:${Math.round(o.extraCost)}:${o.certainty}`
        ),
      ].join("|"),
    [kase.options, priority]
  );
  const stale = verdict !== null && answeredFor !== null && answeredFor !== signature;

  const abortRef = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => abortRef.current?.abort(), []);

  const picked =
    verdict && !stale
      ? kase.options.find((o) => o.id === verdict.recommendedOptionId)
      : undefined;

  const ask = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    const asked = signature;
    const payload = buildAdvisorRequest({
      kase,
      batch: batches.find((b) => b.id === kase.batchId),
      orders,
      signals,
      batches,
      allocations,
      priority,
      now,
    });
    const res = await askAdvisor(payload, controller.signal);
    if (controller.signal.aborted) return;
    if (res.ok) {
      setVerdict(res.verdict);
      setAnsweredFor(asked);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="rounded-xl bg-sky-100/60 p-4 ring-1 ring-sky-500/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-sky-700">
          <Bot className="size-4" /> Ask the assistant
        </p>
        <button
          onClick={ask}
          disabled={loading}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-700 px-3 text-sm font-medium text-white transition-colors hover:bg-sky-700/90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Thinking…
            </>
          ) : verdict ? (
            "Ask again"
          ) : (
            "What would you do?"
          )}
        </button>
      </div>

      {!verdict && !error && !loading ? (
        <p className="mt-2 text-sm text-foreground/70">
          A second opinion on the options above. It reads the same figures you
          see — it cannot change them.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-risk-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      {stale ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-sun-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            The figures or the priority have changed since this answer was
            written. Ask again for an opinion on the options as they stand now.
          </span>
        </p>
      ) : null}

      {verdict && !stale ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="rounded-lg bg-card p-3.5 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Assistant picks
              </span>
              <span className="font-medium">{picked?.label ?? "—"}</span>
              {verdict.disagreesWithRules ? (
                <span className="rounded-full bg-sun-100 px-2 py-0.5 text-xs font-medium text-sun-700">
                  differs from the calculated pick ({rulePick.label})
                </span>
              ) : (
                <span className="rounded-full bg-leaf-50 px-2 py-0.5 text-xs font-medium text-leaf-700">
                  agrees with the calculation
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-foreground/85">{verdict.reasoning}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-card/70 p-3.5 ring-1 ring-foreground/10">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Watch out for
              </p>
              <p className="mt-1.5 text-sm text-foreground/85">{verdict.watchOut}</p>
            </div>
            <div className="rounded-lg bg-card/70 p-3.5 ring-1 ring-foreground/10">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Demand outlook
              </p>
              <p className="mt-1.5 text-sm text-foreground/85">
                {verdict.demandOutlook}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Model confidence {Math.round(verdict.confidence * 100)}% · an
              opinion, not a calculation — the figures above are the audited
              part.
            </p>
            {picked ? (
              <button
                onClick={() => onFollow(picked.id)}
                className={cn(
                  "min-h-9 rounded-lg px-3 text-sm font-medium ring-1 transition-colors",
                  "bg-card text-foreground ring-foreground/15 hover:bg-muted"
                )}
              >
                Select this option
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
