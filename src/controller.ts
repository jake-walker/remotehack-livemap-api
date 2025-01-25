import { Context } from './types';
import { nanoid } from 'nanoid';
import { LocationAndMetadata, LocationCreate, LocationsResponse } from './schema';

export async function addLocation(c: Context, data: LocationCreate): Promise<void> {
	const item: LocationAndMetadata = {
		...data,
		createdAt: new Date(),
		locationName: await reverseGeocode(data.latitude, data.longitude),
	};

	await c.env.remotehack_livemap.put(nanoid(), JSON.stringify(item), {
		expirationTtl: 60 * 60 * 24 * 30, // expire in 1 month
	});
}

export async function getLocations(c: Context): Promise<LocationsResponse> {
	const keys = await c.env.remotehack_livemap.list();

	return (
		await Promise.all(
			keys.keys.map(async (k) => {
				const data = await c.env.remotehack_livemap.get(k.name);

				if (data === null) {
					return null;
				}

				return {
					...(JSON.parse(data) as LocationAndMetadata),
					expiresAt: k.expiration ? new Date(k.expiration * 1000) : undefined,
				};
			})
		)
	).filter((item) => item !== null);
}

async function reverseGeocode(latitude: number, longitude: number, zoom: number = 8) {
	const res = await fetch(`https://nominatim.openstreetmap.org/reverse.php?lat=${latitude}&lon=${longitude}&zoom=${zoom}&format=jsonv2`, {
		headers: {
			'User-Agent': 'https://remotehack.space/ Live Map',
		},
	});
	const data = (await res.json()) as any;

	return data['display_name'];
}

export async function geocode(query: string): Promise<{ latitude: number; longitude: number; name: string }[]> {
	const res = await fetch(`https://nominatim.openstreetmap.org/search.php?q=${encodeURIComponent(query)}&format=jsonv2`, {
		headers: {
			'User-Agent': 'https://remotehack.space/ Live Map',
		},
	});
	const data = (await res.json()) as any;

	return data.map((item: any) => ({
		latitude: item.lat,
		longitude: item.lon,
		name: item['display_name'],
	}));
}
