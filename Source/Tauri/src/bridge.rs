use crate::{AppState, BridgeConfig}; // 从 lib.rs 导入状态和配置结构体
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
        ConnectInfo,
    },
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use std::net::SocketAddr;
use rosc::{OscType};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::sync::{broadcast, mpsc};
use tokio_util::sync::CancellationToken;
use tracing::{error, info, warn};
use tower_http::cors::{Any, CorsLayer};
use url::Url;
use std::sync::atomic::{AtomicUsize, Ordering};

// 全局客户端ID计数器
static NEXT_CLIENT_ID: AtomicUsize = AtomicUsize::new(1);

// 单个OSC参数的结构
#[derive(serde::Serialize, Clone, Debug)]
struct OscArg {
    value: String,
    #[serde(rename = "type")] // 在JSON中生成 "type" 字段
    type_name: String,
}

// 新的、更详细的OSC包信息结构体f
#[derive(serde::Serialize, Clone, Debug)]
struct OscPacketInfo {
    // [WS #2] 或 [127.0.0.1:...] 的来源标识
    source_id: String, 
    // "Target" 或 "WS"
    destination_type: String, 
    // 已成功转发的数量
    sent_count: usize,
    // 总目标数量
    total_count: usize,
    // OSC消息地址
    addr: String,
    // OSC消息参数 (值和类型)
    args: Vec<OscArg>, 
}

/// 定义发送给前端的日志/事件类型
#[derive(serde::Serialize, Clone, Debug)]
#[serde(tag = "type", content = "data")] // 这会让JSON变成 { "type": "...", "data": ... } 的清晰格式
enum FrontendLog {
    OscSent(OscPacketInfo),
    OscReceived(OscPacketInfo),
    System(String),
    ClientConnected { client_id: String, client_type: String, remote_addr: String },
    ClientDisconnected { client_id: String, client_type: String },
}

/// 定义客户端的类型
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ClientType {
    Frontend,
    OscClient,
}

/// 桥接服务的共享状态
struct BridgeState {
    /// 用于将从UDP接收到的OSC消息广播给所有WebSocket客户端
    osc_tx: broadcast::Sender<Vec<u8>>,
    /// 用于将从WebSocket接收到的OSC消息广播给所有UDP发送任务
    udp_tx: broadcast::Sender<Vec<u8>>,
    /// 用于将日志消息广播给前端UI
    log_tx: broadcast::Sender<String>,
    /// 对Tauri应用句柄的引用，用于访问全局状态和文件系统
    app_handle: AppHandle,
    /// 用于通知UDP服务重载的发送端
    udp_reload_tx: mpsc::Sender<()>,
}

/// 运行所有网络服务的总入口函数
/// 这个函数会循环，直到应用退出，以支持热重载
pub async fn run_bridge(app_handle: AppHandle) {
    let (udp_reload_tx, udp_reload_rx) = mpsc::channel(1);
    let (osc_tx, _) = broadcast::channel(1024);
    let (udp_tx, _) = broadcast::channel(1024);
    let (log_tx, _) = broadcast::channel(1024);

    let state = Arc::new(BridgeState {
        osc_tx: osc_tx.clone(),
        udp_tx: udp_tx.clone(),
        log_tx: log_tx.clone(),
        app_handle: app_handle.clone(),
        udp_reload_tx,
    });

    let udp_manager_state = state.clone();
    tokio::spawn(start_udp_services_manager(udp_manager_state, udp_reload_rx));

    start_ws_server(state).await;
}

/// 启动并管理UDP服务的生命周期
async fn start_udp_services_manager(state: Arc<BridgeState>, mut reload_rx: mpsc::Receiver<()>) {
    loop {
        let token = CancellationToken::new();
        let config = match state.app_handle.state::<AppState>().bridge_config.lock() {
            Ok(c) => c.clone(),
            Err(e) => {
                error!("Failed to lock bridge config: {}. Aborting UDP manager loop.", e);
                break;
            }
        };
        
        info!("(Re)Starting UDP services...");
        let udp_task = tokio::spawn(start_udp_services(state.clone(), config, token.clone()));
        
        tokio::select! {
            _ = reload_rx.recv() => {
                info!("UDP reload signal received.");
                token.cancel();
            }
        }
        
        if let Err(e) = udp_task.await {
            error!("UDP services task panicked: {}", e);
        }
        info!("All UDP services have shut down. Restarting...");
    }
}

