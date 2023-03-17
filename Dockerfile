FROM node:16-alpine
WORKDIR /home/app/
COPY yarn.lock package.json ./
RUN yarn install

COPY . .
RUN yarn build
EXPOSE 8080
CMD [ "node", "dist/App.js" ]
