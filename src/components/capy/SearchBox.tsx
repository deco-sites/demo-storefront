/**
 * Header search: a field that suggests products as the shopper types. Enter goes to the results
 * page (/s?q=), a suggestion goes to its product, Escape closes the list.
 */
import { useEffect, useId, useState } from "react";
import { Ico } from "~/components/capy/Icons";
import { money, sized } from "~/sdk/capyProduct";
import { searchSuggestionsServerFn } from "~/server/site.functions";

type Suggestion = Awaited<ReturnType<typeof searchSuggestionsServerFn>>[number];

interface Props {
  className: string;
  placeholder: string;
  autoFocus?: boolean;
  onClose?: () => void;
  showSubmit?: boolean;
}

export default function SearchBox({ className, placeholder, autoFocus, onClose, showSubmit }: Props) {
  const id = useId();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = q.trim();

  useEffect(() => {
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      searchSuggestionsServerFn({ data: { q: term } })
        .then((r) => alive && (setItems(r), setActive(-1)))
        .catch(() => alive && setItems([]))
        .finally(() => alive && setLoading(false));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [term]);

  const show = open && term.length >= 2;
  return (
    <form
      className={`nav-search ${className}`}
      action="/s"
      method="get"
      role="search"
      onSubmit={(e) => {
        if (active >= 0 && items[active]) {
          e.preventDefault();
          window.location.href = items[active].url;
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Ico name="search" />
      <input
        name="q"
        type="search"
        placeholder={placeholder}
        aria-label="Search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={q}
        role="combobox"
        aria-expanded={show}
        aria-controls={id}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            (e.currentTarget as HTMLInputElement).blur();
            onClose?.();
          } else if (e.key === "ArrowDown" && items.length) {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp" && items.length) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          }
        }}
      />
      {showSubmit && (
        <button className="pill pill-lime pill-sm" type="submit">
          Search
        </button>
      )}
      {show && (
        <div className="search-suggest" id={id} role="listbox" aria-label="Suggestions">
          {items.length > 0 ? (
            <>
              {items.map((p, i) => (
                <a
                  key={p.url}
                  href={p.url}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? "is-active" : undefined}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="ss-img" style={{ background: p.bg }}>
                    {p.image && <img src={sized(p.image, 120)} alt="" width={56} height={56} loading="lazy" />}
                  </span>
                  <span className="ss-name">{p.title}</span>
                  <span className="ss-price">{money(p.price, p.currency)}</span>
                </a>
              ))}
              <a className="ss-all" href={`/s?q=${encodeURIComponent(term)}`}>
                See everything for “{term}”
              </a>
            </>
          ) : (
            <p className="ss-empty">
              {loading ? "Wading through the herd…" : `Nothing by the river for “${term}” yet. Try another word.`}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
