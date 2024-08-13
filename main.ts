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
import SafeWord from "./src/SafeWord.ts";

console.log("Loading env...");
await dotenv.load({ export: true });

const CI4K_TIMER = Deno.env.has('CI4K_TIMER') ?
    Number.parseInt(Deno.env.get('CI4K_TIMER') || '') || 0 : 10;
const CI4K_EXEMPT = Deno.env.get('CI4K_EXEMPT')?.split(',') || []
const GHOST_PING_TIMER = Deno.env.has('GHOST_PING_TIMER') ?
    Number.parseInt(Deno.env.get('GHOST_PING_TIMER') || '') || 0 : 3600;
const ATTACHMENT_CACHE_WINDOW = Deno.env.has('ATTACHMENT_CACHE_WINDOW') ?
    Number.parseInt(Deno.env.get('ATTACHMENT_CACHE_WINDOW') || '') : 30;
const ATTACHMENT_CACHE_DIR = Deno.env.get('ATTACHMENT_CACHE_DIR') || "./";

const CHILL_LIMIT = Deno.env.has('CHILL_LIMIT') ?
    Number.parseInt(Deno.env.get('CHILL_LIMIT') || '') : 15;
const CHILL_DURATION = Deno.env.has('CHILL_DURATION') ?
    Number.parseInt(Deno.env.get('CHILL_DURATION') || '') : 600;

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

    console.log("Configuring CaughtIn4k...")
    console.log("\tCI4K_TIMER\t", CI4K_TIMER);
    console.log("\tCI4K_EXEMPT\t", CI4K_EXEMPT);
    console.log("\tGHOST_PING_TIMER\t", GHOST_PING_TIMER);
    console.log("\tATTACHMENT_CACHE_WINDOW\t", ATTACHMENT_CACHE_WINDOW);
    console.log("\tATTACHMENT_CACHE_DIR\t", ATTACHMENT_CACHE_DIR);

    const ci4k = new CaughtIn4k(bot.user.id, CI4K_TIMER, ATTACHMENT_CACHE_WINDOW, ATTACHMENT_CACHE_DIR, GHOST_PING_TIMER, CI4K_EXEMPT);
    bot.on("messageCreate", async message => await ci4k.onMessageCreate(message));
    bot.on("messageDelete", async message => await ci4k.onMessageDelete(message));
    console.log("Registered CaughtIn4k");

    console.log("Configuring ChillMode...");
    console.log("\tCHILL_LIMIT\t", CHILL_LIMIT);
    console.log("\tCHILL_DURATION\t", CHILL_DURATION);
    const chillMode = new ChillMode(CHILL_LIMIT, CHILL_DURATION);


    console.log("Configuring Timezones...");
    console.log("\tTZ_JSON_PATH\t", TZ_JSON_PATH);
    const timezones = new Timezones(TZ_JSON_PATH);

    const safeWord = new SafeWord();
    const units = new Units();

    bot.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        switch (interaction.commandName) {
            case "chill": return chillMode.chill(interaction);
            case "safeword": return safeWord.thread(interaction);
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
    console.log("Registered slash commands");
});

await client.login();