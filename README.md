<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).


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
│  │  ├─ dashboard.controller.ts
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
│  ├─ backups
│  │  ├─ backups.controller.ts
│  │  ├─ backups.module.ts
│  │  ├─ backups.service.ts
│  │  ├─ google-drive.service.ts
│  │  └─ supabase.service.ts
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
│  │  ├─ constants.ts
│  │  ├─ database.module.ts
│  │  ├─ drizzle
│  │  │  └─ migrations
│  │  │     ├─ 0000_careful_gladiator.sql
│  │  │     └─ meta
│  │  │        ├─ 0000_snapshot.json
│  │  │        └─ _journal.json
│  │  ├─ drizzle.provider.ts
│  │  ├─ metrics
│  │  │  ├─ dto
│  │  │  │  └─ metricsDTO.ts
│  │  │  ├─ metrics.controller.ts
│  │  │  ├─ metrics.module.ts
│  │  │  └─ metrics.service.ts
│  │  ├─ schema
│  │  │  ├─ index.ts
│  │  │  ├─ public.relations.ts
│  │  │  └─ public.schema.ts
│  │  └─ supabase.service.ts
│  ├─ main.ts
│  ├─ platillos
│  │  ├─ platillos.controller.ts
│  │  ├─ platillos.module.ts
│  │  └─ platillos.service.ts
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
│  ├─ users
│  │  ├─ dto
│  │  │  └─ create-user.dto.ts
│  │  ├─ users.controller.ts
│  │  ├─ users.module.ts
│  │  └─ users.service.ts
│  └─ zen.guard.ts
├─ tsconfig.build.json
└─ tsconfig.json

```