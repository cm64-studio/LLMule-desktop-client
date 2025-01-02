import { Tray, Menu, app } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class SystemTray {
  constructor(window) {
    this.window = window
    this.tray = null
  }

  create() {
    this.tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'))
    this.tray.setToolTip('LLMule Desktop')
    this.updateMenu()
  }

  updateMenu(isConnected = false) {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'LLMule Desktop', enabled: false },
      { type: 'separator' },
      {
        label: isConnected ? 'Stop Sharing' : 'Start Sharing',
        click: () => {
          this.window.webContents.send('tray:toggle-sharing')
        }
      },
      { type: 'separator' },
      {
        label: 'Show Window',
        click: () => {
          this.window.show()
        }
      },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy()
    }
  }
}