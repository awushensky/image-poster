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

This application creates a backup of the database and uploaded images nightly at 03:00. It stores these in `/app/backups`.

Listing available backups:
```
docker exec image-poster /app/scripts/list-backups.sh
```

Creating a manual backup:
```
docker exec image-poster /app/scripts/backup.sh
```

Restoring a backup:
```
docker exec image-poster /app/scripts/restore.sh backup_20251008_030000.tar.gz
```
