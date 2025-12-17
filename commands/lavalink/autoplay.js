const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require('discord.js');
const { autoplayCollection } = require('../../mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Enable or disable autoplay.')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable or disable autoplay.')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const guildId = interaction.guild.id;
            const member = interaction.member;
            const { channel } = member.voice;
            const client = interaction.client;

            const checkVoiceChannel = async () => {
                if (!channel) {
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('**❌ VOICE CHANNEL REQUIRED**\nYou must be connected to a voice channel to use music commands.\n\nPlease join a voice channel and try again.')
                        );
                    
                    const reply = await interaction.editReply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 5000);
                    return false;
                }
        
                const botVoiceChannel = interaction.guild.members.me?.voice.channel;
                
                if (botVoiceChannel && botVoiceChannel.id !== channel.id) {
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('**❌ CHANNEL CONFLICT**\nI\'m currently active in a different voice channel.\n\nPlease join the same channel or wait for the current session to end.')
                        );
                    
                    const reply = await interaction.editReply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 5000);
                    return false;
                }
                
                const permissions = channel.permissionsFor(client.user);
                if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('**❌ INSUFFICIENT PERMISSIONS**\nI need permission to connect and speak in the voice channel.\n\nPlease check my permissions and try again.')
                        );
                    
                    const reply = await interaction.editReply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 5000);
                    return false;
                }

                return true;
            };

            if (!await checkVoiceChannel()) return;
            
            try {
                const enable = interaction.options.getBoolean('enabled');
                await autoplayCollection.updateOne(
                    { guildId },
                    { $set: { autoplay: enable, updatedAt: new Date() } },
                    { upsert: true }
                );
            
                const autoplayContainer = new ContainerBuilder()
                    .setAccentColor(enable ? 0x2ecc71 : 0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**🔄 AUTOPLAY SETTINGS**')
                    )
                    .addSeparatorComponents(separator => separator)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**Autoplay is now ${enable ? 'ENABLED' : 'DISABLED'}**\n\n**What this means:**\n${enable ? '• Automatic queue replenishment\n• Continuous music playback\n• Smart song suggestions\n• No manual intervention needed' : '• Queue stops when empty\n• Manual track addition required\n• Playback ends after last song\n• Full user control'}\n\n**Status:** ${enable ? '✅ Active' : '❌ Inactive'}`)
                    );

                const reply = await interaction.editReply({ 
                    components: [autoplayContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
            
                setTimeout(() => reply.delete().catch(() => {}), 8000);
                
                const player = client.riffy.players.get(guildId);
                if (player) {
                    player.autoplay = enable;
                }
            } catch (error) {
                console.error('Error setting autoplay:', error);
                
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**❌ AUTOPLAY ERROR**\nFailed to set autoplay status.\n\nPlease try again later.')
                    );

                const reply = await interaction.editReply({ 
                    components: [errorContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }
        } catch (error) {
            console.error('Autoplay command error:', error);
        }
    }
};
