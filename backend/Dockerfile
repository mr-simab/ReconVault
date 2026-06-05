FROM node:20-alpine AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY --from=build /app/package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 8000
CMD ["node", "dist/index.js"]
