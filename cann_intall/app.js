// ==================== 工具函数（语法高亮和 HTML 转义） ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function highlightBash(code) {
  const keywords = ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'in', 'export', 'echo', 'printf'];
  const builtins = ['apt', 'apt-get', 'apt-cache', 'sudo', 'cd', 'ls', 'cat', 'grep', 'sed', 'awk', 'find', 'wget', 'curl', 'chmod', 'chown', 'mkdir', 'rm', 'cp', 'mv', 'tar', 'python3', 'pip', 'pip3', 'python', 'source', 'uname', 'npu-smi', 'npm', 'node'];

  const lines = code.split('\n');
  const highlighted = lines.map(line => {
    if (line.trim().startsWith('#')) {
      return `<span class="com">${escapeHtml(line)}</span>`;
    }

    let result = escapeHtml(line);
    result = result.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, '<span class="var">${$1}</span>');
    result = result.replace(/\$([A-Z_][A-Z0-9_]*)/g, '<span class="var">$$$1</span>');
    keywords.forEach(kw => {
      const re = new RegExp(`\\b(${kw})\\b`, 'g');
      result = result.replace(re, '<span class="kw">$1</span>');
    });
    builtins.forEach(cmd => {
      const re = new RegExp(`\\b(${cmd})\\b`, 'g');
      result = result.replace(re, '<span class="fn">$1</span>');
    });
    result = result.replace(/"([^"]*)"/g, '<span class="str">"$1"</span>');
    result = result.replace(/'([^']*)'/g, '<span class="str">\'$1\'</span>');
    result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');

    return result;
  });

  return highlighted.join('\n');
}

// ==================== main.ts 步骤化内容定义（支持按步骤替换） ====================
const mainTsHeader = `#!/usr/bin/env bash
# ============================================================
# CANN 通用安装脚本 (适用于 Ubuntu 22.04 / 昇腾 NPU)
# ============================================================
# 版本: CANN 8.0.RC1 | Python 3.10 | aarch64/x86_64
# 依赖: Ascend NPU 驱动已安装 (/usr/local/Ascend/driver)
`;

const mainTsSteps = [
  {
    title: '检查系统环境',
    code: `echo "=== 步骤 1/5: 系统环境检测 ==="
uname -a
cat /etc/os-release | grep VERSION=
python3 --version
npu-smi info`
  },
  {
    title: '安装系统依赖',
    code: `echo "=== 步骤 2/5: 安装系统依赖 ==="
sudo apt update
sudo apt install -y \\
    build-essential \\
    cmake \\
    python3-pip \\
    libgl1-mesa-glx \\
    libglib2.0-0`
  },
  {
    title: '安装 CANN 社区版',
    code: `echo "=== 步骤 3/5: 下载并安装 CANN Toolkit ==="
export CANN_VERSION="8.0.RC1"
export ARCH=$(uname -m)
export ASCEND_HOME="/usr/local/Ascend"

wget https://repo.huaweicloud.com/ascend/cann/\${CANN_VERSION}/CANN-Toolkit_\${ARCH}.run
chmod +x CANN-Toolkit_\${ARCH}.run
./CANN-Toolkit_\${ARCH}.run --install-path=\${ASCEND_HOME} --install`
  },
  {
    title: '配置 Python 环境',
    code: `echo "=== 步骤 4/5: 配置 Python 环境 ==="
pip3 install --upgrade pip
pip3 install torch torchvision torchaudio \\
    --index-url https://download.pytorch.org/whl/cpu
pip3 install torch-npu`
  },
  {
    title: '配置环境变量 & 验证',
    code: `echo "=== 步骤 5/5: 配置环境变量 ==="
source \${ASCEND_HOME}/nnae/latest/bin/setenv.sh
export LD_LIBRARY_PATH=\${ASCEND_HOME}/nnae/latest/lib64:\${LD_LIBRARY_PATH}

python3 -c "import torch; print('NPU available:', torch.cuda.is_available())"
python3 -c "import torch_npu; print('torch-npu OK')"

echo "✅ CANN 安装完成！运行 python3 main.py 开始使用"`
  }
];

// 生成 main.ts 的完整带语法高亮内容
function generateMainTsContent() {
  let content = '\n' + highlightBash(mainTsHeader) + '\n';
  mainTsSteps.forEach((step, idx) => {
    content += `<span class="com"># --- Step ${idx + 1}: ${step.title}${'-'.repeat(Math.max(41 - step.title.length, 10))}</span>\n`;
    content += highlightBash(step.code) + '\n\n';
  });
  return content;
}

// ==================== 文件内容定义（Trae 风格） ====================
const files = {
  main: {
    name: 'main.ts',
    icon: 'ts-icon',
    breadcrumbs: ['cann-install', 'src', 'main.ts', 'install_cann'],
    lines: 59,
    content: generateMainTsContent()
  },
  utils: {
    name: 'utils.ts',
    icon: 'ts-icon',
    breadcrumbs: ['cann-install', 'src', 'utils.ts', 'checkNpu'],
    lines: 32,
    content: `
<span class="com">// CANN 环境检测工具函数</span>

<span class="kw">import</span> { execSync } <span class="kw">from</span> <span class="str">'child_process'</span>;

<span class="kw">export interface</span> <span class="type">EnvInfo</span> {
  os: <span class="type">string</span>;
  arch: <span class="type">string</span>;
  python: <span class="type">string</span>;
  npuModel?: <span class="type">string</span>;
  npuDriver?: <span class="type">string</span>;
}

<span class="com">/**
 * 检测昇腾 NPU 硬件信息
 * @returns NPU 型号和驱动版本
 */</span>
<span class="kw">export function</span> <span class="fn">checkNpu</span>(): <span class="type">EnvInfo</span> {
  <span class="kw">const</span> <span class="var">info</span>: <span class="type">EnvInfo</span> = {
    os: <span class="fn">execSync</span>(<span class="str">'cat /etc/os-release'</span>).<span class="fn">toString</span>(),
    arch: <span class="fn">execSync</span>(<span class="str">'uname -m'</span>).<span class="fn">toString</span>().<span class="fn">trim</span>(),
    python: <span class="fn">execSync</span>(<span class="str">'python3 --version'</span>).<span class="fn">toString</span>(),
  };
  <span class="kw">try</span> {
    info.npuDriver = <span class="fn">execSync</span>(<span class="str">'npu-smi -v'</span>).<span class="fn">toString</span>();
    info.npuModel = <span class="fn">execSync</span>(<span class="str">'npu-smi info -t product-id'</span>).<span class="fn">toString</span>();
  } <span class="kw">catch</span> (e) {
    info.npuDriver = <span class="str">'未检测到 NPU 驱动'</span>;
  }
  <span class="kw">return</span> info;
}

<span class="com">/**
 * 验证 CANN 兼容性
 * @param env - 当前环境信息
 * @param cannVersion - 目标 CANN 版本
 */</span>
<span class="kw">export function</span> <span class="fn">validateCannCompat</span>(
  env: <span class="type">EnvInfo</span>,
  cannVersion: <span class="type">string</span>
): <span class="type">boolean</span> {
  <span class="kw">return</span> env.arch === <span class="str">'aarch64'</span> || env.arch === <span class="str">'x86_64'</span>;
}
`
  },
  package: {
    name: 'package.json',
    icon: 'json-icon',
    breadcrumbs: ['cann-install', 'package.json'],
    lines: 22,
    content: `
{
  <span class="prop">"name"</span>: <span class="str">"cann-install"</span>,
  <span class="prop">"version"</span>: <span class="str">"1.0.0"</span>,
  <span class="prop">"description"</span>: <span class="str">"CANN 昇腾 AI 框架一键安装脚本"</span>,
  <span class="prop">"main"</span>: <span class="str">"main.ts"</span>,
  <span class="prop">"scripts"</span>: {
    <span class="prop">"check-env"</span>: <span class="str">"node utils.ts"</span>,
    <span class="prop">"install"</span>: <span class="str">"bash main.ts"</span>,
    <span class="prop">"verify"</span>: <span class="str">"python3 -c 'import torch_npu'"</span>
  },
  <span class="prop">"cannConfig"</span>: {
    <span class="prop">"version"</span>: <span class="str">"8.0.RC1"</span>,
    <span class="prop">"python"</span>: <span class="str">">=3.8"</span>,
    <span class="prop">"arch"</span>: [<span class="str">"aarch64"</span>, <span class="str">"x86_64"</span>],
    <span class="prop">"os"</span>: [<span class="str">"Ubuntu 22.04"</span>, <span class="str">"openEuler 22.03"</span>]
  },
  <span class="prop">"devDependencies"</span>: {
    <span class="prop">"typescript"</span>: <span class="str">"^5.3.0"</span>
  }
}
`
  },
  readme: {
    name: 'README.md',
    icon: 'md-icon',
    breadcrumbs: ['cann-install', 'README.md'],
    lines: 22,
    content: `
<span class="com"># CANN 安装指南</span>

用于昇腾 <span class="kw">NPU</span> 硬件的 <span class="kw">CANN</span> 框架安装工具。

<span class="com">## 快速开始</span>

<span class="str">1. 环境检测</span>
<span class="str">2. 下载 CANN Toolkit</span>
<span class="str">3. 配置 Python 环境</span>
<span class="str">4. 验证安装</span>

<span class="com">## 硬件要求</span>

- 昇腾 <span class="kw">910</span>A / <span class="kw">910</span>B / <span class="kw">310</span>P 系列 NPU
- <span class="kw">16GB+</span> 内存
- 操作系统: Ubuntu <span class="kw">22.04</span>

<span class="kw">\`\`\`</span><span class="fn">bash
npm install
npm run dev
</span><span class="kw">\`\`\`</span>

<span class="com">## 技术栈</span>

| 技术 | 版本 |
| ---- | ---- |
| Vue | 3.4.0 |
| TypeScript | 5.3.0 |
| Vite | 5.0.0 |

<span class="com">## 许可证</span>

MIT License
`
  },
  styles: {
    name: 'styles.css',
    icon: 'css-icon',
    breadcrumbs: ['my-project', 'src', 'styles.css', 'body'],
    lines: 20,
    content: `
<span class="com">/* 全局样式 */</span>

<span class="fn">body</span> {
  <span class="prop">font-family</span>: -apple-system, sans-serif;
  <span class="prop">background</span>: <span class="str">#1e1e1e</span>;
  <span class="prop">color</span>: <span class="str">#d4d4d4</span>;
  <span class="prop">line-height</span>: <span class="num">1.6</span>;
  <span class="prop">margin</span>: <span class="num">0</span>;
}

<span class="fn">.container</span> {
  <span class="prop">max-width</span>: <span class="num">1200px</span>;
  <span class="prop">padding</span>: <span class="num">20px</span>;
  <span class="prop">margin</span>: <span class="num">0</span> auto;
}

<span class="fn">.button-primary</span> {
  <span class="prop">padding</span>: <span class="num">8px</span> <span class="num">16px</span>;
  <span class="prop">border-radius</span>: <span class="num">4px</span>;
  <span class="prop">background</span>: <span class="str">#007acc</span>;
  <span class="prop">color</span>: <span class="str">#fff</span>;
  <span class="prop">border</span>: <span class="num">none</span>;
  <span class="prop">cursor</span>: pointer;
}

<span class="fn">.button-primary:hover</span> {
  <span class="prop">background</span>: <span class="str">#005a9e</span>;
}
`
  }
};

// ==================== 渲染函数 ====================
function renderLineNumbers(count) {
  const lineEl = document.getElementById('lineNumbers');
  if (!lineEl) return;
  let html = '';
  for (let i = 1; i <= count; i++) {
    html += `<div>${i}</div>`;
  }
  lineEl.innerHTML = html;
}

