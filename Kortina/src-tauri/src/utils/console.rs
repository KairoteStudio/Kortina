use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Column {
    pub heading: String,
    pub data: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OutputTable {
    pub cols: Vec<Column>,
}

impl OutputTable {
    pub fn new() -> Self {
        OutputTable { cols: Vec::new() }
    }

    pub fn add_column(&mut self, heading: &str, data: Vec<String>) {
        self.cols.push(Column {
            heading: heading.to_string(),
            data,
        });
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "data")]
pub enum ConsoleInteraction {
    PromptYn {
        message: String,
        default: bool,
    },
    PromptSelect {
        message: String,
        options: Vec<String>,
        default: usize,
    },
    PromptInput {
        message: String,
        placeholder: String,
    },
    ProgressBar {
        id: String,
        label: String,
        total: u64,
        current: u64,
    },
    Table(OutputTable),
}
