import log4js from 'log4js'
import SpotifyWebApi from 'spotify-web-api-node'
import DecoratedSavedTrackObject from './types/DecoratedSavedTrackObject'
import Util from './Util'

interface SpotifyConfig {
  client_id: string
  client_secret: string
  redirect_uri: string
  scopes: string[]
  playlists: SpotifyPlaylistConfig[]
}

interface SpotifyPlaylistConfig {
  id: string
  name: string
  genres: string[]
  ngenres: string[]
  aoverride: string[]
}

export default class Spotify {
  public webApi: SpotifyWebApi
  private logger: log4js.Logger
  private authorized = false

  constructor(public readonly config: SpotifyConfig) {
    this.webApi = new SpotifyWebApi({
      clientId: config.client_id,
      clientSecret: config.client_secret,
      redirectUri: config.redirect_uri,
    })
    this.logger = log4js.getLogger('Spotify')
  }

  async getArtistsForTracks(
    tracks: SpotifyApi.SavedTrackObject[],
  ): Promise<SpotifyApi.ArtistObjectFull[]> {
    const artists = tracks
      .map((a) => a.track.artists[0].id)
      .filter((value, index, self) => self.indexOf(value) === index)
    const chunkSize = 50
    const chunks = Util.splitChunk(artists, chunkSize)
    let artistData = []
    for (let chunk of chunks) {
      this.logger.info(
        `Loading artist chunk ${artistData.length}-${
          artistData.length + chunkSize
        }...`,
      )
      const ad = await this.webApi.getArtists(chunk)
      artistData.push(...ad.body.artists)
    }
    return artistData
  }

  async decorateArtistGenres(
    tracks: SpotifyApi.SavedTrackObject[],
  ): Promise<DecoratedSavedTrackObject[]> {
    this.logger.info('Loading artist genre information...')
    const decoratedTracks = [...tracks] as DecoratedSavedTrackObject[]
    const artistData = await this.getArtistsForTracks(tracks)
    for (let i = 0; i < tracks.length; i++) {
      const artistId = tracks[i].track.artists[0].id
      const data = artistData.filter((a) => a.id === artistId)
      decoratedTracks[i].genres = data[0].genres
    }
    this.logger.info('Successfully loaded artist / genre data')
    return decoratedTracks
  }

  async getSavedTracks(offset = 0): Promise<SpotifyApi.SavedTrackObject[]> {
    const data = await this.webApi.getMySavedTracks({
      offset: offset,
    })
    process.stdout.write('Loading tracks with offset: ' + offset + '\r')
    const tracks = data.body.items
    if (data.body.next) {
      return (await this.getSavedTracks(offset + 20)).concat(tracks)
    }
    return tracks
  }

  /**
   * Returns a Spotify auth URL with configured scopes and the provided state
   * to prevent CSRF attacks
   *
   * @param state the randomized state string to use
   * @returns the created auth URL
   */
  createAuthURL(state: string): string {
    return this.webApi.createAuthorizeURL(this.config.scopes, state)
  }

  /**
   * Requests an access token via Auth Code Flow. Requires that client ID,
   * client secret, and redirect URI has been set previous to the call.
   *
   * @param code The authorization code returned in the callback in the Auth
   * Code Flow
   * @returns A promise that if successful, resolves into an object containing
   * the access token, refresh token, token type and time to expiration. If
   * rejected, it contains an error object.
   */
  async authCodeGrant(code: string) {
    return this.webApi.authorizationCodeGrant(code)
  }

  /**
   * Stores access and refresh token after a successful Auth Code Flow, this
   * function can only be called once
   *
   * @param accessToken the access token received by the auth flow
   * @param refreshToken the refresh token received by the auth flow
   * @param expiresIn the relative expiration time of the access token
   */
  authorize(accessToken: string, refreshToken: string, expiresIn: number) {
    if (this.authorized) {
      throw new Error('Cannot register access token twice')
    }
    this.authorized = true
    this.webApi.setAccessToken(accessToken)
    this.webApi.setRefreshToken(refreshToken)
    this.logger.info(
      `Successfully retrieved access token, will expire in ${expiresIn}`,
    )
    setInterval(async () => {
      const data = await this.webApi.refreshAccessToken()
      this.webApi.setAccessToken(data.body['access_token'])
      this.logger.info('Access token has been refreshed')
    }, (expiresIn / 2) * 1000)
  }
}
