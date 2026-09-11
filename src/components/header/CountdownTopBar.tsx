import { useEffect, useState } from "react";

export interface Props {
  /**
   * @title Enabled
   * @description Show the promo top bar above the header
   */
  enabled?: boolean;
  /**
   * @title Label
   * @description Small highlighted tag on the left, e.g. "ROXO WEEK"
   */
  label?: string;
  /**
   * @title Message
   * @description Main promo message
   */
  message?: string;
  /**
   * @title Starts in — target date
   * @description When the countdown reaches this date, the bar shows the "live" message
   * @format datetime
   */
  startsAt?: string;
  /**
   * @title Live message
   * @description Shown after the countdown reaches zero
   */
  liveMessage?: string;
  /** @title Call to action label */
  ctaLabel?: string;
  /** @title Call to action link */
  ctaHref?: string;
  /**
   * @title Unit labels
   * @description Short labels under each counter
   */
  labels?: {
    /** @default "d" */
    days?: string;
    /** @default "h" */
    hours?: string;
    /** @default "min" */
    minutes?: string;
    /** @default "s" */
    seconds?: string;
  };
}

interface Delta {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

const computeDelta = (target: number): Delta => {
  const diff = target - Date.now();
  if (!Number.isFinite(target) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    expired: false,
  };
};

const pad = (value: number) => String(value).padStart(2, "0");

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-0.5">
      <span className="min-w-[2ch] rounded-xs bg-white/20 px-1 py-0.5 text-center font-medium tabular-nums text-white">
        {pad(value)}
      </span>
      <span className="text-white/70">{label}</span>
    </span>
  );
}

function CountdownTopBar({
  enabled = true,
  label = "ROXO WEEK",
  message = "A próxima promoção começa em",
  startsAt,
  liveMessage = "A promoção começou! Aproveite agora",
  ctaLabel = "Quero saber mais",
  ctaHref = "/s?q=sale",
  labels,
}: Props) {
  const target = startsAt ? new Date(startsAt).getTime() : NaN;
  // Server and client compute Date.now() at different instants, so seeding
  // state from it here would mismatch on hydration; the real value is only
  // computed client-side, after mount.
  const [delta, setDelta] = useState<Delta | null>(null);

  useEffect(() => {
    setDelta(computeDelta(target));
    const timer = setInterval(() => {
      setDelta((prev) => {
        if (prev?.expired) {
          clearInterval(timer);
          return prev;
        }
        return computeDelta(target);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (!delta) return null;

  if (!enabled) return null;

  return (
    <div
      className="relative overflow-hidden text-white"
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--color-promo-deep) 0%, var(--color-promo) 45%, var(--color-promo-light) 100%)",
      }}
    >
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-2 px-3 text-2xs sm:gap-3 sm:text-xs">
        {label && (
          <span className="hidden shrink-0 rounded-xs bg-white/25 px-1.5 py-0.5 font-medium tracking-wide uppercase sm:inline-block">
            {label}
          </span>
        )}

        <span className="truncate">{delta.expired ? liveMessage : message}</span>

        {!delta.expired && (
          <span className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <Unit value={delta.days} label={labels?.days ?? "d"} />
            <Unit value={delta.hours} label={labels?.hours ?? "h"} />
            <Unit value={delta.minutes} label={labels?.minutes ?? "min"} />
            <Unit value={delta.seconds} label={labels?.seconds ?? "s"} />
          </span>
        )}

        {ctaLabel && ctaHref && (
          <a
            href={ctaHref}
            className="tap-scale hidden shrink-0 rounded-xs bg-white px-2 py-1 font-medium text-promo-deep transition-colors duration-(--duration-fast) hover:bg-white/85 sm:inline-block"
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </div>
  );
}

export default CountdownTopBar;
