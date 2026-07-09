const { Jimp } = require("jimp");

async function check() {
  const image = await Jimp.read("public/apple-icon.png");
  const hex = image.getPixelColor(0, 0).toString(16);
  console.log("Background color hex (RGBA):", hex);
}
check().catch(console.error);
