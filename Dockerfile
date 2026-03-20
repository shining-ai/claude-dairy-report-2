FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# postinstall で prisma generate が走るため、先にスキーマをコピーする
COPY prisma ./prisma/
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
