import { describe, it, expect, beforeEach } from 'vitest';
import { addLocation, getLocations } from '../src/controller';
import { env } from 'cloudflare:test';

describe("controller", () => {
	beforeEach(async () => {
		await addLocation(env, {
			name: "Han Solo",
			latitude: 51.5114,
			longitude: -0.1723
		});
	});

	it("adds a valid location", async () => {
		const storedLocations = await env.remotehack_livemap.list();
		expect(storedLocations.keys.length).toEqual(1);
		expect(storedLocations.keys[0].expiration).toBeDefined();

		const storedLocation = (await env.remotehack_livemap.getWithMetadata([storedLocations.keys[0].name], "json"))
			.get(storedLocations.keys[0].name);
		expect(storedLocation).toBeDefined();
		expect(storedLocation!.value).toEqual(expect.objectContaining({
			name: "Han Solo",
			latitude: 51.51,
			longitude: -0.17,
			createdAt: expect.any(String),
			locationName: "Greater London, England, United Kingdom"
		}));
	});

	it("can get all locations", async () => {
		const locations = await getLocations(env);

		expect(locations.length).toEqual(1);

		expect(locations[0]).toEqual(expect.objectContaining({
			name: "Han Solo",
			latitude: 51.51,
			longitude: -0.17,
			createdAt: expect.any(String),
			locationName: "Greater London, England, United Kingdom"
		}));
	});
});
