FROM node:alpine
LABEL dev.bemoty.spotify-liked-song-genres.authors="josh@bemoty.dev"
WORKDIR /home/app/
COPY . .
RUN npm install
RUN npm run build
CMD [ "node", "dist/App.js" ]
