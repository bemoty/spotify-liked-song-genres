import { TokenCacheManager } from '@/TokenCacheManager'
import Util from '@/Util'
import { SpotifyConfig } from '@config/index'
import DecoratedSavedTrackObject from '@typings/DecoratedSavedTrackObject'
import log4js from 'log4js'
import SpotifyWebApi from 'spotify-web-api-node'

/**
 * This is a wrapper class for the Spotify API
 */
export default class Spotify {
  public webApi: SpotifyWebApi
  private logger: log4js.Logger
  private authorized = false

  constructor(
    public readonly config: SpotifyConfig,
    private tokenCacheManager: TokenCacheManager,
  ) {
    this.logger = log4js.getLogger('Spotify')
    if (
      tokenCacheManager.tokens?.accessToken &&
      tokenCacheManager.tokens?.refreshToken
    ) {
      this.webApi = new SpotifyWebApi({
        accessToken: tokenCacheManager.tokens.accessToken,
        refreshToken: tokenCacheManager.tokens.refreshToken,
      })
      this.logger.info('Initialized Spotify API with cached access token')
      setInterval(async () => await this.refreshTokenTask(), 60 * 60 * 1000)
    } else {
      this.webApi = new SpotifyWebApi({
        clientId: config.client_id,
        clientSecret: config.client_secret,
        redirectUri: config.redirect_uri,
      })
      this.logger.info(
        'Initialized Spotify API with client ID and client secret',
      )
    }
  }

  /**
   * Retrieves the artists of an array of Spotify tracks
   *
   * @param tracks an array of Spotify tracks of which the artists are to be
   * retrieved
   * @returns an array of artists generated from the provided tracks
   */
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
      try {
        const ad = await this.webApi.getArtists(chunk)
        artistData.push(...ad.body.artists)
      } catch (error) {
        this.logger.warn(
          `Web API error occurred while loading artist data in chunk ${
            artistData.length
          }-${artistData.length + chunkSize}`,
        )
        this.logger.warn(error)
      }
    }
    return artistData
  }

  /**
   * Retrieves the audio features of an array of Spotify tracks
   *
   * @param tracks an array of Spotify tracks of which the audio features are to be
   * retrieved
   * @returns an array of audio features generated from the provided tracks
   */
  async getAudioFeaturesForTracks(
    tracks: SpotifyApi.SavedTrackObject[],
  ): Promise<SpotifyApi.AudioFeaturesObject[]> {
    const chunkSize = 50
    const chunks = Util.splitChunk(tracks, chunkSize)
    let audioFeatureData = [] as SpotifyApi.AudioFeaturesObject[]
    for (let chunk of chunks) {
      this.logger.info(
        `Loading audio feature chunk ${audioFeatureData.length}-${
          audioFeatureData.length + chunkSize
        }...`,
      )
      try {
        const audioFeatures = await this.webApi.getAudioFeaturesForTracks(
          chunk.map((track) => track.track.id),
        )
        audioFeatureData.push(...audioFeatures.body.audio_features)
      } catch (error) {
        this.logger.warn(
          `Web API error occurred while loading audio features data in chunk ${
            audioFeatureData.length
          }-${audioFeatureData.length + chunkSize}`,
        )
        this.logger.warn(error)
      }
    }
    return audioFeatureData
  }

  /**
   * Adds the artist genre and the audio features to an array of tracks
   *
   * @param tracks an array of Spotify tracks
   * @returns an array of Spotify tracks with a genre
   */
  async decorateTracks(
    tracks: SpotifyApi.SavedTrackObject[],
  ): Promise<DecoratedSavedTrackObject[]> {
    this.logger.info('Loading artist genre information...')
    const decoratedTracks = [...tracks] as DecoratedSavedTrackObject[]
    const artistsOfTracks = await this.getArtistsForTracks(tracks)
    const audioFeatures = await this.getAudioFeaturesForTracks(tracks)
    console.log(audioFeatures)
    console.log(decoratedTracks.length)
    for (let i = 0; i < decoratedTracks.length; i++) {
      const artistId = decoratedTracks[i].track.artists[0].id
      const artistData = artistsOfTracks.find((a) => a.id === artistId)
      const audioFeature = audioFeatures.find(
        (a) => a.id === decoratedTracks[i].track.id,
      )
      decoratedTracks[i].genres = artistData?.genres
      decoratedTracks[i].audioFeatures = audioFeature
      console.log(audioFeature)
    }
    this.logger.info(
      'Successfully loaded artist / genre and audio feature data',
    )
    return decoratedTracks
  }

  /**
   * Recursively retrieves all liked songs in the library of the connected Spotify
   * user
   *
   * @param offset the current request offset (0 at the first recursive call)
   * @returns an array of tracks stored in the user's liked songs
   */
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
    this.tokenCacheManager.storeTokens({
      accessToken,
      refreshToken,
      expires: new Date().getTime() + expiresIn * 1000,
    })
    this.logger.info(
      `Successfully retrieved access token, will expire in ${expiresIn}`,
    )
    setInterval(
      async () => await this.refreshTokenTask(),
      (expiresIn / 2) * 1000,
    )
  }

  private async refreshTokenTask() {
    const data = await this.webApi.refreshAccessToken()
    this.webApi.setAccessToken(data.body.access_token)
    this.tokenCacheManager.storeTokens({
      accessToken: data.body.access_token,
      refreshToken:
        data.body.refresh_token ??
        (this.tokenCacheManager.tokens?.refreshToken as string),
      expires: new Date().getTime() + data.body.expires_in * 1000,
    })
    this.logger.info('Access token has been refreshed')
  }
}
