const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const QuarantineConfig = require('../../models/qurantine/quarantineConfig');
const { ensureQuarantineRolePosition } = require('../../utils/quarantineRolePosition')
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-quarantine')
        .setDescription('Setup server configurations.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('enable')
                .setDescription('Enable the quarantine system.'))
        .addSubcommand(subcommand =>
            subcommand.setName('disable')
                .setDescription('Disable the quarantine system.')),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        if (!await checkPermissions(interaction)) return;
        let config = await QuarantineConfig.findOne({ guildId: guild.id }) || new QuarantineConfig({ guildId: guild.id });

        if (interaction.options.getSubcommand() === 'enable') {
            if (config.quarantineEnabled) {
                return interaction.editReply({ content: '🚨 Quarantine system is already enabled.' });
            }

            // Create Quarantine Role
            let quarantineRole = await guild.roles.create({
                name: 'Quarantine',
                color: '#FF00FF',
                permissions: []
            }).catch(err => {
                console.error('[ERROR] Failed to create quarantine role:', err);
                throw err;
            });

            console.log('[DEBUG] Created quarantine role:', quarantineRole.id);
            console.log('[DEBUG] Guild id:', guild.id);
            console.log('[DEBUG] guild.members exists?', !!guild.members);
            console.log('[DEBUG] guild.members.me?', guild.members?.me ? `${guild.members.me.user?.tag} (${guild.members.me.id})` : 'N/A');
            console.log('[DEBUG] guild.members.cache size:', guild.members?.cache?.size ?? 'N/A');
            console.log('[DEBUG] client user id:', interaction.client?.user?.id);


            await ensureQuarantineRolePosition(guildId, quarantineRole.id);

            for (const channel of guild.channels.cache.values()) {
                if (!channel.permissionOverwrites) continue;
            
                try {
                    await channel.permissionOverwrites.edit(quarantineRole, { ViewChannel: false });
                } catch (err) {
                    console.warn(`Failed to set permissions in ${channel.name}:`, err.message);
                }
            }
            
            // make sure guild caches are ready
            await guild.fetch().catch(() => null);

            // attempt to position the role (retry inside the utility)
            const positioned = await ensureQuarantineRolePosition(guild, quarantineRole.id);
            if (!positioned) {
              console.warn('[WARN] ensureQuarantineRolePosition did not confirm success. Continuing but role may be misplaced.');
            }
            
            // Create Jail Channel
            const quarantineChannel = await guild.channels.create({
                name: 'quarantine-zone',
                type: 0,
                permissionOverwrites: [
                    { id: guild.id, deny: ['ViewChannel'] },
                    { id: quarantineRole.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
                ]
            });

            // Save settings
            config.quarantineEnabled = true;
            config.quarantineRoleId = quarantineRole.id;
            config.quarantineChannelId = quarantineChannel.id;
            await config.save();

            await ensureQuarantineRolePosition(guildId, config.quarantineRoleId);

            interaction.editReply({ content: '✅ Quarantine system enabled successfully!' });
        } 
        
        else if (interaction.options.getSubcommand() === 'disable') {
            if (!config.quarantineEnabled) {
                return interaction.editReply({ content: '❌ Quarantine system is not enabled.' });
            }

            const quarantineRole = guild.roles.cache.get(config.quarantineRoleId);
            if (quarantineRole) await quarantineRole.delete();

            const quarantineChannel = guild.channels.cache.get(config.quarantineChannelId);
            if (quarantineChannel) await quarantineChannel.delete();

            await QuarantineConfig.deleteOne({ guildId: guild.id });

            interaction.editReply({ content: '✅ Quarantine system disabled and all settings removed.' });
        }
    } else {
        const embed = new EmbedBuilder()
            .setColor('#aa00ffff')
            .setAuthor({ 
                name: "Alert!", 
                iconURL: cmdIcons.dotIcon,
                url: "https://discord.gg/Ec9V5cV26f"
            })
            .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-quarantine`')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
    }
};
