import nacl from 'tweetnacl';
import { Buffer } from 'buffer';
import { LIVEMAP_COMMAND } from './commands';
import { addLocation, getLocations } from '../controller';
import { locationCreate } from '../schema';
import type { Context } from "hono";
import { geocode } from '../geocode';
import { APIApplicationCommandInteractionDataOption, APIInteraction, APIInteractionResponse, ApplicationCommandOptionType, InteractionResponseType, InteractionType, MessageFlags } from 'discord-api-types/v10';
import { formatDuration, pluralise } from '../util';

// register commands with the discord api
export async function registerGlobalCommands(env: Env) {
	if (!env.discordApplicationId || !env.discordToken) throw new Error("Discord variables aren't set");

	const res = await fetch(`https://discord.com/api/v10/applications/${env.discordApplicationId}/commands`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${env.discordToken}`,
		},
		method: 'PUT',
		body: JSON.stringify([LIVEMAP_COMMAND]),
	});

	if (res.ok) {
		console.log('Registered all Discord commands');
	} else {
		throw new Error(`Failed to register Discord commands: ${await res.text()}`);
	}
}

function buildMessage(content: string, isPrivate: boolean): APIInteractionResponse {
	return {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			content,
			flags: isPrivate ? MessageFlags.Ephemeral : MessageFlags.SuppressNotifications,
		}
	} satisfies APIInteractionResponse;
}

// handle the location command
async function addLocationCommand(env: Env, user: string | null, location: string | undefined, useFirst: boolean = false): Promise<string> {
	if (!location) {
		return 'Please specify a location!';
	}

	let geocodeResult: Awaited<ReturnType<typeof geocode>> | undefined;

	try {
		geocodeResult = await geocode(location);
	} catch (err) {
		console.warn("Failed to lookup location", err);
		return "Sorry, there's a problem with looking up locations at the moment.";
	}

	if (geocodeResult.length === 0) {
		return 'I could not find that location, try something else.';
	} else if (geocodeResult.length > 1 && !useFirst) {
		return `I found a few results, try again with a more specific location:\n- ${geocodeResult.map((x) => x.name).join('\n- ')}\n_You can also use the \`use-first\` argument to select the first from this list if you're having trouble._`;
	} else {
		const loc = await addLocation(
			env,
			locationCreate.parse({
				name: user !== null ? user : undefined,
				latitude: parseFloat(geocodeResult[0].latitude),
				longitude: parseFloat(geocodeResult[0].longitude),
			})
		);
		return `Your location has been added to the map! _It expires in ${formatDuration(loc.ttl)}._`;
	}
}

// handle the location command
async function listLocationsCommand(env: Env): Promise<string> {
	const locations = await getLocations(env);

	if (locations.length === 0) {
		return "There are currently no people hacking.";
	}

	return (
		`There are currently ${pluralise(locations.length, "person", "people")} hacking:\n` +
		locations.map((loc) => `- **${loc.name ?? "Anonymous"}** from ${loc.locationName ?? `(${loc.latitude}, ${loc.longitude})`}`).join("\n")
	);
}

export async function commandHandler(c: Context<{ Bindings: Env }>) {
	// verify request
	const signature = c.req.header('x-signature-ed25519');
	const timestamp = c.req.header('x-signature-timestamp');

	if (!signature || !timestamp || !c.env.discordPublicKey) {
		return c.text('Invalid request', 400);
	}

	if (!c.env.discordPublicKey) {
		console.log('Discord public key must be set for command handler');
		return c.text('Internal server error', 500);
	}

	const isValid = nacl.sign.detached.verify(
		new Buffer(timestamp + (await c.req.text())),
		new Buffer(signature, 'hex'),
		new Buffer(c.env.discordPublicKey, 'hex')
	);

	if (!isValid) {
		return c.text('Bad request signature', 401);
	}

	// handle commands
	const message = (await c.req.json()) as APIInteraction;

	// handle ping message
	if (message.type === InteractionType.Ping) {
		return c.json(message, 200, {
			'Content-Type': 'application/json',
		});
	}

	// handle command messages
	if (message.type === InteractionType.ApplicationCommand) {
		// get the sender's username
		const user = message.member?.user.global_name ?? null;

		switch (message.data.name.toLowerCase()) {
			case LIVEMAP_COMMAND.name.toLowerCase():
				const subcommand = ((message.data as any).options as APIApplicationCommandInteractionDataOption[])
					.find((opt) => opt.type === ApplicationCommandOptionType.Subcommand);

				switch (subcommand?.name) {
					case "add":
						console.log('Handling add location command');

						// get command parameters
						const location = subcommand.options?.find((opt) => opt.name === 'location' && opt.type === ApplicationCommandOptionType.String)?.value as string;
						const anonymous = subcommand.options?.find((opt) => opt.name === 'anonymous' && opt.type === ApplicationCommandOptionType.Boolean)?.value as boolean || false;
						const useFirst = subcommand.options?.find((opt) => opt.name === 'use-first' && opt.type === ApplicationCommandOptionType.Boolean)?.value as boolean || false;

						const addResponse = await addLocationCommand(c.env, !anonymous ? user : null, location, useFirst);

						return c.json(buildMessage(addResponse, true), 200, { "Content-Type": "application/json" });
					case "list":
						console.log("Handling list locations command");

						const listResponse = await listLocationsCommand(c.env);
						return c.json(buildMessage(listResponse, false), 200, { "Content-Type": "application/json" });
					case "about":
						console.log("Handling about command");

						const apiUrl = new URL("/docs", `https://${c.req.header("Host") ?? "api.remotehack.space"}`)
						const aboutText = `The live map shows everyone who's online during a hack day. Add your location using the \`/livemap add\` command in Discord, or there's also an API available at ${apiUrl.toString()}.`;
						return c.json(buildMessage(aboutText, true), 200, { "Content-Type": "application/json" });
					default:
						console.error(`Unexpected location subcommand: ${subcommand}`);
						return c.json({ error: 'Unknown command' }, 400, { 'Content-Type': 'application/json' });
				}
			default:
				console.error(`Unknown command: ${message.data.name}`);
				return c.json({ error: 'Unknown command' }, 400, { 'Content-Type': 'application/json' });
		}
	}

	console.error(`Unknown message: ${await c.req.text()}`);
	return c.json({ error: 'Unknown type' }, 400, {
		'Content-Type': 'application/json',
	});
}
