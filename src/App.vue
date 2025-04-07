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
    <div v-if="webglError" class="webgl-error">
      <h2>WebGL Error</h2>
      <p>{{ webglErrorMessage }}</p>
      <p>
        Please try a different browser or enable WebGL in your current browser.
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import { Scene } from "./core/Scene";
import { Avatar } from "./core/Avatar";
import { KeyboardControls } from "./controls/KeyboardControls";

export default defineComponent({
  name: "App",
  setup() {
    const canvas = ref<HTMLCanvasElement | null>(null);
    let scene: Scene | null = null;
    let avatar: Avatar | null = null;
    let keyboardControls: KeyboardControls | null = null;
    let animationFrameId: number | null = null;
    let lastTime: number = performance.now();
    const webglError = ref<boolean>(false);
    const webglErrorMessage = ref<string>("");

    const init = () => {
      if (!canvas.value) return;

      try {
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

            // Get keyboard state
            const keys = keyboardControls.getKeys();

            // Update avatar with keys and delta time
            avatar.update(keys, deltaTime);

            // Update camera to follow avatar
            scene.updateCamera(avatar.getMesh().position);

            // Render scene
            scene.render();
          }
          animationFrameId = requestAnimationFrame(animate);
        };
        animate();
      } catch (error) {
        console.error("Error initializing 3D scene:", error);
        webglError.value = true;
        webglErrorMessage.value =
          error instanceof Error ? error.message : String(error);

        // Display error message on canvas
        if (canvas.value) {
          const ctx = canvas.value.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);
            ctx.font = "24px Arial";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(
              "WebGL is not supported in your browser",
              canvas.value.width / 2,
              canvas.value.height / 2 - 30
            );
            ctx.font = "16px Arial";
            ctx.fillText(
              "Please try a different browser or enable WebGL",
              canvas.value.width / 2,
              canvas.value.height / 2 + 10
            );
            ctx.fillText(
              "Error: " + webglErrorMessage.value,
              canvas.value.width / 2,
              canvas.value.height / 2 + 40
            );
          }
        }
      }
    };

    onMounted(() => {
      init();
    });

    return {
      canvas,
      webglError,
      webglErrorMessage,
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

.webgl-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(255, 0, 0, 0.8);
  color: white;
  padding: 20px;
  border-radius: 5px;
  text-align: center;
  max-width: 80%;
  z-index: 1000;
}

.webgl-error h2 {
  margin: 0 0 10px 0;
  font-size: 24px;
}

.webgl-error p {
  margin: 5px 0;
  font-size: 16px;
}
</style>
