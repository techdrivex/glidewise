const express = require('express');
const { body, validationResult } = require('express-validator');
const { asyncHandler, sendSuccessResponse, sendErrorResponse } = require('../middleware/errorHandler');
const DatabaseService = require('../services/DatabaseService');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Get AI model information
router.get('/models', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Get user's AI models
    const models = await knex('ai_models')
      .where('userId', userId)
      .orderBy('createdAt', 'desc')
      .select('*');
    
    // Get model performance statistics
    const modelStats = await knex('model_predictions')
      .whereIn('modelId', models.map(m => m.id))
      .select(
        'modelId',
        knex.raw('COUNT(*) as totalPredictions'),
        knex.raw('AVG(accuracy) as avgAccuracy'),
        knex.raw('AVG(confidence) as avgConfidence')
      )
      .groupBy('modelId');
    
    // Merge model data with stats
    const modelsWithStats = models.map(model => {
      const stats = modelStats.find(s => s.modelId === model.id);
      return {
        ...model,
        stats: stats ? {
          totalPredictions: parseInt(stats.totalPredictions) || 0,
          avgAccuracy: parseFloat(stats.avgAccuracy) || 0,
          avgConfidence: parseFloat(stats.avgConfidence) || 0
        } : {
          totalPredictions: 0,
          avgAccuracy: 0,
          avgConfidence: 0
        }
      };
    });
    
    sendSuccessResponse(res, {
      models: modelsWithStats,
      totalModels: modelsWithStats.length
    }, 'AI models retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching AI models:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get specific AI model details
router.get('/models/:modelId', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { modelId } = req.params;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Get model details
    const model = await knex('ai_models')
      .where('id', modelId)
      .where('userId', userId)
      .first();
    
    if (!model) {
      return sendErrorResponse(res, { message: 'Model not found' }, 404);
    }
    
    // Get model predictions
    const predictions = await knex('model_predictions')
      .where('modelId', modelId)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .select('*');
    
    // Get model performance over time
    const performanceData = await knex('model_predictions')
      .where('modelId', modelId)
      .select(
        knex.raw('DATE(timestamp) as date'),
        knex.raw('AVG(accuracy) as avgAccuracy'),
        knex.raw('AVG(confidence) as avgConfidence'),
        knex.raw('COUNT(*) as predictionsCount')
      )
      .groupBy(knex.raw('DATE(timestamp)'))
      .orderBy('date', 'asc');
    
    sendSuccessResponse(res, {
      model,
      predictions,
      performance: performanceData,
      totalPredictions: predictions.length
    }, 'Model details retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching model details:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Create new AI model
router.post('/models', [
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('type').isIn(['eco_score', 'fuel_efficiency', 'driving_behavior', 'maintenance_prediction']),
  body('description').optional().isString().trim().isLength({ max: 500 }),
  body('hyperparameters').optional().isObject(),
  body('trainingDataSize').optional().isInt({ min: 0 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { errors: errors.array() }, 400);
  }
  
  const userId = req.user.id;
  const { name, type, description, hyperparameters, trainingDataSize } = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if model with same name exists
    const existingModel = await knex('ai_models')
      .where('userId', userId)
      .where('name', name)
      .first();
    
    if (existingModel) {
      return sendErrorResponse(res, { message: 'Model with this name already exists' }, 409);
    }
    
    // Create model record
    const [modelId] = await knex('ai_models').insert({
      userId,
      name,
      type,
      description: description || '',
      hyperparameters: hyperparameters ? JSON.stringify(hyperparameters) : null,
      trainingDataSize: trainingDataSize || 0,
      status: 'created',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Get created model
    const newModel = await knex('ai_models')
      .where('id', modelId)
      .first();
    
    sendSuccessResponse(res, {
      model: newModel,
      message: 'AI model created successfully'
    }, 'AI model created successfully', 201);
    
  } catch (error) {
    console.error('Error creating AI model:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Update AI model
router.put('/models/:modelId', [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['created', 'training', 'trained', 'deployed', 'archived']),
  body('hyperparameters').optional().isObject()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { errors: errors.array() }, 400);
  }
  
  const userId = req.user.id;
  const { modelId } = req.params;
  const { name, description, status, hyperparameters } = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if model exists and belongs to user
    const existingModel = await knex('ai_models')
      .where('id', modelId)
      .where('userId', userId)
      .first();
    
    if (!existingModel) {
      return sendErrorResponse(res, { message: 'Model not found' }, 404);
    }
    
    // Prepare update data
    const updateData = {
      updatedAt: new Date()
    };
    
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (hyperparameters) updateData.hyperparameters = JSON.stringify(hyperparameters);
    
    // Update model
    await knex('ai_models')
      .where('id', modelId)
      .update(updateData);
    
    // Get updated model
    const updatedModel = await knex('ai_models')
      .where('id', modelId)
      .first();
    
    sendSuccessResponse(res, {
      model: updatedModel,
      message: 'Model updated successfully'
    }, 'Model updated successfully');
    
  } catch (error) {
    console.error('Error updating model:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Delete AI model
router.delete('/models/:modelId', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { modelId } = req.params;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if model exists and belongs to user
    const model = await knex('ai_models')
      .where('id', modelId)
      .where('userId', userId)
      .first();
    
    if (!model) {
      return sendErrorResponse(res, { message: 'Model not found' }, 404);
    }
    
    // Delete related predictions first
    await knex('model_predictions')
      .where('modelId', modelId)
      .del();
    
    // Delete model
    await knex('ai_models')
      .where('id', modelId)
      .del();
    
    // Try to delete model file if it exists
    if (model.modelPath) {
      try {
        await fs.unlink(model.modelPath);
      } catch (fileError) {
        console.warn('Could not delete model file:', fileError);
      }
    }
    
    sendSuccessResponse(res, {
      message: 'Model deleted successfully'
    }, 'Model deleted successfully');
    
  } catch (error) {
    console.error('Error deleting model:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get model predictions
router.get('/predictions', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { modelId, limit = 50, offset = 0 } = req.query;
  
  try {
    const knex = DatabaseService.getKnex();
    
    let query = knex('model_predictions as mp')
      .join('ai_models as am', 'mp.modelId', 'am.id')
      .where('am.userId', userId)
      .select(
        'mp.*',
        'am.name as modelName',
        'am.type as modelType'
      )
      .orderBy('mp.timestamp', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    if (modelId) {
      query = query.where('mp.modelId', modelId);
    }
    
    const predictions = await query;
    
    // Get total count for pagination
    let countQuery = knex('model_predictions as mp')
      .join('ai_models as am', 'mp.modelId', 'am.id')
      .where('am.userId', userId);
    
    if (modelId) {
      countQuery = countQuery.where('mp.modelId', modelId);
    }
    
    const totalCount = await countQuery.count('* as count').first();
    
    sendSuccessResponse(res, {
      predictions,
      pagination: {
        total: parseInt(totalCount.count),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < parseInt(totalCount.count)
      }
    }, 'Predictions retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching predictions:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Create new prediction
router.post('/predictions', [
  body('modelId').isInt({ min: 1 }),
  body('inputData').isObject(),
  body('prediction').isObject(),
  body('accuracy').optional().isFloat({ min: 0, max: 1 }),
  body('confidence').optional().isFloat({ min: 0, max: 1 }),
  body('metadata').optional().isObject()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, { errors: errors.array() }, 400);
  }
  
  const userId = req.user.id;
  const { modelId, inputData, prediction, accuracy, confidence, metadata } = req.body;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Verify model belongs to user
    const model = await knex('ai_models')
      .where('id', modelId)
      .where('userId', userId)
      .first();
    
    if (!model) {
      return sendErrorResponse(res, { message: 'Model not found' }, 404);
    }
    
    // Create prediction record
    const [predictionId] = await knex('model_predictions').insert({
      modelId,
      inputData: JSON.stringify(inputData),
      prediction: JSON.stringify(prediction),
      accuracy: accuracy || null,
      confidence: confidence || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      timestamp: new Date()
    });
    
    // Get created prediction
    const newPrediction = await knex('model_predictions')
      .where('id', predictionId)
      .first();
    
    sendSuccessResponse(res, {
      prediction: newPrediction,
      message: 'Prediction created successfully'
    }, 'Prediction created successfully', 201);
    
  } catch (error) {
    console.error('Error creating prediction:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get AI model training status
router.get('/training/status', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Get models in training
    const trainingModels = await knex('ai_models')
      .where('userId', userId)
      .whereIn('status', ['training', 'created'])
      .select('*');
    
    // Get training progress (mock data for now)
    const trainingProgress = trainingModels.map(model => ({
      modelId: model.id,
      modelName: model.name,
      status: model.status,
      progress: model.status === 'training' ? Math.floor(Math.random() * 100) : 0,
      estimatedCompletion: model.status === 'training' ? 
        new Date(Date.now() + Math.random() * 3600000) : null,
      currentEpoch: model.status === 'training' ? Math.floor(Math.random() * 100) : 0,
      totalEpochs: 100
    }));
    
    sendSuccessResponse(res, {
      trainingModels: trainingProgress,
      totalTraining: trainingProgress.length
    }, 'Training status retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching training status:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Start model training
router.post('/training/start/:modelId', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { modelId } = req.params;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if model exists and belongs to user
    const model = await knex('ai_models')
      .where('id', modelId)
      .where('userId', userId)
      .first();
    
    if (!model) {
      return sendErrorResponse(res, { message: 'Model not found' }, 404);
    }
    
    if (model.status === 'training') {
      return sendErrorResponse(res, { message: 'Model is already training' }, 400);
    }
    
    // Update model status to training
    await knex('ai_models')
      .where('id', modelId)
      .update({
        status: 'training',
        trainingStartedAt: new Date(),
        updatedAt: new Date()
      });
    
    // In a real implementation, this would start an actual training process
    // For now, we'll simulate it
    
    sendSuccessResponse(res, {
      message: 'Model training started successfully',
      modelId,
      status: 'training'
    }, 'Model training started successfully');
    
  } catch (error) {
    console.error('Error starting training:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Stop model training
router.post('/training/stop/:modelId', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { modelId } = req.params;
  
  try {
    const knex = DatabaseService.getKnex();
    
    // Check if model exists and belongs to user
    const model = await knex('ai_models')
      .where('id', modelId)
      .where('userId', userId)
      .first();
    
    if (!model) {
      return sendErrorResponse(res, { message: 'Model not found' }, 404);
    }
    
    if (model.status !== 'training') {
      return sendErrorResponse(res, { message: 'Model is not currently training' }, 400);
    }
    
    // Update model status
    await knex('ai_models')
      .where('id', modelId)
      .update({
        status: 'created',
        trainingStoppedAt: new Date(),
        updatedAt: new Date()
      });
    
    sendSuccessResponse(res, {
      message: 'Model training stopped successfully',
      modelId,
      status: 'created'
    }, 'Model training stopped successfully');
    
  } catch (error) {
    console.error('Error stopping training:', error);
    sendErrorResponse(res, error, 500);
  }
}));

// Get AI model performance metrics
router.get('/performance', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { timeRange = '30d' } = req.query;
  
  try {
    const knex = DatabaseService.getKnex();
    
    let dateFilter;
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get overall performance metrics
    const performanceMetrics = await knex('model_predictions as mp')
      .join('ai_models as am', 'mp.modelId', 'am.id')
      .where('am.userId', userId)
      .where('mp.timestamp', '>=', dateFilter)
      .select(
        knex.raw('COUNT(*) as totalPredictions'),
        knex.raw('AVG(mp.accuracy) as avgAccuracy'),
        knex.raw('AVG(mp.confidence) as avgConfidence'),
        knex.raw('COUNT(DISTINCT mp.modelId) as activeModels')
      )
      .first();
    
    // Get performance by model type
    const performanceByType = await knex('model_predictions as mp')
      .join('ai_models as am', 'mp.modelId', 'am.id')
      .where('am.userId', userId)
      .where('mp.timestamp', '>=', dateFilter)
      .select(
        'am.type',
        knex.raw('COUNT(*) as predictions'),
        knex.raw('AVG(mp.accuracy) as avgAccuracy'),
        knex.raw('AVG(mp.confidence) as avgConfidence')
      )
      .groupBy('am.type');
    
    // Get performance trends over time
    const performanceTrends = await knex('model_predictions as mp')
      .join('ai_models as am', 'mp.modelId', 'am.id')
      .where('am.userId', userId)
      .where('mp.timestamp', '>=', dateFilter)
      .select(
        knex.raw('DATE(mp.timestamp) as date'),
        knex.raw('COUNT(*) as predictions'),
        knex.raw('AVG(mp.accuracy) as avgAccuracy'),
        knex.raw('AVG(mp.confidence) as avgConfidence')
      )
      .groupBy(knex.raw('DATE(mp.timestamp)'))
      .orderBy('date', 'asc');
    
    sendSuccessResponse(res, {
      timeRange,
      overview: {
        totalPredictions: parseInt(performanceMetrics.totalPredictions) || 0,
        avgAccuracy: parseFloat(performanceMetrics.avgAccuracy) || 0,
        avgConfidence: parseFloat(performanceMetrics.avgConfidence) || 0,
        activeModels: parseInt(performanceMetrics.activeModels) || 0
      },
      byType: performanceByType,
      trends: performanceTrends
    }, 'Performance metrics retrieved successfully');
    
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    sendErrorResponse(res, error, 500);
  }
}));

module.exports = router;
