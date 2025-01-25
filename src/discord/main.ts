import nacl from 'tweetnacl';
import { Buffer } from 'buffer';
import { Context } from '../types';
import { ADD_LOCATION_COMMAND } from './commands';
import { addLocation, geocode } from '../controller';

export async function registerGlobalCommands(c: Context) {
	if (!c.env.discordApplicationId || !c.env.discordToken) throw new Error("Discord variables aren't set");

	const res = await fetch(`https://discord.com/api/v10/applications/${c.env.discordApplicationId}/commands`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${c.env.discordToken}`,
		},
		method: 'PUT',
		body: JSON.stringify([ADD_LOCATION_COMMAND]),
	});

	if (res.ok) {
		console.log('Registered all Discord commands');
	} else {
		throw new Error(`Failed to register Discord commands: ${await res.text()}`);
	}
}

async function addLocationCommand(c: Context, user: string, location: string | undefined, anonymous: boolean): Promise<string> {
	if (!location) {
		return 'Please specify a location!';
	}

	const geocodeResult = await geocode(location);

	if (geocodeResult.length === 0) {
		return 'I could not find that location, try something else.';
	} else if (geocodeResult.length > 1) {
		return `I found a few results, try again with a more specific location:\n- ${geocodeResult.map((x) => x.name).join('\n- ')}`;
	} else {
		await addLocation(c, {
			name: anonymous ? undefined : user,
			latitude: geocodeResult[0].latitude,
			longitude: geocodeResult[0].longitude,
		});
		return 'Your location has been added to the map!';
	}
}

export async function commandHandler(c: Context) {
	// verify request
	const signature = c.req.header('x-signature-ed25519');
	const timestamp = c.req.header('x-signature-timestamp');

	console.log(await c.req.text());

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
	const message = await c.req.json();

	if (message.type === 1) {
		console.log('handling ping');
		return c.json(message, 200, {
			'Content-Type': 'application/json',
		});
	}

	if (message.type === 2) {
		const user = message.member.user.global_name;

		switch (message.data.name.toLowerCase()) {
			case ADD_LOCATION_COMMAND.name.toLowerCase():
				console.log('Handling add location command');

				const location = message.data.options.find((opt: any) => opt.name === 'location')?.value;
				const anonymous = message.data.options.find((opt: any) => opt.name === 'anonymous')?.value || false;
				const content = await addLocationCommand(c, user, location, anonymous);

				return c.json(
					{
						type: 4, // respond to the message
						data: {
							content,
							flags: 1 << 6, // ephemeral message
						},
					},
					200,
					{
						'Content-Type': 'application/json',
					}
				);
			default:
				console.error(`Unknown command: ${message.data.name}`);
				return c.json(
					{
						error: 'Unknown type',
					},
					400,
					{
						'Content-Type': 'application/json',
					}
				);
		}
	}

	console.error(`Unknown message: ${await c.req.text()}`);
	return c.json({ error: 'Unknown type' }, 400, {
		'Content-Type': 'application/json',
	});
}
