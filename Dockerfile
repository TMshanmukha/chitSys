FROM node:20-alpine

WORKDIR /app

# Copy backend package manifests
COPY backend/package*.json ./
RUN npm install --omit=dev --no-audit

# Copy backend source code
COPY backend/ ./

ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000 80 8080

CMD ["npm", "start"]
