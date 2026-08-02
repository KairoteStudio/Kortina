use once_cell::sync::Lazy;
use std::sync::Mutex;
use std::time::{Duration, Instant};

static COMMAND_CACHE: Lazy<Mutex<std::collections::HashMap<String, (String, Instant)>>> =
    Lazy::new(|| Mutex::new(std::collections::HashMap::new()));

pub fn cache_command_result(key: String, result: String) {
    let mut cache = COMMAND_CACHE.lock().unwrap();
    cache.insert(key, (result, Instant::now()));
}

pub fn get_cached_command_result(key: String) -> Option<String> {
    let cache = COMMAND_CACHE.lock().unwrap();
    if let Some((cached_result, timestamp)) = cache.get(&key) {
        if timestamp.elapsed() < Duration::from_secs(5) {
            return Some(cached_result.clone());
        }
    }
    None
}

pub fn clean_expired_cache() {
    let mut cache = COMMAND_CACHE.lock().unwrap();
    cache.retain(|_, (_, timestamp)| timestamp.elapsed() < Duration::from_secs(5));
}
