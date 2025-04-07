import * as THREE from "three";
// @ts-ignore
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// @ts-ignore
import { AnimationMixer, AnimationAction } from "three";

export class Avatar {
  public mesh: THREE.Group; // Changed from THREE.Mesh to THREE.Group to support GLTF models
  private moveSpeed: number = 0.1;
  private sprintSpeed: number = 0.2; // Faster speed when sprinting
  private rotationSpeed: number = 0.03; // Reduced from 0.05 to 0.03 for smoother rotation
  private jumpHeight: number = 1.5;
  private jumpDuration: number = 0.5;
  private groundY: number = 0.0; // Reverted back to original value
  private modelOffsetY: number = -0.5; // Reverted back to original value
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
  private debugMode: boolean = false;
  // GLTF model properties
  private modelLoaded: boolean = false;
  private animationMixer: AnimationMixer | null = null;
  private animations: { [key: string]: AnimationAction } = {};
  private currentAnimation: string = "Idle";
  private modelScale: number = 0.02; // Reduced to 1/10 of previous size (0.2 to 0.02)
  private modelPath: string = "/models/1940s_spy_animated_gltf/scene.gltf";
  // Animation transition properties
  private animationTransitionTime: number = 0.3; // Increased from 0.2 to 0.3 for smoother transitions
  private lastAnimationChange: number = 0; // Track when animation was last changed
  private animationChangeCooldown: number = 0.5; // Minimum time between animation changes
  private lastMovementTime: number = 0; // Track when movement was last detected
  private movementTimeout: number = 0.2; // Time before switching to idle after stopping

