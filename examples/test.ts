import { DeviceAPI } from '../src/index.js';

console.log('Listing available devices...');

const devices = await DeviceAPI.list();

console.log('Available devices:', devices);
