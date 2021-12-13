import log4js from 'log4js'
import { Interface } from 'readline'
import Spotify from '../Spotify'
import Command from './Command'
import Check from './commands/Check'
import Genres from './commands/Genres'
import Info from './commands/Info'
import Reload from './commands/Reload'

interface CommandEntry {
  name: string
  command: Command
}

export default class CommandRegistry {
  private logger: log4js.Logger
  public readonly commandEntries: CommandEntry[] = [
    {
      name: 'reload',
      command: new Reload(this.spotify),
    },
    {
      name: 'check',
      command: new Check(this.spotify),
    },
    {
      name: 'info',
      command: new Info(this.spotify),
    },
    {
      name: 'genres',
      command: new Genres(this.spotify),
    },
  ]

  constructor(private readonly spotify: Spotify, commandInterface: Interface) {
    this.logger = log4js.getLogger('CommandRegistry')
    commandInterface.on('line', (input) => {
      input = input.trim()
      let executed = false
      for (let commandEntry of this.commandEntries) {
        if (input.startsWith(commandEntry.name)) {
          commandEntry.command.execute(input.split(' '))
          executed = true
          break
        }
      }
      if (!executed) {
        this.logger.error('Unknown command')
      }
    })
  }

  getCommand(name: string): Command | undefined {
    return this.commandEntries.find((entry) => entry.name === name)?.command
  }
}
