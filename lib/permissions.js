const { PermissionsBitField } = require('discord.js');
const { getGuildSettings } = require('../db');

const DJ_ONLY_COMMANDS = new Set(['skip', 'stop', 'pause', 'resume', 'volume', 'loop', 'leave']);

function canUseDjCommand(member) {
  const settings = getGuildSettings(member.guild.id);
  if (!settings.dj_role_id) return true;
  if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;
  return member.roles.cache.has(settings.dj_role_id);
}

function isCommandDisabled(guildId, commandName) {
  const settings = getGuildSettings(guildId);
  return settings.disabled_commands.includes(commandName);
}

module.exports = { DJ_ONLY_COMMANDS, canUseDjCommand, isCommandDisabled };
