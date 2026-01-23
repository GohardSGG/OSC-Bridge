use std::env;
use std::process::Command;

pub fn create_task(args: &[&str]) -> Result<(), String> {
    let exe_path = env::current_exe().map_err(|e| e.to_string())?;
    let exe_str = exe_path.to_str().ok_or("Invalid executable path")?;
    let cwd = exe_path
        .parent()
        .ok_or("Invalid directory")?
        .to_str()
        .ok_or("Invalid directory")?;
    let username = env::var("USERNAME").unwrap_or_else(|_| "Users".to_string());

    let args_str = args.join(" ");

    // XML Definition for Task
    // Uses "InteractiveToken" to run in the user's session.
    let xml_content = format!(
        r#"<?xml version="1.0"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>2024-01-01T00:00:00</Date>
    <Author>OSC Bridge</Author>
    <Description>Auto-start OSC Bridge</Description>
    <URI>\OSC Bridge AutoStart</URI>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <UserId>{}</UserId>
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
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>"{}"</Command>
      <Arguments>{}</Arguments>
      <WorkingDirectory>{}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>"#,
        username, username, exe_str, args_str, cwd
    );

    // Save XML to temp file
    let temp_dir = env::temp_dir();
    let xml_path = temp_dir.join("osc_bridge_autostart.xml");

    std::fs::write(&xml_path, xml_content).map_err(|e| format!("Failed to write XML: {}", e))?;

    // Run schtasks /Create /TN "OSC Bridge" /XML "path" /F
    let output = Command::new("schtasks")
        .args(&[
            "/Create",
            "/TN",
            "OSC Bridge",
            "/XML",
            xml_path.to_str().unwrap(),
            "/F",
        ])
        .output()
        .map_err(|e| format!("Failed to execute schtasks: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("schtasks failed: {}", err));
    }

    Ok(())
}

pub fn delete_task() -> Result<(), String> {
    let _ = Command::new("schtasks")
        .args(&["/Delete", "/TN", "OSC Bridge", "/F"])
        .output();
    Ok(())
}
