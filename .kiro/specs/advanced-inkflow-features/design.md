# Design Document: Advanced InkFlow Features

## Overview

This design introduces four advanced feature enhancements to the InkFlow handwriting application: **Real-Time Collaborative Writing**, **Smart Stroke Prediction**, **Advanced Template System**, and **Multi-Layer Canvas Architecture**. These features extend InkFlow's capabilities to support collaborative workflows, predictive handwriting assistance, flexible document templates, and sophisticated layer-based composition while maintaining the existing architecture's modularity and performance characteristics.

The design leverages InkFlow's existing unified layout engine (`layoutText`), animation system, state management, and export pipelines while introducing new subsystems for real-time synchronization, machine learning inference, template management, and layer composition.

## Architecture

### High-Level System Architecture

```mermaid
graph TD
    subgraph UI_Layer [User Interface Layer - Extended]
        A[Control Console / Sidebar]
        B[Floating Top Toolbar]
        C[Canvas Viewport + Page Editors]
        D[Floating Pagination Controls]
        E[NEW: Collaboration Panel]
        F[NEW: Template Selector]
        G[NEW: Layer Manager]
        H[NEW: Stroke Predictor HUD]
    end

    subgraph State_Layer [State Management Layer - Extended]
        I[Global State Object S]
        J[Debounced Autosave Module]
        K[LocalStorage Interface]
        L[IndexedDB Glyph Store]
        M[NEW: CollabState Manager]
        N[NEW: LayerState Manager]
        O[NEW: TemplateState Manager]
    end

    subgraph Engine_Layer [Core Execution Engines - Extended]
        P[Paper Renderer]
        Q[Glyph Variation Engine]
        R[layoutText - Unified Layout Engine]
        S[Writing Queue & Animation Engine]
        T[Page Editor Sync Layer]
        U[NEW: Collaborative Sync Engine]
        V[NEW: Stroke Prediction Engine]
        W[NEW: Template Renderer]
        X[NEW: Layer Compositor]
    end

    subgraph External_Layer [Integration & Export Services - Extended]
        Y[OpenRouter / Anthropic Claude API]
        Z[Blob URL Export]
        AA[jsPDF Multi-Page Compiler]
        AB[Clipboard API]
        AC[OS Print Spooler]
        AD[NEW: WebSocket Server]
        AE[NEW: ML Model Service - TensorFlow.js]
        AF[NEW: Template Repository API]
    end

    A -->|User Input Events| I
    E -->|Collab Actions| M
    F -->|Template Selection| O
    G -->|Layer Operations| N
    H -->|Prediction Events| I
    
    I -->|State Sync| J
    M -->|Real-time Updates| U
    N -->|Layer Composition Triggers| X
    O -->|Template Load| W
    
    J -->|Serialized Save| K
    L -->|Glyph Data Hydration| I
    
    U -->|WebSocket Messages| AD
    V -->|ML Inference| AE
    W -->|Template Fetch| AF
    
    R -->|Char Queue + Page Texts| S
    R -->|Layout Data| X
    X -->|Composited Canvas| C
    U -->|Remote Changes| T
    V -->|Predicted Strokes| Q
```

### Feature Architecture Integration

```mermaid
graph LR
    A[Existing InkFlow Core] --> B[Real-Time Collaborative Writing]
    A --> C[Smart Stroke Prediction]
    A --> D[Advanced Template System]
    A --> E[Multi-Layer Canvas Architecture]
    
    B --> F[WebSocket Sync Layer]
    B --> G[Conflict Resolution Engine]
    B --> H[User Presence System]
    
    C --> I[Stroke Buffer]
    C --> J[TensorFlow.js Model]
    C --> K[Prediction Renderer]
    
    D --> L[Template Parser]
    D --> M[Dynamic Zone System]
    D --> N[Template Repository]
    
    E --> O[Layer Stack Manager]
    E --> P[Blend Mode Engine]
    E --> Q[Layer-Aware Export]
```

## Sequence Diagrams

### Real-Time Collaborative Writing Flow

