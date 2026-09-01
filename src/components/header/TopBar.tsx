import { useEffect, useState } from "react";
import Icon from "../ui/Icon";

/** @titleBy label */
export interface Highlight {
  /**
   * @title Text
   * @description Short message shown in the rotating strip
   */
  label: string;
  /**
   * @title Emoji
   * @description Optional emoji shown before the text
   */
  emoji?: string;
}

export interface Props {
  /**
   * @title Enabled
   * @description Show the promotional top bar
   */
  enabled?: boolean;
  /**
   * @title Promo name
   * @description Highlighted campaign name, e.g. "MEGA SALE"
   */
  title?: string;
  /**
   * @title Promo description
   * @description Supporting line, e.g. "up to 70% off sitewide"
   */
  description?: string;
  /**
   * @title Coupon code
   * @description Click-to-copy coupon shown as a pill
   */
  coupon?: string;
  /**
   * @title Expires at
   * @description When the countdown reaches zero the bar shows the fallback text
   * @format datetime
   */
  expiresAt?: string;
  /**
   * @title Expired text
   * @description Shown after the countdown ends
   */
  expiredText?: string;
  /**
   * @title Call to action label
   */
  ctaLabel?: string;
  /**
   * @title Call to action link
   */
  ctaHref?: string;
  /**
   * @title Rotating highlights
   * @description Extra perks rotated on the right side (desktop only)
   */
  highlights?: Highlight[];
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
    <span className="flex flex-col items-center leading-none">
      <span className="rounded-[4px] bg-black/25 px-1.5 py-0.5 font-semibold tabular-nums text-white text-[11px]">
        {pad(value)}
      </span>
      <span className="mt-px text-[7px] uppercase tracking-[0.12em] text-white/70">{label}</span>
    </span>
  );
}

function TopBar({
  enabled = true,
  title = "MEGA SALE",
  description = "up to 70% off sitewide",
  coupon = "COLOR70",
  expiresAt,
  expiredText = "The sale is over — new drops coming soon ✨",
  ctaLabel = "Shop now",
  ctaHref = "/",
  highlights = [],
}: Props) {
  const target = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const [delta, setDelta] = useState<Delta>(() => computeDelta(target));
  const [copied, setCopied] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    if (delta.expired) return;
    const timer = setInterval(() => {
      const next = computeDelta(target);
      setDelta(next);
      if (next.expired) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [target, delta.expired]);

  useEffect(() => {
    if (highlights.length < 2) return;
    const timer = setInterval(() => setHighlightIndex((i) => (i + 1) % highlights.length), 4000);
    return () => clearInterval(timer);
  }, [highlights.length]);

  if (!enabled) return null;

  const copyCoupon = () => {
    navigator.clipboard?.writeText(coupon).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

  const highlight = highlights[highlightIndex];

  return (
    <div className="relative overflow-hidden text-white">
      <style>{`
        @keyframes topbar-pan { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        @keyframes topbar-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
      `}</style>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg,#ff2d55,#ff8a00,#ffd60a,#34c759,#0a84ff,#bf5af2,#ff2d55)",
          backgroundSize: "200% 100%",
          animation: "topbar-pan 12s linear infinite",
        }}
      />

      <div className="relative flex min-h-9 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-1 text-center text-[11px]">
        {delta.expired ? (
          <span className="font-medium">{expiredText}</span>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block size-1.5 rounded-full bg-white"
                style={{ animation: "topbar-pulse 1.4s ease-in-out infinite" }}
              />
              <strong className="font-bold uppercase tracking-[0.14em]">{title}</strong>
              <span className="hidden text-white/90 sm:inline">{description}</span>
            </span>

            <span className="flex items-center gap-1">
              <span className="hidden text-[9px] uppercase tracking-[0.14em] text-white/70 sm:inline">
                ends in
              </span>
              <span className="flex items-center gap-1">
                {delta.days > 0 && <Unit value={delta.days} label="d" />}
                <Unit value={delta.hours} label="h" />
                <Unit value={delta.minutes} label="m" />
                <Unit value={delta.seconds} label="s" />
              </span>
            </span>

            {coupon && (
              <button
                type="button"
                onClick={copyCoupon}
                aria-label={`Copy coupon ${coupon}`}
                className="tap-scale flex items-center gap-1 rounded-full border border-white/50 border-dashed bg-white/15 px-2 py-0.5 font-semibold tracking-[0.08em] uppercase transition-colors duration-(--duration-fast) hover:bg-white/30"
              >
                {copied ? "copied!" : coupon}
              </button>
            )}

            {ctaLabel && (
              <a
                href={ctaHref}
                className="tap-scale flex items-center gap-0.5 rounded-full bg-white px-2.5 py-0.5 font-semibold text-[#111] transition-colors duration-(--duration-fast) hover:bg-white/85"
              >
                {ctaLabel}
                <Icon id="chevron-right" size={12} />
              </a>
            )}

            {highlight && (
              <span className="hidden items-center gap-1 text-white/85 lg:flex">
                <span aria-hidden="true" className="text-white/50">
                  |
                </span>
                {highlight.emoji && <span>{highlight.emoji}</span>}
                {highlight.label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TopBar;
