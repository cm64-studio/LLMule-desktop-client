import { ipcMain, app } from 'electron'

export function setupAppHandlers() {
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })
} 