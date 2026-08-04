import { SEARCHBAR_POPUP_ID } from "../../constants";
import Icon from "../ui/Icon";

export default function SearchTrigger({
  placeholder = "Produto, categoria...",
}: {
  placeholder?: string;
}) {
  return (
    <label
      htmlFor={SEARCHBAR_POPUP_ID}
      aria-label="Open search"
      className="frost tap-scale flex h-10 w-[253px] max-w-full cursor-pointer items-center justify-between gap-2.5 rounded-sm py-[5px] pr-4 pl-1.5 transition-colors duration-(--duration-fast) hover:bg-glass-strong"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-[27px] shrink-0 items-center justify-center rounded-full bg-white px-2.5 text-sm text-ink">
          Search
        </span>
        <span className="truncate text-sm text-muted-soft">{placeholder}</span>
      </span>
      <Icon id="search" size={16} className="shrink-0 text-ink" />
    </label>
  );
}
