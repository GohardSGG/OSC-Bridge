// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{AppHandle, Manager, State};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use auto_launch::AutoLaunch;

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

// 全局状态
struct AppState {
    config: Mutex<AppConfig>,
    auto_launch: Mutex<Option<AutoLaunch>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 获取配置
#[tauri::command]
fn get_config(state: State<AppState>) -> Result<AppConfig, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

// 设置自启动
#[tauri::command]
fn set_auto_start(enabled: bool, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.auto_start = enabled;
    
    // 重新创建AutoLaunch实例以包含正确的参数
    let args = if config.silent_start {
        vec!["--silent"]
    } else {
        vec![]
    };
    
    let new_auto_launch = AutoLaunch::new(
        "OSC Bridge",
        &std::env::current_exe().map_err(|e| e.to_string())?.to_string_lossy(),
        &args,
    );
    
    if enabled {
        new_auto_launch.enable().map_err(|e| format!("启用自启动失败: {}", e))?;
    } else {
        new_auto_launch.disable().map_err(|e| format!("禁用自启动失败: {}", e))?;
    }
    
    // 更新状态中的AutoLaunch实例
    let mut auto_launch_guard = state.auto_launch.lock().map_err(|e| e.to_string())?;
    *auto_launch_guard = Some(new_auto_launch);
    
    Ok(())
}

// 设置静默启动
#[tauri::command]
fn set_silent_start(enabled: bool, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.silent_start = enabled;
    
    // 如果自启动已启用，需要更新AutoLaunch实例以包含新的参数
    if config.auto_start {
        let args = if enabled {
            vec!["--silent"]
        } else {
            vec![]
        };
        
        let new_auto_launch = AutoLaunch::new(
            "OSC Bridge",
            &std::env::current_exe().map_err(|e| e.to_string())?.to_string_lossy(),
            &args,
        );
        
        // 重新启用自启动以应用新参数
        new_auto_launch.enable().map_err(|e| format!("更新自启动配置失败: {}", e))?;
        
        // 更新状态中的AutoLaunch实例
        let mut auto_launch_guard = state.auto_launch.lock().map_err(|e| e.to_string())?;
        *auto_launch_guard = Some(new_auto_launch);
    }
    
    Ok(())
}

// 保存配置到文件
#[tauri::command]
fn save_config(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    
    let app_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    
    let config_path = app_dir.join("config.json");
    let config_json = serde_json::to_string_pretty(&*config).map_err(|e| e.to_string())?;
    std::fs::write(config_path, config_json).map_err(|e| e.to_string())?;
    
    Ok(())
}

// 加载配置从文件
fn load_config(app: &AppHandle) -> AppConfig {
    let app_dir = match app.path().app_config_dir() {
        Ok(dir) => dir,
        Err(_) => return AppConfig::default(),
    };
    
    let config_path = app_dir.join("config.json");
    if !config_path.exists() {
        return AppConfig::default();
    }
    
    match std::fs::read_to_string(config_path) {
        Ok(content) => {
            match serde_json::from_str::<AppConfig>(&content) {
                Ok(config) => config,
                Err(_) => AppConfig::default(),
            }
        }
        Err(_) => AppConfig::default(),
    }
}

// 更新托盘菜单状态
fn update_tray_menu(app: &AppHandle) {
    use tauri::{
        menu::{Menu, MenuItem, PredefinedMenuItem},
    };
    
    let app_state = app.state::<AppState>();
    
    // 先获取配置状态，然后释放锁
    let (auto_start, silent_start) = {
        if let Ok(config) = app_state.config.lock() {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::{
        menu::{Menu, MenuItem},
        tray::TrayIconBuilder,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 加载配置
            let config = load_config(&app.handle());
            
            // 创建自启动实例（如果启用静默启动，添加启动参数）
            let args = if config.silent_start {
                vec!["--silent"]
            } else {
                vec![]
            };
            
            let auto_launch = AutoLaunch::new(
                "OSC Bridge",
                &std::env::current_exe().unwrap().to_string_lossy(),
                &args,
            );
            
            // 初始化应用状态
            let app_state = AppState {
                config: Mutex::new(config.clone()),
                auto_launch: Mutex::new(Some(auto_launch)),
            };
            app.manage(app_state);
            
            // 检查命令行参数或配置，决定是否静默启动
            let args: Vec<String> = std::env::args().collect();
            let should_hide = config.silent_start || args.contains(&"--silent".to_string());
            
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
                            if let Ok(config) = app_state.config.lock() {
                                let new_state = !config.auto_start;
                                drop(config);
                                
                                if let Err(e) = set_auto_start(new_state, app_state.clone()) {
                                    eprintln!("设置自启动失败: {}", e);
                                } else {
                                    let _ = save_config(app.clone(), app_state.clone());
                                    // 更新菜单项状态
                                    update_tray_menu(app);
                                }
                            }
                        }
                        "silent_start" => {
                            if let Ok(config) = app_state.config.lock() {
                                let new_state = !config.silent_start;
                                drop(config);
                                
                                if let Err(e) = set_silent_start(new_state, app_state.clone()) {
                                    eprintln!("设置静默启动失败: {}", e);
                                } else {
                                    let _ = save_config(app.clone(), app_state.clone());
                                    // 更新菜单项状态
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
            greet,
            get_config,
            set_auto_start,
            set_silent_start,
            save_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
