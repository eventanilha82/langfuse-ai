import "react";

declare global {
  interface ImportMetaEnv {
    readonly BASE_URL?: string;
    readonly PROD?: boolean;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Element {
    setAttribute(qualifiedName: string, value: string | number | boolean | null | undefined): void;
  }

  interface Window {
    __mcp_banner_logged?: boolean;
  }
}

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}

export {};
