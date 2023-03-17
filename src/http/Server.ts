import Spotify from '@/Spotify'
import { ServerConfig } from '@config/index'
import Route from '@http/Route'
import Callback from '@http/routes/Callback'
import Login from '@http/routes/Login'
import cookieParser from 'cookie-parser'
import express, { Express } from 'express'
import http from 'http'
import log4js from 'log4js'

interface RouteEntry {
  basePath: string
  handler: Route
}

export default class Server {
  private readonly stateKey = 'spotify_state_auth'
  private readonly app: Express
  private readonly server: http.Server
  private readonly logger: log4js.Logger
  private readonly routes: RouteEntry[] = []

  constructor(private spotify: Spotify, config: ServerConfig) {
    this.app = express()
    this.routes = [
      {
        basePath: '/',
        handler: new Login(this.spotify, this.stateKey),
      },
      {
        basePath: '/',
        handler: new Callback(this.spotify, this.stateKey, () =>
          this.destroyServer(),
        ),
      },
    ]
    this.logger = log4js.getLogger('Server')
    this.app.use(cookieParser())
    this.initializeRoutes()
    this.server = this.app.listen(config.port, () => {
      this.logger.info(
        `Initialized Spotify Web API, please authorize at ${config.host}:${config.port}/login`,
      )
    })
  }

  /**
   * Gracefully shuts down the HTTP server when it is not needed anymore,
   * this action cannot be undone.
   */
  private destroyServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  private initializeRoutes(): void {
    for (let route of this.routes) {
      this.app.use(route.basePath, route.handler.router)
    }
  }
}
