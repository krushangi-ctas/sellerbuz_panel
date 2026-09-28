# Build Angular app
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm i

COPY . .

RUN npm run build


# Runtime
FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist/saas-panel ./dist

CMD ["serve", "-s", "dist", "-l", "80"]