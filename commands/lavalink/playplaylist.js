const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require('discord.js');
const { playlistCollection } = require('../../mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playplaylist')
        .setDescription('Play a saved playlist.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Playlist name.')
                .setRequired(true)),

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
    },

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const userId = interaction.user.id;
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

            const getOrCreatePlayer = async () => {
                let player = client.riffy.players.get(guildId);
                
                if (!player) {
                    try {
                        player = await client.riffy.createConnection({
                            guildId,
                            voiceChannel: channel.id,
                            textChannel: interaction.channel.id,
                            deaf: true
                        });
                    } catch (error) {
                        console.error('Error creating player:', error);
                        
                        const errorContainer = new ContainerBuilder()
                            .setAccentColor(0xff4757)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent('**❌ CONNECTION FAILED**\nUnable to connect to the voice channel.\n\nPlease try again or contact support.')
                            );

                        await interaction.editReply({ 
                            components: [errorContainer], 
                            flags: MessageFlags.IsComponentsV2 
                        });
                        return null;
                    }
                }
                
                return player;
            };

            if (!await checkVoiceChannel()) return;
            
            try {
                const name = interaction.options.getString('name');
                const playlist = await playlistCollection.findOne({ name });
            
                if (!playlist) {
                    const notFoundContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`**❌ PLAYLIST NOT FOUND**\nPlaylist **"${name}"** doesn't exist.\n\nUse \`/viewmyplaylists\` to see available playlists.`)
                        );

                    const reply = await interaction.editReply({ 
                        components: [notFoundContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 6000);
                    return;
                }
            
                if (playlist.visibility === 'private' && playlist.owner !== userId) {
                    const privateContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`**❌ PRIVATE PLAYLIST**\nYou don't have permission to play this private playlist.\n\nOnly the owner can access private playlists.`)
                        );

                    const reply = await interaction.editReply({ 
                        components: [privateContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 6000);
                    return;
                }
            
                if (playlist.songs.length === 0) {
                    const emptyContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`**❌ EMPTY PLAYLIST**\nPlaylist **"${name}"** contains no songs.\n\nUse \`/addsong\` to add tracks first.`)
                        );

                    const reply = await interaction.editReply({ 
                        components: [emptyContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 6000);
                    return;
                }
            
                let player = await getOrCreatePlayer();
                if (!player) return;
            
                const loadingContainer = new ContainerBuilder()
                    .setAccentColor(0xffa500)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**🔄 LOADING PLAYLIST**\nResolving ${playlist.songs.length} tracks from **${name}**...\n\nThis may take a moment for large playlists.`)
                    );

                await interaction.editReply({ 
                    components: [loadingContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
            
                let addedTracks = 0;
                let failedTracks = 0;
                
                for (const song of playlist.songs) {
                    try {
                        const resolve = await client.riffy.resolve({ query: song, requester: interaction.user });
            
                        if (resolve.tracks.length > 0) {
                            const track = resolve.tracks[0];
                            track.requester = {
                                id: interaction.user.id,
                                username: interaction.user.username,
                                avatarURL: interaction.user.displayAvatarURL()
                            };
                            player.queue.add(track);
                            addedTracks++;
                        } else {
                            failedTracks++;
                        }
                    } catch (error) {
                        console.warn(`Failed to resolve track: ${song}`, error);
                        failedTracks++;
                    }
                }
            
                if (addedTracks === 0) {
                    const noTracksContainer = new ContainerBuilder()
                        .setAccentColor(0xff4757)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`**❌ PLAYLIST LOAD FAILED**\nCouldn't resolve any valid tracks from **"${name}"**.\n\nTracks may be unavailable or URLs may be invalid.`)
                        );

                    const reply = await interaction.editReply({ 
                        components: [noTracksContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                    setTimeout(() => reply.delete().catch(() => {}), 8000);
                    return;
                }
            
                const playlistContainer = new ContainerBuilder()
                    .setAccentColor(0x2ecc71)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**📋 PLAYLIST LOADED**')
                    )
                    .addSeparatorComponents(separator => separator)
                    .addSectionComponents(
                        section => section
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent(`**${name}** is now playing!\n\n**Loading Summary:**\n• ✅ Successfully loaded: **${addedTracks}** tracks\n${failedTracks > 0 ? `• ❌ Failed to load: **${failedTracks}** tracks\n` : ''}• 🎵 Now in queue: **${player.queue.length}** total\n• ⏱️ Estimated duration: **~${Math.round(addedTracks * 3.5)} minutes**\n\n**Status:** ${player.playing ? 'Playing' : 'Starting playback...'}`
                                )
                            )
                            .setThumbnailAccessory(
                                thumbnail => thumbnail
                                    .setURL(interaction.user.displayAvatarURL({ dynamic: true }))
                                    .setDescription('Requested by')
                            )
                    );

                const reply = await interaction.editReply({ 
                    components: [playlistContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 12000);
                
                if (!player.playing && !player.paused) {
                    player.play();
                }
            } catch (error) {
                console.error('Error playing playlist:', error);
                
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xff4757)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('**❌ PLAYLIST ERROR**\nFailed to play playlist due to an unexpected error.\n\nPlease try again later.')
                    );

                const reply = await interaction.editReply({ 
                    components: [errorContainer], 
                    flags: MessageFlags.IsComponentsV2 
                });
                setTimeout(() => reply.delete().catch(() => {}), 6000);
            }
        } catch (error) {
            console.error('Playplaylist command error:', error);
        }
    }
};
