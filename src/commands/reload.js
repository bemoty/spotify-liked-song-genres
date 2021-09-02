const config = require("config-uncached");
const log4js = require("log4js");
const util = require("../util");

async function reloadCommand(_, spotifyApi) {
  const logger = log4js.getLogger("ReloadCommand");
  if (_.length != 1) {
    logger.error("Illegal arguments, usage: reload");
    return;
  }
  const spotify = require("../spotify")(spotifyApi);
  const data = await spotify.getSavedTracks();
  logger.info(`Successfully loaded ${data.length} songs`);
  await spotify.decorateArtistGenres(data);
  logger.info(
    `Populating ${config(true).get("spotify.playlists").length} playlist(s)`
  );
  for (let playlist of config().get("spotify.playlists")) {
    logger.info(`Populating playlist '${playlist.name}'`);
    const p = await spotifyApi.getPlaylist(playlist.id);
    if (p.body.tracks.total > 0) {
      await spotifyApi.removeTracksFromPlaylistByPosition(
        playlist.id,
        Array(p.body.tracks.total)
          .fill()
          .map((_, i) => i),
        p.body.snapshot_id
      );
    }
    if (playlist.aoverride) {
      for (let track of data) {
        if (playlist.aoverride.includes(track.track.artists[0].name)) {
          track.genres.push(playlist.genres[0]);
        }
      }
    }
    let tracks = data.filter(
      (t) => t.genres.filter((v) => playlist.genres.includes(v)).length !== 0
    );
    if (playlist.ngenres) {
      tracks = tracks.filter(
        (t) => t.genres.filter((v) => playlist.ngenres.includes(v)).length === 0
      );
    }
    const chunkSize = 100;
    const splitTracks = util.splitChunk(tracks, chunkSize);
    let part = 0;
    for (let split of splitTracks) {
      logger.info(`Populating chunk ${part}-${part + chunkSize}...`);
      await spotifyApi.addTracksToPlaylist(
        playlist.id,
        split.map((t) => t.track.uri)
      );
      part += chunkSize;
    }
  }
  logger.info("Successfully completed main loop");
}

module.exports = {
  label: "reload",
  run: reloadCommand,
};
