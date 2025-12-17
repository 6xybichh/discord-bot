const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set the music volume (0-100).')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (0-100).')
                .setRequired(true)),

    getVolumeBar(volume) {
        const barLength = 20;
        const filledLength = Math.round((volume / 100) * barLength);
        const emptyLength = barLength - filledLength;
        return '█'.repeat(filledLength) + '░'.repeat(emptyLength) + ` ${volume}%`;
    },

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const guildId = interaction.guild.id;
            const client = interaction.client;

            const checkPlayerExists = async () => {
                const player = client.riffy.players.get(guildId);
                
                if (!player) {
                    const noPlayerContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('**❌ NO ACTIVE PLAYER**')
                        )
                        .addSeparatorComponents(separator => separator)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('There is no active music player in this server.\n\n**💡 Quick Fix:**\nUse `/play` to start playing music and initialize the player.')
                        )
                        .addSeparatorComponents(separator => separator)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent('**🎵 Get Started:**\n• Join a voice channel\n• Use `/play <song name>` to begin\n• Enjoy high-quality audio streaming')
                        );
                
                    const reply = await interaction.editReply({ 
                        components: [noPlayerContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 6000);
                    return false;
                }
                
                return player;
            };

            const player = await checkPlayerExists();
            if (!player) return;
            
            const volume = interaction.options.getInteger('level');
            if (volume < 0 || volume > 100) {
                const invalidVolumeContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**❌ INVALID VOLUME**\nVolume must be between 0 and 100.\n\nPlease enter a valid volume level.')
                    );

                const reply = await interaction.editReply({ 
                    components: [invalidVolumeContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return;
            }
            
            const oldVolume = player.volume;
            player.setVolume(volume);
            
            const volumeContainer = new ContainerBuilder()
                .setAccentColor(0x2196f3)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**🔊 VOLUME ADJUSTED**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Volume changed from ${oldVolume}% to ${volume}%**\n\n**Audio Level:**\n${this.getVolumeBar(volume)}\n\n**Status:**\n• Current: ${volume}%\n• Quality: ${volume > 80 ? 'High' : volume > 40 ? 'Medium' : 'Low'}\n• ${volume === 0 ? '🔇 Muted' : volume > 75 ? '🔊 Loud' : volume > 25 ? '🔉 Medium' : '🔈 Quiet'}`)
                );

            const reply = await interaction.editReply({ 
                components: [volumeContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 8000);
        } catch (error) {
            console.error('Volume command error:', error);
        }
    }
};