  constructor(camera: THREE.Camera) {
    this.camera = camera;

    try {
      // Create a temporary mesh until the GLTF model is loaded
      const tempGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
      const tempMaterial = new THREE.MeshStandardMaterial({
        color: 0x4169e1,
        roughness: 0.7,
        metalness: 0.2,
      });
      const tempMesh = new THREE.Mesh(tempGeometry, tempMaterial);
      tempMesh.position.y = this.modelOffsetY; // Position the temporary mesh lower within the group

      // Create a group to hold the mesh
      this.mesh = new THREE.Group();
      this.mesh.add(tempMesh);
      this.mesh.position.y = this.groundY; // Position the group at ground level

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

      // Load the GLTF model
      this.loadGLTFModel();
    } catch (error) {
      console.error("Error creating avatar:", error);

      // Create a simple fallback avatar
      const fallbackGeometry = new THREE.BoxGeometry(1, 2, 1);
      const fallbackMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);

      this.mesh = new THREE.Group();
      this.mesh.add(fallbackMesh);
      this.mesh.position.y = this.groundY;

      // Create a simple shadow
      const shadowGeometry = new THREE.CircleGeometry(0.7, 32);
      const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
      });
      this.shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      this.shadow.rotation.x = -Math.PI / 2;
      this.shadow.position.y = -0.49;
    }
  }

  private loadGLTFModel(): void {
    try {
      const loader = new GLTFLoader();

      loader.load(
        this.modelPath,
        (gltf) => {
          if (this.debugMode) {
            console.log("GLTF model loaded successfully", gltf);
          }

          // Remove the temporary mesh
          while (this.mesh.children.length > 0) {
            this.mesh.remove(this.mesh.children[0]);
          }

          // Add the loaded model to the mesh group
          const model = gltf.scene;
          model.scale.set(this.modelScale, this.modelScale, this.modelScale);

          // Position the model to place it on the floor
          // Apply the model offset to move it down within the group
          model.position.y = this.modelOffsetY;

          this.mesh.add(model);

          // Set up animations if available
          if (gltf.animations && gltf.animations.length > 0) {
            this.animationMixer = new THREE.AnimationMixer(model);

            // Store all animations
            gltf.animations.forEach((clip) => {
              if (this.debugMode) {
                console.log(`Animation loaded: ${clip.name}`);
              }
              this.animations[clip.name] =
                this.animationMixer!.clipAction(clip);
            });

            // Play the idle animation by default
            if (this.animations["Idle"]) {
              this.currentAnimation = "Idle";
              this.animations["Idle"].play();
            } else if (Object.keys(this.animations).length > 0) {
              // If no idle animation, play the first available one
              this.currentAnimation = Object.keys(this.animations)[0];
              this.animations[this.currentAnimation].play();
            }
          }

          this.modelLoaded = true;
        },
        (xhr) => {
          if (this.debugMode) {
            console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
          }
        },
        (error) => {
          console.error("Error loading GLTF model:", error);
        }
      );
    } catch (error) {
      console.error("Error in loadGLTFModel:", error);
    }
  }

  public update(keys: { [key: string]: boolean }, deltaTime: number): void {
    try {
      // Update animation mixer if available
      if (this.animationMixer) {
        this.animationMixer.update(deltaTime);
      }

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

      // Handle sprinting and crouching
      this.isSprinting = keys["Shift"] && (keys["w"] || keys["W"]);
      this.isCrouching = keys["Control"];

      // Update avatar height based on crouching - only for temporary mesh
      if (!this.modelLoaded && this.mesh.children[0] instanceof THREE.Mesh) {
        const tempMesh = this.mesh.children[0] as THREE.Mesh;
        if (this.isCrouching) {
          tempMesh.scale.y = this.crouchHeight / this.normalHeight;
        } else {
          tempMesh.scale.y = 1.0;
        }
      }

      // Calculate target rotation based on movement direction
      if (keys["w"] || keys["a"] || keys["s"] || keys["d"]) {
        // Calculate the angle between the avatar's current forward direction and the camera's forward direction
        this.targetRotation = Math.atan2(forward.x, forward.z);

        // Update last movement time
        this.lastMovementTime = performance.now() / 1000;
      }

      // Smoothly rotate the avatar towards the target rotation
      const rotationDiff = this.targetRotation - this.currentRotation;

      // Normalize the difference to be between -PI and PI
      let normalizedDiff = rotationDiff;
      while (normalizedDiff > Math.PI) normalizedDiff -= 2 * Math.PI;
      while (normalizedDiff < -Math.PI) normalizedDiff += 2 * Math.PI;

      // Apply rotation speed with smoother transition
      if (Math.abs(normalizedDiff) > 0.01) {
        // Use a smoother rotation curve
        const rotationStep =
          Math.sign(normalizedDiff) *
          Math.min(
            Math.abs(normalizedDiff),
            this.rotationSpeed * deltaTime * 60
          );
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

      // Update animations based on movement
      if (this.modelLoaded && this.animationMixer) {
        const currentTime = performance.now() / 1000;
        const timeSinceLastAnimationChange =
          currentTime - this.lastAnimationChange;
        const timeSinceLastMovement = currentTime - this.lastMovementTime;

        // Determine which animation to play based on movement
        let targetAnimation = "Idle";

        if (this.isJumping) {
          // No jump animation in this model, use "Walking" instead
          targetAnimation = "Walking";
        } else if (this.velocity.lengthSq() > 0.01) {
          if (this.isSprinting) {
            // No run animation in this model, use "Walking" with faster playback
            targetAnimation = "Walking";
          } else {
            targetAnimation = "Walking";
          }
        } else if (timeSinceLastMovement < this.movementTimeout) {
          // Keep the walking animation for a short time after stopping
          targetAnimation = "Walking";
        }

        // Only change animation if enough time has passed since the last change
        if (
          targetAnimation !== this.currentAnimation &&
          timeSinceLastAnimationChange > this.animationChangeCooldown
        ) {
          // Fade out current animation
          if (this.animations[this.currentAnimation]) {
            this.animations[this.currentAnimation].fadeOut(
              this.animationTransitionTime
            );
          }

          // Fade in new animation
          if (this.animations[targetAnimation]) {
            this.animations[targetAnimation]
              .reset()
              .fadeIn(this.animationTransitionTime)
              .play();

            // Update current animation
            this.currentAnimation = targetAnimation;
            this.lastAnimationChange = currentTime;

            if (this.debugMode) {
              console.log(`Animation changed to: ${targetAnimation}`);
            }
          }
        }
      }

      // Handle jumping
      if (keys[" "] && !this.isJumping) {
        this.isJumping = true;
        this.jumpStartTime = performance.now() / 1000;
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

      // Apply velocity to position
      this.mesh.position.x += this.velocity.x;
      this.mesh.position.z += this.velocity.z;
    } catch (error) {
      console.error("Error updating avatar:", error);
    }
  }

  public getMesh(): THREE.Object3D {
    return this.mesh;
  }

  public getShadow(): THREE.Mesh {
    return this.shadow;
  }
}
