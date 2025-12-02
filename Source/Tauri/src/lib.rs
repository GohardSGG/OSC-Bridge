// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{AppHandle, Manager, State};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use auto_launch::AutoLaunch;
use std::collections::HashMap;

mod bridge; // 声明新的 bridge 模块

// 应用配置结构
#[derive(Debug, Serialize, Deserialize, Clone)]
struct AppConfig {
    auto_start: bool,
    silent_start: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            auto_start: false,
            silent_start: false,
        }
    }
}

// OSC桥接服务配置
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
struct BridgeConfig {
    listen_ports: Vec<String>,
    target_ports: Vec<String>,
    #[serde(rename = "WS")]
    ws: Vec<String>,
}

impl Default for BridgeConfig {
    fn default() -> Self {
        Self {
            listen_ports: vec!["127.0.0.1:7879".to_string()],
            target_ports: vec!["127.0.0.1:7878".to_string()],
            ws: vec!["ws://localhost:9122".to_string()],
        }
    }
}

// 全局状态
struct AppState {
    app_config: Mutex<AppConfig>,
    bridge_config: Mutex<BridgeConfig>,
    auto_launch: Mutex<Option<AutoLaunch>>,
}

// 新增一个用于存储启动时配置的状态
struct StartupState {
    scale_factor: Mutex<f64>,
}

// 新增命令，用于前端主动获取初始的OSC配置
// 这是解决启动时序问题的最可靠方法
#[tauri::command]
fn get_bridge_config(state: State<AppState>) -> Result<BridgeConfig, String> {
    let config = state.bridge_config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

#[tauri::command]
fn get_initial_scale_factor(state: State<StartupState>) -> Result<f64, String> {
    let factor = state.scale_factor.lock().map_err(|e| e.to_string())?;
    Ok(*factor)
}

#[tauri::command]
fn get_config(state: State<AppState>) -> Result<AppConfig, String> {
    let config = state.app_config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

// 新增命令，用于前端获取格式化后的端口字符串
#[tauri::command]
fn get_formatted_ports(state: State<AppState>) -> Result<FormattedPorts, String> {
    let config = state.bridge_config.lock().map_err(|e| e.to_string())?;
    Ok(FormattedPorts {
        listen: format_ports(&config.listen_ports),
        target: format_ports(&config.target_ports),
    })
}

// 新增命令，用于前端保存OSC配置并触发重载
#[tauri::command]
async fn save_bridge_config(config: BridgeConfig, app_handle: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    // 1. 更新内存中的状态
    *state.bridge_config.lock().unwrap() = config.clone();

    // --- Platform-Specific Save Logic ---
    #[cfg(windows)]
    {
        // On Windows, save next to the executable (requires admin rights)
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let config_path = exe_dir.join("config.json");
                let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
                std::fs::write(&config_path, config_json).map_err(|e| e.to_string())?;
                println!("Windows: Config saved to executable directory: {:?}", config_path);
            }
        }
    }
    #[cfg(not(windows))]
    {
        // On macOS & Linux, save to user's config directory
        let config_dir = app_handle.path().app_config_dir().ok_or("Could not get app config dir")?;
        if !config_dir.exists() {
            std::fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
        }
        let config_path = config_dir.join("config.json");
        let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
        std::fs::write(&config_path, config_json).map_err(|e| e.to_string())?;
        println!("Non-Windows: Config saved to user config directory: {:?}", config_path);
    }

    // 3. 通知 bridge 服务重载
    let http_url = config.ws.get(0).cloned().unwrap_or_else(|| "ws://localhost:9122".to_string()).replace("ws://", "http://");
    let client = reqwest::Client::new();
    if let Err(e) = client.post(format!("{}/reload-config", http_url)).send().await {
         eprintln!("发送重载信号失败: {}", e);
         return Err(format!("发送重载信号失败: {}", e));
    }

    Ok(())
}

