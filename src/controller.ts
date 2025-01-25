import { z } from 'zod';
import { Context } from './types';
import { nanoid } from 'nanoid';

const LOCATION_PRECISION = 100;

export const locationCreate = z.object({
	name: z.string().min(1).optional(),
	latitude: z
		.number()
		.min(-90)
		.max(90)
		.transform((v) => Math.round(v * LOCATION_PRECISION) / LOCATION_PRECISION),
	longitude: z
		.number()
		.min(-180)
		.max(180)
		.transform((v) => Math.round(v * LOCATION_PRECISION) / LOCATION_PRECISION),
});

export type LocationCreate = z.infer<typeof locationCreate>;

export type LocationMeta = {
	createdAt: Date;
	locationName?: String;
};

export async function addLocation(c: Context, item: LocationCreate): Promise<void> {
	const metadata: LocationMeta = {
		createdAt: new Date(),
		locationName: await reverseGeocode(item.latitude, item.longitude),
	};

	console.log(metadata);

	await c.env.remotehack_livemap.put(nanoid(), JSON.stringify({ ...item, ...metadata }), {
		expirationTtl: 60 * 60 * 24 * 30, // expire in 1 month
	});
}

export async function getLocations(c: Context): Promise<(LocationCreate & LocationMeta & { expiresAt?: Date })[]> {
	const keys = await c.env.remotehack_livemap.list();

	return (
		await Promise.all(
			keys.keys.map(async (k) => {
				const data = await c.env.remotehack_livemap.get(k.name);

				if (data === null) {
					return null;
				}

				return {
					...(JSON.parse(data) as LocationCreate & LocationMeta),
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
