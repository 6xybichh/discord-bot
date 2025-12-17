const fs = require('fs');
const path = require('path');

async function startTranscriptCleanup() {
    const transcriptsDir = path.join(__dirname, '../transcripts');
    
    // Check every hour
    setInterval(() => {
        cleanupOldTranscripts(transcriptsDir);
    }, 60 * 60 * 1000);
    
    // Run once on startup
    cleanupOldTranscripts(transcriptsDir);
}

function cleanupOldTranscripts(transcriptsDir) {
    try {
        if (!fs.existsSync(transcriptsDir)) {
            return;
        }

        const TRANSCRIPT_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const now = Date.now();
        const files = fs.readdirSync(transcriptsDir);

        for (const file of files) {
            const filePath = path.join(transcriptsDir, file);
            const stats = fs.statSync(filePath);
            
            // If file is older than 24 hours, delete it
            if (now - stats.mtimeMs > TRANSCRIPT_TIMEOUT) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Deleted old transcript: ${file}`);
            }
        }
    } catch (err) {
        console.error('Error cleaning up old transcripts:', err);
    }
}

module.exports = { startTranscriptCleanup };
