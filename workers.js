const REPO = 'KairoteStudio/Kortina';
const GITHUB_API = 'https://api.github.com/repos';
const GITHUB_RAW = 'https://github.com';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        const workerHost = url.protocol + '//' + url.host;

        const cors = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }

        try {
            if (pathname === '/' || pathname === '/index.html') {
                return handleDashboard(workerHost, cors);
            }

            const updaterMatch = pathname.match(/^\/updater\/(stable|nightly|canary)\.json$/);
            if (updaterMatch) {
                const channel = updaterMatch[1];
                return handleTauriUpdater(channel, workerHost, cors);
            }

            if (pathname === '/latest/stable') {
                return handleStableRelease(workerHost, cors);
            }

            if (pathname === '/latest/nightly') {
                return handleFixedTag('nightly', workerHost, cors);
            }

            if (pathname === '/latest/canary') {
                return handleFixedTag('canary', workerHost, cors);
            }

            if (pathname === '/api/releases') {
                return handleAllReleases(workerHost, cors);
            }

            if (pathname.includes('/releases/download/')) {
                return handleDownload(pathname, url.search, cors);
            }

            // 404
            return jsonResponse({ error: 'Not Found', path: pathname }, 404, cors);

        } catch (err) {
            console.error('Worker Error:', err);
            return jsonResponse({ error: err.message, stack: err.stack }, 500, cors);
        }
    }
};

