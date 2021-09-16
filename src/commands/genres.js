const log4js = require("log4js");
const fs = require('fs');
const spotify = require("../spotify");

async function genresCommand(_, spotifyApi) {
  const logger = log4js.getLogger("GenresCommand");
  if (_.length != 1) {
    logger.error("Illegal arguments, usage: genres");
    return;
  }
  const spotifyObj = spotify(spotifyApi);
  const data = await spotifyObj.getSavedTracks();
  logger.info(`Successfully loaded ${data.length} songs`);
  const artists = await spotifyObj.getArtistsForTracks(data);
  artists.sort((a, b) => a.name.localeCompare(b.name));
  let buffer = [];
  artists.forEach((artist) => {
    buffer.push(`"${artist.name.replace("\"", "\\\"")}","${artist.genres}"`);
  });
  fs.writeFile('./output.csv', buffer.join('\n'), 'utf-8', (err) => {
    if (err) {
        logger.error('Error while writing output to disk');
        return;
    }
    logger.info('Successfully exported artist genres');
  })
  logger.info("Successfully completed main loop");
}

module.exports = {
  label: "genres",
  run: genresCommand,
};