function renderBreadcrumbs(crumbs) {
  const container = document.getElementById('breadcrumbs');
  if (!container) return;
  let html = '';
  const icon = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" class="breadcrumb-sep"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>`;
  html += '<div class="breadcrumbs__left">';
  crumbs.forEach((crumb, idx) => {
    if (idx > 0) html += icon;
    html += `<span>${crumb}</span>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function openFile(key) {
  const file = files[key];
  if (!file) return;

  const codeEl = document.getElementById('code');
  const titleEl = document.getElementById('titleFile');
  if (!codeEl) return;

  const codeHtml = file.content.replace(/^\n/, '');
  codeEl.innerHTML = codeHtml;

  renderLineNumbers(file.lines);
  renderBreadcrumbs(file.breadcrumbs);

  if (titleEl) titleEl.textContent = file.name;

  document.querySelectorAll('.tree__row[data-file]').forEach(n => n.classList.remove('active'));
  const fileRow = document.querySelector(`.tree__row[data-file="${key}"]`);
  if (fileRow) fileRow.classList.add('active');

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tab = document.querySelector(`.tab[data-file="${key}"]`);
  if (tab) tab.classList.add('active');

  codeEl.scrollTop = 0;
}

// ==================== 事件绑定 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 文件树点击
  document.querySelectorAll('.tree__row[data-file]').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = row.dataset.file;
      if (!document.querySelector(`.tab[data-file="${key}"]`)) {
        // 如果 Tab 不存在，创建它
        const tabsContainer = document.getElementById('tabs');
        const file = files[key];
        if (file && tabsContainer) {
          const newTab = document.createElement('div');
          newTab.className = 'tab active';
          newTab.dataset.file = key;
          newTab.innerHTML = `
            <span class="tab__icon file-icon ${file.icon}">${file.icon === 'ts-icon' ? 'TS' : file.icon === 'json-icon' ? '{ }' : file.icon === 'md-icon' ? 'M' : 'CSS'}</span>
            <span class="tab__label">${file.name}</span>
            <span class="tab__close" title="关闭">×</span>
          `;
          tabsContainer.appendChild(newTab);
          setupTabEvents(newTab);
        }
      }
      openFile(key);
    });
  });

  // 文件夹折叠/展开
  document.querySelectorAll('.tree__row[data-type="folder"]').forEach(folder => {
    folder.addEventListener('click', (e) => {
      e.stopPropagation();
      folder.classList.toggle('open');
      const children = folder.nextElementSibling;
      if (children && children.classList.contains('tree__children')) {
        children.classList.toggle('open');
      }
      // 更新 chevron 图标
      const chev = folder.querySelector('.tree__chevron');
      if (chev) {
        const isOpen = folder.classList.contains('open');
        chev.innerHTML = isOpen
          ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
      }
    });
  });

  // 侧边栏区域标题折叠
  document.querySelectorAll('.section__title').forEach(title => {
    title.addEventListener('click', (e) => {
      // 只处理没有操作按钮的部分
      const content = title.nextElementSibling;
      if (content && (content.classList.contains('tree') || content.classList.contains('tree__children'))) {
        content.style.display = content.style.display === 'none' ? '' : 'none';
      }
    });
  });

  // Tab 点击与关闭
  document.querySelectorAll('.tab').forEach(setupTabEvents);

  // 活动栏按钮切换 - 联动侧边栏视图和底部面板
  document.querySelectorAll('.activitybar__item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.activitybar__item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const view = btn.dataset.view;
      const sidebar = document.querySelector('.sidebar');
      const bottomPanel = document.querySelector('.bottom-panel');

      // AI 视图：聚焦右侧 AI 面板
      if (view === 'ai') {
        // 滚动到 AI 消息区
        const aiBody = document.getElementById('aiBody');
        if (aiBody) {
          aiBody.scrollTop = aiBody.scrollHeight;
        }
        // 高亮 AI 面板（短暂闪烁提示）
        const aipanel = document.getElementById('aipanel');
        if (aipanel) {
          aipanel.style.boxShadow = '0 0 0 2px #007acc';
          setTimeout(() => { aipanel.style.boxShadow = ''; }, 800);
        }
      }
    });
  });

  // 底部面板 Tab 切换
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const panelName = tab.dataset.panel;
      document.querySelectorAll('.panel-content').forEach(panel => {
        panel.setAttribute('data-active', panel.dataset.panel === panelName ? 'true' : 'false');
      });

      // 确保底部面板可见
      const bottomPanel = document.querySelector('.bottom-panel');
      if (bottomPanel) {
        bottomPanel.style.display = '';
        bottomPanel.classList.add('panel-visible');
      }
    });
  });

  // 底部面板操作按钮
  document.querySelectorAll('.panel-action').forEach(action => {
    action.addEventListener('click', (e) => {
      const title = action.getAttribute('title') || '';
      const bottomPanel = document.querySelector('.bottom-panel');
      if (!bottomPanel) return;
      if (title.includes('关闭') || title.includes('收起')) {
        bottomPanel.style.display = bottomPanel.style.display === 'none' ? '' : 'none';
      }
    });
  });

  // 命令面板
  const commandPalette = document.getElementById('commandPalette');
  const commandInput = document.getElementById('commandInput');

  if (commandPalette) {
    // 键盘快捷键：Cmd+Shift+P / Ctrl+Shift+P 打开命令面板
    document.addEventListener('keydown', (e) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        commandPalette.classList.toggle('show');
        if (commandPalette.classList.contains('show') && commandInput) {
          setTimeout(() => commandInput.focus(), 10);
        }
      }
      // Esc 关闭命令面板
      if (e.key === 'Escape') {
        commandPalette.classList.remove('show');
      }
      // Cmd+B / Ctrl+B 切换侧边栏
      if (isMeta && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          sidebar.style.display = sidebar.style.display === 'none' ? '' : 'none';
        }
      }
      // Cmd+J / Ctrl+J 切换底部面板
      if (isMeta && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        const bottomPanel = document.querySelector('.bottom-panel');
        if (bottomPanel) {
          bottomPanel.style.display = bottomPanel.style.display === 'none' ? '' : 'none';
        }
      }
    });

    // 点击命令面板外部区域关闭
    document.addEventListener('click', (e) => {
      if (!commandPalette.contains(e.target) && !e.target.closest('.activitybar__item')) {
        // 只有当命令面板已经显示且不是初始加载时才关闭
        if (!e.target.closest('input') && !e.target.closest('[data-view]')) {
          // 这里不做强制关闭，仅通过 Esc 或按钮控制，避免干扰
        }
      }
    });

    // 命令面板项点击
    document.querySelectorAll('.command-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.command-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const text = item.textContent.trim();
        // 处理快捷命令
        if (text.includes('Toggle Terminal') || text.includes('终端')) {
          const terminalTab = document.querySelector('.panel-tab[data-panel="terminal"]');
          if (terminalTab) terminalTab.click();
        } else if (text.includes('Color Theme') || text.includes('主题')) {
          alert('🎨 Trae IDE 当前仅支持深色主题');
        } else if (text.includes('Settings') || text.includes('设置')) {
          alert('⚙️ 设置面板即将打开');
        } else if (text.includes('Open File') || text.includes('文件')) {
          alert('📂 请从侧边栏选择文件');
        }
        commandPalette.classList.remove('show');
      });
    });

    // 命令面板输入筛选
    if (commandInput) {
      commandInput.addEventListener('input', () => {
        const query = commandInput.value.toLowerCase();
        document.querySelectorAll('.command-item').forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(query) ? '' : 'none';
        });
      });
    }
  }

  // 终端闪烁光标模拟 - 已由 CSS 动画处理
  // 终端输入模拟
  const terminalEl = document.querySelector('.terminal');
  if (terminalEl) {
    const textToType = 'npm run build';
    let currentIndex = 0;
    let typingInterval = null;

    // 点击终端时开始打字效果
    terminalEl.addEventListener('click', () => {
      const typedEl = document.querySelector('.term-typed');
      if (!typedEl) return;
      if (typingInterval) {
        clearInterval(typingInterval);
        currentIndex = 0;
        typedEl.textContent = '';
      }
      typingInterval = setInterval(() => {
        if (currentIndex < textToType.length) {
          typedEl.textContent += textToType[currentIndex];
          currentIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, 120);
    });
  }

  // 默认打开 main.ts
  openFile('main');
});

// Tab 设置函数
function setupTabEvents(tab) {
  tab.addEventListener('click', (e) => {
    // 点击关闭按钮时不触发切换
    if (e.target.classList.contains('tab__close')) return;
    const key = tab.dataset.file;
    openFile(key);
  });

  const closeBtn = tab.querySelector('.tab__close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasActive = tab.classList.contains('active');
      const prevSibling = tab.previousElementSibling;
      const nextSibling = tab.nextElementSibling;
      tab.remove();

      // 如果关闭的是激活 Tab，切换到相邻 Tab
      if (wasActive) {
        const targetTab = nextSibling && nextSibling.classList.contains('tab')
          ? nextSibling
          : (prevSibling && prevSibling.classList.contains('tab') ? prevSibling : null);
        if (targetTab) {
          const key = targetTab.dataset.file;
          openFile(key);
        }
      }
    });
  }
}

// ============================================================
// CANN 智能助手 - 环境检测与安装推荐
// ============================================================

const CANN_ASSISTANT = {
  versions: [
    {
      version: '8.0.RC1',
      release: '2024-12',
      python: ['3.8', '3.9', '3.10', '3.11', '3.12'],
      os: ['ubuntu', 'centos', 'openeuler', 'debian'],
      arch: ['aarch64', 'x86_64'],
      notes: '最新稳定版，推荐使用'
    },
    {
      version: '7.0.RC1',
      release: '2024-06',
      python: ['3.7', '3.8', '3.9', '3.10', '3.11'],
      os: ['ubuntu', 'centos', 'openeuler'],
      arch: ['aarch64', 'x86_64'],
      notes: '主流版本，兼容性好'
    },
    {
      version: '6.3.RC1',
      release: '2023-12',
      python: ['3.7', '3.8', '3.9', '3.10'],
      os: ['ubuntu', 'centos'],
      arch: ['aarch64', 'x86_64'],
      notes: '长期支持版本'
    }
  ],

  detectEnvironment() {
    const ua = navigator.userAgent;
    const platform = navigator.platform || 'Unknown';

    let osName = 'Unknown', osVersion = '';
    if (/Windows/i.test(ua)) {
      osName = 'Windows';
      const wm = ua.match(/Windows NT (\d+\.\d+)/);
      if (wm) osVersion = wm[1] === '10.0' ? '10/11' : wm[1];
    } else if (/Mac OS X/i.test(ua)) {
      osName = 'macOS';
      const mm = ua.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
      if (mm) osVersion = mm[1].replace(/_/g, '.');
    } else if (/Linux/i.test(ua)) {
      osName = 'Linux';
    } else if (/Android/i.test(ua)) {
      osName = 'Android';
    } else if (/iPhone|iPad|iOS/i.test(ua)) {
      osName = 'iOS';
    }

    let arch = platform.toLowerCase();
    if (/win|linux/i.test(arch)) arch = 'x86_64';
    if (/mac|iphone|darwin/i.test(arch)) arch = /aarch64|arm64|Apple/i.test(ua) ? 'aarch64' : 'x86_64';

    let browser = 'Unknown';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';

    return {
      os: osName,
      osVersion: osVersion,
      arch: arch,
      platform: platform,
      browser: browser,
      language: navigator.language || 'zh-CN',
      cores: navigator.hardwareConcurrency || '未知',
      memory: navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'N/A',
      screen: screen.width + 'x' + screen.height + 'px',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userAgent: ua
    };
  },

  matchVersions(env) {
    const results = [];
    const isLinux = env.os === 'Linux';

    for (const ver of this.versions) {
      let score = 0;
      const issues = [];
      const compat = {};

      const pyOk = ver.python.includes('3.11') || ver.python.includes('3.12');
      compat.python = pyOk;
      if (pyOk) score += 30;
      else issues.push('建议使用 Python 3.8-3.10 以获得最佳兼容性');

      compat.arch = ver.arch.includes(env.arch);
      if (compat.arch) score += 20;
      else issues.push(env.arch + ' 架构可能不在官方支持列表');

      compat.os = isLinux;
      if (isLinux) {
        score += 30;
      } else {
        if (env.os === 'macOS') issues.push('macOS 需通过 Docker 或远程 Linux 服务器使用 CANN');
        if (env.os === 'Windows') issues.push('Windows 需通过 WSL2 或 Docker 使用 CANN');
      }

      compat.npu = false;
      issues.push('浏览器无法直接检测昇腾 NPU，请在 Linux 终端执行 npu-smi info');

      score += 5;
      if (ver.version === '8.0.RC1') score += 5;

      results.push({
        version: ver.version,
        release: ver.release,
        score: score,
        compatibility: compat,
        issues: issues,
        notes: ver.notes,
        pythonSupported: ver.python,
        osSupported: ver.os
      });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  },

  generateCommands(env, matchedVersions) {
    const best = matchedVersions[0];
    const ver = best.version;
    const os = env.os;
    const cmds = [];

    if (os !== 'Linux') {
      const isMac = os === 'macOS';
      const title = isMac ? 'macOS 环境说明' : os + ' 环境说明';
      const desc = 'CANN 不原生支持 ' + os + '，请使用以下方案之一';
      const dockerLines = isMac
        ? '# 方案一：Docker 容器（推荐开发）\n' +
          'docker pull ascendai/cann:' + ver + '-ubuntu20.04\n' +
          'docker run -it --rm \\\\\n' +
          '  --device=/dev/davinci0 \\\\\n' +
          '  -v $HOME:/workspace \\\\\n' +
          '  ascendai/cann:' + ver + '-ubuntu20.04\n\n' +
          '# 方案二：远程 Linux 开发服务器\n' +
          '# 使用 VS Code Remote-SSH 连接 Linux 主机\n\n' +
          '# 方案三：MindSpore Cloud\n' +
          '# 无需本地安装，直接使用云端昇腾资源'
        : '# 方案一：WSL2 + Ubuntu（推荐）\n' +
          'wsl --install -d Ubuntu-20.04\n\n' +
          '# 方案二：Docker Desktop\n' +
          'docker pull ascendai/cann:' + ver + '-ubuntu20.04\n\n' +
          '# 方案三：MindSpore Cloud\n' +
          '# 无需本地安装，直接使用云端昇腾资源';
      cmds.push({ step: 0, title: title, desc: desc, code: dockerLines });
    }

    cmds.push({
      step: 1,
      title: '安装系统依赖',
      desc: '安装 CANN 运行所需的基础依赖包',
      code: '# Ubuntu / Debian 系\nsudo apt-get update\nsudo apt-get install -y \\\\\n' +
        '  gcc g++ make cmake \\\\\n' +
        '  zlib1g-dev libsqlite3-dev \\\\\n' +
        '  python3 python3-pip python3-dev \\\\\n' +
        '  libopenblas-dev liblapack-dev \\\\\n' +
        '  pciutils usbutils\n\n' +
        '# CentOS / RHEL / openEuler 系\n' +
        '# sudo yum install -y gcc gcc-c++ make cmake \\\\\n' +
        '#   zlib-devel sqlite-devel python3 python3-pip python3-devel'
    });

    cmds.push({
      step: 2,
      title: '创建 Python 虚拟环境（推荐）',
      desc: '使用 conda 或 venv 创建隔离的 Python 环境',
      code: '# 方案 A：使用 conda\nconda create -n cann python=3.10 -y\nconda activate cann\n\n' +
        '# 方案 B：使用 venv\npython3 -m venv ~/cann-env\nsource ~/cann-env/bin/activate\n\n' +
        '# 验证\npython3 --version\npip3 --version'
    });

    cmds.push({
      step: 3,
      title: '安装 Python 依赖',
      desc: '升级 pip 并安装常用数据科学包',
      code: 'python3 -m pip install --upgrade pip setuptools wheel\npython3 -m pip install numpy pyyaml scipy\n\n' +
        '# 可选：深度学习框架\n# pip3 install torch torchvision\n# pip3 install tensorflow-cpu\n# pip3 install mindspore'
    });

    cmds.push({
      step: 4,
      title: '安装昇腾 NPU 驱动和固件',
      desc: '如有昇腾硬件 (310P/910B/910C)，需先安装驱动',
      code: '# 1. 从昇腾官网下载对应驱动包\n#    https://www.hiascend.com/software/cann\n\n' +
        '# 2. 安装驱动（以 910B 为例）\nchmod +x Ascend-hdk-910b-npu-driver_*.run\nsudo ./Ascend-hdk-910b-npu-driver_*.run --full\n\n' +
        '# 3. 安装固件\nchmod +x Ascend-hdk-910b-npu-firmware_*.run\nsudo ./Ascend-hdk-910b-npu-firmware_*.run --full\n\n' +
        '# 4. 验证\nnpu-smi info'
    });

    cmds.push({
      step: 5,
      title: '安装 CANN Toolkit ' + ver,
      desc: 'CANN 核心组件 - 编译器、运行时、算子库',
      code: '# 从官网下载 CANN Toolkit 安装包\nchmod +x Ascend-cann-toolkit_' + ver + '-linux.x86_64.run\n' +
        './Ascend-cann-toolkit_' + ver + '-linux.x86_64.run --install\n\n' +
        '# 或通过 pip 安装 Python 接口\n# pip3 install te topi hccl'
    });

    cmds.push({
      step: 6,
      title: '配置环境变量',
      desc: '将 CANN 相关路径添加到 shell 配置',
      code: '# 临时生效（当前会话）\nexport ASCEND_HOME=/usr/local/Ascend\n' +
        'export ASCEND_TOOLKIT_HOME=$ASCEND_HOME/ascend-toolkit/latest\n' +
        'export PATH=$ASCEND_TOOLKIT_HOME/bin:$PATH\n' +
        'export LD_LIBRARY_PATH=$ASCEND_TOOLKIT_HOME/lib64:$LD_LIBRARY_PATH\n' +
        'export PYTHONPATH=$ASCEND_TOOLKIT_HOME/python/site-packages:$PYTHONPATH\n\n' +
        '# 永久生效\necho \'# CANN 环境变量\' >> ~/.bashrc\n' +
        'echo \'export ASCEND_TOOLKIT_HOME=/usr/local/Ascend/ascend-toolkit/latest\' >> ~/.bashrc\n' +
        'echo \'source $ASCEND_TOOLKIT_HOME/bin/setenv.sh\' >> ~/.bashrc\n' +
        'source ~/.bashrc'
    });

    cmds.push({
      step: 7,
      title: '验证 CANN 安装',
      desc: '确认 CANN Python 包可正常导入',
      code: `# 验证 CANN Python 包
python3 << 'EOF'
try:
    import te
    import topi
    print("✓ CANN TE/Topi: OK")
except ImportError as e:
    print("✗ CANN Python 包未找到:", e)

import os
print("ASCEND_TOOLKIT_HOME:", os.environ.get("ASCEND_TOOLKIT_HOME", "未设置"))
EOF

# 检查 NPU 状态（如有硬件）
npu-smi info 2>/dev/null || echo "ℹ 无 NPU 硬件或未安装驱动"`
    });

    cmds.push({
      step: 8,
      title: '编译并运行示例（可选）',
      desc: '使用 CANN 示例代码验证完整功能',
      code: `# 克隆官方示例
git clone https://gitee.com/ascend/samples.git
cd samples

# Python 基础运算测试
python3 << 'EOF'
import numpy as np
print("Numpy 基础运算测试:")
a = np.array([1, 2, 3], dtype=np.float32)
b = np.array([4, 5, 6], dtype=np.float32)
print(" a + b =", a + b)
print(" a * b =", a * b)
print()
print("✓ Python 环境准备就绪")
print("ℹ 有昇腾 NPU 时可执行 TBE 算子编译和硬件加速")
EOF`
    });

    return cmds;
  }
};

function renderEnvDetection(aiBody) {
  const env = CANN_ASSISTANT.detectEnvironment();

  const compatOs = env.os === 'Linux' ? 'ai-env-item__value--ok' : 'ai-env-item__value--warn';

  aiBody.insertAdjacentHTML('beforeend', `
    <div class="ai-msg ai-msg--user">
      <div class="ai-msg-icon">👤</div>
      <div class="ai-msg-content">
        <div class="ai-msg-title">🔍 检测当前环境</div>
        <div class="ai-msg-body"><p>请帮我分析当前系统环境是否适合安装 CANN。</p></div>
      </div>
    </div>

    <div class="ai-msg ai-msg--assistant">
      <div class="ai-msg-icon">🤖</div>
      <div class="ai-msg-content">
        <div class="ai-msg-title">✓ 环境检测完成</div>
        <div class="ai-msg-body">
          <p>以下是从浏览器端检测到的系统环境信息：</p>

          <div class="ai-env-card">
            <div class="ai-env-card__title">🖥 系统信息</div>
            <div class="ai-env-card__grid">
              <div class="ai-env-item"><span class="ai-env-item__label">操作系统</span><span class="ai-env-item__value ${compatOs}">${env.os} ${env.osVersion}</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">平台架构</span><span class="ai-env-item__value ai-env-item__value--ok">${env.arch}</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">CPU 核心</span><span class="ai-env-item__value">${env.cores} 核</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">内存</span><span class="ai-env-item__value ${env.memory !== 'N/A' ? 'ai-env-item__value--ok' : 'ai-env-item__value--warn'}">${env.memory}</span></div>
            </div>
          </div>

          <div class="ai-env-card">
            <div class="ai-env-card__title">🌐 浏览器与本地化</div>
            <div class="ai-env-card__grid">
              <div class="ai-env-item"><span class="ai-env-item__label">浏览器</span><span class="ai-env-item__value">${env.browser}</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">语言</span><span class="ai-env-item__value">${env.language}</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">时区</span><span class="ai-env-item__value">${env.timeZone}</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">屏幕</span><span class="ai-env-item__value">${env.screen}</span></div>
            </div>
          </div>

          <div class="ai-env-card">
            <div class="ai-env-card__title">📋 兼容性快速评估</div>
            <div class="ai-env-card__grid">
              <div class="ai-env-item"><span class="ai-env-item__label">CANN 原生支持</span><span class="ai-env-item__value ${env.os === 'Linux' ? 'ai-env-item__value--ok' : 'ai-env-item__value--err'}">${env.os === 'Linux' ? '✓ 支持' : '✗ 需 Docker/WSL'}</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">昇腾 NPU 检测</span><span class="ai-env-item__value ai-env-item__value--warn">⚠ 浏览器无法检测</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">推荐 Python</span><span class="ai-env-item__value ai-env-item__value--ok">3.8 - 3.12</span></div>
            </div>
          </div>

          <p class="ai-tip">💡 <strong>建议：</strong> 浏览器端检测信息有限。为获得完整准确的环境检测，请在终端中执行：<code style="background:#252526; padding:2px 6px; border-radius:3px; margin-left:4px;">python3 cann_install.py</code></p>
        </div>
      </div>
    </div>
  `);
  return env;
}

function renderVersionMatch(aiBody, env) {
  const matched = CANN_ASSISTANT.matchVersions(env);
  const medals = ['🥇', '🥈', '🥉'];

  let versionsHtml = '';
  matched.forEach((m, idx) => {
    const compatItems = [
      { label: 'Python', ok: m.compatibility.python },
      { label: '架构', ok: m.compatibility.arch },
      { label: '系统', ok: m.compatibility.os },
      { label: 'NPU', ok: m.compatibility.npu }
    ].map(c => `<span class="ai-version-compat__item"><span class="${c.ok ? 'ai-version-compat__ok' : 'ai-version-compat__no'}">${c.ok ? '✓' : '✗'}</span> ${c.label}</span>`).join('');

    const issuesHtml = m.issues.length ? `
      <div class="ai-version-issues">
        <div style="font-weight:600; margin-bottom:4px;">⚠ 注意事项</div>
        <ul style="padding-left:18px; margin:0;">${m.issues.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>` : '';

    versionsHtml += `
      <div class="ai-version-card">
        <div class="ai-version-card__header">
          <span class="ai-version-badge">${medals[idx] || '  '}</span>
          <span class="ai-version-name">CANN ${m.version}</span>
          <span style="color:#858585; font-size:11px;">(${m.release})</span>
          <span class="ai-version-score">${m.score}/100</span>
        </div>
        <div style="color:#cccccc; font-size:12px; margin:4px 0;">${m.notes}</div>
        <div class="ai-version-compat">${compatItems}</div>
        ${issuesHtml}
      </div>`;
  });

  aiBody.insertAdjacentHTML('beforeend', `
    <div class="ai-msg ai-msg--assistant">
      <div class="ai-msg-icon">🤖</div>
      <div class="ai-msg-content">
        <div class="ai-msg-title">📊 CANN 版本匹配分析</div>
        <div class="ai-msg-body">
          <p>基于你的环境检测结果，以下是推荐的 CANN 版本：</p>
          ${versionsHtml}
          <p style="margin-top:10px;"><strong>💡 结论：</strong> 推荐安装
            <span style="color:#4ec9b0; font-weight:600;">CANN ${matched[0].version}</span>。
            ${matched[0].compatibility.os ? '' : '由于当前系统非 Linux，需通过容器或远程服务器使用。'}
          </p>
        </div>
      </div>
    </div>
  `);
  return matched;
}

function renderCommands(aiBody, env, matched) {
  const commands = CANN_ASSISTANT.generateCommands(env, matched);
  const best = matched[0];

  let cmdHtml = '';
  commands.forEach((cmd, idx) => {
    const stepLabel = cmd.step === 0 ? '⚠' : `${cmd.step}`;
    cmdHtml += `
      <div class="ai-command-card">
        <div class="ai-command-card__header">
          <span class="ai-command-step">${stepLabel}</span>
          <div style="flex:1; min-width:0;">
            <div class="ai-command-card__title">${cmd.title}</div>
            <div class="ai-command-card__desc">${cmd.desc}</div>
          </div>
          <div class="ai-command-card__actions">
            <button class="ai-command-card__replace" data-cmd-index="${idx}">🔄 替换到 main.ts</button>
            <button class="ai-command-card__copy" data-cmd-index="${idx}">📋 复制</button>
          </div>
        </div>
        <div class="ai-command-card__body">
          <pre class="ai-command-code" data-code-index="${idx}">${escapeHtml(cmd.code)}</pre>
        </div>
      </div>`;
  });

  aiBody.insertAdjacentHTML('beforeend', `
    <div class="ai-msg ai-msg--assistant">
      <div class="ai-msg-icon">🤖</div>
      <div class="ai-msg-content">
        <div class="ai-msg-title">📦 推荐安装步骤 (CANN ${best.version})</div>
        <div class="ai-msg-body">
          <p>按照以下步骤完成 CANN 的完整安装和配置。点击「🔄 替换到 main.ts」可将对应步骤的命令直接注入到代码区：</p>
          ${cmdHtml}

          <div class="ai-command-card ai-command-card--full">
            <div class="ai-command-card__header">
              <span class="ai-command-step">📝</span>
              <div style="flex:1; min-width:0;">
                <div class="ai-command-card__title">生成完整安装脚本</div>
                <div class="ai-command-card__desc">将所有步骤命令整合为一个完整的 shell 脚本，替换到代码区 main.ts</div>
              </div>
              <div class="ai-command-card__actions">
                <button class="ai-command-card__replace-all" id="replaceAllBtn">🎯 一键替换到 main.ts</button>
              </div>
            </div>
            <div class="ai-command-card__body">
              <div style="font-size: 12px; color: #858585; padding: 8px 0;">
                <div>✅ 已为你的环境生成完整安装脚本：</div>
                <div style="margin-top: 6px;">
                  <code style="background:#1e1e1e; padding:2px 6px; border-radius:3px;">系统: ${env.os} ${env.osVersion}</code>
                  <code style="background:#1e1e1e; padding:2px 6px; border-radius:3px; margin-left:6px;">架构: ${env.arch}</code>
                  <code style="background:#1e1e1e; padding:2px 6px; border-radius:3px; margin-left:6px;">版本: CANN ${best.version}</code>
                </div>
              </div>
            </div>
          </div>

          <div class="ai-summary">
            <div class="ai-summary__title">📝 安装总览</div>
            <div class="ai-summary__items">
              <div class="ai-summary__item"><span class="ai-summary__label">推荐版本</span><span class="ai-summary__value">CANN ${best.version}</span></div>
              <div class="ai-summary__item"><span class="ai-summary__label">系统</span><span class="ai-summary__value">${env.os}</span></div>
              <div class="ai-summary__item"><span class="ai-summary__label">架构</span><span class="ai-summary__value">${env.arch}</span></div>
              <div class="ai-summary__item"><span class="ai-summary__label">Python</span><span class="ai-summary__value">3.8 - 3.12</span></div>
            </div>
          </div>

          <div class="ai-links">
            <div class="ai-links__title">📚 参考文档</div>
            <a href="https://www.hiascend.com/software/cann" target="_blank">昇腾 CANN 官网</a>
            <a href="https://www.mindspore.cn/" target="_blank">MindSpore 深度学习框架</a>
            <a href="https://gitee.com/ascend/samples" target="_blank">CANN 示例代码 (Gitee)</a>
          </div>

          <p class="ai-tip">💡 <strong>快捷操作：</strong>
            <span style="color:#4ec9b0;">🔄 替换到 main.ts</span> — 将当前步骤命令替换到代码区；
            <span style="color:#4ec9b0;">🎯 一键替换</span> — 将所有步骤整合为完整脚本写入 main.ts；
            <span style="color:#4ec9b0;">📋 复制</span> — 复制单条命令到剪贴板。</p>
        </div>
      </div>
    </div>
  `);

  window.__cannCommands = commands.map(c => c.code);
  window.__cannAllCommands = commands;
  window.__cannVersion = best.version;
  setupCopyButtons();
  setupReplaceButtons();
}

function setupCopyButtons() {
  document.querySelectorAll('.ai-command-card__copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.cmdIndex);
      const code = window.__cannCommands[idx];
      if (!code) return;
      const done = () => {
        const original = btn.textContent;
        btn.textContent = '✓ 已复制';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove('copied');
        }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done).catch(() => fallbackCopy(code, done));
      } else {
        fallbackCopy(code, done);
      }
    });
  });
}

function fallbackCopy(code, done) {
  const ta = document.createElement('textarea');
  ta.value = code;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { console.warn('复制失败', e); }
  document.body.removeChild(ta);
}

// 生成完整的 CANN 安装脚本（带语法高亮）
function generateFullScript(commands, version) {
  const ver = version || window.__cannVersion || '8.0.RC1';
  let script = '#!/usr/bin/env bash\n';
  script += '# ============================================================\n';
  script += '# CANN 智能安装脚本 (由 AI 助手生成)\n';
  script += '# ============================================================\n';
  script += `# 版本: CANN ${ver}\n`;
  script += `# 生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
  script += '# 依赖: 请先确保已安装昇腾 NPU 驱动\n';
  script += '\n';
  script += 'set -e  # 遇到错误立即退出\n';
  script += '\n';

  commands.forEach((cmd, idx) => {
    if (cmd.step !== 0) {
      script += `# ============================================================\n`;
      script += `# 步骤 ${cmd.step}/${commands.length}: ${cmd.title}\n`;
      script += `# ${cmd.desc}\n`;
      script += `# ============================================================\n`;
    }
    script += cmd.code;
    script += '\n\n';
  });

  script += '# ============================================================\n';
  script += '# 安装完成！\n';
  script += '# ============================================================\n';
  script += 'echo "=== 🎉 CANN 安装流程已生成 ==="\n';
  script += 'echo "提示: 请在 Ubuntu 22.04 或 openEuler 系统上执行"\n';
  script += 'echo "并确保已连接昇腾 NPU 硬件。"\n';

  return highlightBash(script);
}

