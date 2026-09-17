# Production image for the live site (deployed by Coolify on every push to main).
# Two stages: the first builds the Nuxt server, the second holds only what runs.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Scripts are skipped here because "nuxt prepare" needs the source, which comes next.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /app/.output ./.output
# SQL migrations; the server applies pending ones on startup (see server/db/index.ts).
COPY --from=build /app/drizzle ./drizzle
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
