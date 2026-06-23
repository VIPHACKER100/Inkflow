# Implementation Plan: Advanced InkFlow Features

## Overview

This implementation plan covers two major feature categories:
1. **Rendering & Realism Enhancements**: Contextual character variation, smudge effects, cursive rendering, multi-pen support
2. **Advanced Collaborative & AI Features**: Real-time collaborative writing, stroke prediction, template system, multi-layer canvas, AI tools (doubt-solver, diagrams, voice-to-notes), and Hindi/Hinglish support

All implementation will be in JavaScript, building upon the existing InkFlow architecture with its unified layout engine, canvas rendering system, and AI integration.

## Tasks

### Part A: Rendering & Realism Enhancements

- [-] 1. Implement Contextual Per-Character Jitter Engine
  - Create `CharacterVariationContext` class to track position metadata (line-start, line-end, mid-word, character-count-in-line)
  - Extend `getCharVariation()` function to accept position context parameter
  - Implement position-aware variation scaling (1.2× pressure at line-start, 1.3× slant at line-end)
  - Add progressive baseline fatigue accumulation (0.02px per character after 50 chars)
  - Add fatigue reset logic at line breaks
  - Implement hand-cramping simulation (1.5× spacing randomization after 80 chars per line)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 2. Add Smudge and Eraser Effects System
  - [-] 2.1 Create UI toggle control for smudge effects in sidebar
    - Add checkbox input "Smudge Effects" to sidebar
    - Wire toggle to state object `S.smudgeEffects`
    - Persist toggle state to localStorage
    - _Requirements: 2.1, 2.6, 2.7_
  
  - [~] 2.2 Implement smudge rendering function
    - Create `renderSmudgeEffects()` function
    - Generate 2-5 random overlay shapes per page
    - Apply opacity range 0.05-0.15 for smudge, 0.03-0.08 for eraser
    - Set dimensions 40-120px width, 15-40px height
    - Position shapes avoiding first 100px of page
    - Render before text content in drawing order
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.8, 2.9_

- [ ] 3. Implement Ligatures and Connected Cursive
  - [-] 3.1 Create cursive mode toggle and connection system
    - Add "Cursive Mode" checkbox to font settings section
    - Create `CursiveConnector` class to manage connection strokes
    - Define ligature pairs array (th, ch, sh, st, ct, ll, ff, fi, fl)
    - Store pre-defined ligature glyph shapes
    - _Requirements: 3.1, 3.4, 3.7_
  
  - [~] 3.2 Implement connection stroke rendering
    - Create `renderConnectionStroke()` function using quadratic Bezier curves
    - Define character exit/entry points for lowercase letters
    - Add logic to skip connections for uppercase, whitespace, punctuation
    - Apply same ink color and pressure variation as surrounding characters
    - Ensure cursive mode only applies to Latin script (not Devanagari)
    - _Requirements: 3.2, 3.3, 3.5, 3.6, 3.8, 3.9_

- [ ] 4. Implement Multi-Pen Support System
  - [-] 4.1 Create markdown structure parser
    - Create `MarkdownParser` class with methods for detecting headings, bullets, emphasis
    - Parse markdown symbols before stripping them from display text
    - Output structured data format with text segments and Text_Type metadata
    - Preserve original character positions for coordinate mapping
    - Handle nested structures (emphasis within bullets)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10_
  
  - [~] 4.2 Implement pen profile configuration system
    - Create `PenProfile` data structure (inkColor, pressure, blur, fontFamily properties)
    - Add UI configuration panel for defining pen profiles
    - Create default profile assignments (heading: blue bold, body: black, bullet: black medium, emphasis: dark-blue italic)
    - Persist pen profile configurations to localStorage
    - _Requirements: 4.4, 4.5, 4.7, 4.8_
  
  - [~] 4.3 Integrate pen profiles with rendering pipeline
    - Modify rendering logic to apply pen profile based on Text_Type
    - Complete current word before switching profiles to avoid mid-word color changes
    - Update `layoutText()` to pass Text_Type metadata through pipeline
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.9, 4.10_
  
  - [~] 4.4 Write property test for round-trip markdown parsing
    - **Property: Parse-then-pretty-print-then-parse produces equivalent structure**
    - **Validates: Requirements 12.1, 12.2**
    - Generate random markdown structures (headings, bullets, emphasis, mixed)
    - Test that `parse(prettyPrint(parse(text))) === parse(text)`
    - Include edge cases (nested structures, empty lines, special characters)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [~] 5. Checkpoint - Rendering enhancements complete
  - Ensure all rendering tests pass, ask the user if questions arise.

