// Handoff 41-B (rulings 1346, 1374): the shapes the Messenger media routes read from the Workers
// runtime, declared here because `@cloudflare/workers-types` is an ambient script that redeclares the
// DOM globals this project compiles against (`lib: DOM`), and referencing it broke one existing file
// (src/lib/error-capture.ts: `addEventListener`'s `event` lost its type). These are the subset the
// routes use, written from the Workers runtime API reference for R2 (`R2Bucket.get`, `.head`, `.put`,
// `.delete`), `FixedLengthStream` and the `cloudflare:workers` module's `env` export; nothing else.
// Ruling 825: the runtime binding is read in every shape it ships in, with a null fallback, in
// src/lib/server/messenger-media.server.ts; this file only names the types.

interface R2Range {
  offset?: number;
  length?: number;
  suffix?: number;
}

interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  range?: R2Range;
  writeHttpMetadata(headers: Headers): void;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream<Uint8Array>;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

interface R2GetOptions {
  range?: R2Range | Headers;
  onlyIf?: Headers;
}

interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata | Headers;
  customMetadata?: Record<string, string>;
  md5?: ArrayBuffer | string;
  sha1?: ArrayBuffer | string;
  sha256?: ArrayBuffer | string;
}

interface R2Bucket {
  head(key: string): Promise<R2Object | null>;
  get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: R2PutOptions,
  ): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<void>;
}

/**
 * A Workers-only TransformStream whose readable side carries a known length, which is what
 * `R2Bucket.put` requires of a stream. Absent outside the Workers runtime; the route checks for it.
 */
declare class FixedLengthStream {
  constructor(expectedLength: number);
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
}

/** The bindings this project declares in wrangler.jsonc, as the runtime hands them to the worker. */
interface MessengerMediaEnv {
  MESSAGE_MEDIA?: R2Bucket;
}

declare module "cloudflare:workers" {
  export const env: MessengerMediaEnv;
}
