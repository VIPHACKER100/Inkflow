# Requirements Document

## Introduction

This document specifies requirements for advanced Inkflow features covering two main areas: **Rendering & Realism Enhancements** and **AI Features**. These enhancements target improved handwriting authenticity, multi-language support (especially Hindi/Devanagari), and AI-powered educational workflows for Indian students.

The features build upon Inkflow's existing handwriting synthesis engine, unified layout engine, and AI integration architecture to deliver contextual character variation, smudge effects, cursive rendering, multi-pen support, AI-powered doubt solving, diagram generation, voice-to-notes pipelines, and bilingual Hinglish support.

---

## Glossary

- **Character_Variation_Engine**: The system component that applies randomized transforms (tilt, scale, baseline offset, pressure) to each character glyph during rendering
- **Layout_Engine**: The `layoutText()` function that computes character coordinates, word-wrap, and page-break logic
- **Render_Context**: The 2D canvas context object used for drawing glyphs
- **Position_Context**: The character's position metadata including line position (start/mid/end), word position, character index, and line index
- **Smudge_Effect**: Visual artifacts simulating eraser marks or ink smudges on paper
- **Ligature**: Connected letter forms where two or more characters join with a continuous stroke
- **Cursive_Mode**: A rendering mode where letters connect with continuous strokes rather than isolated glyphs
- **Pen_Profile**: A configuration object defining ink color, pressure, blur, and font properties
- **Text_Type**: A classification of text content (heading, body, bullet, emphasis) derived from markdown structure
- **Doubt_Solver**: An AI workflow that generates step-by-step handwritten solutions to math/science problems
- **Diagram_Generator**: An AI system that creates hand-drawn style diagrams from text descriptions
- **Voice_Pipeline**: An in-browser audio recording and transcription system integrated with AI note generation
- **Hinglish**: Mixed Hindi-English text common in Indian student notes, requiring automatic script detection and font switching
- **Devanagari**: The script used for Hindi and several other Indic languages
- **Conjunct_Consonant**: Complex character combinations in Devanagari script (matras and ligatures)
- **Grammar_Corrector**: An AI workflow that fixes grammar and spelling errors in user text
- **Audio_Recorder**: Browser-based audio capture component using MediaRecorder API
- **Transcription_Service**: Speech-to-text conversion service for audio input
- **Script_Detector**: Component that identifies whether text segments are Latin, Devanagari, or mixed
- **Font_Switcher**: Component that automatically switches fonts based on detected script
- **Pretty_Printer**: A formatter that converts data structures back into valid text representation

---

## Requirements

### Requirement 1: Contextual Per-Character Jitter

**User Story:** As a student, I want my handwritten notes to look naturally varied based on letter position, so that the output appears like authentic handwriting rather than mechanically repeated glyphs.

#### Acceptance Criteria

1. WHEN a character is at line-start position, THE Character_Variation_Engine SHALL apply increased pressure variation (1.2× base pressure)
2. WHEN a character is at line-end position, THE Character_Variation_Engine SHALL apply increased slant variation (1.3× base rotation)
3. WHEN a character is in mid-word position, THE Character_Variation_Engine SHALL apply standard variation parameters
4. WHEN rendering a sequence of 50+ characters on the same line, THE Character_Variation_Engine SHALL progressively decrease baseline stability by 0.02 pixels per character to simulate handwriting fatigue
5. THE Character_Variation_Engine SHALL reset fatigue accumulation at each line break
6. FOR ALL characters, THE Character_Variation_Engine SHALL compute position context (line-start, line-end, mid-word, character-count-in-line) before applying variation
7. WHEN character count in current line exceeds 80, THE Character_Variation_Engine SHALL increase spacing randomization by 1.5× to simulate hand cramping
8. THE Character_Variation_Engine SHALL preserve existing proportional scaling based on fontSize/22

### Requirement 2: Smudge and Eraser Effects

**User Story:** As a student, I want optional smudge marks and eraser effects on my notes, so that I can create a "lived-in notebook" aesthetic for more authentic-looking study materials.

#### Acceptance Criteria

