/**
 * SpinePlayer React Library
 * =========================
 * A React component library for playing Spine animations (JSON format).
 * Concept similar to Lottie Player in React.
 *
 * Usage:
 *   import SpinePlayer from 'spine-player-react';
 *
 *   <SpinePlayer
 *     src="/path/to/skeleton.json"
 *     animation="idle"
 *     skin="default"
 *     loop={true}
 *     autoplay={true}
 *     speed={1}
 *     width={400}
 *     height={400}
 *     onReady={(player) => console.log('Ready!')}
 *     onComplete={() => console.log('Animation complete')}
 *     onEvent={(event) => console.log('Spine event:', event)}
 *   />
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/** Raw Spine JSON bone definition */
export interface SpineJsonBone {
  name: string;
  parent?: string;
  length?: number;
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  shearX?: number;
  shearY?: number;
  transform?: string;
  color?: string;
}

/** Raw Spine JSON slot definition */
export interface SpineJsonSlot {
  name: string;
  bone: string;
  color?: string;
  attachment?: string | null;
  blend?: string;
}

/** Raw Spine JSON skeleton header */
export interface SpineJsonSkeleton {
  hash?: string;
  spine?: string;
  width?: number;
  height?: number;
  fps?: number;
}

/** Keyframe in a Spine animation timeline */
export interface SpineKeyframe {
  time: number;
  angle?: number;
  value?: number;
  x?: number;
  y?: number;
  color?: string;
  name?: string | null;
  curve?: string | number[];
  [key: string]: unknown;
}

/** Timelines for a bone in an animation */
export interface SpineBoneTimelines {
  rotate?: SpineKeyframe[];
  translate?: SpineKeyframe[];
  scale?: SpineKeyframe[];
  [key: string]: SpineKeyframe[] | undefined;
}

/** Timelines for a slot in an animation */
export interface SpineSlotTimelines {
  color?: SpineKeyframe[];
  attachment?: SpineKeyframe[];
  [key: string]: SpineKeyframe[] | undefined;
}

/** Parsed animation data */
export interface SpineAnimation {
  name: string;
  bones: Record<string, SpineBoneTimelines>;
  slots: Record<string, SpineSlotTimelines>;
  deform: Record<string, unknown>;
  drawOrder: unknown[];
  events: SpineKeyframe[];
  duration: number;
}

/** Attachment data from a skin */
export interface SpineAttachment {
  type?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  vertices?: number[];
  triangles?: number[];
  uvs?: number[];
  [key: string]: unknown;
}

/** Skin slot map: attachment name -> attachment data */
export type SpineSkinSlot = Record<string, SpineAttachment>;

/** Skin data: slot name -> skin slot map */
export type SpineSkinData = Record<string, SpineSkinSlot>;

/** Skins: skin name -> skin data */
export type SpineSkins = Record<string, SpineSkinData>;

/** Parsed bone data */
export interface ParsedBone {
  index: number;
  name: string;
  parent: string | null;
  length: number;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  shearX: number;
  shearY: number;
  transform: string;
  color: string;
}

/** Parsed slot data */
export interface ParsedSlot {
  index: number;
  name: string;
  bone: string;
  color: string;
  attachment: string | null;
  blend: string;
}

/** Bone transform state */
export interface BoneTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/** Bone tree node */
export interface BoneTreeNode extends ParsedBone {
  children: string[];
}

/** Raw Spine JSON data */
export interface SpineJsonData {
  skeleton?: SpineJsonSkeleton;
  bones?: SpineJsonBone[];
  slots?: SpineJsonSlot[];
  skins?: SpineSkinData[] | SpineSkins;
  animations?: Record<string, {
    bones?: Record<string, SpineBoneTimelines>;
    slots?: Record<string, SpineSlotTimelines>;
    deform?: Record<string, unknown>;
    drawOrder?: unknown[];
    events?: SpineKeyframe[];
  }>;
  events?: Record<string, unknown>;
  ik?: unknown[];
  transform?: unknown[];
  path?: unknown[];
}

/** Event listener types */
export type SpineEventType = "play" | "pause" | "stop" | "complete" | "loop" | "event";

/** Event listener entry */
interface EventListener {
  event: SpineEventType;
  callback: (data?: unknown) => void;
}

/** Frame callback data */
export interface FrameData {
  time: number;
  progress: number;
  animation: string | undefined;
}

/** Ready callback data */
export interface ReadyData {
  skeletonData: SpineSkeletonData;
  animationState: SpineAnimationState;
  renderer: SpineCanvasRenderer;
  animations: string[];
  skins: string[];
}

