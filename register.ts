import * as dotenv from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";
import {
    REST,
    Routes,
    SlashCommandBuilder,
} from "npm:discord.js";

await dotenv.load({ export: true });
const args = parseArgs(Deno.args);

const token = Deno.env.get('DISCORD_TOKEN') || args.token;
const clientId = Deno.env.get('CLIENT_ID') || args.clientId;
console.log(clientId);

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log("Registering commands...");
        await rest.put(Routes.applicationCommands(clientId), {
            body: [
                new SlashCommandBuilder()
                    .setName('chill')
                    .setDescription('Slow things down for a bit to talk about our feelings.')
                    .toJSON(),
                new SlashCommandBuilder()
                    .setName('when')
                    .setDescription('Time zone calculator for users who have opted in.')
                    .addSubcommand(subcommand => subcommand
                        .setName('me')
                        .setDescription('Add or change your time zone.')
                        .addStringOption(option => option
                            .setName('tz')
                            .setDescription('Your time zone (e.g. America/New_York).')
                            .setRequired(true))
                        .addStringOption(option => option
                            .setName('locale')
                            .setDescription('Your locale (e.g. en-US).')))
                    .addSubcommand(subcommand => subcommand
                        .setName('is')
                        .setDescription('Look up the local time for a user.')
                        .addUserOption(option => option
                            .setName('user')
                            .setDescription('The user to look up.')
                            .setRequired(true)))
                    .toJSON(),
                new SlashCommandBuilder()
                    .setName('temp')
                    .setDescription('Convert temperature from freedom units to normal ones.')
                    .addSubcommand(option => option
                        .setName('c')
                        .setDescription('Convert Celsius to Fahrenheit.')
                        .addIntegerOption(option => option
                            .setName('temperature')
                            .setDescription('Temperature in Celsius.')
                            .setRequired(true)))
                    .addSubcommand(option => option
                        .setName('f')
                        .setDescription('Convert Fahrenheit to Celsius.')
                        .addIntegerOption(option => option
                            .setName('temperature')
                            .setDescription('Temperature in Fahrenheit.')
                            .setRequired(true)))
                    .toJSON(),
                new SlashCommandBuilder()
                    .setName('distance')
                    .setDescription('Convert distance from freedom units to normal ones.')
                    .addSubcommand(option => option
                        .setName('mi')
                        .setDescription('Convert miles to kilometers.')
                        .addNumberOption(option => option
                            .setName('distance')
                            .setDescription('Distance in miles.')
                            .setRequired(true))
                        .addBooleanOption(option => option
                            .setName('per-hour')
                            .setDescription('Include "per hour" suffix?')
                            .setRequired(false)))
                    .addSubcommand(option => option
                        .setName('km')
                        .setDescription('Convert kilometers to miles.')
                        .addNumberOption(option => option
                            .setName('distance')
                            .setDescription('Distance in kilometers.')
                            .setRequired(true))
                        .addBooleanOption(option => option
                            .setName('per-hour')
                            .setDescription('Include "per hour" suffix?')
                            .setRequired(false)))
                    .toJSON(),
                new SlashCommandBuilder()
                    .setName('length')
                    .setDescription('Convert length from freedom units to normal ones.')
                    .addSubcommand(option => option
                        .setName('metric')
                        .setDescription('Convert meters/centimeters to inches/feet.')
                        .addNumberOption(option => option
                            .setName('meters')
                            .setDescription('Length in meters.')
                            .setRequired(false))
                        .addIntegerOption(option => option
                            .setName('centimeters')
                            .setDescription('Length in centimeters.')
                            .setRequired(false)))
                    .addSubcommand(option => option
                        .setName('imperial')
                        .setDescription('Convert feet/inches to meters/centimeters.')
                        .addNumberOption(option => option
                            .setName('feet')
                            .setDescription('Length in feet.')
                            .setRequired(false))
                        .addIntegerOption(option => option
                            .setName('inches')
                            .setDescription('Length in inches.')
                            .setRequired(false)))
                    .toJSON()
            ]
        });
    } catch (error) {
        console.error(error);
    }
})();