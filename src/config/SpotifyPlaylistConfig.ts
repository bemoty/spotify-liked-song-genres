export interface SpotifyPlaylistConfig {
  id: string
  name: string
  genres: string[]
  ignoredGenres?: string[]
  artists?: string[]
  energyRange?: EnergyRange
}

interface EnergyRange {
  minEnergy: number
  maxEnergy: number
}