async function handleTauriUpdater(channel, workerHost, cors) {
    const tagMap = {
        stable: 'latest',
        nightly: 'nightly',
        canary: 'canary'
    };

    const tag = tagMap[channel];
    const apiUrl = tag === 'latest'
    ? `${GITHUB_API}/${REPO}/releases/latest`
    : `${GITHUB_API}/${REPO}/releases/tags/${tag}`;

    const res = await fetch(apiUrl, {
        headers: {
            'User-Agent': 'Cloudflare-Worker-Kortina-Updater',
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!res.ok) {
        return jsonResponse(
            { error: 'GitHub API error', status: res.status, channel },
            502,
            cors
        );
    }

    const data = await res.json();

    const updaterJson = {
        version: data.tag_name,
        notes: data.body || 'No release notes available.',
        pub_date: new Date(data.published_at).toISOString(),
        platforms: {}
    };

    const assets = data.assets || [];
    assets.forEach(asset => {
        const name = asset.name.toLowerCase();
        let platform = null;

        if (name.endsWith('.exe') || name.endsWith('.msi') || name.endsWith('.nsis.exe')) {
            platform = 'windows-x86_64';
        } else if (name.endsWith('.AppImage') || name.endsWith('.deb') || name.endsWith('.rpm')) {
            platform = 'linux-x86_64';
        } else if (name.endsWith('.dmg') || name.endsWith('.app.tar.gz')) {
            platform = 'darwin-x86_64';
        } else if (name.endsWith('.aarch64.dmg') || name.endsWith('.aarch64.app.tar.gz')) {
            platform = 'darwin-aarch64';
        } else if (name.endsWith('.sig')) {
            return;
        }

        if (platform) {
            const proxyUrl = asset.browser_download_url.replace('https://github.com', workerHost);

            updaterJson.platforms[platform] = {
                signature: 'placeholder',
                url: proxyUrl
            };
        }
    });

    if (Object.keys(updaterJson.platforms).length === 0) {
        console.warn('No platform-specific assets found in release:', data.tag_name);
    }

    return jsonResponse(updaterJson, 200, {
        ...cors,
        'Cache-Control': 'public, max-age=300'
    });
}

async function handleStableRelease(workerHost, cors) {
    const apiUrl = `${GITHUB_API}/${REPO}/releases/latest`;
    const res = await fetch(apiUrl, {
        headers: {
            'User-Agent': 'Cloudflare-Worker-Kortina-Hub',
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!res.ok) {
        return jsonResponse({ error: 'GitHub API error', status: res.status }, 502, cors);
    }

    const data = await res.json();
    const result = formatRelease(data, workerHost);
    return jsonResponse(result, 200, cors);
}

async function handleFixedTag(tag, workerHost, cors) {
    const apiUrl = `${GITHUB_API}/${REPO}/releases/tags/${tag}`;
    const res = await fetch(apiUrl, {
        headers: {
            'User-Agent': 'Cloudflare-Worker-Kortina-Hub',
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!res.ok) {
        return jsonResponse({ error: 'GitHub API error', status: res.status, tag }, 502, cors);
    }

    const data = await res.json();
    const result = formatRelease(data, workerHost);
    return jsonResponse(result, 200, cors);
}

async function handleAllReleases(workerHost, cors) {
    const [stableRes, nightlyRes, canaryRes] = await Promise.allSettled([
        fetch(`${GITHUB_API}/${REPO}/releases/latest`, {
            headers: { 'User-Agent': 'Cloudflare-Worker', 'Accept': 'application/vnd.github.v3+json' }
        }),
        fetch(`${GITHUB_API}/${REPO}/releases/tags/nightly`, {
            headers: { 'User-Agent': 'Cloudflare-Worker', 'Accept': 'application/vnd.github.v3+json' }
        }),
        fetch(`${GITHUB_API}/${REPO}/releases/tags/canary`, {
            headers: { 'User-Agent': 'Cloudflare-Worker', 'Accept': 'application/vnd.github.v3+json' }
        })
    ]);

    const result = {
        repository: REPO,
        generated_at: new Date().toISOString(),
        channels: {}
    };

    if (stableRes.status === 'fulfilled' && stableRes.value.ok) {
        result.channels.stable = formatRelease(await stableRes.value.json(), workerHost);
    } else {
        result.channels.stable = { error: 'Failed to fetch', reason: stableRes.reason?.message || stableRes.value?.status };
    }

    if (nightlyRes.status === 'fulfilled' && nightlyRes.value.ok) {
        result.channels.nightly = formatRelease(await nightlyRes.value.json(), workerHost);
    } else {
        result.channels.nightly = { error: 'Failed to fetch', reason: nightlyRes.reason?.message || nightlyRes.value?.status };
    }

    if (canaryRes.status === 'fulfilled' && canaryRes.value.ok) {
        result.channels.canary = formatRelease(await canaryRes.value.json(), workerHost);
    } else {
        result.channels.canary = { error: 'Failed to fetch', reason: canaryRes.reason?.message || canaryRes.value?.status };
    }

    return jsonResponse(result, 200, cors);
}

async function handleDownload(pathname, search, cors) {
    if (!pathname.includes('/releases/download/')) {
        return new Response('Forbidden', { status: 403, headers: cors });
    }

    const githubUrl = `${GITHUB_RAW}${pathname}${search}`;

    const res = await fetch(githubUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
            'User-Agent': 'Cloudflare-Worker-Kortina-Downloader'
        }
    });

    const headers = new Headers(cors);
    const passHeaders = ['content-type', 'content-length', 'content-disposition', 'etag', 'last-modified', 'cache-control'];
    passHeaders.forEach(h => {
        const v = res.headers.get(h);
        if (v) headers.set(h, v);
    });

        return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: headers
        });
}
async function handleDashboard(workerHost, cors) {
    const html = `<!DOCTYPE html>
    <html lang="zh-CN" data-theme="dark">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kortina Release Hub</title>
    <style>
    :root {
        --bg-primary: #1e1e1e;
        --bg-secondary: #252526;
        --bg-tertiary: #2d2d30;
        --text-primary: #cccccc;
        --text-secondary: #969696;
        --border-color: #3e3e42;
        --success-color: #4ec9b0;
        --warning-color: #ffcc02;
        --error-color: #f44747;
        --accent-color: #569cd6;
        --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
        --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.35);
        --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.45);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    @font-face {
        font-family: 'LitalagicaL Mono';
        src: url('https://www.ternaryop.top/cloud-drive/Nineturns/LitalagicaLMono[wght].woff2') format('woff2');
        font-weight: 100 1000;
        font-style: normal;
        font-display: swap;
    }

    @font-face {
        font-family: 'LitalagicaL Mono';
        src: url('https://www.ternaryop.top/cloud-drive/Nineturns/LitalagicaLMono[wght].woff2') format('woff2');
        font-weight: 100 1000;
        font-style: italic;
        font-display: swap;
    }

    body {
        font-family: 'LitalagicaL Mono', 'Courier New', monospace;
        background: var(--bg-primary);
        color: var(--text-primary);
        line-height: 1.6;
        padding: 2rem 1rem;
    }

    .container { max-width: 900px; margin: 0 auto; }

    .header {
        text-align: center;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border-color);
    }

    .header h1 {
        font-size: 1.8rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
    }

    .subtitle {
        color: var(--text-secondary);
        font-size: 0.9rem;
    }

    .card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: var(--shadow-sm);
    }

    .card h2 {
        font-size: 1.2rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-primary);
    }

    .badge {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .badge-stable { background: var(--success-color); color: var(--bg-primary); }
    .badge-nightly { background: var(--accent-color); color: var(--bg-primary); }
    .badge-canary { background: var(--warning-color); color: var(--bg-primary); }

    .meta {
        color: var(--text-secondary);
        font-size: 0.85rem;
        margin-bottom: 1rem;
    }

    .file-list { list-style: none; }

    .file-list li {
        padding: 0.8rem 0;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .file-list li:last-child { border-bottom: none; }

    .file-name {
        font-family: 'LitalagicaL Mono', monospace;
        font-size: 0.9rem;
        color: var(--text-primary);
    }

    .file-size {
        color: var(--text-secondary);
        font-size: 0.8rem;
        margin-top: 0.2rem;
    }

    .download-btn {
        background: var(--bg-secondary);
        color: var(--text-primary);
        text-decoration: none;
        padding: 0.4rem 1rem;
        border-radius: 6px;
        font-size: 0.8rem;
        border: 1px solid var(--text-primary);
        transition: all 0.2s ease;
        cursor: pointer;
    }

    .download-btn:hover {
        background: var(--bg-tertiary);
        border-color: var(--text-primary);
    }

    .api-section { margin-top: 2rem; }

    .endpoint {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.6rem 0;
        border-bottom: 1px solid var(--border-color);
    }

    .endpoint:last-child { border-bottom: none; }

    .endpoint-path {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .method {
        color: var(--success-color);
        font-weight: bold;
        font-size: 0.8rem;
    }

    .path {
        color: var(--text-primary);
        font-family: 'LitalagicaL Mono', monospace;
        font-size: 0.85rem;
    }

    .status {
        color: var(--text-secondary);
        font-size: 0.8rem;
    }

    a { color: var(--accent-color); text-decoration: none; }
    a:hover { text-decoration: underline; }

    .loading {
        color: var(--text-secondary);
        font-style: italic;
    }

    .error {
        color: var(--error-color);
    }

    .updater-section {
        margin-top: 2rem;
        padding: 1rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
    }

    .updater-section h3 {
        font-size: 1rem;
        color: var(--text-primary);
        margin-bottom: 0.8rem;
    }

    .updater-config {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 1rem;
        font-family: 'LitalagicaL Mono', monospace;
        font-size: 0.8rem;
        color: var(--text-primary);
        overflow-x: auto;
    }

    .updater-config .comment { color: var(--text-secondary); }
    .updater-config .key { color: var(--accent-color); }
    .updater-config .string { color: var(--success-color); }
    </style>
    </head>
    <body>
    <div class="container">
    <div class="header">
    <h1>Kortina Release Hub</h1>
    <p class="subtitle">通过 Cloudflare 加速的 GitHub Release 分发与查询中心</p>
    </div>

    <div class="card">
    <h2><span class="badge badge-stable">Stable</span> 正式版</h2>
    <div id="stable-info" class="loading">正在查询...</div>
    </div>

    <div class="card">
    <h2><span class="badge badge-nightly">Nightly</span> 每日构建</h2>
    <div id="nightly-info" class="loading">正在查询...</div>
    </div>

    <div class="card">
    <h2><span class="badge badge-canary">Canary</span> 预览版</h2>
    <div id="canary-info" class="loading">正在查询...</div>
    </div>

    <div class="updater-section">
    <h3>Tauri Updater 配置</h3>
    <p class="meta">在 tauri.conf.json 中使用以下端点进行 IDE 自动更新：</p>
    <div class="updater-config">
    <span class="comment">// tauri.conf.json</span><br>
    {<br>
        &nbsp;&nbsp;<span class="key">"plugins"</span>: {<br>
            &nbsp;&nbsp;&nbsp;&nbsp;<span class="key">"updater"</span>: {<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="key">"endpoints"</span>: [<br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="string">"https://download.kairotestudio.xyz/updater/nightly.json"</span><br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]<br>
                &nbsp;&nbsp;&nbsp;&nbsp;}<br>
                &nbsp;&nbsp;}<br>
    }
    </div>
    </div>

    <div class="card api-section">
    <h2>API 端点</h2>
    <div class="endpoint">
    <div class="endpoint-path">
    <span class="method">GET</span>
    <span class="path">/latest/stable</span>
    </div>
    <span class="status">查询最新 Stable</span>
    </div>
    <div class="endpoint">
    <div class="endpoint-path">
    <span class="method">GET</span>
    <span class="path">/latest/nightly</span>
    </div>
    <span class="status">查询最新 Nightly</span>
    </div>
    <div class="endpoint">
    <div class="endpoint-path">
    <span class="method">GET</span>
    <span class="path">/latest/canary</span>
    </div>
    <span class="status">查询最新 Canary</span>
    </div>
    <div class="endpoint">
    <div class="endpoint-path">
    <span class="method">GET</span>
    <span class="path">/api/releases</span>
    </div>
    <span class="status">统一查询三个渠道</span>
    </div>
    <div class="endpoint">
    <div class="endpoint-path">
    <span class="method">GET</span>
    <span class="path">/updater/{channel}.json</span>
    </div>
    <span class="status">Tauri Updater API</span>
    </div>
    <div class="endpoint">
    <div class="endpoint-path">
    <span class="method">GET</span>
    <span class="path">/releases/download/...</span>
    </div>
    <span class="status">代理下载（加速）</span>
    </div>
    </div>
    </div>

    <script>
    const BASE = location.origin;

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function renderChannel(id, data, tag) {
        const el = document.getElementById(id);
        if (data.error) {
            el.innerHTML = '<div class="error">查询失败: ' + (data.reason || data.error) + '</div>';
            return;
        }

        const assets = data.assets || [];
        let html = '<div class="meta">';
        html += '版本: <strong>' + data.tag_name + '</strong> &nbsp;|&nbsp; ';
        html += '发布: ' + new Date(data.published_at).toLocaleString('zh-CN') + ' &nbsp;|&nbsp; ';
        html += assets.length + ' 个文件';
        html += '</div>';

        if (assets.length > 0) {
            html += '<ul class="file-list">';
            assets.forEach(file => {
                html += '<li>';
                html += '<div><div class="file-name">' + file.name + '</div>';
                html += '<div class="file-size">' + formatBytes(file.size) + ' &middot; ' + (file.download_count || 0) + ' 次下载</div></div>';
                html += '<a class="download-btn" href="' + file.proxy_url + '" target="_blank">下载</a>';
                html += '</li>';
            });
            html += '</ul>';
        } else {
            html += '<div class="meta">暂无附件</div>';
        }

        el.innerHTML = html;
    }

    async function loadAll() {
        try {
            const res = await fetch(BASE + '/api/releases');
            const data = await res.json();
            renderChannel('stable-info', data.channels.stable, 'stable');
            renderChannel('nightly-info', data.channels.nightly, 'nightly');
            renderChannel('canary-info', data.channels.canary, 'canary');
        } catch (e) {
            document.querySelectorAll('.loading').forEach(el => {
                el.innerHTML = '<div class="error">加载失败: ' + e.message + '</div>';
            });
        }
    }

    loadAll();
    </script>
    </body>
    </html>`;

    return new Response(html, {
        status: 200,
        headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' }
    });
}

function formatRelease(data, workerHost) {
    return {
        tag_name: data.tag_name,
        name: data.name,
        body: data.body,
        published_at: data.published_at,
        author: data.author?.login,
        html_url: data.html_url,
        assets: (data.assets || []).map(asset => ({
            name: asset.name,
            size: asset.size,
            download_count: asset.download_count,
            content_type: asset.content_type,
            // 原始 GitHub 直链
            github_url: asset.browser_download_url,
            // 经过 Worker 代理的加速链接（替换域名即可）
            proxy_url: asset.browser_download_url.replace('https://github.com', workerHost)
        }))
    };
}

function jsonResponse(obj, status = 200, cors = {}) {
    return new Response(JSON.stringify(obj, null, 2), {
        status,
        headers: {
            ...cors,
            'Content-Type': 'application/json; charset=utf-8'
        }
    });
}