/// 启动Axum Web服务器
async fn start_ws_server(state: Arc<BridgeState>) {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    
    // 关键修复：定义两个独立的路由，并正确地调用 ws_handler
    let app = Router::new()
        .route("/", get(|ws, state, ci, headers| ws_handler(ws, state, ci, headers, ClientType::OscClient)))
        .route("/logs", get(|ws, state, ci, headers| ws_handler(ws, state, ci, headers, ClientType::Frontend)))
        .route("/config", get(get_config_handler))
        .route("/save-config", post(save_config_handler))
        .route("/reload-config", post(reload_config_handler))
        .with_state(state.clone())
        .layer(cors);

    let config = match state.app_handle.state::<AppState>().bridge_config.lock() {
        Ok(c) => c.clone(),
        Err(e) => {
            error!("Failed to get lock on bridge config: {}. WS Server will not start.", e);
            return;
        }
    };
    
    let ws_url_str = config.ws.get(0).cloned().unwrap_or_else(|| "ws://localhost:9122".to_string());
    
    let port = match Url::parse(&ws_url_str) {
        Ok(url) => url.port_or_known_default().unwrap_or(9122),
        Err(_) => {
            warn!("Could not parse WS URL '{}', defaulting to port 9122.", ws_url_str);
            9122
        }
    };

    // 关键修复: 强制绑定到 '0.0.0.0'，以监听所有网络接口，就像旧版一样
    let listen_addr = format!("0.0.0.0:{}", port);
    info!("HTTP & WebSocket Server attempting to listen on: {}", listen_addr);

    let listener = match tokio::net::TcpListener::bind(&listen_addr).await {
        Ok(l) => l,
        Err(e) => {
            error!("Fatal: Failed to bind WebSocket server on {}: {}. The application may not function correctly.", listen_addr, e);
            return;
        }
    };
    
    info!("Successfully listening on: {}", listen_addr);

    // 服务器将一直运行，除非主应用关闭
    // 使用 with_connect_info 以获取客户端 IP
    if let Err(e) = axum::serve(
        listener, 
        app.into_make_service_with_connect_info::<SocketAddr>()
    ).await {
        error!("WebSocket server shut down with an error: {}", e);
    }
}

/// 启动所有UDP服务 (一次性运行)
async fn start_udp_services(state: Arc<BridgeState>, config: BridgeConfig, token: CancellationToken) {
    let mut tasks = tokio::task::JoinSet::new();

    let sender_state = state.clone();
    let target_ports = config.target_ports.clone();
    let sender_token = token.clone();
    tasks.spawn(async move {
        let mut rx = sender_state.udp_tx.subscribe();
        let socket = match tokio::net::UdpSocket::bind("0.0.0.0:0").await {
            Ok(s) => s,
            Err(e) => {
                error!("UDP Sender: Failed to create socket: {}", e);
                return;
            }
        };

        info!("UDP sender ready for targets: {:?}", target_ports);

        loop {
            tokio::select! {
                _ = sender_token.cancelled() => {
                    info!("UDP sender task cancelled.");
                    break;
                },
                Ok(data) = rx.recv() => {
                    for target in &target_ports {
                        if let Err(e) = socket.send_to(&data, target).await {
                            error!("UDP Sender: Failed to send to {}: {}", target, e);
                        }
                    }
                }
            }
        }
        info!("UDP sender task has shut down.");
    });

    // 2. 为每个监听端口创建一个UDP监听任务
    for listen_addr_str in config.listen_ports {
        let osc_tx = state.osc_tx.clone();
        let log_tx = state.log_tx.clone();
        let listener_token = token.clone();
        tasks.spawn(async move {
            let socket = match tokio::net::UdpSocket::bind(&listen_addr_str).await {
                Ok(s) => s,
                Err(e) => {
                    error!("UDP Listener: Failed to bind on {}: {}", listen_addr_str, e);
                    return;
                }
            };

            let mut buf = [0u8; 8192];
            loop {
                tokio::select! {
                    _ = listener_token.cancelled() => {
                        info!("UDP listener on {} cancelled.", listen_addr_str);
                        break;
                    },
                    Ok((len, _remote_addr)) = socket.recv_from(&mut buf) => {
                        let packet_data = &buf[..len];
                        
                        // 1. 解析OSC包
                        if let Ok((_size, packet)) = rosc::decoder::decode_udp(packet_data) {
                            if let rosc::OscPacket::Message(msg) = packet {
                                let receiver_count = osc_tx.receiver_count();
                                // 2. 创建结构化数据
                                let event = FrontendLog::OscReceived(OscPacketInfo {
                                    source_id: listen_addr_str.clone(),
                                    destination_type: "WS".to_string(),
                                    sent_count: receiver_count,
                                    total_count: receiver_count,
                                    addr: msg.addr,
                                    // 将所有参数转为字符串和类型
                                    args: msg.args.iter().map(|arg| OscArg {
                                        value: format_osc_arg(arg, false),
                                        type_name: format_osc_arg(arg, true),
                                    }).collect(),
                                });
                                // 3. 发送序列化后的JSON
                                if let Ok(json_string) = serde_json::to_string(&event) {
                                    let _ = log_tx.send(json_string);
                                }
                            }
                        }

                        if osc_tx.send(packet_data.to_vec()).is_err() {
                            warn!("UDP Listener: No WS clients to forward to.");
                        }
                    }
                }
            }
            info!("UDP listener on {} has shut down.", listen_addr_str);
        });
    }

    // 等待所有UDP任务完成
    token.cancelled().await;
    tasks.shutdown().await;
    info!("All UDP services have shut down.");
}

