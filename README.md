# SoundCircle API

Musician discovery and band management. A NestJS 11 monorepo on PostgreSQL 18.

**Read first:** [`doc/schema-design.md`](doc/schema-design.md) for what the system is, and [`doc/coding-standards.md`](doc/coding-standards.md) for how each layer is written. `CLAUDE.md` is the short agent-facing index of both.

## Where the build stands

| Feature | Status |
|---|---|
| `users`: `POST /api/v1/users`, `GET /api/v1/users` | **done** |
| Auth, profiles, media, bands, invitations, dashboard | designed in `doc/schema-design.md`, not started |

## Getting started

Requires **Node 24** and **Yarn** (never npm).

```bash
cp .env.example .env
yarn install

docker compose -f infra/docker/docker-compose.local.yml up -d   # PostgreSQL 18 on 5433

yarn migration:run
yarn start:core-api:dev
```

Swagger is at `http://localhost:8020/api`, and routes are under `/api/v1`.

```bash
curl -X POST http://localhost:8020/api/v1/users -H "Content-Type: application/json" \
  -d '{"name":"Rahim Uddin","email":"rahim@example.com","password":"correct-horse","email_visibility":1}'

curl "http://localhost:8020/api/v1/users?page_no=1&page_size=10"
```

## Commands

```bash
yarn start:core-api:dev
yarn build:core-api

yarn __migration:generate --name=x   # a diff check — READ THE SQL, fold it into the owning table's file
yarn migration:run                   # migration:rollback
yarn db:drop                         # DROP ALL TABLES — destructive

yarn lint / yarn lint:fix / yarn formatter
yarn test                            # test:watch / test:cov
```

## Layout

```
apps/core-api/     the HTTP API (:8020)
libs/shared/       @soundcircle/shared — entities, repositories, migrations, shared utils
doc/               the documents of record
infra/docker/      local Postgres only
```