/** SpinePlayer component props */
export interface SpinePlayerProps {
  /** URL to Spine JSON or JSON object */
  src?: string | SpineJsonData | null;
  /** Direct JSON data (alternative to src) */
  jsonData?: string | SpineJsonData | null;
  /** Animation name to play */
  animation?: string;
  /** Skin name */
  skin?: string;
  /** Loop the animation */
  loop?: boolean;
  /** Auto-play on load */
  autoplay?: boolean;
  /** Playback speed multiplier */
  speed?: number;
  /** 1 = forward, -1 = reverse */
  direction?: number;
  /** Canvas width (px) */
  width?: number;
  /** Canvas height (px) */
  height?: number;
  /** Canvas background color */
  background?: string;
  /** Show bone debug overlay */
  debug?: boolean;
  /** CSS class for container */
  className?: string;
  /** Inline styles for container */
  style?: React.CSSProperties;
  /** Show built-in player controls */
  showControls?: boolean;
  /** Fired when skeleton is loaded */
  onReady?: (data: ReadyData) => void;
  /** Fired when animation completes (non-loop) */
  onComplete?: () => void;
  /** Fired each time animation loops */
  onLoop?: () => void;
  /** Fired on Spine events */
  onEvent?: (event: SpineKeyframe) => void;
  /** Fired on load/parse errors */
  onError?: (error: Error) => void;
  /** Fired every render frame */
  onFrame?: (data: FrameData) => void;
  /** Preserve aspect ratio */
  preserveAspectRatio?: boolean;
  /** Device pixel ratio for retina */
  dpr?: number;
}

/** SpinePlayer imperative handle (ref API) */
export interface SpinePlayerHandle {
  play(): void;
  pause(): void;
  stop(): void;
  setAnimation(name: string): void;
  setSpeed(speed: number): void;
  setLoop(loop: boolean): void;
  seek(progress: number): void;
  getSkeletonData(): SpineSkeletonData | null;
  getAnimationState(): SpineAnimationState | null;
  getAnimations(): string[];
  getSkins(): string[];
  getCanvas(): HTMLCanvasElement | null;
  isPlaying(): boolean;
  getProgress(): number;
}

/** useSpinePlayer hook options */
export interface UseSpinePlayerOptions {
  animation?: string;
  loop?: boolean;
  speed?: number;
}

/** useSpinePlayer hook return type */
export interface UseSpinePlayerReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  skeletonData: SpineSkeletonData | null;
  animationState: SpineAnimationState | null;
  renderer: SpineCanvasRenderer | null;
  isLoaded: boolean;
  error: string | null;
  currentAnimation: string;
  isPlaying: boolean;
  progress: number;
  load(jsonData: string | SpineJsonData): Promise<{
    skeletonData: SpineSkeletonData;
    animationState: SpineAnimationState;
    renderer: SpineCanvasRenderer;
  } | undefined>;
  play(): void;
  pause(): void;
  stop(): void;
  setAnimation(name: string): void;
  setSpeed(speed: number): void;
  setLoop(loop: boolean): void;
  seek(progress: number): void;
}

// ============================================================
// SPINE RUNTIME CORE (Minimal Implementation)
// ============================================================

/**
 * Minimal Spine JSON Parser
 * Parses Spine skeleton JSON and provides bone/slot/attachment data
 */
export class SpineSkeletonData {
  raw: SpineJsonData;
  skeleton: SpineJsonSkeleton;
  bones: ParsedBone[];
  slots: ParsedSlot[];
  skins: SpineSkins;
  animations: Record<string, SpineAnimation>;
  events: Record<string, unknown>;
  ik: unknown[];
  transform: unknown[];
  path: unknown[];
  width: number;
  height: number;
  fps: number;
  version: string;

  constructor(json: SpineJsonData) {
    this.raw = json;
    this.skeleton = json.skeleton || {};
    this.bones = (json.bones || []).map((b, i) => ({
      index: i,
      name: b.name,
      parent: b.parent || null,
      length: b.length || 0,
      x: b.x || 0,
      y: b.y || 0,
      rotation: b.rotation || 0,
      scaleX: b.scaleX ?? 1,
      scaleY: b.scaleY ?? 1,
      shearX: b.shearX || 0,
      shearY: b.shearY || 0,
      transform: b.transform || "normal",
      color: b.color || "ffffffff",
    }));
    this.slots = (json.slots || []).map((s, i) => ({
      index: i,
      name: s.name,
      bone: s.bone,
      color: s.color || "ffffffff",
      attachment: s.attachment || null,
      blend: s.blend || "normal",
    }));
    this.skins = this._parseSkins(json.skins);
    this.animations = this._parseAnimations(json.animations || {});
    this.events = json.events || {};
    this.ik = json.ik || [];
    this.transform = json.transform || [];
    this.path = json.path || [];

    this.width = this.skeleton.width || 0;
    this.height = this.skeleton.height || 0;
    this.fps = this.skeleton.fps || 30;
    this.version = this.skeleton.spine || "unknown";
  }

