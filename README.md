# api-generator-module


generator for creating RESTful NodeJS APIs, using ES6, Prisma. The fastest way to get your project up and running using an awesome stack.


## Getting started

- Make sure you have installed on your machine: `npm init -y`
- Make typescripts : `npm install typescript --save-dev`
- Make install Prisma and @prisma/client: `npm install prisma` and `npm install @prisma/client --save-dev`
- If the database already exists, please do a DB pull using Prisma so that the schema can be updated command: `npx prisma init` 
- setting file `.env` envirovment change configuration `DATABASE_URL="postgresql://username:password@localhost:port/my-db?schema=public"`
- continue `npx prisma db pull`
- continue install several dependencies `npm install ts-node --save-dev`, `npm install @types/node --save-dev`
- final install `npm install api-generator-module`
- several configuration `npx api-generator-module setup` from setup directory and configuration `npx api-generator-module generate` from setup generate file Restfull Api based on schema ORM prisma 
- several configuration tsconfig.json `npx api-generator-module update-tsconfig` so that you update the tsconfig settings

## Running the generated project

Make sure you have node version `>= 20` because this project uses native supported ES6 features.

### Development

- Run: `postgesql` to start the local postgresql
- Run: `npm run dev` to run the app (By default the app will run at `localhost:3000`, you can change this in the config file).

## Architecture
Assuming we use `user` and `pet` models the generated project will look like this:

```
 src
│   ├── config
│   │   ├── index.ts
│   ├── controllers
│   │   ├── adminmodule.controller.ts
│   │   ├── app.controller.ts
│   │   ├── attachment.controller.ts
│   │   ├── kabupaten.controller.ts
│   │   ├── kategoripelabuhan.controller.ts
│   │   ├── kategoriperkerasan.controller.ts
│   │   ├── kategoriperlengkapan.controller.ts
│   │   ├── provinsi.controller.ts
│   │   ├── user.controller.ts
│   │   ├── usergroup.controller.ts
│   │   ├── usergroupadminmodule.controller.ts
│   │   ├── usergroupapp.controller.ts
│   ├── dtos
│   │   ├── adminmodule.dto.ts
│   │   ├── app.dto.ts
│   │   ├── attachment.dto.ts
│   │   ├── kabupaten.dto.ts
│   │   ├── kategoripelabuhan.dto.ts
│   │   ├── kategoriperkerasan.dto.ts
│   │   ├── kategoriperlengkapan.dto.ts
│   │   ├── provinsi.dto.ts
│   │   ├── user.dto.ts
│   │   ├── usergroup.dto.ts
│   │   ├── usergroupadminmodule.dto.ts
│   │   ├── usergroupapp.dto.ts
│   ├── exceptions
│   │   ├── HttpException.ts
│   ├── generators
│   │   ├── generatorRestApi.ts
│   │   ├── updateTsconfig.ts
│   ├── http
│   │   ├── adminmodule.http
│   │   ├── app.http
│   │   ├── attachment.http
│   │   ├── kabupaten.http
│   │   ├── kategoripelabuhan.http
│   │   ├── kategoriperkerasan.http
│   │   ├── kategoriperlengkapan.http
│   │   ├── provinsi.http
│   │   ├── user.http
│   │   ├── usergroup.http
│   │   ├── usergroupadminmodule.http
│   │   ├── usergroupapp.http
│   ├── index.ts
│   ├── interfaces
│   │   ├── routes.interface.ts
│   ├── middlewares
│   │   ├── validation.middleware.ts
│   ├── routes
│   │   ├── adminmodule.route.ts
│   │   ├── app.route.ts
│   │   ├── attachment.route.ts
│   │   ├── kabupaten.route.ts
│   │   ├── kategoripelabuhan.route.ts
│   │   ├── kategoriperkerasan.route.ts
│   │   ├── kategoriperlengkapan.route.ts
│   │   ├── provinsi.route.ts
│   │   ├── user.route.ts
│   │   ├── usergroup.route.ts
│   │   ├── usergroupadminmodule.route.ts
│   │   ├── usergroupapp.route.ts
│   ├── setup.ts
├── tsconfig.json
```

#### Controller:
HTTP layer, in this instance you can manage express request, response and next. In `src/controller` are the basic RESTful methods `find`, `findOne`, `findById`, `create`, `update` and `remove`. Because this class is extending from there, you got that solved. You can overwrite extended methods or create custom ones here.


## Contributing
Contributors are welcome, please fork and send pull requests! If you find a bug or have any ideas on how to improve this project please submit an issue.


## Style guide
[![Standard - JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
