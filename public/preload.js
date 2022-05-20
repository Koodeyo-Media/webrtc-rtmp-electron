const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ipcRenderer", {
  send(event, message) {
    ipcRenderer.send(event, message);
  },
  on(event, callback) {
    ipcRenderer.on(event, callback);
  },
  removeListener(event) {
    ipcRenderer.removeAllListeners(event);
  },
});
