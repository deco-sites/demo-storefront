import Icon from "../../components/ui/Icon";
import type { SiteNavigationElement } from "@decocms/apps-commerce/types";

export interface Props {
  navItems?: SiteNavigationElement[];
}

function MenuItem({ item }: { item: SiteNavigationElement }) {
  return (
    <div className="collapse collapse-plus">
      <input type="checkbox" />
      <div className="collapse-title px-0 text-lg font-medium text-ink-soft capitalize">
        {item.name}
      </div>
      <div className="collapse-content px-0">
        <ul className="flex flex-col gap-3 pb-2">
          <li>
            <a className="text-sm text-muted underline" href={item.url}>
              Ver todos
            </a>
          </li>
          {item.children?.map((node) => (
            <li key={node.url ?? node.name}>
              <MenuItem item={node} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Menu({ navItems = [] }: Props) {
  return (
    <div
      className="glass-strong flex h-full flex-col overflow-y-auto"
      style={{ minWidth: "100vw" }}
    >
      <ul className="flex grow flex-col divide-y divide-gray-200 px-5">
        {navItems.map((item) => (
          <li key={item.url ?? item.name}>
            <MenuItem item={item} />
          </li>
        ))}
      </ul>

      <ul className="flex flex-col gap-1 border-t border-gray-200 py-4">
        {[
          { href: "/wishlist", icon: "favorite" as const, label: "Lista de desejos" },
          { href: "https://www.deco.cx", icon: "home_pin" as const, label: "Nossas lojas" },
          { href: "https://www.deco.cx", icon: "call" as const, label: "Fale conosco" },
          { href: "/account", icon: "account_circle" as const, label: "Minha conta" },
        ].map(({ href, icon, label }) => (
          <li key={label}>
            <a className="flex items-center gap-3 px-5 py-2.5 text-sm text-ink-soft" href={href}>
              <Icon id={icon} size={18} />
              <span>{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Menu;
