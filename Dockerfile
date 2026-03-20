# alpine の musl libc は Docker DNS 解決が不安定なため slim（Debian）を使用
FROM node:20-slim

# Prisma が必要とする OpenSSL をインストール
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# postinstall で prisma generate が走るため、先にスキーマをコピーする
COPY prisma ./prisma/
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
