// main.js — Electron main process (single-window launcher + Python IPC)
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let homeURL = ''; // We'll store launcher home file path here

// -------- Create the main app window --------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,       // Allow require() in renderer
      contextIsolation: false      // Easier for prototype
    }
  });

  homeURL = path.join(__dirname, 'index.html');
  mainWindow.loadFile(homeURL);

  // Optional: open DevTools during development
  // mainWindow.webContents.openDevTools();

  // Handle when a launcher (Steam/Epic/GOG) link is requested
  ipcMain.on('open-launcher', (event, launcher) => {
    let url = '';

    if (launcher === 'steam') url = 'https://store.steampowered.com/';
    else if (launcher === 'epic') url = 'https://store.epicgames.com/en-US/';
    else if (launcher === 'gog') url = 'https://www.gog.com/en/';

    if (url) {
      mainWindow.loadURL(url);  // Open inside same Electron window
      addBackToHomeButton();   // Add “Back to Launcher” menu
    }
  });
}

// -------- Helper: Add Back Button to Menu --------
function addBackToHomeButton() {
  const template = [
    {
      label: 'Navigation',
      submenu: [
        {
          label: '⬅ Back to Launcher',
          click: () => {
            mainWindow.loadFile(homeURL);
          }
        },
        { role: 'reload' },
        { role: 'quit' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// -------- App ready event --------
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// -------- Quit when all windows are closed --------
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// -------- IPC: Run Python System Scanner --------
ipcMain.handle('get-system-info', async () => {
  return new Promise((resolve, reject) => {
    const pyCmd = 'python'; // Or full path to Python if needed
    const scriptPath = path.join(__dirname, 'python', 'system_scan.py');
    const pyProcess = spawn(pyCmd, [scriptPath]);

    let output = '';
    let errOutput = '';

    pyProcess.stdout.on('data', (data) => { output += data.toString(); });
    pyProcess.stderr.on('data', (data) => { errOutput += data.toString(); });

    pyProcess.on('close', (code) => {
      if (errOutput) return reject(new Error(errOutput));
      try {
        const obj = JSON.parse(output);
        resolve(obj);
      } catch (e) {
        reject(new Error('Failed to parse JSON: ' + e.message + '\n' + output));
      }
    });

    pyProcess.on('error', (err) => reject(err));
  });
});
