/**
 * Header search: a visible searchbar that opens a modal with a text input and
 * live product suggestions (debounced, fetched from the platform as the
 * shopper types). Submitting goes to the full search page at /s?q=<term>.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@decocms/apps-commerce/types";
import { formatPrice } from "@decocms/apps-commerce/sdk/formatPrice";
import { useOffer } from "@decocms/apps-commerce/sdk/useOffer";
import { clx } from "~/sdk/clx";
import { relative } from "~/sdk/url";
import { searchSuggestionsServerFn } from "~/platform/search/search.actions";
import Icon from "../ui/Icon";

export const ACTION = "/s";
export const NAME = "q";

const DEBOUNCE_MS = 300;

function SuggestionItem({ product, onNavigate }: { product: Product; onNavigate: () => void }) {
  const { price, listPrice } = useOffer(product.offers);
  const title = product.isVariantOf?.name ?? product.name ?? "";
  const image = product.image?.[0];

  return (
    <Link
      to={relative(product.url) ?? "/"}
      preload="intent"
      onClick={onNavigate}
      className="tap-scale flex items-center gap-3 rounded-sm px-2 py-2 transition-colors duration-(--duration-fast) hover:bg-white/70"
    >
      {image?.url && (
        <img
          src={image.url}
          alt={image.alternateName ?? title}
          width={48}
          height={64}
          loading="lazy"
          className="h-16 w-12 shrink-0 rounded-xs object-cover"
        />
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-ink">{title}</span>
        <span className="flex items-baseline gap-2 tabular-nums">
          {listPrice != null && price != null && listPrice > price && (
            <span className="text-2xs text-muted line-through">
              {formatPrice(listPrice, product.offers?.priceCurrency)}
            </span>
          )}
          <span className="text-xs text-ink-soft">
            {formatPrice(price, product.offers?.priceCurrency)}
          </span>
        </span>
      </span>
    </Link>
  );
}

export default function SearchModal({
  placeholder = "What are you looking for?",
  variant = "desktop",
}: {
  placeholder?: string;
  variant?: "desktop" | "mobile";
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounce what we actually query with, so a fast typist triggers one
  // request instead of one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  // Cmd/Ctrl+K opens it, Escape closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const query = useQuery({
    queryKey: ["search-suggestions", debounced],
    queryFn: () => searchSuggestionsServerFn({ data: { query: debounced } }),
    enabled: open && debounced.length > 1,
    staleTime: 60_000,
  });

  const products = query.data?.products ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = term.trim();
    if (!value) return;
    const events = window.DECO?.events as unknown as
      | { dispatch?: (event: unknown) => void }
      | undefined;
    events?.dispatch?.({ name: "search", params: { search_term: value } });
    setOpen(false);
    // `to`/`search` passed separately (same as Sort.tsx) — strict-typed routes
    // don't parse a `?...` packed into `to`.
    navigate({ to: ACTION, search: { [NAME]: value } } as never);
  };

  return (
    <>
      {variant === "desktop" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search products"
          className="frost tap-scale flex h-10 w-52 cursor-pointer items-center gap-2 rounded-sm px-3 text-sm text-muted transition-colors duration-(--duration-fast) hover:bg-glass-strong"
        >
          <Icon id="search" size={18} className="shrink-0 text-ink" />
          <span className="truncate">{placeholder}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search products"
          className="tap-scale flex size-10 items-center justify-center rounded-sm text-ink transition-colors duration-(--duration-fast) hover:bg-white/60"
        >
          <Icon id="search" size={18} />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-100 flex items-start justify-center">
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-ink/30 backdrop-blur-xs"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search products"
            className="frost relative mx-3 mt-16 flex max-h-[75vh] w-full max-w-2xl flex-col gap-4 overflow-hidden rounded-sm p-4 shadow-lg"
          >
            <form onSubmit={submit} className="flex items-center gap-3">
              <Icon id="search" size={20} className="shrink-0 text-ink" />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                name={NAME}
                autoComplete="off"
                placeholder={placeholder}
                className="grow border-0 border-b border-ink/15 bg-transparent pb-2 text-base text-ink outline-none placeholder:text-muted focus:border-ink/40"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="tap-scale flex size-8 shrink-0 items-center justify-center rounded-sm text-ink transition-colors duration-(--duration-fast) hover:bg-white/60"
              >
                <Icon id="close" size={16} />
              </button>
            </form>

            <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
              {query.isFetching && (
                <span className="loading loading-spinner loading-sm self-center" />
              )}

              {!query.isFetching && debounced.length > 1 && products.length === 0 && (
                <span className="px-2 py-4 text-sm text-muted">
                  No results for “{debounced}”.
                </span>
              )}

              {products.length > 0 && (
                <>
                  <span className="px-2 text-2xs font-medium text-muted-soft">
                    Suggested products
                  </span>
                  <ul className={clx("flex flex-col")}>
                    {products.map((product) => (
                      <li key={product.url ?? product.productID}>
                        <SuggestionItem product={product} onNavigate={() => setOpen(false)} />
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {term.trim() && (
                <button
                  type="button"
                  onClick={submit}
                  className="mt-1 flex items-center gap-1 px-2 py-2 text-sm text-ink underline"
                >
                  See all results for “{term.trim()}”
                  <Icon id="chevron-right" size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