  private _parseSkins(skins: SpineJsonData["skins"]): SpineSkins {
    if (!skins) return {};
    // Spine 3.x uses object format, Spine 4.x uses array format
    if (Array.isArray(skins)) {
      const result: SpineSkins = {};
      skins.forEach((skin) => {
        const s = skin as unknown as { name: string; attachments?: SpineSkinData };
        result[s.name] = s.attachments || {};
      });
      return result;
    }
    return skins as SpineSkins;
  }

  private _parseAnimations(
    anims: NonNullable<SpineJsonData["animations"]>
  ): Record<string, SpineAnimation> {
    const result: Record<string, SpineAnimation> = {};
    for (const [name, data] of Object.entries(anims)) {
      result[name] = {
        name,
        bones: (data.bones || {}) as Record<string, SpineBoneTimelines>,
        slots: (data.slots || {}) as Record<string, SpineSlotTimelines>,
        deform: (data.deform || {}) as Record<string, unknown>,
        drawOrder: data.drawOrder || [],
        events: data.events || [],
        duration: this._calcDuration(data),
      };
    }
    return result;
  }

  private _calcDuration(animData: NonNullable<SpineJsonData["animations"]>[string]): number {
    let maxTime = 0;
    const checkTimelines = (group: Record<string, Record<string, unknown>>) => {
      for (const timelines of Object.values(group)) {
        for (const frames of Object.values(timelines)) {
          if (Array.isArray(frames)) {
            frames.forEach((f: SpineKeyframe) => {
              if (f.time !== undefined && f.time > maxTime) maxTime = f.time;
            });
          }
        }
      }
    };
    if (animData.bones) checkTimelines(animData.bones as Record<string, Record<string, unknown>>);
    if (animData.slots) checkTimelines(animData.slots as Record<string, Record<string, unknown>>);
    if (animData.events) {
      animData.events.forEach((e) => {
        if (e.time > maxTime) maxTime = e.time;
      });
    }
    return maxTime;
  }

  getAnimationNames(): string[] {
    return Object.keys(this.animations);
  }

  getSkinNames(): string[] {
    return Object.keys(this.skins);
  }

  getAnimation(name: string): SpineAnimation | null {
    return this.animations[name] || null;
  }
}

// ============================================================
// SPINE ANIMATION STATE
// ============================================================

export class SpineAnimationState {
  skeletonData: SpineSkeletonData;
  currentAnimation: SpineAnimation | null;
  currentTime: number;
  speed: number;
  loop: boolean;
  isPlaying: boolean;
  listeners: EventListener[];
  mixDuration: number;

  constructor(skeletonData: SpineSkeletonData) {
    this.skeletonData = skeletonData;
    this.currentAnimation = null;
    this.currentTime = 0;
    this.speed = 1;
    this.loop = true;
    this.isPlaying = false;
    this.listeners = [];
    this.mixDuration = 0.2;
  }

  setAnimation(name: string): this {
    const anim = this.skeletonData.getAnimation(name);
    if (anim) {
      this.currentAnimation = anim;
      this.currentTime = 0;
    }
    return this;
  }

  update(deltaTime: number): void {
    if (!this.currentAnimation || !this.isPlaying) return;

    this.currentTime += deltaTime * this.speed;
    const duration = this.currentAnimation.duration;

    if (duration > 0) {
      // Check for events
      this._checkEvents(this.currentTime - deltaTime * this.speed, this.currentTime);

      if (this.currentTime >= duration) {
        if (this.loop) {
          this.currentTime = this.currentTime % duration;
          this._emit("loop");
        } else {
          this.currentTime = duration;
          this.isPlaying = false;
          this._emit("complete");
        }
      }
    }
  }

  private _checkEvents(fromTime: number, toTime: number): void {
    if (!this.currentAnimation?.events) return;
    this.currentAnimation.events.forEach((event) => {
      if (event.time > fromTime && event.time <= toTime) {
        this._emit("event", event);
      }
    });
  }

  play(): void {
    this.isPlaying = true;
    this._emit("play");
  }

  pause(): void {
    this.isPlaying = false;
    this._emit("pause");
  }

  stop(): void {
    this.isPlaying = false;
    this.currentTime = 0;
    this._emit("stop");
  }

  on(event: SpineEventType, callback: (data?: unknown) => void): void {
    this.listeners.push({ event, callback });
  }

  off(event: SpineEventType, callback: (data?: unknown) => void): void {
    this.listeners = this.listeners.filter(
      (l) => !(l.event === event && l.callback === callback)
    );
  }

  private _emit(event: SpineEventType, data?: unknown): void {
    this.listeners
      .filter((l) => l.event === event)
      .forEach((l) => l.callback(data));
  }

  getProgress(): number {
    if (!this.currentAnimation || this.currentAnimation.duration === 0) return 0;
    return this.currentTime / this.currentAnimation.duration;
  }
}

// ============================================================
// SPINE CANVAS RENDERER
// ============================================================

type InterpolationProperty = "rotate" | "translate" | "scale" | "color" | "attachment";

