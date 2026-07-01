export class ResponsiveHandler {
  private _scene: Phaser.Scene;
  private _events: Phaser.Events.EventEmitter & ResponsiveHandlerEventsEmitter;
  public isDesktopEmit: boolean = false;
  public isMobileEmit: boolean = false;
  public isMobileLandscapeEmit: boolean = false;
  public isMobilePortraitEmit: boolean = false;

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
    this._events.emit('resize', ...args);
    if (this.isDesktopEmit) this._events.emit('desktop', ...args);
    if (this.isMobileEmit) this._events.emit('mobile', ...args);
    if (this.isMobilePortraitEmit) this._events.emit('mobile-portrait', ...args);
    if (this.isMobileLandscapeEmit) this._events.emit('mobile-landscape', ...args);
  }

  public get scene() { return this._scene; }
  public get events() { return this._events; }
}

type ResponsiveHandlerEventsEmitterFunction = (
  gameSize: Phaser.Structs.Size,
  baseSize: Phaser.Structs.Size,
  displaySize: Phaser.Structs.Size,
  previousWidth: number,
  previousHeight: number
) => void;

type ResponsiveHandlerEventsEmitterFunctionResize = ResponsiveHandlerEventsEmitterFunction;
type ResponsiveHandlerEventsEmitterFunctionDesktop = ResponsiveHandlerEventsEmitterFunction;
type ResponsiveHandlerEventsEmitterFunctionMobile = ResponsiveHandlerEventsEmitterFunction;
type ResponsiveHandlerEventsEmitterFunctionItemMobileLandscape = ResponsiveHandlerEventsEmitterFunction;
type ResponsiveHandlerEventsEmitterFunctionItemMobilePortrait = ResponsiveHandlerEventsEmitterFunction;

declare interface ResponsiveHandlerEventsEmitter {
  on(event: 'resize', fn: ResponsiveHandlerEventsEmitterFunctionResize, context?: any): this;
  off(event: 'resize', fn?: ResponsiveHandlerEventsEmitterFunctionResize, context?: any, once?: boolean): this;
  once(event: 'resize', fn: ResponsiveHandlerEventsEmitterFunctionResize, context?: any): this;
  emit(event: 'resize', ...args: Parameters<ResponsiveHandlerEventsEmitterFunctionResize>): boolean;

  on(event: 'desktop', fn: ResponsiveHandlerEventsEmitterFunctionDesktop, context?: any): this;
  off(event: 'desktop', fn?: ResponsiveHandlerEventsEmitterFunctionDesktop, context?: any, once?: boolean): this;
  once(event: 'desktop', fn: ResponsiveHandlerEventsEmitterFunctionDesktop, context?: any): this;
  emit(event: 'desktop', ...args: Parameters<ResponsiveHandlerEventsEmitterFunctionDesktop>): boolean;

  on(event: 'mobile', fn: ResponsiveHandlerEventsEmitterFunctionMobile, context?: any): this;
  off(event: 'mobile', fn?: ResponsiveHandlerEventsEmitterFunctionMobile, context?: any, once?: boolean): this;
  once(event: 'mobile', fn: ResponsiveHandlerEventsEmitterFunctionMobile, context?: any): this;
  emit(event: 'mobile', ...args: Parameters<ResponsiveHandlerEventsEmitterFunctionMobile>): boolean;

  on(event: 'mobile-landscape', fn: ResponsiveHandlerEventsEmitterFunctionItemMobileLandscape, context?: any): this;
  off(event: 'mobile-landscape', fn?: ResponsiveHandlerEventsEmitterFunctionItemMobileLandscape, context?: any, once?: boolean): this;
  once(event: 'mobile-landscape', fn: ResponsiveHandlerEventsEmitterFunctionItemMobileLandscape, context?: any): this;
  emit(event: 'mobile-landscape', ...args: Parameters<ResponsiveHandlerEventsEmitterFunctionItemMobileLandscape>): boolean;

  on(event: 'mobile-portrait', fn: ResponsiveHandlerEventsEmitterFunctionItemMobilePortrait, context?: any): this;
  off(event: 'mobile-portrait', fn?: ResponsiveHandlerEventsEmitterFunctionItemMobilePortrait, context?: any, once?: boolean): this;
  once(event: 'mobile-portrait', fn: ResponsiveHandlerEventsEmitterFunctionItemMobilePortrait, context?: any): this;
  emit(event: 'mobile-portrait', ...args: Parameters<ResponsiveHandlerEventsEmitterFunctionItemMobilePortrait>): boolean;
}