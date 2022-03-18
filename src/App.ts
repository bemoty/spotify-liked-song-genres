import config from 'config'
import log4js from 'log4js'
import cron from 'node-cron'
import readline from 'readline'
import CommandRegistry from './command/CommandRegistry'
import { SpotifyConfig } from './config'
import Server from './http/Server'
import Spotify from './Spotify'
import { TokenCacheManager } from './TokenCacheManager'

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
  const spotifyConfig: SpotifyConfig = config.get('spotify')
  const tokenCacheManager = new TokenCacheManager(
    spotifyConfig.token_cache_path,
  )
  const needsAuthentication = await tokenCacheManager.init()
  const spotify = new Spotify(spotifyConfig, tokenCacheManager)
  const commandRegistry = new CommandRegistry(
    spotify,
    readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    }),
  )
  if (!needsAuthentication) {
    new Server(spotify, config.get('server'))
  }
  cron.schedule('0 0 * * *', () => {
    commandRegistry.getCommand('reload')?.execute([])
  })
}

main(process.argv.slice(2))
