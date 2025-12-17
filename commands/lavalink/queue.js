const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the current music queue.'),

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
            
            const queue = player.queue;
            if (!queue || queue.length === 0) {
                const emptyQueueContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**❌ EMPTY QUEUE**\nThe music queue is currently empty.\n\nAdd tracks with `/play` to see them here.')
                    );

                const reply = await interaction.editReply({ 
                    components: [emptyQueueContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return;
            }
            
            const formattedQueue = queue.slice(0, 15).map((track, i) => 
                `**${i + 1}.** ${track.info.title}\n> *Requested by ${track.requester?.username || 'Unknown'}*`
            ).join('\n\n');
            
            const queueContainer = new ContainerBuilder()
                .setAccentColor(0xdc92ff)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**🎶 MUSIC QUEUE**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Queue Information:**\n• Total Tracks: **${queue.length}**\n• Estimated Duration: **~${Math.round(queue.length * 3.5)} minutes**\n• Loop Mode: **${player.loop || 'None'}**\n• Shuffle: ${player.queue.shuffled ? '✅ On' : '❌ Off'}`)
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**📋 Up Next:**\n\n${formattedQueue}${queue.length > 15 ? `\n\n*...and ${queue.length - 15} more tracks*` : ''}`)
                );
            
            const reply = await interaction.editReply({ 
                components: [queueContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 15000);
        } catch (error) {
            console.error('Queue command error:', error);
        }
    }
};