```mermaid
sequenceDiagram
    participant U1 as User 1 Browser
    participant CS1 as CollabState Manager
    participant WS as WebSocket Server
    participant CS2 as CollabState Manager
    participant U2 as User 2 Browser

    U1->>CS1: Type character "H"
    CS1->>CS1: Create operation {type: "insert", pos: 0, char: "H", userId: "u1", timestamp: t1}
    CS1->>CS1: Apply operation to local state
    CS1->>WS: Send operation via WebSocket
    WS->>CS2: Broadcast operation to peers
    CS2->>CS2: Transform operation against concurrent ops
    CS2->>CS2: Apply transformed operation
    CS2->>U2: Render character "H" at position 0
    CS2->>WS: Send acknowledgment
    WS->>CS1: Relay acknowledgment
    
    Note over U1,U2: Concurrent Edit Scenario
    U1->>CS1: Delete at position 5
    U2->>CS2: Insert "e" at position 3
    CS1->>WS: Send delete operation
    CS2->>WS: Send insert operation
    WS->>CS1: Broadcast insert from U2
    WS->>CS2: Broadcast delete from U1
    CS1->>CS1: Transform insert against local delete (OT)
    CS2->>CS2: Transform delete against local insert (OT)
    CS1->>U1: Apply transformed insert
    CS2->>U2: Apply transformed delete
```

### Smart Stroke Prediction Flow

```mermaid
sequenceDiagram
    participant User as User Input
    participant Buffer as Stroke Buffer
    participant Model as TensorFlow.js Model
    participant Render as Prediction Renderer
    participant Canvas as Canvas Context

    User->>Buffer: Type characters "The quick br"
    Buffer->>Buffer: Store last N characters (N=20)
    Buffer->>Model: Request prediction for next characters
    Model->>Model: Tokenize input sequence
    Model->>Model: Run inference (forward pass)
    Model->>Model: Sample top-K predictions (K=5)
    Model->>Render: Return predictions ["own", "ight", "eakfast", "eak", "idge"]
    Render->>Canvas: Draw ghost text overlay with predictions
    Canvas->>User: Display predictions with opacity 0.3
    
    alt User accepts prediction
        User->>Buffer: Press Tab key
        Buffer->>Buffer: Append top prediction "own"
        Buffer->>Canvas: Render accepted text
        Buffer->>Model: Update context with accepted text
    else User continues typing
        User->>Buffer: Type "o"
        Buffer->>Model: Request new prediction for "The quick bro"
        Model->>Render: Return updated predictions
        Render->>Canvas: Update ghost overlay
    end
```

### Template System Flow

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Template Selector UI
    participant Parser as Template Parser
    participant Renderer as Template Renderer
    participant Canvas as Canvas Context

    User->>UI: Select "Cornell Notes" template
    UI->>Parser: Load template definition JSON
    Parser->>Parser: Parse zones, guides, constraints
    Parser->>Parser: Validate zone boundaries
    Parser->>Renderer: Pass parsed template config
    Renderer->>Canvas: Draw template guides (dividers, labels)
    Renderer->>Canvas: Create text zones with boundaries
    User->>Canvas: Type text in "Notes" zone
    Renderer->>Renderer: Check zone overflow
    alt Text exceeds zone boundary
        Renderer->>Renderer: Apply zone-constrained word wrap
        Renderer->>Canvas: Render text within zone bounds
    else Text fits within zone
        Renderer->>Canvas: Render text normally
    end
    User->>UI: Switch to "Summary" zone
    Canvas->>Canvas: Set active zone to Summary
    User->>Canvas: Type summary text
    Renderer->>Canvas: Render in Summary zone with zone-specific styling
```

### Multi-Layer Canvas Flow

```mermaid
sequenceDiagram
    participant User as User
    participant LayerMgr as Layer Manager
    participant Compositor as Layer Compositor
    participant Canvas as Canvas Context

    User->>LayerMgr: Create new layer "Annotations"
    LayerMgr->>LayerMgr: Add layer to stack with z-index
    LayerMgr->>Canvas: Create offscreen canvas for layer
    User->>LayerMgr: Set blend mode to "Multiply"
    LayerMgr->>LayerMgr: Update layer.blendMode property
    User->>Canvas: Draw on "Annotations" layer
    Canvas->>Canvas: Render to offscreen canvas
    Compositor->>Compositor: Begin composite operation
    loop For each layer in z-order
        Compositor->>Compositor: Check layer visibility
        Compositor->>Compositor: Apply layer opacity
        Compositor->>Compositor: Apply blend mode
        Compositor->>Canvas: Draw layer to main canvas
    end
    Canvas->>User: Display composited result
    
    User->>LayerMgr: Toggle layer visibility
    LayerMgr->>LayerMgr: Set layer.visible = false
    LayerMgr->>Compositor: Trigger recomposite
    Compositor->>Canvas: Redraw without hidden layer
