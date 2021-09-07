const config = require("config-uncached");
const log4js = require("log4js");
const spotify = require("../spotify");

async function checkCommand(_, spotifyApi) {
  const logger = log4js.getLogger("CheckCommand");
  if (_.length != 1) {
    logger.error("Illegal arguments, usage: check");
    return;
  }
  const spotifyObj = spotify(spotifyApi);
  const data = await spotifyObj.getSavedTracks();
  logger.info(`Successfully loaded ${data.length} songs`);
  const artistData = await spotifyObj.getArtistsForTracks(data);
  logger.info("Loaded artist info, calculating missing genre mappings");
  const genres = config(true)
    .get("spotify.playlists")
    .map((p) => p.genres)
    .flat();
  let martists = artistData.filter(
    (a) => a.genres.filter((g) => genres.includes(g)).length === 0
  );
  const overrides = config()
    .get("spotify.playlists")
    .map((p) => p.aoverride)
    .flat();
  if (overrides.length !== 0) {
    martists = martists.filter((a) => !overrides.includes(a.name));
  }
  if (martists.length === 0) {
    logger.info("No missing artist mappings");
    return;
  }
  logger.info("The following artists lack artist genre mappings:");
  for (let artist of martists) {
    logger.info(
      `${artist.name} ++++ ${
        artist.genres.length === 0 ? "NOT RATED" : artist.genres
      }`
    );
  }
}

module.exports = {
  label: "check",
  run: checkCommand,
};
