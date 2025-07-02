// [文件名]: osc-bridge.js - 多端口动态配置OSC桥接器

// 在代码开头添加
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 50; // 调整为更大值以支持多端口

const WebSocket = require('ws');
const express = require('express');
const dgram = require('dgram');
const fs = require('fs/promises');
const path = require('path');
const OSC = require('osc-js'); // 引入 osc-js

// ===================== 配置管理 =====================
let CONFIG = {
  ListenPorts: ["127.0.0.1:7879"],
  TargetPorts: ["127.0.0.1:7878"], 
  WS: ["ws://localhost:9122"]
};

const CONFIG_FILE = './config.json';

// 读取配置文件
async function loadConfig() {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    CONFIG = JSON.parse(configData);
    console.log('✅ 配置文件加载成功:', CONFIG_FILE);
    console.log('📄 配置内容:', JSON.stringify(CONFIG, null, 2));
  } catch (error) {
    console.warn('⚠️ 配置文件读取失败，使用默认配置:', error.message);
    console.log('📄 默认配置:', JSON.stringify(CONFIG, null, 2));
  }
}

// ===================== 初始化变量 =====================
const app = express();
const udpServers = []; // 存储所有UDP监听服务器
const udpClients = []; // 存储所有UDP发送客户端
const osc = new OSC(); // 创建osc实例用于解析消息
let wsClientId = 0; // WebSocket客户端ID计数器
let wss; // WebSocket服务器实例

// 日志广播函数
let broadcastLog;

// 添加 CORS 支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// ===================== 动态UDP服务管理 =====================
// 解析地址字符串 "127.0.0.1:7879" -> {host: "127.0.0.1", port: 7879}
function parseAddress(address) {
  const [host, port] = address.split(':');
  return { host: host || '127.0.0.1', port: parseInt(port) };
}

// 创建UDP监听服务器
function createUDPListener(address, index) {
  const { host, port } = parseAddress(address);
  const server = dgram.createSocket('udp4');
  
  server.bind(port, host, () => {
    console.log(`🎧 UDP监听器 #${index + 1} 已启动 (${host}:${port})`);
  });

  // 处理收到的OSC消息
  server.on('message', (msg, rinfo) => {
    try {
      const dataView = new DataView(msg.buffer, msg.byteOffset, msg.byteLength);
      const message = new OSC.Message();
      message.unpack(dataView);
      
             if (message.address) { // 单条消息
         const argsString = message.args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(', ');
         const argTypes = message.args.map(arg => {
           if (typeof arg === 'number') return Number.isInteger(arg) ? 'Int' : 'Float';
           if (typeof arg === 'string') return 'String';
           if (typeof arg === 'boolean') return 'Boolean';
           return 'Object';
         }).join(', ');
         
         // 计算转发到的WebSocket客户端数量
         let wsForwardedCount = 0;
         let totalWSClients = 0;
         if (wss) {
           wss.clients.forEach(client => {
             if (client.readyState === WebSocket.OPEN && !client.isFrontendClient) {
               totalWSClients++;
               client.send(msg);
               wsForwardedCount++;
             }
           });
         }
         
         const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
         const logMessage = `[${host}:${port}] -> 转发OSC到 ${wsForwardedCount}/${totalWSClients} 个WS | 地址: ${message.address} | 值: ${argsString} | 类型: ${argTypes}`;
         console.log(`[${timestamp}] ${logMessage}`);
         broadcastLog(logMessage, 'osc');
             } else { // OSC Bundle
         // 计算转发到的WebSocket客户端数量（Bundle）
         let wsForwardedCount = 0;
         let totalWSClients = 0;
         if (wss) {
           wss.clients.forEach(client => {
             if (client.readyState === WebSocket.OPEN && !client.isFrontendClient) {
               totalWSClients++;
               client.send(msg);
               wsForwardedCount++;
             }
           });
         }
         
         const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
         const logMessage = `[${host}:${port}] -> 转发OSC Bundle到 ${wsForwardedCount}/${totalWSClients} 个WS`;
         console.log(`[${timestamp}] ${logMessage}`);
         broadcastLog(logMessage, 'osc');
         message.packets.forEach((packet, i) => {
           const argsString = packet.args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(', ');
           const argTypes = packet.args.map(arg => {
             if (typeof arg === 'number') return Number.isInteger(arg) ? 'Int' : 'Float';
             if (typeof arg === 'string') return 'String';
             if (typeof arg === 'boolean') return 'Boolean';
             return 'Object';
           }).join(', ');
           const packetLog = `  - 包 #${i + 1}: 地址: ${packet.address} | 值: ${argsString} | 类型: ${argTypes}`;
           console.log(packetLog);
           broadcastLog(packetLog, 'osc');
         });
      }
         } catch (error) {
                const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
         const errorMessage = `[!][${host}:${port}] 无法解析OSC消息 (${msg.length}字节)`;
         console.error(`[${timestamp}] ${errorMessage}`);
         broadcastLog(errorMessage, 'osc');
       console.error(`  - 错误详情: ${error.message}`);
     }

         // 转发逻辑已移至日志处理中，避免重复转发
  });

  server.on('error', (err) => {
    console.error(`‼️ UDP监听器 #${index + 1} (${host}:${port}) 错误:`, err.message);
  });

  return server;
}