/// WebSocket升级处理器
async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<BridgeState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    _headers: HeaderMap,
    client_type: ClientType,
) -> impl IntoResponse {
    info!(client_type = ?client_type, remote_addr = %addr, "WebSocket client trying to connect");
    ws.on_upgrade(move |socket| handle_socket(socket, state, client_type, addr))
}

/// 处理单个WebSocket连接的生命周期
async fn handle_socket(mut socket: WebSocket, state: Arc<BridgeState>, client_type: ClientType, remote_addr: SocketAddr) {
    let client_id = NEXT_CLIENT_ID.fetch_add(1, Ordering::Relaxed);
    let client_id_str = format!("WS #{}", client_id);
    let client_type_str = format!("{:?}", client_type);
    let remote_addr_str = remote_addr.to_string();

    info!(client_id = %client_id_str, client_type = %client_type_str, remote_addr = %remote_addr_str, "New client connected");
    
    let connect_event = FrontendLog::ClientConnected {
        client_id: client_id_str.clone(),
        client_type: client_type_str.clone(),
        remote_addr: remote_addr_str,
    };
    if let Ok(json) = serde_json::to_string(&connect_event) {
        let _ = state.log_tx.send(json);
    }
    
    let mut osc_rx = state.osc_tx.subscribe();
    let mut log_rx = state.log_tx.subscribe();

    loop {
        tokio::select! {
            // 接收来自此WebSocket客户端的消息 (可以是任何类型)
            received = socket.recv() => {
                if let Some(Ok(Message::Binary(data))) = received {
                    // 1. 无论来源，都先尝试转发到UDP
                        if state.udp_tx.send(data.clone()).is_err() {
                            warn!("WS: No UDP senders to forward to.");
                        }
                        
                    // 2. 关键修复：为所有发送的二进制消息都生成日志
                        if let Ok((_size, packet)) = rosc::decoder::decode_udp(&data) {
                            if let rosc::OscPacket::Message(msg) = packet {
                                let event = FrontendLog::OscSent(OscPacketInfo {
                                    source_id: client_id_str.clone(),
                                    destination_type: "Target".to_string(),
                                sent_count: 1, // Placeholder
                                total_count: 1, // Placeholder
                                    addr: msg.addr,
                                    args: msg.args.iter().map(|arg| OscArg {
                                        value: format_osc_arg(arg, false),
                                        type_name: format_osc_arg(arg, true),
                                    }).collect(),
                                });
                                if let Ok(json_string) = serde_json::to_string(&event) {
                                // 将日志发送到日志通道
                                    let _ = state.log_tx.send(json_string);
                                }
                        }
                    }
                } else if received.is_none() || matches!(received, Some(Ok(Message::Close(_)))) {
                    break;
                }
            },

            // 将原始OSC二进制数据只转发给OscClient
            Ok(data) = osc_rx.recv(), if client_type == ClientType::OscClient => {
                if socket.send(Message::Binary(data)).await.is_err() {
                    warn!("WS: Failed to forward OSC to OscClient");
                    break;
                }
            },

            // 将结构化的日志JSON只转发给Frontend客户端
            Ok(log_msg) = log_rx.recv(), if client_type == ClientType::Frontend => {
                if socket.send(Message::Text(log_msg)).await.is_err() {
                     warn!("WS: Failed to forward log to Frontend client {}", client_id_str);
                    break;
                }
            },
        }
    }
    
    info!(client_id = %client_id_str, "Client disconnected");
    
    let disconnect_event = FrontendLog::ClientDisconnected {
        client_id: client_id_str,
        client_type: client_type_str,
    };
    if let Ok(json) = serde_json::to_string(&disconnect_event) {
        let _ = state.log_tx.send(json);
    }
}

