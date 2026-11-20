FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall needs prisma/ and scripts/, which only exist in the build stage
RUN npm ci --ignore-scripts

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && node scripts/copy-mediapipe.mjs && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/app/uploads NEXT_TELEMETRY_DISABLED=1
ARG YT_DLP_VERSION=2026.10.26
# The Alpine bundles include the networking backend used by the TikTok extractor.
RUN set -eu; \
  case "$(uname -m)" in \
    x86_64) asset=yt-dlp_musllinux.zip; sha=c3a67f7c14d4cbf876e7801039237fc16b929a629c72f9c785ec3fdc8aa40748 ;; \
    aarch64) asset=yt-dlp_musllinux_aarch64.zip; sha=1648beeb7b0c78b471654262697066c016783d33813659367a5c274828ba3240 ;; \
    *) echo "No yt-dlp bundle for $(uname -m)" >&2; exit 1 ;; \
  esac; \
  apk add --no-cache ca-certificates; \
  wget -O /tmp/yt-dlp.zip "https://github.com/yt-dlp/yt-dlp/releases/download/${YT_DLP_VERSION}/${asset}"; \
  echo "${sha}  /tmp/yt-dlp.zip" | sha256sum -c -; \
  unzip -q /tmp/yt-dlp.zip -d /opt/yt-dlp; \
  rm /tmp/yt-dlp.zip; \
  chmod 755 "/opt/yt-dlp/${asset%.zip}"; \
  ln -s "/opt/yt-dlp/${asset%.zip}" /usr/local/bin/yt-dlp; \
  yt-dlp --version
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs \
  && mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
