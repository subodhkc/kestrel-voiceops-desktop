/**
 * Nextron Configuration
 * 
 * Configuration for the Electron + Next.js desktop application.
 * Defines the main process entry point and renderer process configuration.
 */

module.exports = {
  main: {
    name: 'Kestrel VoiceOps Desktop',
    icon: 'resources/icon',
    entry: 'main/index.js',
  },
  renderer: {
    name: 'renderer',
    dir: 'renderer',
    buildConfig: {
      distDir: '../dist',
    },
  },
};
