# Bluesky Image Poster
An application to post images to bluesky on a regular cadence.

This is a personal project I built for my friend and to learn react-router, so there's not a lot of documentation.

## Configuration
You'll need to set up a `config.json` file and map it to `/config`. See the example_config.json file in this repository as an example.

Note that in order for bsky oauth to work, bluesky must be able to contact this server to read the `jwks.json` and `client-metadata.json` routes, so this has to be publicly accessible at the `BASE_URL`.

## Running
This image is posted to docker hub under `awushensky/image-poster`. Here is an example docker-compose configuration
```
  image-poster:
    container_name: image-poster
    image: awushensky/image-poster:latest
    user: ${DOCKERUSER_USER_ID}:${DOCKERUSER_GROUP_ID}
    restart: unless-stopped
    environment:
      - BASE_URL=https://<your_url_here>
      - SESSION_SECRET=${IMAGE_POSTER_SESSION_SECRET}
      - PRIVATE_KEY_1=${IMAGE_POSTER_PRIVATE_KEY_1}
      - PRIVATE_KEY_2=${IMAGE_POSTER_PRIVATE_KEY_2}  
      - PRIVATE_KEY_3=${IMAGE_POSTER_PRIVATE_KEY_3}
    volumes:
      - ./image-poster/data:/app/data          # SQLite database
      - ./image-poster/backups:/app/backups    # Backups
      - ./image-poster/uploads:/app/uploads    # Image uploads
      - ./image-poster/config:/config:ro       # Configuration
    ports:
      - 3000:3000

  image-poster-backup:
    container_name: image-poster-backup
    image: awushensky/image-poster:latest
    user: ${DOCKERUSER_USER_ID}:${DOCKERUSER_GROUP_ID}
    restart: unless-stopped
    environment:
      - BACKUP_INCLUDE_UPLOADS=true  # set to false if uploads are already covered by an external backup system
    volumes:
      - ./image-poster/data:/app/data          # SQLite database (read)
      - ./image-poster/uploads:/app/uploads    # Image uploads (read)
      - ./image-poster/backups:/app/backups    # Backups (write)
    entrypoint: >
      sh -c 'while true; do
        /app/scripts/backup.sh;
        sleep 86400;
      done'
    security_opt:
      - no-new-privileges:true
```

## Building
To build this image from source, you can build it using docker. Here's an example docker-commpose configuration
```
  image-poster:
    build:
      context: ~/src/image-poster
      target: production
    container_name: image-poster
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - BASE_URL=https://<your_url_here>
      - SESSION_SECRET=${IMAGE_POSTER_SESSION_SECRET}
      - PRIVATE_KEY_1=${IMAGE_POSTER_PRIVATE_KEY_1}
      - PRIVATE_KEY_2=${IMAGE_POSTER_PRIVATE_KEY_2}
      - PRIVATE_KEY_3=${IMAGE_POSTER_PRIVATE_KEY_3}
    volumes:
      - ./image-poster/data:/app/data          # SQLite database
      - ./image-poster/backups:/app/backups    # Backups
      - ./image-poster/uploads:/app/uploads    # Image uploads
      - ./image-poster/config:/config          # Configuation
    ports:
      - 3000:3000

  image-poster-backup:
    build:
      context: ~/src/image-poster
      target: base
    container_name: image-poster-backup
    restart: unless-stopped
    environment:
      - BACKUP_INCLUDE_UPLOADS=true  # set to false if uploads are already covered by an external backup system
    volumes:
      - ./image-poster/data:/app/data          # SQLite database (read)
      - ./image-poster/uploads:/app/uploads    # Image uploads (read)
      - ./image-poster/backups:/app/backups    # Backups (write)
    entrypoint: >
      sh -c 'while true; do
        /app/scripts/backup.sh;
        sleep 86400;
      done'
    security_opt:
      - no-new-privileges:true
```

Or if you want to run in development mode with hot reloading, use a configuration like this
```
  image-poster:
    build:
      context: ~/src/image-poster
      target: development
    container_name: image-poster
    user: 1000:1000
    restart: unless-stopped
    labels:
      - "diun.enable=true"
    environment:
      - NODE_ENV=development
      - VITE_DEV_SERVER_POLL=true
      - CHOKIDAR_USEPOLLING=true
      - VITE_HMR_PORT=24678
      - BASE_URL=https://<your_url_here>
      - SESSION_SECRET=${IMAGE_POSTER_SESSION_SECRET}
      - PRIVATE_KEY_1=${IMAGE_POSTER_PRIVATE_KEY_1}
      - PRIVATE_KEY_2=${IMAGE_POSTER_PRIVATE_KEY_2}
      - PRIVATE_KEY_3=${IMAGE_POSTER_PRIVATE_KEY_3}
    volumes:
      - ./image-poster/data:/app/data          # SQLite database
      - ./image-poster/backups:/app/backups    # Backups
      - ./image-poster/uploads:/app/uploads    # Image uploads
      - ./image-poster/config:/config          # Configuation
      - ~/src/image-poster:/app:delegated
      - /app/node_modules
    ports:
      - 3000:3000
      - 24678:24678
```

## Backups

Backups run in a separate `image-poster-backup` sidecar container (see the example compose configurations above), independent of the main app's lifecycle. It runs once at container start and roughly every 24 hours after that, writing to `/app/backups`:

- `app.db` - a WAL-consistent snapshot of the SQLite database (via `sqlite3 .backup`), verified with `PRAGMA integrity_check` and swapped in atomically. A single file, overwritten in place each run - it is not a point-in-time archive, so pair it with an external backup system (e.g. restic, Backblaze, etc.) on the `/app/backups` bind mount if you need history or offsite retention.
- `uploads.tar.gz` - a gzipped archive of the uploads directory, also overwritten in place each run. Set `BACKUP_INCLUDE_UPLOADS=false` on the sidecar if your uploads are already covered by an external backup system pointed at the `/app/uploads` bind mount directly - archiving them again here is pure duplication, and gzip's output defeats most backup tools' content-defined deduplication, so it's wasted storage on top of being redundant.

Note: this relies on SQLite's WAL locking working correctly across the two containers sharing `/app/data`, which requires that mount to be real local disk (or an equivalent that supports proper POSIX file locking). It will not be reliable if that directory is backed by NFS or similar network filesystems - the same caveat that already applies to the app itself running SQLite in WAL mode.

Listing current backups:
```
docker exec image-poster-backup /app/scripts/list-backups.sh
```

Triggering a manual backup:
```
docker exec image-poster-backup /app/scripts/backup.sh
```

Restoring the current backup:
```
docker exec image-poster-backup /app/scripts/restore.sh
```

If you have older dated `backup_<timestamp>.tar.gz` archives from before this sidecar existed, they remain restorable:
```
docker exec image-poster-backup /app/scripts/restore.sh backup_20251008_030000.tar.gz
```
