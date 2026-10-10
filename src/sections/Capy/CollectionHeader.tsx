/**
 * CollectionHeader (capybara redesign): breadcrumb, the collection's name and description, and
 * tabs to the other collections with their product counts. Name and description come from
 * Shopify for the collection in the URL (`/collections/:handle`), or from the search term on `/s`
 * (the loader is src/loaders/capyCollectionHeader.ts, server-only).
 */
import { Motif } from "~/components/capy/Icons";
import { COLLECTIONS } from "~/components/capy/Tag";

export interface Tab {
  /** @title Collection handle */
  handle: string;
  /** @title Label */
  label: string;
}

export interface Props {
  /** @title Title override */
  title?: string;
  /** @title Description override */
  description?: string;
  /** @title Show collection tabs */
  showTabs?: boolean;
  /** @title Tabs */
  tabs?: Tab[];
}

export interface ViewProps {
  title: string;
  description?: string;
  crumb: string;
  current?: string;
  tabs: (Tab & { count?: number })[];
}

export default function CollectionHeader({
  title,
  description,
  crumb,
  current,
  tabs = [],
}: ViewProps) {
  return (
    <div className="col-head" data-section="CollectionHeader">
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <span aria-current="page">{crumb}</span>
        </nav>
        <div className="col-head-grid">
          <h1 className="display-xl">{title}</h1>
          <div className="col-head-side">
            {description && <p className="body-l">{description}</p>}
            {tabs.length > 0 && (
              <nav className="col-tabs" aria-label="Collections">
                {tabs.map((t) => {
                  const motif = COLLECTIONS[t.handle]?.motif;
                  return (
                    <a
                      key={t.handle}
                      href={`/collections/${t.handle}`}
                      aria-current={t.handle === current ? "page" : undefined}
                    >
                      {motif && <Motif name={motif} />}
                      {t.label}
                      {t.count != null && <span className="n">{t.count}</span>}
                    </a>
                  );
                })}
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
