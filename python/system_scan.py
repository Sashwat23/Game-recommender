import psutil
import platform
import json
import os
import subprocess
import sys


def run_cmd(cmd, shell=False):
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, shell=shell, text=True)
        return out.strip()
    except Exception:
        return None

def get_cpu_name_windows():
    out = run_cmd(['wmic', 'cpu', 'get', 'Name'], shell=False)
    if out:
        lines = [l.strip() for l in out.splitlines() if l.strip()]
        if len(lines) >= 2:
            return lines[1]
    return platform.processor() or "Unknown CPU"

def get_gpu_info():
    # 1️⃣ Try GPUtil (best for NVIDIA cards)
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        for g in gpus:
            if "NVIDIA" in g.name.upper():
                mem_mb = getattr(g, "memoryTotal", None) or getattr(g, "memoryTotalMB", None)
                mem_bytes = int(mem_mb) * 1024 * 1024 if mem_mb else None
                return {"name": g.name, "memoryBytes": mem_bytes}
    except Exception as e:
        pass

    # 2️⃣ Try PowerShell (Windows only)
    if platform.system().lower().startswith("win"):
        ps_cmd = (
            'Get-CimInstance Win32_VideoController | '
            'Select-Object Name,AdapterRAM | ConvertTo-Json'
        )
        out = run_cmd(['powershell', '-NoProfile', '-NonInteractive', '-Command', ps_cmd], shell=False)
        if out:
            try:
                parsed = json.loads(out)
                if isinstance(parsed, dict):
                    parsed = [parsed]

                # Find all GPUs that have "NVIDIA" in their name
                nvidia_gpus = [obj for obj in parsed if "NVIDIA" in obj.get("Name", "").upper()]
                if nvidia_gpus:
                    # Pick the first NVIDIA GPU
                    obj = nvidia_gpus[0]
                    name = obj.get("Name", "NVIDIA GPU")
                    adapter = obj.get("AdapterRAM")
                    mem_bytes = int(adapter) if adapter else None
                    return {"name": name, "memoryBytes": mem_bytes}

            except Exception as e:
                pass

    # 3️⃣ Final fallback (nothing NVIDIA found)
    return {"name": "NVIDIA GPU not detected", "memoryBytes": None}


def get_gpu_info_powershell():
    # Use PowerShell to query Win32_VideoController and output JSON — more reliable for parsing
    ps_cmd = 'Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Json'
    # call powershell explicitly
    out = run_cmd(['powershell', '-NoProfile', '-NonInteractive', '-Command', ps_cmd], shell=False)
    if not out:
        return None
    try:
        parsed = json.loads(out)
        # If multiple GPUs, parsed may be list; normalize
        if isinstance(parsed, list):
            obj = parsed[0]
        else:
            obj = parsed
        name = obj.get('Name') if obj.get('Name') else None
        adapter = obj.get('AdapterRAM')
        # adapter may be None or integer
        return {"name": name or "Unknown GPU", "memoryBytes": int(adapter) if adapter else None}
    except Exception:
        # fallback: sometimes PS returns text not JSON
        return None


    # final fallback: unknown
    return {"name": "No GPU detected", "memoryBytes": None}

def get_cpu_info():
    if platform.system().lower().startswith('win'):
        return get_cpu_name_windows()
    # linux/mac fallback
    try:
        if sys.platform.startswith('linux'):
            with open('/proc/cpuinfo', 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    if 'model name' in line:
                        return line.split(':', 1)[1].strip()
    except Exception:
        pass
    return platform.processor() or "Unknown CPU"

def get_ram_gb():
    return round(psutil.virtual_memory().total / (1024 ** 3), 2)

def get_storage_info():
    drives = []
    seen = set()
    for part in psutil.disk_partitions(all=False):
        mount = part.mountpoint
        if mount in seen:
            continue
        seen.add(mount)
        try:
            usage = psutil.disk_usage(mount)
            drives.append({
                "mount": mount,
                "total_gb": round(usage.total / (1024 ** 3), 2),
                "used_gb": round(usage.used / (1024 ** 3), 2),
                "free_gb": round(usage.free / (1024 ** 3), 2),
                "percent": round(usage.percent, 1)
            })
        except Exception:
            continue
    # ensure common windows letters
    for letter in ["C:\\", "D:\\", "E:\\"]:
        if letter not in [d["mount"] for d in drives] and os.path.exists(letter):
            try:
                usage = psutil.disk_usage(letter)
                drives.append({
                    "mount": letter,
                    "total_gb": round(usage.total / (1024 ** 3), 2),
                    "used_gb": round(usage.used / (1024 ** 3), 2),
                    "free_gb": round(usage.free / (1024 ** 3), 2),
                    "percent": round(usage.percent, 1)
                })
            except Exception:
                pass

    drives.sort(key=lambda x: x["mount"])
    return drives

def get_system_info():
    info = {}
    info["OS"] = platform.system() + " " + platform.release()
    info["Processor"] = get_cpu_info()
    info["Installed_RAM_GB"] = get_ram_gb()
    info["Drives"] = get_storage_info()
    info["GPU"] = get_gpu_info()
    return info


if __name__ == "__main__":
    print(json.dumps(get_system_info()))
