import { nanoid } from 'nanoid';
import { LocationAndMetadata, LocationCreate, LocationsResponse } from './schema';
import { reverseGeocode } from './geocode';

export const DEFAULT_TTL: number = 60 * 60 * 24 * 30; // expire in 1 month

function roundLocation(input: LocationCreate): LocationCreate {
	return {
		...input,
		latitude: Number(input.latitude.toFixed(2)),
		longitude: Number(input.longitude.toFixed(2))
	}
}

export async function addLocation(env: Env, rawData: LocationCreate): Promise<LocationAndMetadata & { id: string, ttl: number }> {
	const data = roundLocation(rawData);

	let locationName: string | undefined;

	try {
		locationName = await reverseGeocode(data.latitude, data.longitude);
	} catch (err) {
		console.warn("Failed to find location name", err);
	}

	const item: LocationAndMetadata = {
		...data,
		createdAt: new Date(),
		locationName,
	};

	const id = nanoid();
	await env.remotehack_livemap.put(id, JSON.stringify(item), {
		expirationTtl: DEFAULT_TTL,
	});

	return {
		...item,
		id,
		ttl: DEFAULT_TTL
	};
}

export async function getLocations(env: Env): Promise<LocationsResponse> {
	const keys = await env.remotehack_livemap.list();

	return (
		await Promise.all(
			keys.keys.map(async (k) => {
				const data = await env.remotehack_livemap.get(k.name, "json");

				if (data === null) {
					return null;
				}

				return {
					...(data as LocationAndMetadata),
					expiresAt: k.expiration ? new Date(k.expiration * 1000) : undefined,
					id: k.name
				};
			})
		)
	).filter((item) => item !== null);
}
