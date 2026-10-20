// Global ambient types for the storefront runtime.

declare global {
  /** The build's id (the commit), defined by `decoTanstack()` in vite.config.ts. */
  const __BUILD_HASH__: string;

  interface Window {
    DECO: {
      events: {
        subscribe: (cb: (ev: unknown) => void) => void;
        dispatch: (ev: unknown) => void;
      };
    };
  }
}

export {};