### Part B: AI Features & Multi-Language Support

- [ ] 6. Implement Doubt-Solver AI Workflow
  - [x] 6.1 Create doubt-solver UI and API integration
    - Add "Doubt Solver" button to AI tools section
    - Create system prompt for step-by-step problem solving (Indian curriculum focus)
    - Wire button to send request to configured AI provider
    - Handle empty input validation with error toast
    - _Requirements: 5.1, 5.2, 5.3, 5.7, 5.9_
  
  - [~] 6.2 Implement solution streaming and rendering
    - Process AI response using existing SSE streaming mechanism
    - Format solution with step numbering (Step 1:, Step 2:, etc.)
    - Support plain-text mathematical notation (x^2, sqrt(x), integrals)
    - Render solution incrementally with current handwriting settings
    - _Requirements: 5.4, 5.5, 5.6, 5.8, 5.10_

- [ ] 7. Implement AI Diagram Generation
  - [~] 7.1 Create diagram generator UI and system prompt
    - Add "Generate Diagram" button to AI tools section
    - Create system prompt for SVG path output (cycle, flowchart, labeled structures)
    - Send diagram description to AI provider
    - Validate diagram description input
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.9_
  
  - [~] 7.2 Implement hand-drawn diagram rendering
    - Parse SVG path data from AI response
    - Apply waviness to straight lines for hand-drawn effect
    - Render labels using current handwriting font with variation
    - Scale diagrams to fit within page margins (max 80% page width)
    - Apply current ink color and pressure variation to diagram strokes
    - _Requirements: 6.5, 6.6, 6.7, 6.8, 6.10_

- [ ] 8. Implement Voice-to-Notes Pipeline
  - [~] 8.1 Create audio recording system
    - Add "Record Lecture" button with visual indicator (pulsing red dot and timer)
    - Implement microphone permission request using MediaRecorder API
    - Add pause/resume functionality during recording
    - Display recording duration and estimated file size
    - Finalize audio as Blob on stop
    - Handle permission denial with error toast
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.9, 7.10, 7.11_
  
  - [~] 8.2 Integrate transcription and AI processing
    - Implement audio-to-text conversion using Web Speech API or third-party service
    - Feed transcript to existing Lecture-to-Notes AI workflow
    - Render cleaned notes incrementally using SSE streaming
    - _Requirements: 7.6, 7.7, 7.8, 7.12_

- [ ] 9. Implement Hinglish Multi-Language Support
  - [~] 9.1 Create script detection and font switching system
    - Create `ScriptDetector` class using Unicode ranges (U+0900-U+097F Devanagari, U+0041-U+007A Latin)
    - Implement `FontSwitcher` class to handle mid-sentence font transitions
    - Identify script boundaries within text during layout processing
    - Switch between Latin and Devanagari fonts at script boundaries
    - Complete transitions at word boundaries to avoid mid-word font changes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7_
  
  - [~] 9.2 Optimize mixed-script rendering
    - Maintain consistent baseline alignment across script switches
    - Measure character widths using correct font for each segment
    - Apply consistent ink color and pressure across script boundaries
    - Apply reduced tilt (30% of base) to Devanagari segments for ligature integrity
    - _Requirements: 8.6, 8.8, 8.9, 8.10_
  
  - [~] 9.3 Write property test for script detection accuracy
    - **Property: Script boundaries correctly identified for all valid Hindi-English text**
    - **Validates: Requirements 8.1, 8.2**
    - Generate random mixed Hinglish text
    - Verify each character classified into correct script
    - Test edge cases (punctuation, numbers, mixed words)
    - _Requirements: 8.1, 8.2_

