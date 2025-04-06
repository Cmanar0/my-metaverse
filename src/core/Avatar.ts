import * as THREE from "three";
import { CollisionSystem } from "./CollisionSystem";

export class Avatar {
  public mesh: THREE.Mesh;
  private moveSpeed: number = 0.1;
  private sprintSpeed: number = 0.2; // Faster speed when sprinting
  private rotationSpeed: number = 0.05;
  private jumpHeight: number = 1.5;
  private jumpDuration: number = 0.5;
  private groundY: number = 1.0; // Increased from 0.5 to 1.0 to position avatar higher above ground
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private direction: THREE.Vector3 = new THREE.Vector3();
  private isJumping: boolean = false;
  private jumpStartTime: number = 0;
  private camera: THREE.Camera;
  private targetRotation: number = 0;
  private currentRotation: number = 0;
  private isSprinting: boolean = false;
  private isCrouching: boolean = false;
  private crouchHeight: number = 0.5; // Height when crouching
  private normalHeight: number = 1.0; // Normal height
  private acceleration: number = 0.05; // For smooth acceleration
  private deceleration: number = 0.03; // For smooth deceleration
  private currentSpeed: number = 0; // Current movement speed
  private shadow: THREE.Mesh; // Shadow mesh
  private dustParticles: THREE.Points; // Dust particles when moving
  private particleSystem: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particlePositions: Float32Array;
  private particleCount: number = 50;
  private collisionSystem: CollisionSystem;
  // Bumping mechanics properties
  private isBumping: boolean = false;
  private bumpStartTime: number = 0;
  private bumpDuration: number = 0.3; // Duration of bump effect in seconds
  private bumpVelocity: THREE.Vector3 = new THREE.Vector3();
  private controlsDisabled: boolean = false;
  private controlsDisabledStartTime: number = 0;
  private controlsDisabledDuration: number = 0.3; // Duration to disable controls in seconds
  private debugMode: boolean = false;
  // Visual effects for bumping
  private originalColor: THREE.Color = new THREE.Color(0x4169e1); // Default blue color
  private bumpColor: THREE.Color = new THREE.Color(0xff0000); // Red color for bump effect

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.collisionSystem = new CollisionSystem();

    // Create avatar mesh with more detailed geometry
    const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const material = new THREE.MeshStandardMaterial({
      color: this.originalColor,
      roughness: 0.7,
      metalness: 0.2,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = this.groundY; // Position above ground

    // Create shadow
    const shadowGeometry = new THREE.CircleGeometry(0.7, 32);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    });
    this.shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = -0.49; // Position just above the ground plane (which is at -0.5)

