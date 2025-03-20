// [file name]: osc-bridge.js

// 在代码开头添加
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 30; // 调整为适当值

const WebSocket = require('ws');
const express = require('express');
const dgram = require('dgram');
const fs = require('fs/promises');
const path = require('path');

// ===================== 配置 =====================
const HTTP_PORT = 8080;               // WebSocket服务端口
const UDP_TARGET_PORT = 7876;         // 目标设备OSC端口
const UDP_LISTEN_PORT = 7877;         // 本地监听端口
const PRESETS_DIR = path.join(__dirname, '../presets');
const TARGET_IP = '127.0.0.1';    // 目标设备IP

// ===================== 初始化 =====================
const app = express();
const udpClient = dgram.createSocket('udp4');  // 发送客户端
const udpServer = dgram.createSocket('udp4');  // 接收服务端
// 添加 CORS 支持
// 替换原有简单CORS配置
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
// ===================== UDP 服务 =====================
// 启动UDP监听
udpServer.bind(UDP_LISTEN_PORT, () => {
  console.log(`🎧 UDP 监听已启动 (端口 ${UDP_LISTEN_PORT})`);
});

// 处理收到的OSC消息
udpServer.on('message', (msg, rinfo) => {
  console.log(`← 收到 OSC 消息 [${rinfo.address}:${rinfo.port}] ${msg.length}字节`);
  
  // 广播给所有WebSocket客户端
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
      console.log(`✅ 收到UDP消息转发成功（${msg.length}字节）`);
    }
  });
});
// ===================== WebSocket 服务 =====================
const server = app.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`🌐 HTTP服务已启动，端口：${HTTP_PORT}`);
  console.log(`🎯 OSC 转发目标：udp://${TARGET_IP}:${UDP_TARGET_PORT}`);
  console.log(`📁 预设存储路径：${PRESETS_DIR}`);
});

// WebSocket服务
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  console.log('📡 客户端已连接');

  ws.on('message', (msg) => {
    // 转发到目标UDP端口
    udpClient.send(msg, UDP_TARGET_PORT, TARGET_IP, (err) => {
      err ? console.error('❌ 转发失败:', err) : console.log(`✅ 收到WS消息并转发成功（${msg.length}字节）`);
    });
  });

  ws.on('close', () => console.log('📡 客户端断开连接'));
});

// 确保预设目录存在
async function ensurePresetsDir() {
  try {
    await fs.access(PRESETS_DIR);
    console.log(`✓ 预设目录已验证存在：${PRESETS_DIR}`);
  } catch {
    await fs.mkdir(PRESETS_DIR, { recursive: true });
    console.log(`📁 创建预设目录：${PRESETS_DIR}`);
  }
}

// 获取预设
app.get('/presets/:role', async (req, res) => {
  await ensurePresetsDir();
  const safeRole = req.params.role.replace(/[^a-zA-Z]/g, '');
  const filePath = path.join(PRESETS_DIR, `${safeRole}.json`);
  
  console.log(`🔍 尝试读取预设文件：${filePath}`);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    console.log(`📤 发送预设：${safeRole}.json`);
    console.log(`📄 文件内容：${data}`); // 打印文件内容
    res.json(JSON.parse(data));
  } catch (err) {
    console.error(`⚠️ 预设不存在或读取失败：${safeRole} | 错误详情：${err.message}`);
    res.status(404).send('Preset not found');
  }
});

// 保存预设（修改正则允许数字）
app.post('/api/presets/:role', async (req, res) => {
  console.log('[🔵] 收到保存请求，角色:', req.params.role);
  const safeRole = req.params.role.replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '_');
  const filePath = path.join(PRESETS_DIR, `${safeRole}.json`);

  try {
    const data = JSON.stringify(req.body, null, 2);
    await fs.writeFile(filePath, data);
    console.log(`[✅] 预设保存成功：${safeRole}.json`);
    res.send('Preset saved');
  } catch (err) {
    console.error(`[❌] 保存失败：${err.message}`);
    res.status(500).send('Save failed');
  }
});

// ===================== 错误处理 =====================
process.on('uncaughtException', (err) => {
  console.error('‼️ 未捕获异常:', err.message);
});

udpServer.on('error', (err) => {
  console.error('‼️ UDP 服务错误:', err.message);
});

udpClient.on('error', (err) => {
  console.error('‼️ UDP 客户端错误:', err.message);
});

// 启动时强制读取 Vocal.json 测试
(async () => {
  await ensurePresetsDir();
  console.log('✅ 服务初始化完成');
  console.log('├── WebSocket 端口:', HTTP_PORT);
  console.log('├── UDP 监听端口:', UDP_LISTEN_PORT);
  console.log('└── 预设存储路径:', PRESETS_DIR);
  const filePath = path.join(PRESETS_DIR, 'Vocal.json');
  try {
    const data = await fs.readFile(filePath, 'utf8');
    console.log(`[✅] 启动时成功读取 Vocal.json，内容：${data}`);
  } catch (err) {
    console.error(`[❌] 启动时读取 Vocal.json 失败：${err.message}`);
  }
})();