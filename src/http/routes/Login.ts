import { Request, Response } from 'express'
import Spotify from '../../Spotify'
import Route from '../Route'

export default class Login extends Route {
  constructor(
    private readonly spotify: Spotify,
    private readonly stateKey: string,
  ) {
    super()
    this.router.get('/login', (req, res) => this.handle(req, res))
  }

  protected handle(req: Request, res: Response): void {
    const state = Math.random().toString(20).substring(2, 10)
    res.cookie(this.stateKey, state)
    res.redirect(this.spotify.createAuthURL(state))
  }
}
