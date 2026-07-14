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

function resolveFilePath(file) {
  if (!file) return null;
  if (window.DragonWallpaper && typeof window.DragonWallpaper.getFilePath === "function") {
    const resolved = window.DragonWallpaper.getFilePath(file);
    if (resolved) return resolved;
  }
  return file.path || null;
}

function loadImage(file) {
  if (!previewLayer) return;
  currentType = "image";
  currentFilePath = resolveFilePath(file);
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
  currentFilePath = resolveFilePath(file);
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

async function persistMediaFile() {
  if (!window.DragonWallpaper) return null;

  if (currentType === "video") {
    if (currentFilePath) {
      return window.DragonWallpaper.importFile(currentFilePath, "video");
    }
    if (currentDataUrl && currentDataUrl.startsWith("blob:")) {
      const response = await fetch(currentDataUrl);
      const buffer = await response.arrayBuffer();
      return window.DragonWallpaper.importBlob(buffer, ".mp4");
    }
    return null;
  }

  if (currentType === "image") {
    if (currentFilePath) {
      return window.DragonWallpaper.importFile(currentFilePath, "image");
    }
    if (currentDataUrl && currentDataUrl.startsWith("data:")) {
      return window.DragonWallpaper.importDataUrl(currentDataUrl);
    }
  }

  return null;
}

async function saveState() {
  if (!currentType || !currentDataUrl) return false;

  let persistedPath = null;

  try {
    persistedPath = await persistMediaFile();
  } catch (error) {
    setStatus("Nao foi possivel salvar o wallpaper.");
    return false;
  }

  if (currentType === "video" && !persistedPath && !currentFilePath) {
    setStatus("Video aplicado, mas nao pode ser salvo sem caminho do arquivo.");
    return false;
  }

  const payload = {
    type: currentType,
    dataUrl: persistedPath || (currentType === "video" ? currentFilePath : currentDataUrl),
    transform: transformState
  };

  if (window.DragonWallpaper) {
    try {
      await window.DragonWallpaper.saveState(payload);
      if (window.UserStorage) window.UserStorage.removeItem("wallpaperState");
      else localStorage.removeItem("wallpaperState");
      if (persistedPath) {
        currentDataUrl = persistedPath;
        currentFilePath = currentType === "video" ? persistedPath : currentFilePath;
      }
      return true;
    } catch (error) {
      setStatus("Nao foi possivel salvar o wallpaper.");
      return false;
    }
  }

  try {
    if (window.UserStorage) {
      window.UserStorage.removeItem("wallpaperState");
      window.UserStorage.setItem("wallpaperState", JSON.stringify(payload));
    } else {
      localStorage.removeItem("wallpaperState");
      localStorage.setItem("wallpaperState", JSON.stringify(payload));
    }
    return true;
  } catch (error) {
    setStatus("Nao foi possivel salvar o wallpaper. Armazenamento cheio.");
    return false;
  }
}

function applyPayloadToPreview(payload) {
  if (!payload || !payload.dataUrl) return false;

  currentType = payload.type;
  currentDataUrl = payload.dataUrl;
  currentFilePath = currentType === "video" ? payload.dataUrl : null;
  transformState = payload.transform || transformState;
  if (rotateControl) rotateControl.value = String(transformState.rotate || 0);

  if (!previewLayer) return true;

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
    img.src = isFilesystemPath(currentDataUrl)
      ? toFileUrl(currentDataUrl)
      : currentDataUrl;
    previewLayer.innerHTML = "";
    previewLayer.appendChild(img);
    currentMedia = img;
  }

  updateTransform();
  return true;
}

async function loadState() {
  let payload = null;

  if (window.DragonWallpaper) {
    try {
      payload = await window.DragonWallpaper.readState();
    } catch (error) {
      payload = null;
    }
  }

  if (!payload) {
    const saved = window.UserStorage
      ? window.UserStorage.getItem("wallpaperState")
      : localStorage.getItem("wallpaperState");
    if (!saved) return;
    try {
      payload = JSON.parse(saved);
    } catch (error) {
      return;
    }
  }

  try {
    if (!applyPayloadToPreview(payload)) return;
    applyToBackground();
  } catch (error) {
    // ignore invalid storage
  }
}

async function clearBackgroundPreview() {
  if (previewLayer) previewLayer.innerHTML = "";
  currentMedia = null;
  currentDataUrl = null;
  currentFilePath = null;
  const background = document.querySelector(".background");
  const backgroundVideo = document.querySelector(".background-video");
  if (background) {
    background.style.backgroundImage = "none";
  }
  if (backgroundVideo) {
    backgroundVideo.pause();
    backgroundVideo.style.display = "none";
    const source = backgroundVideo.querySelector("source");
    if (source) source.src = "";
  }
}

async function reloadForUser() {
  await clearBackgroundPreview();
  await loadState();
}

window.WallpaperUserReload = reloadForUser;

document.addEventListener("user:changed", () => {
  reloadForUser();
});


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
      const videoSrc = isFilesystemPath(currentDataUrl)
        ? toFileUrl(currentDataUrl)
        : (currentFilePath ? toFileUrl(currentFilePath) : currentDataUrl);
      backgroundSource.src = videoSrc;
      backgroundVideo.load();
      backgroundVideo.style.display = "block";
      backgroundVideo.play().catch(() => {});
    }
    background.style.backgroundImage = "none";
    background.style.backgroundSize = "";
    background.style.backgroundPosition = "";
  } else {
    if (backgroundVideo) {
      backgroundVideo.pause();
      backgroundVideo.style.display = "none";
    }
    const imageSrc = isFilesystemPath(currentDataUrl)
      ? toFileUrl(currentDataUrl)
      : currentDataUrl;
    background.style.backgroundImage = `url(${imageSrc})`;
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
  if (path.startsWith("blob:") || path.startsWith("data:")) return path;
  const normalized = path.replace(/\\/g, "/");
  if (!normalized.startsWith("/")) {
    return `file:///${normalized}`;
  }
  return `file://${normalized}`;
}

function isFilesystemPath(value) {
  if (!value || typeof value !== "string") return false;
  if (value.startsWith("data:") || value.startsWith("blob:") || value.startsWith("file://")) {
    return false;
  }
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);
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
      saveState().then((saved) => {
        applyToBackground();
        setStatus(
          saved
            ? "Wallpaper aplicado."
            : "Wallpaper aplicado, mas nao foi salvo para a proxima sessao."
        );
        closeOverlay();
      });
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

loadState().catch(() => {});
