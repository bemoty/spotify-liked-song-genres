import { Request, Response } from 'express'
import Spotify from '../../Spotify'
import Route from '../Route'

export default class Callback extends Route {
  constructor(
    private readonly spotify: Spotify,
    private readonly stateKey: string,
    private readonly callback: () => void
  ) {
    super()
    this.router.get('/callback', (req, res) => this.handle(req, res))
  }

  protected handle(req: Request, res: Response): void {
    const error = req.query.error
    const code = req.query.code
    const state = req.query.state

    if (error) {
      this.logger.error('Callback error:', error)
      res.send({
        success: false,
        message: `Could not handle callback: ${error}`,
      })
      return
    }

    if (state === null || state !== (req.cookies[this.stateKey] ?? null)) {
      res.send({
        success: false,
        message: 'A state mismatch has occurred',
      })
      return
    }

    if (!code) {
      res.send({
        success: false,
        message: 'Did not receive code from Auth Code Flow',
      })
      return
    }

    this.spotify
      .authCodeGrant(code as string)
      .then((data) => {
        this.spotify.authorize(
          data.body['access_token'],
          data.body['refresh_token'],
          data.body['expires_in'],
        )
        res.send({
          success: true,
          message:
            'Successfully connected to Spotify. You can close this window',
        })
        this.callback(); // Shut down express as it is no longer needed
      })
      .catch((error) => {
        const message = error.message;
        this.logger.error('Auth Code Flow Grant failed:', message)
        res.send({
          success: false,
          message: `Could not perform authorization: ${message}`,
        })
      })
  }
}
