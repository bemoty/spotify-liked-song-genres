FROM node:16-alpine
WORKDIR /home/app/
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --prod

COPY . .
RUN pnpm build
EXPOSE 8080
CMD [ "node", "dist/App.js" ]
