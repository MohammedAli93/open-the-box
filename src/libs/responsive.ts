export class ResponsiveHandler {
  private _scene: Phaser.Scene;
  private _events: Phaser.Events.EventEmitter & ResponsiveHandlerEventsEmitter;
  public isDesktopEmit = false;
  public isMobileEmit = false;
  public isMobileLandscapeEmit = false;
  public isMobilePortraitEmit = false;

  constructor(scene: Phaser.Scene) {
    this._scene = scene;
    this._events = new Phaser.Events.EventEmitter();
    this._scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
  }

  public destroy() {
    this._scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
  }

  public trigger() {
    const { gameSize, baseSize, displaySize, width, height } = this._scene.scale;
    this.onResize(gameSize, baseSize, displaySize, width, height);
  }

  private onResize(...args: Parameters<ResponsiveHandlerEventsEmitterFunction>) {
    this.isDesktopEmit = false;
    this.isMobileEmit = false;
    this.isMobileLandscapeEmit = false;
    this.isMobilePortraitEmit = false;
    if (this._scene.scale.isGameLandscape || this._scene.scale.isLandscape) {
      const isMobile = this._scene.scale.height < 600;
      if (isMobile) {
        this.isMobileEmit = true;
        this.isMobileLandscapeEmit = true;
      } else {
        this.isDesktopEmit = true;
      }
    } else if (this._scene.scale.isGamePortrait || this._scene.scale.isPortrait) {
      this.isMobileEmit = true;
      this.isMobilePortraitEmit = true;
    }
    this._events.emit("resize", ...args);
    if (this.isDesktopEmit) this._events.emit("desktop", ...args);
    if (this.isMobileEmit) this._events.emit("mobile", ...args);
    if (this.isMobilePortraitEmit) this._events.emit("mobile-portrait", ...args);
    if (this.isMobileLandscapeEmit) this._events.emit("mobile-landscape", ...args);
  }

  public get scene() {
    return this._scene;
  }
  public get events() {
    return this._events;
  }
}

type ResponsiveHandlerEventsEmitterFunction = (
  gameSize: Phaser.Structs.Size,
  baseSize: Phaser.Structs.Size,
  displaySize: Phaser.Structs.Size,
  previousWidth: number,
  previousHeight: number
) => void;

declare interface ResponsiveHandlerEventsEmitter {
  on(event: "resize" | "desktop" | "mobile" | "mobile-landscape" | "mobile-portrait", fn: ResponsiveHandlerEventsEmitterFunction, context?: any): this;
  off(event: "resize" | "desktop" | "mobile" | "mobile-landscape" | "mobile-portrait", fn?: ResponsiveHandlerEventsEmitterFunction, context?: any, once?: boolean): this;
  once(event: "resize" | "desktop" | "mobile" | "mobile-landscape" | "mobile-portrait", fn: ResponsiveHandlerEventsEmitterFunction, context?: any): this;
  emit(event: "resize" | "desktop" | "mobile" | "mobile-landscape" | "mobile-portrait", ...args: Parameters<ResponsiveHandlerEventsEmitterFunction>): boolean;
}
