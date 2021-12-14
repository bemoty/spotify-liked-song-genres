FROM node:alpine
LABEL dev.bemoty.spotify-liked-song-genres.authors="josh@bemoty.dev"
WORKDIR /home/app/
RUN cd /home/app/
COPY . .
RUN npm install
RUN npm run build
EXPOSE 8000
CMD [ "node", "App.js" ]
