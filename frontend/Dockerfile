# alpine の musl libc は Docker DNS 解決が不安定なため slim（Debian）を使用
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
