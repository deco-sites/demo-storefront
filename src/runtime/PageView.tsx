/**
 * Renders a page's blocks (/next/tanstack-start-descriptors#5-render-the-catch-all-route): one
 * Suspense boundary per block, each streamed as its promise resolves, and each descriptor rendered
 * through the view registry.
 *
 * Each section is wrapped in a `<section>` whose `id` and `data-manifest-key` are its block type
 * (the site editor's click-to-edit finds sections by `data-manifest-key`) and an error boundary,
 * and the page content between the Header and the Footer goes in a `<main>` landmark.
 */
import { Component, type ErrorInfo, type ReactNode, Suspense } from "react";
import { Await } from "@tanstack/react-router";
import type { BlockDescriptor } from "../model";
import { type DeviceClass, DeviceProvider } from "../sdk/device";
import { mainBounds } from "../components/ui/splitPageSections";
import { views } from "../views";

class SectionErrorBoundary extends Component<
  { sectionKey: string; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[CMS] Section "${this.props.sectionKey}" crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.error)
      return <div data-section-error={this.props.sectionKey} className="hidden" />;
    return this.props.children;
  }
}

function SectionView({ block }: { block: BlockDescriptor }) {
  const view = views[block.component];
  if (!view) return null;
  const View = view.default;
  return (
    <section id={block.component} data-manifest-key={block.component}>
      <SectionErrorBoundary sectionKey={block.component}>
        <View {...block.props} />
      </SectionErrorBoundary>
    </section>
  );
}

function BlockView({ block }: { block: BlockDescriptor | BlockDescriptor[] }) {
  // The chosen variant of the whole list.
  if (Array.isArray(block))
    return block.map((item, index) => <BlockView key={index} block={item} />);
  return <SectionView block={block} />;
}

export interface PageBlock {
  key: string;
  /** The saved section type, when the block is a section (read before it resolves). */
  component?: string;
  value: Promise<{ value: BlockDescriptor | BlockDescriptor[] | undefined; failed: boolean }>;
}

function renderBlocks(blocks: PageBlock[]) {
  return blocks.map((block) => (
    <Suspense key={block.key} fallback={null}>
      <Await promise={block.value}>
        {({ value }) => (value ? <BlockView block={value} /> : null)}
      </Await>
    </Suspense>
  ));
}

/**
 * The page's sections, with the content between the Header and the Footer in a
 * `<main id="main-content">` landmark. The section list is flat and holds the Header
 * (`role=banner`) and Footer (`role=contentinfo`) sections too, so the whole list can't go inside
 * `<main>`: the bounds come from src/components/ui/splitPageSections.ts (unit tested there).
 */
export function PageView({ blocks, device }: { blocks: PageBlock[]; device?: DeviceClass }) {
  const bounds = mainBounds(
    blocks.map((block, pos) => ({
      s: { landmark: block.component ? views[block.component]?.landmark : undefined },
      pos,
    })),
  );
  return (
    <DeviceProvider value={device}>
      {bounds ? (
        <>
          {renderBlocks(blocks.slice(0, bounds.first))}
          <main id="main-content">{renderBlocks(blocks.slice(bounds.first, bounds.last + 1))}</main>
          {renderBlocks(blocks.slice(bounds.last + 1))}
        </>
      ) : (
        renderBlocks(blocks)
      )}
    </DeviceProvider>
  );
}
