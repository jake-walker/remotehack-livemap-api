import { Hono } from 'hono';
import { addLocation, getLocations, locationCreate } from './controller';
import { zValidator } from '@hono/zod-validator';
import { cors } from 'hono/cors';
import { commandHandler, registerGlobalCommands } from './discord/main';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

app.get('/api/locations', async (c) => {
	const locations = await getLocations(c);
	return c.json({ locations }, 200);
});

app.post('/api/locations', zValidator('json', locationCreate), async (c) => {
	const data = c.req.valid('json');

	await addLocation(c, data);

	return c.json({ ok: true }, 200);
});

app.get('/locations.geojson', async (c) => {
	const locations = await getLocations(c);
	const features = locations.map((item) => ({
		type: 'Feature',
		properties: {
			name: item.name,
			locationName: item.locationName,
		},
		geometry: {
			type: 'Point',
			coordinates: [item.longitude, item.latitude],
		},
	}));

	return c.json(
		{
			type: 'FeatureCollection',
			features,
		},
		200
	);
});

app.post('/api/discord', commandHandler);

app.post('/api/discord/register', async (c) => {
	await registerGlobalCommands(c);

	return c.json({ ok: true }, 200);
});

export default app;
