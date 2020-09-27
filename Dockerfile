FROM node:14.11.0-alpine
LABEL maintainer="Anthony Hastings <ar.hastings@gmail.com>"

ENV DOCKERIZE_VERSION v0.6.1

RUN apk add --no-cache openssl \
    && wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && rm dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz

WORKDIR /nodejs-background-worker

COPY package.json yarn.lock ./

RUN yarn install && yarn cache clean

COPY . ./

CMD yarn start