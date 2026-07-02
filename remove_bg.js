const sharp = require('sharp');
const run = async () => {
  try {
    const img = sharp('public/images/logo-loader.jpg').ensureAlpha();
    const meta = await img.metadata();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if (r > 225 && g > 225 && b > 225) {
        data[i+3] = 0; 
      } else {
        data[i+3] = 255;
      }
    }
    
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toFile('public/images/logo-loader-transparent.png');
      
    console.log('Done');
  } catch (e) {
    console.error(e);
  }
};
run();
