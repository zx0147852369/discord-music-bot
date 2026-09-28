require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);

    console.log(`Registering ${commands.length} command(s)${process.env.GUILD_ID ? ' to guild ' + process.env.GUILD_ID : ' globally'}...`);
    await rest.put(route, { body: commands });
    console.log('Done. (Guild commands update instantly; global commands can take up to 1 hour to propagate.)');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
