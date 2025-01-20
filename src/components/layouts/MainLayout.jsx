import React, { useState, useEffect, Fragment } from 'react'
import { useNetwork } from '../../contexts/NetworkContext'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid'

export default function MainLayout({ children }) {
  const { isConnected, tokenStats } = useNetwork()
  const [userEmail, setUserEmail] = useState('')

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
    <div className="p-4 flex items-center">
      <div className="flex-1 flex items-center gap-4">
        <h1 className="text-xl font-mono">⚡ LLMule</h1>
        
        {/* <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-400 text-sm">
            {isConnected ? 'Connected to Network' : 'Disconnected'}
          </span>
        </div> */}
      </div>

      <div className="flex items-center gap-4">
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
            <span className="text-gray-300 text-sm">{userEmail}</span>
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          </Menu.Button>
          
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleLogout}
                    className={`${
                      active ? 'bg-gray-700' : ''
                    } group flex w-full items-center px-4 py-2 text-sm text-gray-300`}
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Logout
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>

        <div className="flex justify-end">
          {children}
        </div>
      </div>
    </div>
  )
}