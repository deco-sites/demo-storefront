import { toggleFavorite, useFavorites } from "~/sdk/favorites";
import { Ico } from "~/components/capy/Icons";

/** The heart on cards and the product page: toggles the product in the browser's favourites. */
export default function FavoriteButton({
  handle,
  title,
  className = "",
}: {
  handle: string;
  title: string;
  className?: string;
}) {
  const on = useFavorites().includes(handle);
  return (
    <button
      type="button"
      className={`fav-btn ${className}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${title} from favourites` : `Save ${title} for a slow day`}
      title={on ? "Saved for a slow day" : "Save for a slow day"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(handle);
      }}
    >
      <Ico name="heart" />
    </button>
  );
}
