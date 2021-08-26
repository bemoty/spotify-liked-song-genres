const config = require("config-uncached");
const log4js = require("log4js");
const express = require("express");
const cookieParser = require("cookie-parser");

const stateKey = "spotify_state_auth";

function Server(spotifyApi, authorizedCallback) {
  const app = express();
  const logger = log4js.getLogger("Server");
  app.use(cookieParser());
  app.get("/login", (req, res) => {
    const state = Math.random().toString(20).substr(2, 10);
    res.cookie(stateKey, state);
    res.redirect(
      spotifyApi.createAuthorizeURL(config().get("spotify.scopes"), state)
    );
  });
  app.get("/callback", (req, res) => {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;

    if (error) {
      logger.error("Callback error:", error);
      res.send(`An error occurred while handling callback: ${error}`);
      return;
    }

    const storedState = req.cookies ? req.cookies[stateKey] : null;
    if (state === null || state !== storedState) {
      res.send("A state mismatch occurred");
      return;
    }

    spotifyApi
      .authorizationCodeGrant(code)
      .then((data) => {
        const access_token = data.body["access_token"];
        const refresh_token = data.body["refresh_token"];
        const expires_in = data.body["expires_in"];

        spotifyApi.setAccessToken(access_token);
        spotifyApi.setRefreshToken(refresh_token);

        logger.info(
          `Successfully retrieved access token, will expire in ${expires_in}`
        );
        res.send("Success! You can now close this window");
        server.close(); // don't need express anymore
        setInterval(async () => {
          const data = await spotifyApi.refreshAccessToken();
          logger.info("The access token has been refreshed");
          spotifyApi.setAccessToken(data.body["access_token"]);
        }, (expires_in / 2) * 1000);
        authorizedCallback();
      })
      .catch((err) => {
        logger.error("Authorization error:", err);
        res.send(`An error occurred while performing authorization: ${err}`);
      });
  });
  const port = config().get("server.port");
  const server = app.listen(port, () => {
    logger.info(
      `Initialized Spotify Web API, please authorize at ${config().get(
        "server.host"
      )}${port === "80" || port === "443" ? "" : `:${port}`}/login`
    );
  });
}

module.exports = Server;
