const { Jimp } = require("jimp");
const path = require("path");

async function convert() {
  const image = await Jimp.read("public/apple-icon.png");
  
  // Find background color at (0,0)
  const bgColorInt = image.getPixelColor(0, 0);
  
  // Replace the background color with pure white #FFFFFF (0xFFFFFFFF)
  // Let's use a tolerance to handle slight variations if any
  image.scan((x, y) => {
    const color = image.getPixelColor(x, y);
    // Simple exact match replacement for now, or just flood fill like replacement.
    // Actually, if we just want to ensure it's white tone, let's replace all pixels close to bgColorInt with white.
    // To be safe, let's just do a simple distance check.
    const r1 = (color >> 24) & 0xff;
    const g1 = (color >> 16) & 0xff;
    const b1 = (color >> 8) & 0xff;
    const r2 = (bgColorInt >> 24) & 0xff;
    const g2 = (bgColorInt >> 16) & 0xff;
    const b2 = (bgColorInt >> 8) & 0xff;
    
    const dist = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    if (dist < 10) {
      image.setPixelColor(0xFFFFFFFF, x, y);
    }
  });

  const publicDir = path.join(__dirname, "public");
  
  // Overwrite the original
  await image.write(path.join(publicDir, "apple-icon.png"));
  
  // Create 192 and 512
  image.clone().resize({ w: 192, h: 192 }).write(path.join(publicDir, "icon-192x192.png"));
  image.clone().resize({ w: 512, h: 512 }).write(path.join(publicDir, "icon-512x512.png"));
  
  console.log("Conversion complete!");
}

convert().catch(console.error);
