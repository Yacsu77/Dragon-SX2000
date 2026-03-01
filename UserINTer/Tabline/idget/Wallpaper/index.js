document.body.dataset.widget = "Wallpaper";

const previewLayer = document.getElementById("previewLayer");
const imageInput = document.getElementById("wallpaperImageInput");
const videoInput = document.getElementById("wallpaperVideoInput");
const rotateControl = document.getElementById("rotateControl");
const flipHorizontal = document.getElementById("flipHorizontal");
const flipVertical = document.getElementById("flipVertical");
const resetAdjustments = document.getElementById("resetAdjustments");
const applyButton = document.getElementById("applyWallpaper");
const statusLabel = document.getElementById("wallpaperStatus");
const previewContainer = document.getElementById("wallpaperPreview");
const progress = document.getElementById("applyProgress");
const progressBar = document.getElementById("applyProgressBar");
const progressValue = document.getElementById("applyProgressValue");

let currentMedia = null;
let currentType = null;
let currentDataUrl = null;
let currentFilePath = null;
let transformState = {
  x: 0,
  y: 0,
  rotate: 0,
  flipX: 1,
  flipY: 1
};

let isDragging = false;
let dragStart = { x: 0, y: 0 };
let baseOffset = { x: 0, y: 0 };

function setStatus(message) {
  if (statusLabel) {
    statusLabel.textContent = message;
  }
}

function updateTransform() {
  if (!currentMedia) return;
  const { x, y, rotate, flipX, flipY } = transformState;
  currentMedia.style.transform =
    `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) ` +
    `rotate(${rotate}deg) scale(${flipX}, ${flipY})`;
}

function clearPreview() {
  if (!previewLayer) return;
  previewLayer.innerHTML = '<span class="preview-placeholder">Selecione uma imagem ou video</span>';
  currentMedia = null;
}

function loadImage(file) {
  if (!previewLayer) return;
  currentType = "image";
  currentFilePath = null;
  const img = document.createElement("img");
  img.className = "preview-media";
  img.alt = "Wallpaper preview";
  const reader = new FileReader();
  reader.onload = () => {
    currentDataUrl = reader.result;
    img.src = currentDataUrl;
  };
  reader.readAsDataURL(file);
  previewLayer.innerHTML = "";
  previewLayer.appendChild(img);
  currentMedia = img;
  resetTransforms();
  setStatus(`Imagem carregada: ${file.name}`);
}

function loadVideo(file) {
  if (!previewLayer) return;
  currentType = "video";
  currentFilePath = file && file.path ? file.path : null;
  const video = document.createElement("video");
  video.className = "preview-media video";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  if (currentFilePath) {
    currentDataUrl = currentFilePath;
    video.src = toFileUrl(currentFilePath);
  } else {
    currentDataUrl = URL.createObjectURL(file);
    video.src = currentDataUrl;
  }
  previewLayer.innerHTML = "";
  previewLayer.appendChild(video);
  currentMedia = video;
  resetTransforms();
  setStatus(`Video carregado: ${file.name}`);
}

function resetTransforms() {
  transformState = {
    x: 0,
    y: 0,
    rotate: 0,
    flipX: 1,
    flipY: 1
  };
  if (rotateControl) rotateControl.value = "0";
  updateTransform();
}

function saveState() {
  if (!currentType || !currentDataUrl) return;
  if (currentType === "video" && !currentFilePath) {
    setStatus("Video aplicado, mas nao pode ser salvo sem caminho do arquivo.");
    return;
  }
  const payload = {
    type: currentType,
    dataUrl: currentType === "video" ? currentFilePath : currentDataUrl,
    transform: transformState
  };
  localStorage.setItem("wallpaperState", JSON.stringify(payload));
}

function loadState() {
  const saved = localStorage.getItem("wallpaperState");
  if (!saved) return;
  try {
    const payload = JSON.parse(saved);
    if (!payload || !payload.dataUrl) return;
    currentType = payload.type;
    currentDataUrl = payload.dataUrl;
    currentFilePath = currentType === "video" ? payload.dataUrl : null;
    transformState = payload.transform || transformState;
    if (rotateControl) rotateControl.value = String(transformState.rotate || 0);
    if (currentType === "video") {
      const video = document.createElement("video");
      video.className = "preview-media video";
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.src = toFileUrl(currentDataUrl);
      previewLayer.innerHTML = "";
      previewLayer.appendChild(video);
      currentMedia = video;
    } else {
      const img = document.createElement("img");
      img.className = "preview-media";
      img.alt = "Wallpaper preview";
      img.src = currentDataUrl;
      previewLayer.innerHTML = "";
      previewLayer.appendChild(img);
      currentMedia = img;
    }
    updateTransform();
    applyToBackground();
  } catch (error) {
    // ignore invalid storage
  }
}

