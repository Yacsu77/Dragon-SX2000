window.AutoTuneWidgets = window.AutoTuneWidgets || {};

(function () {
  const TASKLIST_KEY = "autotuneTasklistData";

  function loadState() {
    try {
      const raw = localStorage.getItem(TASKLIST_KEY);
      if (!raw) return { tasks: [], activeTaskId: null };
      const parsed = JSON.parse(raw);
      const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
      return {
        tasks: tasks.map((task) => ({
          id: task.id || `task-${Date.now()}`,
          text: String(task.text || "").trim(),
          done: !!task.done,
          totalMs: Number(task.totalMs) || 0
        })),
        activeTaskId: parsed.activeTaskId || null
      };
    } catch (_err) {
      return { tasks: [], activeTaskId: null };
    }
  }

  function saveState(state) {
    localStorage.setItem(TASKLIST_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("autotune:tasklist-updated", { detail: state }));
  }

  function formatDuration(ms) {
    const totalSec = Math.floor((Number(ms) || 0) / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function withState(mutator) {
    const state = loadState();
    mutator(state);
    saveState(state);
    return state;
  }

  window.AutoTuneTasklistStore = {
    load: loadState,
    save: saveState,
    formatDuration,
    addTask(text) {
      const cleaned = String(text || "").trim();
      if (!cleaned) return loadState();
      return withState((state) => {
        state.tasks.push({
          id: `task-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          text: cleaned,
          done: false,
          totalMs: 0
        });
      });
    },
    removeTask(id) {
      return withState((state) => {
        state.tasks = state.tasks.filter((task) => task.id !== id);
        if (state.activeTaskId === id) state.activeTaskId = null;
      });
    },
    toggleTask(id) {
      return withState((state) => {
        const task = state.tasks.find((item) => item.id === id);
        if (task) task.done = !task.done;
      });
    },
    setActiveTask(id) {
      return withState((state) => {
        state.activeTaskId = state.activeTaskId === id ? null : id;
      });
    },
    addDuration(id, deltaMs) {
      return withState((state) => {
        const task = state.tasks.find((item) => item.id === id);
        if (task) task.totalMs = Math.max(0, (task.totalMs || 0) + Number(deltaMs || 0));
      });
    }
  };

  window.AutoTuneWidgets.tasklist = function initTasklistWidget(bodyEl) {
    bodyEl.innerHTML = `
      <div class="autotune-tasklist-add">
        <input type="text" class="autotune-tasklist-input" data-role="taskInput" placeholder="Nova tarefa..." />
        <button type="button" class="autotune-tasklist-add-btn" data-action="add">Adicionar</button>
      </div>
      <ul class="autotune-tasklist-list" data-role="taskList"></ul>
    `;

    const input = bodyEl.querySelector('[data-role="taskInput"]');
    const list = bodyEl.querySelector('[data-role="taskList"]');

    function render() {
      const state = loadState();
      if (state.tasks.length === 0) {
        list.innerHTML = `<li class="autotune-tasklist-empty">Nenhuma tarefa criada.</li>`;
        return;
      }
      list.innerHTML = state.tasks
        .map((task) => {
          const active = task.id === state.activeTaskId ? " is-active" : "";
          const done = task.done ? " is-done" : "";
          return `
            <li class="autotune-tasklist-item${active}${done}" data-task-id="${task.id}">
              <button type="button" class="autotune-tasklist-check" data-action="toggle" data-task-id="${task.id}">${task.done ? "✓" : ""}</button>
              <button type="button" class="autotune-tasklist-text" data-action="activate" data-task-id="${task.id}">${task.text}</button>
              <span class="autotune-tasklist-time">${formatDuration(task.totalMs)}</span>
              <button type="button" class="autotune-tasklist-remove" data-action="remove" data-task-id="${task.id}">×</button>
            </li>
          `;
        })
        .join("");
    }

    function addFromInput() {
      if (!input.value.trim()) return;
      window.AutoTuneTasklistStore.addTask(input.value);
      input.value = "";
      render();
    }

    bodyEl.addEventListener("click", (event) => {
      const actionEl = event.target.closest("[data-action]");
      if (!actionEl) return;
      const action = actionEl.getAttribute("data-action");
      const id = actionEl.getAttribute("data-task-id");
      if (action === "add") addFromInput();
      if (action === "toggle" && id) {
        window.AutoTuneTasklistStore.toggleTask(id);
        render();
      }
      if (action === "activate" && id) {
        window.AutoTuneTasklistStore.setActiveTask(id);
        render();
      }
      if (action === "remove" && id) {
        window.AutoTuneTasklistStore.removeTask(id);
        render();
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addFromInput();
      }
    });

    window.addEventListener("autotune:tasklist-updated", render);
    render();
  };
})();
