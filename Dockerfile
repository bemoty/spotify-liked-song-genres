FROM node:alpine
LABEL dev.bemoty.spotify-liked-song-genres.authors="josh@bemoty.dev"
WORKDIR /home/app/

RUN npm run build
COPY dist/ .
COPY package.json .
COPY package-lock.json .

RUN cd /home/app/ && npm install

EXPOSE 8000

CMD [ "npm", "run", "start" ]
