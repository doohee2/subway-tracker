const { Jimp } = require("jimp");
const path = require("path");

async function resize() {
  const src = "C:\\Users\\doohe\\.gemini\\antigravity\\brain\\23a9b557-9c74-498c-b171-d7216416079d\\subway_tracker_icon_1783589154063.png";
  const publicDir = "c:\\Users\\doohe\\OneDrive\\Desktop\\바이브코딩\\subway tracker\\public";
  
  const image = await Jimp.read(src);
  
  image.clone().resize({ w: 192, h: 192 }).write(path.join(publicDir, "icon-192x192.png"));
  image.clone().resize({ w: 512, h: 512 }).write(path.join(publicDir, "icon-512x512.png"));
  image.clone().resize({ w: 180, h: 180 }).write(path.join(publicDir, "apple-icon.png"));
  
  console.log("Resizing complete!");
}

resize().catch(console.error);
