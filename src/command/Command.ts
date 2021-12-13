import log4js from 'log4js'
import Spotify from '../Spotify'

export default abstract class Command {
  protected readonly logger: log4js.Logger

  constructor(protected spotify: Spotify) {
    this.logger = log4js.getLogger(`${this.constructor.name}Command`)
  }

  abstract execute(args: string[]): void
}
