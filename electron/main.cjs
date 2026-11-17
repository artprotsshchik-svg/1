const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const STATE_FILE = () => path.join(app.getPath('userData'), 'workbench-state.json');

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Верстак сборок',
    backgroundColor: '#0B0A0F',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  void win.loadFile(indexPath);
}

ipcMain.handle('desktop:get-meta', () => ({
  appVersion: app.getVersion(),
  hotManifest: null,
}));

ipcMain.handle('desktop:scan-mods', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Выберите папку mods',
    properties: ['openDirectory'],
  });

  if (result.canceled || !result.filePaths.length) {
    return {
      canceled: true,
      folderPath: '',
      jarFiles: [],
      hasConnectorFolder: false,
      hasEmbeddiumSodiumAlias: false,
    };
  }

  const folderPath = result.filePaths[0];
  let entries = [];
  try {
    entries = fs.readdirSync(folderPath, { withFileTypes: true });
  } catch {
    entries = [];
  }

  const jarFiles = entries
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.jar'))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const hasConnectorFolder = entries.some(
    entry => entry.isDirectory() && entry.name.toLowerCase().includes('connector')
  );

  const hasEmbeddiumSodiumAlias = jarFiles.some(name => {
    const low = name.toLowerCase();
    return low.includes('embeddium') || low.includes('sodium');
  });

  return {
    canceled: false,
    folderPath,
    jarFiles,
    hasConnectorFolder,
    hasEmbeddiumSodiumAlias,
  };
});

ipcMain.handle('desktop:load-state', () => {
  try {
    const filePath = STATE_FILE();
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
});

ipcMain.handle('desktop:save-state', (_event, state) => {
  try {
    const filePath = STATE_FILE();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
