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

## Project structure

### Directories

- `/api` Typescript api documentation. `api.ts` documents the api itself. The other files contain all types avalible to the api. Documentation is generic, and can be used for backend and frontend puproses.
- `/models` Contains modules with javascript objects that represent [validate.js](https://validatejs.org/) validation schemas.
- `/routes` Contains modules with [express routers](https://expressjs.com/en/4x/api.html#router).
- `/services` Modules that provide most of the backends funtionality.
- `/utils` Modules with javascript functions and [express middlewares](https://expressjs.com/en/guide/writing-middleware.html).
- `/types` Custom express types, to ensure route type safety.

### Services

- `config.js` The config service is responsible for the application configuration.
It creates a new config file on startup if no one exist and load the config if one exist.
- `database.js` A Service to interact with the MongoDB database.
It provides functions to get, insert and update data. This service is also sometimes called DAL (Data Access Layer).
- `entry.js` This service has methods to create and manage entries.
- `osm.js` A service to interact with the open street maps nominatim api. This will be used here to get coordinates from an address.
- `user.js` This service contains methods for user management. Such as password generation and user registration.

## Setup

**Requirements:** NodeJS 14.15.4 or higher, NPM, a running MongoDB server.

1. Download and extract latest release from [releases].
2. Run `npm install`.
3. Run `npm start`.
4. On first start the application will exit. A `config.json` file will now be in the root directory.
5. Fill out all config fields.
6. Open your mongodb, create a collection named "geodata" and import the DE.tab file from [OpenGeoDb Downloads](http://www.fa-technik.adfc.de/code/opengeodb/) into the collection as tab seperated csv.
7. Run `npm start` again.

**Development Setup:**

**Requirements:**  In addition to all requirements above: Typescript 4.1.2+

1. Clone the repository.
2. Run `npm install`.

## Hosting for production

**Requirements:**

- NodeJS 14.15.4 LTS or higher
- NPM (automatically installed with NodeJS)
- A MongoDB server
- A reverse proxy with SSL

## Geodata

TransDB offers the functionality to filter by location and calculate the distance.
But if you search by city or postalcode and not by coordinates (user's geolocation) the backend has no coordinates to calculate the distance.
To fix this, we import data from [OpenGeoDB](http://opengeodb.giswiki.org/wiki/OpenGeoDB) to get the coordinates of cities.
*The OpenStreetMaps API is not used because of rate limits.*

## Contribution

### Coding conventions

- Use 4 spaces indent and camelCase
- camelCase filenames
- use es6 `import`/`export`, instead of `require`
- Always leave enough empty lines in bigger code blocks
- Comment your code (in english)
- Use JSDoc comments above exported functions
- Stick to the structure
- Test your changes
- Update the documentation
- Use async/await instead of callbacks, where possible

### Maintain Type Safety

- Do not use `any` or `unkown` for parameters or returns, unless you mean it
- When you make changes to the api, make sure to document them in `/api`
- Do not use the types `express.Router` `express.Request` `express.Response` `express.RequestHandler`
    Use the custom global types `Router<path>` `Request` `Response` `Middleware`, instead. They link to the api documentation to provide type safety for routes.
- Do not write `.js` files
