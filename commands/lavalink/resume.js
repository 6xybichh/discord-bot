const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused song.'),

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
            
            player.pause(false);
            
            const resumeContainer = new ContainerBuilder()
                .setAccentColor(0x2ecc71)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**▶️ PLAYBACK RESUMED**\nMusic playback has been resumed.\n\nEnjoy your music!')
                );

            const reply = await interaction.editReply({ 
                components: [resumeContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        } catch (error) {
            console.error('Resume command error:', error);
        }
    }
};
