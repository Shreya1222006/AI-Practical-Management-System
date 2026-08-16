FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 4025
CMD ["node","dist/index.js"]
