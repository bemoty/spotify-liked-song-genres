const config = require("config-uncached");
const log4js = require("log4js");
const cron = require("node-cron");
const webapi = require("spotify-web-api-node");
const server = require("./server");
const reload = require("./commands/reload");

log4js.configure({
  appenders: {
    console: { type: "console" },
  },
  categories: {
    default: {
      appenders: ["console"],
      level: process.env.NODE_ENV !== "production" ? "debug" : "info",
    },
  },
});

const logger = log4js.getLogger("SpotifyApp");
const spotifyApi = new webapi({
  clientId: config().get("spotify.client_id"),
  clientSecret: config().get("spotify.client_secret"),
  redirectUri: config().get("spotify.redirect_uri"),
});

server(spotifyApi, async (expires_in) => {
  setInterval(async () => {
    const data = await spotifyApi.refreshAccessToken();
    logger.info("The access token has been refreshed");
    spotifyApi.setAccessToken(data.body["access_token"]);
  }, (expires_in / 2) * 1000);
  cron.schedule("0 0 * * *", () => {
    logger.info("Running main loop");
    reload.run(["reload"], spotifyApi);
  });
  logger.info("Cronjob registered");
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const commands = require("./commands");
  readline.on("line", (input) => {
    input = input.trim();
    let executed = false;
    for (let command of commands) {
      if (input.startsWith(command.label)) {
        command.run(input.split(" "), spotifyApi);
        executed = true;
        break;
      }
    }
    if (!executed) {
      logger.error("Unknown command");
    }
  });
});