// 辅助函数：按IP对端口进行分组和格式化
fn format_ports(ports: &[String]) -> String {
    let mut ip_map: HashMap<String, Vec<u16>> = HashMap::new();

    for addr in ports {
        if let Ok(socket_addr) = addr.parse::<std::net::SocketAddr>() {
            let ip = socket_addr.ip().to_string();
            let port = socket_addr.port();
            ip_map.entry(ip).or_default().push(port);
        } else if let Ok(url) = url::Url::parse(addr) {
            if let Some(host) = url.host_str() {
                if let Some(port) = url.port() {
                    ip_map.entry(host.to_string()).or_default().push(port);
                }
            }
        }
    }

    let mut parts: Vec<String> = ip_map.into_iter().map(|(ip, mut port_nums)| {
        port_nums.sort_unstable();
        let port_str = port_nums.iter().map(|p| p.to_string()).collect::<Vec<_>>().join("/");
        format!("{}:{}", ip, port_str)
    }).collect();
    
    parts.sort();
    parts.join(" | ")
}

// 设置自启动
#[tauri::command]
fn set_auto_start(enabled: bool, state: State<AppState>) -> Result<(), String> {
    let mut config = state.app_config.lock().map_err(|e| e.to_string())?;
    config.auto_start = enabled;
    
    let args = if config.silent_start {
        vec!["--silent"]
    } else {
        vec![]
    };
    
    #[cfg(target_os = "macos")]
    let new_auto_launch = AutoLaunch::new(
        "OSC-Bridge",
        &std::env::current_exe().map_err(|e| e.to_string())?.to_string_lossy(),
        true, // 在macOS上使用Launch Agent
        &args,
    );
    #[cfg(not(target_os = "macos"))]
    let new_auto_launch = AutoLaunch::new(
        "OSC-Bridge",
        &std::env::current_exe().map_err(|e| e.to_string())?.to_string_lossy(),
        &args,
    );
    
    if enabled {
        new_auto_launch.enable().map_err(|e| format!("启用自启动失败: {}", e))?;
    } else {
        new_auto_launch.disable().map_err(|e| format!("禁用自启动失败: {}", e))?;
    }
    
    let mut auto_launch_guard = state.auto_launch.lock().map_err(|e| e.to_string())?;
    *auto_launch_guard = Some(new_auto_launch);
    
    Ok(())
}

// 设置静默启动
#[tauri::command]
fn set_silent_start(enabled: bool, state: State<AppState>) -> Result<(), String> {
    let mut config = state.app_config.lock().map_err(|e| e.to_string())?;
    config.silent_start = enabled;
    
    if config.auto_start {
        let args = if enabled {
            vec!["--silent"]
        } else {
            vec![]
        };
        
        #[cfg(target_os = "macos")]
        let new_auto_launch = AutoLaunch::new(
            "OSC-Bridge",
            &std::env::current_exe().map_err(|e| e.to_string())?.to_string_lossy(),
            true, // 在macOS上使用Launch Agent
            &args,
        );
        #[cfg(not(target_os = "macos"))]
        let new_auto_launch = AutoLaunch::new(
            "OSC-Bridge",
            &std::env::current_exe().map_err(|e| e.to_string())?.to_string_lossy(),
            &args,
        );
        
        new_auto_launch.enable().map_err(|e| format!("更新自启动配置失败: {}", e))?;
        
        let mut auto_launch_guard = state.auto_launch.lock().map_err(|e| e.to_string())?;
        *auto_launch_guard = Some(new_auto_launch);
    }
    
    Ok(())
}

// 保存配置到文件
#[tauri::command]
fn save_config(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    let config = state.app_config.lock().map_err(|e| e.to_string())?;
    
    let app_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    
    let config_path = app_dir.join("config.json");
    let config_json = serde_json::to_string_pretty(&*config).map_err(|e| e.to_string())?;
    std::fs::write(config_path, config_json).map_err(|e| e.to_string())?;
    
    Ok(())
}

// 新增命令，用于切换主窗口的显示和隐藏
#[tauri::command]
fn toggle_main_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

// 加载配置从文件
fn load_app_config(app: &AppHandle) -> AppConfig {
    let app_dir = match app.path().app_config_dir() {
        Ok(dir) => dir,
        Err(_) => return AppConfig::default(),
    };
    
    let config_path = app_dir.join("config.json");
    if !config_path.exists() {
        return AppConfig::default();
    }
    
    match std::fs::read_to_string(config_path) {
        Ok(content) => serde_json::from_str::<AppConfig>(&content).unwrap_or_default(),
        Err(_) => AppConfig::default(),
    }
}

