import { ChatInputCommandInteraction, TextChannel } from 'npm:discord.js';

export default class ChillMode {
    readonly slow: Record<string, boolean> = {};
    limit;
    duration;

    constructor(limit: number, duration: number) {
        this.limit = limit;
        this.duration = duration;
    }

    chill(interaction: ChatInputCommandInteraction) {
        const channel = interaction.channel as TextChannel;
        if (this.slow[channel.id]) {
            console.log(interaction.user.displayName, "tried to chill, but it failed.");
            return interaction.reply({
                content: "Someone already asked to chill. No need to do it twice.",
                ephemeral: true
            });
        }
        channel.setRateLimitPerUser(this.limit, `${interaction.user.displayName} wants to chill.`);
        this.slow[channel.id] = true;
        setTimeout(() => this.thaw(channel, interaction.user.displayName), this.duration * 1000);
        console.log(interaction.user.displayName, `started a chill sesh in #${channel.name}.`);
        return interaction.reply("Okay, things are a bit heated. Y'all need to chill for a bit.");
    }

    thaw(channel: TextChannel, username: string) {
        channel.setRateLimitPerUser(channel.defaultThreadRateLimitPerUser || 0, "Hope you all feel better :)");
        console.log(username, `had their chill expire in #${channel.name}.`);
        this.slow[channel.id] = false;
    }
}