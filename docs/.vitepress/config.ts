import { createRequire } from 'node:module';
import { defineConfig } from 'vitepress';

const require = createRequire(import.meta.url);
const typedocSidebar = require('../api/typedoc-sidebar.json');

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: '.',
  base: '/node-av/',
  title: 'NodeAV',
  description: 'FFmpeg bindings for Node.js',
  lastUpdated: true,
  themeConfig: {
    logo: '/logo.png',

    sidebar: [
      {
        text: 'Low Level API',
        items: typedocSidebar[3].items,
      },
      {
        text: 'High Level API',
        items: typedocSidebar[0].items,
      },
      {
        text: 'Constants',
        items: typedocSidebar[1].items,
      },
      {
        text: 'FFmpeg',
        items: typedocSidebar[2].items,
      },
      {
        text: 'WebRTC',
        items: typedocSidebar[4].items,
      },
    ],

    search: {
      provider: 'local',
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/seydx/node-av' }],
  },
});
