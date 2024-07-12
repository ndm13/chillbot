import { ChatInputCommandInteraction } from "npm:discord.js";

export default class Units {
    celsiusToFahrenheit(interaction: ChatInputCommandInteraction) {
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
    fahrenheitToCelsius(interaction: ChatInputCommandInteraction) {
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
    metricLengthToImperial(interaction: ChatInputCommandInteraction) {
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
    imperialLengthToMetric(interaction: ChatInputCommandInteraction) {
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
}