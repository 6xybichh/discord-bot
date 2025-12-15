const { PermissionsBitField } = require('discord.js');

/**
 * Robustly ensures the quarantine role is positioned just below the bot's highest role.
 * Retries a few times if guild.members isn't ready.
 */
async function ensureQuarantineRolePosition(guild, quarantineRoleId, opts = {}) {
  const { retries = 5, delay = 500 } = opts;

  try {
    if (!guild) {
      console.warn('[WARN] ensureQuarantineRolePosition called with undefined guild.');
      return false;
    }

    // Try to ensure guild is fetched (refresh caches)
    try {
      await guild.fetch().catch(() => null);
    } catch {}

    // helper to pause
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

    let botMember = null;
    // Try several times to get the bot member (handles slow cache)
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // prefer guild.members.me (v14+) then fallback to fetch by id
        botMember = guild.members?.me || (guild.members && guild.client && await guild.members.fetch(guild.client.user.id).catch(() => null));
      } catch (e) {
        botMember = null;
      }

      if (botMember) break;
      // on last attempt, log additional context
      if (attempt === retries - 1) {
        console.warn(`[WARN] Could not get bot member after ${retries} attempts for guild ${guild.name} (${guild.id}).`);
      } else {
        await sleep(delay);
      }
    }

    if (!botMember) return false;

    // fetch the role
    const quarantineRole = await guild.roles.fetch(quarantineRoleId).catch(() => null);
    if (!quarantineRole) {
      console.warn(`[WARN] Quarantine role ID ${quarantineRoleId} not found in guild ${guild.name}.`);
      return false;
    }

    const botHighestRole = botMember.roles?.highest;
    if (!botHighestRole) {
      console.warn(`[WARN] Bot highest role not available for guild ${guild.name}.`);
      return false;
    }

    // already correct
    if (quarantineRole.position === botHighestRole.position - 1) {
      console.log(`[INFO] Quarantine role already just below bot in ${guild.name}.`);
      return true;
    }

    // permission check
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      console.warn(`[WARN] Bot lacks ManageRoles permission in ${guild.name}.`);
      return false;
    }

    // final attempt: set position (Discord may throw if position invalid)
    await quarantineRole.setPosition(botHighestRole.position - 1).catch((err) => {
      console.error(`[ERROR] Failed to set position for quarantine role in ${guild.name}:`, err?.message || err);
      throw err;
    });

    console.log(`[INFO] Moved quarantine role in ${guild.name} to just below "${botHighestRole.name}".`);
    return true;
  } catch (error) {
    console.error('[ERROR] ensureQuarantineRolePosition fatal error:', error);
    return false;
  }
}

module.exports = { ensureQuarantineRolePosition };
