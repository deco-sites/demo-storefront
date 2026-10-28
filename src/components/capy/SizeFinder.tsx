/** SizeFinder: weight + girth in, the recommended size out (girth wins). Used on the home sizing story and the product page. */
import { useId, useState } from "react";
import { recommendSize, type SizeName } from "~/sdk/sizeFinder";

export interface Props {
  /** Shows a "Choose …" button next to the result (product page). */
  onChoose?: (size: SizeName) => void;
  /** Size currently picked, so the button can say it's already chosen. */
  chosen?: string;
  /** Called whenever the recommendation changes. */
  onAdvice?: (size: SizeName | null) => void;
  compact?: boolean;
}

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export default function SizeFinder({ onChoose, chosen, onAdvice, compact }: Props) {
  const id = useId();
  const [kg, setKg] = useState("");
  const [cm, setCm] = useState("");
  const advice = recommendSize(num(kg), num(cm));

  const update = (nextKg: string, nextCm: string) => {
    setKg(nextKg);
    setCm(nextCm);
    onAdvice?.(recommendSize(num(nextKg), num(nextCm))?.size ?? null);
  };

  return (
    <div className={compact ? "size-finder compact" : "size-finder"}>
      <div className="sf-fields">
        <label className="sf-field" htmlFor={`${id}-kg`}>
          <span>Weight</span>
          <span className="sf-input">
            <input
              id={`${id}-kg`}
              type="number"
              inputMode="decimal"
              min={1}
              max={120}
              placeholder="48"
              value={kg}
              onChange={(e) => update(e.target.value, cm)}
            />
            <i>kg</i>
          </span>
        </label>
        <label className="sf-field" htmlFor={`${id}-cm`}>
          <span>Girth</span>
          <span className="sf-input">
            <input
              id={`${id}-cm`}
              type="number"
              inputMode="decimal"
              min={1}
              max={200}
              placeholder="105"
              value={cm}
              onChange={(e) => update(kg, e.target.value)}
            />
            <i>cm</i>
          </span>
        </label>
      </div>
      <div className="sf-result" aria-live="polite">
        {advice ? (
          <>
            <p className="sf-kicker">Your size</p>
            <p className="sf-size">{advice.size}</p>
            <p className="sf-note">
              {advice.girthWon
                ? "Weight and girth disagree, so we went with girth. It's what decides the fit."
                : advice.outside
                  ? "A little outside our table. This is the closest fit; write to us and we'll take it slow together."
                  : "A relaxed fit, with room for a long afternoon by the river."}
            </p>
            {onChoose &&
              (chosen === advice.size ? (
                <p className="sf-chosen">Selected above.</p>
              ) : (
                <button
                  type="button"
                  className="pill pill-line pill-sm"
                  onClick={() => onChoose(advice.size)}
                >
                  Choose {advice.size}
                </button>
              ))}
          </>
        ) : (
          <p className="sf-note">
            Tell us the weight, the girth, or both. Measure around the widest part of the barrel,
            just behind the front legs.
          </p>
        )}
      </div>
    </div>
  );
}
