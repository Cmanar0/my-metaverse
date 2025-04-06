<template>
  <div class="app-container">
    <canvas ref="canvas"></canvas>
    <div class="controls-panel">
      <h3>Controls</h3>
      <p>WASD - Move avatar</p>
      <p>Shift + W - Sprint</p>
      <p>Ctrl - Crouch</p>
      <p>Space - Jump</p>
      <p>Click on the scene - Enable continuous camera rotation</p>
      <p>Mouse - Rotate camera around avatar (unlimited rotation)</p>
      <p>ESC - Release mouse pointer</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Scene } from "./core/Scene";
import { Avatar } from "./core/Avatar";
import { KeyboardControls } from "./controls/KeyboardControls";

const canvas = ref<HTMLCanvasElement | null>(null);
let scene: Scene | null = null;
let avatar: Avatar | null = null;
let keyboardControls: KeyboardControls | null = null;
let animationFrameId: number | null = null;
let lastTime: number = performance.now();

// Initialize the scene, avatar, and controls
const init = () => {
  if (!canvas.value) return;

  // Create scene
  scene = new Scene(canvas.value);
  scene.addLighting();
  scene.addGround();
  scene.addEnvironmentObjects();

  // Create avatar
  avatar = new Avatar(scene.camera);
  scene.scene.add(avatar.getMesh());

  // Add shadow and dust particles to the scene
  scene.scene.add(avatar.getShadow());
  scene.scene.add(avatar.getDustParticles());

  // Create keyboard controls
  keyboardControls = new KeyboardControls();

  // Handle window resize
  const handleResize = () => {
    if (scene) {
      scene.resize();
    }
  };
  window.addEventListener("resize", handleResize);

  // Animation loop
  const animate = () => {
    if (scene && avatar && keyboardControls) {
      // Calculate delta time
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Update avatar based on keyboard input
      avatar.update(keyboardControls.getKeys(), deltaTime);

      // Update camera to follow avatar
      scene.updateCamera(avatar.getMesh().position);

      // Render scene
      scene.render();
    }
    animationFrameId = requestAnimationFrame(animate);
  };
  animate();

  // Clean up function
  onBeforeUnmount(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    window.removeEventListener("resize", handleResize);
    if (keyboardControls) {
      keyboardControls.cleanup();
    }
  });
};

onMounted(() => {
  init();
});
</script>

<style scoped>
.app-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.controls-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px;
  border-radius: 8px;
  font-family: Arial, sans-serif;
  z-index: 10;
}

h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

p {
  margin: 5px 0;
}
</style>
