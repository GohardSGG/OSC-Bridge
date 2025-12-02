use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let profile = env::var("PROFILE").unwrap();
    let target_dir = manifest_dir.join("target").join(&profile);

    let (config_src_path, config_dest_name) = if profile == "release" {
        (manifest_dir.join("../../Resource/config_pure.json"), "config_default.json")
    } else {
        (manifest_dir.join("../../Resource/config.json"), "config.json")
    };
    
    let config_dest_path = target_dir.join(config_dest_name);

    fs::create_dir_all(&target_dir).expect("Failed to create target directory");

    if config_src_path.exists() {
        fs::copy(&config_src_path, &config_dest_path).expect("Failed to copy config file");
        println!("cargo:rerun-if-changed={}", config_src_path.display());
    }

    tauri_build::build()
}
