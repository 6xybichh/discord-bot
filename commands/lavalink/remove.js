const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a specific song from the queue.')
        .addIntegerOption(option =>
            option.setName('track')
                .setDescription('Track number to remove.')
                .setRequired(true)),

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
            
            const trackNumber = interaction.options.getInteger('track');
            if (trackNumber < 1 || trackNumber > player.queue.length) {
                const invalidContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**❌ INVALID TRACK NUMBER**\nTrack number must be between 1 and ${player.queue.length}.\n\nUse \`/queue\` to see valid track numbers.`)
                    );

                const reply = await interaction.editReply({ 
                    components: [invalidContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 6000);
                return;
            }
            
            const removedTrack = player.queue[trackNumber - 1];
            player.queue.remove(trackNumber - 1);
            
            const removeContainer = new ContainerBuilder()
                .setAccentColor(0xe74c3c)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**🗑️ TRACK REMOVED**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Removed from queue:**\n**${removedTrack.info.title}**\n\n**Details:**\n• Position: #${trackNumber}\n• Requested by: ${removedTrack.requester?.username || 'Unknown'}\n• Remaining tracks: ${player.queue.length}`)
                );

            const reply = await interaction.editReply({ 
                components: [removeContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 7000);
        } catch (error) {
            console.error('Remove command error:', error);
        }
    }
};
