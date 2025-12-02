const fs = require('fs');
const path = require('path');

// 检查是否安装了 puppeteer
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.log('需要安装 puppeteer，正在安装...');
  const { execSync } = require('child_process');
  execSync('npm install puppeteer', { stdio: 'inherit' });
  puppeteer = require('puppeteer');
}

// 读取 SVG 文件内容
const svgContent = fs.readFileSync('OSC-Bridge.svg', 'utf8');

// 定义需要生成的图标尺寸
const iconSizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 }
];

// 创建 HTML 内容
const createHTML = (svgContent, size) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      margin: 0; 
      padding: 0; 
      background: transparent; 
      display: flex;
      justify-content: center;
      align-items: center;
      width: ${size}px;
      height: ${size}px;
    }
    svg { 
      width: ${size}px; 
      height: ${size}px; 
    }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>
`;

async function convertIcons() {
  console.log('启动浏览器...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // 设置视口大小
  await page.setViewport({ width: 512, height: 512 });
  
  console.log('开始转换图标...');
  
  for (const icon of iconSizes) {
    try {
      const htmlContent = createHTML(svgContent, icon.size);
      const outputPath = path.join('src-tauri', 'icons', icon.name);
      
      // 设置页面内容
      await page.setContent(htmlContent);
      
      // 截图
      await page.screenshot({
        path: outputPath,
        type: 'png',
        omitBackground: true,
        clip: {
          x: 0,
          y: 0,
          width: icon.size,
          height: icon.size
        }
      });
      
      console.log(`✓ 已生成 ${icon.name}`);
    } catch (error) {
      console.error(`✗ 生成 ${icon.name} 失败:`, error.message);
    }
  }
  
  await browser.close();
  console.log('图标转换完成！');
}

convertIcons().catch(console.error); 