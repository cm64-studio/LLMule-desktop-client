// src/components/model-setup/ModelSetup.jsx
import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast } from 'react-hot-toast';
import ModelCard from './ModelCard';
import { useNetwork } from '../../contexts/NetworkContext';

const FEATURED_MODELS = [
  {
    id: 'phi-3',
    name: 'Phi-3 (3.8B)',
    description: 'Fast and efficient model for everyday tasks',
    size: '3.8 GB',
    rating: '⭐️⭐️⭐️⭐️',
    type: 'small'
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    description: 'Excellent performance/size balance',
    size: '7.2 GB',
    rating: '⭐️⭐️⭐️⭐️⭐️',
    type: 'medium'
  },
  {
    id: 'phi-4',
    name: 'Phi-4',
    description: 'Latest Microsoft model with enhanced capabilities',
    size: '16.2 GB',
    rating: '⭐️⭐️⭐️⭐️⭐️',
    type: 'large'
  }
];

export default function ModelSetup({ isOpen, onClose }) {
  const { 
    downloadModel, 
    downloadModelStatus, 
    connect,
    refreshModels 
  } = useNetwork();

  const handleModelSelect = async (model) => {
    console.log('Selected model for download:', model.id);
    try {
      const success = await downloadModel(model.id);
      console.log('Download result:', success);

      if (success) {
        try {
          await refreshModels();
          
          const { localModels } = useNetwork();
          console.log('Local models after download:', localModels);
          
          if (!localModels.some(m => m.name === model.id)) {
            throw new Error('Model not found after download');
          }
          
          onClose();
          connect();
        } catch (verifyError) {
          console.error('Model verification failed:', verifyError);
          toast.error('Download completed but model not found');
        }
      }
    } catch (error) {
      console.error('Model download failed:', error);
      toast.error(error.message || 'Failed to download model');
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-gray-900 p-6 shadow-xl transition-all">
                <div className="text-center mb-8">
                  <Dialog.Title className="text-2xl font-bold text-white">
                    Get Started with LLMule
                  </Dialog.Title>
                  <p className="text-gray-400 mt-2">
                    Choose a model to download and start sharing with the network
                  </p>
                </div>

                <div className="space-y-4">
                  {FEATURED_MODELS.map(model => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isSelected={downloadModelStatus?.modelId === model.id}
                      status={downloadModelStatus?.status}
                      progress={downloadModelStatus?.progress}
                      error={downloadModelStatus?.error}
                      onSelect={handleModelSelect}
                    />
                  ))}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}