# alpine の musl libc は Docker DNS 解決が不安定なため slim（Debian）を使用
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
# postinstall で prisma generate が走るため、先にスキーマをコピーする
COPY prisma ./prisma/
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
