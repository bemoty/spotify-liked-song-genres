const log4js = require("log4js");

async function infoCommand(args, spotifyApi) {
  const logger = log4js.getLogger("InfoCommand");
  if (args.length != 2) {
    logger.error("Illegal arguments, usage: info <artist ID>");
    return;
  }
  const artist = args[1].startsWith("https://")
    ? args[1].split("/")[4].split("?")[0]
    : args[1];
  try {
    const data = await spotifyApi.getArtist(artist);
    logger.info(
      `${data.body.name} +++ ${
        data.body.genres.length === 0 ? "NOT RATED" : data.body.genres
      }`
    );
  } catch (_) {
    logger.error("Could not retrieve artist, either the artist does not exist or the API is down");
  }
}

module.exports = {
  label: "info",
  run: infoCommand,
};
