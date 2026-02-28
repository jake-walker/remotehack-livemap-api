export async function reverseGeocode(latitude: number, longitude: number, zoom: number = 8): Promise<string> {
	const res = await fetch(`https://nominatim.openstreetmap.org/reverse.php?lat=${latitude}&lon=${longitude}&zoom=${zoom}&format=jsonv2`, {
		headers: {
			'User-Agent': 'https://remotehack.space/ Live Map',
		},
	});
	const data = (await res.json()) as any;

	return data['display_name'];
}

export async function geocode(query: string): Promise<{ latitude: string; longitude: string; name: string }[]> {
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
