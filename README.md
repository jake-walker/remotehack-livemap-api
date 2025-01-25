# Remote Hack Live Map

This is a simple API where people can share where they are working from during Remote Hacks. It also has Discord functionality for people to share their location from the Remote Hack Discord server.

This project uses Cloudflare Workers and Cloudflare KV for data persistence.

## Development

```bash
# install dependencies
pnpm install

# start a local development server
pnpm run dev
```

See the docs at `http://localhost:8787/docs`!

## Deploy

If running on a different account, create a new KV workspace with `wrangler kv namespace create <name>` and update the `wrangler.json` file accordingly with the new ID.

Simply run `wrangler deploy` to deploy to Cloudflare Workers.

### Discord

To set up the Discord integration, [create a Discord application](https://discord.com/developers/applications), then set the secrets for the worker:

```bash
wrangler secret put discordToken
wrangler secret put discordPublicKey
wrangler secret put discordApplicationId
```

_**Note:** `discordToken` is the bot token found under the "Bot" tab, not the client secret._

On your Discord application, set the "Interactions Endpoint URL" to `https://worker.user.workers.dev/api/discord` (replacing with the worker's URL). Then make a post request to `https://worker.user.workers.dev/api/discord/register` to register the commands.

Invite to servers by going to the "Installation" tab on the Discord application, then ensure the following are set before using the provided "Install Link":

- Scopes: `applications.commands`, `bot`
- Permissions: Send Messages, Send Messages in Threads, Use Slash Commands