function setProgress(value) {
  if (!progress || !progressBar || !progressValue) return;
  const safeValue = Math.max(0, Math.min(100, value));
  progressBar.style.width = `${safeValue}%`;
  progressValue.textContent = `${safeValue}%`;
}

function startProgress(onDone) {
  if (!progress) {
    if (typeof onDone === "function") onDone();
    return;
  }
  progress.classList.add("is-loading");
  progress.setAttribute("aria-hidden", "false");
  setProgress(0);
  let current = 0;
  const timer = setInterval(() => {
    current += 12;
    setProgress(current);
    if (current >= 100) {
      clearInterval(timer);
      setTimeout(() => {
        progress.classList.remove("is-loading");
        progress.setAttribute("aria-hidden", "true");
        if (typeof onDone === "function") onDone();
      }, 150);
    }
  }, 90);
}

function applyToBackground() {
  const background = document.querySelector(".background");
  const backgroundVideo = document.querySelector(".background-video");
  const backgroundSource = backgroundVideo ? backgroundVideo.querySelector("source") : null;
  if (!background) return;

  if (currentType === "video") {
    if (backgroundVideo && backgroundSource) {
      const videoSrc = currentFilePath ? toFileUrl(currentFilePath) : currentDataUrl;
      backgroundSource.src = videoSrc;
      backgroundVideo.load();
      backgroundVideo.style.display = "block";
      backgroundVideo.play().catch(() => {});
    }
    background.style.backgroundImage = "none";
  } else {
    if (backgroundVideo) {
      backgroundVideo.pause();
      backgroundVideo.style.display = "none";
    }
    background.style.backgroundImage = `url(${currentDataUrl})`;
    background.style.backgroundSize = "cover";
    background.style.backgroundPosition = "center";
  }
}

function closeOverlay() {
  if (window.location.hash === "#wallpaper-widget") {
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
}

function toFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("file://")) return path;
  const normalized = path.replace(/\\/g, "/");
  return `file://${normalized}`;
}

if (imageInput) {
  imageInput.addEventListener("change", () => {
    const file = imageInput.files && imageInput.files[0];
    if (!file) return;
    loadImage(file);
  });
}

if (videoInput) {
  videoInput.addEventListener("change", () => {
    const file = videoInput.files && videoInput.files[0];
    if (!file) return;
    loadVideo(file);
  });
}

if (rotateControl) {
  rotateControl.addEventListener("input", () => {
    transformState.rotate = Number(rotateControl.value);
    updateTransform();
  });
}

if (flipHorizontal) {
  flipHorizontal.addEventListener("click", () => {
    transformState.flipX *= -1;
    updateTransform();
  });
}

if (flipVertical) {
  flipVertical.addEventListener("click", () => {
    transformState.flipY *= -1;
    updateTransform();
  });
}

if (resetAdjustments) {
  resetAdjustments.addEventListener("click", () => {
    resetTransforms();
  });
}

if (previewLayer) {
  previewLayer.addEventListener("mousedown", (event) => {
    if (!currentMedia) return;
    isDragging = true;
    previewLayer.classList.add("dragging");
    dragStart = { x: event.clientX, y: event.clientY };
    baseOffset = { x: transformState.x, y: transformState.y };
  });
}

document.addEventListener("mousemove", (event) => {
  if (!isDragging || !currentMedia) return;
  const deltaX = event.clientX - dragStart.x;
  const deltaY = event.clientY - dragStart.y;
  transformState.x = baseOffset.x + deltaX;
  transformState.y = baseOffset.y + deltaY;
  updateTransform();
});

document.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    if (previewLayer) previewLayer.classList.remove("dragging");
  }
});

if (applyButton) {
  applyButton.addEventListener("click", () => {
    createRipple(applyButton);
    if (!currentMedia || !previewContainer) {
      setStatus("Selecione um wallpaper antes de aplicar.");
      return;
    }
    setStatus("Aplicando...");
    startProgress(() => {
      previewContainer.dataset.applied = "true";
      saveState();
      applyToBackground();
      setStatus("Wallpaper aplicado.");
      closeOverlay();
    });
  });
}

function createRipple(button) {
  const container = button.querySelector(".ripple-container");
  if (!container) return;
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${rect.width / 2 - size / 2}px`;
  ripple.style.top = `${rect.height / 2 - size / 2}px`;
  container.appendChild(ripple);
  ripple.addEventListener("animationend", () => {
    ripple.remove();
  });
}

loadState();
