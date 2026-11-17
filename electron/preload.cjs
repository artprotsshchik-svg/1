const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  getAppMeta: () => ipcRenderer.invoke('desktop:get-meta'),
  checkHotDbUpdate: async () => ({ status: 'up-to-date' }),
  checkAppUpdate: async () => ({
    ok: false,
    message: 'Проверяйте новые версии в разделе Releases на GitHub',
  }),
  installAppUpdate: async () => {},
  scanModsFolder: () => ipcRenderer.invoke('desktop:scan-mods'),
  loadAppState: () => ipcRenderer.invoke('desktop:load-state'),
  saveAppState: state => ipcRenderer.invoke('desktop:save-state', state),
  onAppUpdateStatus: () => () => {},
});