// 创建UDP发送客户端
function createUDPClient(address, index) {
  const { host, port } = parseAddress(address);
  const client = dgram.createSocket('udp4');
  
  client.targetHost = host;
  client.targetPort = port;
  client.index = index;
  
  console.log(`🎯 UDP发送器 #${index + 1} 已创建 (目标: ${host}:${port})`);
  
  client.on('error', (err) => {
    console.error(`‼️ UDP发送器 #${index + 1} (${host}:${port}) 错误:`, err.message);
  });
  
  return client;
}

// 启动所有UDP服务
async function startUDPServices() {
  // 清理现有服务
  udpServers.forEach(server => server.close());
  udpClients.forEach(client => client.close());
  udpServers.length = 0;
  udpClients.length = 0;

  // 创建监听服务器
  console.log(`🚀 启动 ${CONFIG.ListenPorts.length} 个UDP监听器...`);
  CONFIG.ListenPorts.forEach((address, index) => {
    const server = createUDPListener(address, index);
    udpServers.push(server);
  });

  // 创建发送客户端
  console.log(`🚀 启动 ${CONFIG.TargetPorts.length} 个UDP发送器...`);
  CONFIG.TargetPorts.forEach((address, index) => {
    const client = createUDPClient(address, index);
    udpClients.push(client);
  });
  
  console.log('✅ 所有UDP服务已启动');
}

