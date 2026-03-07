/**
 * Server DB barrel export — re-exports the singleton pool from db/drizzle.ts.
 * Previously this file created a SECOND pool, causing connection exhaustion
 * and bypassing the resilience logic (withDbRetry, resetPool, isConnectionError).
 */
export { db, isConnectionError, withDbRetry, resetPool } from '../../db/drizzle';

// Backward-compatible default export
import { db } from '../../db/drizzle';
export default db;