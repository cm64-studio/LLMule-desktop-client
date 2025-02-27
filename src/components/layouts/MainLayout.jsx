import React, { useState, useEffect, Fragment } from 'react'
import ReactDOM from 'react-dom'
import { useNetwork } from '../../contexts/NetworkContext'
import { useUI } from '../../contexts/NetworkContext'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { ArrowRightStartOnRectangleIcon, Bars3Icon } from '@heroicons/react/24/outline'

// Component to render dropdown via portal
const DropdownPortal = ({ children, isOpen }) => {
  const [portalNode, setPortalNode] = useState(null)
  
  useEffect(() => {
    // Create portal container if it doesn't exist
    let node = document.getElementById('dropdown-portal-container')
    if (!node) {
      node = document.createElement('div')
      node.id = 'dropdown-portal-container'
      node.style.position = 'fixed'
      node.style.top = '0'
      node.style.left = '0'
      node.style.width = '100%'
      node.style.height = '100%'
      node.style.zIndex = '10000'
      node.style.pointerEvents = 'none'
      document.body.appendChild(node)
    }
    
    setPortalNode(node)
    
    // Cleanup
    return () => {
      if (node && node.childNodes.length === 0) {
        document.body.removeChild(node)
      }
    }
  }, [])
  
  if (!portalNode || !isOpen) return null
  
  // Render children into portal
  return ReactDOM.createPortal(
    <div style={{ pointerEvents: 'auto' }}>
      {children}
    </div>,
    portalNode
  )
}

export default function MainLayout({ children }) {
  const { isConnected, tokenStats } = useNetwork()
  const { isSidebarOpen, toggleSidebar } = useUI()
  const [userEmail, setUserEmail] = useState('')
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0 })
  const menuButtonRef = React.useRef(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Update button position for the dropdown
  const updateButtonPosition = () => {
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect()
      setButtonPosition({
        top: rect.bottom,
        right: window.innerWidth - rect.right,
        width: rect.width
      })
    }
  }

  // Update position when menu opens or window resizes
  useEffect(() => {
    updateButtonPosition()
    
    const handleResize = () => {
      updateButtonPosition()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [userEmail, isMenuOpen])

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const status = await window.electron.auth.getStatus()
        if (status.authenticated && status.user) {
          setUserEmail(status.user.email)
        }
      } catch (error) {
        console.error('Failed to get user info:', error)
      }
    }
    getUserInfo()
  }, [])

  const handleLogout = async () => {
    await window.electron.store.set('apiKey', null)
    window.location.reload()
  }

  return (
    <div className="p-3 flex items-center border-b border-gray-700 bg-gray-800/70">
      <div className="flex-1 flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          <Bars3Icon className="w-5 h-5 text-gray-400" />
        </button>
        <h1 className="text-xl font-semibold">LLMule</h1>
      </div>

      <div className="flex items-center gap-3">
        <Menu as="div" className="relative inline-block text-left">
          {({ open }) => {
            // Track menu open state
            useEffect(() => {
              setIsMenuOpen(open)
            }, [open])
            
            return (
              <>
                <Menu.Button 
                  ref={menuButtonRef}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
                >
                  <span className="text-gray-300 text-sm">{userEmail}</span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                </Menu.Button>
                
                <DropdownPortal isOpen={open}>
                  <div 
                    className="absolute rounded-lg bg-gray-800 shadow-2xl ring-1 ring-white/10 focus:outline-none w-48"
                    style={{ 
                      top: `${buttonPosition.top + 8}px`, 
                      right: `${buttonPosition.right}px`
                    }}
                  >
                    <Transition
                      show={open}
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items static>
                        <div className="px-1 py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={handleLogout}
                                className={`${
                                  active ? 'bg-gray-700' : ''
                                } group flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-300 rounded-lg transition-all duration-200 hover:bg-gray-700`}
                              >
                                <ArrowRightStartOnRectangleIcon className="h-5 w-5 text-gray-400" />
                                Logout
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Transition>
                  </div>
                </DropdownPortal>
              </>
            )
          }}
        </Menu>

        <div className="flex justify-end">
          {children}
        </div>
      </div>
    </div>
  )
}