// ===================== WebSocket 服务 =====================
async function startWebSocketService() {
  // 从配置获取WebSocket端口（从URL中提取）
  const wsUrl = CONFIG.WS[0] || 'ws://localhost:9122';
  const wsPort = parseInt(wsUrl.split(':')[2]) || 9122;
  
  const server = app.listen(wsPort, '0.0.0.0', () => {
    console.log(`🌐 HTTP服务已启动，端口：${wsPort}`);
    console.log(`🎯 OSC 转发目标: ${CONFIG.TargetPorts.join(', ')}`);
    console.log(`🎧 OSC 监听端口: ${CONFIG.ListenPorts.join(', ')}`);
  });

  // WebSocket服务
  wss = new WebSocket.Server({ server });

  // 定义智能日志广播函数（只向前端客户端发送日志）
  broadcastLog = function(logMessage, logType = 'osc') {
    if (wss) {
      wss.clients.forEach(client => {
        // 只向前端客户端发送日志，跳过OSC客户端（如Loupedeck插件）
        if (client.readyState === WebSocket.OPEN && client.isFrontendClient) {
          try {
            client.send(JSON.stringify({ type: 'log', message: logMessage }));
          } catch (error) {
            console.error('发送日志消息失败:', error);
          }
        }
      });
    }
  };

     wss.on('connection', (ws, req) => {
     ws.id = ++wsClientId;
     const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
     const clientInfo = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
     const userAgent = req.headers['user-agent'] || '';
     
     // 智能识别客户端类型
     let clientType = 'Unknown';
     let isFrontendClient = false;
     
     if (userAgent.includes('Chrome') || userAgent.includes('Edge')) {
       clientType = 'Browser';
       isFrontendClient = true;
     } else if (userAgent.includes('tauri')) {
       clientType = 'Tauri';
       isFrontendClient = true;
     } else if (userAgent === '' || userAgent.includes('websocket')) {
       clientType = 'OSC_Client';
       isFrontendClient = false;  // 这是OSC客户端，不发送日志
     }
     
     // 标记客户端类型
     ws.clientType = clientType;
     ws.isFrontendClient = isFrontendClient;
     
     const logMessage = `📡 客户端 #${ws.id} 已连接 (${clientType} - ${clientInfo})`;
     console.log(`[${timestamp}] ${logMessage}`);
     broadcastLog(logMessage, 'system');

         ws.on('message', (msg) => {
       // All incoming messages are now treated as binary OSC packets.
       const messageToForward = msg; 
       let oscPacketForLog;
       
       try {
         const dataView = new DataView(msg.buffer, msg.byteOffset, msg.byteLength);
         oscPacketForLog = new OSC.Message();
         oscPacketForLog.unpack(dataView);
       } catch (error) {
         oscPacketForLog = null; // Mark as unparseable
       }

       // Forwarding & Logging Logic
       let successCount = 0;
       let completedCount = 0;
       let totalTargets = udpClients.length;

       if (totalTargets === 0) {
         const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
         const warnMessage = `[WS #${ws.id}] -> 没有配置转发目标端口`;
         console.warn(`[${timestamp}] ${warnMessage}`);
         broadcastLog(warnMessage, 'system');
         return;
       }

       udpClients.forEach((client, index) => {
         client.send(messageToForward, client.targetPort, client.targetHost, (err) => {
           if (err) {
             const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
             const errorMessage = `❌ [WS #${ws.id}] 转发失败: ${err.message}`;
             console.error(`[${timestamp}] ${errorMessage}`);
             broadcastLog(errorMessage, 'system');
           } else {
             successCount++;
           }
           
           completedCount++;
           
           if (completedCount === totalTargets) {
             const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
             
             if (oscPacketForLog && oscPacketForLog.address) { // Single message
               const argsString = oscPacketForLog.args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(', ');
               const argTypes = oscPacketForLog.args.map(arg => {
                 if (typeof arg === 'number') return Number.isInteger(arg) ? 'Int' : 'Float';
                 if (typeof arg === 'string') return 'String';
                 if (typeof arg === 'boolean') return 'Boolean';
                 return 'Object';
               }).join(', ');
               const logMessage = `[WS #${ws.id}] -> 转发OSC到 ${successCount}/${totalTargets} 个Target | 地址: ${oscPacketForLog.address} | 值: ${argsString} | 类型: ${argTypes}`;
               console.log(`[${timestamp}] ${logMessage}`);
               broadcastLog(logMessage, 'osc');

             } else if (oscPacketForLog) { // OSC Bundle
               const logMessage = `[WS #${ws.id}] -> 转发OSC Bundle到 ${successCount}/${totalTargets} 个Target`;
               console.log(`[${timestamp}] ${logMessage}`);
               broadcastLog(logMessage, 'osc');
               oscPacketForLog.packets.forEach((packet, i) => {
                 const argsString = packet.args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(', ');
                 const argTypes = packet.args.map(arg => {
                   if (typeof arg === 'number') return Number.isInteger(arg) ? 'Int' : 'Float';
                   if (typeof arg === 'string') return 'String';
                   if (typeof arg === 'boolean') return 'Boolean';
                   return 'Object';
                 }).join(', ');
                 const packetLog = `  - 包 #${i + 1}: 地址: ${packet.address} | 值: ${argsString} | 类型: ${argTypes}`;
                 console.log(packetLog);
                 broadcastLog(packetLog, 'osc');
               });
               
             } else { // Unparseable
               const warnMessage = `[WS #${ws.id}] -> 转发了无法解析的消息到 ${successCount}/${totalTargets} 个Target (${msg.length}字节)`;
               console.warn(`[${timestamp}] ${warnMessage}`);
               broadcastLog(warnMessage, 'osc');
             }
           }
         });
       });
     });

         ws.on('close', (code, reason) => {
                const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
         const reasonText = reason ? ` (原因: ${reason})` : '';
         const clientType = ws.clientType || 'Unknown';
         const logMessage = `📡 客户端 #${ws.id} 断开连接 (${clientType} - 代码: ${code}${reasonText})`;
         console.log(`[${timestamp}] ${logMessage}`);
         broadcastLog(logMessage, 'system');
     });
  });
}

