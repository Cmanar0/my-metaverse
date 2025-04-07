<template>
  <div class="app">
    <canvas ref="canvas"></canvas>
    <div class="controls-info">
      <h2>Controls</h2>
      <p>WASD - Move</p>
      <p>Space - Jump</p>
      <p>Shift - Run</p>
      <p>Ctrl - Crouch</p>
      <p>Mouse - Look around</p>
      <p>Click - Lock mouse</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import { Scene } from "./core/Scene";
import { Avatar } from "./core/Avatar";
import { KeyboardControls } from "./controls/KeyboardControls";
import { CollisionSystem } from "./core/CollisionSystem";

export default defineComponent({
  name: "App",
  setup() {
    const canvas = ref<HTMLCanvasElement | null>(null);
    let scene: Scene | null = null;
    let avatar: Avatar | null = null;
    let keyboardControls: KeyboardControls | null = null;
    let collisionSystem: CollisionSystem | null = null;
    let animationFrameId: number | null = null;
    let lastTime: number = performance.now();

    const init = () => {
      if (!canvas.value) return;

      // Create scene
      scene = new Scene(canvas.value);
      scene.addLighting();
      const ground = scene.addGround();
      const envObjects = scene.addEnvironmentObjects();

      // Create avatar with camera
      avatar = new Avatar(scene.camera);
      scene.scene.add(avatar.getMesh());
      scene.scene.add(avatar.getShadow());

      // Create keyboard controls
      keyboardControls = new KeyboardControls();

      // Create collision system
      collisionSystem = new CollisionSystem();
      scene.registerCollidableObjects(avatar);

      // Handle window resize
      const handleResize = () => {
        if (scene) {
          scene.resize();
        }
      };
      window.addEventListener("resize", handleResize);

      // Animation loop
      const animate = () => {
        if (scene && avatar && keyboardControls && collisionSystem) {
          // Calculate delta time
          const currentTime = performance.now();
          const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
          lastTime = currentTime;

          // Get keyboard state
          const keys = keyboardControls.getKeys();

          // Update avatar with keys and delta time
          avatar.update(keys, deltaTime);

          // Update camera to follow avatar
          scene.updateCamera(avatar.getMesh().position);

          // Check for collisions with environment objects
          for (const obj of envObjects) {
            avatar.addCollidableObject(obj);
          }

          // Render scene
          scene.render();
        }
        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    };

    onMounted(() => {
      init();
    });

    return {
      canvas,
    };
  },
});
</script>

<style>
.app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.controls-info {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px;
  border-radius: 5px;
  font-family: Arial, sans-serif;
}

.controls-info h2 {
  margin: 0 0 10px 0;
  font-size: 18px;
}

.controls-info p {
  margin: 5px 0;
  font-size: 14px;
}
</style>
