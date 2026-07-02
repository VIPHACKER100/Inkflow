/**
 * stroke-prediction-engine.test.js
 * Unit tests for Task 14: Smart Stroke Prediction
 * 
 * Run with: node stroke-prediction-engine.test.js
 */

const assert = require('assert');

// Mock window object for node execution
global.window = {};

// Load the engine class
require('./stroke-prediction-engine.js');
const StrokePredictionEngine = global.window.StrokePredictionEngine;

function runTests() {
  console.log("\n[TEST] Starting StrokePredictionEngine Unit Tests...");
  const engine = new StrokePredictionEngine();
  
  // Test Initialization
  engine.initialize();
  console.log("  ✅ PASS: initialize() completes without errors");

  // Test updateContext and context buffer length clamping
  engine.updateContext("This is a very long note text that exceeds twenty characters limit");
  assert.strictEqual(engine.contextBuffer.length, 20, "Context buffer should be clamped to max length of 20");
  assert.strictEqual(engine.contextBuffer, "nty characters limit", "Context buffer should contain the last 20 characters");
  console.log("  ✅ PASS: Context buffer clamps correctly");

  // Test setTemperature bounds
  engine.setTemperature(1.5);
  assert.strictEqual(engine.temperature, 1.5, "Temperature should set correctly");
  engine.setTemperature(0.05);
  assert.strictEqual(engine.temperature, 0.1, "Temperature should clamp to min value 0.1");
  engine.setTemperature(2.5);
  assert.strictEqual(engine.temperature, 2.0, "Temperature should clamp to max value 2.0");
  console.log("  ✅ PASS: setTemperature clamps values within bounds");

  // Test getConfidenceScore
  assert(engine.getConfidenceScore("gravity") > 0.8, "Longer prediction should have high confidence");
  assert(engine.getConfidenceScore("on") < 0.5, "Short prediction should have low confidence");
  console.log("  ✅ PASS: getConfidenceScore assigns reasonable confidence scores");

  // Test predict() with exact phrase matching
  const phrasePreds = engine.predict("the quick");
  assert(phrasePreds.includes(" brown fox jumps over the lazy dog"), "Should predict ' brown fox...' for 'the quick'");
  console.log("  ✅ PASS: Exact phrase matching predicts correct phrase");

  // Test predict() with word prefix matching
  const prefixPreds = engine.predict("A study of grav");
  assert(prefixPreds.includes("ity"), "Should predict completion 'ity' for 'grav'");
  console.log("  ✅ PASS: Word prefix matching suggests suffix to complete word");

  // Test acceptPrediction
  const original = "the quick";
  const prediction = " brown fox";
  const result = engine.acceptPrediction(original, prediction);
  assert.strictEqual(result, "the quick brown fox", "acceptPrediction should append prediction to original text");
  console.log("  ✅ PASS: acceptPrediction returns correctly concatenated text");

  console.log("\n🎉 All Smart Stroke Prediction tests passed successfully!\n");
}

try {
  runTests();
  process.exit(0);
} catch (e) {
  console.error("❌ Test assertion failed: ", e.message);
  process.exit(1);
}
