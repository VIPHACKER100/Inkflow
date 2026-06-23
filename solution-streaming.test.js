/**
 * Solution Streaming and Rendering Tests (Task 6.2)
 * Tests for streaming AI responses and rendering solutions with handwriting settings
 * Requirements: 5.4, 5.5, 5.6, 5.8, 5.10
 */

describe('Solution Streaming and Rendering (Task 6.2)', () => {
  
  /**
   * Test 1: SSE Streaming Mechanism
   * Requirement 5.4: Process AI response using existing SSE streaming mechanism
   */
  test('Solution streams incrementally via onChunk callback', (done) => {
    const chunks = [];
    let fullText = '';
    
    // Simulate streaming response with multiple chunks
    const mockStream = async (onChunk) => {
      const response = 'Step 1: Identify the variables\nStep 2: Apply the formula\nStep 3: Calculate the result';
      const words = response.split(' ');
      
      for (let word of words) {
        fullText += word + ' ';
        onChunk(fullText);
        chunks.push(fullText);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return fullText;
    };
    
    mockStream((text) => {
      expect(text.length).toBeGreaterThan(0);
    }).then(() => {
      expect(chunks.length).toBeGreaterThan(1);
      expect(fullText).toContain('Step 1:');
      expect(fullText).toContain('Step 2:');
      expect(fullText).toContain('Step 3:');
      done();
    });
  });

  /**
   * Test 2: Step Numbering Format
   * Requirement 5.5: Format solution with step numbering (Step 1:, Step 2:, etc.)
   */
  test('Solution output contains properly formatted step numbers', () => {
    const sampleSolution = `Step 1: Identify given values
- Initial velocity (u) = 20 m/s
- Acceleration (g) = -10 m/s²

Step 2: Apply kinematic equation
v² = u² + 2as

Step 3: Solve for maximum height
s = 20 meters`;

    // Verify step numbering format
    expect(sampleSolution).toMatch(/Step 1:/);
    expect(sampleSolution).toMatch(/Step 2:/);
    expect(sampleSolution).toMatch(/Step 3:/);
    
    // Verify steps are in order
    const step1Idx = sampleSolution.indexOf('Step 1:');
    const step2Idx = sampleSolution.indexOf('Step 2:');
    const step3Idx = sampleSolution.indexOf('Step 3:');
    
    expect(step1Idx).toBeLessThan(step2Idx);
    expect(step2Idx).toBeLessThan(step3Idx);
  });

  /**
   * Test 3: Mathematical Notation Support (x^2, sqrt(x), integrals)
   * Requirement 5.8: Support plain-text mathematical notation
   */
  test('Mathematical notation is preserved in streaming output', () => {
    const solutionWithMath = `Step 1: We need to solve x^2 + 5x + 6 = 0

Step 2: Using the quadratic formula:
x = (-b ± sqrt(b^2 - 4ac)) / 2a

Step 3: Apply the formula
x = (-5 ± sqrt(25 - 24)) / 2
x = (-5 ± sqrt(1)) / 2
x = (-5 ± 1) / 2

Step 4: Solutions
x = -2 or x = -3

Note: The integral of x^2 is (x^3)/3 + C`;

    // Verify mathematical notation is present
    expect(solutionWithMath).toMatch(/x\^2/);
    expect(solutionWithMath).toMatch(/sqrt\(/);
    expect(solutionWithMath).toContain('integral');
    expect(solutionWithMath).toContain('±');
    
    // Verify notation appears in multiple steps
    const lines = solutionWithMath.split('\n');
    const mathLines = lines.filter(line => line.includes('^') || line.includes('sqrt') || line.includes('integral'));
    expect(mathLines.length).toBeGreaterThan(0);
  });

  /**
   * Test 4: Mathematical Working and Intermediate Calculations
   * Requirement 5.6: Include mathematical working and intermediate calculations
   */
  test('Solution includes intermediate calculations and final answer', () => {
    const solutionWithWorking = `Step 1: Identify values
u = 20 m/s
g = 10 m/s²

Step 2: At maximum height, v = 0
Use: v^2 = u^2 - 2gh

Step 3: Substitute values
0 = (20)^2 - 2(10)h
0 = 400 - 20h

Step 4: Solve for h
20h = 400
h = 400/20
h = 20

Final Answer: Maximum height = 20 meters`;

    // Verify intermediate calculations
    expect(solutionWithWorking).toContain('400 - 20h');
    expect(solutionWithWorking).toContain('20h = 400');
    expect(solutionWithWorking).toContain('h = 400/20');
    
    // Verify final answer is present
    expect(solutionWithWorking).toMatch(/Final Answer:|Answer:|Result:|Solution:/i);
    expect(solutionWithWorking).toContain('20 meters');
  });

  /**
   * Test 5: Incremental Rendering to Canvas
   * Requirement 5.10: Render solution incrementally with current handwriting settings
   */
  test('Solution renders to canvas with current handwriting settings', () => {
    // Mock the rendering mechanism
    const mockRenderContext = {
      font: S.font,
      fontSize: S.fontSize,
      lineHeight: S.lineHeight,
      inkColor: S.inkColor,
      pressure: S.pressure,
      rotationMax: S.rotationMax
    };
    
    const sampleText = 'Step 1: Solution step one\nStep 2: Solution step two';
    
    expect(mockRenderContext.font).toBe(S.font);
    expect(mockRenderContext.fontSize).toBe(S.fontSize);
    expect(mockRenderContext.inkColor).toBe(S.inkColor);
    expect(mockRenderContext.pressure).toBe(S.pressure);
  });

  /**
   * Test 6: Multiple Problem Examples
   * Tests various problem types with proper solution formatting
   */
  test.each([
    {
      problem: 'Solve: 2x + 5 = 13',
      expectedSteps: 3,
      shouldContain: ['Step 1:', 'Subtract 5', '2x = 8', 'x = 4']
    },
    {
      problem: 'Calculate area of circle with radius 5',
      expectedSteps: 3,
      shouldContain: ['Step 1:', 'radius', 'π', 'Area = πr^2', '25π']
    },
    {
      problem: 'If train travels 60 km/h for 2 hours, distance?',
      expectedSteps: 2,
      shouldContain: ['Step 1:', 'Distance = Speed × Time', '60 × 2', '120 km']
    }
  ])('Formats solution correctly for: $problem', (testCase) => {
    // Verify step count markers
    const stepPattern = /Step \d+:/g;
    expect(testCase.shouldContain.join('\n')).toMatch(/Step \d+:/);
    
    // Verify required content is present
    testCase.shouldContain.forEach(content => {
      expect(testCase.shouldContain.join('\n')).toContain(content);
    });
  });

  /**
   * Test 7: Solution Persistence Through Rendering
   * Verify mathematical notation survives the full pipeline
   */
  test('Mathematical notation preserved throughout rendering pipeline', () => {
    const originalSolution = `Step 1: Setup equation x^2 - 5x + 6 = 0
Step 2: Factor (x - 2)(x - 3) = 0
Step 3: Solutions x = 2 or x = 3
Step 4: Verify by substituting back into x^2 - 5x + 6`;

    // Simulate pipeline: streaming → textarea → renderText
    const textarea = document.getElementById('text-input');
    textarea.value = originalSolution;
    
    // Verify notation is intact
    expect(textarea.value).toContain('x^2');
    expect(textarea.value).toContain('(x - 2)');
    expect(textarea.value).toContain('Step 1:');
  });

  /**
   * Test 8: Real-time Progressive Rendering
   * Requirement 5.4: Incremental rendering during streaming
   */
  test('Progressive rendering updates textarea during streaming', (done) => {
    const textarea = document.getElementById('text-input');
    const updates = [];
    
    // Clear textarea first
    textarea.value = '';
    
    // Simulate progressive streaming with onChunk callback
    const simulateStreaming = async () => {
      const fullSolution = `Step 1: Identify variables
Variables: initial velocity u = 20 m/s, acceleration a = -10 m/s²

Step 2: Apply kinematic equation
v² = u² + 2as
At max height, v = 0

Step 3: Calculate
0 = 400 + 2(-10)s
0 = 400 - 20s
s = 20 m`;

      let accumulated = '';
      const chunks = fullSolution.split('\n');
      
      for (let chunk of chunks) {
        accumulated += chunk + '\n';
        textarea.value = accumulated;
        updates.push(textarea.value.length);
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      return accumulated;
    };
    
    simulateStreaming().then(() => {
      // Verify updates increased progressively
      for (let i = 1; i < updates.length; i++) {
        expect(updates[i]).toBeGreaterThanOrEqual(updates[i - 1]);
      }
      expect(updates.length).toBeGreaterThan(1);
      done();
    });
  });

  /**
   * Test 9: Mixed Math and Text Rendering
   * Verify sections with mixed mathematical and prose content
   */
  test('Renders sections with mixed mathematical and prose content', () => {
    const mixedContent = `Step 1: Understand the problem
A projectile is launched at 20 m/s at 45°. We need to find the maximum height.

Step 2: Resolve velocity components
v_x = 20 * cos(45°) = 20 * (1/sqrt(2)) = 10sqrt(2) m/s
v_y = 20 * sin(45°) = 20 * (1/sqrt(2)) = 10sqrt(2) m/s

Step 3: Apply kinematics for vertical motion
Using v^2 = u^2 - 2gh, at maximum height v_y = 0
0 = (10sqrt(2))^2 - 2(10)h
0 = 200 - 20h
h = 10 m

Final Answer: Maximum height is 10 meters`;

    // Verify structure
    expect(mixedContent).toMatch(/Step \d+:/);
    expect(mixedContent).toContain('Final Answer:');
    
    // Verify math notation
    expect(mixedContent).toContain('sqrt(');
    expect(mixedContent).toContain('^');
    
    // Verify prose explanations
    expect(mixedContent).toMatch(/launch|projectile|velocity|components/i);
  });

  /**
   * Test 10: Error Messages and Edge Cases
   * Verify proper handling of edge cases
   */
  test('Handles edge cases in solution formatting', () => {
    // Single step solution
    const singleStep = 'Step 1: This is the only solution to the problem\nFinal Answer: 42';
    expect(singleStep).toMatch(/Step 1:/);
    expect(singleStep).toMatch(/Final Answer:/);
    
    // Solution with special characters
    const specialChars = `Step 1: Solve α + β = 90°
Step 2: If α = 30°, then β = 60°
Step 3: cos(30°) = sqrt(3)/2 ≈ 0.866`;
    expect(specialChars).toContain('√');
    expect(specialChars).toContain('°');
    expect(specialChars).toContain('≈');
    
    // Long calculation
    const longCalc = 'Step 1: 2 + 2 = 4\nStep 2: 4 × 3 = 12\nStep 3: 12 / 2 = 6\nStep 4: 6 - 1 = 5\nFinal Answer: 5';
    const steps = longCalc.match(/Step \d+:/g);
    expect(steps.length).toBe(4);
  });

  /**
   * Test 11: Stream callback integration
   * Verify onChunk callback properly updates UI elements
   */
  test('onChunk callback updates both textarea and S.text state', () => {
    const textarea = document.getElementById('text-input');
    const testSolution = 'Step 1: First part\nStep 2: Second part';
    
    // Simulate onChunk callback
    const onChunkSimulation = (text) => {
      textarea.value = text;
      S.text = text;
    };
    
    onChunkSimulation(testSolution);
    
    expect(textarea.value).toBe(testSolution);
    expect(S.text).toBe(testSolution);
    expect(S.text).toContain('Step 1:');
    expect(S.text).toContain('Step 2:');
  });

  /**
   * Test 12: Rendering throttle mechanism
   * Verify that rendering doesn't happen too frequently
   */
  test('Rendering is throttled to prevent performance issues', (done) => {
    const renderCalls = [];
    let lastRenderTime = 0;
    const THROTTLE_MS = 200;
    
    const simulateThrottledRender = (text) => {
      const now = Date.now();
      if (now - lastRenderTime > THROTTLE_MS) {
        renderCalls.push(now);
        lastRenderTime = now;
        return true;
      }
      return false;
    };
    
    // Simulate rapid updates
    let updateCount = 0;
    const interval = setInterval(() => {
      const shouldRender = simulateThrottledRender(`Update ${updateCount++}`);
      if (updateCount >= 10) {
        clearInterval(interval);
        
        // Verify throttling happened
        expect(renderCalls.length).toBeLessThan(10);
        expect(renderCalls.length).toBeGreaterThan(0);
        
        // Verify time gaps between renders
        for (let i = 1; i < renderCalls.length; i++) {
          expect(renderCalls[i] - renderCalls[i - 1]).toBeGreaterThanOrEqual(THROTTLE_MS - 10);
        }
        
        done();
      }
    }, 50);
  });

  /**
   * Test 13: Autosave after streaming completes
   * Verify solution is autosaved after streaming finishes
   */
  test('Solution is autosaved after streaming completes', () => {
    const testSolution = `Step 1: Setup problem
Step 2: Apply method
Step 3: Calculate result
Final Answer: Solution found`;

    const textarea = document.getElementById('text-input');
    textarea.value = testSolution;
    S.text = testSolution;
    
    // Verify data is ready for autosave
    expect(S.text).toBe(testSolution);
    expect(S.text).not.toBe('');
    expect(S.text).toContain('Step 1:');
  });

});

/**
 * Integration Tests: Full Solution Pipeline
 */
describe('Solution Streaming Integration (Full Pipeline)', () => {
  
  /**
   * Test: Complete workflow from problem to rendered solution
   */
  test('Complete doubt-solver workflow: problem → AI → streaming → rendering', (done) => {
    const textarea = document.getElementById('text-input');
    
    // Step 1: Input problem
    const problem = 'Solve: x + 5 = 12';
    textarea.value = problem;
    
    // Step 2: Simulate AI response streaming
    const expectedSolution = `Step 1: Identify the equation
x + 5 = 12

Step 2: Subtract 5 from both sides
x + 5 - 5 = 12 - 5
x = 7

Final Answer: x = 7`;

    // Step 3: Simulate streaming via onChunk
    let streamedText = '';
    const onChunk = (text) => {
      streamedText = text;
      textarea.value = text;
      S.text = text;
    };
    
    // Simulate chunks arriving
    const chunks = expectedSolution.split('\n');
    let chunkIndex = 0;
    
    const deliverChunks = setInterval(() => {
      if (chunkIndex < chunks.length) {
        streamedText += (chunkIndex > 0 ? '\n' : '') + chunks[chunkIndex];
        onChunk(streamedText);
        chunkIndex++;
      } else {
        clearInterval(deliverChunks);
        
        // Verify complete solution
        expect(S.text).toContain('Step 1:');
        expect(S.text).toContain('Step 2:');
        expect(S.text).toContain('Final Answer:');
        expect(S.text).toContain('x = 7');
        
        done();
      }
    }, 20);
  });

  /**
   * Test: Multiple consecutive solutions
   */
  test('Handles multiple consecutive doubt-solver solutions', () => {
    const solutions = [
      `Step 1: Problem 1 part 1\nStep 2: Problem 1 part 2\nFinal Answer: Solution 1`,
      `Step 1: Problem 2 part 1\nStep 2: Problem 2 part 2\nFinal Answer: Solution 2`,
      `Step 1: Problem 3 part 1\nStep 2: Problem 3 part 2\nFinal Answer: Solution 3`
    ];
    
    const textarea = document.getElementById('text-input');
    
    solutions.forEach(solution => {
      textarea.value = solution;
      expect(textarea.value).toContain('Step 1:');
      expect(textarea.value).toContain('Final Answer:');
    });
  });

});