// 重新渲染 main.ts 内容并更新编辑器
function refreshMainTsEditor() {
  openFile('main');
  const newContent = generateMainTsContent();
  if (files.main) {
    files.main.content = newContent;
    const lineCount = newContent.split('\n').length;
    files.main.lines = lineCount;
  }
  const codeEl = document.getElementById('code');
  if (codeEl) {
    codeEl.innerHTML = newContent;
    codeEl.scrollTop = 0;
  }
  renderLineNumbers(files.main.lines);
}

// 显示替换成功的反馈提示
function showReplaceFeedback(title) {
  const feedback = document.createElement('div');
  feedback.textContent = `✓ ${title || '已替换到 main.ts'}`;
  feedback.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #0a8043;
    color: #ffffff;
    padding: 10px 24px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 99999;
    animation: slideDown 0.3s ease-out;
  `;
  document.body.appendChild(feedback);
  setTimeout(() => {
    feedback.style.transition = 'opacity 0.3s, transform 0.3s';
    feedback.style.opacity = '0';
    feedback.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => feedback.remove(), 300);
  }, 2000);
}

// 单步骤替换到 main.ts
function replaceStepToEditor(stepIdx, newCode, stepTitle) {
  if (stepIdx < 0 || stepIdx >= mainTsSteps.length) return;

  mainTsSteps[stepIdx].code = newCode;
  if (stepTitle) {
    mainTsSteps[stepIdx].title = stepTitle;
  }

  refreshMainTsEditor();
  showReplaceFeedback(`步骤 ${stepIdx + 1} 已替换到 main.ts`);
}

// 一键替换所有步骤到 main.ts
function replaceAllStepsToEditor(commands, version) {
  // 用 AI 生成的命令替换所有步骤
  commands.forEach((cmd, idx) => {
    if (cmd.step !== 0 && idx < mainTsSteps.length) {
      mainTsSteps[idx].code = cmd.code;
      mainTsSteps[idx].title = cmd.title;
    }
  });

  // 如果命令数超过默认步骤，添加新步骤
  if (commands.length > mainTsSteps.length) {
    for (let i = mainTsSteps.length; i < commands.length; i++) {
      if (commands[i].step !== 0) {
        mainTsSteps.push({ title: commands[i].title, code: commands[i].code });
      }
    }
  }

  refreshMainTsEditor();
  showReplaceFeedback('完整安装脚本已写入 main.ts');
}

// 设置替换按钮的事件处理
function setupReplaceButtons() {
  // 单步骤替换
  document.querySelectorAll('.ai-command-card__replace').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.cmdIndex);
      const commands = window.__cannAllCommands;
      if (!commands || !commands[idx]) return;

      const cmd = commands[idx];
      const original = btn.textContent;
      btn.textContent = '✓ 已替换';
      btn.classList.add('replaced');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('replaced');
      }, 2000);

      replaceStepToEditor(idx, cmd.code, cmd.title);
    });
  });

  // 一键替换所有
  const replaceAllBtn = document.getElementById('replaceAllBtn');
  if (replaceAllBtn) {
    replaceAllBtn.addEventListener('click', () => {
      const commands = window.__cannAllCommands;
      const version = window.__cannVersion;
      if (!commands) return;

      const original = replaceAllBtn.textContent;
      replaceAllBtn.textContent = '✓ 已生成完整脚本';
      replaceAllBtn.classList.add('replaced');
      setTimeout(() => {
        replaceAllBtn.textContent = original;
        replaceAllBtn.classList.remove('replaced');
      }, 2500);

      replaceAllStepsToEditor(commands, version);
    });
  }
}

// ============ 终端输出模拟 ============
const TerminalSim = {
  getTerminal() {
    return document.getElementById('terminal');
  },

  appendLine(html) {
    const t = this.getTerminal();
    if (!t) return;
    const line = document.createElement('div');
    line.className = 'terminal__line';
    line.innerHTML = html;
    t.insertBefore(line, t.lastElementChild);
    t.scrollTop = t.scrollHeight;
  },

  writeCommand(cmd) {
    this.appendLine(`<span class="term-prompt">trae@ascend</span>:<span class="term-path">~/cann-install</span>$ ${escapeHtml(cmd)}`);
  },

  writeInfo(text) {
    this.appendLine(`<span class="term-info">➜</span> ${text}`);
  },

  writeSuccess(text) {
    this.appendLine(`<span class="term-success-label">✓</span> ${text}`);
  },

  writeWarn(text) {
    this.appendLine(`<span class="term-warn-label">⚠</span> ${text}`);
  },

  writeBlank() {
    this.appendLine('&nbsp;');
  },

  reset() {
    const t = this.getTerminal();
    if (!t) return;
    t.innerHTML = `
      <div class="terminal__line"><span class="term-info">➜</span> <span class="term-muted">CANN Install Assistant</span> — 等待用户操作...</div>
      <div class="terminal__line"><span class="term-muted">  提示: 点击右侧 AI 面板的「🔍 检测环境」或「📦 推荐安装」按钮开始</span></div>
      <div class="terminal__line">&nbsp;</div>
      <div class="terminal__line"><span class="term-prompt">trae@ascend</span>:<span class="term-path">~/cann-install</span>$ <span class="term-cursor" id="termCursor"></span><span class="term-typed" id="termTyped"></span></div>
    `;
  },

  runDetectEnv(env) {
    this.writeCommand('node utils.ts --check-env');
    setTimeout(() => {
      this.writeSuccess('步骤 1/5: 系统环境检测完成');
      this.writeInfo(`<span class="term-muted">OS:</span>     ${env.os} ${env.osVersion}`);
      this.writeInfo(`<span class="term-muted">Arch:</span>   ${env.arch}`);
      this.writeInfo(`<span class="term-muted">CPU:</span>    ${env.cores} 核`);
      this.writeInfo(`<span class="term-muted">Memory:</span> ${env.memory}`);
      this.writeInfo(`<span class="term-muted">Python:</span> 建议 3.8 - 3.12`);
      this.writeWarn(`<span class="term-muted">NPU:</span>    请在 Linux 服务器上通过 \`npu-smi info\` 检测`);
      this.writeBlank();
    }, 500);
  },

  runCannInstall(version, env) {
    this.writeCommand(`bash main.ts  # CANN ${version}`);
    setTimeout(() => this.writeSuccess('步骤 1/5: 系统环境检测完成'), 300);
    setTimeout(() => this.writeSuccess('步骤 2/5: 系统依赖安装完成 (apt-get)'), 800);
    setTimeout(() => this.writeSuccess(`步骤 3/5: CANN ${version} Toolkit 下载完成`), 1300);
    setTimeout(() => this.writeSuccess('步骤 4/5: Python 环境配置完成 (pip install)'), 1800);
    setTimeout(() => this.writeSuccess('步骤 5/5: 环境变量配置完成'), 2300);
    setTimeout(() => {
      this.writeInfo(`<span class="term-muted">状态:</span> CANN ${version} 安装建议已生成`);
      this.writeInfo(`<span class="term-muted">提示:</span> 请在真实的 Linux 服务器上执行生成的安装命令`);
      this.writeBlank();
    }, 2600);
  },

  // 从代码区提取纯文本命令（剥离 HTML 标签和注释）
  parseCommandsFromEditor(fileKey) {
    const file = files[fileKey] || files.main;
    if (!file || !file.content) return [];
    // 剥离所有 HTML 标签
    let text = file.content.replace(/<[^>]+>/g, '').trim();
    // 按行分割
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // 过滤掉注释（# 开头的行）和空行
    const commands = [];
    let currentCmd = '';
    for (const line of lines) {
      // 跳过注释行
      if (line.startsWith('#')) continue;
      // 处理续行符：如果以 \ 结尾，累积到下一行
      if (line.endsWith('\\')) {
        currentCmd += line.slice(0, -1).trim() + ' ';
      } else {
        currentCmd += line;
        if (currentCmd.trim().length > 0) {
          commands.push(currentCmd.trim());
        }
        currentCmd = '';
      }
    }
    return commands;
  },

  // 模拟命令输出
  simulateCommandOutput(cmd) {
    // 检测操作系统信息
    if (cmd.startsWith('uname')) {
      return 'Linux ascend-server 5.15.0-generic #1 SMP aarch64 GNU/Linux';
    }
    if (cmd.startsWith('cat /etc/os-release')) {
      return 'VERSION="22.04.3 LTS (Jammy Jellyfish)"';
    }
    if (cmd.startsWith('python3 --version')) {
      return 'Python 3.10.12';
    }
    if (cmd.startsWith('python3 -V')) {
      return 'Python 3.10.12';
    }
    if (cmd.startsWith('npu-smi')) {
      return [
        '+------------------------------------------------------------------------------------------+',
        '| npu-smi 23.0.rc1              Version: 23.0.rc1                        |',
        '+-------------------+-----------------+---------------------------------------------------+',
        '| NPU     Name      | Health          | Power(W)     Temp(C)           Hugepages-Usage(page)|',
        '| Chip              | Bus-Id          | AICore(%)    Memory-Usage(MB)  HBM-Usage(MB)        |',
        '+===================+=================+===================================================+',
        '| 0     910B3       | OK              | NA           42                0 / 0              |',
        '| 0                 | 0000:01:00.0    | 0            0   / 21534       0  / 65536          |',
        '+===================+=================+===================================================+'
      ].join('\n');
    }
    if (cmd.startsWith('sudo apt update')) {
      return [
        'Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease',
        'Hit:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease',
        'Hit:3 http://archive.ubuntu.com/ubuntu jammy-backports InRelease',
        'Reading package lists... Done',
        'Building dependency tree... Done',
        'Reading state information... Done',
        'All packages are up to date.'
      ].join('\n');
    }
    if (cmd.startsWith('sudo apt install')) {
      return [
        'Reading package lists... Done',
        'Building dependency tree... Done',
        'Reading state information... Done',
        'The following additional packages will be installed:',
        '  build-essential cmake python3-pip libgl1-mesa-glx libglib2.0-0',
        '0 upgraded, 5 newly installed, 0 to remove and 0 not upgraded.',
        'Need to get 15.4 MB of archives.',
        'After this operation, 70.2 MB of additional disk space will be used.',
        'Unpacking build-essential (12.9ubuntu3) ...',
        'Setting up cmake (3.22.1-1ubuntu1.22.04.1) ...',
        'Setting up python3-pip (22.0.2+dfsg-1ubuntu0.4) ...',
        '✓ System dependencies installed successfully.'
      ].join('\n');
    }
    if (cmd.startsWith('export ')) {
      return `[env] ${cmd.replace('export ', '')}`;
    }
    if (cmd.startsWith('echo ')) {
      const match = cmd.match(/echo\s+"?(.+?)"?$/);
      return match ? match[1] : '';
    }
    if (cmd.startsWith('wget ')) {
      return [
        '--2025-06-10 10:00:00--  https://repo.huaweicloud.com/ascend/cann/8.0.RC1/CANN-Toolkit_aarch64.run',
        'Resolving repo.huaweicloud.com... 100.100.100.100',
        'Connecting to repo.huaweicloud.com... connected.',
        'HTTP request sent, awaiting response... 200 OK',
        'Length: 1524382711 (1.4G) [application/octet-stream]',
        'Saving to: ‘CANN-Toolkit_aarch64.run’',
        '',
        'CANN-Toolkit_aarch64.run      100%[===========================================>]   1.42G  25.4MB/s    in 58s',
        '',
        '2025-06-10 10:00:58 (25.0 MB/s) - ‘CANN-Toolkit_aarch64.run’ saved [1524382711/1524382711]'
      ].join('\n');
    }
    if (cmd.startsWith('chmod')) {
      return '[ok] File permissions updated.';
    }
    if (cmd.includes('.run') && cmd.includes('--install')) {
      return [
        '[INFO] Installing CANN Toolkit 8.0.RC1 to /usr/local/Ascend',
        '[INFO] Checking system compatibility... OK',
        '[INFO] Extracting packages... [██████████] 100%',
        '[INFO] Installing nnae component... OK',
        '[INFO] Installing toolbox component... OK',
        '[INFO] Installing pyACL component... OK',
        '[INFO] Configuring environment... OK',
        '✓ CANN Toolkit 8.0.RC1 installation completed successfully.'
      ].join('\n');
    }
    if (cmd.startsWith('pip3 install')) {
      if (cmd.includes('torch-npu')) {
        return [
          'Looking in indexes: https://pypi.org/simple',
          'Collecting torch-npu',
          '  Downloading torch_npu-2.1.0-cp310-cp310-manylinux2014_aarch64.whl (28.4 MB)',
          'Installing collected packages: torch-npu',
          'Successfully installed torch-npu-2.1.0'
        ].join('\n');
      }
      return [
        'Looking in indexes: https://download.pytorch.org/whl/cpu',
        'Collecting torch',
        '  Downloading torch-2.1.0-cp310-cp310-manylinux2014_aarch64.whl (188.4 MB)',
        'Installing collected packages: torch, torchvision, torchaudio',
        'Successfully installed torch-2.1.0 torchvision-0.16.0 torchaudio-2.1.0'
      ].join('\n');
    }
    if (cmd.startsWith('pip3 install --upgrade')) {
      return [
        'Requirement already satisfied: pip in /usr/local/lib/python3.10/dist-packages (23.3.1)',
        'Collecting pip',
        '  Downloading pip-24.0-py3-none-any.whl (2.1 MB)',
        'Successfully installed pip-24.0'
      ].join('\n');
    }
    if (cmd.startsWith('source ') || cmd.includes('setenv.sh')) {
      return '[env] CANN environment variables activated.';
    }
    if (cmd.includes('import torch')) {
      return [
        'NPU available: True',
        'Using PyTorch version: 2.1.0+cpu'
      ].join('\n');
    }
    if (cmd.includes('import torch_npu')) {
      return 'torch-npu OK';
    }
    // 默认输出
    return '[ok] Command executed successfully.';
  },

  // 直接执行代码区的命令脚本
  runScriptFromEditor(fileKey, onProgress, onComplete) {
    const commands = this.parseCommandsFromEditor(fileKey);
    if (commands.length === 0) {
      this.writeWarn('没有找到可执行的命令');
      if (onComplete) onComplete();
      return;
    }
    let idx = 0;
    const total = commands.length;
    const delayBetween = 800; // 每条命令之间的间隔（毫秒）

    const runNext = () => {
      if (idx >= total) {
        // 所有命令执行完毕
        this.writeBlank();
        this.writeSuccess(`脚本执行完成：共 ${total} 条命令`);
        this.writeInfo('提示：此为模拟环境，实际请在 Ubuntu/昇腾 NPU 服务器上执行');
        this.writeBlank();
        if (onComplete) onComplete();
        return;
      }
      const cmd = commands[idx];
      const i = idx;
      idx++;

      // 输出命令
      this.writeCommand(cmd);

      // 输出模拟的命令结果
      setTimeout(() => {
        const output = this.simulateCommandOutput(cmd);
        if (output && output.length > 0) {
          // 逐行输出，模拟真实执行效果
          const outLines = output.split('\n');
          for (const outLine of outLines) {
            if (outLine.trim().length > 0) {
              this.appendLine(`<span class="term-muted">${escapeHtml(outLine)}</span>`);
            }
          }
        }
        // 报告进度
        if (onProgress) onProgress(i + 1, total);
        // 执行下一条命令
        setTimeout(runNext, delayBetween);
      }, 400);
    };

    // 显示脚本开始执行的提示
    this.appendLine(`<span class="term-info">➜</span> <span class="term-accent">执行脚本：${fileKey || 'main.ts'}</span> <span class="term-muted">（共 ${commands.length} 条命令）</span>`);
    this.writeBlank();
    runNext();
  }
};

