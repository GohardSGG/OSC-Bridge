// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{
    AppHandle, Manager, State, WebviewWindowBuilder, WebviewUrl, WebviewWindow, Wry,
    menu::{Menu, PredefinedMenuItem, CheckMenuItem, MenuItemKind},
};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
#[cfg(target_os = "macos")]
use auto_launch::AutoLaunch;

mod bridge; // 声明新的 bridge 模块
#[cfg(target_os = "windows")]
mod schtasks; // XML 任务计划模块

// 辅助函数：创建主窗口
// 辅助函数：创建主窗口 (Robust Implementation)
fn create_main_window(app: &AppHandle, visible: bool) -> tauri::Result<WebviewWindow> {
    let builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("OSC Bridge")
        .inner_size(900.0, 630.0)
        .decorations(false)
        .transparent(false) // 关闭透明以修复渲染瑕疵
        .shadow(true)       // 启用系统原生窗口阴影
        .visible(false); // 初始不可见，防止闪烁
        
    // 这里可以参考 clash-verge-rev 注入初始化脚本，目前暂不需要
    
    let window = builder.build()?;
    
    // Windows 特有的模糊效果
    // Windows 特有的模糊效果
    // 移除 window_vibrancy 调用以消除"描边之外的模糊层"
    // clash-verge-rev 未使用此效果，使用纯色背景更干净
    // #[cfg(target_os = "windows")]
    // if let Some(window) = app.get_webview_window("main") {
    //     use window_vibrancy::apply_blur;
    //     let _ = apply_blur(&window, Some((0, 0, 0, 0)));
    // }
    
    if visible {
        window.show()?;
        window.set_focus()?;
    }
    
    Ok(window)
}

// 辅助函数：创建 Splash 窗口
fn create_splash_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    WebviewWindowBuilder::new(app, "splashscreen", WebviewUrl::App("splashscreen.html".into()))
        .title("OSC Bridge")
        .inner_size(200.0, 100.0)
        .decorations(false)
        .transparent(true)
        .center()
        .always_on_top(true)
        .build()
}

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
    #[cfg(target_os = "macos")]
    auto_launch: Mutex<Option<AutoLaunch>>,
    is_exiting: Mutex<bool>, // 新增退出标志
    main_menu: Mutex<Option<Menu<Wry>>>,
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

// 应用就绪命令 - 前端加载完成后调用，关闭 splash 并根据配置显示/隐藏主窗口
#[tauri::command]
async fn app_ready(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("app_ready 命令被调用");
    
    // 1. 关闭 splash screen (如果存在)
    if let Some(splash) = app.get_webview_window("splashscreen") {
        tracing::info!("正在关闭 Splash 屏幕");
        let _ = splash.close();
    }
    
    // 2. 检查是否静默启动
    let config = state.app_config.lock().map_err(|e| e.to_string())?;
    let cli_args: Vec<String> = std::env::args().collect();
    let is_silent_mode = config.silent_start || cli_args.contains(&"--silent".to_string());
    
    // 3. 窗口可见性控制
    // 
    // 关键设计决策：
    // - 静默模式：不做任何事！窗口的可见性完全由用户通过托盘图标控制。
    //   这样可以彻底避免与用户操作产生竞态条件。
    // - 正常模式：显示主窗口（这是 app_ready 的标准职责）。
    //
    if !is_silent_mode {
        if let Some(main) = app.get_webview_window("main") {
            tracing::info!("正常模式：显示主窗口");
            let _ = main.show();
            let _ = main.set_focus();
        }
    } else {
        tracing::info!("静默模式：跳过窗口显示逻辑，由用户通过托盘控制");
    }
    
    Ok(())
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
async fn save_bridge_config(config: BridgeConfig, _app_handle: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
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
        let config_dir = app_handle.path().app_config_dir().map_err(|e| e.to_string())?;
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
    
    #[cfg(target_os = "windows")]
    {
        set_windows_task_start(enabled, &args)?;
    }

    #[cfg(target_os = "macos")]
    {
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
    } // End of macos block
    
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
        
        #[cfg(target_os = "windows")]
        {
             set_windows_task_start(true, &args)?;
        }

        #[cfg(target_os = "macos")]
        {
        let new_auto_launch = AutoLaunch::new(
            "OSC-Bridge",
            &std::env::current_exe().map_err(|e| e.to_string())?.to_string_lossy(),
            true, // 在macOS上使用Launch Agent
            &args,
        );

        
        new_auto_launch.enable().map_err(|e| format!("更新自启动配置失败: {}", e))?;
        
        let mut auto_launch_guard = state.auto_launch.lock().map_err(|e| e.to_string())?;
        *auto_launch_guard = Some(new_auto_launch);
        }
    }
    
    Ok(())
}

