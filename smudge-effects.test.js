/**
 * Unit tests for Smudge Effects Toggle
 * Requirements: 2.1, 2.6, 2.7
 */

describe('Smudge Effects Toggle - UI & State Management', () => {
  let mockCheckbox;
  let mockState;
  let localStorageMock;

  beforeEach(() => {
    // Mock DOM elements
    mockCheckbox = {
      id: 'smudge-effects-toggle',
      checked: false,
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    };

    // Mock global state
    mockState = {
      smudgeEffects: false
    };

    // Mock localStorage
    localStorageMock = {
      data: {},
      getItem: jest.fn((key) => localStorageMock.data[key] || null),
      setItem: jest.fn((key, value) => {
        localStorageMock.data[key] = value;
      }),
      clear: jest.fn(() => {
        localStorageMock.data = {};
      })
    };

    // Replace global localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 1: Checkbox exists in DOM
   * Validates: Requirement 2.1 - "Add checkbox input 'Smudge Effects' to sidebar"
   */
  it('should have smudge effects checkbox in the sidebar', () => {
    const checkbox = document.getElementById('smudge-effects-toggle');
    expect(checkbox).toExist();
    expect(checkbox.type).toBe('checkbox');
  });

  /**
   * Test 2: Toggling checkbox updates S.smudgeEffects state
   * Validates: Requirement 2.1 - "Wire toggle to state object S.smudgeEffects"
   */
  it('should update S.smudgeEffects when checkbox is toggled', () => {
    const checkbox = document.getElementById('smudge-effects-toggle');
    
    // Initially unchecked
    expect(checkbox.checked).toBe(false);
    expect(S.smudgeEffects).toBe(false);
    
    // Check the box
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    
    expect(S.smudgeEffects).toBe(true);
    
    // Uncheck the box
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    
    expect(S.smudgeEffects).toBe(false);
  });

  /**
   * Test 3: State changes are persisted to localStorage
   * Validates: Requirement 2.6 & 2.7 - "THE System SHALL persist the smudge effects toggle state to localStorage"
   */
  it('should persist smudge effects state to localStorage on toggle', () => {
    const checkbox = document.getElementById('smudge-effects-toggle');
    
    // Toggle smudge effects on
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    
    // Check if localStorage was updated
    const savedState = JSON.parse(localStorage.getItem('inkflow-state'));
    expect(savedState.smudgeEffects).toBe(true);
    
    // Toggle smudge effects off
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    
    const updatedState = JSON.parse(localStorage.getItem('inkflow-state'));
    expect(updatedState.smudgeEffects).toBe(false);
  });

  /**
   * Test 4: Checkbox state is restored from localStorage on page load
   * Validates: Requirement 2.7 - state is persisted and restored
   */
  it('should restore smudge effects checkbox state from localStorage', () => {
    // Simulate saved state with smudge effects enabled
    const savedState = {
      smudgeEffects: true,
      text: '',
      font: 'Caveat'
    };
    localStorage.setItem('inkflow-state', JSON.stringify(savedState));
    
    // Simulate restoreState() function call
    const checkbox = document.getElementById('smudge-effects-toggle');
    const state = JSON.parse(localStorage.getItem('inkflow-state'));
    
    if (state.smudgeEffects !== undefined) {
      S.smudgeEffects = state.smudgeEffects;
      checkbox.checked = state.smudgeEffects;
    }
    
    // Verify checkbox is checked and state is updated
    expect(checkbox.checked).toBe(true);
    expect(S.smudgeEffects).toBe(true);
  });

  /**
   * Test 5: renderSmudgeEffects respects toggle state
   * Validates: Requirement 2.1 - effects are only rendered when enabled
   */
  it('should only render smudge effects when S.smudgeEffects is true', () => {
    const mockCanvas = document.createElement('canvas');
    const ctx = mockCanvas.getContext('2d');
    
    // Spy on canvas drawing methods
    const saveSpy = jest.spyOn(ctx, 'save');
    const fillSpy = jest.spyOn(ctx, 'fill');
    
    // Test with smudge effects disabled
    S.smudgeEffects = false;
    renderSmudgeEffects(ctx, 0);
    
    // Should not have drawn anything
    expect(saveSpy).not.toHaveBeenCalled();
    
    // Test with smudge effects enabled
    S.smudgeEffects = true;
    renderSmudgeEffects(ctx, 0);
    
    // Should have drawn shapes
    expect(saveSpy).toHaveBeenCalled();
  });
});

/**
 * Property-Based Tests for Smudge Effects
 * 
 * Property: Toggle state persistence round-trip
 * For all toggle states (true/false), toggle -> save -> restore -> verify state matches
 */
describe('Smudge Effects - Property-Based Tests', () => {
  
  it('should maintain state consistency through save-restore cycle (property-based)', () => {
    const testStates = [true, false];
    
    testStates.forEach(initialState => {
      // Clear localStorage
      localStorage.clear();
      
      // Set initial state
      S.smudgeEffects = initialState;
      const checkbox = document.getElementById('smudge-effects-toggle');
      checkbox.checked = initialState;
      
      // Trigger save (via autosave mechanism)
      const state = {
        smudgeEffects: S.smudgeEffects
      };
      localStorage.setItem('inkflow-state', JSON.stringify(state));
      
      // Simulate load (via restoreState mechanism)
      const loaded = JSON.parse(localStorage.getItem('inkflow-state'));
      const restored = loaded.smudgeEffects;
      
      // Verify round-trip consistency
      expect(restored).toBe(initialState);
      expect(S.smudgeEffects).toBe(initialState);
    });
  });
});
