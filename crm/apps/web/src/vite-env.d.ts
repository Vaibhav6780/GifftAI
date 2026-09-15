/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Public origin of gifftai.com — used to build blog image preview URLs and
   *  "open live" links to /blog/<slug>. Defaults to https://gifftai.com. */
  readonly VITE_WEBSITE_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
