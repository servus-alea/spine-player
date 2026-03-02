# SpinePlayer React

A React component library for playing **Spine animations** (JSON format), inspired by the simplicity of Lottie Player.

Drop in a `<SpinePlayer>` component, pass your Spine JSON, and you're animating.

---

## Installation

```bash
npm install spine-player-react
```

```bash
yarn add spine-player-react
```

```bash
pnpm add spine-player-react
```

**Peer dependencies:** React >= 16.8.0

---

## Quick Start

```tsx
import SpinePlayer from 'spine-player-react';

function App() {
  return (
    <SpinePlayer
      src="/assets/character.json"
      animation="idle"
      loop={true}
      autoplay={true}
      width={400}
      height={400}
    />
  );
}
```

## TypeScript

Full TypeScript support out of the box. All types are exported:

```tsx
import SpinePlayer, {
  type SpinePlayerProps,
  type SpinePlayerHandle,
  type SpineJsonData,
  type SpineAnimation,
  type ReadyData,
  type FrameData,
} from 'spine-player-react';
import { useRef } from 'react';

function App() {
  const playerRef = useRef<SpinePlayerHandle>(null);

  const handleReady = (data: ReadyData) => {
    console.log('Animations:', data.animations);
  };

  return (
    <SpinePlayer
      ref={playerRef}
      src="/assets/character.json"
      animation="idle"
      onReady={handleReady}
    />
  );
}
```

## Features

- **Full TypeScript support** — complete type definitions for all APIs
- **Zero dependencies** — pure React + Canvas2D renderer
- **Spine JSON parser** — supports Spine 3.x and 4.x JSON format
- **Bone animation** — rotation, translation, scale with interpolation
- **Slot rendering** — color tinting, attachment switching, draw order
- **Bezier curves** — smooth easing via cubic bezier curve support
- **Built-in controls** — play/pause, seek, speed, animation selector
- **Debug mode** — visualize bone hierarchy and joints
- **Imperative API** — `ref` based control (play, pause, seek, etc.)
- **Custom hook** — `useSpinePlayer()` for advanced integration
- **ESM & CJS** — works with all bundlers and Node.js
- **Lightweight** — ~15KB unminified, no external runtime needed

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string \| SpineJsonData \| null` | `null` | URL to Spine JSON or JSON object |
| `jsonData` | `string \| SpineJsonData \| null` | `null` | Direct JSON data (alternative to src) |
| `animation` | `string` | `""` | Animation name to play |
| `skin` | `string` | `"default"` | Active skin name |
| `loop` | `boolean` | `true` | Loop the animation |
| `autoplay` | `boolean` | `true` | Auto-play on load |
| `speed` | `number` | `1` | Playback speed multiplier |
| `direction` | `number` | `1` | 1 = forward, -1 = reverse |
| `width` | `number` | `400` | Canvas width (px) |
| `height` | `number` | `400` | Canvas height (px) |
| `background` | `string` | `"transparent"` | Canvas background color |
| `debug` | `boolean` | `false` | Show bone debug overlay |
| `showControls` | `boolean` | `false` | Show built-in player controls |
| `className` | `string` | `""` | CSS class for container |
| `style` | `CSSProperties` | `{}` | Inline styles for container |
| `dpr` | `number` | `devicePixelRatio` | Device pixel ratio for retina |

## Callbacks

| Callback | Args | Description |
|----------|------|-------------|
| `onReady` | `ReadyData` | Fired when skeleton is loaded |
| `onComplete` | — | Fired when animation completes (non-loop) |
| `onLoop` | — | Fired each time animation loops |
| `onEvent` | `SpineKeyframe` | Fired on Spine events |
| `onError` | `Error` | Fired on load/parse errors |
| `onFrame` | `FrameData` | Fired every render frame |

## Imperative API (ref)

```tsx
import { useRef } from 'react';
import SpinePlayer, { type SpinePlayerHandle } from 'spine-player-react';

function App() {
  const playerRef = useRef<SpinePlayerHandle>(null);

  return (
    <>
      <SpinePlayer ref={playerRef} src={data} />
      <button onClick={() => playerRef.current?.play()}>Play</button>
    </>
  );
}

