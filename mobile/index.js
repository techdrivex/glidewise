import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as tf from '@tensorflow/tfjs';

// Initialize TensorFlow
async function initTensorFlow() {
  try {
    await tf.ready();
    console.log('TensorFlow.js initialized successfully');
  } catch (error) {
    console.error('Failed to initialize TensorFlow.js:', error);
  }
}

// Initialize app
initTensorFlow();

AppRegistry.registerComponent(appName, () => App);
