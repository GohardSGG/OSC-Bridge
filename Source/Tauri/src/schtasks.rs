use std::fs;
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::{Command, Output};

const TASK_XML_DIR: &str = "tasks";
const TASK_NAME: &str = "OSC-Bridge";

pub fn get_exe_path() -> Result<PathBuf, String> {
    std::env::current_exe().map_err(|e| format!("failed to get exe path: {}", e))
}

fn get_task_user_id() -> Result<String, String> {
    let username = std::env::var("USERNAME").map_err(|_| "failed to get username")?;
    let domain = std::env::var("USERDOMAIN").ok();

    if let Some(d) = domain {
        Ok(format!("{}\\{}", d, username))
    } else {
        Ok(username)
    }
}

// XML 转义
fn xml_escape(value: &str) -> String {
    value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&apos;")
}

fn build_task_xml() -> Result<String, String> {
    let exe_path = get_exe_path()?;
    let exe_path_str = xml_escape(&exe_path.to_string_lossy());
    let user_id = xml_escape(&get_task_user_id()?);
    let app_dir = exe_path
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."));
    let working_dir = xml_escape(&app_dir.to_string_lossy());

    // 关键配置：
    // 1. <LogonType>InteractiveToken</LogonType>: 强制需要用户登录且有交互令牌
    // 2. <RunLevel>HighestAvailable</RunLevel>: 申请最高权限(Admin)
    // 3. <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>: 允许电池模式启动
    // 4. <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>: 无运行时间限制

    Ok(format!(
        r#"<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <Delay>PT3S</Delay>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>{}</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>false</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>3</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{}</Command>
      <Arguments>--silent</Arguments>
      <WorkingDirectory>{}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"#,
        user_id, exe_path_str, working_dir
    ))
}

// 写入 UTF-16 LE 编码的文件 (带 BOM)
fn write_task_xml() -> Result<PathBuf, String> {
    let xml_content = build_task_xml()?;

    let app_dir = dirs::config_dir()
        .ok_or("Unknown config dir")?
        .join("OSC-Bridge")
        .join(TASK_XML_DIR);
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }

    let file_path = app_dir.join("autostart.xml");

    // 手动编码为 UTF-16LE
    let mut bytes = Vec::with_capacity(2 + xml_content.len() * 2);
    // BOM
    bytes.extend_from_slice(&[0xFF, 0xFE]);
    for wide_char in xml_content.encode_utf16() {
        bytes.extend_from_slice(&wide_char.to_le_bytes());
    }

    fs::write(&file_path, bytes).map_err(|e| format!("failed to write xml: {}", e))?;

    Ok(file_path)
}

pub fn create_task() -> Result<(), String> {
    let xml_path = write_task_xml()?;

    // 先尝试删除旧的
    let _ = Command::new("schtasks")
        .arg("/Delete")
        .arg("/TN")
        .arg(TASK_NAME)
        .arg("/F")
        .creation_flags(0x08000000)
        .output();

    let output = Command::new("schtasks")
        .arg("/Create")
        .arg("/TN")
        .arg(TASK_NAME)
        .arg("/XML")
        .arg(&xml_path.to_string_lossy().into_owned())
        .arg("/F")
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Schtasks failed: {}", stderr));
    }

    Ok(())
}

pub fn delete_task() -> Result<(), String> {
    let output = Command::new("schtasks")
        .arg("/Delete")
        .arg("/TN")
        .arg(TASK_NAME)
        .arg("/F")
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| e.to_string())?;

    // 忽略找不到文件的错误
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if !stderr.contains("The specified task name was not found") {
            return Err(format!("Schtasks delete failed: {}", stderr));
        }
    }
    Ok(())
}
