import { SpotifyPlaylistConfig } from './SpotifyPlaylistConfig'

export interface SpotifyConfig {
  client_id: string
  client_secret: string
  redirect_uri: string
  token_cache_path: string
  scopes: string[]
  playlists: SpotifyPlaylistConfig[]
}
