import {Channel, GuildMember, Message, PartialMessage, TextChannel, Webhook} from 'npm:discord.js';
import {sleep} from "https://deno.land/x/sleep@v1.3.0/sleep.ts";

export default class CaughtIn4k {
    botId;
    catchTimer;
    attachmentCacheWindow;
    ghostPingTimer;

    constructor(botId: string, catchTimer: number, attachmentCacheWindow : number, ghostPingTimer: number) {
        this.botId = botId;
        this.catchTimer = catchTimer;
        this.attachmentCacheWindow = attachmentCacheWindow;
        this.ghostPingTimer = ghostPingTimer;
    }

    async onMessageCreate(message: Message) {
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
        // Delete after timeout
        await Promise.all([pathsPromise, sleep(this.attachmentCacheWindow)]);
        try {
            if (Deno.statSync(message.id).isDirectory)
                Deno.removeSync(message.id, { recursive: true });
        } catch (_x) {
            // Ignore, directory was never created
        }
    }

    async onMessageDelete(message: Message | PartialMessage) {
        // If posted by webhook, ignore
        if (message.webhookId) return;

        // If outside of timers, ignore
        const ghost = (message.mentions.users.size > 0) &&
            (Date.now() - (this.ghostPingTimer * 1000) < message.createdTimestamp);
        const secondRule = Date.now() - (this.catchTimer * 1000) < message.createdTimestamp;
        if (!ghost && !secondRule) return;

        // Build links
        const files = message.attachments.map((a) => message.id + "/" + a.name);

        // Get webhook for this channel, or create if not exist
        const hookChannel = (message.channel.isThread()
            ? message.channel.parent
            : message.channel) as TextChannel;
        const hook: Webhook = await this.getWebhookForChannel(hookChannel, message.channel);

        // Get member info so we have nice names and PFPs
        const member = await message.guild?.members.fetch("" + message.author?.id) as GuildMember;
        this.logSneaky(member, message, hookChannel);

        // Resend message
        try {
            // If we have cached content, send it
            if (secondRule)
                return this.resendCachedMessage(hook, message, files, member);
            // Otherwise just notify for ghost ping
            return this.notifyGhostPing(message);
        } catch (e) {
            console.log(message.toJSON());
            console.error(e);
        }
    }

    private notifyGhostPing(message: Message | PartialMessage) {
        const mentions = message.mentions.users.map(u => `<@${u.id}>`).join('/');
        return message.channel.send({
            content: `<@${message.author?.id}>'s message pinging ${mentions} was deleted.`
        });
    }

    private resendCachedMessage(hook: Webhook, message: Message | PartialMessage, files: string[], member: GuildMember) {
        const content = message.content ? message.content :
            message.stickers.size > 0
                    ? (message.stickers.first()?.format === 3
                        ? `*Sent a default sticker: **${message.stickers.first()?.name}***`
                        : message.stickers.first()?.url)
                    : undefined;
        return hook.send({
            content: content,
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
    }

    private logSneaky(member: GuildMember, message: Message | PartialMessage, hookChannel: TextChannel) {
        const name = `${member?.displayName} (${message.author?.displayName})`;
        const channel = message.channel.isThread()
                ? `${hookChannel.name}>"${message.channel.name}"`
                : (message.channel as TextChannel).name;
        const attachments = message.attachments.size > 0
            ? (message.content ? "\n\t" : "") + "Files: " +
            message.attachments.map((a) => a.name).join(", ")
            : "";
        const stickers = message.stickers.size > 0
            ? "Sticker: " + message.stickers.first()?.name
            : "";
        console.log(`${name} tried to be sneaky in ${channel}:\n\t${message.content || ""}${attachments}${stickers}`);
    }

    private async getWebhookForChannel(hookChannel: TextChannel, channel: Channel) {
        const hooks = await hookChannel?.fetchWebhooks();
        const hook = hooks
          .filter(h => h.owner?.id === this.botId)
          .first();
        return hook || (channel as TextChannel).createWebhook({ name: "4k #" + channel.id });
    }
}