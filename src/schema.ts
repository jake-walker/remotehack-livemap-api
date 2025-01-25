import { z } from 'zod';
import 'zod-openapi/extend';

const LOCATION_PRECISION = 100;

const preprocessCoordinate = (value: unknown) => {
	if (typeof value === 'number') {
		// round the coordinate to make it more anonymised
		return Math.round(value * LOCATION_PRECISION) / LOCATION_PRECISION;
	}

	return value;
};

export const locationCreate = z
	.object({
		name: z.string().min(1).optional().openapi({ example: 'Han Solo' }),
		latitude: z.preprocess(preprocessCoordinate, z.number().min(-90).max(90)).openapi({ example: 51.51 }),
		longitude: z.preprocess(preprocessCoordinate, z.number().min(-180).max(180)).openapi({ example: -0.17 }),
	})
	.openapi({ ref: 'LocationCreate' });

export const locationAndMetadata = locationCreate
	.extend({
		createdAt: z.date().default(() => new Date()),
		locationName: z.string().optional().openapi({ example: 'London, United Kingdom' }),
	})
	.openapi({ ref: 'LocationAndMetadata' });

export const locationsResponse = z
	.array(
		locationAndMetadata.extend({
			expiresAt: z.date().optional(),
		})
	)
	.openapi({ ref: 'LocationsResponse' });

export const locationsGeojsonResponse = z
	.object({
		type: z.literal('FeatureCollection').openapi({ example: 'FeatureCollection' }),
		features: z.array(
			z.object({
				type: z.literal('Feature').openapi({ example: 'Feature' }),
				properties: z.object({
					name: z.string().optional().openapi({ example: 'Han Solo' }),
					locationName: z.string().optional().openapi({ example: 'London, United Kingdom' }),
				}),
				geometry: z.object({
					type: z.literal('Point').openapi({ example: 'Point' }),
					coordinates: z
						.array(z.number())
						.length(2)
						.openapi({ example: [51.51, -0.17] }),
				}),
			})
		),
	})
	.openapi({ ref: 'LocationsGeoJsonResponse' });

export const okResponse = z
	.object({
		ok: z.boolean(),
	})
	.openapi({ ref: 'OkResponse' });

export type LocationCreate = z.infer<typeof locationCreate>;
export type LocationAndMetadata = z.infer<typeof locationAndMetadata>;
export type LocationsResponse = z.infer<typeof locationsResponse>;
