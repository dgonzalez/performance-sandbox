FROM node:15.3.0-alpine3.10

COPY app.js /app/app.js
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY routes/ /app/routes/

WORKDIR /app
RUN npm install

CMD ["npm", "start"]
