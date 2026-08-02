pub mod commands;
pub mod compiler;
pub mod fs;
pub mod git;
pub mod search;
pub mod terminal;
pub mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(crate::terminal::pty_manager::TerminalManager::new())
        .manage(crate::commands::debug_dap::DebugSessionManager::new())
        .manage(crate::compiler::task_manager::TaskManager::new())
        .manage(crate::search::SearchManager::new())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::handlers::greet,
            commands::handlers::terminal_create_session,
            commands::handlers::terminal_write,
            commands::handlers::terminal_resize,
            commands::handlers::terminal_kill_session,
            commands::handlers::get_os_type,
            commands::handlers::get_terminal_profiles,
            commands::handlers::compile,
            commands::handlers::stop_task,
            commands::handlers::run_program,
            commands::handlers::clean_project,
            commands::handlers::execute_terminal_command,
            commands::handlers::execute_terminal_command_realtime,
            commands::handlers::read_directory,
            commands::handlers::read_file,
            commands::handlers::write_file,
            commands::handlers::create_file,
            commands::handlers::delete_file,
            commands::handlers::rename_file,
            commands::handlers::get_current_dir,
            commands::handlers::move_file,
            commands::handlers::copy_file,
            commands::handlers::stat_path,
            commands::handlers::git_clone,
            commands::handlers::get_recent_projects,
            commands::handlers::save_recent_projects,
            commands::handlers::get_current_project_path,
            commands::handlers::save_current_project_path,
            commands::handlers::check_file_exists,
            commands::handlers::detect_compiler_path,
            commands::handlers::start_fs_watch,
            commands::handlers::stop_fs_watch,
            commands::handlers::vcs_is_git_repository,
            commands::handlers::vcs_init,
            commands::handlers::vcs_status,
            commands::handlers::vcs_add,
            commands::handlers::vcs_unstage,
            commands::handlers::vcs_discard,
            commands::handlers::vcs_commit,
            commands::handlers::vcs_log,
            commands::handlers::vcs_branch_list,
            commands::handlers::vcs_checkout,
            commands::handlers::vcs_create_branch,
            commands::handlers::vcs_diff,
            commands::handlers::vcs_push,
            commands::handlers::vcs_pull,
            commands::handlers::vcs_fetch,
            commands::handlers::vcs_merge,
            commands::handlers::vcs_stash,
            commands::handlers::vcs_delete_branch,
            commands::handlers::vcs_remote_list,
            commands::handlers::vcs_add_remote,
            commands::handlers::launch_vcs_panel,
            commands::handlers::update_vcs_theme,
            commands::handlers::launch_settings_window,
            commands::handlers::update_settings_theme,
            commands::handlers::launch_input_dialog,
            commands::handlers::get_input_dialog_state,
            commands::handlers::close_input_dialog,
            commands::handlers::launch_compile_options,
            commands::handlers::get_compile_options_state,
            commands::handlers::close_compile_options,
            commands::handlers::send_theme_to_vcs_panel,
            commands::handlers::close_vcs_panel,
            commands::handlers::get_running_vcs_panels,
            commands::handlers::handle_vcs_panel_message,
            commands::handlers::merge_vcs_to_main,
            commands::handlers::dock_vcs_to_main,
            commands::handlers::undock_vcs_from_main,
            commands::plugin::get_plugins_dir,
            commands::plugin::get_plugins_json,
            commands::plugin::install_plugin,
            commands::plugin::uninstall_plugin,
            commands::plugin::list_installed_plugins,
            commands::plugin::set_plugin_enabled,
            commands::plugin::update_plugin_states,
            commands::plugin::read_file_as_bytes,
            commands::debug_dap::debug_start_session,
            commands::debug_dap::debug_send_request,
            commands::debug_dap::debug_stop_session,
            commands::debug_dap::debug_list_sessions,
            commands::debug_dap::debug_new_session_id,
            commands::marketplace::marketplace_health,
            commands::marketplace::marketplace_list,
            commands::marketplace::marketplace_get,
            commands::marketplace::marketplace_latest,
            commands::marketplace::marketplace_download,
            search::search_files,
            search::cancel_search
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
