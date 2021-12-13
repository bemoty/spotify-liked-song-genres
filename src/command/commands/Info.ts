import Command from '../Command'

export default class Info extends Command {
  async execute(args: string[]): Promise<void> {
    if (args.length != 2) {
      this.logger.error('Illegal arguments, usage: info <artist ID>')
      return
    }
    const artist = args[1].startsWith('https://')
      ? args[1].split('/')[4].split('?')[0]
      : args[1]
    try {
      const data = await this.spotify.webApi.getArtist(artist)
      this.logger.info(
        `${data.body.name} +++ ${
          data.body.genres.length === 0 ? 'NOT RATED' : data.body.genres
        }`,
      )
    } catch (_) {
      this.logger.error(
        'Could not retrieve artist, either the artist does not exist or the API is down',
      )
    }
  }
}
