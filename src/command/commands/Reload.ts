import Util from '@/Util'
import Command from '@command/Command'
import { SpotifyPlaylistConfig } from '@config/index'
import { DecoratedSavedTrackObject } from '@typings/index'

export default class Reload extends Command {
  async execute(args: string[]): Promise<void> {
    if (args.length != 0) {
      this.logger.error('Illegal arguments, usage: reload')
      return
    }
    let tracks: SpotifyApi.SavedTrackObject[]
    let decoratedTracks: DecoratedSavedTrackObject[]
    try {
      tracks = await this.spotify.getSavedTracks()
      this.logger.info(`Successfully loaded ${tracks.length} songs`)
      decoratedTracks = await this.spotify.decorateTracks(tracks)
    } catch (error) {
      this.logger.error(
        `Failed to execute ReloadCommand, is the SpotifyAPI down?`,
      )
      this.logger.error(error)
      return
    }
    this.logger.info(
      `Populating ${this.spotify.config.playlists.length} playlist(s)`,
    )
    for (let playlist of this.spotify.config.playlists) {
      this.logger.info(`Populating playlist '${playlist.name}'`)
      const spotifyPlaylist = await this.spotify.webApi.getPlaylist(playlist.id)

      await this.clearPlaylist(spotifyPlaylist.body)

      let filteredTracks = playlist.genres.includes('*')
        ? decoratedTracks
        : decoratedTracks.filter(
            (t) =>
              (t.genres ?? []).filter((v) => playlist.genres.includes(v))
                .length !== 0,
          )
      // add the artists on top of the filtered genres
      filteredTracks = [
        ...new Set(
          filteredTracks.concat(
            await this.handleArtists(playlist, decoratedTracks),
          ),
        ),
      ]

      if (playlist.ignoredGenres) {
        filteredTracks = filteredTracks.filter(
          (t) =>
            (t.genres ?? []).filter((v) =>
              (playlist.ignoredGenres ?? []).includes(v),
            ).length === 0,
        )
      }

      if (playlist.energyRange) {
        filteredTracks = filteredTracks.filter(
          (t) =>
            t.audioFeatures &&
            t.audioFeatures?.energy >= playlist.energyRange!.minEnergy &&
            t.audioFeatures?.energy <= playlist.energyRange!.maxEnergy,
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
            `Failed to execute ReloadCommand, is the SpotifyAPI down?`,
          )
          this.logger.error(error)
          return
        }
        part += chunkSize
      }
    }
    this.logger.info('Successfully completed main loop')
  }

  private async clearPlaylist(
    spotifyPlaylist: SpotifyApi.SinglePlaylistResponse,
  ) {
    if (spotifyPlaylist.tracks.total === 0) {
      return
    }
    try {
      await this.spotify.webApi.removeTracksFromPlaylistByPosition(
        spotifyPlaylist.id,
        Array(spotifyPlaylist.tracks.total)
          .fill(0)
          .map((_, i) => i),
        spotifyPlaylist.snapshot_id,
      )
    } catch (error) {
      this.logger.error(
        `Failed to execute ReloadCommand, is the SpotifyAPI down?`,
      )
      this.logger.error(error)
      return
    }
  }

  private async handleArtists(
    playlist: SpotifyPlaylistConfig,
    decoratedTracks: DecoratedSavedTrackObject[],
  ) {
    if (!playlist.artists) {
      return decoratedTracks
    }
    return decoratedTracks.filter((track) =>
      track.track.artists.some((artist) =>
        playlist.artists?.includes(artist.name),
      ),
    )
  }
}
