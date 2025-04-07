import * as THREE from "three";
// @ts-ignore
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Avatar } from "./Avatar";

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
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background

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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Add directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;

    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;

    this.scene.add(directionalLight);

    // Add point lights for atmosphere
    const pointLight1 = new THREE.PointLight(0xffffcc, 0.5, 20);
    pointLight1.position.set(-5, 3, -5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xccffff, 0.5, 20);
    pointLight2.position.set(5, 3, -5);
    this.scene.add(pointLight2);
  }

  public addGround(): THREE.Mesh {
    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x228b22, // Forest green
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -0.5; // Position slightly below the origin
    ground.receiveShadow = true;

    // Mark as terrain - this is crucial for collision detection
    (ground as any).isTerrain = true;

    if (this.debugMode) {
      console.log(`Ground created and marked as terrain: ${ground.uuid}`);
    }

    this.scene.add(ground);

    // Add a decorative pattern to the ground
    this.addGroundPattern();

    return ground;
  }

  private addGroundPattern(): void {
    // Create a grid pattern on the ground
    const gridHelper = new THREE.GridHelper(50, 50, 0x000000, 0x000000);
    gridHelper.position.y = -0.49; // Just above the ground
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

  public addEnvironmentObjects(): THREE.Mesh[] {
    const envObjects: THREE.Mesh[] = [];

    // Create a function to add a building
    const createBuilding = (
      x: number,
      z: number,
      width: number,
      depth: number,
      height: number,
      color: number
    ) => {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.2,
      });
      const building = new THREE.Mesh(geometry, material);
      building.position.set(x, height / 2 - 0.5, z); // Position so bottom is at ground level
      building.castShadow = true;
      building.receiveShadow = true;
      this.scene.add(building);
      return building;
    };

    // Create a function to add a tree
    const createTree = (x: number, z: number) => {
      // Tree trunk
      const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(x, 0.25, z);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      this.scene.add(trunk);

      // Tree top
      const topGeometry = new THREE.ConeGeometry(1, 2, 8);
      const topMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
      const top = new THREE.Mesh(topGeometry, topMaterial);
      top.position.set(x, 1.75, z);
      top.castShadow = true;
      top.receiveShadow = true;
      this.scene.add(top);

      return [trunk, top];
    };

    // Create a function to add a street lamp
    const createStreetLamp = (x: number, z: number) => {
      // Lamp post
      const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
      const postMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(x, 1, z);
      post.castShadow = true;
      post.receiveShadow = true;
      this.scene.add(post);

      // Lamp head
      const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        emissive: 0xffffcc,
        emissiveIntensity: 0.5,
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.set(x, 2.5, z);
      this.scene.add(head);

      // Add point light
      const light = new THREE.PointLight(0xffffcc, 0.5, 10);
      light.position.set(x, 2.5, z);
      this.scene.add(light);

      return [post, head];
    };

    // Add buildings
    envObjects.push(
      createBuilding(-8, -8, 4, 4, 3, 0x8b4513), // Brown building
      createBuilding(8, -8, 4, 4, 5, 0x4682b4), // Steel blue building
      createBuilding(-8, 8, 4, 4, 4, 0xcd853f), // Peru building
      createBuilding(8, 8, 4, 4, 6, 0x708090) // Slate gray building
    );

    // Add trees
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 40 - 20;
      const z = Math.random() * 40 - 20;
      // Make sure trees are not too close to the center
      if (Math.abs(x) > 5 || Math.abs(z) > 5) {
        const treeParts = createTree(x, z);
        envObjects.push(...treeParts);
      }
    }

    // Add street lamps
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 15;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const lampParts = createStreetLamp(x, z);
      envObjects.push(...lampParts);
    }

    return envObjects;
  }

  public registerCollidableObjects(avatar: Avatar): void {
    // Register all environment objects as collidable, except terrain
    this.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object !== avatar.getMesh() &&
        !(object as any).isTerrain
      ) {
        if (this.debugMode) {
          console.log(`Registering collidable object: ${object.uuid}`);
          console.log(`Object is terrain: ${(object as any).isTerrain}`);
        }
        avatar.addCollidableObject(object);
      } else if (this.debugMode && object instanceof THREE.Mesh) {
        console.log(`Skipping object: ${object.uuid}`);
        console.log(`Is terrain: ${(object as any).isTerrain}`);
        console.log(`Is avatar: ${object === avatar.getMesh()}`);
      }
    });
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
