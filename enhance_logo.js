const sharp = require('sharp');
const path = require('path');

const run = async () => {
  try {
    const imgPath = path.join(__dirname, 'public/images/logo-loader.jpg');
    
    // Crop the center square
    const extracted = sharp(imgPath).extract({ left: 0, top: 276, width: 472, height: 472 }).ensureAlpha();
    
    // Apply modulate (saturation +15%, brightness +5%) directly to the pixel data!
    const modulated = extracted.modulate({
      brightness: 1.05,
      saturation: 1.15
    });

    const { data, info } = await modulated.raw().toBuffer({ resolveWithObject: true });
    
    // Remove white background aggressively to avoid halos
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      // If the pixel is close to white/gray (background), make it transparent
      if (r > 180 && g > 180 && b > 180) {
        data[i+3] = 0;
      } else {
        data[i+3] = 255;
      }
    }
    
    const outPath = path.join(__dirname, 'public/images/logo-fwd-icon.png');
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toFile(outPath);
      
    console.log('Successfully enhanced, cropped and removed background: ' + outPath);
  } catch (e) {
    console.error('Error processing image:', e);
  }
};

run();
