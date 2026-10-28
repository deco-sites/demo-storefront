/**
 * A review score: five stars filled to the average (half stars included), then "4.5 (38)".
 * The stars are decorative; the label reads the score out in words.
 */
export default function Stars({
  rating,
  className = "stars",
}: {
  rating: { average: number; count: number };
  className?: string;
}) {
  const { average, count } = rating;
  const fill = { "--fill": `${(average / 5) * 100}%` } as React.CSSProperties;
  return (
    <span
      className={className}
      role="img"
      aria-label={`Rated ${average} out of 5 by ${count} ${count === 1 ? "capybara" : "capybaras"}`}
    >
      <span className="row" style={fill} aria-hidden="true">
        ★★★★★
      </span>
      <span className="num" aria-hidden="true">
        {average.toFixed(1)} <span className="count">({count})</span>
      </span>
    </span>
  );
}
