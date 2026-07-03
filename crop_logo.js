const sharp = require('sharp');
const path = require('path');

const run = async () => {
  try {
    // Read the original image
    const imgPath = path.join(__dirname, 'public/images/logo-loader.jpg');
    
    // Extract the center square (472x472) from 472x1024
    // Top offset = (1024 - 472) / 2 = 276
    const extracted = sharp(imgPath).extract({ left: 0, top: 276, width: 472, height: 472 }).ensureAlpha();
    
    const { data, info } = await extracted.raw().toBuffer({ resolveWithObject: true });
    
    // Make white pixels transparent
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if (r > 230 && g > 230 && b > 230) {
        data[i+3] = 0; // Alpha to 0
      } else {
        data[i+3] = 255;
      }
    }
    
    const outPath = path.join(__dirname, 'public/images/logo-fwd-icon.png');
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toFile(outPath);
      
    console.log('Successfully cropped and removed background: ' + outPath);
  } catch (e) {
    console.error('Error processing image:', e);
  }
};

run();
