import config from 'config'
import log4js from 'log4js'
import cron from 'node-cron'
import readline from 'readline'
import CommandRegistry from './command/CommandRegistry'
import Server from './http/Server'
import Spotify from './Spotify'

async function main(args: string[]) {
  log4js.configure({
    appenders: {
      console: { type: 'console' },
    },
    categories: {
      default: {
        appenders: ['console'],
        level: args[0] === 'debug' ? 'debug' : 'info',
      },
    },
  })
  const spotify = new Spotify(config.get('spotify'))
  const commandRegistry = new CommandRegistry(
    spotify,
    readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    }),
  )
  new Server(spotify, config.get('server'))
  cron.schedule('0 0 * * *', () => {
    commandRegistry.getCommand('reload')?.execute([])
  })
}

main(process.argv.slice(2))
