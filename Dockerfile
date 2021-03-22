FROM node:14.16-alpine

WORKDIR /tmp/

# install required cli tools
RUN apk add --no-cache mongodb-tools

RUN apk add --no-cache git

# copy scripts and config
COPY "tsconfig.json" "./"

# copy package.json and install dependencies
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install

# copy source files
COPY source/ ./source/

# build
RUN npx tsc --sourceMap false --outDir "./dist"

RUN mv package.json ./dist/package.json && \
    mv package-lock.json ./dist/package-lock.json

# copy dist
RUN mkdir /app
RUN mv dist/* /app/

WORKDIR /app/

ENV NODE_ENV=production

# install prod dependencies
RUN npm install

# remove git and temp files
RUN apk del git
RUN rm -rf /tmp/

CMD ["npm", "start"]
