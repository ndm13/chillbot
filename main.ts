import * as dotenv from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { sleep } from "https://deno.land/x/sleep@v1.3.0/mod.ts";
import {
    ActivityType,
    Client,
    Events,
    GatewayIntentBits,
    TextChannel,
    Webhook,
} from "npm:discord.js";

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

    bot.on("messageCreate", async (message) => {
        // If posted by webhook, ignore
        if (message.webhookId) return;
        // Save attachments
        const pathsPromise = Promise.all(message.attachments
            .map(async (a) => {
                const r = await fetch(a.url);
                if (r.body) {
                    Deno.mkdirSync(message.id, { recursive: true });
                    const path = message.id + "/" + a.name;
                    await Deno.writeFile(path, r.body);
                    console.log("Attachment", a.name, "-", (await Deno.stat(path)).size, "/", a.size);
                }
            }));
        // Delete after 30s
        await Promise.all([pathsPromise, sleep(ATTACHMENT_CACHE_WINDOW)]);
        try {
            if (Deno.statSync(message.id).isDirectory) {
                Deno.removeSync(message.id, { recursive: true });
            }
        } catch (_x) {
            // Ignore, directory was never created
        }
    });

    bot.on("messageDelete", async (message) => {
        // If posted by webhook, ignore
        if (message.webhookId) return;
        // Always notify ghost pings (within an hour)
        const ghost = (message.mentions.users.size > 0) && (Date.now() - (GHOST_PING_TIMER * 1000) < message.createdTimestamp);
        // If visible longer than 10s, ignore
        const secondRule = Date.now() - (CI4K_TIMER * 1000) < message.createdTimestamp;
        if (!ghost && !secondRule) return;
        // Build links
        const files = message.attachments.map((a) => message.id + "/" + a.name);
        // Get webhook for this channel, or create if not exist
        const hookChannel = (message.channel.isThread()
            ? message.channel.parent
            : message.channel) as TextChannel;
        const hook: Webhook = await hookChannel?.fetchWebhooks()
            .then((hooks) =>
                hooks.filter((h) => h.owner?.id === bot.user.id).first()
            )
            .then((hook) =>
                hook ||
                (message.channel as TextChannel).createWebhook({
                    name: "4k #" + message.channel.id,
                })
            );
        // Get member info so we have nice names and PFPs
        const member = await message.guild?.members.fetch("" + message.author?.id);
        // Log :)
        console.log(
            `${member?.displayName} (${message.author?.displayName}) tried to be sneaky in #${
                message.channel.isThread()
                    ? hookChannel.name + " > " + message.channel.name
                    : (message.channel as TextChannel).name
            }:\n\t${message.content || ""}${
                message.attachments.size > 0
                    ? (message.content ? "\n\t" : "") + "Files: " +
                    message.attachments.map((a) => a.name).join(", ")
                    : ""
            }${
                message.stickers.size > 0
                    ? "Sticker: " + message.stickers.first()?.name
                    : ""
            }`,
        );
        // Resend message
        try {
            if (secondRule) {
                // If we have cached content, send it
                await hook.send({
                    content: message.content
                        ? message.content
                        : message.stickers.size > 0
                            ? (message.stickers.first()?.format === 3
                                ? `*Sent a default sticker: **${message.stickers.first()?.name}***`
                                : message.stickers.first()?.url)
                            : undefined,
                    files: files.map((p) => {
                        return {
                            attachment: p as string,
                            name: p.split("/")[1],
                        };
                    }),
                    threadId: message.channel.isThread() ? message.channel.id : undefined,
                    username: member?.displayName,
                    avatarURL: member?.displayAvatarURL(),
                });
            } else {
                // Otherwise just notify for ghost ping
                await message.channel.send({
                    content: `<@${message.author?.id}>'s message pinging ${message.mentions.users.map(u => `<@${u.id}>`).join('/')} was deleted.`
                });
            }
        } catch (e) {
            console.log(message.toJSON());
            console.error(e);
        }
    });

    const slow: Record<string, boolean> = {};
    bot.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        switch (interaction.commandName) {
            case "chill":
            {
                const channel = interaction.channel as TextChannel;
                if (slow[channel.id]) {
                    console.log(interaction.user.displayName, "tried to chill, but it failed.");
                    return interaction.reply({
                        content: "Someone already asked to chill. No need to do it twice.",
                        ephemeral: true
                    });
                }
                channel.setRateLimitPerUser(CHILL_LIMIT, `${interaction.user.displayName} wants to chill.`);
                slow[channel.id] = true;
                await interaction.reply("Okay, things are a bit heated. Y'all need to chill for a bit.");
                console.log(interaction.user.displayName, `started a chill sesh in #${channel.name}.`);
                return setTimeout(() => {
                    channel.setRateLimitPerUser(channel.defaultThreadRateLimitPerUser || 0, "Hope you all feel better :)");
                    console.log(interaction.user.displayName, `had their chill expire in #${channel.name}.`);
                    slow[channel.id] = false;
                }, 300000);
            }
            case "when":
            {
                let tzData: Record<string, { tz: string; locale: string }> = {};
                try {
                    tzData = JSON.parse(Deno.readTextFileSync("tz.json"));
                } catch (error) {
                    try {
                        Deno.writeTextFileSync("tz.json", "{}");
                    } catch (error2) {
                        console.error(error2, error);
                        return;
                    }
                }
                switch (interaction.options.getSubcommand()) {
                    case "me":
                    {
                        const tz = interaction.options.getString("tz");
                        const locale = interaction.options.getString("locale");
                        if (!tz) {
                            return interaction.reply({
                                content: "Invalid command: time zone is required!",
                                ephemeral: true,
                            });
                        }
                        if (locale) {
                            try {
                                Intl.getCanonicalLocales([locale]);
                            } catch (_x) {
                                return interaction.reply({
                                    content: `Invalid locale: '${locale}' is not supported. Use the format [language code]-[country code]: for instance, en-US.`,
                                    ephemeral: true,
                                });
                            }
                        }
                        if (!Intl.supportedValuesOf("timeZone").includes(tz)) {
                            return interaction.reply({
                                content: `Invalid time zone: '${tz}' is not supported. Be sure to use the format specified [here.](https://www.iana.org/time-zones).`,
                                ephemeral: true,
                            });
                        }
                        tzData[interaction.user.id] = { tz, locale: locale || "en-US" };
                        const options: Intl.DateTimeFormatOptions = {
                            dateStyle: "full",
                            timeStyle: "full",
                            timeZone: tz,
                        };
                        interaction.reply({
                            content: `Your current time should be ${
                                Intl.DateTimeFormat(locale || "en-US", options).format(new Date())
                            }. If this is wrong, update your options!`,
                            ephemeral: true,
                        })
                            .then(() => console.log(`${interaction.user.displayName} updated their time zone info (${tz}, ${locale}).`))
                            .catch((e) => console.error(e));
                        Deno.writeTextFileSync("tz.json", JSON.stringify(tzData, null, 2));
                    }
                        break;
                    case "is":
                    {
                        const user = interaction.options.getUser("user");
                        if (!user) {
                            return interaction.reply({
                                content: "Invalid command: user is required!",
                                ephemeral: true,
                            });
                        }
                        const targetData = tzData[user.id];
                        if (!targetData) {
                            return interaction.reply({
                                content: `${user.displayName} has not registered their time zone! Can't convert for you :pensive:.`,
                                ephemeral: true,
                            });
                        }
                        const options: Intl.DateTimeFormatOptions = {
                            dateStyle: "full",
                            timeStyle: "full",
                            timeZone: targetData.tz,
                        };
                        const userLocale = tzData[interaction.user.id]?.locale;
                        interaction.reply({
                            content: `It is ${
                                Intl.DateTimeFormat(userLocale || "en-US", options).format(new Date())
                            } for ${user.displayName}.${
                                !userLocale
                                    ? "\n*Note: if you want this date formatted for your region, use `/when me` with the locale option*"
                                    : ""
                            }`,
                            ephemeral: true,
                        })
                            .then(() => console.log(`${interaction.user.displayName} asked the time for ${user.displayName}.`))
                            .catch((e) => console.error(e));
                    }
                        break;
                    default:
                        console.log("Unsupported subcommand for when:", interaction.options.getSubcommand());
                        return;
                }
            }
                break;
            case 'temp': {
                switch (interaction.options.getSubcommand()) {
                    case 'c': {
                        const c = interaction.options.getInteger('temperature');
                        if (!c) return interaction.reply({
                            content: 'Missing temperature!',
                            ephemeral: true
                        });
                        const f = (c * 9 / 5) + 32;
                        return interaction.reply({
                            content: `${c}°C is ${f}°F.`,
                            ephemeral: true
                        });
                    }
                    case 'f': {
                        const f = interaction.options.getInteger('temperature');
                        if (!f) return interaction.reply({
                            content: 'Missing temperature!',
                            ephemeral: true
                        });
                        const c = (f - 32) * 5 / 9;
                        return interaction.reply({
                            content: `${f}°F is ${c}°C.`,
                            ephemeral: true
                        });
                    }
                    default: {
                        console.log('Invalid option for temp:', interaction.options.getSubcommand());
                    }
                }
            }
                break;
            case 'length': {
                switch (interaction.options.getSubcommand()) {
                    case 'metric': {
                        const m = interaction.options.getNumber('meters') || 0;
                        const cm = interaction.options.getInteger('centimeters') || 0;
                        if (!cm && !m) return interaction.reply({
                            content: 'Missing length!',
                            ephemeral: true
                        });
                        const inches = ((m * 100) + cm) / 2.54;
                        const ft = Math.floor(inches / 12);
                        const inRem = inches % 12;
                        return interaction.reply({
                            content: `${cm === 0 ? m + "m" : ((100 * m) + cm) + "cm"} is ${ft > 0 ? ft + "'" : ''}${inRem > 0 || ft === 0 ? Math.round(inRem) + '"' : ''}.`,
                            ephemeral: true
                        });
                    }
                    case 'imperial': {
                        const ft = interaction.options.getNumber('feet') || 0;
                        const n = interaction.options.getInteger('inches') || 0;
                        if (!ft && !n) return interaction.reply({
                            content: 'Missing length!',
                            ephemeral: true
                        });
                        const cm = ((ft * 12) + n) * 2.54;
                        return interaction.reply({
                            content: `${ft > 0 ? ft + "'" : ''}${n > 0 || ft === 0 ? n + '"' : ''} is ${cm > 100 ? (cm / 100) + "m" : Math.round(cm) + "cm"}.`,
                            ephemeral: true
                        });
                    }
                    default: {
                        console.log('Invalid option for length:', interaction.options.getSubcommand());
                    }
                }
            }
                break;
            default:
                console.error("Invalid command:", interaction.commandName);
                return;
        }
    });
});

await client.login();