// 加载OSC桥接服务配置 (新函数)
fn load_bridge_config(app_handle: &AppHandle) -> BridgeConfig {
    // --- Platform-Specific Load Logic ---
    #[cfg(windows)]
    {
        // On Windows, only load from beside the executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let config_path = exe_dir.join("config.json");
            if config_path.exists() {
                    println!("Windows: Loading config from executable directory: {:?}", config_path);
                if let Ok(content) = std::fs::read_to_string(&config_path) {
                    return serde_json::from_str::<BridgeConfig>(&content).unwrap_or_else(|e| {
                        eprintln!("解析 config.json 失败: {}, 将使用默认配置", e);
                        BridgeConfig::default()
                    });
                }
                }
            }
        }
    }
    #[cfg(not(windows))]
    {
        // On macOS & Linux, prioritize user config dir, then fallback to resources
        // 1. Try user config directory
        if let Some(config_dir) = app_handle.path().app_config_dir() {
            let user_config_path = config_dir.join("config.json");
            if user_config_path.exists() {
                println!("Non-Windows: Loading config from user directory: {:?}", user_config_path);
                if let Ok(content) = std::fs::read_to_string(&user_config_path) {
                    if let Ok(config) = serde_json::from_str::<BridgeConfig>(&content) {
                        return config;
                    }
                }
            }
        }
        // 2. Fallback to bundled resource config
        if let Some(resource_dir) = app_handle.path().resource_dir() {
            let default_config_path = resource_dir.join("config_default.json");
             if default_config_path.exists() {
                println!("Non-Windows: Loading config from resource directory: {:?}", default_config_path);
                if let Ok(content) = std::fs::read_to_string(&default_config_path) {
                    if let Ok(config) = serde_json::from_str::<BridgeConfig>(&content) {
                        return config;
            }
        }
    }
        }
    }

    println!("在任何位置都未找到 config.json，将创建并使用默认OSC配置");
    BridgeConfig::default()
}

