import { describe, it, expect } from 'vitest';
import { locationCreate } from '../src/schema';

describe("schema", () => {
	it("rounds coordinates", async () => {
		const output = locationCreate.parse({
			name: "Paddington Bear",
			latitude: 51.5154,
			longitude: -0.1755
		});

		expect(output.latitude).toEqual(51.52);
		expect(output.longitude).toEqual(-0.18);
	});
});