    // Create dust particles
    this.particleSystem = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });

    // Initialize particle positions
    for (let i = 0; i < this.particleCount; i++) {
      this.particlePositions[i * 3] = 0;
      this.particlePositions[i * 3 + 1] = 0;
      this.particlePositions[i * 3 + 2] = 0;
    }

    this.particleSystem.setAttribute(
      "position",
      new THREE.BufferAttribute(this.particlePositions, 3)
    );
    this.dustParticles = new THREE.Points(
      this.particleSystem,
      this.particleMaterial
    );
    this.dustParticles.visible = false;
  }

  public update(keys: { [key: string]: boolean }, deltaTime: number): void {
    // Check if controls are disabled due to bumping
    if (this.controlsDisabled) {
      const elapsed = performance.now() / 1000 - this.controlsDisabledStartTime;
      if (elapsed >= this.controlsDisabledDuration) {
        this.controlsDisabled = false;
        if (this.debugMode) {
          console.log("Controls re-enabled after bump");
        }
      } else {
        // Skip keyboard input processing while controls are disabled
        keys = {};
      }
    }

    // Check if we're in the middle of a bump
    if (this.isBumping) {
      const elapsed = performance.now() / 1000 - this.bumpStartTime;
      if (elapsed >= this.bumpDuration) {
        this.isBumping = false;
        this.bumpVelocity.set(0, 0, 0);

        // Reset color
        if (this.mesh.material instanceof THREE.MeshStandardMaterial) {
          this.mesh.material.color.copy(this.originalColor);
        }

        if (this.debugMode) {
          console.log("Bump effect ended");
        }
      } else {
        // Apply bump velocity
        this.velocity.copy(this.bumpVelocity);

        // Apply visual effect - flash red
        if (this.mesh.material instanceof THREE.MeshStandardMaterial) {
          this.mesh.material.color.copy(this.bumpColor);
        }
      }
    } else {
      // Reset velocity if not bumping
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

      // Handle sprinting and crouching
      this.isSprinting = keys["Shift"] && (keys["w"] || keys["W"]);
      this.isCrouching = keys["Control"];

      // Update avatar height based on crouching
      if (this.isCrouching) {
        this.mesh.scale.y = this.crouchHeight / this.normalHeight;
      } else {
        this.mesh.scale.y = 1.0;
      }

      // Calculate target rotation based on movement direction
      if (keys["w"] || keys["a"] || keys["s"] || keys["d"]) {
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

      // Determine target speed based on movement keys and sprinting
      let targetSpeed = 0;
      if (keys["w"] || keys["s"] || keys["a"] || keys["d"]) {
        targetSpeed = this.isSprinting ? this.sprintSpeed : this.moveSpeed;
      }

      // Smoothly adjust current speed (acceleration/deceleration)
      if (this.currentSpeed < targetSpeed) {
        this.currentSpeed += this.acceleration * deltaTime * 60;
        if (this.currentSpeed > targetSpeed) this.currentSpeed = targetSpeed;
      } else if (this.currentSpeed > targetSpeed) {
        this.currentSpeed -= this.deceleration * deltaTime * 60;
        if (this.currentSpeed < targetSpeed) this.currentSpeed = targetSpeed;
      }

      // Apply movement based on keys with current speed
      if (keys["w"]) {
        this.velocity.add(forward.multiplyScalar(this.currentSpeed));
      }
      if (keys["s"]) {
        this.velocity.add(forward.multiplyScalar(-this.currentSpeed));
      }
      if (keys["a"]) {
        this.velocity.add(right.multiplyScalar(this.currentSpeed));
      }
      if (keys["d"]) {
        this.velocity.add(right.multiplyScalar(-this.currentSpeed));
      }
    }

    // Handle jumping with improved physics
    if (
      (keys[" "] || keys["Space"]) &&
      !this.isJumping &&
      !this.controlsDisabled
    ) {
      this.isJumping = true;
      this.jumpStartTime = performance.now() / 1000; // Convert to seconds
    }

    // Calculate new position with velocity
    const newPosition = this.mesh.position.clone().add(this.velocity);

    // Check for collisions and get adjusted position and velocity
    const collisionResult = this.collisionSystem.checkCollision(
      newPosition,
      this.velocity
    );

    // Check if a collision was detected
    if (collisionResult.collisionDetected) {
      // Collision detected - start bumping
      if (!this.isBumping && !this.controlsDisabled) {
        this.isBumping = true;
        this.bumpStartTime = performance.now() / 1000;

        // Calculate bump velocity (opposite of current velocity)
        this.bumpVelocity.copy(this.velocity).multiplyScalar(-1.5); // 1.5x the original velocity

        // Disable controls
        this.controlsDisabled = true;
        this.controlsDisabledStartTime = performance.now() / 1000;

        if (this.debugMode) {
          console.log("Collision detected - starting bump effect");
          console.log("Bump velocity:", this.bumpVelocity);
        }
      }
    }

    // Update position and velocity with collision detection
    this.mesh.position.copy(collisionResult.position);

    // Only update velocity if not bumping
    if (!this.isBumping) {
      this.velocity.copy(collisionResult.velocity);
    }

    // Handle jump animation with improved physics
    if (this.isJumping) {
      const elapsed = performance.now() / 1000 - this.jumpStartTime;
      if (elapsed < this.jumpDuration) {
        const t = elapsed / this.jumpDuration; // Progress from 0 to 1
        // Use a more realistic jump curve (parabolic)
        const jumpY = -4 * this.jumpHeight * (t * t - t); // Parabolic curve
        this.mesh.position.y = this.groundY + jumpY;

        // Scale shadow based on height
        const shadowScale = 1 - (jumpY / this.jumpHeight) * 0.5;
        this.shadow.scale.set(shadowScale, shadowScale, 1);
      } else {
        // Jump has completed
        this.mesh.position.y = this.groundY;
        this.isJumping = false;
        this.shadow.scale.set(1, 1, 1);
      }
    } else {
      // Ensure the avatar stays on the ground
      this.mesh.position.y = this.groundY;
      this.shadow.scale.set(1, 1, 1);
    }

    // Update shadow position
    this.shadow.position.x = this.mesh.position.x;
    this.shadow.position.z = this.mesh.position.z;

    // Update dust particles
    this.updateDustParticles(deltaTime);
  }

  private updateDustParticles(deltaTime: number): void {
    // Only show particles when moving and not jumping
    const isMoving = this.velocity.length() > 0.01;
    this.dustParticles.visible = isMoving && !this.isJumping;

    if (isMoving && !this.isJumping) {
      // Update particle positions
      for (let i = 0; i < this.particleCount; i++) {
        // Random offset from avatar position
        const offsetX = (Math.random() - 0.5) * 1.5;
        const offsetZ = (Math.random() - 0.5) * 1.5;

        this.particlePositions[i * 3] = this.mesh.position.x + offsetX;
        this.particlePositions[i * 3 + 1] = -0.49; // Position just above the ground plane (which is at -0.5)
        this.particlePositions[i * 3 + 2] = this.mesh.position.z + offsetZ;
      }

      this.particleSystem.attributes.position.needsUpdate = true;

      // Fade particles based on movement speed
      this.particleMaterial.opacity = Math.min(
        0.7,
        (this.currentSpeed / this.moveSpeed) * 0.5
      );
    }
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public getShadow(): THREE.Mesh {
    return this.shadow;
  }

  public getDustParticles(): THREE.Points {
    return this.dustParticles;
  }

  public addCollidableObject(object: THREE.Mesh): void {
    this.collisionSystem.addObject(object);
  }

  public removeCollidableObject(object: THREE.Mesh): void {
    this.collisionSystem.removeObject(object);
  }

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    if (this.collisionSystem) {
      this.collisionSystem.setDebugMode(enabled);
    }
  }
}
