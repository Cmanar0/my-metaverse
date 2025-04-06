export class KeyboardControls {
  private keys: { [key: string]: boolean } = {};
  private movementKeys: Set<string> = new Set([
    "w",
    "W",
    "a",
    "A",
    "s",
    "S",
    "d",
    "D",
  ]);

  constructor() {
    window.addEventListener("keydown", this.onKeyDown.bind(this));
    window.addEventListener("keyup", this.onKeyUp.bind(this));
    // Add blur event listener to reset keys when window loses focus
    window.addEventListener("blur", this.onBlur.bind(this));
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Normalize movement keys to lowercase
    if (this.movementKeys.has(event.key)) {
      this.keys[event.key.toLowerCase()] = true;
      // Clear the uppercase version to avoid duplicate keys
      this.keys[event.key.toUpperCase()] = false;
    } else if (event.key === "Shift") {
      this.keys["Shift"] = true;
    } else if (event.key === "Control") {
      this.keys["Control"] = true;
    } else {
      this.keys[event.key] = true;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    // Normalize movement keys to lowercase
    if (this.movementKeys.has(event.key)) {
      this.keys[event.key.toLowerCase()] = false;
      // Clear the uppercase version to avoid stuck keys
      this.keys[event.key.toUpperCase()] = false;
    } else if (event.key === "Shift") {
      this.keys["Shift"] = false;
    } else if (event.key === "Control") {
      this.keys["Control"] = false;
    } else {
      this.keys[event.key] = false;
    }
  }

  private onBlur(): void {
    // Reset all keys when window loses focus
    this.keys = {};
  }

  public getKeys(): { [key: string]: boolean } {
    return this.keys;
  }

  public cleanup(): void {
    window.removeEventListener("keydown", this.onKeyDown.bind(this));
    window.removeEventListener("keyup", this.onKeyUp.bind(this));
    window.removeEventListener("blur", this.onBlur.bind(this));
  }
}
