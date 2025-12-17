const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggle looping mode for the current track or the entire queue.')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Select loop mode: none, track, or queue.')
                .setRequired(true)
                .addChoices(
                    { name: 'Disable Loop', value: 'none' },
                    { name: 'Track Loop', value: 'track' },
                    { name: 'Queue Loop', value: 'queue' }
                )),

    getLoopModeDescription(mode) {
        const descriptions = {
            'none': '• Music will play through the queue once\n• No tracks will repeat automatically\n• Queue ends when last track finishes',
            'track': '• Current track will repeat indefinitely\n• Same song plays over and over\n• Perfect for favorite tracks',
            'queue': '• Entire queue repeats when finished\n• Continuous playlist playback\n• All tracks cycle through repeatedly'
        };
        return descriptions[mode] || 'Unknown loop mode';
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
            
            const mode = interaction.options.getString('mode');
            
            try {
                player.setLoop(mode);
                
                const loopContainer = new ContainerBuilder()
                    .setAccentColor(0x9c27b0)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**🔄 LOOP MODE UPDATED**')
                    )
                    .addSeparatorComponents(separator => separator)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**Loop mode set to: ${mode.toUpperCase()}**\n\n**Mode Details:**\n${this.getLoopModeDescription(mode)}\n\n**Current Status:**\n• Active: ${mode !== 'none' ? '✅ Yes' : '❌ No'}\n• Type: ${mode === 'track' ? '🔂 Single Track' : mode === 'queue' ? '🔁 Entire Queue' : '➡️ No Loop'}`)
                    );

                const reply = await interaction.editReply({ 
                    components: [loopContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 8000);
            } catch (error) {
                console.error('Error setting loop mode:', error);
                
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**❌ LOOP ERROR**\nFailed to set loop mode.\n\nPlease try again or contact support.')
                    );

                const reply = await interaction.editReply({ 
                    components: [errorContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
            }
        } catch (error) {
            console.error('Loop command error:', error);
        }
    }
};
