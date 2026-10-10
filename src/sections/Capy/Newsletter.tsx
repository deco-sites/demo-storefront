/** Newsletter (capybara redesign): a two-tone headline and an email pill. */
import { useState } from "react";

export interface Props {
  /** @title Title */
  title?: string;
  /** @title Second line (muted) */
  titleTone?: string;
  /** @title Body */
  body?: string;
  /** @title Email placeholder */
  placeholder?: string;
  /** @title Button label */
  ctaLabel?: string;
  /** @title Note under the field */
  note?: string;
  /** @title Thank-you message */
  thanks?: string;
}

export default function Newsletter({
  title = "Slow news, monthly.",
  titleTone = "One letter. No hurry.",
  body,
  placeholder = "Your email",
  ctaLabel = "Subscribe",
  note,
  thanks = "Thank you. The first letter arrives with the next full moon.",
}: Props) {
  const [sent, setSent] = useState(false);
  return (
    <div className="newsletter" data-section="Newsletter">
      <div className="wrap inner">
        <div className="rise">
          <h2 className="h2">
            {title} {titleTone && <span className="tone">{titleTone}</span>}
          </h2>
          {body && <p className="body">{body}</p>}
        </div>
        <form
          className="nl-form rise"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <label className="sr" htmlFor="nl-email">
            Email address
          </label>
          <div className="nl-row">
            <input
              id="nl-email"
              type="email"
              required
              placeholder={placeholder}
              autoComplete="email"
              disabled={sent}
            />
            <button className="pill pill-lime" type="submit" disabled={sent}>
              {ctaLabel}
            </button>
          </div>
          <p className="nl-note" aria-live="polite">
            {sent ? thanks : note}
          </p>
        </form>
      </div>
    </div>
  );
}
