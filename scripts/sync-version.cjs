const fs = require('fs');
const path = require('path');

// 从 package.json 获取权威的新版本号
const { version: newVersion } = require('../package.json');

if (!newVersion) {
  console.error('错误：无法从 package.json 中读取版本号。');
  process.exit(1);
}

console.log(`[Version Sync] 开始同步版本号至 v${newVersion}...`);

// --- 同步 tauri.conf.json ---
try {
  const tauriConfPath = path.resolve(__dirname, '..', 'Source', 'Tauri', 'tauri.conf.json');
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
  
  console.log(`  -> 正在更新 tauri.conf.json (旧: v${tauriConf.version}, 新: v${newVersion})`);
  tauriConf.version = newVersion;
  
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log(`  ✅ 成功更新 ${path.basename(tauriConfPath)}`);
} catch (error) {
  console.error(`  ❌ 更新 tauri.conf.json 失败:`, error);
  process.exit(1);
}

// --- 同步 Cargo.toml ---
try {
  const cargoTomlPath = path.resolve(__dirname, '..', 'Source', 'Tauri', 'Cargo.toml');
  let cargoToml = fs.readFileSync(cargoTomlPath, 'utf-8');
  
  const oldVersionMatch = cargoToml.match(/^(version\s*=\s*")[^"]+/m);
  console.log(`  -> 正在更新 Cargo.toml (旧: v${oldVersionMatch ? oldVersionMatch[0].split('"')[1] : '未知'}, 新: v${newVersion})`);

  // 使用正则表达式安全地替换版本号，保留文件其他内容
  cargoToml = cargoToml.replace(/^(version\s*=\s*")[^"]+(".*)$/m, `$1${newVersion}$2`);
  
  fs.writeFileSync(cargoTomlPath, cargoToml);
  console.log(`  ✅ 成功更新 ${path.basename(cargoTomlPath)}`);
} catch (error) {
  console.error(`  ❌ 更新 Cargo.toml 失败:`, error);
  process.exit(1);
}

console.log(`[Version Sync] 所有版本号已成功同步至 v${newVersion}。`); 