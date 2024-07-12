import {ChatInputCommandInteraction} from "npm:discord.js";

export default class Timezones {
    readonly tzData: Record<string, { tz: string; locale: string }> = {};
    tzDataPath;

    constructor(tzDataPath: string) {
        this.tzDataPath = tzDataPath;
        try {
            this.tzData = JSON.parse(Deno.readTextFileSync(tzDataPath));
        } catch (_x) {
            // Let this throw an error if it fails
            Deno.writeTextFileSync(tzDataPath, "{}");
        }
    }

    async update(interaction: ChatInputCommandInteraction) {
        const tz = interaction.options.getString("tz");
        const locale = interaction.options.getString("locale");
        if (!tz) return interaction.reply({
            content: "Invalid command: time zone is required!",
            ephemeral: true,
        });

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
        if (!Intl.supportedValuesOf("timeZone").includes(tz)) return interaction.reply({
            content: `Invalid time zone: '${tz}' is not supported. Be sure to use the format specified [here.](https://www.iana.org/time-zones).`,
            ephemeral: true,
        });

        this.tzData[interaction.user.id] = { tz, locale: locale || "en-US" };
        const write = Deno.writeTextFile(this.tzDataPath, JSON.stringify(this.tzData, null, 2));

        const reply = interaction.reply({
            content: `Your current time should be ${this.formatNow(locale, tz)}. If this is wrong, update your options!`,
            ephemeral: true,
        });

        await Promise.all([write, reply]);
        console.log(`${interaction.user.displayName} updated their time zone info (${tz}, ${locale}).`)
    }

    async lookup(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser("user");
        if (!user) return interaction.reply({
            content: "Invalid command: user is required!",
            ephemeral: true,
        });

        const theirData = this.tzData[user.id];
        if (!theirData) return interaction.reply({
            content: `${user.displayName} has not registered their time zone! Can't convert for you :pensive:.`,
            ephemeral: true,
        });

        const myLocale = this.tzData[interaction.user.id]?.locale;
        await interaction.reply({
            content: `It is ${this.formatNow(myLocale, theirData.tz)} for ${user.displayName}.${
                !myLocale
                    ? "\n*Note: if you want this date formatted for your region, use `/when me` with the locale option*"
                    : ""
            }`,
            ephemeral: true,
        });
        console.log(`${interaction.user.displayName} asked the time for ${user.displayName}.`);
    }

    private formatNow(locale: string | null, tz: string) {
        return Intl.DateTimeFormat(locale || "en-US", {
            dateStyle: "full",
            timeStyle: "full",
            timeZone: tz,
        }).format(new Date());
    }
}