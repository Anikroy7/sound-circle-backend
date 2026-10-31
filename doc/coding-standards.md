# Coding standards — soundcircle-api-service

**How a layer is written here:** entity, DTO, repository, service, controller, module, migration and test. The `users` feature is the worked example for every section; copy its shape.

**Precedence.** [`schema-design.md`](schema-design.md) owns *what the system is*: tables, columns, enums and rules. This document owns *how a layer is written*. **The schema doc wins** wherever they disagree.

## Contents

0. [Golden rules](#0-golden-rules) · 1. [Placement](#1-file--directory-placement) · 2. [Entity](#2-entity) · 3. [DTO](#3-dto) · 4. [Repository](#4-repository) · 5. [Service](#5-service) · 6. [Transactions](#6-transactions) · 7. [Controller](#7-controller) · 8. [Module wiring](#8-module-wiring) · 9. [Migration](#9-migration) · 10. [Testing](#10-testing) · 11. [Checklist](#11-checklist-for-a-new-feature)

---

## 0. Golden rules

| Rule | Why |
|---|---|
| **The schema doc section exists before the code.** A new table starts as a section of `doc/schema-design.md`. | Scrollback is not reviewable. |
| **All PKs and FKs are `integer`.** Never a `uuid` primary key. | One id type across the schema. |
| **All DB columns are `snake_case`, and the TS property name matches exactly.** | No naming strategy is configured; the column name *is* the property name. |
| **Every entity extends `AbstractEntity`.** Never redeclare `id`, `row_status`, timestamps or actor/IP columns. | `abstract.entity.ts` owns soft delete and stamping. |
| **Entities, repositories and migrations always live in `libs/shared/src/database`**, never beside the feature. | The app and the migration CLI bind to one schema. |
| **Import through `@soundcircle/shared/...` with a deep path.** `libs/shared/src/index.ts` is empty. | The bare alias resolves to nothing. A relative import is a lint error. |
| **`libs/shared` never imports an app.** | The dependency arrow points one way; `yarn lint` enforces it. |
| **Business logic lives in a service, never a controller.** A controller injects only its service. | The seam has to exist before the read grows a rule. |
| **Controllers return `ApiResponse(data, message)`.** Never a raw entity. | `ResponseInterceptor` builds the envelope. |
| **Every enum is a `smallint`** holding the numeric value. Values are never renumbered; a retired value stays burnt. | Stored rows would silently change meaning. |
| **Nothing is hard-deleted.** Soft delete via **`softRemove()`**, never `softDelete()`. | Only `softRemove()` stamps `deleted_by` / `deleted_ip`. |
| **A secret never leaves the repository layer.** `password_hash`, token hashes and OTP hashes are `select: false` and in no column list. | One `SELECT *` would ship them to a client. |
| **A test file sits next to the code it tests.** | A test a folder away from its subject gets orphaned. |

---

## 1. File & directory placement

`libs/shared/src` is organised by **kind of file**, not by feature.

```
libs/shared/src/
  database/entities/identity/user.entity.ts             # data shape
  database/entities/identity/enums/identity.enum.ts     # enums the entity STORES
  database/repositories/identity/user.repository.ts     # persistence + queries
  database/migrations/1793404800000-create_users_table.ts
  utils/dtos/identity/filter-user.dto.ts                # the filter the repository TAKES

apps/core-api/src/modules/user/                         # the feature slice
  user.module.ts
  user.public.controller.ts · user.service.ts · user.service.spec.ts
  dto/create-user.dto.ts
```

**Domains** (folder names under `entities/`, `repositories/`, `utils/dtos/`) follow schema-design §4: `identity`, `reference`, `media`, `musician`, `band`, `activity`, `site`.

**Naming.** Files are `kebab-case` with a type suffix: `.entity.ts`, `.repository.ts`, `.service.ts`, `.controller.ts`, `.module.ts`, `.dto.ts`, `.enum.ts`, `.util.ts`, `.spec.ts`. Migrations are `<timestamp>-create_<table>_table.ts`. Classes are `PascalCase`; enums are `PascalCase` with `UPPER_SNAKE` members.

### 1.1 Module-local vs shared

Ask in order; the first `yes` wins:

| Question | Goes in |
|---|---|
| **1.** Does anything in `libs/shared` import it? | the library: enums → `database/entities/<domain>/enums/<domain>.enum.ts`, DTOs → `utils/dtos/<domain>/` |
| **2.** Is it used by more than one module? | `utils/util/enums.ts` (enums) or `utils/util/<name>.util.ts` (helpers) |
| **3.** Otherwise: one module, nothing shared reads it | that module's `common/{enums,types,utils}/` |

### 1.2 Never inline a reusable primitive

If a value is produced the same way in more than one place, it is a helper in `libs/shared/src/utils/util/`. Already claimed:

| Helper | Owns |
|---|---|
| `password.util.ts` | the password hash format (`scrypt$<salt>$<hash>`) |
| `abstract.migration.ts` → `commonColumns`, `primaryIdColumn` | the columns every migration repeats |
| `sort-order.query-builder.ts` | turning `sort_order_by[]` into `ORDER BY` |
| `constant.ts` | `ENV` (the only reader of `process.env`) and shared constants |

---

## 2. Entity

`libs/shared/src/database/entities/identity/user.entity.ts`

```ts
@Entity(TABLE_USERS)
@Index(`${TABLE_USERS}_uq_email`, ["email"], { unique: true, where: "deleted_at IS NULL" })
@Check(`${TABLE_USERS}_ck_email_or_phone`, "email IS NOT NULL OR phone IS NOT NULL")
export class UserEntity extends AbstractEntity {
  @Column({ type: "varchar", length: 100, nullable: false })
  name: string;

  /** ⚠ `select: false` and never in a repository column list — no read may return it. */
  @Column({ type: "varchar", length: 255, nullable: true, select: false })
  password_hash: string;

  @Column({ type: "smallint", nullable: false, default: ContactVisibility.ONLY_ME })
  email_visibility: ContactVisibility;
}
```

- `@Entity(TABLE_USERS)`: the table name comes from a `TABLE_*` constant in `utils/util/database.table.ts`. **Never a string literal at the decorator.**
- `AbstractEntity` supplies `id`, `row_status`, the three timestamps, the three actor columns and the three IP columns, all `select: false`. **Never redeclare them.**
- Every `@Column` gets an explicit `type`, a `length` for strings, and `nullable` stated either way.
- Every FK is declared **twice**: an `int` column you read and write, plus a `@ManyToOne` with `@JoinColumn({ name, foreignKeyConstraintName })` on the same physical column.
- Enum columns are **`smallint`**. Never enum strings, never a Postgres `enum` type. Timestamps are `timestamptz`.
- **Pin every constraint name on the entity**, matching the migration exactly, or `migration:generate` proposes dropping it.
- **A unique rule on a soft-deletable row is a partial index**, `where: "deleted_at IS NULL"`. A plain one would block re-signup after deletion, and over a nullable column Postgres counts NULLs as distinct anyway.

---

## 3. DTO

DTOs live **beside the controller** in that folder's `dto/`, one file per shape. The exception is **filter DTOs**: the shared repository takes them, so they live in `libs/shared/src/utils/dtos/<domain>/`.

```ts
export class CreateUserDto extends CreateCommonDto {
  @IsString()
  @Length(1, 100)
  @ApiProperty({ type: String, example: "Rahim Uddin" })
  name: string;

  @IsOptional()
  @IsNumeric()
  @IsValueIn(enumValuesToArray(ContactVisibility))
  @ApiPropertyOptional({ type: Number, enum: ContactVisibility, description: enumToString(ContactVisibility) })
  email_visibility?: ContactVisibility;
}
```

- Create DTOs extend **`CreateCommonDto`**; list DTOs extend **`FilterCommonDto`** (`page_no`, `page_size`, `row_status`, `sort_order_by[]`). Never redeclare those.
- Field names are `snake_case`, matching the columns.
- Every field gets one `@ApiProperty` / `@ApiPropertyOptional` **and** validators. Optional fields get `@IsOptional()` (or a `@ValidateIf`) and `?`.
- Numeric fields use **`@IsNumeric()`**, because query strings arrive as strings.
- Enum fields validate with `@IsValueIn(enumValuesToArray(X))` and document with `enumToString(X)`.
- Normalise in the DTO (`@Transform` to trim or lower-case), so the service and the unique check see the stored form.
- `@IsUnique(Entity)` gives a friendly 400. **The unique index is the guarantee** (§5).
- **Never declare an enum or type inline in a DTO file** (§1.1).

---

## 4. Repository

Custom repositories extend `Repository<T>` and own **all query construction**. Services never build a `QueryBuilder`.

**Anatomy, in this order:** the `@InjectRepository` constructor re-supering with `(target, manager, queryRunner)` · `LIST_SELECTED_COLUMNS` · `DEFAULT_SELECTED_COLUMNS` · `getAll(filters?)` · `getOne(id)` · any `getXBy…` lookups.

```ts
async getAll(filters?: FilterUserDto): Promise<Pagination<UserEntity> | UserEntity[]> {
  const builder = this.createQueryBuilder("users").select(this.LIST_SELECTED_COLUMNS).where("users.deleted_at IS NULL");

  if (filters?.search) builder.andWhere("users.name ILIKE :search", { search: `%${filters.search}%` });

  builder.sortOrder(filters?.sort_order_by);

  return filters?.page_no || filters?.page_size
    ? paginateRaw(builder, { page: filters.page_no ?? DEFAULT_PAGE_NO, limit: filters.page_size ?? DEFAULT_PAGE_SIZE })
    : builder.getRawMany();
}
```

- **`deleted_at IS NULL` on every read.** Not optional.
- **Who-may-see-what is part of the query**, never a `.filter()` after the fetch. A masked column (schema-design §5.1) is a `CASE` in the SELECT.
- **`sortOrder()` only allows columns already selected** when it runs, which makes the select list the sort allowlist. Add a column that must not be sortable *after* calling it (`users.getAll()` does this for the masked email/phone).
- **Pagination is conditional:** `page_no` / `page_size` both absent → a bare array; either present → `{ items, meta }`. Never mix `paginate` with `paginateRaw` in one method.
- Every parameter is bound (`:name`), never interpolated.

---

## 5. Service

Business logic. Injects its custom repository, takes DTOs straight in, and delegates list and read to the repository. It injects `DataSource` **only** where it opens a transaction.

```ts
async create(reqDto: CreateUserDto): Promise<UserEntity> {
  const { password, ...columns } = reqDto;
  const user = this.userRepository.create({ ...columns, password_hash: password ? await hashPassword(password) : null });

  try {
    await this.userRepository.save(user);
  } catch (error) {
    if (error?.code === PG_UNIQUE_VIOLATION) throw new ConflictException("Email or phone is already registered");
    throw error;
  }

  return this.userRepository.getOne(user.id);
}
```

- The injected repository is named for its entity (`userRepository`).
- **Method set:** `getAll` / `getOne` / `create` / `update` / domain transitions / `delete`.
- **DTOs go straight in.** The only re-mapping allowed is stripping a secret (a raw password) before it reaches the entity.
- The service is the **only** place that throws domain exceptions. Not found → `BadRequestException`; not yours → `ForbiddenException`; lost a race → **`ConflictException` (409)**.
- **A write returns the row re-read through the repository**, never the entity it saved, so `select: false` columns cannot leak.
- **Stamping fires only on entity persistence.** `save()` (of an entity instance) and `softRemove()` trigger the hooks; `update()`, `insert()` and `softDelete()` fire nothing and must carry `updated_by` / `updated_ip` in the patch. **`softDelete()` is banned.**
- Read the actor with `AuthUser.get()`. Never take a user id as a parameter, and never read a header. (⚠ Null until auth lands.)

---

## 6. Transactions

| What the method does | What to use |
|---|---|
| **One write** with no state guard | the repository directly, no transaction |
| **Two or more writes** that must all land, or none | `dataSource.transaction(async (manager) => …)` |
| **A state transition** (accepting an invitation, removing a member) | a transaction **and** a `SELECT … FOR UPDATE` on the row first, with the guard re-checked against the locked row |

Rules inside a transaction:

1. **Write through the transaction's `manager`, never `this.xRepository`.** A repository call runs on a different connection and commits on its own.
2. **No I/O inside.** No HTTP, no R2/S3 call, no email/SMS. Commit first, then do the I/O.
3. **A shared service that joins a caller's transaction takes a trailing `manager?: EntityManager`.**
4. **Never swallow an error inside one.** One failed statement aborts the Postgres transaction; `COMMIT` then silently rolls back and reports success.
5. **The loser of a race gets 409.** Translate a `23505` from a unique index rather than letting it surface as 422.

---

## 7. Controller

A thin HTTP surface, co-located with its service and DTOs.

```ts
@ApiTags("IDN")
@Controller("users")
export class UserPublicController extends PublicBaseController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Post()
  async create(@Body() reqDto: CreateUserDto): Promise<UserEntity> {
    const user: UserEntity = await this.userService.create(reqDto);
    return ApiResponse(user, "Created Successfully");
  }
}
```

- **Pick the base controller by auth surface.** Today there is one: `PublicBaseController` (no guard, file suffix `*.public.controller.ts`). Auth adds an authenticated base controller with its guard. Guards are never scattered across individual controllers.
- **Thin:** delegate to the service, wrap in `ApiResponse(data, "message")`. No logic, no queries, no try/catch; the global `CustomExceptionFilter` handles errors.
- **Inject only the service.**
- **Verbs:** `@Get()` getAll · `@Get(":id")` getOne · `@Post()` create · `@Patch(":id")` update · `@Delete(":id")` delete · `@Post(":id/<action>")` for a transition.
- Route params are integers → `ParseIntPipe`. Paths are `kebab-case` plural nouns. The version lives in the global prefix (`api/v1`), never in a controller path.
- **Annotate every handler's return type** and type the local before returning it.
- **Messages:** `"Fetch Successfully"`, `"Created Successfully"`, `"Updated Successfully"`, `"Deleted Successfully"`.
- `@ApiTags` per domain: `"IDN"` identity, `"MUS"` musician, `"BND"` band.

---

## 8. Module wiring

**One module per domain** wires its entities (`TypeOrmModule.forFeature`), controllers and providers, and `exports` the repositories other modules need.

```ts
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UserPublicController],
  providers: [UserRepository, UserService],
  exports: [UserRepository],
})
export class UserModule {}
```

- Sub-feature folders contain no `*.module.ts`. The parent wires them.
- A module that needs another domain's data imports that module and uses its exported repository; it never queries the table itself.
- Register the module in `app.module.ts`. That file is the only place globals (TypeORM, Winston, middleware) are wired.

---

## 9. Migration

Schema changes are always explicit migrations under `libs/shared/src/database/migrations/`. `synchronize` is off and never enabled.

- **One table per migration file**, with that table's indexes, foreign keys and check constraints in the **same file**.
- Column order: `primaryIdColumn` first, then feature columns, then `...commonColumns`.
- ⚠ **`commonColumns` and `AbstractEntity` are one definition in two places.** Change both together, with `migration-structure.spec.ts` green.
- Filename `<timestamp>-create_<table>_table.ts`; class `Create<Table>Table<timestamp>`. **The timestamp is a dependency statement:** a table takes a timestamp after every table it references.
- Table names come from `TABLE_*` constants. Constraint names follow `` `${TABLE_X}_fk_<col>` ``, `_idx_`, `_uq_`, `_ck_`, pinned on the entity too.
- **Always implement `down()`**: `dropTable(TABLE_X, true, true, true)`.
- `migration:generate` is a **diff check**, not the source. Generate it, read it, fold the change into the owning table's file. Raw-SQL objects TypeORM cannot model (a `pg_trgm` index, a PostGIS column) are invisible to it, so it will propose dropping them; reject those drops.
- **In development, a schema change is an edit to the table's own `create_<table>_table` file.** Once a table is on a shared database, stop editing it and add a new `add_`/`alter_` migration instead.

---

## 10. Testing

Jest, configured in `package.json`: `*.spec.ts` under `apps/` and `libs/`.

```bash
yarn test                              # everything
yarn test path/to/file.spec.ts         # one file
yarn test -t "never the raw password"  # one case
```

- **Unit tests mock the repository.** `user.service.spec.ts` is the pattern.
- **Assert what must not happen**, not only what must: the raw password is absent from what was saved; a masked email is null.
- **Prove the test can fail.** Break the guard and watch the test go red.
- `migration-structure.spec.ts` checks every migration against its entity without a database. It must stay green.

---

## 11. Checklist for a new feature

1. **The schema doc section exists** (`doc/schema-design.md`).
2. **Entity** in `libs/shared/src/database/entities/<domain>/`, extending `AbstractEntity`: `TABLE_*` constant, int PK/FK, `snake_case`, explicit types, `smallint` enums, `timestamptz`, constraint names pinned.
3. **Enums** split by the boundary (§1.1).
4. **Migration:** one table, its own indexes and constraints, `down()` written, generated diff read.
5. **Repository** in `libs/shared/src/database/repositories/<domain>/`: column arrays, conditional pagination, `sortOrder`, `deleted_at IS NULL`, visibility in the query.
6. **Service:** guards on the locked row, multi-write in a transaction, `23505` → 409.
7. **DTOs:** create/update in the feature's `dto/`; filter in `libs/shared/src/utils/dtos/<domain>/`.
8. **Controller:** correct base controller, `super()`, `@ApiTags`, annotated return types, `ApiResponse`.
9. **Register** in the domain `*.module.ts`, and that module in `app.module.ts`.
10. **Tests** beside the subject; `yarn lint` and `yarn test` clean.
