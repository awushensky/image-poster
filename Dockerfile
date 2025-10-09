FROM node:20-alpine AS base
RUN apk add --no-cache sqlite dcron
COPY scripts/backup.sh /app/scripts/backup.sh
COPY scripts/restore.sh /app/scripts/restore.sh
COPY scripts/list-backups.sh app/scripts/list-backups.sh
RUN chmod +x /app/scripts/backup.sh /app/scripts/restore.sh /app/scripts/list-backups.sh
RUN echo "0 3 * * * /app/scripts/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root
COPY scripts/docker-entrypoint.sh /app/scripts/docker-entrypoint.sh
RUN chmod +x /app/scripts/docker-entrypoint.sh
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]

FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM base AS development
COPY . /app
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
ENV CHOKIDAR_USEPOLLING=true
ENV VITE_DEV_SERVER_POLL=true
ENV VITE_HMR_PORT=24678
WORKDIR /app
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

FROM base AS production
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
WORKDIR /app
EXPOSE 3000
CMD ["npm", "run", "start"]
