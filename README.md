
```
api_restaurant_management
├─ .prettierrc
├─ drizzle.config.ts
├─ eslint.config.mjs
├─ nest-cli.json
├─ package-lock.json
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ README.md
├─ src
│  ├─ app.module.ts
│  ├─ auth
│  │  ├─ auth.controller.ts
│  │  ├─ auth.module.ts
│  │  ├─ auth.service.ts
│  │  ├─ bcrypt.service.ts
│  │  ├─ decorators
│  │  │  ├─ active-user.decorator.ts
│  │  │  ├─ public.decorator.ts
│  │  │  └─ roles.decorator.ts
│  │  ├─ dto
│  │  │  ├─ sign-in.dto.ts
│  │  │  └─ sign-up.dto.ts
│  │  └─ guards
│  │     ├─ jwt-auth.guards.ts
│  │     └─ roles.guard.ts
│  ├─ cache
│  │  ├─ cache.module.ts
│  │  └─ cache.service.ts
│  ├─ common
│  │  ├─ config
│  │  │  └─ jwt.config.ts
│  │  ├─ constants
│  │  │  ├─ index.ts
│  │  │  └─ roles.ts
│  │  ├─ decorators
│  │  │  └─ match.decorator.ts
│  │  └─ interfaces
│  │     └─ active-user-data.interface.ts
│  ├─ database
│  │  ├─ database.module.ts
│  │  ├─ drizzle
│  │  │  ├─ constants.ts
│  │  │  ├─ drizzle.provider.ts
│  │  │  └─ migrations
│  │  │     ├─ 0000_loud_rattler.sql
│  │  │     └─ meta
│  │  │        ├─ 0000_snapshot.json
│  │  │        └─ _journal.json
│  │  ├─ features
│  │  │  ├─ backups
│  │  │  │  ├─ backups.controller.ts
│  │  │  │  ├─ backups.module.ts
│  │  │  │  ├─ backups.service.ts
│  │  │  │  ├─ google-drive.service.ts
│  │  │  │  └─ supabase.service.ts
│  │  │  └─ metrics
│  │  │     ├─ dto
│  │  │     │  └─ metricsDTO.ts
│  │  │     ├─ metrics.controller.ts
│  │  │     ├─ metrics.module.ts
│  │  │     └─ metrics.service.ts
│  │  ├─ schema
│  │  │  ├─ index.ts
│  │  │  ├─ public.schema.ts
│  │  │  └─ relations.schema.ts
│  │  └─ supabase
│  │     └─ supabase.service.ts
│  ├─ guards
│  │  └─ zen.guard.ts
│  ├─ main.ts
│  ├─ menu
│  │  ├─ dto
│  │  │  ├─ category-with-products.dto.ts
│  │  │  ├─ create-platillo.dto.ts
│  │  │  ├─ platillo-response.dto.ts
│  │  │  ├─ query-platillos.dto.ts
│  │  │  └─ update-platillo.dto.ts
│  │  ├─ interfaces
│  │  │  └─ platillo.interface.ts
│  │  ├─ menu.controller.ts
│  │  ├─ menu.module.ts
│  │  ├─ menu.service.ts
│  │  ├─ repositories
│  │  │  └─ platillos.repository.ts
│  │  └─ utils
│  │     └─ platillo-mapper.ts
│  ├─ mesas
│  │  ├─ mesas.controller.ts
│  │  ├─ mesas.module.ts
│  │  └─ mesas.service.ts
│  ├─ orders
│  │  ├─ dto
│  │  │  └─ create-order-mesa.dto.ts
│  │  ├─ orders.controller.ts
│  │  ├─ orders.module.ts
│  │  └─ orders.service.ts
│  ├─ pagos
│  │  ├─ dto
│  │  │  └─ Pagos.dto.ts
│  │  ├─ Pagos.controller.ts
│  │  ├─ Pagos.module.ts
│  │  └─ Pagos.service.ts
│  ├─ platillos
│  │  ├─ platillos.controller.ts
│  │  ├─ platillos.module.ts
│  │  └─ platillos.service.ts
│  ├─ predictivo
│  │  ├─ dto
│  │  └─ interfaces
│  ├─ reports
│  │  ├─ export
│  │  │  ├─ adapters
│  │  │  │  ├─ csv.adapter.ts
│  │  │  │  ├─ pdf.adapter.ts
│  │  │  │  └─ xlsx.adapter.ts
│  │  │  ├─ dto
│  │  │  │  └─ queryDTO.ts
│  │  │  ├─ export.controller.ts
│  │  │  ├─ export.service.ts
│  │  │  └─ repositories
│  │  │     └─ export.salesDishes.repository.ts
│  │  ├─ import
│  │  │  ├─ adapters
│  │  │  │  └─ xlsx.reader.adapter.ts
│  │  │  ├─ dto
│  │  │  │  └─ importDTO.ts
│  │  │  ├─ import.controller.ts
│  │  │  ├─ import.module.ts
│  │  │  ├─ import.service.ts
│  │  │  └─ repositories
│  │  │     └─ import.salesDishes.repository.ts
│  │  └─ reports.module.ts
│  ├─ reservations
│  │  ├─ dto
│  │  │  ├─ availability-query.dto.ts
│  │  │  ├─ create-reservation.dto.ts
│  │  │  ├─ reservation-response.dto.ts
│  │  │  └─ update-reservation.dto.ts
│  │  ├─ interfaces
│  │  │  └─ reservation.interface.ts
│  │  ├─ reservations.controller.ts
│  │  ├─ reservations.module.ts
│  │  └─ reservations.service.ts
│  ├─ roles
│  │  └─ dashboard.controller.ts
│  └─ users
│     ├─ dto
│     │  └─ create-user.dto.ts
│     ├─ users.controller.ts
│     ├─ users.module.ts
│     └─ users.service.ts
├─ tsconfig.build.json
└─ tsconfig.json

```