// ===================== 预设管理 API =====================
// 已移除与预设管理相关的代码

// 配置热重载API
app.post('/reload-config', async (req, res) => {
  console.log('🔄 收到配置重载请求...');
  try {
    await loadConfig();
    await startUDPServices();
    console.log('✅ 配置重载完成');
    res.json({ success: true, message: '配置重载成功', config: CONFIG });
  } catch (error) {
    console.error('❌ 配置重载失败:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取当前配置API
app.get('/config', (req, res) => {
  res.json(CONFIG);
});

// 保存配置到config.json文件
app.post('/save-config', async (req, res) => {
  console.log('🔄 收到保存配置请求...');
  try {
    const newConfig = req.body;
    
    // 验证配置格式
    if (!newConfig.ListenPorts || !newConfig.TargetPorts || !newConfig.WS) {
      return res.status(400).json({ success: false, message: '配置格式错误' });
    }
    
    // 更新内存中的配置
    CONFIG = newConfig;
    
    // 保存到文件
    const configData = JSON.stringify(newConfig, null, 2);
    await fs.writeFile(CONFIG_FILE, configData);
    
    // 重启UDP服务以应用新配置
    await startUDPServices();
    
    console.log('✅ 配置保存成功');
    console.log('📄 新配置内容:', JSON.stringify(CONFIG, null, 2));
    
    res.json({ success: true, message: '配置保存成功', config: CONFIG });
  } catch (error) {
    console.error('❌ 配置保存失败:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== 错误处理 =====================
process.on('uncaughtException', (err) => {
  console.error('‼️ 未捕获异常:', err.message);
});

// ===================== 启动序列 =====================
(async () => {
  console.log('🚀 OSC Bridge 多端口动态配置系统启动中...');
  console.log('=====================================');
  
  try {
    // 1. 加载配置
    await loadConfig();
    
    // 2. 启动UDP服务
    await startUDPServices();
    
    // 3. 启动WebSocket服务
    await startWebSocketService();
    
    console.log('=====================================');
    console.log('✅ 系统初始化完成');
    console.log('📊 服务状态:');
    console.log(`├── WebSocket端口: ${CONFIG.WS[0]}`);
    console.log(`├── UDP监听端口: ${CONFIG.ListenPorts.join(', ')}`);
    console.log(`├── UDP转发目标: ${CONFIG.TargetPorts.join(', ')}`);
    console.log('');
    console.log('💡 可以通过 POST /reload-config 热重载配置');
    console.log('💡 可以通过 GET /config 查看当前配置');
    
  } catch (error) {
    console.error('❌ 系统启动失败:', error.message);
    process.exit(1);
  }
})();