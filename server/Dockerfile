FROM node:22-alpine
WORKDIR /app
COPY server/package.json ./
RUN npm install
COPY server/ ./
RUN npm run build
EXPOSE 5050
CMD ["node", "dist/main.js"]
