import Command from '../Command'

export default class Check extends Command {
  async execute(args: string[]): Promise<void> {
    if (args.length != 0) {
      this.logger.error('Illegal arguments, usage: check')
      return
    }
    let artistData
    try {
      const data = await this.spotify.getSavedTracks()
      this.logger.info(`Successfully loaded ${data.length} songs`)
      artistData = await this.spotify.getArtistsForTracks(data)
      this.logger.info('Loaded artist info, calculating missing genre mappings')
    } catch (error) {
      this.logger.error(
        `Failed to execute CheckCommand, is the SpotifyAPI down? ` + error,
      )
      return
    }
    const genres = this.spotify.config.playlists.map((p) => p.genres).flat()
    let martists = artistData.filter(
      (a) => a.genres.filter((g) => genres.includes(g)).length === 0,
    )
    const overrides = this.spotify.config.playlists
      .map((p) => p.aoverride)
      .flat()
    if (overrides.length !== 0) {
      martists = martists.filter((a) => !overrides.includes(a.name))
    }
    if (martists.length === 0) {
      this.logger.info('No missing artist mappings')
      return
    }
    this.logger.info('The following artists lack artist genre mappings:')
    for (let artist of martists) {
      this.logger.info(
        `${artist.name} ++++ ${
          artist.genres.length === 0 ? 'NOT RATED' : artist.genres
        }`,
      )
    }
  }
}
