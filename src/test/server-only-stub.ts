// Vitest runs service-layer tests in a plain Node context, not Next's RSC bundler, so the real
// `server-only` package (which unconditionally throws outside that bundler) is aliased to this
// no-op in vitest.config.ts. The real guard still applies in the actual Next.js build.
export {};
