const { ipcRenderer } = require('electron');

function createCard(title, bodyHtml) {
  const c = document.createElement('div');
  c.className = 'card';
  c.innerHTML = `<h3>${title}</h3>${bodyHtml}`;
  return c;
}

function showGetGamesButton() {
  const btn = document.getElementById('getGamesBtn');
  if (!btn) return;
  btn.style.display = 'block';
  btn.onclick = () => {
    // navigate to games page inside the app
    window.location.href = 'games.html';
  };
}

function hideGetGamesButton() {
  const btn = document.getElementById('getGamesBtn');
  if (!btn) return;
  btn.style.display = 'none';
}

function renderSystem(data) {
  const cards = document.getElementById('cards');
  cards.innerHTML = '';

  // CPU card
  const cpuHtml = `<pre>${data.Processor || 'Unknown'}</pre><div class="muted">Processor</div>`;
  cards.appendChild(createCard('Processor', cpuHtml));

  // RAM card
  const ramHtml = `<pre>${data.Installed_RAM_GB} GB</pre><div class="muted">Installed RAM</div>`;
  cards.appendChild(createCard('Installed RAM', ramHtml));

  // GPU card — now shows VRAM (e.g. 2 GB)
  const gpu = data.GPU || {};
  const gpuName = gpu.name || 'No GPU detected';
  let gpuMemText = '';

  // Prefer explicit memoryBytes if present
  if (gpu.memoryBytes && !isNaN(gpu.memoryBytes)) {
    const gb = gpu.memoryBytes / (1024 ** 3);
    gpuMemText = ` • ${gb >= 1 ? gb.toFixed(2) : (gpu.memoryBytes / (1024 ** 2)).toFixed(0)} ${gb >= 1 ? 'GB' : 'MB'}`;
  } 
  // Otherwise check for alternative field (e.g. from systeminformation.gpu())
  else if (gpu.vram && !isNaN(gpu.vram)) {
    // Sometimes systeminformation returns vram in MB
    const gb = gpu.vram / 1024;
    gpuMemText = gpu.vram > 1024
      ? ` • ${gb.toFixed(2)} GB`
      : ` • ${gpu.vram.toFixed(0)} MB`;
  } 
  // Fallback to “unknown”
  else {
    gpuMemText = ' • Memory info unavailable';
  }

  const gpuHtml = `<pre>${gpuName}${gpuMemText}</pre><div class="muted">Graphics Card</div>`;
  cards.appendChild(createCard('Graphics Card', gpuHtml));

  // OS card
  const osHtml = `<pre>${data.OS}</pre><div class="muted">Operating System</div>`;
  cards.appendChild(createCard('OS', osHtml));

  // Render drives
  const driveList = document.getElementById('drive-list');
  driveList.innerHTML = '';
  if (Array.isArray(data.Drives) && data.Drives.length) {
    data.Drives.forEach(d => {
      const row = document.createElement('div');
      row.className = 'drive-row';

      const name = document.createElement('div');
      name.innerHTML = `<div class="drive-name">${d.mount}</div>`;

      const stats = document.createElement('div');
      stats.style.display = 'flex';
      stats.style.alignItems = 'center';

      const statText = document.createElement('div');
      statText.className = 'drive-stats';
      statText.innerText = `${d.used_gb} GB used of ${d.total_gb} GB • ${d.percent}%`;

      const prog = document.createElement('div');
      prog.className = 'progress';
      const bar = document.createElement('i');
      bar.style.width = Math.min(100, d.percent) + '%';
      prog.appendChild(bar);

      stats.appendChild(statText);
      stats.appendChild(prog);

      row.appendChild(name);
      row.appendChild(stats);
      driveList.appendChild(row);
    });
  } else {
    driveList.innerHTML = '<div style="color:#9fb3c9">No drives found</div>';
  }
}

async function scanPC() {
  const btn = document.getElementById('scan-btn');
  btn.disabled = true;
  btn.innerText = 'Scanning...';
  try {
    const data = await ipcRenderer.invoke('get-system-info');
    renderSystem(data);
  } catch (err) {
    console.error(err);
    alert('Error scanning system: ' + (err.message || err));
  } finally {
    btn.disabled = false;
    btn.innerText = 'Scan PC';
  }
}

async function scanPC() {
  const btn = document.getElementById('scan-btn');
  btn.disabled = true;
  btn.innerText = 'Scanning...';
  hideGetGamesButton(); // hide while scanning
  try {
    const data = await ipcRenderer.invoke('get-system-info');
    renderSystem(data);       // your function that updates UI
    showGetGamesButton();     // <-- show the Get Games button after a successful scan
  } catch (err) {
    console.error(err);
    alert('Error scanning system: ' + (err.message || err));
    hideGetGamesButton();
  } finally {
    btn.disabled = false;
    btn.innerText = 'Scan PC';
  }
}

document.getElementById('scan-btn').addEventListener('click', scanPC);

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(scanPC, 300);
});
