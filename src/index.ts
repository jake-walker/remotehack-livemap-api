import { Hono } from 'hono';
import { addLocation, getLocations } from './controller';
import { cors } from 'hono/cors';
import { commandHandler, registerGlobalCommands } from './discord/main';
import { describeRoute, openAPISpecs } from 'hono-openapi';
import { resolver, validator as zValidator } from 'hono-openapi/zod';
import { apiReference } from '@scalar/hono-api-reference';
import { locationCreate, locationsGeojsonResponse, locationsResponse } from './schema';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

// openapi documentation
app.get(
	'/openapi',
	openAPISpecs(app, {
		excludeStaticFile: false,
		documentation: {
			info: {
				title: 'Remote Hack Live Map API',
				version: '0.0.1',
				description: 'Live Map API',
			},
			servers: [
				{
					url: 'https://remotehack-livemap-api.jakew.workers.dev',
					description: 'Live API',
				},
				{
					url: 'http://localhost:8787',
					description: 'Local API',
				},
			],
		},
	})
);

// ui for openapi documentation
app.get(
	'/docs',
	apiReference({
		theme: 'saturn',
		spec: { url: '/openapi' },
	})
);

app.get(
	'/api/locations',
	describeRoute({
		description: 'Get all locations',
		responses: {
			200: {
				description: 'Successful response',
				content: {
					'application/json': { schema: resolver(locationsResponse) },
				},
			},
		},
	}),
	async (c) => {
		const locations = await getLocations(c.env);
		return c.json(locations, 200);
	}
);

app.post(
	'/api/locations',
	describeRoute({
		description: 'Add a location',
		responses: {
			200: {
				description: 'Successful response',
				content: {
					'application/json': { schema: resolver(locationsResponse.element) },
				},
			},
		},
	}),
	zValidator('json', locationCreate),
	async (c) => {
		const data = c.req.valid('json');
		const output = await addLocation(c.env, data);
		return c.json(output, 200);
	}
);

app.get(
	'/locations.geojson',
	describeRoute({
		hide: false,
		description: 'Get locations as GeoJSON',
		responses: {
			200: {
				description: 'Successful response',
				content: {
					'application/json': { schema: resolver(locationsGeojsonResponse) },
				},
			},
		},
	}),
	async (c) => {
		const locations = await getLocations(c.env);
		const features = locations.map((item) => ({
			type: 'Feature',
			properties: {
				id: item.id,
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
	}
);

// discord event listener
app.post('/api/discord', commandHandler);

// discord registration command
app.post('/api/discord/register', async (c) => {
	await registerGlobalCommands(c.env);
	return c.json({ ok: true }, 200);
});

export default app satisfies ExportedHandler<Env>;