```

## Components and Interfaces

### Component 1: Collaborative Sync Engine

**Purpose**: Manages real-time synchronization of document changes across multiple connected clients using Operational Transformation (OT) for conflict resolution.

**Interface**:
```pascal
INTERFACE CollaborativeEngine
  PROCEDURE initialize(documentId, userId, websocketUrl)
  PROCEDURE connect()
  PROCEDURE disconnect()
  PROCEDURE sendOperation(operation)
  PROCEDURE receiveOperation(operation)
  PROCEDURE transformOperation(localOp, remoteOp)
  PROCEDURE applyOperation(operation)
  PROCEDURE getDocumentState()
  PROCEDURE getUserPresence()
END INTERFACE
```

**Responsibilities**:
- Establish and maintain WebSocket connection to collaboration server
- Serialize local text operations into operational transform messages
- Transform incoming remote operations against pending local operations
- Apply transformed operations to maintain consistency
- Track cursor positions and user presence indicators
- Handle connection recovery and state reconciliation

### Component 2: Stroke Prediction Engine

**Purpose**: Provides real-time text prediction using a trained neural language model to suggest likely continuations of the current writing context.

**Interface**:
```pascal
INTERFACE StrokePredictionEngine
  PROCEDURE initialize(modelPath, vocabSize, embeddingDim)
  PROCEDURE loadModel()
  PROCEDURE predict(contextText, topK)
  PROCEDURE updateContext(newText)
  PROCEDURE acceptPrediction(predictionIndex)
  PROCEDURE getConfidenceScore(prediction)
  PROCEDURE setTemperature(temperature)
END INTERFACE
```

**Responsibilities**:
- Load and initialize TensorFlow.js language model
- Maintain rolling context buffer of recent characters
- Tokenize input text using byte-pair encoding vocabulary
- Run inference to generate top-K predictions
- Calculate confidence scores for predictions
- Manage temperature parameter for sampling diversity
- Update model state when predictions are accepted

### Component 3: Template Manager

**Purpose**: Loads, parses, and manages document templates with dynamic zones, guides, and layout constraints.

**Interface**:
```pascal
INTERFACE TemplateManager
  PROCEDURE loadTemplate(templateId)
  PROCEDURE parseTemplate(templateJson)
  PROCEDURE getZones()
  PROCEDURE getActiveZone()
  PROCEDURE setActiveZone(zoneId)
  PROCEDURE validateZoneContent(zoneId, text)
  PROCEDURE renderTemplateGuides(canvasContext)
  PROCEDURE saveCustomTemplate(templateConfig)
END INTERFACE
```

**Responsibilities**:
- Fetch template definitions from repository or local storage
- Parse template JSON to extract zones, guides, and constraints
- Validate zone boundaries and configuration
- Render static template elements (dividers, labels, backgrounds)
- Enforce text flow constraints within zone boundaries
- Support custom template creation and persistence

### Component 4: Layer Compositor

**Purpose**: Manages a stack of independent canvas layers with blend modes, opacity, and visibility controls for sophisticated composition.

**Interface**:
```pascal
INTERFACE LayerCompositor
  PROCEDURE createLayer(name, zIndex)
  PROCEDURE deleteLayer(layerId)
  PROCEDURE setLayerProperty(layerId, property, value)
  PROCEDURE reorderLayers(layerId, newZIndex)
  PROCEDURE getLayerCanvas(layerId)
  PROCEDURE composite(targetCanvas)
  PROCEDURE exportLayerStack(format)
END INTERFACE
```

**Responsibilities**:
- Create and manage offscreen canvases for each layer
- Handle layer z-index ordering and reordering
- Apply blend modes (normal, multiply, screen, overlay, etc.)
- Apply per-layer opacity and visibility
- Composite all visible layers to target canvas
- Export layer stack with metadata for re-editing

## Data Models

### Model 1: CollaborationOperation

```pascal
STRUCTURE CollaborationOperation
  id: UUID
  type: OperationType
  position: Integer
  content: String
  userId: String
  timestamp: Integer
  vectorClock: Map<String, Integer>
  isTransformed: Boolean
END STRUCTURE

ENUM OperationType
  INSERT
  DELETE
  REPLACE
  CURSOR_MOVE
END ENUM
```

**Validation Rules**:
- `id` must be unique UUID v4
- `type` must be valid OperationType enum value
- `position` must be >= 0 and <= document length
- `content` required for INSERT and REPLACE, empty for DELETE
- `userId` must match authenticated session user
- `timestamp` must be monotonically increasing for operations from same user
- `vectorClock` must contain entries for all active collaborators
