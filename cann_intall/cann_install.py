#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CANN 智能安装助手 - 环境检测与安装命令推荐
基于系统软硬件环境，智能匹配合适的 CANN 版本并生成安装命令。
"""

import json
import platform
import re
import shutil
import subprocess
import sys
import os


# =====================================================================
# CANN 版本数据库 (基于官方支持矩阵)
# =====================================================================
CANN_VERSIONS = [
    {
        "version": "8.0.RC1",
        "release_date": "2024-12",
        "python_versions": ["3.8", "3.9", "3.10", "3.11", "3.12"],
        "os": ["Ubuntu 20.04", "Ubuntu 22.04", "CentOS 7.6", "CentOS 8.2", "openEuler 22.03", "Debian 11.3"],
        "kernel": ["4.15", "4.19", "5.4", "5.10", "5.15"],
        "arch": ["aarch64", "x86_64"],
        "npu_support": ["昇腾 310P", "昇腾 910B", "昇腾 910C", "昇腾 310B"],
        "notes": "最新稳定版，推荐使用",
        "cann_toolkit_url": "https://www.hiascend.com/document/detail/zh/CANN/80RC1/developmenttoolenv/01development/01development_0001.html",
        "nnae_url": "https://www.hiascend.com/document/detail/zh/CANN/80RC1/developmenttoolenv/01development/01development_0002.html",
        "tfplugin_url": "https://www.hiascend.com/document/detail/zh/CANN/80RC1/frameworkinstallg/3003001.html",
    },
    {
        "version": "7.0.RC1",
        "release_date": "2024-06",
        "python_versions": ["3.7", "3.8", "3.9", "3.10", "3.11"],
        "os": ["Ubuntu 18.04", "Ubuntu 20.04", "Ubuntu 22.04", "CentOS 7.6", "CentOS 8.2", "openEuler 22.03"],
        "kernel": ["4.15", "4.19", "5.4", "5.10"],
        "arch": ["aarch64", "x86_64"],
        "npu_support": ["昇腾 310P", "昇腾 910B", "昇腾 910", "昇腾 310"],
        "notes": "主流版本，兼容性好",
        "cann_toolkit_url": "https://www.hiascend.com/document/detail/zh/CANN/70RC1/developmenttoolenv/01development/01development_0001.html",
        "nnae_url": "https://www.hiascend.com/document/detail/zh/CANN/70RC1/developmenttoolenv/01development/01development_0002.html",
    },
    {
        "version": "6.3.RC1",
        "release_date": "2023-12",
        "python_versions": ["3.7", "3.8", "3.9", "3.10"],
        "os": ["Ubuntu 18.04", "Ubuntu 20.04", "CentOS 7.6", "openEuler 20.03"],
        "kernel": ["4.15", "4.19", "5.4"],
        "arch": ["aarch64", "x86_64"],
        "npu_support": ["昇腾 310P", "昇腾 910B", "昇腾 910", "昇腾 310"],
        "notes": "长期支持版本",
    },
]

NPU_CHIPS = {
    "310P": {
        "name": "昇腾 310P",
        "scenario": "推理/边缘计算",
        "compute_power": "22 TOPS INT8",
        "tdp": "60W",
    },
    "310B": {
        "name": "昇腾 310B",
        "scenario": "推理/边缘计算",
        "compute_power": "16 TOPS INT8",
        "tdp": "32W",
    },
    "910B": {
        "name": "昇腾 910B",
        "scenario": "训练/大模型推理",
        "compute_power": "320 TFLOPS FP16",
        "tdp": "350W",
    },
    "910C": {
        "name": "昇腾 910C",
        "scenario": "训练/大模型推理",
        "compute_power": "670 TFLOPS FP16",
        "tdp": "560W",
    },
}


# =====================================================================
# 环境检测工具函数
# =====================================================================
def run_cmd(cmd, timeout=10):
    """执行命令并返回输出"""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception:
        return ""


def detect_os():
    """检测操作系统"""
    system = platform.system()
    release = platform.release()
    info = {
        "system": system,
        "release": release,
        "version": platform.version(),
        "machine": platform.machine(),
    }

    if system == "Darwin":
        info["name"] = "macOS"
        info["version_str"] = f"macOS {release}"
        # 获取更详细的 macOS 版本名
        sw_ver = run_cmd("sw_vers -productVersion")
        if sw_ver:
            info["version_str"] = f"macOS {sw_ver}"
            info["product_version"] = sw_ver
    elif system == "Linux":
        # 尝试从 /etc/os-release 获取发行版信息
        os_release = {}
        try:
            with open("/etc/os-release", "r") as f:
                for line in f:
                    line = line.strip()
                    if "=" in line:
                        key, val = line.split("=", 1)
                        os_release[key] = val.strip('"')
        except Exception:
            pass

        if os_release.get("ID"):
            info["name"] = os_release.get("PRETTY_NAME") or os_release.get("NAME", "Linux")
            info["distro_id"] = os_release.get("ID")
            info["distro_version"] = os_release.get("VERSION_ID", "")
            info["version_str"] = f"{info['name']}"
        else:
            info["name"] = "Linux"
            info["version_str"] = f"Linux {release}"
    elif system == "Windows":
        info["name"] = "Windows"
        info["version_str"] = f"Windows {release}"
    else:
        info["name"] = system
        info["version_str"] = f"{system} {release}"

    return info


def detect_cpu():
    """检测 CPU 信息"""
    info = {
        "arch": platform.machine(),
        "processor": platform.processor(),
        "cores": os.cpu_count() or 0,
    }

    # macOS
    if platform.system() == "Darwin":
        brand = run_cmd("sysctl -n machdep.cpu.brand_string")
        if brand:
            info["brand"] = brand
        cores_phys = run_cmd("sysctl -n hw.physicalcpu")
        cores_log = run_cmd("sysctl -n hw.logicalcpu")
        if cores_phys:
            info["cores_physical"] = int(cores_phys)
        if cores_log:
            info["cores_logical"] = int(cores_log)

    # Linux
    elif platform.system() == "Linux":
        cpuinfo = run_cmd("cat /proc/cpuinfo | grep 'model name' | head -1")
        if cpuinfo:
            match = re.search(r":\s*(.+)", cpuinfo)
            if match:
                info["brand"] = match.group(1)
        sockets = run_cmd("cat /proc/cpuinfo | grep 'physical id' | sort -u | wc -l")
        if sockets:
            info["sockets"] = int(sockets)

    # Windows
    elif platform.system() == "Windows":
        brand = run_cmd("wmic cpu get name")
        if brand:
            lines = [l for l in brand.splitlines() if l.strip() and l.strip() != "Name"]
            if lines:
                info["brand"] = lines[0].strip()

    return info


def detect_memory():
    """检测内存"""
    info = {}
    system = platform.system()

    if system == "Darwin":
        total_mb = run_cmd("sysctl -n hw.memsize")
        if total_mb:
            total_bytes = int(total_mb)
            info["total_gb"] = round(total_bytes / (1024 ** 3), 1)

    elif system == "Linux":
        meminfo = run_cmd("cat /proc/meminfo")
        if meminfo:
            for line in meminfo.splitlines():
                if "MemTotal" in line:
                    match = re.search(r"(\d+)", line)
                    if match:
                        info["total_gb"] = round(int(match.group(1)) / (1024 * 1024), 1)
                elif "MemFree" in line:
                    match = re.search(r"(\d+)", line)
                    if match:
                        info["free_gb"] = round(int(match.group(1)) / (1024 * 1024), 1)

    elif system == "Windows":
        mem = run_cmd("wmic OS get TotalVisibleMemorySize")
        if mem:
            lines = [l for l in mem.splitlines() if l.strip().isdigit()]
            if lines:
                info["total_gb"] = round(int(lines[0]) / (1024 * 1024), 1)

    return info


def detect_gpu():
    """检测 GPU（注意：CANN 主要针对昇腾 NPU）"""
    info = {
        "has_npu": False,
        "npu_devices": [],
        "npu_chip": None,
        "npu_driver_ver": None,
        "npu_firmware_ver": None,
        "has_nvidia": False,
        "has_amd": False,
    }

    # 检测昇腾 NPU
    npu_info = run_cmd("npu-smi info 2>/dev/null")
    if npu_info:
        info["has_npu"] = True
        info["npu_raw"] = npu_info

        # 尝试解析芯片型号
        for chip_id in NPU_CHIPS:
            if chip_id in npu_info or NPU_CHIPS[chip_id]["name"] in npu_info:
                info["npu_chip"] = NPU_CHIPS[chip_id]["name"]

        # 尝试提取设备数量
        devices = re.findall(r"\b\d{4}\b", npu_info)
        if devices:
            info["npu_devices"] = list(set(devices))

    # 检测 NPU 驱动版本
    drv_ver = run_cmd("cat /usr/local/Ascend/driver/version.cfg 2>/dev/null || npu-smi -v 2>/dev/null")
    if drv_ver:
        match = re.search(r"(\d+\.\d+\.[A-Z]?\d+[A-Z0-9]*)", drv_ver)
        if match:
            info["npu_driver_ver"] = match.group(1)

    # 检测 NVIDIA GPU
    nvidia_smi = run_cmd("nvidia-smi 2>/dev/null")
    if nvidia_smi:
        info["has_nvidia"] = True
        info["nvidia_raw"] = nvidia_smi.splitlines()[:3]

    # 检测 AMD GPU
    rocm_smi = run_cmd("rocm-smi 2>/dev/null")
    if rocm_smi:
        info["has_amd"] = True

    return info


def detect_python():
    """检测 Python 和包管理工具"""
    info = {
        "version": platform.python_version(),
        "version_tuple": platform.python_version_tuple(),
        "executable": sys.executable,
    }

    # 检测 pip
    pip_ver = run_cmd(f'"{sys.executable}" -m pip --version')
    if pip_ver:
        match = re.search(r"pip (\d+\.\d+(?:\.\d+)?)", pip_ver)
        info["pip_version"] = match.group(1) if match else "unknown"

    # 检测 conda
    conda_ver = run_cmd("conda --version")
    if conda_ver:
        info["has_conda"] = True
        info["conda_version"] = conda_ver.split()[-1]

    # 检测已安装的关键包
    for pkg in ["numpy", "torch", "tensorflow", "onnx", "pyyaml"]:
        try:
            __import__(pkg)
            ver_info = run_cmd(f'"{sys.executable}" -m pip show {pkg}')
            if ver_info:
                for line in ver_info.splitlines():
                    if line.startswith("Version:"):
                        info[f"pkg_{pkg}"] = line.split(":")[1].strip()
                        break
            else:
                info[f"pkg_{pkg}"] = "installed"
        except ImportError:
            info[f"pkg_{pkg}"] = None

    return info


def detect_disk():
    """检测磁盘空间"""
    info = {}
    try:
        total, used, free = shutil.disk_usage(os.path.expanduser("~"))
        info["home_total_gb"] = round(total / (1024 ** 3), 1)
        info["home_used_gb"] = round(used / (1024 ** 3), 1)
        info["home_free_gb"] = round(free / (1024 ** 3), 1)
    except Exception:
        pass

    # /usr/local (CANN 默认安装位置)
    try:
        if os.path.exists("/usr/local"):
            total, used, free = shutil.disk_usage("/usr/local")
            info["usr_local_free_gb"] = round(free / (1024 ** 3), 1)
    except Exception:
        pass

    return info


def detect_kernel():
    """检测内核版本（Linux 相关）"""
    info = {"release": platform.release()}

    if platform.system() == "Linux":
        gcc_ver = run_cmd("gcc --version")
        if gcc_ver:
            match = re.search(r"(\d+\.\d+\.\d+)", gcc_ver)
            info["gcc_version"] = match.group(1) if match else None

        make_ver = run_cmd("make --version")
        if make_ver:
            match = re.search(r"(\d+\.\d+)", make_ver)
            info["make_version"] = match.group(1) if match else None

    return info


# =====================================================================
# 核心：环境匹配与推荐
# =====================================================================
def match_cann_versions(env):
    """根据环境匹配可用的 CANN 版本"""
    results = []

    py_major_minor = ".".join(env["python"]["version_tuple"][:2])
    arch = env["os"]["machine"]
    os_name = env["os"]["name"]

    for ver in CANN_VERSIONS:
        score = 0
        issues = []
        compat = {}

        # Python 版本匹配
        py_match = py_major_minor in ver["python_versions"]
        compat["python"] = py_match
        if py_match:
            score += 30
        else:
            issues.append(f"Python {py_major_minor} 不在支持列表 {ver['python_versions']}")

        # 架构匹配
        arch_match = arch in ver["arch"]
        compat["arch"] = arch_match
        if arch_match:
            score += 20
        else:
            issues.append(f"{arch} 架构不在支持列表 {ver['arch']}")

        # 操作系统匹配（CANN 主要支持 Linux）
        os_match = False
        if env["os"]["system"] == "Linux":
            for supported_os in ver["os"]:
                if any(x in os_name.lower() for x in supported_os.lower().split()[:1]):
                    os_match = True
                    break
        elif env["os"]["system"] == "Darwin":
            # macOS 用于开发，可通过 WSL/Docker 运行 CANN
            issues.append("macOS 不原生支持 CANN，需要通过 Docker 或远程 Linux 环境使用")
            score += 5
        elif env["os"]["system"] == "Windows":
            issues.append("Windows 不原生支持 CANN，需要通过 WSL2 或 Docker 使用")
            score += 5

        compat["os"] = os_match
        if os_match:
            score += 30

        # NPU 检测
        if env["gpu"]["has_npu"]:
            score += 20
            compat["npu"] = True
        else:
            issues.append("未检测到昇腾 NPU 设备，将只能使用 CPU 模式进行开发")
            compat["npu"] = False

        # 内存检查
        mem_gb = env.get("memory", {}).get("total_gb", 0)
        if mem_gb >= 16:
            score += 10
        elif mem_gb >= 8:
            score += 5
            issues.append(f"内存 {mem_gb}GB 偏低，推荐 16GB+")
        else:
            issues.append(f"内存 {mem_gb}GB 严重不足，推荐 16GB+")

        # 磁盘检查
        disk_free = env.get("disk", {}).get("home_free_gb", 0)
        if disk_free >= 20:
            score += 10
        else:
            issues.append(f"可用磁盘空间 {disk_free}GB 不足，安装 CANN 需要约 20GB+")

        results.append({
            "version": ver["version"],
            "release_date": ver["release_date"],
            "score": score,
            "compatibility": compat,
            "issues": issues,
            "notes": ver["notes"],
            "python_supported": ver["python_versions"],
            "os_supported": ver["os"],
        })

    # 按分数排序
    results.sort(key=lambda x: x["score"], reverse=True)
    return results


def generate_install_commands(env, matched_versions):
    """根据环境和匹配结果生成安装命令"""
    if not matched_versions:
        return []

    best = matched_versions[0]
    ver = best["version"]
    os_system = env["os"]["system"]
    has_conda = env["python"].get("has_conda", False)
    py_ver = ".".join(env["python"]["version_tuple"][:2])

    # 确定推荐的 Python 版本（如果当前 Python 不兼容）
    recommended_py = "3.10" if py_ver not in ["3.8", "3.9", "3.10", "3.11", "3.12"] else py_ver

    commands = []

    # 基础环境准备
    if os_system == "Linux":
        distro = env["os"].get("distro_id", "").lower()
        if "ubuntu" in distro or "debian" in distro:
            commands.append({
                "step": 1,
                "title": "安装依赖包",
                "description": "安装 CANN 运行所需的系统依赖",
                "command": (
                    "sudo apt-get update && sudo apt-get install -y \\\n"
                    "    gcc g++ make cmake \\\n"
                    "    zlib1g-dev libsqlite3-dev \\\n"
                    "    python3 python3-pip python3-dev \\\n"
                    "    libopenblas-dev liblapack-dev \\\n"
                    "    pciutils usbutils"
                ),
            })
        elif "centos" in distro or "euler" in distro or "rhel" in distro:
            commands.append({
                "step": 1,
                "title": "安装依赖包",
                "description": "安装 CANN 运行所需的系统依赖",
                "command": (
                    "sudo yum install -y gcc gcc-c++ make cmake \\\n"
                    "    zlib-devel sqlite-devel \\\n"
                    "    python3 python3-pip python3-devel \\\n"
                    "    openblas-devel lapack-devel \\\n"
                    "    pciutils usbutils"
                ),
            })

    # Conda 环境创建（如果有 conda）
    if has_conda and py_ver != recommended_py:
        commands.append({
            "step": 2,
            "title": f"创建 Python {recommended_py} Conda 环境",
            "description": f"当前 Python {py_ver} 可能不完全兼容，推荐使用 {recommended_py}",
            "command": (
                f"conda create -n cann python={recommended_py} -y\n"
                f"conda activate cann"
            ),
        })

    # 升级 pip
    commands.append({
        "step": len(commands) + 1,
        "title": "升级 pip 并安装基础依赖",
        "description": "确保使用最新版本的 pip",
        "command": (
            "python3 -m pip install --upgrade pip setuptools wheel\n"
            "python3 -m pip install numpy pyyaml wheel"
        ),
    })

    # 昇腾 NPU 驱动和固件安装
    if env["gpu"]["has_npu"]:
        commands.append({
            "step": len(commands) + 1,
            "title": "安装 NPU 驱动和固件",
            "description": "检测到昇腾 NPU，需要先安装驱动和固件",
            "command": (
                "# 1. 从官网下载对应的驱动包（以昇腾 910B 为例）\n"
                "# 下载地址: https://www.hiascend.com/software/cann\n"
                "chmod +x Ascend-hdk-910b-npu-driver_*.run\n"
                "sudo ./Ascend-hdk-910b-npu-driver_*.run --full\n"
                "chmod +x Ascend-hdk-910b-npu-firmware_*.run\n"
                "sudo ./Ascend-hdk-910b-npu-firmware_*.run --full\n"
                "\n"
                "# 2. 验证驱动安装\n"
                "npu-smi info"
            ),
        })

    # CANN Toolkit 安装
    commands.append({
        "step": len(commands) + 1,
        "title": f"安装 CANN Toolkit {ver}",
        "description": "CANN 核心组件：包含编译器、运行时、算子库",
        "command": (
            "# 从官网下载对应的 CANN Toolkit 安装包\n"
            f"# 下载地址: https://www.hiascend.com/software/cann/community-{ver}\n"
            "\n"
            "# 方式一：使用官方安装包\n"
            f"chmod +x Ascend-cann-toolkit_{ver}-linux.{env['os']['machine']}.run\n"
            f"./Ascend-cann-toolkit_{ver}-linux.{env['os']['machine']}.run --install\n"
            "\n"
            "# 方式二：使用 pip 安装 Python 包（开发环境）\n"
            "pip3 install --upgrade pip\n"
            f"pip3 install mindspore-cann=={ver}  # MindSpore 集成版\n"
        ),
    })

    # CANN NNAE（神经网络加速引擎）
    commands.append({
        "step": len(commands) + 1,
        "title": f"安装 CANN NNAE {ver}",
        "description": "神经网络加速引擎 - 用于推理和训练加速",
        "command": (
            f"chmod +x Ascend-cann-nnae_{ver}-linux.{env['os']['machine']}.run\n"
            f"./Ascend-cann-nnae_{ver}-linux.{env['os']['machine']}.run --install"
        ),
    })

    # 配置环境变量
    commands.append({
        "step": len(commands) + 1,
        "title": "配置环境变量",
        "description": "将 CANN 相关路径添加到环境变量中",
        "command": (
            "# 方法一：临时生效（当前会话）\n"
            "export ASCEND_HOME=/usr/local/Ascend\n"
            "export ASCEND_TOOLKIT_HOME=${ASCEND_HOME}/ascend-toolkit/latest\n"
            "export PATH=${ASCEND_TOOLKIT_HOME}/bin:${PATH}\n"
            "export LD_LIBRARY_PATH=${ASCEND_TOOLKIT_HOME}/lib64:${LD_LIBRARY_PATH}\n"
            "export PYTHONPATH=${ASCEND_TOOLKIT_HOME}/python/site-packages:${PYTHONPATH}\n"
            "\n"
            "# 方法二：永久生效（添加到 shell 配置文件）\n"
            "echo 'source ${ASCEND_TOOLKIT_HOME}/bin/setenv.sh' >> ~/.bashrc\n"
            "source ~/.bashrc"
        ),
    })

    # 验证安装
    commands.append({
        "step": len(commands) + 1,
        "title": "验证安装",
        "description": "确认 CANN 安装成功",
        "command": (
            "python3 -c \"\n"
            "try:\n"
            "    import te\n"
            "    import topi\n"
            "    print('CANN TE/Topi: OK')\n"
            "except ImportError:\n"
            "    print('CANN Python 包尚未安装或不可用')\n"
            "\"\n"
            "\n"
            "# 检查 NPU 状态（如果有硬件）\n"
            "npu-smi info"
        ),
    })

    # macOS/Windows 的特殊说明
    display_os = "macOS" if os_system == "Darwin" else os_system
    if os_system in ["Darwin", "Windows"]:
        commands.insert(0, {
            "step": 0,
            "title": f"⚠️  {display_os} 环境说明",
            "description": f"{display_os} 不原生支持 CANN，请使用以下方案之一",
            "command": (
                "# ============================================\n"
                f"# 注意：{display_os} 不原生支持 CANN\n"
                "# 推荐方案：\n"
                "# ============================================\n"
                "\n"
                "# 方案一：Docker 容器（推荐开发）\n"
                f"docker pull ascendai/cann:{ver}-ubuntu20.04\n"
                f"docker run -it --rm \\\\\n"
                "  --device=/dev/davinci0 \\\\\n"
                "  -v $HOME:/workspace \\\\\n"
                f"  ascendai/cann:{ver}-ubuntu20.04\n"
                "\n"
                "# 方案二：远程 Linux 开发服务器\n"
                "# 使用 VS Code Remote SSH 连接到 Linux 服务器\n"
                "\n"
                "# 方案三：WSL2（Windows）\n"
                "# 在 WSL2 Ubuntu 中按照 Linux 流程安装\n"
                "\n"
                "# 方案四：使用 MindSpore Cloud / ModelArts\n"
                "# 无需本地安装，直接使用云端昇腾资源\n"
            ),
        })

    return commands


# =====================================================================
# 主程序
# =====================================================================
def main(output_json=False):
    """主入口函数"""
    print("=" * 70)
    print("  🚀 CANN 智能安装助手")
    print("  基于环境检测，推荐最佳 CANN 版本与安装流程")
    print("=" * 70)
    print()

    # ---- 执行环境检测 ----
    print("[1/5] 🔍  正在检测操作系统...")
    os_info = detect_os()
    print(f"       ✓ {os_info.get('version_str', '未知')}")
    print(f"       架构: {os_info.get('machine', '未知')}")
    print()

    print("[2/5] 🔍  正在检测 CPU...")
    cpu_info = detect_cpu()
    print(f"       ✓ {cpu_info.get('brand', cpu_info.get('arch', '未知'))}")
    print(f"       核心数: {cpu_info.get('cores', '未知')} 核")
    print()

    print("[3/5] 🔍  正在检测内存...")
    memory_info = detect_memory()
    print(f"       ✓ 总内存: {memory_info.get('total_gb', '未知')} GB")
    if memory_info.get("free_gb"):
        print(f"       可用: {memory_info.get('free_gb')} GB")
    print()

    print("[4/5] 🔍  正在检测 GPU/NPU...")
    gpu_info = detect_gpu()
    if gpu_info["has_npu"]:
        print(f"       ✓ 检测到昇腾 NPU: {gpu_info.get('npu_chip', '未知型号')}")
        if gpu_info.get("npu_driver_ver"):
            print(f"       驱动版本: {gpu_info['npu_driver_ver']}")
    else:
        print("       ⚠️  未检测到昇腾 NPU 设备")
    if gpu_info["has_nvidia"]:
        print("       检测到 NVIDIA GPU（CANN 主要支持昇腾 NPU）")
    print()

    print("[5/5] 🔍  正在检测 Python 环境...")
    python_info = detect_python()
    print(f"       ✓ Python {python_info['version']}")
    print(f"       pip: {python_info.get('pip_version', '未安装')}")
    if python_info.get("has_conda"):
        print(f"       conda: {python_info.get('conda_version')}")
    print()

    # 磁盘检测
    disk_info = detect_disk()
    kernel_info = detect_kernel()

    # 组装环境信息
    env = {
        "os": os_info,
        "cpu": cpu_info,
        "memory": memory_info,
        "gpu": gpu_info,
        "python": python_info,
        "disk": disk_info,
        "kernel": kernel_info,
    }

    # ---- 匹配 CANN 版本 ----
    print("=" * 70)
    print("  📊  CANN 版本匹配分析")
    print("=" * 70)
    print()

    matched = match_cann_versions(env)

    for i, match in enumerate(matched[:3]):
        indicator = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
        print(f"{indicator} CANN {match['version']} ({match['release_date']})")
        print(f"   匹配度: {match['score']}/100 分")
        print(f"   {match['notes']}")

        # 兼容性详情
        compat_items = []
        for key, ok in match["compatibility"].items():
            icon = "✓" if ok else "✗"
            label_map = {
                "python": "Python 版本",
                "arch": "架构",
                "os": "操作系统",
                "npu": "NPU 硬件",
            }
            compat_items.append(f"{icon} {label_map.get(key, key)}")
        print(f"   兼容性: {'  '.join(compat_items)}")

        if match["issues"] and i == 0:
            print(f"   ⚠️  注意事项:")
            for issue in match["issues"][:3]:
                print(f"     - {issue}")
        print()

    # ---- 生成安装命令 ----
    print("=" * 70)
    print("  📦  推荐安装步骤")
    print("=" * 70)
    print()

    commands = generate_install_commands(env, matched)

    for cmd in commands:
        step_num = cmd["step"]
        title = cmd["title"]
        desc = cmd["description"]

        if step_num == 0:
            # 特殊警告信息
            print(f"{title}")
            print(f"{desc}")
        else:
            print(f"📌 步骤 {step_num}: {title}")
            print(f"   {desc}")
        print("-" * 60)
        print()
        # 缩进命令
        for line in cmd["command"].splitlines():
            print(f"  {line}")
        print()
        print()

    # ---- 总结 ----
    print("=" * 70)
    print("  📝  安装总览")
    print("=" * 70)
    print()
    print(f"   推荐版本: CANN {matched[0]['version']}")
    print(f"   操作系统: {os_info.get('version_str')}")
    print(f"   CPU: {cpu_info.get('brand', cpu_info.get('arch'))}")
    print(f"   内存: {memory_info.get('total_gb', '未知')} GB")
    print(f"   Python: {python_info['version']}")
    if gpu_info["has_npu"]:
        print(f"   NPU: {gpu_info.get('npu_chip', '昇腾 NPU')}")
    else:
        print("   NPU: 未检测到（仅 CPU 模式）")
    print()

    print("📚 参考文档:")
    print("   - 官网: https://www.hiascend.com/software/cann")
    print(f"   - CANN {matched[0]['version']} 安装指南: https://www.hiascend.com/document/detail/zh/CANN/80RC1/developmenttoolenv/01development/01development_0001.html")
    print("   - MindSpore: https://www.mindspore.cn/")
    print()

    # JSON 输出模式
    if output_json:
        report = {
            "env": env,
            "matched_versions": matched,
            "commands": commands,
        }
        return json.dumps(report, indent=2, ensure_ascii=False)

    return None


if __name__ == "__main__":
    output_json_mode = "--json" in sys.argv
    result = main(output_json=output_json_mode)
    if result:
        print(result)
