# TransDB Backend & API

The backend for the TransDB site, responsible for handling all PI traffic.

## Core Dependencies

- [TypeScript](https://www.typescriptlang.org/) Type-safe JavaScript superset.
- [OvernightJS](https://github.com/seanpmaxwell/overnight) A TypeScript express.js wrapper for decorator support and eased type safety.
- [Class Validator](https://github.com/typestack/class-validator) TypeScript compatible validation.

## Project Structure

### Directories

All non-configuration files are within the `./src` parent directory.

- `controllers` Api routes and endpoints. Each Controller is responsible for one route, and can contain multiple Endpoints.
- `middleware` express.js middleware. Middleware modifies or validates incoming requests.
- `models` Typed classes and interfaces used for compile-time and run-time type validation.
- `services` ES-modules handling the bulk of the backend logic.
- `types` Additional TypeScript types, and express type extensions.
- `util` Collections of functions which can be used anywhere in the project.

### Services

- `config.service.ts` Initializes, parses, and updates the backend configuration file.
- `database.service.ts` Wraps database access in a type-safe manner.
- `entry.service.ts` Handles the creation, management, and deletion of entries.
- `osm.serivce.ts` OpenStreetMap Api interaction. Used to retrieve the GeoLocation of Entries.
- `users.service.ts` Handles the creation, management, and deletion of users.

## Setup

**Requirements:** NodeJS 14.15.4 or higher, NPM, a running MongoDB server, with MongoDB Database Tools installed.

**Warning!** MongoDB Database Tools needs to be running on the same machine as NodeJS,
not on MongoDB Server. If MongoDB Database Tools is not installed, database backups will fail!

1. Download and extract latest release from [releases](/releases/latest).
2. Run `npm install`.
3. Run `npm start`.
4. On first start the application will exit. A `config.json` file will now be in the root directory.
5. Fill out all config fields.
6. Open your MongoDB, create a collection named "geodata" and import the data.json file in GeoDbJson.zip from [Tool Downloads](https://github.com/TransDB-de/Tools/releases/tag/0.1.2) into the collection as json.
7. Run `npm start` again.

## Contributing

### Style Guide

#### Indents

Use Tab-Stops instead of spaces. Make sure to configure your editor.

Do not remove the indents from empty lines. This is **not** the default behaviour of most code-editors, so be sure to change it.

Do not use Hanging indents.

#### Spacing

Leave two empty lines between top-level scopes (functions, classes and types).

Add an empty new-line to the end of a file.

Leave a space within curly brackets. eg. `import { IRequest } from "express"`

Leave a space between control statements and brackets. eg. `if (count >= 5) { ... }`

Do not leave a space between a function call and it's brackets. eg. `filterEntry(newEntry);`

#### Case

`camelCase` files, functions, and variables.

`PascalCase` Classes, Modules, and Decorators.

#### ES6

Use es6 module `import` `export` syntax.

Use `async` `await` instead of call-backs where possible.

#### Comments

JSDoc comment exported functions. Comments should be in English. Capitalize Names. Do not place a full stop on single-line comments.

#### Naming Convention

Prefix routes which require a login with `authorized`.

Prefix routes which require admin credentials with `admin`.

Using I and E as prefixes to indicate interfaces and enums is optional.

### Type Safety

Avoid explicit `any` and `unkown` where possible. Unknown is sometimes required when interacting with the Database, but should not be used outside of the Database Service.
Try using generics and `asserts` to avoid the use of unknown. The filter functions in `util/filter` can help with this for entries and users.

Do not use `Request` and `Response` from express.js. Use `IRequest` and `IResponse` instead. See `controllers` for usage examples.

Never try to avoid a type Error with an explicit `any` annotation.

Make sure to annotate internal-only types with `never`. Omitting them is not sufficient, as typescript still allows this for interfaces. See `models/response` for usage examples.

Do not use .js files.

**Warning** You need to add .js endings when importing non-package modules. TypeScript does not throw an error if this is omitted, but a runtime error will be thrown.
