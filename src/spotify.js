const util = require("./util");
const log4js = require("log4js");

const spotify = (spotifyApi) => {
  const logger = log4js.getLogger("Spotify");
  return {
    async getArtistsForTracks(tracks) {
      const artists = tracks
        .map((a) => a.track.artists[0].id)
        .filter((value, index, self) => self.indexOf(value) === index);
      const chunkSize = 50;
      let chunks = util.splitChunk(artists, chunkSize);
      let artistData = [];
      for (let chunk of chunks) {
        logger.info(
          `Loading artist chunk ${artistData.length}-${
            artistData.length + chunkSize
          }...`
        );
        const ad = await spotifyApi.getArtists(chunk);
        artistData.push(...ad.body.artists);
      }
      return artistData;
    },
    async decorateArtistGenres(tracks) {
      logger.info("Loading artist genre information...");
      const artistData = await this.getArtistsForTracks(tracks);
      for (let i = 0; i < tracks.length; i++) {
        const artistId = tracks[i].track.artists[0].id;
        const data = artistData.filter((a) => a.id === artistId);
        tracks[i].genres = data[0].genres;
      }
      logger.info("Successfully loaded artist / genre data");
    },
    async getSavedTracks(offset = 0) {
      var data = await spotifyApi.getMySavedTracks({
        offset: offset,
      });
      process.stdout.write("Loading tracks with offset: " + offset + "\r");
      var tracks = data.body.items;
      if (data.body.next) {
        return (await this.getSavedTracks(offset + 20)).concat(tracks);
      }
      return tracks;
    },
  };
};

module.exports = spotify;
