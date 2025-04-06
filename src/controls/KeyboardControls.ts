export class KeyboardControls {
  private keys: { [key: string]: boolean } = {};

  constructor() {
    window.addEventListener("keydown", this.onKeyDown.bind(this));
    window.addEventListener("keyup", this.onKeyUp.bind(this));
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys[event.key] = true;
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys[event.key] = false;
  }

  public getKeys(): { [key: string]: boolean } {
    return this.keys;
  }

  public cleanup(): void {
    window.removeEventListener("keydown", this.onKeyDown.bind(this));
    window.removeEventListener("keyup", this.onKeyUp.bind(this));
  }
}
