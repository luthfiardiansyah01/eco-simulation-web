import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ecosimulation.app',
  appName: 'EcoSim',
  webDir: 'out',
  server: {
    // Replace with your Vercel deployment URL after deploying
    url: 'https://eco-simulation-feq8d3c75-luthfiardiansyah01s-projects.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
