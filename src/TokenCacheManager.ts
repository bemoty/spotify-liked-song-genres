import fs from 'fs'
import log4js from 'log4js'

export interface TokenCache {
  accessToken: string
  refreshToken: string
  expires: number
}

export class TokenCacheManager {
  private logger: log4js.Logger
  private _tokens?: TokenCache

  constructor(private tokenCachePath: string) {
    this.logger = log4js.getLogger('TokenCacheManager')
  }

  /**
   * The current TokenCache. This value might not be the newest value available
   *
   * @readonly
   * @see {@link readTokens()}
   * @memberof TokenCacheManager
   */
  get tokens() {
    return this._tokens
  }

  /**
   * Reads the cache for the first time and checks if tokens are cached
   * This method is not _required_ to be called before calling other methods
   * @returns true if there are tokens cached, false otherwise
   */
  public async init(): Promise<boolean> {
    try {
      this._tokens = await this.readTokens()
      return (
        this._tokens.accessToken != null && this._tokens.refreshToken != null
      )
    } catch (err) {
      this.logger.warn(`No tokens cached: ${err}`)
      this._tokens = Object.create(null)
    }
    return false
  }

  /**
   * Writes a TokenCache to the local file system
   * @param tokenCache the TokenCache to be written to the file system
   */
  public async storeTokens(tokenCache: TokenCache): Promise<void> {
    fs.writeFile(
      this.tokenCachePath,
      JSON.stringify(tokenCache),
      'utf8',
      (err) => {
        if (err) {
          throw err
        }
        this._tokens = tokenCache
        this.logger.info('Successfully cached access and refresh tokens')
      },
    )
  }

  /**
   * Reads the TokenCache from the file system
   * @returns the read TokenCache
   */
  public readTokens(): Promise<TokenCache> {
    return new Promise((resolve, reject) => {
      fs.readFile(this.tokenCachePath, 'utf8', (err, data) => {
        if (err) {
          reject(err)
          return
        }
        try {
          const jsonData = JSON.parse(data)
          this._tokens = jsonData
          if (!this._tokens?.expires || this._tokens.expires < Date.now()) {
            reject(new Error('Token expired'))
          }
          resolve(jsonData)
        } catch (parseErr) {
          reject(parseErr)
        }
      })
    })
  }
}