// --- HTTP API Handlers (Placeholders) ---

/// 获取当前桥接配置
async fn get_config_handler(State(state): State<Arc<BridgeState>>) -> impl IntoResponse {
    info!("Serving GET /config");
    let config = state
        .app_handle
        .state::<AppState>()
        .bridge_config
        .lock()
        .unwrap()
        .clone();
    Json(config)
}

/// 保存新配置并触发UDP服务重载
async fn save_config_handler(State(state): State<Arc<BridgeState>>, Json(payload): Json<BridgeConfig>) -> impl IntoResponse {
    info!("Serving POST /save-config");
    *state.app_handle.state::<AppState>().bridge_config.lock().unwrap() = payload.clone();
    
    // 确定可执行文件所在的目录，以正确保存config.json
    // 这是修复生产环境（构建版本）无法写入配置的关键
    let config_path = match std::env::current_exe() {
        Ok(exe_path) => {
            if let Some(exe_dir) = exe_path.parent() {
                exe_dir.join("config.json")
            } else {
                error!("无法获取可执行文件的父目录。");
                return (StatusCode::INTERNAL_SERVER_ERROR, "无法确定可执行文件目录").into_response();
            }
        },
        Err(e) => {
            error!("无法获取当前可执行文件的路径: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "无法确定可执行文件路径").into_response();
        }
    };

    let config_json = serde_json::to_string_pretty(&payload).unwrap();
    if let Err(e) = tokio::fs::write(&config_path, config_json).await {
        error!("写入配置文件失败: {:?}: {}", &config_path, e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to write config").into_response();
    }

    info!("配置已保存到 {:?}。正在触发UDP服务重载...", &config_path);
    let _ = state.log_tx.send(serde_json::to_string(&FrontendLog::System("Config saved. Reloading UDP...".to_string())).unwrap());
    if state.udp_reload_tx.send(()).await.is_err() {
        error!("发送UDP重载信号失败。");
    }
    Json(payload).into_response()
}

/// 手动触发UDP服务重载
async fn reload_config_handler(State(state): State<Arc<BridgeState>>) -> impl IntoResponse {
    info!("Serving POST /reload-config, triggering UDP reload...");
    let _ = state.log_tx.send(serde_json::to_string(&FrontendLog::System("Manual UDP reload triggered.".to_string())).unwrap());
    
    if state.udp_reload_tx.send(()).await.is_err() {
        error!("Failed to send UDP reload signal.");
    }
    
    (StatusCode::OK, "UDP Reload triggered").into_response()
}

// --- Helper Functions ---

/// 格式化单个OSC参数
fn format_osc_arg(arg: &OscType, get_type_name: bool) -> String {
    if get_type_name {
        return match arg {
            OscType::Int(_) => "Int".to_string(),
            OscType::Float(_) => "Float".to_string(),
            OscType::String(_) => "String".to_string(),
            OscType::Blob(_) => "Blob".to_string(),
            OscType::Time(_) => "TimeTag".to_string(),
            OscType::Long(_) => "Long".to_string(),
            OscType::Double(_) => "Double".to_string(),
            OscType::Char(_) => "Char".to_string(),
            OscType::Color(_) => "Color".to_string(),
            OscType::Midi(_) => "Midi".to_string(),
            OscType::Bool(_) => "Boolean".to_string(),
            _ => "Unsupported".to_string(),
        };
    }

    match arg {
        OscType::Int(i) => i.to_string(),
        OscType::Float(f) => format!("{:.4}", f),
        OscType::String(s) => s.clone(),
        OscType::Blob(_) => "[Blob]".to_string(),
        OscType::Time(t) => format!("Time({}, {})", t.seconds, t.fractional),
        OscType::Long(l) => l.to_string(),
        OscType::Double(d) => format!("{:.4}", d),
        OscType::Char(c) => c.to_string(),
        OscType::Color(c) => format!("#{:02x}{:02x}{:02x}{:02x}", c.red, c.green, c.blue, c.alpha),
        OscType::Midi(m) => format!("MIDI({:?})", m),
        OscType::Bool(b) => b.to_string(),
        _ => "[Unsupported]".to_string(),
    }
} 