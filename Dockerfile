FROM node:15.3.0-alpine3.10

COPY app.js /app/app.js
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY routes/ /app/routes/

WORKDIR /app
RUN npm install

ENV FASTIFY_ADDRESS=0.0.0.0
ENV CONCURRENCY=10

CMD ["npm", "start"]
