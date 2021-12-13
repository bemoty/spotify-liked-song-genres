import express, { Request, Response, Router } from 'express'
import log4js from 'log4js'

export default abstract class Route {
  public readonly router: Router
  protected readonly logger: log4js.Logger

  constructor() {
    this.router = express.Router()
    this.logger = log4js.getLogger(`${this.constructor.name}Route`)
  }

  protected abstract handle(req: Request, res: Response): void
}
