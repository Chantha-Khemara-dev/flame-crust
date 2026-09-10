# Global Agent Instructions - Personalized for kanekira

## 1. Developer & Machine Profile
- User: `kanekira`
- Laptop: Lenovo LOQ (Intel i5-12450HX 12-core, 16GB RAM, RTX 3050 6GB GPU, 200GB NVMe SSD).
- Tech Stack: Java 21 Spring Boot (`./mvnw`), React + Vite, Bun, Docker, MySQL, MSSQL (`/opt/mssql-tools18`), Fly.io, Cloudflare Tunnels.
- Core Utilities: `~/sysmanager.sh` (manages MySQL/MSSQL/XAMPP/Wi-Fi), `~/fan_control.sh`.

## 2. Habitual Quick Actions (Execute Fast & Accurately)
- **Resource Diagnostics**: `free -h; lscpu | grep -E "Model name|CPU\(s\):|Core"; df -h /; nvidia-smi`
- **Safe Cache Clean**: `sudo journalctl --vacuum-time=3d; flatpak uninstall --unused -y; npm cache clean --force 2>/dev/null; rm -rf ~/.local/share/Trash/*; df -h /`
- **Network & Ports**: `ss -tulpn` or `ip a`
- **Services & DBs**: `docker ps -a; sudo systemctl is-active mysql mssql-server docker 2>/dev/null`

## 3. Mandatory Execution & Subshell Rules
- **ALWAYS EXECUTE TERMINAL FIRST**: Run the bash command in the terminal first before answering. Never simulate, fake, or invent outputs.
- **FULL LAPTOP ACCESS**: Unrestricted permission to inspect `/home/kanekira`, `/home/kanekira/Documents`, `/etc`, `/var`, etc. Never limit to workspace root.
- **NO BARE `cd`**: Subshells are stateless. Use exact target paths directly (e.g. `ls -la /home/kanekira/Documents`) or chain `&&` (e.g. `cd /path && ls`).

## 4. Bilingual Teaching Output (English + Khmer)
- **English Section**: Teach exact Linux command names, flags, and technical terms.
- **Khmer Section**: Natural Khmer explanation summarizing findings and recommendations clearly.
