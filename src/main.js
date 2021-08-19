const config = require("config");
const log4js = require("log4js");
const cron = require("node-cron");
const SpotifyWebApi = require("spotify-web-api-node");
const server = require("./server");

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
const spotifyApi = new SpotifyWebApi({
  clientId: config.get("spotify.client_id"),
  clientSecret: config.get("spotify.client_secret"),
  redirectUri: config.get("spotify.redirect_uri"),
});

server(spotifyApi, async () => {
  cron.schedule("0 0 * * *", () => {
    logger.info("Running main loop");
    mainLoop();
  });
  logger.info("Cronjob registered");
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  readline.on("line", (input) => {
    input = input.trim();
    if (input.startsWith("reload")) {
      let str = input.split(" ");
      if (str.length === 1) {
        mainLoop();
        return;
      }
      logger.error("Illegal arguments");
      return;
    }
    if (input.startsWith("mmap")) {
      let str = input.split(" ");
      if (str.length === 1) {
        mmapCommand();
        return;
      }
      logger.error("Illegal arguments");
      return;
    }
    if (input.startsWith("ga")) {
      let str = input.split(" ");
      if (str.length === 2) {
        gaCommand(str[1]);
        return;
      }
      logger.error("Illegal arguments");
      return;
    }
    logger.error("Unknown command");
  });
});

async function mmapCommand() {
  const data = await getSavedTracks();
  logger.info(`Successfully loaded ${data.length} songs`);
  const artistData = await getArtistsForTracks(data);
  logger.info("Loaded artist info, calculating missing genre mappings");
  const genres = config
    .get("spotify.playlists")
    .map((p) => p.genres)
    .flat();
  const martists = artistData.filter(
    (a) => a.genres.filter((g) => genres.includes(g)).length === 0
  );
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

async function gaCommand(artist) {
  try {
    const data = await spotifyApi.getArtist(artist);
    logger.info(
      `${data.body.name} +++ ${
        data.body.genres.length === 0 ? "NOT RATED" : data.body.genres
      }`
    );
  } catch (_) {
    logger.error("This artist does not exist");
  }
}

async function mainLoop() {
  const data = await getSavedTracks();
  logger.info(`Successfully loaded ${data.length} songs`);
  await decorateArtistGenres(data);
  logger.info(
    `Populating ${config.get("spotify.playlists").length} playlist(s)`
  );
  for (let playlist of config.get("spotify.playlists")) {
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
    const tracks = data.filter(
      (t) => t.genres.filter((v) => playlist.genres.includes(v)).length !== 0
    );
    const chunkSize = 100;
    const splitTracks = splitChunk(tracks, chunkSize);
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

async function getArtistsForTracks(tracks) {
  const artists = tracks
    .map((a) => a.track.artists[0].id)
    .filter((value, index, self) => self.indexOf(value) === index);
  const chunkSize = 50;
  let chunks = splitChunk(artists, chunkSize);
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
}

async function decorateArtistGenres(tracks) {
  logger.info("Loading artist genre information...");
  const artistData = await getArtistsForTracks(tracks);
  for (let i = 0; i < tracks.length; i++) {
    const artistId = tracks[i].track.artists[0].id;
    const data = artistData.filter((a) => a.id === artistId);
    tracks[i].genres = data[0].genres;
  }
  logger.info("Successfully loaded artist / genre data");
}

async function getSavedTracks(offset = 0) {
  var data = await spotifyApi.getMySavedTracks({
    offset: offset,
  });
  process.stdout.write("Loading tracks with offset: " + offset + "\r");
  var tracks = data.body.items;
  if (data.body.next) {
    return (await getSavedTracks(offset + 20)).concat(tracks);
  }
  return tracks;
}

function splitChunk(arr, chunk) {
  let arrOfArr = [];
  while (arr.length > 0) {
    let tempArray;
    tempArray = arr.splice(0, chunk);
    arrOfArr.push(tempArray);
  }
  return arrOfArr;
}
