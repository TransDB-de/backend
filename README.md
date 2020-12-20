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
- `/models` Contain files with javascript objects which represents [validate.js](https://validatejs.org/) validators.
- `/routes` Contain files with [express routers](https://expressjs.com/en/4x/api.html#router).
- `/services` Contain files with static javascript classes that provides functionality.
- `/utils` Contain files with javascript functions and [express middlewares](https://expressjs.com/en/guide/writing-middleware.html).

### Services
- `config.js` The config service is responsible for the application configuration.
It creates a new config file on startup if no one exist and load the config if one exist.
- `database.js` A Service to interact with the MongoDB database.
It provides functions to get, insert and update data. This service is also sometimes called DAL (Data Access Layer).
- `entry.js` This service has methods to create and manage entries.
- `osm.js` A service to interact with the open street maps nominatim api. This will be used here to get coordinates from an address.
- `user.js` This service contains methods for user management. Such as password generation and user registration.

## Setup
**Requirements:** NodeJS 14 or higher, NPM, a running MongoDB server.

1. Download and extract the files to your destination directory
2. Run `npm install`
3. Run `npm start`
4. On first start the application will exit. A `config.json` file will now be in the root directory.
5. Fill out all config fields.
6. Run `npm start` again.

## Contribution

### Coding conventions
- Use 4 spaces indent and camelCase
- Always leave enough empty lines in bigger code blocks
- Comment your code (in english)
- Use JSDoc comments above functions
- Stick to the structure
- Test your changes
- Update the documentation
- Use async/await instead of callbacks