// ============ 智能对话引擎 ============
const ChatBot = {
  state: {
    env: null,
    matched: null,
    messages: [],
    mode: 'idle'
  },

  init() {
    this.state = { env: null, matched: null, messages: [], mode: 'idle' };
  },

  addUserMessage(text) {
    const aiBody = document.getElementById('aiBody');
    if (!aiBody) return;
    const msg = document.createElement('div');
    msg.className = 'ai-msg ai-msg--user';
    msg.innerHTML = `
      <div class="ai-msg-icon">👤</div>
      <div class="ai-msg-content">
        <div class="ai-msg-body"><p>${escapeHtml(text)}</p></div>
      </div>`;
    aiBody.appendChild(msg);
    aiBody.scrollTop = aiBody.scrollHeight;
    this.state.messages.push({ role: 'user', text });
  },

  showAssistantLoading(message) {
    const aiBody = document.getElementById('aiBody');
    if (!aiBody) return null;
    const loading = document.createElement('div');
    loading.className = 'ai-msg ai-msg--assistant';
    loading.innerHTML = `<div class="ai-msg-icon">🤖</div>
      <div class="ai-msg-content"><div class="ai-loading">
        <div class="ai-loading__spinner"></div><span>${message}</span>
      </div></div>`;
    aiBody.appendChild(loading);
    aiBody.scrollTop = aiBody.scrollHeight;
    return loading;
  },

  appendAssistantHtml(html) {
    const aiBody = document.getElementById('aiBody');
    if (!aiBody) return;
    const msg = document.createElement('div');
    msg.className = 'ai-msg ai-msg--assistant';
    msg.innerHTML = `<div class="ai-msg-icon">🤖</div><div class="ai-msg-content">${html}</div>`;
    aiBody.appendChild(msg);
    aiBody.scrollTop = aiBody.scrollHeight;
    return msg;
  },

  appendAssistantText(text) {
    return this.appendAssistantHtml(`<div class="ai-msg-body"><p>${escapeHtml(text)}</p></div>`);
  },

  // 智能意图识别
  detectIntent(text) {
    const t = text.toLowerCase();

    // 环境检测
    if (/检测|检查|查看|分析|当前系统|我的系统|什么系统|什么环境|env|system|detect|check/.test(t)
        && !/版本|cann/i.test(t)) {
      return { type: 'detect_env' };
    }

    // 完整安装推荐
    if (/推荐|建议|帮我|完整|一键|安装|install|cann/i.test(t) && /cann|版本|推荐|安装/i.test(text)) {
      return { type: 'full_analysis' };
    }

    // 版本信息查询
    if (/(\d+(\.\d+)+)/.test(text) || /版本|支持哪些系统|支持哪些|兼容|requirements/i.test(t)) {
      const versionMatch = text.match(/(\d+(\.\d+)+)/);
      if (versionMatch) return { type: 'version_info', version: versionMatch[1] };
      return { type: 'version_list' };
    }

    // Python 相关
    if (/python|py|版本/i.test(t)) {
      return { type: 'python_info' };
    }

    // NPU / 硬件
    if (/npu|昇腾|ascend|显卡|gpu|驱动|硬件/i.test(t)) {
      return { type: 'hardware_info' };
    }

    // 系统 / OS 相关
    if (/macos|mac|windows|ubuntu|centos|linux|系统|操作系统/i.test(t)) {
      return { type: 'os_info' };
    }

    // 命令 / 步骤
    if (/命令|步骤|怎么装|如何|command|step/i.test(t)) {
      return { type: 'command_info' };
    }

    // 清空 / 重置
    if (/清空|重置|清除|clear|reset|新对话/i.test(t)) {
      return { type: 'clear' };
    }

    // 帮助
    if (/帮助|help|你是谁|你能做什么|功能|怎么用|使用|教程/i.test(t)) {
      return { type: 'help' };
    }

    return { type: 'unknown' };
  },

  // 主处理函数
  handleUserInput(text) {
    this.addUserMessage(text);
    const intent = this.detectIntent(text);

    setTimeout(() => this.executeIntent(intent, text), 300);
  },

  executeIntent(intent, rawText) {
    const aiBody = document.getElementById('aiBody');
    if (!aiBody) return;

    switch (intent.type) {
      case 'detect_env':
        this.doDetectEnv();
        break;
      case 'full_analysis':
        this.doFullAnalysis();
        break;
      case 'version_list':
        this.doVersionList();
        break;
      case 'version_info':
        this.doVersionInfo(intent.version);
        break;
      case 'python_info':
        this.doPythonInfo();
        break;
      case 'hardware_info':
        this.doHardwareInfo();
        break;
      case 'os_info':
        this.doOSInfo();
        break;
      case 'command_info':
        this.doCommandInfo();
        break;
      case 'clear':
        this.doClear();
        break;
      case 'help':
        this.doHelp();
        break;
      default:
        this.doUnknown(rawText);
    }
  },

  // ===== 动作执行函数 =====
  doDetectEnv() {
    const loader = this.showAssistantLoading('正在检测环境信息，请稍候...');
    setTimeout(() => {
      if (loader) loader.remove();
      const env = CANN_ASSISTANT.detectEnvironment();
      this.state.env = env;
      this.renderEnvResult(env);
      TerminalSim.runDetectEnv(env);
    }, 700);
  },

  renderEnvResult(env) {
    const compatOs = env.os === 'Linux' ? 'ai-env-item__value--ok' : 'ai-env-item__value--warn';

    this.appendAssistantHtml(`
      <div class="ai-msg-title">✓ 已完成环境检测</div>
      <div class="ai-msg-body">
        <p>以下是从你的浏览器端检测到的系统环境信息：</p>

        <div class="ai-env-card">
          <div class="ai-env-card__title">🖥 系统信息</div>
          <div class="ai-env-card__grid">
            <div class="ai-env-item"><span class="ai-env-item__label">操作系统</span><span class="ai-env-item__value ${compatOs}">${env.os} ${env.osVersion}</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">平台架构</span><span class="ai-env-item__value ai-env-item__value--ok">${env.arch}</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">CPU 核心</span><span class="ai-env-item__value">${env.cores} 核</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">内存</span><span class="ai-env-item__value ${env.memory !== 'N/A' ? 'ai-env-item__value--ok' : 'ai-env-item__value--warn'}">${env.memory}</span></div>
          </div>
        </div>

        <div class="ai-env-card">
          <div class="ai-env-card__title">🌐 浏览器与本地化</div>
          <div class="ai-env-card__grid">
            <div class="ai-env-item"><span class="ai-env-item__label">浏览器</span><span class="ai-env-item__value">${env.browser}</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">语言</span><span class="ai-env-item__value">${env.language}</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">时区</span><span class="ai-env-item__value">${env.timeZone}</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">屏幕</span><span class="ai-env-item__value">${env.screen}</span></div>
          </div>
        </div>

        <div class="ai-env-card">
          <div class="ai-env-card__title">📋 兼容性快速评估</div>
          <div class="ai-env-card__grid">
            <div class="ai-env-item"><span class="ai-env-item__label">CANN 原生支持</span><span class="ai-env-item__value ${env.os === 'Linux' ? 'ai-env-item__value--ok' : 'ai-env-item__value--err'}">${env.os === 'Linux' ? '✓ 支持' : '✗ 需 Docker/WSL'}</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">昇腾 NPU 检测</span><span class="ai-env-item__value ai-env-item__value--warn">⚠ 浏览器无法检测</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">推荐 Python</span><span class="ai-env-item__value ai-env-item__value--ok">3.8 - 3.12</span></div>
          </div>
        </div>

        <p class="ai-tip">💡 <strong>下一步建议：</strong>你可以问我 <em>"基于当前环境推荐安装 CANN"</em> 或直接问 <em>"生成安装命令"</em> 来获取完整安装步骤。</p>
      </div>`);
  },

  doFullAnalysis() {
    const aiBody = document.getElementById('aiBody');
    if (!aiBody) return;

    // 第一步：检测环境（若未检测）
    if (!this.state.env) {
      const loader = this.showAssistantLoading('好的，让我先检测你的环境...');
      setTimeout(() => {
        if (loader) loader.remove();
        const env = CANN_ASSISTANT.detectEnvironment();
        this.state.env = env;
        this.renderEnvResult(env);
        TerminalSim.runDetectEnv(env);

        // 第二步：版本匹配
        setTimeout(() => {
          const l2 = this.showAssistantLoading('正在为你分析 CANN 版本匹配...');
          setTimeout(() => {
            if (l2) l2.remove();
            const matched = CANN_ASSISTANT.matchVersions(env);
            this.state.matched = matched;
            this.renderVersionMatch(matched);

            // 第三步：生成命令
            setTimeout(() => {
              const l3 = this.showAssistantLoading('正在生成安装命令...');
              setTimeout(() => {
                if (l3) l3.remove();
                this.renderCommands(env, matched);
              }, 500);
            }, 400);
          }, 600);
        }, 400);
      }, 700);
    } else {
      // 已有环境信息，直接版本匹配 + 生成命令
      const l2 = this.showAssistantLoading('已检测到环境信息，正在分析版本匹配...');
      setTimeout(() => {
        if (l2) l2.remove();
        const matched = CANN_ASSISTANT.matchVersions(this.state.env);
        this.state.matched = matched;
        this.renderVersionMatch(matched);

        setTimeout(() => {
          const l3 = this.showAssistantLoading('正在生成安装命令...');
          setTimeout(() => {
            if (l3) l3.remove();
            this.renderCommands(this.state.env, matched);
          }, 500);
        }, 400);
      }, 600);
    }
  },

  renderVersionMatch(matched) {
    const medals = ['🥇', '🥈', '🥉'];
    let versionsHtml = '';
    matched.forEach((m, idx) => {
      const compatItems = [
        { label: 'Python', ok: m.compatibility.python },
        { label: '架构', ok: m.compatibility.arch },
        { label: '系统', ok: m.compatibility.os },
        { label: 'NPU', ok: m.compatibility.npu }
      ].map(c => `<span class="ai-version-compat__item"><span class="${c.ok ? 'ai-version-compat__ok' : 'ai-version-compat__no'}">${c.ok ? '✓' : '✗'}</span> ${c.label}</span>`).join('');

      const issuesHtml = m.issues.length ? `
        <div class="ai-version-issues">
          <div style="font-weight:600; margin-bottom:4px;">⚠ 注意事项</div>
          <ul style="padding-left:18px; margin:0;">${m.issues.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>` : '';

      versionsHtml += `
        <div class="ai-version-card">
          <div class="ai-version-card__header">
            <span class="ai-version-badge">${medals[idx] || '  '}</span>
            <span class="ai-version-name">CANN ${m.version}</span>
            <span style="color:#858585; font-size:11px;">(${m.release})</span>
            <span class="ai-version-score">${m.score}/100</span>
          </div>
          <div style="color:#cccccc; font-size:12px; margin:4px 0;">${m.notes}</div>
          <div class="ai-version-compat">${compatItems}</div>
          ${issuesHtml}
        </div>`;
    });

    this.appendAssistantHtml(`
      <div class="ai-msg-title">📊 CANN 版本匹配分析</div>
      <div class="ai-msg-body">
        <p>基于你的环境，以下是推荐的 CANN 版本（按兼容性评分排序）：</p>
        ${versionsHtml}
        <p style="margin-top:10px;"><strong>💡 结论：</strong> 推荐安装
          <span style="color:#4ec9b0; font-weight:600;">CANN ${matched[0].version}</span>。
          ${matched[0].compatibility.os ? '' : '由于当前系统非 Linux，需通过容器或远程服务器使用。'}
        </p>
        <p class="ai-tip">💡 你可以继续问我：<em>"CANN ${matched[0].version} 需要什么 Python 版本？"</em> 或 <em>"生成安装步骤"</em></p>
      </div>`);
  },

  renderCommands(env, matched) {
    const commands = CANN_ASSISTANT.generateCommands(env, matched);
    const best = matched[0];
    window.__cannCommands = commands.map(c => c.code);
    window.__cannAllCommands = commands;
    window.__cannVersion = best.version;
    TerminalSim.runCannInstall(best.version, env);

    let cmdHtml = '';
    commands.forEach((cmd, idx) => {
      const stepLabel = cmd.step === 0 ? '⚠' : `${cmd.step}`;
      cmdHtml += `
        <div class="ai-command-card">
          <div class="ai-command-card__header">
            <span class="ai-command-step">${stepLabel}</span>
            <div style="flex:1; min-width:0;">
              <div class="ai-command-card__title">${cmd.title}</div>
              <div class="ai-command-card__desc">${cmd.desc}</div>
            </div>
            <div class="ai-command-card__actions">
              <button class="ai-command-card__replace" data-cmd-index="${idx}">🔄 替换到 main.ts</button>
              <button class="ai-command-card__copy" data-cmd-index="${idx}">📋 复制</button>
            </div>
          </div>
          <div class="ai-command-card__body">
            <pre class="ai-command-code" data-code-index="${idx}">${escapeHtml(cmd.code)}</pre>
          </div>
        </div>`;
    });

    this.appendAssistantHtml(`
      <div class="ai-msg-title">📦 推荐安装步骤 (CANN ${best.version})</div>
      <div class="ai-msg-body">
        <p>按照以下步骤完成 CANN 的完整安装和配置：</p>
        ${cmdHtml}

        <div class="ai-command-card ai-command-card--full">
          <div class="ai-command-card__header">
            <span class="ai-command-step">📝</span>
            <div style="flex:1; min-width:0;">
              <div class="ai-command-card__title">生成完整安装脚本</div>
              <div class="ai-command-card__desc">将所有步骤命令整合为一个完整的 shell 脚本，替换到代码区 main.ts</div>
            </div>
            <div class="ai-command-card__actions">
              <button class="ai-command-card__replace-all" id="replaceAllBtn">🎯 一键替换到 main.ts</button>
            </div>
          </div>
          <div class="ai-command-card__body">
            <div style="font-size: 12px; color: #858585; padding: 8px 0;">
              <div>✅ 已为你的环境生成完整安装脚本：</div>
              <div style="margin-top: 6px;">
                <code style="background:#1e1e1e; padding:2px 6px; border-radius:3px;">系统: ${env.os} ${env.osVersion}</code>
                <code style="background:#1e1e1e; padding:2px 6px; border-radius:3px; margin-left:6px;">架构: ${env.arch}</code>
                <code style="background:#1e1e1e; padding:2px 6px; border-radius:3px; margin-left:6px;">版本: CANN ${best.version}</code>
              </div>
            </div>
          </div>
        </div>

        <div class="ai-summary">
          <div class="ai-summary__title">📝 安装总览</div>
          <div class="ai-summary__items">
            <div class="ai-summary__item"><span class="ai-summary__label">推荐版本</span><span class="ai-summary__value">CANN ${best.version}</span></div>
            <div class="ai-summary__item"><span class="ai-summary__label">系统</span><span class="ai-summary__value">${env.os}</span></div>
            <div class="ai-summary__item"><span class="ai-summary__label">架构</span><span class="ai-summary__value">${env.arch}</span></div>
            <div class="ai-summary__item"><span class="ai-summary__label">Python</span><span class="ai-summary__value">3.8 - 3.12</span></div>
          </div>
        </div>

        <div class="ai-links">
          <div class="ai-links__title">📚 参考文档</div>
          <a href="https://www.hiascend.com/software/cann" target="_blank">昇腾 CANN 官网</a>
          <a href="https://www.mindspore.cn/" target="_blank">MindSpore 深度学习框架</a>
          <a href="https://gitee.com/ascend/samples" target="_blank">CANN 示例代码 (Gitee)</a>
        </div>

        <p class="ai-tip">💡 <strong>快捷操作：</strong>
          <span style="color:#4ec9b0;">🔄 替换到 main.ts</span> — 将当前步骤命令替换到代码区；
          <span style="color:#4ec9b0;">🎯 一键替换</span> — 将所有步骤整合为完整脚本；
          <span style="color:#4ec9b0;">📋 复制</span> — 复制到剪贴板。</p>
      </div>`);
    setupCopyButtons();
    setupReplaceButtons();
  },

  doVersionList() {
    let html = `
      <div class="ai-msg-title">📦 CANN 可用版本</div>
      <div class="ai-msg-body">
        <p>当前推荐的 CANN 主要版本：</p>`;
    CANN_ASSISTANT.versions.forEach(v => {
      html += `
        <div class="ai-version-card">
          <div class="ai-version-card__header">
            <span class="ai-version-badge">📦</span>
            <span class="ai-version-name">CANN ${v.version}</span>
            <span style="color:#858585; font-size:11px;">(${v.release})</span>
          </div>
          <div style="color:#cccccc; font-size:12px; margin:4px 0;">${v.notes}</div>
          <div style="font-size:11px; color:#858585; margin-top:4px;">
            • 支持 Python: ${v.python.join(', ')}<br>
            • 支持系统: ${v.os.join(', ')}<br>
            • 架构: ${v.arch.join(', ')}
          </div>
        </div>`;
    });
    html += `<p class="ai-tip">💡 你可以问我 <em>"CANN 8.0.RC1 支持哪些系统？"</em> 或 <em>"检测当前环境并推荐版本"</em></p></div>`;
    this.appendAssistantHtml(html);
  },

  doVersionInfo(versionStr) {
    const found = CANN_ASSISTANT.versions.find(v => v.version.includes(versionStr) || versionStr.includes(v.version.split('.')[0]));
    if (found) {
      this.appendAssistantHtml(`
        <div class="ai-msg-title">📋 CANN ${found.version} 版本信息</div>
        <div class="ai-msg-body">
          <div class="ai-env-card">
            <div class="ai-env-card__title">📦 版本基本信息</div>
            <div class="ai-env-card__grid">
              <div class="ai-env-item"><span class="ai-env-item__label">版本号</span><span class="ai-env-item__value">${found.version}</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">发布时间</span><span class="ai-env-item__value">${found.release}</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">备注</span><span class="ai-env-item__value">${found.notes}</span></div>
            </div>
          </div>
          <div class="ai-env-card">
            <div class="ai-env-card__title">✅ 兼容环境</div>
            <div class="ai-env-card__grid">
              <div class="ai-env-item"><span class="ai-env-item__label">Python</span><span class="ai-env-item__value ai-env-item__value--ok">${found.python.join(', ')}</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">操作系统</span><span class="ai-env-item__value ai-env-item__value--ok">${found.os.join(', ')}</span></div>
              <div class="ai-env-item"><span class="ai-env-item__label">CPU 架构</span><span class="ai-env-item__value ai-env-item__value--ok">${found.arch.join(', ')}</span></div>
            </div>
          </div>
          <p class="ai-tip">💡 想要完整安装？问我 <em>"检测当前环境并推荐安装 CANN ${found.version}"</em></p>
        </div>`);
    } else {
      this.appendAssistantHtml(`
        <div class="ai-msg-title">😕 未找到匹配版本</div>
        <div class="ai-msg-body">
          <p>抱歉，我没有找到与 <strong>"${versionStr}"</strong> 相关的 CANN 版本信息。</p>
          <p>当前已知的版本有：${CANN_ASSISTANT.versions.map(v => v.version).join('、')}。</p>
          <p class="ai-tip">💡 你可以问我 <em>"列出所有 CANN 版本"</em> 或直接 <em>"检测环境并推荐安装"</em></p>
        </div>`);
    }
  },

  doPythonInfo() {
    this.appendAssistantHtml(`
      <div class="ai-msg-title">🐍 Python 版本要求</div>
      <div class="ai-msg-body">
        <p>CANN 对 Python 版本有严格要求，各版本支持情况：</p>
        <div class="ai-env-card">
          <div class="ai-env-card__title">📦 各 CANN 版本的 Python 支持</div>
          <div class="ai-env-card__grid">
            ${CANN_ASSISTANT.versions.map(v => `
              <div class="ai-env-item"><span class="ai-env-item__label">CANN ${v.version}</span><span class="ai-env-item__value ai-env-item__value--ok">${v.python.join(', ')}</span></div>
            `).join('')}
          </div>
        </div>
        <div class="ai-env-card">
          <div class="ai-env-card__title">💡 安装建议</div>
          <div class="ai-env-card__grid">
            <div class="ai-env-item"><span class="ai-env-item__label">推荐版本</span><span class="ai-env-item__value ai-env-item__value--ok">Python 3.9 或 3.10</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">不推荐</span><span class="ai-env-item__value ai-env-item__value--warn">Python 2.x / 3.5 及以下</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">包管理</span><span class="ai-env-item__value">pip / conda</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">验证命令</span><span class="ai-env-item__value">python3 --version</span></div>
          </div>
        </div>
        <p class="ai-tip">💡 想要完整检测？问我 <em>"检测当前环境并推荐 CANN 安装"</em></p>
      </div>`);
  },

  doHardwareInfo() {
    this.appendAssistantHtml(`
      <div class="ai-msg-title">🔧 昇腾 NPU 硬件说明</div>
      <div class="ai-msg-body">
        <p>CANN（Compute Architecture for Neural Networks）是华为针对昇腾 AI 处理器推出的异构计算架构。</p>

        <div class="ai-env-card">
          <div class="ai-env-card__title">📦 主要昇腾产品系列</div>
          <div class="ai-env-card__grid">
            <div class="ai-env-item"><span class="ai-env-item__label">昇腾 310</span><span class="ai-env-item__value ai-env-item__value--ok">推理场景，低功耗</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">昇腾 310P</span><span class="ai-env-item__value ai-env-item__value--ok">增强推理，算力更高</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">昇腾 910</span><span class="ai-env-item__value ai-env-item__value--ok">训练场景，大算力</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">昇腾 910B</span><span class="ai-env-item__value ai-env-item__value--ok">新一代训练处理器</span></div>
          </div>
        </div>

        <div class="ai-env-card">
          <div class="ai-env-card__title">🔍 NPU 检测方法</div>
          <div class="ai-env-card__grid">
            <div class="ai-env-item"><span class="ai-env-item__label">Linux 检测命令</span><span class="ai-env-item__value">npu-smi info</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">查看驱动版本</span><span class="ai-env-item__value">cat /etc/Ascend/version.cfg</span></div>
            <div class="ai-env-item"><span class="ai-env-item__label">浏览器检测</span><span class="ai-env-item__value ai-env-item__value--warn">⚠ 不可直接检测</span></div>
          </div>
        </div>

        <p class="ai-tip">💡 浏览器无法直接检测昇腾 NPU。若你在 Linux 系统上，请在终端执行 <code style="background:#252526; padding:2px 6px; border-radius:3px;">npu-smi info</code> 查看硬件信息，或运行 <code style="background:#252526; padding:2px 6px; border-radius:3px;">python3 cann_install.py</code> 获取完整检测。</p>
      </div>`);
  },

  doOSInfo() {
    const env = this.state.env || CANN_ASSISTANT.detectEnvironment();
    if (!this.state.env) this.state.env = env;

    const isLinux = env.os === 'Linux';
    const tips = isLinux ? `
      <div class="ai-env-card">
        <div class="ai-env-card__title">✅ 当前系统兼容分析</div>
        <div class="ai-env-card__grid">
          <div class="ai-env-item"><span class="ai-env-item__label">你的系统</span><span class="ai-env-item__value ai-env-item__value--ok">${env.os} ${env.osVersion}</span></div>
          <div class="ai-env-item"><span class="ai-env-item__label">架构</span><span class="ai-env-item__value ai-env-item__value--ok">${env.arch}</span></div>
          <div class="ai-env-item"><span class="ai-env-item__label">CANN 原生支持</span><span class="ai-env-item__value ai-env-item__value--ok">✓ 支持</span></div>
        </div>
      </div>` : `
      <div class="ai-env-card">
        <div class="ai-env-card__title">⚠ 当前系统兼容分析</div>
        <div class="ai-env-card__grid">
          <div class="ai-env-item"><span class="ai-env-item__label">你的系统</span><span class="ai-env-item__value ai-env-item__value--warn">${env.os} ${env.osVersion}</span></div>
          <div class="ai-env-item"><span class="ai-env-item__label">架构</span><span class="ai-env-item__value">${env.arch}</span></div>
          <div class="ai-env-item"><span class="ai-env-item__label">CANN 原生支持</span><span class="ai-env-item__value ai-env-item__value--err">✗ 不原生支持</span></div>
        </div>
        <p style="font-size:12px; color:#cca700; margin:8px 0 0 0;">💡 CANN 目前主要原生支持 Linux 系统。你可以通过 <strong>Docker</strong>、<strong>WSL2</strong> 或 <strong>远程 Linux 服务器</strong> 来使用 CANN。</p>
      </div>`;

    this.appendAssistantHtml(`
      <div class="ai-msg-title">💻 操作系统支持说明</div>
      <div class="ai-msg-body">
        <p>CANN 对操作系统有特定要求，以下是各版本支持情况：</p>

        <div class="ai-env-card">
          <div class="ai-env-card__title">📦 各 CANN 版本的系统支持</div>
          <div class="ai-env-card__grid">
            ${CANN_ASSISTANT.versions.map(v => `
              <div class="ai-env-item"><span class="ai-env-item__label">CANN ${v.version}</span><span class="ai-env-item__value ai-env-item__value--ok">${v.os.join(', ')}</span></div>
            `).join('')}
          </div>
        </div>

        ${tips}

        <p class="ai-tip">💡 想要完整安装方案？问我 <em>"基于当前环境推荐 CANN 安装步骤"</em></p>
      </div>`);
  },

  doCommandInfo() {
    const env = this.state.env || CANN_ASSISTANT.detectEnvironment();
    if (!this.state.env) this.state.env = env;

    const isLinux = env.os === 'Linux';
    const basicCmd = isLinux ? `
# 检查系统依赖
python3 --version
gcc --version

# 检查昇腾 NPU
npu-smi info

# 查看驱动版本
cat /etc/Ascend/version.cfg` : `
# 非 Linux 系统需先准备容器环境
# macOS 方案：Docker 容器
docker pull ascendai/cann:8.0.RC1-ubuntu20.04

# Windows 方案：WSL2
wsl --install -d Ubuntu-20.04`;

    this.appendAssistantHtml(`
      <div class="ai-msg-title">📋 CANN 常用命令速查</div>
      <div class="ai-msg-body">
        <p>以下是 CANN 安装和使用的常用命令（已根据你的 <strong>${env.os}</strong> 系统适配）：</p>

        <div class="ai-command-card">
          <div class="ai-command-card__header">
            <span class="ai-command-step">1</span>
            <div style="flex:1; min-width:0;">
              <div class="ai-command-card__title">环境检查命令</div>
              <div class="ai-command-card__desc">检测系统是否满足 CANN 安装要求</div>
            </div>
            <div class="ai-command-card__actions">
              <button class="ai-command-card__replace" data-cmd-special="0">🔄 替换到 main.ts</button>
              <button class="ai-command-card__copy" data-cmd-special="0">📋 复制</button>
            </div>
          </div>
          <div class="ai-command-card__body">
            <pre class="ai-command-code" data-code-special="0">${escapeHtml(basicCmd)}</pre>
          </div>
        </div>

        <div class="ai-command-card">
          <div class="ai-command-card__header">
            <span class="ai-command-step">2</span>
            <div style="flex:1; min-width:0;">
              <div class="ai-command-card__title">安装后的验证</div>
              <div class="ai-command-card__desc">确认 CANN 安装成功并能正常工作</div>
            </div>
            <div class="ai-command-card__actions">
              <button class="ai-command-card__replace" data-cmd-special="1">🔄 替换到 main.ts</button>
              <button class="ai-command-card__copy" data-cmd-special="1">📋 复制</button>
            </div>
          </div>
          <div class="ai-command-card__body">
            <pre class="ai-command-code" data-code-special="1">${escapeHtml(`# 检查 CANN 版本
python3 -c "import te; print(te.version.CANN_VERSION)"

# 检查 NPU 是否可被调用
python3 -c "
from te import platform as cce
print('CANN Platform:', cce.get_soc_name())
"

# 环境变量检查
echo $ASCEND_HOME
echo $LD_LIBRARY_PATH
echo $PYTHONPATH | grep -o '[^:]*ascend[^:]*' | head -3`)}</pre>
          </div>
        </div>

        <p class="ai-tip">💡 想要完整详细的安装命令？问我 <em>"生成完整安装步骤"</em> 或直接点击上方 <strong>📦 推荐安装</strong> 按钮</p>
      </div>`);

    // 保存这两条特殊命令供按钮使用
    window.__cannSpecialCommands = [basicCmd, `# 检查 CANN 版本
python3 -c "import te; print(te.version.CANN_VERSION)"

# 检查 NPU 是否可被调用
python3 -c "
from te import platform as cce
print('CANN Platform:', cce.get_soc_name())
"

# 环境变量检查
echo $ASCEND_HOME
echo $LD_LIBRARY_PATH
echo $PYTHONPATH | grep -o '[^:]*ascend[^:]*' | head -3`];

    // 设置特殊命令的按钮
    document.querySelectorAll('[data-cmd-special]').forEach(btn => {
      const idx = parseInt(btn.dataset.cmdSpecial);
      if (btn.classList.contains('ai-command-card__replace')) {
        btn.addEventListener('click', () => {
          const code = window.__cannSpecialCommands[idx];
          if (!code) return;
          const original = btn.textContent;
          btn.textContent = '✓ 已替换';
          btn.classList.add('replaced');
          setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('replaced');
          }, 2000);
          // 第 1 条特殊命令替换到步骤 1（环境检查），第 2 条替换到步骤 5（验证）
          const targetStep = idx === 0 ? 0 : 4;
          const stepTitle = idx === 0 ? '环境检查命令' : '安装后验证';
          replaceStepToEditor(targetStep, code, stepTitle);
        });
      } else if (btn.classList.contains('ai-command-card__copy')) {
        btn.addEventListener('click', () => {
          const code = window.__cannSpecialCommands[idx];
          if (!code) return;
          const original = btn.textContent;
          btn.textContent = '✓ 已复制';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('copied');
          }, 1500);
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).catch(() => {
              const ta = document.createElement('textarea');
              ta.value = code;
              document.body.appendChild(ta);
              ta.select();
              try { document.execCommand('copy'); } catch (e) {}
              document.body.removeChild(ta);
            });
          } else {
            const ta = document.createElement('textarea');
            ta.value = code;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta);
          }
        });
      }
    });
  },

  doClear() {
    this.init();
    const aiBody = document.getElementById('aiBody');
    if (aiBody) {
      aiBody.innerHTML = `
        <div class="ai-msg ai-msg--assistant ai-msg--welcome">
          <div class="ai-msg-icon">🤖</div>
          <div class="ai-msg-content">
            <div class="ai-msg-title">对话已重置 🔄</div>
            <div class="ai-msg-body">
              <p>已清空所有历史对话和状态记录。我们重新开始吧！</p>
              <p>你可以问我：</p>
              <ul>
                <li><em>"检测当前环境"</em> - 分析系统是否适合安装 CANN</li>
                <li><em>"推荐安装 CANN"</em> - 完整三步分析 + 安装命令</li>
                <li><em>"列出所有 CANN 版本"</em> - 查看可用版本</li>
                <li><em>"CANN 8.0.RC1 支持哪些系统？"</em> - 查询特定版本</li>
              </ul>
            </div>
          </div>
        </div>`;
      aiBody.scrollTop = aiBody.scrollHeight;
    }
  },

  doHelp() {
    this.appendAssistantHtml(`
      <div class="ai-msg-title">🤖 CANN 智能安装助手</div>
      <div class="ai-msg-body">
        <p>你好！我是 <strong>CANN 智能安装助手</strong>，我可以帮你：</p>

        <div class="ai-env-card">
          <div class="ai-env-card__title">🔍 我能做什么</div>
          <div style="font-size:12px; color:#cccccc; line-height:1.8;">
            <p><strong>• 环境检测</strong>：分析你的操作系统、CPU、内存、Python 版本等</p>
            <p><strong>• 版本推荐</strong>：根据你的环境智能匹配最适合的 CANN 版本</p>
            <p><strong>• 安装命令</strong>：生成完整、可直接执行的安装步骤和命令</p>
            <p><strong>• 问题解答</strong>：回答关于 Python 版本、操作系统、NPU 硬件、驱动等相关问题</p>
          </div>
        </div>

        <div class="ai-env-card">
          <div class="ai-env-card__title">💬 你可以这样问我</div>
          <div style="font-size:12px; color:#cccccc; line-height:1.9;">
            <p style="margin:2px 0;">👉 <em>"检测当前环境"</em></p>
            <p style="margin:2px 0;">👉 <em>"推荐安装 CANN"</em></p>
            <p style="margin:2px 0;">👉 <em>"CANN 8.0.RC1 支持哪些系统？"</em></p>
            <p style="margin:2px 0;">👉 <em>"需要什么 Python 版本？"</em></p>
            <p style="margin:2px 0;">👉 <em>"昇腾 NPU 如何检测？"</em></p>
            <p style="margin:2px 0;">👉 <em>"生成完整安装步骤"</em></p>
            <p style="margin:2px 0;">👉 <em>"清空对话"</em></p>
          </div>
        </div>

        <p class="ai-tip">💡 也可以点击上方的快捷按钮 <strong>🔍 检测环境</strong> 或 <strong>📦 推荐安装</strong> 快速开始！</p>
      </div>`);
  },

  doUnknown(rawText) {
    this.appendAssistantHtml(`
      <div class="ai-msg-title">🤔 让我理解一下</div>
      <div class="ai-msg-body">
        <p>我不太确定你想要什么。你可以试试以下请求：</p>
        <ul>
          <li><em>"检测当前环境"</em> - 分析你的系统</li>
          <li><em>"推荐安装 CANN"</em> - 完整三步分析</li>
          <li><em>"列出所有 CANN 版本"</em> - 查看版本信息</li>
          <li><em>"需要什么 Python 版本？"</em> - 技术规格查询</li>
        </ul>
        <p>你也可以点击上方的 <strong>🔍 检测环境</strong> 或 <strong>📦 推荐安装</strong> 快捷按钮。</p>
        <p class="ai-tip">💡 我会从我们的对话中学习，随着时间推移，我会更懂你的需求！</p>
      </div>`);
  }
};