// 更新托盘菜单状态
fn update_tray_menu(app: &AppHandle) {
    use tauri::{
        menu::{Menu, MenuItem, PredefinedMenuItem},
    };
    
    let app_state = app.state::<AppState>();
    
    // 先获取配置状态，然后释放锁
    let (auto_start, silent_start) = {
        if let Ok(config) = app_state.app_config.lock() {
            (config.auto_start, config.silent_start)
        } else {
            return; // 如果无法获取配置，直接返回
        }
    };
    
    // 重新创建菜单项
    if let Ok(quit_item) = MenuItem::with_id(app, "quit", "退出", true, None::<&str>) {
        if let Ok(show_item) = MenuItem::with_id(app, "show", "显示/隐藏", true, None::<&str>) {
            if let Ok(separator1) = PredefinedMenuItem::separator(app) {
                if let Ok(separator2) = PredefinedMenuItem::separator(app) {
                    // 根据配置状态创建菜单项
                    let auto_start_text = if auto_start { "✓ 开机自启" } else { "开机自启" };
                    let silent_start_text = if silent_start { "✓ 静默启动" } else { "静默启动" };
                    
                    if let Ok(auto_start_item) = MenuItem::with_id(app, "auto_start", auto_start_text, true, None::<&str>) {
                        if let Ok(silent_start_item) = MenuItem::with_id(app, "silent_start", silent_start_text, true, None::<&str>) {
                            // 重新构建菜单
                            if let Ok(menu) = Menu::with_items(app, &[
                                &show_item, 
                                &separator1,
                                &auto_start_item,
                                &silent_start_item,
                                &separator2,
                                &quit_item
                            ]) {
                                // 更新托盘菜单
                                if let Some(tray) = app.tray_by_id("main-tray") {
                                    let _ = tray.set_menu(Some(menu));
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct FormattedPorts {
    listen: String,
    target: String,
}

#[derive(Default)]
pub struct OSCBridge(pub Mutex<Option<()>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init(); // 初始化日志系统

    use tauri::{
        menu::{Menu, MenuItem},
        tray::TrayIconBuilder,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            // 获取缩放因子
            let scale_factor = window.scale_factor().unwrap_or(1.0);
            app.manage(StartupState {
                scale_factor: Mutex::new(scale_factor),
            });
            
            // 强制设置窗口尺寸和位置，以覆盖 tauri-plugin-store 的状态恢复
            // 使用 LogicalSize 来确保在不同DPI的屏幕上表现一致
            let _ = window.set_size(tauri::LogicalSize::new(900, 630));
            let _ = window.center();

            #[cfg(target_os = "windows")]
            {
                use window_vibrancy::apply_blur;
                apply_blur(&window, Some((0, 0, 0, 0)))
                    .expect("Unsupported platform! 'apply_blur' is only supported on Windows");
            }

            // 1. 加载所有配置
            let app_config = load_app_config(&app.handle());
            let bridge_config = load_bridge_config(&app.handle());
            println!("加载的OSC配置: {:?}", bridge_config);

            // 将 Tauri app handle 复制一份用于传递给后台任务
            let app_handle = app.handle().clone();
            
            // 2. 在后台启动桥接服务
            tauri::async_runtime::spawn(async move {
                bridge::run_bridge(app_handle).await;
            });
            
            // 3. 创建自启动实例
            let args = if app_config.silent_start {
                vec!["--silent"]
            } else {
                vec![]
            };
            
            #[cfg(target_os = "macos")]
            let auto_launch = AutoLaunch::new(
                "OSC-Bridge",
                &std::env::current_exe().unwrap().to_string_lossy(),
                true, // 在macOS上使用Launch Agent
                &args,
            );
            #[cfg(not(target_os = "macos"))]
            let auto_launch = AutoLaunch::new(
                "OSC-Bridge",
                &std::env::current_exe().unwrap().to_string_lossy(),
                &args,
            );
            
            // 4. 初始化应用状态
            let app_state = AppState {
                app_config: Mutex::new(app_config.clone()),
                bridge_config: Mutex::new(bridge_config.clone()),
                auto_launch: Mutex::new(Some(auto_launch)),
            };
            app.manage(app_state);
            
            // 5. 根据配置或参数决定是否隐藏窗口
            let cli_args: Vec<String> = std::env::args().collect();
            let should_hide = app_config.silent_start || cli_args.contains(&"--silent".to_string());
            
            if should_hide {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            
            // 创建托盘菜单项
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "show", "显示/隐藏", true, None::<&str>)?;
            
            // 分隔线
            use tauri::menu::PredefinedMenuItem;
            let separator1 = PredefinedMenuItem::separator(app)?;
            let separator2 = PredefinedMenuItem::separator(app)?;
            
            // 配置菜单项（带复选框）
            let auto_start_item = MenuItem::with_id(app, "auto_start", "开机自启", true, None::<&str>)?;
            let silent_start_item = MenuItem::with_id(app, "silent_start", "静默启动", true, None::<&str>)?;
            
            // 构建托盘菜单
            let menu = Menu::with_items(app, &[
                &show_item, 
                &separator1,
                &auto_start_item,
                &silent_start_item,
                &separator2,
                &quit_item
            ])?;
            
            // 创建托盘图标
            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    let app_state = app.state::<AppState>();
                    
                    match event.id.as_ref() {
                        "quit" => {
                            // 不再需要清理后端进程
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        "auto_start" => {
                            if let Ok(config) = app_state.app_config.lock() {
                                let new_state = !config.auto_start;
                                drop(config);
                                
                                if let Err(e) = set_auto_start(new_state, app_state.clone()) {
                                    eprintln!("设置自启动失败: {}", e);
                                } else {
                                    let _ = save_config(app.clone(), app_state.clone());
                                    update_tray_menu(app);
                                }
                            }
                        }
                        "silent_start" => {
                            if let Ok(config) = app_state.app_config.lock() {
                                let new_state = !config.silent_start;
                                drop(config);
                                
                                if let Err(e) = set_silent_start(new_state, app_state.clone()) {
                                    eprintln!("设置静默启动失败: {}", e);
                                } else {
                                    let _ = save_config(app.clone(), app_state.clone());
                                    update_tray_menu(app);
                                }
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    match event {
                        tauri::tray::TrayIconEvent::Click { 
                            button: tauri::tray::MouseButton::Left,
                            button_state: tauri::tray::MouseButtonState::Up,
                            ..
                        } => {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        tauri::tray::TrayIconEvent::Click { 
                            button: tauri::tray::MouseButton::Right,
                            button_state: tauri::tray::MouseButtonState::Up,
                            ..
                        } => {
                        }
                        _ => {}
                    }
                })
                .build(app)?;
            
            // 初始化托盘菜单状态
            update_tray_menu(&app.handle());
            
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_bridge_config,
            get_formatted_ports, // <--- 在这里注册新命令
            get_initial_scale_factor,
            get_config,
            set_auto_start,
            set_silent_start,
            save_config,
            save_bridge_config,
            toggle_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
