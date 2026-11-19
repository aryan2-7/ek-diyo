// The "album": a small picture of the winning moment of each night, kept for the story cards, the ending and the greeting card.
export const Album = {
  shots: {}, // night -> texture key
  lamp: null, // canvas with the five-wick lamp (taken on the ending screen)

  /** Photograph the scene as it looks right now (taken at the end of the next frame). */
  capture(scene, night) {
    try {
      scene.game.renderer.snapshot((img) => {
        try {
          const c = document.createElement('canvas');
          c.width = 960;
          c.height = 520;
          // crop out the HUD strip at the top and the hint strip at the bottom
          c.getContext('2d').drawImage(img, 0, img.height * 0.11, img.width, img.height * 0.76, 0, 0, c.width, c.height);
          const key = `album_${night}`;
          if (scene.game.textures.exists(key)) scene.game.textures.remove(key);
          scene.game.textures.addCanvas(key, c);
          this.shots[night] = key;
        } catch {
          /* a missing picture is fine */
        }
      });
    } catch {
      /* snapshot not available */
    }
  },
};