#[cfg(target_os = "windows")]
fn set_windows_task_start(enabled: bool, args: &[&str]) -> Result<(), String> {
    if enabled {
        schtasks::create_task(args)
    } else {
        schtasks::delete_task()
    }
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
    tracing::info!("toggle_main_window 被调用");
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        tracing::info!("  窗口存在，当前可见状态: {}", is_visible);
        if is_visible {
            tracing::info!("  执行: hide()");
            let _ = window.hide();
        } else {
            tracing::info!("  执行: show() + set_focus()");
            let _ = window.show();
            let _ = window.set_focus();
        }
    } else {
        tracing::warn!("  窗口不存在! (main window not found)");
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
fn load_bridge_config(_app_handle: &AppHandle) -> BridgeConfig {
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
        if let Ok(config_dir) = app_handle.path().app_config_dir() {
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
        if let Ok(resource_dir) = app_handle.path().resource_dir() {
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
    let app_state = app.state::<AppState>();
    
    // 先获取配置状态，然后释放锁
    let (auto_start, silent_start) = {
        if let Ok(config) = app_state.app_config.lock() {
            (config.auto_start, config.silent_start)
        } else {
            return; // 如果无法获取配置，直接返回
        }
    };
    
    // 尝试获取现有托盘菜单 (从 AppState)
    // 使用独立的代码块来确保 MutexGuard 的生命周期明确
    {
        let lock_result = app_state.main_menu.lock();
        if let Ok(menu_guard) = lock_result {
            if let Some(menu) = menu_guard.as_ref() {
                // 尝试更新现有菜单项的状态
                if let Ok(items) = menu.items() {
                    for item in items {
                         match item {
                             MenuItemKind::Check(check_item) => {
                                 let id_str = check_item.id().as_ref();
                                 if id_str == "auto_start" {
                                     let _ = check_item.set_checked(auto_start);
                                 } else if id_str == "silent_start" {
                                     let _ = check_item.set_checked(silent_start);
                                 }
                             }
                             _ => {}
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
    // 初始化日志系统 (Robust Hybrid Strategy)
    // 策略：
    // 1. 优先尝试在 exe 同级目录创建 `logs` (满足用户偏好)
    // 2. 如果失败 (权限不足)，回退到 AppData/logs (标准做法)
    // 3. 再次失败，回退到 Temp 目录 (最后防线)
    // 4. 绝不 Panic
    
    let now = std::time::SystemTime::now();
    let datetime = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    let secs = datetime.as_secs();
    let days_since_epoch = secs / 86400;
    let time_of_day = secs % 86400;
    
    // Fix: Calculate day_of_year (approximate)
    let day_of_year = days_since_epoch % 365;
    let years_approx = 1970 + (days_since_epoch / 365);
    
    let month_approx = ((day_of_year / 30) + 1).min(12);
    let day_approx = ((day_of_year % 30) + 1).min(31);
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;
    
    let log_filename = format!(
        "osc-bridge_{:04}-{:02}-{:02}_{:02}-{:02}-{:02}.log",
        years_approx, month_approx, day_approx, hours, minutes, seconds
    );

    // 定义尝试路径的闭包
    let try_create_log = |dir: std::path::PathBuf| -> Option<(std::fs::File, std::path::PathBuf)> {
        let log_dir = dir.join("logs");
        if let Err(e) = std::fs::create_dir_all(&log_dir) {
            eprintln!("无法创建日志目录 {:?}: {}", log_dir, e);
            return None;
        }
        let log_path = log_dir.join(&log_filename);
        match std::fs::File::create(&log_path) {
            Ok(f) => Some((f, log_path)),
            Err(e) => {
                eprintln!("无法创建日志文件 {:?}: {}", log_path, e);
                None
            }
        }
    };

    // 1. 尝试 EXE 目录
    let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf()));
    let (file, final_path) = if let Some(dir) = exe_dir.clone().and_then(|d| try_create_log(d)) {
        dir
    } else {
        // 2. 尝试 AppData 目录
        // 由于此时 tauri app 还没构建，我们需要手动构造 AppData 路径
        // 或者简单点，使用 dirs crate (如果没引入的话，就得用 temp)
        // 既然我们引入了 `dirs` crate (在 lib.rs 顶部没看到引入? 检查下)
        // 假设没有 `dirs` crate，我们用 Temp 作为可靠回退
        // 更好的是用 `directories` crate，但不想引入新依赖。 
        // 实际上 tauri app handle 可以给路径，但这里还拿不到 app handle。
        // 所以我们用 std::env::temp_dir() 作为最强回退，或者尝试构造 LOCALAPPDATA
        
        // 尝试获取 %APPDATA%
        let app_data = std::env::var_os("APPDATA").map(std::path::PathBuf::from)
            .or_else(|| std::env::var_os("LOCALAPPDATA").map(std::path::PathBuf::from));
            
        let fallback_dir = app_data.map(|p| p.join("OSC-Bridge")).unwrap_or_else(std::env::temp_dir);
        
        eprintln!("Exe目录写日志失败，尝试回退到: {:?}", fallback_dir);
        
        if let Some(res) = try_create_log(fallback_dir.clone()) {
            res
        } else {
             // 3. 最终回退：Temp
             let temp = std::env::temp_dir();
             eprintln!("AppData写日志失败，最终回退到 Temp: {:?}", temp);
             if let Some(res) = try_create_log(temp) {
                 res
             } else {
                 // 4. 彻底失败：Null
                 eprintln!("日志系统彻底初始化失败，禁用日志文件。");
                 (std::fs::File::create("NUL").unwrap_or_else(|_| std::fs::File::create("/dev/null").unwrap()), std::path::PathBuf::from("NUL"))
             }
        }
    };
    
    let (non_blocking, _guard) = tracing_appender::non_blocking(file);

    tracing_subscriber::fmt()
        .with_writer(non_blocking)
        .with_ansi(false)
        .with_target(false)
        .with_thread_ids(true)
        .with_level(true)
        .with_file(true)
        .with_line_number(true)
        .init();

    tracing::info!("OSC Bridge 启动中... 版本: 2.1.7");
    tracing::info!("日志已写入: {:?}", final_path);
    // 只有当回退发生时，且原定目录存在，才警告
    if let Some(ed) = exe_dir {
        if !final_path.starts_with(&ed) {
             tracing::warn!("注意：由于权限不足，日志未能写入程序目录，已重定向至安全位置。");
        }
    }

    use tauri::{
        menu::{Menu, MenuItem},
        tray::TrayIconBuilder,
    };

    let app = tauri::Builder::default()
        // Single-instance: prevent multiple app instances and focus existing window
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            tracing::info!("检测到重复实例启动，聚焦现有窗口");
            // Try to show and focus the existing main window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            tracing::info!("进入 setup 闭包");
            
            // 1. 优先加载配置
            let app_config = load_app_config(&app.handle());
            let bridge_config = load_bridge_config(&app.handle());
            println!("加载的OSC配置: {:?}", bridge_config);
            
            // 2. 创建托盘菜单 (Create Menu BEFORE AppState)
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "show", "显示/隐藏", true, None::<&str>)?;
            let separator1 = PredefinedMenuItem::separator(app)?;
            let separator2 = PredefinedMenuItem::separator(app)?;
            
            let auto_start_state = app_config.auto_start;
            let silent_start_state = app_config.silent_start;
            let auto_start_item = CheckMenuItem::with_id(app, "auto_start", "开机自启", true, auto_start_state, None::<&str>)?;
            let silent_start_item = CheckMenuItem::with_id(app, "silent_start", "静默启动", true, silent_start_state, None::<&str>)?;
            
            let menu = Menu::with_items(app, &[
                &show_item, &separator1, &auto_start_item, &silent_start_item, &separator2, &quit_item
            ])?;

            // 3. 初始化状态 (Inject Menu Handle)
            let app_state = AppState {
                app_config: Mutex::new(app_config.clone()),
                bridge_config: Mutex::new(bridge_config.clone()),
                #[cfg(target_os = "macos")]
                auto_launch: Mutex::new(None), 
                is_exiting: Mutex::new(false),
                main_menu: Mutex::new(Some(menu.clone())), // Init with menu
            };
            
            app.manage(StartupState {
                scale_factor: Mutex::new(1.0),
            });
            app.manage(app_state);

            // 2b. 初始化自启动逻辑 (AutoLaunch)
            let args = if app_config.silent_start {
                vec!["--silent"]
            } else {
                vec![]
            };
            
            #[cfg(target_os = "macos")]
            {
                if let Ok(current_exe) = std::env::current_exe() {
                    let auto_launch = AutoLaunch::new(
                        "OSC-Bridge",
                        &current_exe.to_string_lossy(),
                        true,
                        &args,
                    );
                    let state = app.state::<AppState>();
                    if let Ok(mut guard) = state.auto_launch.lock() {
                        *guard = Some(auto_launch);
                    }
                }
            }

             // 自动修复逻辑：清理旧的 "OSC Bridge" 启动项 (Windows/Linux)
            #[cfg(not(target_os = "macos"))]
            {
                if let Ok(current_exe) = std::env::current_exe() {
                   // Clean up potentially old legacy keys if needed
                   // (Simulated logic or relying on external crate if available, but for now just skip if no crate)
                   // The previous code used AutoLaunch crate here too, but we removed the global import.
                   // Since we removed global AutoLaunch import to fix unused warning, we should use schtasks for Windows directly or re-add import if needed for Linux.
                   // For Windows, we use schtasks.rs, so this block might be redundant or needs schtasks::delete_task logic if we want to clean up.
                }
            }
            
            // 如果配置为自启动，强制刷新任务
            if app_config.auto_start {
                #[cfg(target_os = "windows")]
                {
                    if let Err(e) = schtasks::create_task(&args) {
                        eprintln!("启动时同步Windows任务计划失败: {}", e);
                    }
                }
            }

            // 3. 在后台启动桥接服务
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                bridge::run_bridge(app_handle).await;
            });
            
            // 4. [关键修复] 异步初始化窗口 (Clash Verge Rev 风格)
            let handle_for_window = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // 读取配置
                let state = handle_for_window.state::<AppState>();
                let config = match state.app_config.lock() {
                    Ok(guard) => guard.clone(),
                    Err(_) => AppConfig::default(),
                };
                let cli_args: Vec<String> = std::env::args().collect();
                let is_silent_mode = config.silent_start || cli_args.contains(&"--silent".to_string());
                
                // 必须在主线程创建窗口
                let app_handle_for_closure = handle_for_window.clone();
                let _ = handle_for_window.run_on_main_thread(move || {
                   let app = app_handle_for_closure;
                   tracing::info!("主线程回调：根据配置初始化窗口 (is_silent={})", is_silent_mode);
                   if is_silent_mode {
                       // 静默启动：直接创建隐藏的主窗口
                       if let Err(e) = create_main_window(&app, false) {
                           tracing::error!("创建主窗口失败: {}", e);
                       }
                   } else {
                       // 正常启动：先创建 Splash，再创建隐藏的主窗口
                       if let Err(e) = create_splash_window(&app) {
                           tracing::error!("创建 Splash 窗口失败: {}", e);
                       }
                       // 创建主窗口但保持隐藏，等待前端 app_ready 信号
                       if let Err(e) = create_main_window(&app, false) {
                           tracing::error!("创建主窗口失败: {}", e);
                       }
                   }
                });
            });


            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    let app_state = app.state::<AppState>();
                    match event.id.as_ref() {
                        "quit" => {
                            // [关键修复] 用户主动退出
                            if let Ok(mut exiting) = app_state.is_exiting.lock() {
                                *exiting = true;
                            }
                            app.exit(0);
                        },
                        "show" => toggle_main_window(app.clone()), // 复用命令逻辑
                        "auto_start" => {
                            // 简化逻辑，直接调用 existing commands 如果可能，或者复制逻辑
                             if let Ok(config) = app_state.app_config.lock() {
                                let new_state = !config.auto_start;
                                drop(config);
                                if let Err(e) = set_auto_start(new_state, app_state.clone()) { eprintln!("{}", e); }
                                else { 
                                    let _ = save_config(app.clone(), app_state.clone()); 
                                    update_tray_menu(app);
                                    // Notify Frontend
                                    use tauri::Emitter;
                                    let _ = app.emit("tray_config_update", AppConfig { auto_start: new_state, silent_start: app_state.app_config.lock().unwrap().silent_start });
                                }
                            }
                        },
                        "silent_start" => {
                             if let Ok(config) = app_state.app_config.lock() {
                                let new_state = !config.silent_start;
                                drop(config);
                                if let Err(e) = set_silent_start(new_state, app_state.clone()) { eprintln!("{}", e); }
                                else { 
                                    let _ = save_config(app.clone(), app_state.clone()); 
                                    update_tray_menu(app);
                                    // Notify Frontend
                                    use tauri::Emitter;
                                    let _ = app.emit("tray_config_update", AppConfig { auto_start: app_state.app_config.lock().unwrap().auto_start, silent_start: new_state });
                                }
                            }
                        },
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                     // 关键：必须过滤 MouseButtonState::Up，否则按下和弹起都会触发，导致双击问题
                     if let tauri::tray::TrayIconEvent::Click { 
                         button: tauri::tray::MouseButton::Left, 
                         button_state: tauri::tray::MouseButtonState::Up,
                         ..
                     } = event {
                         tracing::info!("[托盘事件] 左键弹起，调用 toggle_main_window");
                         toggle_main_window(tray.app_handle().clone());
                     }
                })
                .build(app)?;
                
            update_tray_menu(&app.handle());

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 如果正在退出，不要拦截关闭事件
                let app_state = window.app_handle().state::<AppState>();
                if let Ok(exiting) = app_state.is_exiting.lock() {
                    if *exiting {
                        return;
                    }
                }
                
                tracing::info!("[窗口事件] CloseRequested for window '{}'，执行 hide() 并阻止关闭", window.label());
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
            toggle_main_window,
            app_ready
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
            // [关键修复] 检查是否是用户主动退出
            let state = app_handle.state::<AppState>();
            if let Ok(exiting) = state.is_exiting.lock() {
                if *exiting {
                    // 用户点了退出菜单，允许退出
                    return;
                }
            }
            
            // 否则（例如关闭所有窗口导致的），阻止退出
            // 只有显式调用 app.exit() 且设置了标志时才会真正通过
            api.prevent_exit();
        }
        tauri::RunEvent::WindowEvent { label, event, .. } => {
            if label == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                     // 如果正在退出，不要拦截
                    let state = app_handle.state::<AppState>();
                    if let Ok(exiting) = state.is_exiting.lock() {
                        if *exiting {
                            return;
                        }
                    }
                    
                    let window = app_handle.get_webview_window("main").unwrap();
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        }
        _ => {}
    });
}
