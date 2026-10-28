/** Newsletter (capybara redesign): a two-tone headline and an email pill. */
import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  thanks = "You're on the list. See you by the river.",
}: Props) {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const check = (value: string) => {
    const v = value.trim();
    if (!v) return "We'll need your email to send the letter.";
    if (!EMAIL_RE.test(v))
      return "That doesn't look like an email yet, try name@example.com.";
    return "";
  };
  return (
    <div className="newsletter" data-section="Newsletter">
      <div className="wrap inner">
        <div className="rise">
          <h2 className="h2">
            {title} {titleTone && <span className="tone">{titleTone}</span>}
          </h2>
          {body && <p className="body">{body}</p>}
        </div>
        {sent ? (
          <div className="nl-form nl-done" role="status" aria-live="polite">
            <span className="nl-done-mark" aria-hidden="true">
              ✓
            </span>
            <p className="nl-done-text">{thanks}</p>
          </div>
        ) : (
          <form
            className="nl-form rise"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const msg = check(email);
              setError(msg);
              if (!msg) setSent(true);
            }}
          >
            <label className="sr" htmlFor="nl-email">
              Email address
            </label>
            <div className={error ? "nl-row nl-row-error" : "nl-row"}>
              <input
                id="nl-email"
                type="email"
                placeholder={placeholder}
                autoComplete="email"
                value={email}
                aria-invalid={error ? true : undefined}
                aria-describedby="nl-msg"
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(check(e.target.value));
                }}
                onBlur={() => {
                  if (email.trim()) setError(check(email));
                }}
              />
              <button className="pill pill-lime" type="submit">
                {ctaLabel}
              </button>
            </div>
            <p
              id="nl-msg"
              className={error ? "nl-note nl-error" : "nl-note"}
              aria-live="polite"
            >
              {error || note}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
