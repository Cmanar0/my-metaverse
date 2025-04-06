import * as THREE from "three";
// @ts-ignore
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class Scene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public canvas: HTMLCanvasElement;
  private cameraOffset: THREE.Vector3 = new THREE.Vector3(0, 3, 5);
  private cameraLookAt: THREE.Vector3 = new THREE.Vector3(0, 0.5, 0);
  private rotationSpeed: number = 0.05;
  private cameraRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  private mouseMovement: THREE.Vector2 = new THREE.Vector2(0, 0);
  private isPointerLocked: boolean = false;
  private cameraSmoothing: number = 0.1; // Lower values = smoother camera movement
  private debugMode: boolean = true; // Enable debug logging

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 5);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Add orbit controls (we'll use these for reference but implement our own rotation)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false; // Disable orbit controls as we're implementing our own

    // Add click event to request pointer lock
    this.canvas.addEventListener("click", () => {
      if (!this.isPointerLocked) {
        this.canvas.requestPointerLock();
      }
    });

    // Add pointer lock change event listener
    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });

    // Add mouse movement event listener for pointer lock mode
    document.addEventListener("mousemove", (event) => {
      if (this.isPointerLocked) {
        // In pointer lock mode, movementX and movementY represent the change in mouse position
        // regardless of screen boundaries
        const sensitivity = 0.002;
        this.mouseMovement.x = event.movementX * sensitivity;
        this.mouseMovement.y = event.movementY * sensitivity;

        // Log mouse movement for debugging
        if (this.debugMode) {
          console.log(
            `Mouse Movement: X=${this.mouseMovement.x.toFixed(
              4
            )}, Y=${this.mouseMovement.y.toFixed(4)}`
          );
        }
      }
    });
  }

  public addLighting(): void {
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
  }

  public addGround(): THREE.Mesh {
    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x228b22,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -0.5; // Position slightly below the origin
    this.scene.add(ground);

    return ground;
  }

  public addEnvironmentObjects(): THREE.Mesh[] {
    const envObjects: THREE.Mesh[] = [];

    // Add some environment objects
    const createCube = (x: number, z: number, color: number) => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(x, 0, z);
      this.scene.add(cube);
      return cube;
    };

    envObjects.push(
      createCube(-3, -3, 0x8b4513), // Brown cube
      createCube(3, 3, 0x8b4513), // Brown cube
      createCube(-2, 2, 0xcd853f), // Tan cube
      createCube(2, -2, 0xcd853f) // Tan cube
    );

    return envObjects;
  }

  public updateCamera(avatarPosition: THREE.Vector3): void {
    // Always center the camera on the avatar
    this.cameraLookAt.copy(avatarPosition);
    this.cameraLookAt.y = 0.5; // Look at avatar height

    // Apply rotation based on mouse movement
    if (this.isPointerLocked) {
      // Store previous rotation values for logging
      const prevRotationX = this.cameraRotation.x;
      const prevRotationY = this.cameraRotation.y;

      // Handle horizontal rotation (left/right) separately
      if (Math.abs(this.mouseMovement.x) > 0.0001) {
        // Horizontal rotation (y-axis) - left/right (switched)
        this.cameraRotation.y -= this.mouseMovement.x * this.rotationSpeed * 20;

        if (this.debugMode) {
          console.log(
            `Horizontal Rotation: ${prevRotationY.toFixed(
              4
            )} -> ${this.cameraRotation.y.toFixed(
              4
            )} (Mouse X: ${this.mouseMovement.x.toFixed(4)})`
          );
        }
      }

      // Handle vertical rotation (up/down) separately
      if (Math.abs(this.mouseMovement.y) > 0.0001) {
        // Vertical rotation (x-axis) - up/down (switched)
        this.cameraRotation.x -= this.mouseMovement.y * this.rotationSpeed * 20;
        this.cameraRotation.x = Math.max(
          -Math.PI * 0.4,
          Math.min(Math.PI * 0.4, this.cameraRotation.x)
        );

        if (this.debugMode) {
          console.log(
            `Vertical Rotation: ${prevRotationX.toFixed(
              4
            )} -> ${this.cameraRotation.x.toFixed(
              4
            )} (Mouse Y: ${this.mouseMovement.y.toFixed(4)})`
          );
        }
      }

      // Reset mouse movement for next frame
      this.mouseMovement.set(0, 0);
    }

    // Create a new rotation object to avoid any potential issues with Euler angles
    const rotation = new THREE.Euler(
      this.cameraRotation.x,
      this.cameraRotation.y,
      0, // Keep z-rotation at 0 to prevent any roll
      "YXZ" // Use YXZ order to ensure proper rotation
    );

    // Calculate camera position based on avatar position and rotation
    const distance = this.cameraOffset.length();
    const offset = new THREE.Vector3(0, 0, distance);

    // Apply rotation to offset
    offset.applyEuler(rotation);

    // Set camera position relative to avatar
    this.camera.position.copy(avatarPosition).add(offset);

    // Make camera look at avatar
    this.camera.lookAt(this.cameraLookAt);
  }

  public resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
