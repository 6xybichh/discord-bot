const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue.'),

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
            
            if (player.queue.length === 0) {
                const emptyQueueContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**❌ EMPTY QUEUE**\nCannot shuffle an empty queue.\n\nAdd some tracks first with `/play`.')
                    );

                const reply = await interaction.editReply({ 
                    components: [emptyQueueContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return;
            }
            
            player.queue.shuffle();
            
            const shuffleContainer = new ContainerBuilder()
                .setAccentColor(0xe91e63)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**🔀 QUEUE SHUFFLED**\nThe music queue has been shuffled randomly.\n\n**Queue Info:**\n• Total Tracks: ' + player.queue.length + '\n• Order: Randomized\n• Next Up: ' + (player.queue[0]?.info.title || 'None'))
                );

            const reply = await interaction.editReply({ 
                components: [shuffleContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 6000);
        } catch (error) {
            console.error('Shuffle command error:', error);
        }
    }
};
