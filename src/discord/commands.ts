import { APIApplicationCommandSubcommandGroupOption, ApplicationCommandOptionType, ApplicationCommandType, RESTPostAPIApplicationCommandsJSONBody, type APIApplicationCommandOption } from "discord-api-types/v10";

type CommandType = RESTPostAPIApplicationCommandsJSONBody;

export const LIVEMAP_COMMAND: CommandType = {
	name: 'livemap',
	description: "Get locations from the live map or add your own location",
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: "add",
			description: "Add your location to the live map",
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "location",
					description: "The city (and/or country) where you are hacking from",
					type: ApplicationCommandOptionType.String,
					required: true
				},
				{
					name: "anonymous",
					description: "If enabled, your username is not stored with your location",
					type: ApplicationCommandOptionType.Boolean,
					required: false,
				},
				{
					name: "use-first",
					description: "If enabled, the first location result will be used",
					type: ApplicationCommandOptionType.Boolean,
					required: false
				}
			]
		},
		{
			name: "list",
			description: "List the current locations added to the live map",
			type: ApplicationCommandOptionType.Subcommand,
			options: []
		},
		{
			name: "about",
			description: "Get information about the live map",
			type: ApplicationCommandOptionType.Subcommand,
			options: []
		}
	],
};
