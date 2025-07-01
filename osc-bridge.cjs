// [file name]: osc-bridge.js

// 在代码开头添加
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 30; // 调整为适当值

const WebSocket = require('ws');
const express = require('express');
const dgram = require('dgram');
const fs = require('fs/promises');
const path = require('path');
const OSC = require('osc-js'); // 引入 osc-js

// ===================== 配置 =====================
const HTTP_PORT = 9122;               // WebSocket服务端口
const UDP_TARGET_PORT = 7878;         // 目标设备OSC端口
const UDP_LISTEN_PORT = 7879;         // 本地监听端口
const PRESETS_DIR = 'C:/Web/Vue/Reaper Web/presets';
const TARGET_IP = '127.0.0.1';    // 目标设备IP

// ===================== 初始化 =====================
const app = express();
const udpClient = dgram.createSocket('udp4');  // 发送客户端
const udpServer = dgram.createSocket('udp4');  // 接收服务端
const osc = new OSC(); // 创建osc实例用于解析消息
let wsClientId = 0; // WebSocket客户端ID计数器

// 日志广播函数（将在WebSocket服务器初始化后定义）
let broadcastLog;

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

//app.get('*', (req, res) => {
//  console.log('收到未处理请求:', req.originalUrl);
//  res.status(404).send('Not Found');
//});

app.use(express.json());
// ===================== UDP 服务 =====================
// 启动UDP监听
udpServer.bind(UDP_LISTEN_PORT, () => {
  console.log(`🎧 UDP 监听已启动 (端口 ${UDP_LISTEN_PORT})`);
});

// 处理收到的OSC消息
udpServer.on('message', (msg, rinfo) => {
  try {
    const dataView = new DataView(msg.buffer, msg.byteOffset, msg.byteLength);
    const message = new OSC.Message();
    message.unpack(dataView);
    if (message.address) { // 单条消息
      const argsString = message.args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(', ');
      const logMessage = `← 收到 OSC [${rinfo.address}:${rinfo.port}] | 地址: ${message.address} | 值: ${argsString}`;
      console.log(logMessage);
      broadcastLog(logMessage);
    } else { // OSC Bundle
      const logMessage = `← 收到 OSC Bundle [${rinfo.address}:${rinfo.port}]`;
      console.log(logMessage);
      broadcastLog(logMessage);
      message.packets.forEach((packet, i) => {
        const argsString = packet.args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(', ');
        const packetLog = `  - 包 #${i + 1}: 地址: ${packet.address} | 值: ${argsString}`;
        console.log(packetLog);
        broadcastLog(packetLog);
      });
    }
  } catch (error) {
    const errorMessage = `← [!] 收到无法解析的OSC消息 [${rinfo.address}:${rinfo.port}] (${msg.length}字节)`;
    console.error(errorMessage);
    broadcastLog(errorMessage);
    console.error(`  - 错误详情: ${error.message}`);
    console.error(`  - 原始消息 (Hex): ${msg.toString('hex')}`);
  }

  // 广播给所有WebSocket客户端
  let forwardedCount = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
      forwardedCount++;
    }
  });

  if (forwardedCount > 0) {
    console.log(`✅ 已将UDP消息转发给 ${forwardedCount} 个WebSocket客户端`);
  }
});
// ===================== WebSocket 服务 =====================
const server = app.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`🌐 HTTP服务已启动，端口：${HTTP_PORT}`);
  console.log(`🎯 OSC 转发目标：udp://${TARGET_IP}:${UDP_TARGET_PORT}`);
  console.log(`📁 预设存储路径：${PRESETS_DIR}`);
});

// WebSocket服务
const wss = new WebSocket.Server({ server });

// 定义日志广播函数
broadcastLog = function(logMessage) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        // 发送文本日志消息
        client.send(JSON.stringify({ type: 'log', message: logMessage }));
      } catch (error) {
        console.error('发送日志消息失败:', error);
      }
    }
  });
};

wss.on('connection', (ws) => {
  ws.id = ++wsClientId;
  console.log(`📡 客户端 #${ws.id} 已连接`);

  ws.on('message', (msg) => {
    // 转发到目标UDP端口
    udpClient.send(msg, UDP_TARGET_PORT, TARGET_IP, (err) => {
      if (err) {
        console.error(`❌ [WS #${ws.id}] 转发失败:`, err);
        return;
      }
      try {
        const dataView = new DataView(msg.buffer, msg.byteOffset, msg.byteLength);
        const message = new OSC.Message();
        message.unpack(dataView);
        if (message.address) { // 单条消息
          const argsString = message.args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(', ');
          const logMessage = `→ [WS #${ws.id}] 转发 OSC 到 [${TARGET_IP}:${UDP_TARGET_PORT}] | 地址: ${message.address} | 值: ${argsString}`;
          console.log(logMessage);
          broadcastLog(logMessage);
        } else { // OSC Bundle
          const logMessage = `→ [WS #${ws.id}] 转发 OSC Bundle 到 [${TARGET_IP}:${UDP_TARGET_PORT}]`;
          console.log(logMessage);
          broadcastLog(logMessage);
          message.packets.forEach((packet, i) => {
            const argsString = packet.args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(', ');
            const packetLog = `  - 包 #${i + 1}: 地址: ${packet.address} | 值: ${argsString}`;
            console.log(packetLog);
            broadcastLog(packetLog);
          });
        }
      } catch (error) {
        const warnMessage = `→ [WS #${ws.id}] 转发了无法解析的WS消息到UDP (${msg.length}字节)`;
        console.warn(warnMessage);
        broadcastLog(warnMessage);
        console.warn(`  - 错误详情: ${error.message}`);
        console.warn(`  - 原始消息 (Hex): ${msg.toString('hex')}`);
      }
    });
  });

  ws.on('close', () => console.log(`📡 客户端 #${ws.id} 断开连接`));
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
app.post('/presets/:role', async (req, res) => {
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