1. THE System SHALL provide a toggle control labeled "Smudge Effects" in the user interface
2. WHEN smudge effects are enabled, THE Render_Context SHALL render 2-5 semi-transparent gray overlay shapes per page
3. WHEN rendering a smudge shape, THE Render_Context SHALL use opacity between 0.05 and 0.15
4. WHEN rendering a smudge shape, THE Render_Context SHALL use dimensions between 40-120 pixels width and 15-40 pixels height
5. WHEN positioning smudge shapes, THE System SHALL place them at random coordinates with the top edge starting below the first 100 pixels of each page
5.1 WHERE a smudge shape starts below the 100-pixel exclusion zone, THE System SHALL allow the shape to extend into the exclusion zone
6. WHEN smudge effects are disabled, THE Render_Context SHALL render no smudge overlay shapes
7. THE System SHALL persist the smudge effects toggle state to localStorage
8. WHEN rendering an eraser effect, THE Render_Context SHALL use a slightly lighter opacity (0.03-0.08) compared to smudge effects
9. FOR ALL smudge and eraser effects, THE Render_Context SHALL render them before text content in the drawing order

### Requirement 3: Ligatures and Connected Cursive

**User Story:** As a user preferring cursive handwriting, I want letters to connect with continuous strokes rather than appearing as isolated glyphs, so that my notes match authentic cursive penmanship.

#### Acceptance Criteria

1. THE System SHALL provide a toggle control labeled "Cursive Mode" in the user interface for English fonts
2. WHEN cursive mode is enabled AND consecutive characters are lowercase English letters, THE Render_Context SHALL render connection strokes between character pairs
3. WHEN rendering a connection stroke, THE Render_Context SHALL draw a quadratic Bezier curve from the exit point of character N to the entry point of character N+1
4. THE System SHALL define ligature pairs for common English letter combinations (th, ch, sh, st, ct, ll, ff, fi, fl)
5. WHEN rendering a defined ligature pair, THE Render_Context SHALL use a pre-defined connected glyph shape instead of two separate characters
6. WHEN a character is uppercase OR followed by whitespace OR followed by punctuation, THE Render_Context SHALL NOT render a connection stroke
7. THE Cursive_Mode SHALL only apply to Latin script characters and SHALL NOT affect Devanagari rendering
8. WHEN cursive mode is disabled, THE Render_Context SHALL render all characters as isolated glyphs using existing rendering logic
8.1 IF existing rendering logic fails, THE Render_Context SHALL fall back to a basic rendering method
8.2 WHEN cursive mode is disabled, THE Render_Context SHALL maintain consistent ink properties across all characters
9. FOR ALL connection strokes, THE Render_Context SHALL apply the same ink color and pressure variation as the surrounding characters

### Requirement 4: Multi-Pen Support Per Note

**User Story:** As a student organizing complex notes, I want headings and body text to render in different pen colors automatically, so that my notes have visual hierarchy without manual formatting.

#### Acceptance Criteria

