import fs from 'fs'
import Command from '../Command'

export default class Genres extends Command {
  async execute(args: string[]): Promise<void> {
    if (args.length != 1) {
      this.logger.error('Illegal arguments, usage: genres')
      return
    }
    let artists
    try {
      const data = await this.spotify.getSavedTracks()
      this.logger.info(`Successfully loaded ${data.length} songs`)
      artists = await this.spotify.getArtistsForTracks(data)
    } catch (error) {
      this.logger.error(
        `Failed to execute GenresCommand, is the SpotifyAPI down? ` + error,
      )
      return
    }
    artists.sort((a, b) => a.name.localeCompare(b.name))
    let buffer: string[] = []
    artists.forEach((artist) => {
      buffer.push(`"${artist.name.replace('"', '\\"')}","${artist.genres}"`)
    })
    fs.writeFile('./output.csv', buffer.join('\n'), 'utf-8', (err) => {
      if (err) {
        this.logger.error('Error while writing output to disk')
        return
      }
      this.logger.info('Successfully exported artist genres')
    })
  }
}