- [~] 10. Improve Devanagari Rendering Quality
  - Audit current Devanagari font rendering for conjunct consonants
  - Identify problematic Unicode ranges (matras U+093E-U+094F, common conjuncts)
  - Implement fallback font substitution for zero-width/height glyphs
  - Add font quality test interface with test string (क्ष, त्र, ज्ञ, श्र)
  - Provide real-time preview when selecting Devanagari fonts
  - Apply 1.1× font size multiplier to Devanagari for perceived size matching
  - Enable subpixel antialiasing for Devanagari text
  - Document font recommendations in user documentation
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

- [~] 11. Implement Hindi Grammar Correction
  - Create `GrammarCorrector` class with language detection (>50% Devanagari = Hindi)
  - Add system prompt for Hindi/bilingual grammar correction
  - Send correction request to Hindi-capable AI model
  - Preserve script integrity (no transliteration)
  - Implement side-by-side comparison view (original vs corrected)
  - Add accept/reject controls for corrections before rendering
  - Handle unsupported model scenario with error toast
  - Preserve text formatting (line breaks, spacing, structure)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

- [~] 12. Checkpoint - AI and multilingual features complete
  - Ensure all AI workflows and Hindi support are functional, ask the user if questions arise.

### Part C: Collaborative & Advanced Features

- [ ] 13. Implement Real-Time Collaborative Writing
  - [~] 13.1 Set up WebSocket infrastructure
    - Create `CollaborativeEngine` class with WebSocket connection management
    - Implement connection recovery and state reconciliation logic
    - Add user presence tracking and cursor position syncing
    - Create collaboration UI panel in sidebar
    - _Component: CollaborativeEngine, Interface: initialize, connect, disconnect, getUserPresence_
  
  - [~] 13.2 Implement Operational Transformation (OT)
    - Create `CollaborationOperation` data structure (id, type, position, content, userId, timestamp, vectorClock)
    - Implement `transformOperation()` method for conflict resolution
    - Handle INSERT, DELETE, REPLACE, CURSOR_MOVE operation types
    - Serialize local operations to OT messages
    - Apply transformed remote operations to maintain consistency
    - _Component: CollaborativeEngine, Interface: sendOperation, receiveOperation, transformOperation, applyOperation_
  
  - [~] 13.3 Integrate collaboration with rendering pipeline
    - Wire OT operations to trigger incremental re-rendering
    - Display remote user cursors with color coding
    - Show operation acknowledgments and sync status
    - Handle concurrent edits across multiple users
    - _Component: CollaborativeEngine, Interface: getDocumentState_
  
  - [~] 13.4 Write unit tests for OT conflict resolution
    - Test INSERT vs INSERT at same position
    - Test DELETE vs INSERT at overlapping positions
    - Test concurrent edits from 3+ users
    - Verify vector clock monotonicity
    - _Component: CollaborativeEngine_

- [ ] 14. Implement Smart Stroke Prediction
  - [~] 14.1 Set up TensorFlow.js model infrastructure
    - Create `StrokePredictionEngine` class
    - Load pre-trained language model or configure model path
    - Initialize tokenizer with byte-pair encoding vocabulary
    - Set up model parameters (vocabSize, embeddingDim, temperature)
    - _Component: StrokePredictionEngine, Interface: initialize, loadModel, setTemperature_
  
  - [~] 14.2 Implement prediction workflow
    - Create rolling context buffer (last N=20 characters)
    - Implement `predict()` method to generate top-K predictions
    - Calculate confidence scores for each prediction
    - Create `PredictionRenderer` to display ghost text overlay
    - _Component: StrokePredictionEngine, Interface: predict, getConfidenceScore_
  
  - [~] 14.3 Integrate predictions with input system
    - Update context buffer on each keystroke
    - Render predictions with opacity 0.3 as ghost overlay
    - Implement Tab key acceptance to insert top prediction
    - Update model state when predictions accepted
    - _Component: StrokePredictionEngine, Interface: updateContext, acceptPrediction_

