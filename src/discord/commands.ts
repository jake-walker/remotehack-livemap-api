export const ADD_LOCATION_COMMAND = {
	name: 'livemap',
	description: 'Add your location to the live map',
	type: 1, // slash command
	options: [
		{
			type: 3, // string
			name: 'location',
			description: 'What city (and/or country) are you hacking from?',
			required: true,
		},
		{
			type: 5, // boolean
			name: 'anonymous',
			description: 'Enabling this does not show your username with your location',
			required: false,
		},
	],
};
