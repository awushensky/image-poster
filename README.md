# Bluesky Image Poster
An application to post images to bluesky on a regular cadence.

This is a personal project I built for my friend and to learn react-router, so there's not a lot of documentation.

To run this, you can build it using docker. Here's an example docker-commpose configuration
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
      - ./image-poster/uploads:/app/uploads    # Image uploads
      - ./image-poster/config:/config          # Configuation
    healthcheck:
      test: ["CMD", "node", "/app/health-check.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    ports:
      - 3000:3000
```

Or if you want to run in development mode with hot reloading, use a configuration like this
```
  image-poster:
    build:
      context: ~/src/image-poster
      #target: development
      target: production
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
      - ./image-poster/uploads:/app/uploads    # Image uploads
      - ./image-poster/config:/config          # Configuation
      - ~/src/image-poster:/app:delegated
      - /app/node_modules
    healthcheck:
      test: ["CMD", "node", "/app/health-check.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    ports:
      - 3000:3000
      - 24678:24678
```

Note that the healthcheck is a kludge to make the posting scheduler start with the application. Otherwise, the posting scheduler won't start until some page is loaded. This is a limitation of the way that I built the server-side of this application.