// Control methods
playerRef.current.play();
playerRef.current.pause();
playerRef.current.stop();
playerRef.current.setAnimation('walk');
playerRef.current.setSpeed(2);
playerRef.current.setLoop(false);
playerRef.current.seek(0.5); // seek to 50%

// Getters
playerRef.current.isPlaying();        // boolean
playerRef.current.getProgress();       // number
playerRef.current.getAnimations();     // string[]
playerRef.current.getSkins();          // string[]
playerRef.current.getSkeletonData();   // SpineSkeletonData | null
playerRef.current.getAnimationState(); // SpineAnimationState | null
playerRef.current.getCanvas();         // HTMLCanvasElement | null
```

## Custom Hook

For maximum flexibility, use `useSpinePlayer()`:

```tsx
import { useSpinePlayer } from 'spine-player-react';
import { useEffect } from 'react';

function CustomPlayer({ jsonUrl }: { jsonUrl: string }) {
  const {
    canvasRef,
    isLoaded, error,
    isPlaying, progress,
    load, play, pause, stop,
    setAnimation, setSpeed, setLoop, seek,
    skeletonData,
  } = useSpinePlayer({ animation: 'idle', loop: true });

  useEffect(() => {
    load(jsonUrl);
  }, [jsonUrl, load]);

  return (
    <div>
      <canvas ref={canvasRef} width={400} height={400} />
      <button onClick={isPlaying ? pause : play}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
}
```

## Exported Types

```ts
// Component & Hook types
SpinePlayerProps
SpinePlayerHandle
UseSpinePlayerOptions
UseSpinePlayerReturn

// Data types
SpineJsonData
SpineJsonBone
SpineJsonSlot
SpineJsonSkeleton
SpineKeyframe
SpineAnimation
SpineAttachment
SpineSkinSlot
SpineSkinData
SpineSkins
SpineBoneTimelines
SpineSlotTimelines
ParsedBone
ParsedSlot
BoneTransform
BoneTreeNode

// Callback types
SpineEventType
FrameData
ReadyData
```

## Spine JSON Format

The library parses standard Spine JSON export format:

```json
{
  "skeleton": { "spine": "3.8", "width": 200, "height": 400 },
  "bones": [
    { "name": "root" },
    { "name": "hip", "parent": "root", "y": 120 },
    { "name": "torso", "parent": "hip", "length": 80, "y": 40 }
  ],
  "slots": [
    { "name": "torso", "bone": "torso", "attachment": "body" }
  ],
  "skins": {
    "default": {
      "torso": { "body": { "width": 35, "height": 80 } }
    }
  },
  "animations": {
    "idle": {
      "bones": {
        "torso": {
          "rotate": [
            { "time": 0, "angle": 0 },
            { "time": 0.5, "angle": 5 },
            { "time": 1.0, "angle": 0 }
          ]
        }
      }
    }
  }
}
```

## Architecture

```
src/
├── index.ts              — Entry point & re-exports
└── SpinePlayer.tsx        — Full library source
    ├── SpineSkeletonData    — JSON parser & data model
    ├── SpineAnimationState  — Playback state machine
    ├── SpineCanvasRenderer  — Canvas2D rendering engine
    ├── useSpinePlayer()     — React hook for custom UIs
    └── <SpinePlayer />      — Drop-in React component
```

## Comparison with Lottie

| Feature | Lottie Player | SpinePlayer React |
|---------|--------------|-------------------|
| Format | After Effects JSON | Spine JSON |
| Renderer | SVG / Canvas / HTML | Canvas2D |
| File size | Varies | Lightweight (~15KB) |
| TypeScript | Partial | Full |
| Bone system | No | Yes |
| Mesh deform | No | Basic support |
| Skins | No | Yes |
| IK constraints | No | Planned |
| React hook | No | `useSpinePlayer()` |
| Controls | Built-in | Built-in |
| Debug mode | No | Yes (bone overlay) |

## Limitations

- **No texture atlas rendering** — renders colored shapes/regions (bring your own image loader for full texture support)
- **No IK constraints** — IK/transform constraints not yet implemented
- **No mesh deformation weights** — basic mesh triangulation only
- **No blend modes** — multiply/screen/additive not yet supported
- **Canvas2D only** — no WebGL renderer (lighter weight, but less performant for complex skeletons)

## License

MIT
