import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

// Check if WebGL is supported before creating the app
function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

// Create the app only if WebGL is supported
if (isWebGLAvailable()) {
  const app = createApp(App);
  app.mount("#app");
} else {
  console.error("WebGL is not supported in this browser");
  // The fallback message will be shown from the HTML file
}
