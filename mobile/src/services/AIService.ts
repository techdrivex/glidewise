import * as tf from '@tensorflow/tfjs';
import { OBDData, CoachingTip } from '../context/AppContext';

class AIService {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      // Load the pre-trained model
      await this.loadModel();
      this.isInitialized = true;
      console.log('AI Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Service:', error);
      // Continue without AI features
    }
  }

  private async loadModel(): Promise<void> {
    try {
      // In a real app, you'd load a pre-trained model
      // For now, we'll create a simple model for demonstration
      this.model = this.createSimpleModel();
      
      // Compile the model
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['accuracy'],
      });
      
      console.log('AI model loaded successfully');
    } catch (error) {
      console.error('Failed to load AI model:', error);
      throw error;
    }
  }

  private createSimpleModel(): tf.LayersModel {
    const model = tf.sequential();
    
    // Input layer - 8 features from OBD data
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu',
      inputShape: [8],
    }));
    
    // Hidden layers
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu',
    }));
    
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu',
    }));
    
    // Output layer - eco score (0-100)
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
    }));
    
    return model;
  }

  async analyzeDrivingBehavior(obdData: OBDData): Promise<{
    ecoScore: number;
    coachingTips: CoachingTip[];
  }> {
    if (!this.isInitialized || !this.model) {
      return {
        ecoScore: 75, // Default score
        coachingTips: [],
      };
    }

    try {
      // Prepare input data
      const inputData = this.prepareInputData(obdData);
      const inputTensor = tf.tensor2d([inputData], [1, 8]);
      
      // Make prediction
      const prediction = this.model.predict(inputTensor) as tf.Tensor;
      const ecoScore = Math.round((await prediction.data())[0] * 100);
      
      // Generate coaching tips based on the data
      const coachingTips = this.generateCoachingTips(obdData, ecoScore);
      
      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();
      
      return {
        ecoScore,
        coachingTips,
      };
    } catch (error) {
      console.error('Failed to analyze driving behavior:', error);
      return {
        ecoScore: 75,
        coachingTips: [],
      };
    }
  }

  private prepareInputData(obdData: OBDData): number[] {
    // Normalize OBD data for the AI model
    return [
      obdData.engineRPM / 8000, // Normalize RPM (0-8000)
      obdData.vehicleSpeed / 200, // Normalize speed (0-200 km/h)
      obdData.engineLoad / 100, // Already 0-100%
      obdData.throttlePosition / 100, // Already 0-100%
      obdData.fuelLevel / 100, // Already 0-100%
      (obdData.engineTemp + 40) / 150, // Normalize temp (-40 to 110°C)
      obdData.batteryVoltage / 15, // Normalize voltage (0-15V)
      obdData.fuelConsumption / 20, // Normalize consumption (0-20 L/100km)
    ];
  }

  private generateCoachingTips(obdData: OBDData, ecoScore: number): CoachingTip[] {
    const tips: CoachingTip[] = [];
    const timestamp = new Date();

    // Analyze acceleration patterns
    if (obdData.throttlePosition > 80) {
      tips.push({
        id: `tip_${timestamp.getTime()}_1`,
        type: 'acceleration',
        message: 'Gentle acceleration can improve fuel efficiency by up to 20%',
        priority: 'high',
        timestamp,
        isRead: false,
      });
    }

    // Analyze engine load
    if (obdData.engineLoad > 90) {
      tips.push({
        id: `tip_${timestamp.getTime()}_2`,
        type: 'general',
        message: 'High engine load detected. Consider shifting to a higher gear',
        priority: 'medium',
        timestamp,
        isRead: false,
      });
    }

    // Analyze RPM
    if (obdData.engineRPM > 3000) {
      tips.push({
        id: `tip_${timestamp.getTime()}_3`,
        type: 'shifting',
        message: 'High RPM detected. Shift to a higher gear for better efficiency',
        priority: 'medium',
        timestamp,
        isRead: false,
      });
    }

    // Analyze speed
    if (obdData.vehicleSpeed > 120) {
      tips.push({
        id: `tip_${timestamp.getTime()}_4`,
        type: 'general',
        message: 'High speed detected. Reducing speed by 10 km/h can save 15% fuel',
        priority: 'high',
        timestamp,
        isRead: false,
      });
    }

    // General eco-driving tips based on score
    if (ecoScore < 60) {
      tips.push({
        id: `tip_${timestamp.getTime()}_5`,
        type: 'general',
        message: 'Your eco-score is low. Focus on smooth acceleration and braking',
        priority: 'high',
        timestamp,
        isRead: false,
      });
    }

    return tips;
  }

  async predictFuelEfficiency(
    currentData: OBDData,
    routeData: Array<{ lat: number; lng: number; elevation: number }>
  ): Promise<number> {
    if (!this.isInitialized) return 0;

    try {
      // This would use a more sophisticated model to predict fuel efficiency
      // based on current driving behavior and route characteristics
      
      let baseEfficiency = 7.5; // L/100km base
      
      // Adjust based on current driving behavior
      if (currentData.throttlePosition > 70) baseEfficiency += 2;
      if (currentData.engineRPM > 2500) baseEfficiency += 1;
      if (currentData.vehicleSpeed > 100) baseEfficiency += 1.5;
      
      // Adjust based on route (elevation changes, traffic, etc.)
      if (routeData.length > 0) {
        const elevationChanges = this.calculateElevationChanges(routeData);
        baseEfficiency += elevationChanges * 0.1;
      }
      
      return Math.max(4, Math.min(15, baseEfficiency)); // Clamp between 4-15 L/100km
    } catch (error) {
      console.error('Failed to predict fuel efficiency:', error);
      return 0;
    }
  }

  private calculateElevationChanges(routeData: Array<{ lat: number; lng: number; elevation: number }>): number {
    if (routeData.length < 2) return 0;
    
    let totalChange = 0;
    for (let i = 1; i < routeData.length; i++) {
      totalChange += Math.abs(routeData[i].elevation - routeData[i-1].elevation);
    }
    
    return totalChange;
  }

  async trainModel(trainingData: Array<{
    input: number[];
    output: number;
  }>): Promise<void> {
    if (!this.model) return;

    try {
      const inputs = tf.tensor2d(trainingData.map(d => d.input));
      const outputs = tf.tensor2d(trainingData.map(d => [d.output / 100])); // Normalize output
      
      await this.model.fit(inputs, outputs, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss?.toFixed(4)}`);
          },
        },
      });
      
      // Clean up tensors
      inputs.dispose();
      outputs.dispose();
      
      console.log('Model training completed');
    } catch (error) {
      console.error('Failed to train model:', error);
    }
  }

  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  destroy(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
  }
}

export default new AIService();
