/**
 * GitHub Gist API client for reading/writing posts.
 */

const API_BASE = 'https://api.github.com';

/**
 * Fetch all files from a Gist.
 */
export async function fetchGist(gistId, token) {
    const res = await fetch(`${API_BASE}/gists/${gistId}`, {
        headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch gist: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

/**
 * Update files in a Gist. Pass `null` as content to delete a file.
 * Files is an object: { "filename.json": { content: "..." } }
 */
export async function updateGist(gistId, token, files) {
    const res = await fetch(`${API_BASE}/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files }),
    });

    if (!res.ok) {
        throw new Error(`Failed to update gist: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

/**
 * Parse post files from a Gist response.
 * Returns an array of post objects with their metadata and content.
 */
export function parsePostsFromGist(gistData, weekKey) {
    const posts = [];
    const files = gistData.files || {};

    for (const [filename, fileData] of Object.entries(files)) {
        // Only parse JSON files that match our naming convention
        if (!filename.endsWith('.json') || !filename.startsWith(weekKey)) continue;

        try {
            const post = JSON.parse(fileData.content);
            post._filename = filename;

            // For voice posts, collect chunk files
            if (post.type === 'voice') {
                const chunkPrefix = filename.replace('.json', '');
                post._chunks = [];
                let allChunksFound = true;

                for (let i = 0; i < post.chunks; i++) {
                    const chunkFile = `${chunkPrefix}_chunk${i}.txt`;
                    if (files[chunkFile]) {
                        // GitHub Gist API can truncate content if it's large or if many files exist
                        post._chunks.push({
                            content: files[chunkFile].content,
                            truncated: files[chunkFile].truncated,
                            raw_url: files[chunkFile].raw_url,
                            size: files[chunkFile].size
                        });
                    } else {
                        allChunksFound = false;
                        break;
                    }
                }

                // Only add the post if all chunks are found
                if (!allChunksFound || post._chunks.length !== post.chunks) {
                    continue;
                }
            }

            posts.push(post);
        } catch {
            // Skip malformed files
        }
    }

    return posts.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Check if a user has posted this week.
 */
export function hasUserPosted(gistData, weekKey, username) {
    const files = gistData.files || {};
    const userPrefix = `${weekKey}_${username.replace(' ', '_')}`;
    return Object.keys(files).some(
        f => f.startsWith(userPrefix) && f.endsWith('.json')
    );
}

/**
 * Create a text post.
 */
export async function createTextPost(gistId, token, weekKey, username, content) {
    const timestamp = Date.now();
    const safeUser = username.replace(' ', '_');
    const filename = `${weekKey}_${safeUser}_${timestamp}.json`;

    const post = {
        type: 'text',
        author: username,
        content,
        timestamp,
        weekKey,
    };

    return updateGist(gistId, token, {
        [filename]: { content: JSON.stringify(post, null, 2) },
    });
}

/**
 * Create a voice post with chunked audio data.
 * @param {string} audioBase64 - Full Base64-encoded audio data
 * @param {string} mimeType - Audio MIME type
 */
export async function createVoicePost(gistId, token, weekKey, username, audioBase64, mimeType) {
    const timestamp = Date.now();
    const safeUser = username.replace(' ', '_');
    const baseFilename = `${weekKey}_${safeUser}_${timestamp}`;

    // Chunk the audio data into < 700KB segments (Base64 chars)
    const CHUNK_SIZE = 700 * 1024; // ~700KB per chunk
    const chunks = [];
    for (let i = 0; i < audioBase64.length; i += CHUNK_SIZE) {
        chunks.push(audioBase64.slice(i, i + CHUNK_SIZE));
    }

    const files = {};

    // Metadata file
    files[`${baseFilename}.json`] = {
        content: JSON.stringify({
            type: 'voice',
            author: username,
            chunks: chunks.length,
            mimeType,
            timestamp,
            weekKey,
        }, null, 2),
    };

    // Chunk files
    chunks.forEach((chunk, i) => {
        files[`${baseFilename}_chunk${i}.txt`] = { content: chunk };
    });

    return updateGist(gistId, token, files);
}

/**
 * Clean up posts older than 2 weeks.
 */
export async function cleanupOldPosts(gistId, token, isWithinTwoWeeks) {
    const gistData = await fetchGist(gistId, token);
    const files = gistData.files || {};
    const filesToDelete = {};

    for (const filename of Object.keys(files)) {
        // Extract week key from filename (first part like "2026-W07")
        const match = filename.match(/^(\d{4}-W\d{2})_/);
        if (match) {
            const weekKey = match[1];
            if (!isWithinTwoWeeks(weekKey)) {
                filesToDelete[filename] = null; // null = delete
            }
        }
    }

    if (Object.keys(filesToDelete).length > 0) {
        await updateGist(gistId, token, filesToDelete);
        return Object.keys(filesToDelete).length;
    }

    return 0;
}
