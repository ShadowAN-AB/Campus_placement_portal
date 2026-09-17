FROM node:22-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build
EXPOSE 5050
CMD ["node", "dist/main.js"]
