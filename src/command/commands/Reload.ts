import DecoratedSavedTrackObject from '../../types/DecoratedSavedTrackObject'
import Util from '../../Util'
import Command from '../Command'

export default class Reload extends Command {
  async execute(args: string[]): Promise<void> {
    if (args.length != 1) {
      this.logger.error('Illegal arguments, usage: reload')
      return
    }
    let tracks: SpotifyApi.SavedTrackObject[]
    let decoratedTracks: DecoratedSavedTrackObject[]
    try {
      tracks = await this.spotify.getSavedTracks()
      this.logger.info(`Successfully loaded ${tracks.length} songs`)
      decoratedTracks = await this.spotify.decorateArtistGenres(tracks)
    } catch (error) {
      this.logger.error(
        `Failed to execute ReloadCommand, is the SpotifyAPI down? ` + error,
      )
      return
    }
    this.logger.info(
      `Populating ${this.spotify.config.playlists.length} playlist(s)`,
    )
    for (let playlist of this.spotify.config.playlists) {
      this.logger.info(`Populating playlist '${playlist.name}'`)
      const p = await this.spotify.webApi.getPlaylist(playlist.id)
      if (p.body.tracks.total > 0) {
        try {
          await this.spotify.webApi.removeTracksFromPlaylistByPosition(
            playlist.id,
            Array(p.body.tracks.total)
              .fill(0)
              .map((_, i) => i),
            p.body.snapshot_id,
          )
        } catch (error) {
          this.logger.error(
            `Failed to execute ReloadCommand, is the SpotifyAPI down? ` + error,
          )
          return
        }
      }
      if (playlist.aoverride) {
        for (let track of decoratedTracks) {
          if (playlist.aoverride.includes(track.track.artists[0].name)) {
            track.genres.push(playlist.genres[0])
          }
        }
      }
      let filteredTracks = decoratedTracks.filter(
        (t) => t.genres.filter((v) => playlist.genres.includes(v)).length !== 0,
      )
      if (playlist.ngenres) {
        filteredTracks = filteredTracks.filter(
          (t) =>
            t.genres.filter((v) => playlist.ngenres.includes(v)).length === 0,
        )
      }
      filteredTracks.sort((a, b) => {
        if (a.track.artists[0].name === b.track.artists[0].name) {
          return a.track.album.name.localeCompare(b.track.album.name)
        }
        return a.track.artists[0].name.localeCompare(b.track.artists[0].name)
      })
      const chunkSize = 100
      const splitTracks = Util.splitChunk(filteredTracks, chunkSize)
      let part = 0
      for (let split of splitTracks) {
        this.logger.info(`Populating chunk ${part}-${part + chunkSize}...`)
        try {
          await this.spotify.webApi.addTracksToPlaylist(
            playlist.id,
            split.map((t) => t.track.uri),
          )
        } catch (error) {
          this.logger.error(
            `Failed to execute ReloadCommand, is the SpotifyAPI down? ` + error,
          )
          return
        }
        part += chunkSize
      }
    }
    this.logger.info('Successfully completed main loop')
  }
}
