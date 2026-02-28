import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { addLocation } from '../src/controller';
import { LocationCreate, locationsGeojsonResponse, locationsResponse } from '../src/schema';
import { z } from "zod";

vi.mock("../src/geocode", () => ({
	geocode: vi.fn(),
	reverseGeocode: vi.fn()
}));

import { geocode, reverseGeocode } from '../src/geocode';

describe('api worker', () => {
	beforeEach(async () => {
		// seed data
		await addLocation(env, {
			name: "Sherlock Holmes",
			latitude: 51.5237,
			longitude: -0.1585
		});
		await addLocation(env, {
			name: "Inspector Morse",
			latitude: 51.7520,
			longitude: -1.2577
		});
		await addLocation(env, {
			name: "Harry Potter",
			latitude: 51.5322,
			longitude: -0.1238
		});
		await addLocation(env, {
			name: "Paddington Bear",
			latitude: 51.5154,
			longitude: -0.1755
		});
	});

	it('can list locations', async () => {
		const response = await SELF.fetch('https://example.com/api/locations');

		expect(response.status).toBe(200);

		const data = await response.json();
		const parsed = locationsResponse.safeParse(data);

		expect(parsed.error).toBeUndefined();
		expect(parsed.data!.length).toBe(4);
	});

	it('can add a location', async () => {
		vi.mocked(reverseGeocode).mockResolvedValue("Greater London, England, United Kingdom");

		const response = await SELF.fetch('https://example.com/api/locations', {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				name: "Paddington Bear",
				latitude: 51.5154,
				longitude: -0.1755
			} satisfies LocationCreate)
		});

		expect(response.status).toBe(200);

		const data = await response.json();
		const parsed = locationsResponse.element.safeParse(data);

		expect(parsed.error).toBeUndefined();

		const dbData = await env.remotehack_livemap.getWithMetadata(parsed.data!.id, "json");

		expect(dbData.value).toEqual(expect.objectContaining({
			name: "Paddington Bear",
			latitude: 51.52,
			longitude: -0.18,
			createdAt: expect.any(String),
			locationName: "Greater London, England, United Kingdom"
		}));
	});

	it('can get geojson', async () => {
		const response = await SELF.fetch('https://example.com/locations.geojson');

		expect(response.status).toBe(200);

		const data = await response.json();
		const parsed = locationsGeojsonResponse.safeParse(data);

		expect(parsed.error).toBeUndefined();
		expect(parsed.data!.features.length).toBe(4);
	});
});
