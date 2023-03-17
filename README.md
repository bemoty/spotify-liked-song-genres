# spotify-liked-song-genres

> When I'm with my best friend, I wanna listen to EDM. When I'm alone, I wanna listen to rap. When I'm with my family, I wanna listen to pop.

This application retrieves the "Liked Songs" of a linked Spotify account once every day and then sorts them into predefined playlists with assigned genres.

[![Demo](https://github.com/bemoty/spotify-liked-song-genres/blob/main/.github/action.gif)](https://github.com/bemoty/spotify-liked-song-genres/blob/main/.github/action.mp4)

## Installation

Clone the repository, install the repository and copy the default configuration.

```shell
git clone https://github.com/bemoty/spotify-liked-song-genres && cd spotify-liked-song-genres && npm install && cp .config/default.json .config/production.json
```

Then, insert the credentials for your Spotify application created in the [Spotify dev dashboard](https://developer.spotify.com/dashboard/applications).

```json
    "client_id": "...",
    "client_secret": "...",
    "redirect_uri": "...",
```

And finally, create genre-specific playlists in your Spotify client, copy the playlist ID from the playlist URL and configure the `"playlists"` section of the config however you want. Quick documentation:

| Field             | Description                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"id"`            | the ID of the playlist which can be found in the playlist URL (get it with Right click -> Share -> Copy link to playlist)                                                                             |
| `"name"`          | the name of the playlist; doesn't have to be the same as in the client. This field is pretty much only used in the console log right now                                                              |
| `"genres"`        | an array containing all genres which should be put into the playlist                                                                                                                                  |
| `"ignoredGenres"` | an array containing all genres which should NOT under ANY CIRCUMSTANCES be put in the playlist (helpful if you want a rap playlist but don't want rap of a specific language to be in there)          |
| `"artists"`       | an array containing artist names which should be put in the playlist. Some artist on Spotify do not have a genre rating yet so you can manually assign artists without a genre rating with this field |

Run the application with `yarn start` (preferrably in a terminal emulator such as [screen](https://linux.die.net/man/1/screen) or [tmux](https://www.man7.org/linux/man-pages/man1/tmux.1.html))

## Docker

Todo ...

## Commands

I also added some utility commands.

| Command           | Description                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `reload`          | runs the main job of the application (refetching liked songs, populating playlists)                                                    |
| `check`           | retrieves all liked songs and checks if there are any artists which can't be put in any playlists because their genres have no mapping |
| `info [artistId]` | retrieves the genres of an artist (takes 1 argument: the artist ID)                                                                    |
| `genres`          | retrieves the genres of all artists and exports them into a CSV file                                                                   |

## By the way...

This was a quick afternoon project I made basically just for use by me. With that being said, I do not take any responsibility for anything this application does, such as your Spotify playlists getting messed up. Please only use this application if you know what you're doing.

## License

This project is licensed under the [GNU General Public License v3.0](https://choosealicense.com/licenses/gpl-3.0/).