function setupChatInput() {
  const input = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('aiSendBtn');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.value.trim();
      if (text) {
        ChatBot.handleUserInput(text);
        input.value = '';
      }
    }
  });

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (text) {
        ChatBot.handleUserInput(text);
        input.value = '';
        input.focus();
      }
    });
  }
}

function setupAIActions() {
  // 快捷按钮
  document.querySelectorAll('.ai-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'detect-env') {
        ChatBot.handleUserInput('请帮我检测当前系统环境，看看是否适合安装 CANN。');
      } else if (action === 'cann-recommend') {
        ChatBot.handleUserInput('请检测我的环境并推荐最合适的 CANN 版本，生成完整的安装步骤。');
      } else if (action === 'help') {
        ChatBot.handleUserInput('你能做什么？');
      } else if (action === 'clear-panel') {
        ChatBot.doClear();
      }
    });
  });

  // 右侧 AI 面板的折叠按钮
  const toggleBtn = document.getElementById('aipanelToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const panel = document.getElementById('aipanel');
      if (panel) panel.classList.toggle('collapsed');
    });
  }

  // 右侧 AI 面板的清空按钮
  const clearBtn = document.getElementById('aipanelClear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      ChatBot.doClear();
    });
  }

  // 执行安装按钮
  const runInstallBtn = document.getElementById('runInstallBtn');
  if (runInstallBtn && !runInstallBtn.dataset.inited) {
    runInstallBtn.dataset.inited = 'true';
    runInstallBtn.addEventListener('click', () => {
      // 设置按钮运行中状态
      runInstallBtn.disabled = true;
      runInstallBtn.classList.add('run-install-btn--running');
      const originalText = runInstallBtn.querySelector('.run-install-btn__text');
      const originalIcon = runInstallBtn.querySelector('.run-install-btn__icon');
      if (originalText) originalText.textContent = '安装中...';
      if (originalIcon) originalIcon.textContent = '●';

      // 切换到 terminal 面板
      const terminalTab = document.querySelector('.panel-tab[data-panel="terminal"]');
      if (terminalTab) terminalTab.click();

      // 重置终端
      if (typeof TerminalSim !== 'undefined' && TerminalSim.reset) {
        TerminalSim.reset();
      }

      // 根据当前选中的文件决定执行哪一个
      let currentFile = 'main';
      const activeTab = document.querySelector('.tab.active');
      if (activeTab) {
        const tabName = activeTab.textContent.trim();
        if (tabName === 'utils.ts') currentFile = 'utils';
        else if (tabName === 'package.json') currentFile = 'package';
        else if (tabName === 'README.md') currentFile = 'readme';
      }

      // 直接执行代码区的命令脚本
      setTimeout(() => {
        if (typeof TerminalSim !== 'undefined' && TerminalSim.runScriptFromEditor) {
          TerminalSim.runScriptFromEditor(
            currentFile,
            (progress, total) => {
              if (originalText) {
                originalText.textContent = `安装中... ${progress}/${total}`;
              }
            },
            () => {
              // 执行完成，恢复按钮
              runInstallBtn.disabled = false;
              runInstallBtn.classList.remove('run-install-btn--running');
              if (originalText) originalText.textContent = '执行安装';
              if (originalIcon) originalIcon.textContent = '▶';
            }
          );
        } else {
          // 如果没有 TerminalSim，则回退到 ChatBot 模式
          ChatBot.handleUserInput('请检测我的环境并推荐最合适的 CANN 版本，生成完整的安装步骤。');
          setTimeout(() => {
            runInstallBtn.disabled = false;
            runInstallBtn.classList.remove('run-install-btn--running');
            if (originalText) originalText.textContent = '执行安装';
            if (originalIcon) originalIcon.textContent = '▶';
          }, 3500);
        }
      }, 300);
    });
  }

  setupChatInput();
}

document.addEventListener('DOMContentLoaded', () => {
  ChatBot.init();
  setTimeout(setupAIActions, 100);
});

