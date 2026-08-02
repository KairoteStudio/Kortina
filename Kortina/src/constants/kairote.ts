export const KAIROTE_KEYWORDS = ['function', 'class', 'struct', 'interface', 'enum', 'namespace', 'public', 'private', 'protected', 'internal', 'static', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'throw', 'try', 'catch', 'finally', 'using', 'import', 'as', 'is', 'in', 'new', 'this', 'base', 'true', 'false', 'null', 'var', 'let', 'const', 'readonly', 'template', 'auto', 'asm', 'volatile', 'unique_ptr', 'shared_ptr', 'make_unique', 'make_shared', 'nullptr', 'lock', 'atomic', 'async', 'await', 'extends', 'implements', 'typeof', 'instanceof', 'super', 'export', 'yield', 'typename', 'delete', 'section', 'global', 'equ', 'sizeof', 'nameof', 'checked', 'unchecked', 'delegate', 'event', 'out', 'ref', 'params'];
export const KAIROTE_TYPES = ['int8', 'int16', 'int32', 'int64', 'uint8', 'uint16', 'uint32', 'uint64', 'float32', 'float64', 'bool', 'string', 'char', 'void', 'any', 'object', 'int', 'float', 'double', 'short', 'long', 'ushort', 'ulong', 'size_t', 'array', 'list', 'map', 'set', 'ptr', 'int32*', 'uint32*', 'float32*', 'float64*', 'bool*', 'string*', 'void*', 'int32**', 'uint32**', 'float32**', 'float64**', 'bool**', 'string**', 'void**', 'Console', 'File', 'Directory', 'Path', 'Environment', 'Process', 'Thread', 'Mutex', 'List', 'Dictionary', 'Array', 'Vector', 'Queue', 'Stack', 'HashMap', 'StringBuilder', 'Math', 'Random', 'DateTime', 'Exception', 'MemoryStream', 'BufferedStream', 'safe_array'];
export const KAIROTE_SNIPPETS = [{
  label: 'if',
  insertText: 'if (${1:condition}) {\n  ${2}\n}',
  detail: 'if 条件语句'
}, {
  label: 'for',
  insertText: 'for (${1:int i = 0}; ${2:i < count}; ${3:i++}) {\n  ${4}\n}',
  detail: 'for 循环'
}, {
  label: 'function',
  insertText: 'function ${1:functionName}(${2:parameters}) {\n  ${3}\n}',
  detail: '函数定义'
}, {
  label: 'class',
  insertText: 'class ${1:ClassName}() {\n  ${2}\n}',
  detail: '类定义'
}, {
  label: 'namespace',
  insertText: 'namespace ${1:NamespaceName} {\n  ${2}\n}',
  detail: '命名空间'
}];
export const KAIROTE_FUNCTIONS = [{
  label: 'println',
  insertText: 'println("${1:text}")',
  detail: '打印并换行 (Console.WriteLine)',
  documentation: '打印内容并换行'
}, {
  label: 'print',
  insertText: 'print("${1:text}")',
  detail: '打印 (Console.Write)',
  documentation: '打印内容'
}, {
  label: 'WriteLine',
  insertText: 'WriteLine("${1:text}")',
  detail: '控制台输出并换行',
  documentation: '向控制台写入行'
}, {
  label: 'Write',
  insertText: 'Write("${1:text}")',
  detail: '控制台输出',
  documentation: '向控制台写入文本'
}, {
  label: 'ReadLine',
  insertText: 'ReadLine("${1:text}")',
  detail: '读取一行输入',
  documentation: '从控制台读取一行'
}, {
  label: 'Read',
  insertText: 'Read("${1:text}")',
  detail: '读取输入',
  documentation: '从控制台读取字符'
}, {
  label: 'ReadKey',
  insertText: 'ReadKey()',
  detail: '读取按键',
  documentation: '获取用户按下的下一个字符或功能键'
}, {
  label: 'Clear',
  insertText: 'Clear()',
  detail: '清空控制台',
  documentation: '清除控制台缓冲区和相应的显示窗口'
}, {
  label: 'Beep',
  insertText: 'Beep()',
  detail: '控制台蜂鸣',
  documentation: '通过控制台扬声器播放提示音'
}, {
  label: 'parseInt',
  insertText: 'parseInt(${1:str})',
  detail: '解析整数',
  documentation: '将字符串转换为整数'
}, {
  label: 'parseFloat',
  insertText: 'parseFloat(${1:str})',
  detail: '解析浮点数',
  documentation: '将字符串转换为浮点数'
}, {
  label: 'toString',
  insertText: 'toString(${1:obj})',
  detail: '转换为字符串',
  documentation: '将对象转换为字符串表示形式'
}, {
  label: 'to_upper',
  insertText: 'to_upper(${1:str})',
  detail: '转换为大写',
  documentation: '将字符串转换为大写'
}, {
  label: 'to_lower',
  insertText: 'to_lower(${1:str})',
  detail: '转换为小写',
  documentation: '将字符串转换为小写'
}, {
  label: 'malloc',
  insertText: 'malloc(${1:size})',
  detail: '分配内存',
  documentation: '分配指定大小的内存块'
}, {
  label: 'free',
  insertText: 'free(${1:pointer})',
  detail: '释放内存',
  documentation: '释放之前分配的内存块'
}, {
  label: 'memset',
  insertText: 'memset(${1:pointer}, ${2:value}, ${3:size})',
  detail: '设置内存',
  documentation: '将内存块的每个字节设置为特定值'
}, {
  label: 'memcpy',
  insertText: 'memcpy(${1:dest}, ${2:src}, ${3:size})',
  detail: '复制内存',
  documentation: '从源内存块复制数据到目标内存块'
}, {
  label: 'memmove',
  insertText: 'memmove(${1:dest}, ${2:src}, ${3:size})',
  detail: '内存移动',
  documentation: '移动内存块'
}, {
  label: 'memcmp',
  insertText: 'memcmp(${1:ptr1}, ${2:ptr2}, ${3:size})',
  detail: '内存比较',
  documentation: '比较两个内存块'
}, {
  label: 'make_unique',
  insertText: 'make_unique<${1:T}>(${2:args})',
  detail: '创建unique_ptr',
  documentation: '创建一个新的unique_ptr'
}, {
  label: 'make_shared',
  insertText: 'make_shared<${1:T}>(${2:args})',
  detail: '创建shared_ptr',
  documentation: '创建一个新的shared_ptr'
}, {
  label: 'strlen',
  insertText: 'strlen(${1:str})',
  detail: '字符串长度',
  documentation: '返回字符串的长度'
}, {
  label: 'strcmp',
  insertText: 'strcmp(${1:str1}, ${2:str2})',
  detail: '比较字符串',
  documentation: '比较两个字符串是否相等'
}, {
  label: 'strcpy',
  insertText: 'strcpy(${1:dest}, ${2:src})',
  detail: '复制字符串',
  documentation: '将源字符串复制到目标字符串'
}, {
  label: 'strcat',
  insertText: 'strcat(${1:dest}, ${2:src})',
  detail: '连接字符串',
  documentation: '将源字符串连接到目标字符串末尾'
}, {
  label: 'substring',
  insertText: 'substring(${1:str}, ${2:start}, ${3:length})',
  detail: '子字符串',
  documentation: '返回字符串的子字符串'
}, {
  label: 'indexOf',
  insertText: 'indexOf(${1:str}, ${2:char})',
  detail: '查找索引',
  documentation: '返回字符在字符串中的索引位置'
}, {
  label: 'find',
  insertText: 'find(${1:str}, ${2:substr})',
  detail: '查找子串',
  documentation: '在字符串中查找子字符串的位置'
}, {
  label: 'replace',
  insertText: 'replace(${1:str}, ${2:old}, ${3:new})',
  detail: '替换字符串',
  documentation: '替换字符串中的指定子字符串'
}, {
  label: 'split',
  insertText: 'split(${1:str}, ${2:separator})',
  detail: '分割字符串',
  documentation: '根据分隔符分割字符串'
}, {
  label: 'contains',
  insertText: 'contains(${1:str}, ${2:substr})',
  detail: '检查包含',
  documentation: '检查字符串是否包含子串'
}, {
  label: 'startsWith',
  insertText: 'startsWith(${1:str}, ${2:prefix})',
  detail: '检查开头',
  documentation: '检查字符串是否以指定前缀开头'
}, {
  label: 'endsWith',
  insertText: 'endsWith(${1:str}, ${2:suffix})',
  detail: '检查结尾',
  documentation: '检查字符串是否以指定后缀结尾'
}, {
  label: 'trim',
  insertText: 'trim(${1:str})',
  detail: '去除空白',
  documentation: '去除字符串两端的空白字符'
}, {
  label: 'length',
  insertText: 'length',
  detail: '获取长度',
  documentation: '获取数组或字符串的长度'
}, {
  label: 'size',
  insertText: 'size()',
  detail: '获取大小',
  documentation: '获取集合的大小'
}, {
  label: 'push',
  insertText: 'push(${1:item})',
  detail: '添加到数组末尾',
  documentation: '向数组末尾添加元素'
}, {
  label: 'pop',
  insertText: 'pop()',
  detail: '从数组末尾移除',
  documentation: '移除并返回数组最后一个元素'
}, {
  label: 'shift',
  insertText: 'shift()',
  detail: '从数组开头移除',
  documentation: '移除并返回数组第一个元素'
}, {
  label: 'unshift',
  insertText: 'unshift(${1:item})',
  detail: '添加到数组开头',
  documentation: '向数组开头添加元素'
}, {
  label: 'add',
  insertText: 'add(${1:item})',
  detail: '添加元素',
  documentation: '向集合添加元素'
}, {
  label: 'remove',
  insertText: 'remove(${1:item})',
  detail: '移除元素',
  documentation: '从集合移除元素'
}, {
  label: 'insert',
  insertText: 'insert(${1:index}, ${2:item})',
  detail: '插入元素',
  documentation: '在指定位置插入元素'
}, {
  label: 'clear',
  insertText: 'clear()',
  detail: '清空集合',
  documentation: '移除集合中的所有元素'
}, {
  label: 'sort',
  insertText: 'sort()',
  detail: '排序',
  documentation: '对集合进行排序'
}, {
  label: 'reverse',
  insertText: 'reverse()',
  detail: '反转',
  documentation: '反转集合中的元素顺序'
}, {
  label: 'join',
  insertText: 'join(${1:separator})',
  detail: '连接数组',
  documentation: '将数组元素连接成字符串'
}, {
  label: 'abs',
  insertText: 'abs(${1:x})',
  detail: '绝对值',
  documentation: '返回数的绝对值'
}, {
  label: 'sqrt',
  insertText: 'sqrt(${1:x})',
  detail: '平方根',
  documentation: '返回数的平方根'
}, {
  label: 'pow',
  insertText: 'pow(${1:base}, ${2:exponent})',
  detail: '幂运算',
  documentation: '返回数的指定次幂'
}, {
  label: 'max',
  insertText: 'max(${1:a}, ${2:b})',
  detail: '最大值',
  documentation: '返回两个数中的较大值'
}, {
  label: 'min',
  insertText: 'min(${1:a}, ${2:b})',
  detail: '最小值',
  documentation: '返回两个数中的较小值'
}, {
  label: 'random',
  insertText: 'random()',
  detail: '随机数',
  documentation: '生成随机数'
}, {
  label: 'get_total_memory',
  insertText: 'get_total_memory()',
  detail: '获取总内存',
  documentation: '返回系统总内存'
}, {
  label: 'get_free_memory',
  insertText: 'get_free_memory()',
  detail: '获取空闲内存',
  documentation: '返回系统空闲内存'
}, {
  label: 'get_memory_stats',
  insertText: 'get_memory_stats()',
  detail: '获取内存统计',
  documentation: '返回内存统计信息'
}, {
  label: 'create_thread',
  insertText: 'create_thread(${1:func})',
  detail: '创建线程',
  documentation: '创建一个新线程'
}, {
  label: 'sleep',
  insertText: 'sleep(${1:ms})',
  detail: '线程睡眠',
  documentation: '使当前线程暂停指定毫秒数'
}, {
  label: 'exit',
  insertText: 'exit(${1:code})',
  detail: '退出程序',
  documentation: '终止程序执行'
}, {
  label: 'File.Open',
  insertText: 'File.Open("${1:path}", ${2:mode})',
  detail: '打开文件',
  documentation: '打开指定路径的文件'
}, {
  label: 'File.ReadAll',
  insertText: 'File.ReadAll("${1:path}")',
  detail: '读取全部内容',
  documentation: '读取文件的所有内容'
}, {
  label: 'File.Write',
  insertText: 'File.Write("${1:path}", "${2:content}")',
  detail: '写入文件',
  documentation: '将内容写入文件'
}, {
  label: 'File.Close',
  insertText: 'File.Close()',
  detail: '关闭文件',
  documentation: '关闭打开的文件'
}, {
  label: 'Directory.Create',
  insertText: 'Directory.Create(${1:path})',
  detail: '创建目录',
  documentation: '创建新目录'
}, {
  label: 'Directory.Delete',
  insertText: 'Directory.Delete(${1:path})',
  detail: '删除目录',
  documentation: '删除目录'
}, {
  label: 'Path.Combine',
  insertText: 'Path.Combine(${1:path1}, ${2:path2})',
  detail: '组合路径',
  documentation: '组合两个路径字符串'
}, {
  label: 'Path.GetExtension',
  insertText: 'Path.GetExtension(${1:path})',
  detail: '获取扩展名',
  documentation: '获取文件的扩展名'
}];
export const KAIROTE_LANGUAGE_DEF = {
  ignoreCase: false,
  tokenizer: {
    root: [[/\/\/.*$/, 'comment'], [/\/\*/, 'comment', '@comment'], [/"([^"\\]|\\.)*$/, 'string.invalid'], [/"/, 'string', '@string'], [/\d*\.\d+([eE][\-+]?\d+)?[fFdD]?/, 'number.float'], [/0[xX][0-9a-fA-F]+[Ll]?/, 'number.hex'], [/\d+[Ll]?/, 'number'], [/\b(abstract|as|base|break|case|catch|class|const|continue|default|delegate|do|else|enum|event|explicit|extern|false|finally|fixed|for|foreach|goto|if|implicit|in|interface|internal|is|lock|namespace|new|null|operator|out|override|params|private|protected|public|readonly|ref|return|sealed|sizeof|stackalloc|static|struct|switch|this|throw|true|try|typeof|unchecked|unsafe|using|virtual|volatile|while|yield)\b/, 'keyword'], [/\b(void|bool|byte|char|decimal|double|float|int|long|object|sbyte|short|string|uint|ulong|ushort)\b/, 'type'], [/\b(public|private|protected|internal)\b/, 'keyword'], [/\b(add|alias|ascending|async|await|by|descending|dynamic|equals|from|get|global|group|into|join|let|nameof|on|orderby|partial|remove|select|set|value|var|when|where|yield)\b/, 'keyword'], [/\b(section|asm|volatile|align|global|extern|db|dw|dd|dq|times|call|jmp|jz|jnz|ja|jb|je|jne|jl|jg|jle|jge|push|pop|mov|add|sub|mul|div|inc|dec|cmp|test|and|or|xor|not|neg|lea|nop|int|ret|syscall|enter|leave|loop|loope|loopne|pusha|popa|pushf|popf|cli|sti|hlt|in|out|movsb|movsw|movsd|cmpsb|cmpsw|cmpsd|scasb|scasw|scasd|lodsb|lodsw|lodsd|stosb|stosw|stosd|rep|repe|repne)\b/, 'keyword.special'], [/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/, 'function'], [/[+\-*=<>!&|^~?:]/, 'operator'], [/(\+\+|--)/, 'operator'], [/(<<|>>)/, 'operator'], [/(&&|\|\|)/, 'operator'], [/(==|!=|<=|>=)/, 'operator'], [/(\+=|-=|\*=|\/=|%=)/, 'operator'], [/[{}()\[\];,\.]/, 'delimiter'], [/#\s*\w+/, 'preprocessor'], [/^\s*[a-zA-Z_][a-zA-Z0-9_]*:/, 'label'], [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'], [/\s+/, 'white']],
    comment: [[/[^\/*]+/, 'comment'], [/\*\//, 'comment'], [/[\/*]/, 'comment']],
    string: [[/[^\\"]+/, 'string'], [/\\./, 'string.escape'], [/"/, 'string', '@pop']]
  }
};