- [ ] 15. Implement Advanced Template System
  - [~] 15.1 Create template parser and manager
    - Create `TemplateManager` class
    - Implement template JSON parser for zones, guides, constraints
    - Validate zone boundaries and configuration
    - Create template repository interface for loading templates
    - _Component: TemplateManager, Interface: loadTemplate, parseTemplate, getZones_
  
  - [~] 15.2 Implement template rendering
    - Create `renderTemplateGuides()` function for static elements (dividers, labels, backgrounds)
    - Implement dynamic text zones with boundary enforcement
    - Add zone-constrained word wrap logic
    - Support active zone switching and highlighting
    - _Component: TemplateManager, Interface: renderTemplateGuides, setActiveZone, validateZoneContent_
  
  - [~] 15.3 Create built-in templates
    - Implement "Cornell Notes" template (cue column, notes area, summary section)
    - Implement "Two-Column" template
    - Implement "Meeting Notes" template with agenda/action zones
    - Add custom template creation and save functionality
    - _Component: TemplateManager, Interface: saveCustomTemplate_

- [ ] 16. Implement Multi-Layer Canvas Architecture
  - [~] 16.1 Create layer management system
    - Create `LayerCompositor` class
    - Implement layer stack with z-index ordering
    - Create offscreen canvases for each layer
    - Add layer visibility and opacity controls
    - _Component: LayerCompositor, Interface: createLayer, deleteLayer, setLayerProperty, reorderLayers_
  
  - [~] 16.2 Implement blend modes and composition
    - Implement blend mode rendering (normal, multiply, screen, overlay, darken, lighten)
    - Create `composite()` method to merge all visible layers
    - Apply per-layer opacity during composition
    - Handle layer reordering with immediate recomposite
    - _Component: LayerCompositor, Interface: composite, getLayerCanvas_
  
  - [~] 16.3 Create layer UI controls
    - Add "Layer Manager" panel to sidebar
    - Implement layer visibility toggle buttons
    - Add opacity sliders per layer
    - Add blend mode dropdown selectors
    - Create layer reordering drag-and-drop interface
    - _Component: LayerCompositor, Interface: exportLayerStack_
  
  - [~] 16.4 Write integration tests for layer composition
    - Test layer ordering with 3+ layers
    - Verify blend modes produce expected visual output
    - Test layer export and re-import preserves structure
    - _Component: LayerCompositor_

- [ ] 17. Final Integration and Testing
  - [~] 17.1 Integrate all features with main rendering pipeline
    - Wire collaborative engine to update rendering on remote changes
    - Connect stroke prediction HUD to canvas viewport
    - Integrate template system with page layout logic
    - Connect layer compositor to export pipelines (PNG, PDF, SVG)
    - _Components: All_
  
  - [~] 17.2 Optimize performance for combined features
    - Profile rendering performance with all features enabled
    - Implement incremental rendering for collaborative updates
    - Optimize ML model inference for stroke prediction
    - Cache template guides to reduce redraw overhead
    - Debounce layer composition triggers
    - _Requirements: Non-Functional - Performance_
  
  - [~] 17.3 Write end-to-end integration tests
    - Test combined workflow: collaborative editing + stroke prediction + templates
    - Test Hindi text in collaborative mode
    - Test AI features (doubt-solver, diagrams) with multi-layer canvas
    - Verify export pipelines work with all features enabled
    - _Components: All_

- [~] 18. Final Checkpoint - Complete feature verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties from the design
- Unit tests and integration tests validate specific examples and edge cases
- Implementation assumes existing InkFlow architecture (layoutText engine, state management, export pipelines)
- All collaborative features require WebSocket server deployment (not included in this spec)
- ML model for stroke prediction requires separate training or pre-trained model download
- Hindi support requires Hindi-capable AI models (Claude 3+, GPT-4)
- Template repository can start with local storage before adding cloud sync

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2.1", "3.1", "4.1", "6.1", "7.1", "8.1", "9.1", "10", "11", "13.1", "14.1", "15.1", "16.1"] },
    { "id": 1, "tasks": ["2.2", "3.2", "4.2", "6.2", "7.2", "8.2", "9.2", "13.2", "14.2", "15.2", "16.2"] },
    { "id": 2, "tasks": ["4.3", "4.4", "9.3", "13.3", "13.4", "14.3", "15.3", "16.3", "16.4"] },
    { "id": 3, "tasks": ["17.1"] },
    { "id": 4, "tasks": ["17.2", "17.3"] }
  ]
}
```
