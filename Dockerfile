FROM node:alpine
LABEL dev.bemoty.spotify-liked-song-genres.authors="josh@bemoty.dev"
WORKDIR /home/app/

COPY dist/ .
COPY package.json .
COPY package-lock.json .
RUN npm run build

RUN cd /home/app/ && npm install

EXPOSE 8000

CMD [ "node", "App.js" ]