1. THE System SHALL detect heading markers (# symbols) in input text before markdown stripping
2. THE System SHALL detect bullet point markers (- or * symbols) in input text before markdown stripping
3. THE System SHALL classify each text segment into Text_Type categories (heading, body, bullet, emphasis)
4. THE System SHALL provide a configuration interface for defining Pen_Profiles with properties (inkColor, pressure, blur, fontFamily)
5. THE System SHALL allow users to assign a Pen_Profile to each Text_Type
6. WHEN rendering text of a specific Text_Type, THE Render_Context SHALL apply the corresponding Pen_Profile properties only when that text is actively being rendered to the screen
6.1 IF Pen_Profile properties fail to load, THE Render_Context SHALL block rendering until profiles are available to ensure consistent styling
7. THE System SHALL provide default Pen_Profile assignments (heading: blue bold, body: black standard, bullet: black medium, emphasis: dark-blue italic)
8. THE System SHALL persist Pen_Profile configurations to localStorage
9. WHEN markdown structure is detected, THE System SHALL preserve structure metadata through the rendering pipeline even after stripping markdown symbols
10. FOR ALL Pen_Profile switches within a page, THE Render_Context SHALL complete the current word before switching to avoid mid-word color changes

### Requirement 5: Doubt-Solver Mode

**User Story:** As an Indian student studying math or physics, I want to paste a problem and receive a handwritten step-by-step solution, so that I can understand problem-solving workflows in a familiar handwritten format.

#### Acceptance Criteria

1. THE System SHALL provide a user interface button labeled "Doubt Solver"
2. WHEN the Doubt Solver button is clicked AND input text contains a question, THE Doubt_Solver SHALL send a request to the configured AI provider
3. THE Doubt_Solver SHALL use a system prompt instructing the AI to generate step-by-step solutions with clear working and explanations
4. WHEN the AI response streams in, THE System SHALL render the solution text incrementally using the existing SSE streaming mechanism
5. THE Doubt_Solver SHALL format solution steps with clear numbering (Step 1:, Step 2:, etc.)
6. THE Doubt_Solver SHALL include mathematical working, intermediate calculations, and final answers in the output
7. WHEN the input text is empty, THE System SHALL display an error toast "Please enter a problem to solve"
8. THE Doubt_Solver SHALL support mathematical notation in plain-text format (e.g., x^2, sqrt(x), integral symbols)
9. THE Doubt_Solver system prompt SHALL instruct the AI to target Indian curriculum standards (CBSE, ICSE, State Boards)
10. FOR ALL Doubt_Solver outputs, THE System SHALL render the response using the current handwriting settings (font, color, pressure)

### Requirement 6: AI-Generated Diagrams

**User Story:** As a biology student, I want to generate simple hand-drawn style diagrams from text descriptions, so that I can add visual elements to my notes without drawing skills.

#### Acceptance Criteria

1. THE System SHALL provide a user interface button labeled "Generate Diagram"
2. WHEN the Generate Diagram button is clicked AND input text contains a diagram description, THE Diagram_Generator SHALL send a request to the configured AI provider
3. THE Diagram_Generator SHALL use a system prompt instructing the AI to output SVG path commands for simple diagrams
4. THE Diagram_Generator SHALL support diagram types (cycle diagrams, flowcharts, labeled structures, simple shapes with labels)
5. WHEN the AI returns SVG path data, THE Render_Context SHALL render the paths on the canvas using hand-drawn stroke styling
6. WHEN rendering diagram strokes, THE Render_Context SHALL apply slight waviness to straight lines to simulate hand-drawing
7. WHEN rendering diagram labels, THE System SHALL use the current handwriting font and variation settings
8. THE Diagram_Generator SHALL scale output diagrams to fit within page margins (max 80% of page width)
9. WHEN the input text does not describe a diagram, THE System SHALL display an error toast "Could not interpret diagram description"
10. FOR ALL diagram strokes, THE Render_Context SHALL use the current ink color and apply pressure variation

### Requirement 7: Voice to Notes Pipeline

**User Story:** As a student attending lectures, I want to record audio directly in the browser and convert it to handwritten notes, so that I can capture lecture content without manual typing.

#### Acceptance Criteria

1. THE System SHALL provide a user interface button labeled "Record Lecture"
2. WHEN the Record Lecture button is clicked, THE Audio_Recorder SHALL request microphone permission from the browser
3. WHEN microphone permission is granted, THE Audio_Recorder SHALL start recording audio using the MediaRecorder API
4. WHEN recording is active, THE System SHALL display a visual indicator (pulsing red dot and timer)
5. WHEN the user clicks stop recording, THE Audio_Recorder SHALL finalize the audio file as a Blob
6. WHEN audio recording is complete, THE Transcription_Service SHALL convert the audio to text
7. WHEN transcription is complete, THE System SHALL feed the transcript text to the existing Lecture-to-Notes AI workflow
8. WHEN the AI processes the transcript, THE System SHALL render the cleaned notes incrementally using SSE streaming
9. IF microphone permission is denied, THE System SHALL display an error toast "Microphone access required for recording"
10. THE Audio_Recorder SHALL support pause/resume functionality during recording
11. THE System SHALL display estimated recording duration and file size during recording
12. FOR ALL transcription requests, THE Transcription_Service SHALL use browser-native Web Speech API or configured third-party transcription provider

### Requirement 8: Multi-Language Mixing (Hinglish Support)

**User Story:** As an Indian student writing notes in Hinglish (mixed Hindi-English), I want automatic script detection and font switching mid-sentence, so that both languages render correctly without manual font selection.

#### Acceptance Criteria

1. WHEN the Layout_Engine processes text, THE Script_Detector SHALL identify script boundaries (Latin vs Devanagari) within the text
2. WHEN consecutive characters belong to different scripts, THE Font_Switcher SHALL switch font-family between Latin and Devanagari fonts
3. THE Script_Detector SHALL use Unicode ranges to classify characters (U+0900-U+097F for Devanagari, U+0041-U+007A and U+0061-U+007A for basic Latin)
4. WHEN rendering a Devanagari segment, THE Render_Context SHALL use the configured Devanagari font (Noto Sans Devanagari, Hind, or custom)
5. WHEN rendering a Latin segment, THE Render_Context SHALL use the configured English font
6. THE Font_Switcher SHALL maintain consistent baseline alignment when switching between scripts
7. THE Font_Switcher SHALL complete font transitions at word boundaries to avoid mid-word font changes
8. FOR ALL mixed-script text, THE Layout_Engine SHALL measure character widths using the correct font for each segment
9. THE System SHALL apply reduced tilt (30% of base tilt) to Devanagari segments to preserve ligature integrity
10. WHEN both scripts appear on the same line, THE Render_Context SHALL apply consistent ink color and pressure across script boundaries

### Requirement 9: Devanagari Quality Improvements

**User Story:** As a Hindi-writing student, I want high-quality rendering of complex Devanagari characters (matras and ligatures), so that my Hindi notes are as readable as English notes.

#### Acceptance Criteria

1. THE System SHALL audit the current Devanagari font rendering for conjunct consonant quality
2. THE System SHALL identify specific Unicode codepoint ranges for matras (U+093E-U+094F) and common conjunct consonants
3. WHEN rendering a conjunct consonant, THE Render_Context SHALL verify the glyph renders correctly by checking bounding box dimensions
4. IF a conjunct consonant renders with zero width OR height, THE System SHALL substitute with a fallback font from the Devanagari font stack
5. THE System SHALL provide a configuration option for users to test and select preferred Devanagari fonts
6. THE System SHALL include a test string containing common problematic conjuncts (क्ष, त्र, ज्ञ, श्र) in the font selection interface
7. WHEN a user selects a Devanagari font, THE System SHALL render the test string in real-time preview
8. THE System SHALL document known font quality issues and recommended Devanagari fonts in user documentation
9. FOR ALL Devanagari text rendering, THE Render_Context SHALL use subpixel antialiasing for improved clarity
10. THE System SHALL apply slightly increased font size (1.1× multiplier) to Devanagari characters to match perceived size of Latin characters

### Requirement 10: Hindi Grammar Correction

**User Story:** As a Hindi-writing student, I want grammar and spelling correction for my Hindi text, so that I can produce error-free notes in my native language.

#### Acceptance Criteria

1. THE Grammar_Corrector SHALL detect the primary language of input text (English, Hindi, or mixed)
2. WHEN input text is primarily Hindi (>50% Devanagari characters), THE Grammar_Corrector SHALL use a Hindi-capable AI model for correction
3. WHEN input text is mixed Hinglish, THE Grammar_Corrector SHALL request bilingual grammar correction from the AI provider
4. THE Grammar_Corrector system prompt SHALL instruct the AI to fix grammar, spelling, and phrasing errors while preserving original meaning
5. THE Grammar_Corrector SHALL preserve script integrity (not transliterate Hindi to English or vice versa)
6. WHEN the corrected text is returned, THE System SHALL render it using the existing handwriting rendering pipeline
7. THE System SHALL provide a side-by-side comparison view showing original text and corrected text
8. THE System SHALL allow users to accept or reject corrections before rendering to canvas
8.1 IF the user closes the correction interface without making a choice, THE System SHALL treat no response as rejection and discard the corrections
9. IF the AI provider does not support Hindi grammar correction, THE System SHALL display an error toast "Hindi grammar correction requires a compatible AI model"
9.1 WHEN a compatible AI model for Hindi grammar correction is available, THE System SHALL display a brief confirmation like 'Using Hindi grammar model' before processing the correction
10. FOR ALL grammar correction requests, THE Grammar_Corrector SHALL preserve text formatting (line breaks, spacing, structure)

### Requirement 11: Parse Markdown Structure

**User Story:** As a developer integrating multi-pen support, I want to parse markdown symbols before stripping them, so that text type metadata is preserved for pen profile assignment.

#### Acceptance Criteria

1. THE System SHALL provide a Parser component that accepts raw markdown text as input
2. THE Parser SHALL identify heading markers (# symbols at line start) and extract heading level (1-6)
3. THE Parser SHALL identify bullet markers (- or * followed by space at line start)
4. THE Parser SHALL identify emphasis markers (* or _ surrounding text)
5. THE Parser SHALL output a structured data format containing text segments with associated Text_Type metadata
6. THE Pretty_Printer SHALL convert the structured data format back to plain text for rendering
7. FOR ALL parsed segments, THE Parser SHALL preserve original character positions for coordinate mapping
8. THE Parser SHALL handle nested markdown structures (e.g., emphasis within bullets)
9. THE Parser SHALL strip markdown symbols from the display text while preserving them in metadata
10. WHEN parsing completes, THE System SHALL pass the structured data to the Layout_Engine for rendering with appropriate Pen_Profiles

### Requirement 12: Round-Trip Markdown Parsing

**User Story:** As a developer ensuring parsing correctness, I want markdown parsing and pretty-printing to be invertible, so that I can verify parsing logic is correct.

#### Acceptance Criteria

1. FOR ALL valid markdown input text, THE Pretty_Printer SHALL convert Parser output back to equivalent markdown text
2. WHEN markdown text is parsed then pretty-printed then parsed again, THE resulting structured data SHALL be equivalent to the first parse
3. THE System SHALL provide a test suite that validates round-trip property for common markdown patterns
4. THE test suite SHALL include test cases for headings, bullets, emphasis, mixed structures, and edge cases
5. WHEN a round-trip test fails, THE System SHALL log the input, intermediate states, and final output for debugging

---

## Acceptance Criteria Testing Approach

The following requirements lend themselves to property-based testing:

- **Requirement 1 (Contextual Jitter)**: Test that variation parameters stay within expected bounds across random text inputs and that fatigue resets correctly at line breaks
- **Requirement 8 (Hinglish Support)**: Test that script detection correctly identifies boundaries across random mixed Hindi-English text
- **Requirement 11 & 12 (Markdown Parsing)**: Test round-trip property with randomly generated markdown structures

The following requirements are better suited to example-based integration testing:

- **Requirements 2, 3, 4**: Visual rendering features requiring human validation of output quality
- **Requirements 5, 6, 7, 10**: AI-dependent features requiring integration with external services
- **Requirement 9**: Font quality audit requiring visual inspection and manual testing

---

## Non-Functional Requirements

### Performance
- Character variation computation SHALL add no more than 5ms per 1000 characters to render time
- Script detection SHALL process at minimum 10,000 characters per second
- Markdown parsing SHALL complete in under 50ms for documents up to 10,000 characters

### Compatibility
- Voice recording SHALL work in Chrome, Edge, and Safari browsers supporting MediaRecorder API
- Devanagari rendering SHALL support Unicode 13.0+ specification
- AI features SHALL work with OpenRouter and Anthropic Claude providers

### Accessibility
- All new UI controls SHALL be keyboard navigable
- All new UI controls SHALL include ARIA labels
- Visual indicators (recording status, diagram rendering) SHALL include text alternatives

### Security
- Audio recording SHALL require explicit user permission
- Recorded audio SHALL remain client-side (not transmitted except for transcription)
- API keys for transcription services SHALL be stored securely in localStorage with encryption

---

## Future Considerations

- Support for additional Indic scripts (Bengali, Tamil, Telugu, Gujarati)
- Advanced diagram types (chemical structures, circuit diagrams, geometric constructions)
- Collaborative note-taking with real-time sync
- Export of voice recordings alongside handwritten notes
- Offline transcription using browser-native models
