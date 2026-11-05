import { EntityManager } from "typeorm";

/**
 * One seeder per table of reference data. `run()` must be **idempotent** (upsert on a stable
 * key, never a blind insert), because `yarn seed:run` is re-run after every data change.
 *
 * ⚠ Seeders write through the `manager` they are given: the runner wraps every seeder in one
 * transaction, so a failure leaves the database exactly as it was.
 */
export interface Seeder {
  /** Printed by the runner. */
  name: string;
  run(manager: EntityManager): Promise<void>;
}
