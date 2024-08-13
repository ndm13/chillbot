# Chillbot
Chillbot is a bespoke private Discord bot for a small global community,
tailor-made for a specific set of needs. Chillbot implements several commands
and features to make interaction more chill.

## Caught in 4K
It's annoying when people delete messages you were reading, or when they post
and delete bait. The bot will repost these messages if deleted within a certain
threshold of seconds.

Additionally, the bot will post a message when a message pinging another user
is deleted, to prevent ghost pings.

| Environment Variable    | Default Value | Description                                                                             |
|-------------------------|---------------|-----------------------------------------------------------------------------------------|
| CI4K_TIMER              | 10            | Number of seconds to allow before reposting                                             |
| CI4K_EXEMPT             | \<empty>      | Comma-separated list of user IDs that are exempt from the check                         |
| GHOST_PING_TIMER        | 3600          | Number of seconds to allow before notifying of a deleted ghost ping                     |
| ATTACHMENT_CACHE_WINDOW | 30            | Number of seconds to allow before deleting attachments (must be longer than CI4K_TIMER) |
| ATTACHMENT_CACHE_DIR    | ./            | Folder to store cached data (will be created if needed)                                 |

## Chill Mode
Sometimes things get heated, and people can get big mad over things. Taking a
moment to calm down can help significantly. `/chill` will start slow mode for
the current channel and let people know you're concerned.

| Command | Description                                             |
| ------- |---------------------------------------------------------|
| /chill  | Slow things down for a bit to talk about our feelings.  |

| Environment Variable | Default Value | Description                                   |
|----------------------|---------------|-----------------------------------------------|
| CHILL_LIMIT          | 15            | Number of seconds in between messages         |
| CHILL_DURATION       | 600           | Number of seconds to keep slow mode enabled   |

## Time Zones
People exist all over the world, and figuring out what time it is for someone
can be pretty valuable. Instead of doing annoying time zone math, just ask the
bot and it'll tell you.

| Command                 | Description                        |
|-------------------------|------------------------------------|
| /when me `tz` `locale?` | Add or change your time zone.      |
| /when is `@user`        | Look up the local time for a user. |

| Environment Variable | Default Value | Description                  |
|----------------------|---------------|------------------------------|
| TZ_JSON_PATH         | ./tz.json     | File to store time zone data |

## Safe Word
Sometimes people are talking about something you are NOT okay with. To keep the
conversation going without making people uncomfortable, you can move it to a
thread. `/safeword` will create a new space for the conversation and direct
users there.

| Command                 | Description                                                     |
|-------------------------|-----------------------------------------------------------------|
| /safeword `reason`      | Move conversation that makes you uncomfortable to a new thread. |

## Unit Conversion
People in Freedom Unit and people in Normal Unit countries need to talk to each
other, and it's annoying to keep pulling up Google to convert things. `/temp`,
`/distance`, and `/length` will privately show you the result of your
conversion.

| Command                                 | Description                                |
|-----------------------------------------|--------------------------------------------|
| /temp c `temperature`                   | Convert Celsius to Fahrenheit.             |
| /temp f `temperature`                   | Convert Fahrenheit to Celsius.             |
| /distance mi `distance` `per-hour?`     | Convert miles to kilometers.               |
| /distance km `distance` `per-hour?`     | Convert kilometers to miles.               |
| /length metric `meters?` `centimeters?` | Convert meters/centimeters to feet/inches. |
| /length imperial `feet?` `inches?`      | Convert feet/inches to meters/centimeters. |