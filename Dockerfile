FROM node:alpine
LABEL dev.bemoty.spotify-liked-song-genres.authors="josh@bemoty.dev"
WORKDIR /home/app/

COPY . .

RUN cd /home/app/ && npm install

EXPOSE 8000

CMD [ "npm", "run", "start" ]
