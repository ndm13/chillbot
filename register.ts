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
                    .toJSON()
            ]
        });
    } catch (error) {
        console.error(error);
    }
})();