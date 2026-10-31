# CLAUDE.md

**Index for this repository.** It says where things are and names the traps. The detail lives in the two documents below.

**SoundCircle API**: musician discovery and band management. NestJS 11 monorepo, TypeScript 6 (loose), Yarn, Node 24. PostgreSQL 18 via TypeORM 1.1 with `synchronize: false`. Winston, Swagger.

## Documents

| Document | Read it for |
|---|---|
| [`doc/schema-design.md`](doc/schema-design.md) | **What the system is**: every table, enum and rule, plus the build status (§8) |
| [`doc/coding-standards.md`](doc/coding-standards.md) | **How a layer is written**: entity / DTO / repository / service / controller / module / migration / test, with the new-feature checklist (§11) |

**Precedence: the schema doc wins.** It owns the design; the standards doc owns the shape of the code.

## Repository map

```
apps/core-api/   the HTTP API — modules/app (health, ip), modules/user
libs/shared/     @soundcircle/shared — organised by KIND OF FILE, not by feature
doc/             the documents of record
infra/docker/    local Postgres only
```

**Entities, repositories and migrations always live in `libs/shared/src/database`**, never beside the feature.

**Path aliases:** `@soundcircle/shared/*` → `libs/shared/src/*` · `@apps/core-api/*` → `apps/core-api/src/*`.

## Current state

Only `users` is built: `POST /api/v1/users` and `GET /api/v1/users`, plus `/health` and `/ip`. **There is no auth yet.** Every route is on `PublicBaseController`, `AuthUser.get()` is always null (so `created_by` is null and `created_ip` is set), and `GET /users` masks every email/phone that is not `PUBLIC`. Everything else in schema-design §4 is designed, not built.

## Traps

Each of these fails **silently**.

- **`@soundcircle/shared` alone resolves to an empty file.** Always import a deep path.
- **`libs/shared` may never import an app.** `yarn lint` catches it, but only after you have written it wrong.
- **Stamping fires only on entity persistence.** `save()` of an entity instance and `softRemove()` trigger the hooks; `update()`, `insert()` and `softDelete()` fire nothing. **`softDelete()` is banned.**
- **`this.repository.save()` inside a transaction** runs on a different connection and commits independently. Write through the transaction's `manager`.
- **A swallowed error inside a transaction turns the commit into a silent rollback.**
- **`password_hash` is `select: false` and in no column list.** A write returns the row re-read through `getOne()`, never the saved entity.
- **A masked column must not be sortable.** `sortOrder()` allows only what is selected when it runs, so masked columns are added after it.
- **A unique rule on a soft-deletable row is a partial index `WHERE deleted_at IS NULL`.** `@IsUnique` is only the friendly message; a lost race is a `23505` → 409.
- **Every enum is a `smallint`, and its numeric values are contract.** Never renumbered; a retired value stays burnt.
- **One migration per table**, with its indexes and constraints in the same file. Constraint names are **pinned on the entity too**, or `migration:generate` proposes dropping them.
- **The `sort-order.query-builder` side-effect import** in `main.ts` must stay, or every `.sortOrder()` throws.
- **Loose TypeScript** (`strictNullChecks` / `noImplicitAny` off). Handle null and undefined deliberately; the compiler will not.

## Comments

**Short and load-bearing, or absent.** Comment the **why**, never the **what**. A `/** */` block goes on an exported symbol whose contract is not obvious. Never narrate a change; that is what `git log` is for. Keep the one-line ⚠ warnings.

## Safety

- Use **Yarn**, not npm. Primary shell is **PowerShell**; a Bash tool is also available.
- **Never enable `synchronize`.** Never drop or truncate tables without explicit approval.
- In development a schema change is an edit to the table's own `create_<table>_table` migration (coding-standards §9).
- Never commit `.env`; `.env.example` is the template.
- Nothing is hard-deleted.
- Commit and push only when asked.
