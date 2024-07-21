import * as dotenv from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import {
    ActivityType,
    Client,
    Events,
    GatewayIntentBits
} from "npm:discord.js";

import CaughtIn4k from "./src/CaughtIn4k.ts";
import ChillMode from "./src/ChillMode.ts";
import Timezones from "./src/Timezones.ts";
import Units from "./src/Units.ts";

console.log("Loading env...");
await dotenv.load({ export: true });

const CI4K_TIMER = Deno.env.has('CI4K_TIMER') ?
    Number.parseInt(Deno.env.get('CI4K_TIMER') || '') || 0 : 10;
const GHOST_PING_TIMER = Deno.env.has('GHOST_PING_TIMER') ?
    Number.parseInt(Deno.env.get('GHOST_PING_TIMER') || '') || 0 : 3600;
const ATTACHMENT_CACHE_WINDOW = Deno.env.has('ATTACHMENT_CACHE_WINDOW') ?
    Number.parseInt(Deno.env.get('ATTACHMENT_CACHE_WINDOW') || '') : 30;

const CHILL_LIMIT = Deno.env.has('CHILL_LIMIT') ?
    Number.parseInt(Deno.env.get('CHILL_LIMIT') || '') : 15;
const CHILL_DURATION = Deno.env.has('CHILL_DURATION') ?
    Number.parseInt(Deno.env.get('CHILL_DURATION') || '') : 300;

const TZ_JSON_PATH = Deno.env.get('TZ_JSON_PATH') || 'tz.json';

if (ATTACHMENT_CACHE_WINDOW <= CI4K_TIMER)
    console.warn("Attachment cache window is tighter than 4K timer window. This may fail to preserve attachments!");

console.log("Starting client...");
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    presence: {
        afk: true,
        status: "idle",
        activities: [
            {
                name: "everything",
                type: ActivityType.Watching,
            },
        ],
    },
});

client.once(Events.ClientReady, (bot) => {
    console.log("Authenticated as", bot.user.tag);

    const ci4k = new CaughtIn4k(bot.user.id, CI4K_TIMER, ATTACHMENT_CACHE_WINDOW, GHOST_PING_TIMER);
    bot.on("messageCreate", async message => await ci4k.onMessageCreate(message));
    bot.on("messageDelete", async message => await ci4k.onMessageDelete(message));
    console.log("Registered 4kbot");

    const chillMode = new ChillMode(CHILL_LIMIT, CHILL_DURATION);
    const timezones = new Timezones(TZ_JSON_PATH);
    const units = new Units();

    bot.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        switch (interaction.commandName) {
            case "chill": return chillMode.chill(interaction);
            case "when":
                switch (interaction.options.getSubcommand()) {
                    case "me": return timezones.update(interaction);
                    case "is": return timezones.lookup(interaction);
                    default:
                        console.log("Unsupported subcommand for when:", interaction.options.getSubcommand());
                        return;
                }
            case 'temp':
                switch (interaction.options.getSubcommand()) {
                    case 'c': return units.celsiusToFahrenheit(interaction);
                    case 'f': return units.fahrenheitToCelsius(interaction);
                    default:
                        console.log('Invalid option for temp:', interaction.options.getSubcommand());
                        return;
                }
            case 'distance':
                switch (interaction.options.getSubcommand()) {
                    case 'mi': return units.milesToKilometers(interaction);
                    case 'km': return units.kilometersToMiles(interaction);
                    default:
                        console.log('Invalid option for distance:', interaction.options.getSubcommand());
                        return;
                }
            case 'length':
                switch (interaction.options.getSubcommand()) {
                    case 'metric': return units.metricLengthToImperial(interaction);
                    case 'imperial': return units.imperialLengthToMetric(interaction);
                    default:
                        console.log('Invalid option for length:', interaction.options.getSubcommand());
                        return;
                }
            default:
                console.error("Invalid command:", interaction.commandName);
                return;
        }
    });
});

await client.login();