FROM node:alpine

COPY app.js package.json package-lock.json app/

WORKDIR /app
RUN npm install

ENV FASTIFY_ADDRESS=0.0.0.0
ENV CONCURRENCY=10

CMD ["npm", "start"]
