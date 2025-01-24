// electron/services/models.js
export const FEATURED_MODELS = [
    {
      id: 'phi-3',
      name: 'Phi-3 (3.8B)',
      description: 'Fast and efficient model for everyday tasks',
      size: '4.06 GB',
      rating: '⭐️⭐️⭐️⭐️',
      type: 'small',
      downloadUrl: 'https://huggingface.co/brittlewis12/Phi-3-mini-4k-instruct-GGUF/blob/main/phi-3-mini-4k-instruct.Q8_0.gguf'
    },
    {
      id: 'mistral-7b',
      name: 'Mistral 7B',
      description: 'Excellent performance/size balance',
      size: '7.2 GB',
      rating: '⭐️⭐️⭐️⭐️⭐️',
      type: 'medium',
      downloadUrl: 'https://huggingface.co/TheBloke/CapybaraHermes-2.5-Mistral-7B-GGUF/blob/main/capybarahermes-2.5-mistral-7b.Q8_0.gguf'
    },
    {
      id: 'phi-4',
      name: 'Phi-4',
      description: 'Latest Microsoft model with enhanced capabilities',
      size: '15.6 GB',
      rating: '⭐️⭐️⭐️⭐️⭐️',
      type: 'large',
      downloadUrl: 'https://huggingface.co/unsloth/phi-4-GGUF/blob/main/phi-4-Q8_0.gguf'
    }
];