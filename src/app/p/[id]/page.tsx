"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, Check, Clock, Leaf, ShieldCheck } from "lucide-react";
import { useBio } from "@/store/use-biofresh";
import { useHydrated } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import { ProductMark } from "@/components/common/product-mark";
import { PROTOCOL_STEPS, isProtocolComplete, protocolCompletedAt } from "@/lib/domain/protocol";
import { full } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/**
 * Process Passport — the only page a buyer sees after scanning the QR code.
 * Read-only. It never shows prices, other buyers, inventory or decision data.
 */
export default function PassportPage() {
  const params = useParams<{ id: string }>();
  const batchId = decodeURIComponent(params.id);
  const hydrated = useHydrated();

  const batch = useBio((s) => s.batches.find((b) => b.id === batchId));
  const coopName = useBio((s) => s.config.coopName);

  const complete = batch ? isProtocolComplete(batch) : false;
  const completedAt = batch ? protocolCompletedAt(batch) : undefined;

  return (
    <div className="min-h-dvh bg-leaf-900/[0.03] surface-grid">
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
        <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
          {/* Header */}
          <div className="hero-leaf px-6 py-7">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-leaf-600 text-white">
                <Leaf className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="font-heading text-sm font-semibold">
                  BioFresh <span className="text-leaf-600">OS</span>
                </p>
                <p className="text-xs text-muted-foreground">Process Passport</p>
              </div>
            </div>

            {!hydrated ? null : batch ? (
              <>
                <h1 className="mt-5 flex items-center gap-2.5 font-heading text-2xl font-semibold">
                  <ProductMark product={batch.product} size="lg" />
                  {PRODUCTS[batch.product].label}
                </h1>
                <p className="tnum mt-1 text-sm text-muted-foreground">
                  Batch code <strong className="text-foreground">{batch.id}</strong>
                </p>
                <div
                  className={cn(
                    "mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset",
                    complete
                      ? "bg-leaf-600 text-white ring-leaf-700/30"
                      : "bg-sun-100 text-sun-700 ring-sun-300"
                  )}
                >
                  {complete ? (
                    <>
                      <BadgeCheck className="size-4" /> Processing complete
                    </>
                  ) : (
                    <>
                      <Clock className="size-4" /> In processing
                    </>
                  )}
                </div>
              </>
            ) : (
              <h1 className="mt-5 font-heading text-xl font-semibold">
                Batch {batchId} not found
              </h1>
            )}
          </div>

          {hydrated && batch ? (
            <>
              {/* Batch details — only what can be made public */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border px-6 py-5 text-sm">
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Producer
                  </dt>
                  <dd className="mt-0.5 font-medium">{coopName}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Origin
                  </dt>
                  <dd className="mt-0.5 font-medium">{batch.origin}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Harvested
                  </dt>
                  <dd className="tnum mt-0.5 font-medium">
                    {full(batch.harvestedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Processing and packing complete
                  </dt>
                  <dd className="tnum mt-0.5 font-medium">
                    {completedAt ? full(completedAt) : "In progress"}
                  </dd>
                </div>
              </dl>

              {/* The six Field Protocol steps */}
              <div className="px-6 py-5">
                <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
                  <ShieldCheck className="size-4 text-leaf-600" />
                  BioFresh Field Protocol
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Six mandatory steps, each recorded at the packhouse with a
                  timestamp.
                </p>

                <ol className="mt-4 flex flex-col">
                  {PROTOCOL_STEPS.map((def, i) => {
                    const step = batch.protocol.find((p) => p.key === def.key);
                    const done = step?.status === "done";
                    const last = i === PROTOCOL_STEPS.length - 1;
                    return (
                      <li key={def.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              "tnum flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              done
                                ? "bg-leaf-600 text-white"
                                : "bg-muted text-muted-foreground ring-1 ring-border"
                            )}
                          >
                            {done ? <Check className="size-3.5" /> : i + 1}
                          </span>
                          {!last ? (
                            <span
                              className={cn(
                                "my-1 w-0.5 flex-1",
                                done ? "bg-leaf-300" : "bg-border"
                              )}
                            />
                          ) : null}
                        </div>
                        <div className={cn("pb-5", last && "pb-0")}>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              !done && "text-muted-foreground"
                            )}
                          >
                            {def.label}
                          </p>
                          <p className="tnum mt-0.5 text-xs text-muted-foreground">
                            {done ? full(step?.at) : "Not recorded yet"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {batch.publicNote ? (
                <div className="border-t border-border bg-leaf-50 px-6 py-4">
                  <p className="text-xs font-semibold tracking-wide text-leaf-700 uppercase">
                    Note from the producer
                  </p>
                  <p className="mt-1 text-sm text-leaf-900/85">
                    {batch.publicNote}
                  </p>
                </div>
              ) : null}

              <div className="border-t border-border px-6 py-4">
                <p className="text-xs text-muted-foreground">
                  This page is read-only. BioFresh never shows the producer&rsquo;s
                  prices, buyer list, inventory or internal decision data.
                </p>
              </div>
            </>
          ) : hydrated ? (
            <div className="px-6 py-8">
              <p className="text-sm text-muted-foreground">
                This QR code does not match any batch in the system. Please
                contact the producer to confirm.
              </p>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          BioFresh OS · Process Passport, per batch
        </p>
      </div>
    </div>
  );
}
