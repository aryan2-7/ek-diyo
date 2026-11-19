// Shared flag for the background art loader (scenes/BgLoad.js): the title screen appears after the few core
// images; everything else loads while the player reads it, and go() waits here if they are faster than the network.
export const Assets = { ready: false, progress: 0 };
