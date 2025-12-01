use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    // 获取 Cargo.toml 所在的目录, 即 "Source/Tauri"
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    // 获取编译配置 (debug 或 release)
    let profile = env::var("PROFILE").unwrap();
    // 构建我们期望的最终可执行文件所在的目录
    let target_dir = manifest_dir.join("target").join(profile);

    // 定义配置文件的源路径和目标路径
    let config_src_path = manifest_dir.join("../../Resource/config.json");
    let config_dest_path = target_dir.join("config.json");

    // 确保目标目录存在
    fs::create_dir_all(&target_dir).expect("Failed to create target directory");

    // 执行复制操作
    fs::copy(&config_src_path, &config_dest_path).expect("Failed to copy config.json");

    // 告诉 Cargo 只有当源配置文件变化时才重新运行此脚本
    println!("cargo:rerun-if-changed={}", config_src_path.display());

    tauri_build::build()
}