export class SpineCanvasRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  skeletonData: SpineSkeletonData;
  debug: boolean;
  backgroundColor: string | null;
  boneTree: Record<string, BoneTreeNode>;

  constructor(canvas: HTMLCanvasElement, skeletonData: SpineSkeletonData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.skeletonData = skeletonData;
    this.debug = false;
    this.backgroundColor = null;

    // Build bone hierarchy
    this.boneTree = this._buildBoneTree();
  }

  private _buildBoneTree(): Record<string, BoneTreeNode> {
    const bones = this.skeletonData.bones;
    const tree: Record<string, BoneTreeNode> = {};
    bones.forEach((bone) => {
      tree[bone.name] = { ...bone, children: [] };
    });
    bones.forEach((bone) => {
      if (bone.parent && tree[bone.parent]) {
        tree[bone.parent].children.push(bone.name);
      }
    });
    return tree;
  }

  /**
   * Interpolate between keyframes
   */
  private _interpolateKeyframes(
    frames: SpineKeyframe[] | undefined,
    time: number,
    property: InterpolationProperty
  ): SpineKeyframe | null {
    if (!frames || frames.length === 0) return null;

    // Before first frame
    if (time <= frames[0].time) {
      return frames[0];
    }

    // After last frame
    if (time >= frames[frames.length - 1].time) {
      return frames[frames.length - 1];
    }

    // Find surrounding frames
    for (let i = 0; i < frames.length - 1; i++) {
      const curr = frames[i];
      const next = frames[i + 1];

      if (time >= curr.time && time < next.time) {
        const t = (time - curr.time) / (next.time - curr.time);
        // Apply curve if present
        const eased = this._applyCurve(t, curr.curve);
        return this._lerpFrame(curr, next, eased, property);
      }
    }

    return frames[frames.length - 1];
  }

  private _applyCurve(t: number, curve: string | number[] | undefined): number {
    if (!curve || curve === "linear") return t;
    if (curve === "stepped") return 0;
    if (Array.isArray(curve) && curve.length === 4) {
      return this._bezier(t, curve[0], curve[1], curve[2], curve[3]);
    }
    return t;
  }

  private _bezier(t: number, _cx1: number, cy1: number, _cx2: number, cy2: number): number {
    // Cubic bezier approximation
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    return 3 * mt2 * t * cy1 + 3 * mt * t2 * cy2 + t3;
  }

  private _lerpFrame(
    a: SpineKeyframe,
    b: SpineKeyframe,
    t: number,
    property: InterpolationProperty
  ): SpineKeyframe {
    const result = { ...a };
    switch (property) {
      case "rotate":
        result.angle = (a.angle || 0) + ((b.angle || 0) - (a.angle || 0)) * t;
        break;
      case "translate":
        result.x = (a.x || 0) + ((b.x || 0) - (a.x || 0)) * t;
        result.y = (a.y || 0) + ((b.y || 0) - (a.y || 0)) * t;
        break;
      case "scale":
        result.x = (a.x ?? 1) + ((b.x ?? 1) - (a.x ?? 1)) * t;
        result.y = (a.y ?? 1) + ((b.y ?? 1) - (a.y ?? 1)) * t;
        break;
      case "color":
        result.color = this._lerpColor(a.color || "ffffffff", b.color || "ffffffff", t);
        break;
      case "attachment":
        result.name = t < 0.5 ? a.name : b.name;
        break;
    }
    return result;
  }

  private _lerpColor(colorA: string, colorB: string, t: number): string {
    const parseHex = (hex: string): [number, number, number, number] => {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const a = hex.length > 6 ? parseInt(hex.substr(6, 2), 16) : 255;
      return [r, g, b, a];
    };
    const [r1, g1, b1, a1] = parseHex(colorA);
    const [r2, g2, b2, a2] = parseHex(colorB);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    const a = Math.round(a1 + (a2 - a1) * t);
    return (
      r.toString(16).padStart(2, "0") +
      g.toString(16).padStart(2, "0") +
      b.toString(16).padStart(2, "0") +
      a.toString(16).padStart(2, "0")
    );
  }

  private _hexToRgba(hex: string): string {
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const a = hex.length > 6 ? parseInt(hex.substr(6, 2), 16) / 255 : 1;
    return `rgba(${r},${g},${b},${a})`;
  }

  /**
   * Compute world transforms for all bones at a given animation time
   */
  computeBoneTransforms(
    animation: SpineAnimation | null,
    time: number
  ): Record<string, BoneTransform> {
    const transforms: Record<string, BoneTransform> = {};
    const bones = this.skeletonData.bones;

    // Initialize with setup pose
    bones.forEach((bone) => {
      transforms[bone.name] = {
        x: bone.x,
        y: bone.y,
        rotation: bone.rotation,
        scaleX: bone.scaleX,
        scaleY: bone.scaleY,
      };
    });

    // Apply animation
    if (animation && animation.bones) {
      for (const [boneName, timelines] of Object.entries(animation.bones)) {
        if (!transforms[boneName]) continue;

        if (timelines.rotate) {
          const frame = this._interpolateKeyframes(timelines.rotate, time, "rotate");
          if (frame) {
            transforms[boneName].rotation += frame.angle || frame.value || 0;
          }
        }
        if (timelines.translate) {
          const frame = this._interpolateKeyframes(timelines.translate, time, "translate");
          if (frame) {
            transforms[boneName].x += frame.x || 0;
            transforms[boneName].y += frame.y || 0;
          }
        }
        if (timelines.scale) {
          const frame = this._interpolateKeyframes(timelines.scale, time, "scale");
          if (frame) {
            transforms[boneName].scaleX *= frame.x ?? 1;
            transforms[boneName].scaleY *= frame.y ?? 1;
          }
        }
      }
    }

    return transforms;
  }

  /**
   * Render a single frame
   */
  render(animationState: SpineAnimationState): void {
    const { ctx, canvas } = this;
    const animation = animationState.currentAnimation;
    const time = animationState.currentTime;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (!animation) return;

    const transforms = this.computeBoneTransforms(animation, time);

    ctx.save();

    // Center and flip Y axis (Spine uses Y-up)
    ctx.translate(canvas.width / 2, canvas.height * 0.75);
    ctx.scale(1, -1);

    // Auto-scale based on skeleton size
    const skW = this.skeletonData.width || 200;
    const skH = this.skeletonData.height || 200;
    const scaleX = (canvas.width * 0.8) / skW;
    const scaleY = (canvas.height * 0.8) / skH;
    const scale = Math.min(scaleX, scaleY, 2);
    ctx.scale(scale, scale);

    // Draw slots / attachments
    this._renderSlots(ctx, transforms, animation, time);

    // Debug mode: draw bones
    if (this.debug) {
      this._renderDebugBones(ctx, transforms);
    }

    ctx.restore();
  }

  private _renderSlots(
    ctx: CanvasRenderingContext2D,
    transforms: Record<string, BoneTransform>,
    animation: SpineAnimation,
    time: number
  ): void {
    const slots = this.skeletonData.slots;
    const skins = this.skeletonData.skins;
    const activeSkin = skins["default"] || Object.values(skins)[0] || {};

    // Get slot state from animation
    const slotStates: Record<string, { color?: string; attachment?: string | null }> = {};
    if (animation.slots) {
      for (const [slotName, timelines] of Object.entries(animation.slots)) {
        slotStates[slotName] = {};
        if (timelines.color) {
          const frame = this._interpolateKeyframes(timelines.color, time, "color");
          if (frame) slotStates[slotName].color = frame.color;
        }
        if (timelines.attachment) {
          const frame = this._interpolateKeyframes(timelines.attachment, time, "attachment");
          if (frame) slotStates[slotName].attachment = frame.name;
        }
      }
    }

    slots.forEach((slot) => {
      const boneName = slot.bone;
      const transform = transforms[boneName];
      if (!transform) return;

      const slotState = slotStates[slot.name] || {};
      const attachmentName =
        slotState.attachment !== undefined ? slotState.attachment : slot.attachment;
      if (!attachmentName) return;

      // Get color
      const color = slotState.color || slot.color || "ffffffff";
      const alpha = parseInt(color.substr(6, 2) || "ff", 16) / 255;

      // Get attachment from skin
      const skinSlot = activeSkin[slot.name];
      const attachment = skinSlot ? skinSlot[attachmentName] : null;

      ctx.save();

      // Apply world transform by traversing bone hierarchy
      this._applyBoneWorldTransform(ctx, boneName, transforms);

      ctx.globalAlpha = alpha;

      if (attachment) {
        this._renderAttachment(ctx, attachment, color);
      } else {
        // Draw placeholder shape
        this._renderPlaceholder(ctx, color);
      }

      ctx.restore();
    });
  }

  private _applyBoneWorldTransform(
    ctx: CanvasRenderingContext2D,
    boneName: string,
    transforms: Record<string, BoneTransform>
  ): void {
    // Build chain from root to this bone
    const chain: string[] = [];
    let current: string | null = boneName;
    while (current) {
      chain.unshift(current);
      const boneData: BoneTreeNode | undefined = this.boneTree[current];
      current = boneData ? boneData.parent : null;
    }

    chain.forEach((name) => {
      const t = transforms[name];
      if (!t) return;
      ctx.translate(t.x, t.y);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.scale(t.scaleX, t.scaleY);
    });
  }

  private _renderAttachment(
    ctx: CanvasRenderingContext2D,
    attachment: SpineAttachment,
    color: string
  ): void {
    const fillColor = this._hexToRgba(color);

    if (attachment.type === "region" || !attachment.type) {
      // Region attachment (image placeholder)
      const w = attachment.width || 30;
      const h = attachment.height || 30;
      const x = attachment.x || 0;
      const y = attachment.y || 0;
      const rotation = attachment.rotation || 0;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(attachment.scaleX ?? 1, attachment.scaleY ?? 1);
      ctx.fillStyle = fillColor;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    } else if (attachment.type === "mesh") {
      // Mesh attachment
      this._renderMesh(ctx, attachment, fillColor);
    }
    // Skip bounding boxes in normal render
  }

  private _renderMesh(
    ctx: CanvasRenderingContext2D,
    attachment: SpineAttachment,
    fillColor: string
  ): void {
    const vertices = attachment.vertices || [];
    const triangles = attachment.triangles || [];

    if (vertices.length < 4 || triangles.length < 3) return;

    ctx.fillStyle = fillColor;
    ctx.beginPath();

    for (let i = 0; i < triangles.length; i += 3) {
      const i0 = triangles[i] * 2;
      const i1 = triangles[i + 1] * 2;
      const i2 = triangles[i + 2] * 2;

      ctx.moveTo(vertices[i0], vertices[i0 + 1]);
      ctx.lineTo(vertices[i1], vertices[i1 + 1]);
      ctx.lineTo(vertices[i2], vertices[i2 + 1]);
      ctx.closePath();
    }

    ctx.fill();
  }

  private _renderPlaceholder(ctx: CanvasRenderingContext2D, color: string): void {
    const fillColor = this._hexToRgba(color);
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  private _renderDebugBones(
    ctx: CanvasRenderingContext2D,
    transforms: Record<string, BoneTransform>
  ): void {
    const bones = this.skeletonData.bones;

    bones.forEach((bone) => {
      ctx.save();
      this._applyBoneWorldTransform(ctx, bone.name, transforms);

      // Draw bone
      const len = bone.length || 10;
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 1.5 / (ctx.getTransform().a || 1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();

      // Draw joint
      ctx.fillStyle = "#44ff44";
      ctx.beginPath();
      ctx.arc(0, 0, 3 / (ctx.getTransform().a || 1), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
  }

  resize(width: number, height: number, dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1): void {
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
  }
}

// ============================================================
// REACT HOOK: useSpinePlayer
// ============================================================

export function useSpinePlayer(options: UseSpinePlayerOptions = {}): UseSpinePlayerReturn {
  const [skeletonData, setSkeletonData] = useState<SpineSkeletonData | null>(null);
  const [animationState, setAnimationState] = useState<SpineAnimationState | null>(null);
  const [renderer, setRenderer] = useState<SpineCanvasRenderer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAnimation, setCurrentAnimation] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SpineAnimationState | null>(null);

  const load = useCallback(
    async (jsonData: string | SpineJsonData) => {
      try {
        let data: SpineJsonData;
        if (typeof jsonData === "string") {
          // URL or JSON string
          if (jsonData.startsWith("http") || jsonData.startsWith("/")) {
            const response = await fetch(jsonData);
            data = (await response.json()) as SpineJsonData;
          } else {
            data = JSON.parse(jsonData) as SpineJsonData;
          }
        } else {
          data = jsonData;
        }

        const skelData = new SpineSkeletonData(data);
        setSkeletonData(skelData);

        if (canvasRef.current) {
          const r = new SpineCanvasRenderer(canvasRef.current, skelData);
          setRenderer(r);

          const state = new SpineAnimationState(skelData);
          stateRef.current = state;
          setAnimationState(state);

          // Set default animation
          const animNames = skelData.getAnimationNames();
          if (animNames.length > 0) {
            const defaultAnim = options.animation || animNames[0];
            state.setAnimation(defaultAnim);
            setCurrentAnimation(defaultAnim);
          }

          state.loop = options.loop !== false;
          state.speed = options.speed || 1;

          setIsLoaded(true);
          setError(null);

          return { skeletonData: skelData, animationState: state, renderer: r };
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoaded(false);
      }
    },
    [options.animation, options.loop, options.speed]
  );

  const play = useCallback(() => {
    if (stateRef.current) {
      stateRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (stateRef.current) {
      stateRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (stateRef.current) {
      stateRef.current.stop();
      setIsPlaying(false);
      setProgress(0);
    }
  }, []);

  const setAnimation = useCallback((name: string) => {
    if (stateRef.current) {
      stateRef.current.setAnimation(name);
      setCurrentAnimation(name);
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    if (stateRef.current) {
      stateRef.current.speed = speed;
    }
  }, []);

  const setLoop = useCallback((loop: boolean) => {
    if (stateRef.current) {
      stateRef.current.loop = loop;
    }
  }, []);

  const seek = useCallback((p: number) => {
    if (stateRef.current && stateRef.current.currentAnimation) {
      stateRef.current.currentTime =
        p * stateRef.current.currentAnimation.duration;
      setProgress(p);
    }
  }, []);

  return {
    canvasRef,
    skeletonData,
    animationState,
    renderer,
    isLoaded,
    error,
    currentAnimation,
    isPlaying,
    progress,
    load,
    play,
    pause,
    stop,
    setAnimation,
    setSpeed,
    setLoop,
    seek,
  };
}

// ============================================================
// REACT COMPONENT: SpinePlayer
// ============================================================

const SpinePlayer = forwardRef<SpinePlayerHandle, SpinePlayerProps>(
  function SpinePlayer(
    {
      // Data source
      src = null,
      jsonData = null,

      // Animation config
      animation = "",
      skin: _skin = "default",
      loop = true,
      autoplay = true,
      speed = 1,
      direction = 1,

      // Display
      width = 400,
      height = 400,
      background = "transparent",
      debug = false,
      className = "",
      style = {},

      // Controls
      showControls = false,

      // Callbacks
      onReady = undefined,
      onComplete = undefined,
      onLoop = undefined,
      onEvent = undefined,
      onError = undefined,
      onFrame = undefined,

      // Advanced
      preserveAspectRatio: _preserveAspectRatio = true,
      dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,

      ...rest
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rendererRef = useRef<SpineCanvasRenderer | null>(null);
    const animStateRef = useRef<SpineAnimationState | null>(null);
    const skelDataRef = useRef<SpineSkeletonData | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);

    const [loaded, setLoaded] = useState(false);
    const [errorState, setErrorState] = useState<string | null>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [animations, setAnimations] = useState<string[]>([]);
    const [skins, setSkins] = useState<string[]>([]);
    const [activeAnimation, setActiveAnimation] = useState(animation);
    const [internalSpeed, setInternalSpeed] = useState(speed);

    // ---- Imperative API via ref ----
    useImperativeHandle(ref, () => ({
      play: () => {
        animStateRef.current?.play();
        setPlaying(true);
      },
      pause: () => {
        animStateRef.current?.pause();
        setPlaying(false);
      },
      stop: () => {
        animStateRef.current?.stop();
        setPlaying(false);
        setProgress(0);
      },
      setAnimation: (name: string) => {
        animStateRef.current?.setAnimation(name);
        setActiveAnimation(name);
      },
      setSpeed: (s: number) => {
        if (animStateRef.current) animStateRef.current.speed = s;
        setInternalSpeed(s);
      },
      setLoop: (l: boolean) => {
        if (animStateRef.current) animStateRef.current.loop = l;
      },
      seek: (p: number) => {
        if (animStateRef.current?.currentAnimation) {
          animStateRef.current.currentTime =
            p * animStateRef.current.currentAnimation.duration;
        }
      },
      getSkeletonData: () => skelDataRef.current,
      getAnimationState: () => animStateRef.current,
      getAnimations: () => animations,
      getSkins: () => skins,
      getCanvas: () => canvasRef.current,
      isPlaying: () => playing,
      getProgress: () => progress,
    }));

    // ---- Load skeleton data ----
    useEffect(() => {
      let cancelled = false;

      async function loadData() {
        try {
          let data: SpineJsonData | undefined;
          if (jsonData) {
            data =
              typeof jsonData === "string"
                ? (JSON.parse(jsonData) as SpineJsonData)
                : jsonData;
          } else if (src) {
            if (typeof src === "string") {
              if (src.startsWith("{")) {
                data = JSON.parse(src) as SpineJsonData;
              } else {
                const resp = await fetch(src);
                if (!resp.ok) throw new Error(`Failed to load: ${resp.statusText}`);
                data = (await resp.json()) as SpineJsonData;
              }
            } else {
              data = src;
            }
          }

          if (cancelled || !data) return;

          const skelData = new SpineSkeletonData(data);
          skelDataRef.current = skelData;

          const canvas = canvasRef.current;
          if (!canvas) return;

          // Setup renderer
          const renderer = new SpineCanvasRenderer(canvas, skelData);
          renderer.resize(width, height, dpr);
          renderer.setDebug(debug);
          if (background !== "transparent") {
            renderer.setBackgroundColor(background);
          }
          rendererRef.current = renderer;

          // Setup animation state
          const animState = new SpineAnimationState(skelData);
          animState.loop = loop;
          animState.speed = speed * direction;

          const animNames = skelData.getAnimationNames();
          const skinNames = skelData.getSkinNames();
          setAnimations(animNames);
          setSkins(skinNames);

          // Set initial animation
          const initialAnim = animation || animNames[0];
          if (initialAnim) {
            animState.setAnimation(initialAnim);
            setActiveAnimation(initialAnim);
          }

          // Wire up events
          animState.on("complete", () => {
            onComplete?.();
          });
          animState.on("loop", () => {
            onLoop?.();
          });
          animState.on("event", (evt) => {
            onEvent?.(evt as SpineKeyframe);
          });

          animStateRef.current = animState;
          setLoaded(true);
          setErrorState(null);
          onReady?.({
            skeletonData: skelData,
            animationState: animState,
            renderer,
            animations: animNames,
            skins: skinNames,
          });

          // Autoplay
          if (autoplay) {
            animState.play();
            setPlaying(true);
          }
        } catch (err) {
          if (!cancelled) {
            const error = err instanceof Error ? err : new Error(String(err));
            setErrorState(error.message);
            onError?.(error);
          }
        }
      }

      loadData();
      return () => {
        cancelled = true;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, jsonData]);

    // ---- Update animation when prop changes ----
    useEffect(() => {
      if (animation && animStateRef.current && loaded) {
        animStateRef.current.setAnimation(animation);
        setActiveAnimation(animation);
      }
    }, [animation, loaded]);

    // ---- Update speed ----
    useEffect(() => {
      if (animStateRef.current) {
        animStateRef.current.speed = speed * direction;
        setInternalSpeed(speed);
      }
    }, [speed, direction]);

    // ---- Update loop ----
    useEffect(() => {
      if (animStateRef.current) {
        animStateRef.current.loop = loop;
      }
    }, [loop]);

    // ---- Update debug ----
    useEffect(() => {
      if (rendererRef.current) {
        rendererRef.current.setDebug(debug);
      }
    }, [debug]);

    // ---- Resize ----
    useEffect(() => {
      if (rendererRef.current) {
        rendererRef.current.resize(width, height, dpr);
      }
    }, [width, height, dpr]);

    // ---- Animation loop ----
    useEffect(() => {
      const tick = (timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const delta = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;

        const animState = animStateRef.current;
        const renderer = rendererRef.current;

        if (animState && renderer) {
          animState.update(delta);
          renderer.render(animState);
          setProgress(animState.getProgress());
          onFrame?.({
            time: animState.currentTime,
            progress: animState.getProgress(),
            animation: animState.currentAnimation?.name,
          });
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded]);

    // ---- Controls handlers ----
    const handlePlayPause = () => {
      if (playing) {
        animStateRef.current?.pause();
        setPlaying(false);
      } else {
        animStateRef.current?.play();
        setPlaying(true);
      }
    };

    const handleStop = () => {
      animStateRef.current?.stop();
      setPlaying(false);
      setProgress(0);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (animStateRef.current?.currentAnimation) {
        animStateRef.current.currentTime =
          val * animStateRef.current.currentAnimation.duration;
        setProgress(val);
      }
    };

    const handleAnimChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const name = e.target.value;
      animStateRef.current?.setAnimation(name);
      setActiveAnimation(name);
      if (autoplay) {
        animStateRef.current?.play();
        setPlaying(true);
      }
    };

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const s = parseFloat(e.target.value);
      if (animStateRef.current) {
        animStateRef.current.speed = s * direction;
      }
      setInternalSpeed(s);
    };

    // ---- Render ----
    return (
      <div
        className={`spine-player-container ${className}`}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          background: background === "transparent" ? "transparent" : undefined,
          borderRadius: showControls ? "12px" : undefined,
          overflow: "hidden",
          ...style,
        }}
        {...rest}
      >
        {errorState && (
          <div
            style={{
              width,
              height,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
              background: "#1a1a2e",
              fontSize: 14,
              padding: 20,
              textAlign: "center",
            }}
          >
            {errorState}
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{
            width,
            height,
            display: errorState ? "none" : "block",
            background:
              background === "transparent" ? "transparent" : background,
          }}
        />

        {!loaded && !errorState && (
          <div
            style={{
              position: "absolute",
              width,
              height,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            Loading...
          </div>
        )}

        {showControls && loaded && (
          <div
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "#0f0f23",
              borderTop: "1px solid #1e293b",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {/* Transport */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={handlePlayPause}
                style={{
                  background: "none",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                  borderRadius: 6,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {playing ? "\u23F8" : "\u25B6\uFE0F"}
              </button>
              <button
                onClick={handleStop}
                style={{
                  background: "none",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                  borderRadius: 6,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {"\u23F9"}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={progress}
                onChange={handleSeek}
                style={{ flex: 1, accentColor: "#6366f1" }}
              />
              <span style={{ color: "#94a3b8", fontSize: 11, minWidth: 36 }}>
                {Math.round(progress * 100)}%
              </span>
            </div>

            {/* Animation selector + speed */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {animations.length > 1 && (
                <select
                  value={activeAnimation}
                  onChange={handleAnimChange}
                  style={{
                    flex: 1,
                    background: "#1e293b",
                    color: "#e2e8f0",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 12,
                  }}
                >
                  {animations.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}
              <label
                style={{
                  color: "#94a3b8",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Speed:
                <input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={internalSpeed}
                  onChange={handleSpeedChange}
                  style={{ width: 60, accentColor: "#6366f1" }}
                />
                <span style={{ minWidth: 28 }}>{internalSpeed.toFixed(1)}x</span>
              </label>
            </div>
          </div>
        )}
      </div>
    );
  }
);

SpinePlayer.displayName = "SpinePlayer";

// ============================================================
// EXPORTS
// ============================================================

export { SpinePlayer };
export default SpinePlayer;
