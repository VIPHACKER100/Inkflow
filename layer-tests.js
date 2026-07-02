// Mocking browser environment for Node.js
global.window = global;
global.document = {
  createElement: function(tag) {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: function() {
          return {
            drawImage: function() {},
            clearRect: function() {},
            save: function() {},
            restore: function() {},
            globalAlpha: 1,
            globalCompositeOperation: 'source-over'
          };
        }
      };
    }
  }
};

const fs = require('fs');
// Very basic script loading
eval(fs.readFileSync('./layer-compositor.js', 'utf8'));

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

function runTests() {
  console.log('--- Layer Compositor Tests ---');
  
  const comp = initLayerCompositor(1200, 1600);
  assert(comp !== null, 'Compositor initialized');
  assert(comp.width === 1200, 'Width is correct');

  // Test default stack
  const stack = comp.getStack(0);
  assert(stack.layers.length === 2, 'Default stack has 2 layers');
  assert(stack.layers[0].name === 'Background', 'Layer 0 is Background');
  assert(stack.layers[0].locked === true, 'Background is locked');
  assert(stack.layers[1].name === 'Content', 'Layer 1 is Content');

  // Test layer creation
  const l1 = comp.createLayer(0, 'Test Layer');
  assert(l1.name === 'Test Layer', 'New layer created');
  assert(stack.layers.length === 3, 'Stack now has 3 layers');

  // Test layer deletion
  comp.deleteLayer(0, l1.id);
  assert(stack.layers.length === 2, 'Layer deleted, stack has 2 layers');

  // Test locking protection
  const delBgResult = comp.deleteLayer(0, stack.layers[0].id);
  assert(delBgResult === false, 'Cannot delete locked layer');
  assert(stack.layers.length === 2, 'Stack still has 2 layers');

  // Test layer property updates
  const l2 = comp.createLayer(0, 'Another Layer');
  comp.setLayerProperty(0, l2.id, 'opacity', 0.5);
  comp.setLayerProperty(0, l2.id, 'blendMode', 'multiply');
  comp.setLayerProperty(0, l2.id, 'visible', false);
  
  assert(l2.opacity === 0.5, 'Opacity updated');
  assert(l2.blendMode === 'multiply', 'Blend mode updated');
  assert(l2.visible === false, 'Visibility updated');

  // Test layer reordering
  const l3 = comp.createLayer(0, 'Top Layer');
  // Order: 0:Bg, 1:Content, 2:Another Layer, 3:Top Layer
  comp.reorderLayers(0, l3.id, 1);
  // Expected order: 0:Bg, 1:Top Layer, 2:Content, 3:Another Layer
  
  assert(stack.layers[1].id === l3.id, 'Layer reordered to index 1');
  assert(stack.layers[2].name === 'Content', 'Content layer moved to index 2');

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
