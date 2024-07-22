import { ChatInputCommandInteraction, TextChannel, ThreadAutoArchiveDuration } from 'npm:discord.js';

export default class SafeWord {
    async thread(interaction: ChatInputCommandInteraction) {
        const channel = interaction.channel?.isThread() ?
            interaction.channel.parent as TextChannel : interaction.channel as TextChannel;
        const reason = interaction.options.getString('reason');

        console.log(interaction.user.displayName,
            `used the safe word in #${channel.name}${reason ? ` because "${reason}"` : ''}.`);

        try {
            let r = await interaction.reply(`**<@${interaction.user.id}> used the safe word.**`);
            let m = await r.fetch();
            const threadInfo = {
                name: reason ? reason : `Safe word thread (requested by ${interaction.user.displayName})`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
                reason: `${interaction.user.displayName} triggered the safe word at <t:${Date.now()}:F>`
            };
            const moveMessage = `*Please* move conversation about ${reason ? `"${reason}"` : 'the current topic'} to this thread`;

            if (interaction.channel?.isThread()) {
                // Create thread in main channel
                return channel.threads.create(threadInfo)
                    .then(channel => m.reply(`${moveMessage}: <#${channel.id}>`)) as Promise<any>;
            } else {
                // Create thread in place
                return m.reply(`${moveMessage}.`)
                    .then(m => m.startThread(threadInfo)) as Promise<any>;
            }
        } catch (e) {
            return console.error("Error trying to create thread", e);
        }
    }
}