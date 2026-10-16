// Shared helpers for the Outbound trainer tests.
export { receive, fill, packed } from './outboundPractice';

// Deterministic random source for repeatable shipments.
export const seeded = (seed = 7) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
