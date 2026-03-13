/**
 * FFmpeg Web Worker - Process media conversions in background thread
 * Prevents UI blocking during heavy processing
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;
let isLoaded = false;

// Initialize FFmpeg
async function initFFmpeg() {
  if (isLoaded) return;
  
  try {
    ffmpeg = new FFmpeg();
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    isLoaded = true;
    self.postMessage({ type: 'loaded', success: true });
  } catch (error) {
    self.postMessage({ type: 'error', message: `Failed to load FFmpeg: ${error.message}` });
  }
}

// Process conversion
async function convert(fileData, inputName, outputFormat) {
  try {
    if (!isLoaded) {
      await initFFmpeg();
    }

    // Write input file to FFmpeg virtual filesystem
    await ffmpeg.writeFile(inputName, new Uint8Array(fileData));

    const outputName = `output.${outputFormat}`;
    
    // Set up progress callback
    ffmpeg.on('progress', ({ progress, time }) => {
      self.postMessage({
        type: 'progress',
        progress: Math.round(progress * 100),
        time: time
      });
    });

    // Execute FFmpeg conversion
    await ffmpeg.exec(['-i', inputName, outputName]);

    // Read output file
    const data = await ffmpeg.readFile(outputName);

    // Clean up
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    // Send result back to main thread
    self.postMessage({
      type: 'complete',
      data: data.buffer
    }, [data.buffer]); // Transfer ownership for better performance

  } catch (error) {
    self.postMessage({
      type: 'error',
      message: `Conversion failed: ${error.message}`
    });
  }
}

// Listen for messages from main thread
self.onmessage = async (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'init':
      await initFFmpeg();
      break;
    case 'convert':
      await convert(payload.fileData, payload.inputName, payload.outputFormat);
      break;
    case 'terminate':
      self.close();
      break;
    default:
      self.postMessage({ type: 'error', message: 'Unknown command' });
  }
};
