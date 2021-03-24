FROM node:14.16-alpine AS build

WORKDIR /tmp/

# required by npm for github packages
RUN apk add --no-cache git

# install dependencies
COPY ["package.json", "package-lock.json*", "tsconfig.json", "./"]
RUN npm install

# copy source files
COPY source/ ./source/

# build
RUN npm run build

FROM node:14.16-alpine

# install required cli tools
RUN apk add --no-cache git && \
    apk add --no-cache mongodb-tools

WORKDIR /app/

COPY --from=build ["tmp/package.json", "tmp/package-lock.json*", "./"]

ENV NODE_ENV=production

# install prod dependencies
RUN npm install

COPY --from=build tmp/dist/ ./dist/

RUN apk del git

# run once, to create config file
RUN npm start; exit 0

CMD ["npm", "start"]
