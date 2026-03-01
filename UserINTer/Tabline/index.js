const tabButtons = Array.from(document.querySelectorAll(".tab-item"));
const panels = Array.from(document.querySelectorAll(".panel"));

function setActive(panelId) {
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.panel === panelId);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === panelId);
  });
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setActive(btn.dataset.panel);
  });
});
