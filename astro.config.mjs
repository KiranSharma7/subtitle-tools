import { defineConfig } from 'astro/config';
import { site } from './src/site.ts';

export default defineConfig({ site: site.url });
