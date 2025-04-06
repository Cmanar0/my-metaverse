import * as THREE from "three";

export class Avatar {
  public mesh: THREE.Mesh;
  private moveSpeed: number = 0.1;
  private rotationSpeed: number = 0.05;
  private jumpHeight: number = 1.5;
  private jumpDuration: number = 0.5;
  private groundY: number = 0.5;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private direction: THREE.Vector3 = new THREE.Vector3();
  private isJumping: boolean = false;
  private jumpStartTime: number = 0;
  private camera: THREE.Camera;
  private targetRotation: number = 0;
  private currentRotation: number = 0;

  constructor(camera: THREE.Camera) {
    this.camera = camera;

    // Create avatar mesh
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = this.groundY; // Position above ground
  }

  public update(keys: { [key: string]: boolean }, deltaTime: number): void {
    // Reset velocity
    this.velocity.set(0, 0, 0);

    // Get camera direction
    this.camera.getWorldDirection(this.direction);

    // Calculate forward and right vectors
    const forward = new THREE.Vector3(
      this.direction.x,
      0,
      this.direction.z
    ).normalize();
    const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();

    // Calculate target rotation based on movement direction
    if (
      keys["w"] ||
      keys["W"] ||
      keys["s"] ||
      keys["S"] ||
      keys["a"] ||
      keys["A"] ||
      keys["d"] ||
      keys["D"]
    ) {
      // Calculate the angle between the avatar's current forward direction and the camera's forward direction
      this.targetRotation = Math.atan2(forward.x, forward.z);
    }

    // Smoothly rotate the avatar towards the target rotation
    const rotationDiff = this.targetRotation - this.currentRotation;

    // Normalize the difference to be between -PI and PI
    let normalizedDiff = rotationDiff;
    while (normalizedDiff > Math.PI) normalizedDiff -= 2 * Math.PI;
    while (normalizedDiff < -Math.PI) normalizedDiff += 2 * Math.PI;

    // Apply rotation speed
    if (Math.abs(normalizedDiff) > 0.01) {
      const rotationStep =
        Math.sign(normalizedDiff) * this.rotationSpeed * deltaTime * 60;
      this.currentRotation += rotationStep;

      // Update the avatar's rotation
      this.mesh.rotation.y = this.currentRotation;
    }

    // Apply movement based on keys
    if (keys["w"] || keys["W"]) {
      this.velocity.add(forward.multiplyScalar(this.moveSpeed));
    }
    if (keys["s"] || keys["S"]) {
      this.velocity.add(forward.multiplyScalar(-this.moveSpeed));
    }
    if (keys["a"] || keys["A"]) {
      this.velocity.add(right.multiplyScalar(this.moveSpeed));
    }
    if (keys["d"] || keys["D"]) {
      this.velocity.add(right.multiplyScalar(-this.moveSpeed));
    }

    // Handle jumping
    if ((keys[" "] || keys["Space"]) && !this.isJumping) {
      this.isJumping = true;
      this.jumpStartTime = performance.now() / 1000; // Convert to seconds
    }

    // Update position
    this.mesh.position.add(this.velocity);

    // Handle jump animation
    if (this.isJumping) {
      const elapsed = performance.now() / 1000 - this.jumpStartTime;
      if (elapsed < this.jumpDuration) {
        const t = elapsed / this.jumpDuration; // Progress from 0 to 1
        const jumpY = Math.sin(t * Math.PI) * this.jumpHeight; // Sine curve for smooth jump
        this.mesh.position.y = this.groundY + jumpY;
      } else {
        // Jump has completed
        this.mesh.position.y = this.groundY;
        this.isJumping = false;
      }
    } else {
      // Ensure the avatar stays on the ground
      this.mesh.position.y = this.groundY;
    }
  }
}
