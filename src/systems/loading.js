// Shared flag for the background art loader (scenes/BgLoad.js): the title screen appears after the few core
// images; everything else loads while the player reads it, and go() waits here if they are faster than the network.
// `failed` lists the pictures that still would not load after the retries (a flaky connection): go() then offers a retry.
export const Assets = { ready: false, progress: 0, failed: [] };

/** Which of these picture ids have no texture yet (they failed to load)? */
export const missingTextures = (scene, ids) => ids.filter((id) => !scene.textures.exists(id));
