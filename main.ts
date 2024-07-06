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
                    console.log(
                        "Attachment",
                        a.name,
                        "-",
                        (await Deno.stat(path)).size,
                        "/",
                        a.size,
                    );
                }
            }));
        // Delete after 30s
        await Promise.all([pathsPromise, sleep(30)]);
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
        // If visible longer than 10s, ignore
        if (Date.now() - 10000 > message.createdTimestamp) return;
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
        } catch (e) {
            console.log(message.toJSON());
            console.error(e);
        }
    });

    const slow: Record<string,number> = {};
    bot.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        switch (interaction.commandName) {
            case "chill":
            {
                const channel = interaction.channel as TextChannel;
                if (slow[channel.id]) {
                    console.log(interaction.user.displayName, 'tried to chill, but it failed.');
                    return interaction.reply({
                        content: "Someone already asked to chill. No need to do it twice.",
                        ephemeral: true
                    });
                }
                channel.setRateLimitPerUser(15, `${interaction.user.displayName} wants to chill.`);
                slow[channel.id] = true;
                await interaction.reply("Okay, things are a bit heated. Y'all need to chill for a bit.");
                console.log(interaction.user.displayName, `started a chill sesh in #${channel.name}.`);
                setTimeout(() => {
                    channel.setRateLimitPerUser(channel.defaultThreadRateLimitPerUser || 0, "Hope you all feel better :)");
                    console.log(interaction.user.displayName, `had their chill expire in #${channel.name}.`);
                    slow[channel.id] = false;
                }, 300000);
            }
                break;
            default:
                console.error("Invalid command:", interaction.commandName);
                return;
        }
    });
});

await client.login();
