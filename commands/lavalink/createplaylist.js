const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const { playlistCollection } = require('../../mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createplaylist')
        .setDescription('Create a new playlist.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Playlist name.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('visibility')
                .setDescription('Choose if the playlist is public or private.')
                .setRequired(true)
                .addChoices(
                    { name: 'Public', value: 'public' },
                    { name: 'Private', value: 'private' }
                )),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const userId = interaction.user.id;

            const name = interaction.options.getString('name');
            const visibility = interaction.options.getString('visibility');

            const existingPlaylist = await playlistCollection.findOne({ name, owner: userId });
            if (existingPlaylist) {
                const existsContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**❌ PLAYLIST EXISTS**\nA playlist named **"${name}"** already exists in your collection.\n\nPlease choose a different name or delete the existing playlist first.`)
                    );

                const reply = await interaction.editReply({ 
                    components: [existsContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 6000);
                return;
            }

            await playlistCollection.insertOne({
                name,
                owner: userId,
                visibility,
                songs: [],
                createdAt: new Date()
            });

            const createContainer = new ContainerBuilder()
                .setAccentColor(0x2ecc71)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**📋 PLAYLIST CREATED**')
                )
                .addSeparatorComponents(separator => separator)
                .addSectionComponents(
                    section => section
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`**${name}** has been created successfully!\n\n**Details:**\n• Name: **${name}**\n• Visibility: **${visibility.toUpperCase()}**\n• Owner: ${interaction.user.username}\n• Songs: 0 (empty)\n• Status: Ready for tracks\n\n**Next Steps:**\n• Use \`/addsong\` to add tracks\n• Use \`/playplaylist\` to play it`)
                        )
                        .setThumbnailAccessory(
                            thumbnail => thumbnail
                                .setURL(interaction.user.displayAvatarURL({ dynamic: true }))
                                .setDescription('Created by')
                        )
                );

            const reply = await interaction.editReply({ 
                components: [createContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 10000);
        } catch (error) {
            console.error('Error creating playlist:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xff4757)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**❌ CREATION FAILED**\nFailed to create playlist due to a database error.\n\nPlease try again later.')
                );

            const reply = await interaction.editReply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        }
    }
};
