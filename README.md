# TransDB Backend & API

The backend of the TransDB site

## Dependencies

- [ExpressJS](https://expressjs.com/) Node.js web framework.
- [Axios](https://www.npmjs.com/package/axios) Library to send web requests.
- [mongodb](https://mongodb.github.io/node-mongodb-native/) MongoDB database driver.
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) Library for jwt authentication.
- [validate.js](https://validatejs.org/) Javascript object validation. Used for input validation on post requests.
- [helmet](https://www.npmjs.com/package/helmet) ExpressJS security middleware.
- [cors](https://www.npmjs.com/package/cors) Middleware to enable cors in ExpressJS.
- [nanoid](https://www.npmjs.com/package/nanoid) Library to generate random unique strings. Used for random user passwords.
- [node-cleanup](https://www.npmjs.com/package/node-cleanup) Function to run cleanup operations (close server connections etc.) on application shutdown.
- [axios-rate-limit](https://www.npmjs.com/package/axios-rate-limit) Rate limits axios requests.

## Project structure

### Directories

- `/api` Typescript api documentation. `api.d.ts` documents the api itself. The other files contain all types avalible to the api. Documentation is generic, and can be used for backend and frontend puproses.
- `/models` Contains modules with objects that represent [validate.js](https://validatejs.org/) validation schemas.
- `/routes` Contains modules with [express routers](https://expressjs.com/en/4x/api.html#router).
- `/services` Modules that provide most of the backends funtionality.
- `/utils` Modules with functions and [express middlewares](https://expressjs.com/en/guide/writing-middleware.html).
- `/@types` Typedefs for modules, and custom express types which bind the api to the typechecker.

### Services

- `config.js` The config service is responsible for the application configuration.
It creates a new config file on startup if no one exist and load the config if one exist.
- `database.js` A Service to interact with the MongoDB database.
It provides functions to get, insert and update data. This service is also sometimes called DAL (Data Access Layer).
- `entry.js` This service has methods to create and manage entries.
- `osm.js` A service to interact with the open street maps nominatim api. This will be used here to get coordinates from an address.
- `user.js` This service contains methods for user management. Such as password generation and user registration.

## Setup

**Requirements:** NodeJS 14.15.4 or higher, NPM, a running MongoDB server, with MongoDB Database Tools installed.

1. Download and extract latest release from [releases](/releases/latest).
2. Run `npm install`.
3. Run `npm start`.
4. On first start the application will exit. A `config.json` file will now be in the root directory.
5. Fill out all config fields.
6. Open your mongodb, create a collection named "geodata" and import the data.json file in GeoDbJson.zip from [Tool Downloads](https://github.com/TransDB-de/Tools/releases/tag/0.1.2) into the collection as json.
7. Run `npm start` again.

**Development Setup:**

**Requirements:**  In addition to all requirements above: Typescript 4.1.2+

1. Clone the repository.
2. Run `npm install`.

To make build that is suitable for production (no dev dependencies, no typescript files), use `npm run build`.
A new folder will be created in `./dist` with it's own `package.json` and compiled javascript files.

## Hosting for production

**Requirements:**

- NodeJS 14.15.4 LTS or higher
- NPM (automatically installed with NodeJS)
- A MongoDB server
- [MongoDB Database Tools](https://docs.mongodb.com/database-tools/)
- A reverse proxy with SSL

## Geodata

TransDB offers the functionality to filter by location, and sort by distance.
But if you search by city-name or postalcode, instead of coordinates (user's geolocation), the backend has no coordinates to calculate the distance from.
To fix this, we import data from [OpenGeoDB](http://opengeodb.giswiki.org/wiki/OpenGeoDB) to get the coordinates of cities, districts, and postalcodes.
The data is also used to retrieve the name of a place, when a user searches by geolocation.
This is useful for user feedback, in case the location determined by the front-end is incorrect.
*The OpenStreetMaps API is not used because of rate limits.*

Unfortunatly, the data from OpenGeoDB is unsuitable for some MongoDB features.
We use a [custom tool](https://github.com/TransDB-de/Tools/) to restructure the data for our project.

## Contribution

### Coding conventions

- Use 4 spaces indent and camelCase
- Also camelCase filenames
- Use es6 `import`/`export`, instead of `require`
- Always leave enough empty lines in bigger code blocks
- Comment your code (in english)
- Use JSDoc comments above exported functions
- Stick to the structure
- Test your changes
- Update the documentation
- Use async/await instead of callbacks, when possible

### Maintain Type Safety

- Do define parameter and return types for custom functions
- When you make changes to the api, make sure to document them in `/api`
- Do not use the types `'express.Router'` `'express.Request'` `'express.Response'` `'express.RequestHandler'`.
    Use the custom global types `'IRouter<baseRoute>'` `'IRequest'` `'IResponse'` `'IMiddleware'`, instead. They link to the api documentation to provide type safety for routes.
- Do not use `.js` files, or set tsc to accept `.js` files

### A Note On Types

This project uses custom definitions to bind the api documentation to the routes.
If a code change leads to a typescript error, make sure your code is compatible with the routes defined in api.ts and vice-versa.
The project is set-up in such a way that most types are automatically infered, and do not have to be specifically set.
