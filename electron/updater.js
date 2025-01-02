import { autoUpdater } from 'electron-updater'
import { dialog } from 'electron'

export function setupAutoUpdater(window) {
  autoUpdater.autoDownload = false
  
  autoUpdater.on('error', (error) => {
    dialog.showErrorBox('Error', error.message)
  })

  autoUpdater.on('update-available', async () => {
    const response = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version of LLMule Desktop is available. Would you like to download it now?',
      buttons: ['Yes', 'No']
    })

    if (response.response === 0) {
      autoUpdater.downloadUpdate()
    }
  })

  autoUpdater.on('update-downloaded', async () => {
    const response = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Install the update now?',
      buttons: ['Yes', 'Later']
    })

    if (response.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  // Check for updates
  autoUpdater.checkForUpdates()
}