import { anyApi } from 'convex/server';
import type { api as GeneratedApi } from '../../../convex/_generated/api';

/**
 * Typed references to every Convex function. Only the types come from /convex (erased at build
 * time); at runtime this is Convex's `anyApi` proxy, so the frontend bundle stays independent.
 */
export const api = anyApi as unknown as typeof GeneratedApi;
