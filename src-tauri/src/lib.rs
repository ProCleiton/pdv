use std::fs::{self, OpenOptions};
use std::io::Write;
use tauri::Manager;

/// Retorna o diretório de logs: %APPDATA%/pdv-comercialia/logs/
#[tauri::command]
fn get_log_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("logs");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

/// Acrescenta uma linha ao arquivo de log. Cria o arquivo se não existir.
#[tauri::command]
fn append_log_line(
    app: tauri::AppHandle,
    filename: String,
    line: String,
) -> Result<(), String> {
    let logs_dir = app
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("logs");
    fs::create_dir_all(&logs_dir).map_err(|e| e.to_string())?;
    let path = logs_dir.join(&filename);
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    writeln!(file, "{}", line).map_err(|e| e.to_string())?;
    Ok(())
}

/// Retorna os argumentos da linha de comando passados ao PDV.
/// O frontend principal passa: --auth-token=<jwt> --estabelecimento=<id> --licenca=<chave>
#[tauri::command]
fn get_launch_args() -> Vec<String> {
    std::env::args().skip(1).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_log_dir,
            append_log_line,
            get_launch_args,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
