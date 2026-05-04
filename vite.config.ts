import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change 'chef-calculator' below if you name your GitHub repo differently
export default defineConfig({
  plugins: [react()],
  base: '/chef-calculator/',
})
