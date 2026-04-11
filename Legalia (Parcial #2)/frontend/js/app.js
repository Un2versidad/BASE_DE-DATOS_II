const agendaBody = document.getElementById("agenda-body");
const agendaDate = document.getElementById("agenda-date");
const countPendiente = document.getElementById("count-pendiente");
const countCurso = document.getElementById("count-curso");
const countCerrado = document.getElementById("count-cerrado");
const logoutBtn = document.getElementById("logout-btn");
const userName = document.getElementById("user-name");

const expedienteForm = document.getElementById("expediente-form");
const expedienteId = document.getElementById("expediente-id");
const expedienteAseguradora = document.getElementById("expediente-aseguradora");
const expedienteJuzgado = document.getElementById("expediente-juzgado");
const expedienteAbogado = document.getElementById("expediente-abogado");
const expedienteEstado = document.getElementById("expediente-estado");
const expedienteFecha = document.getElementById("expediente-fecha");
const expedienteSubmit = document.getElementById("expediente-submit");
const expedienteCancel = document.getElementById("expediente-cancel");
const expedientesTable = document.getElementById("expedientes-table");

const expedienteEditForm = document.getElementById("expediente-edit-form");
const expedienteEditId = document.getElementById("expediente-edit-id");
const expedienteEditIdInput = document.getElementById("expediente-edit-id-input");
const expedienteEditAseguradora = document.getElementById("expediente-edit-aseguradora");
const expedienteEditJuzgado = document.getElementById("expediente-edit-juzgado");
const expedienteEditAbogado = document.getElementById("expediente-edit-abogado");
const expedienteEditEstado = document.getElementById("expediente-edit-estado");
const expedienteEditFecha = document.getElementById("expediente-edit-fecha");
const expedienteEditCancel = document.getElementById("expediente-edit-cancel");
const expedienteEditDelete = document.getElementById("expediente-edit-delete");

const aseguradoraForm = document.getElementById("aseguradora-form");
const aseguradoraId = document.getElementById("aseguradora-id");
const aseguradoraNombre = document.getElementById("aseguradora-nombre");
const aseguradoraSubmit = document.getElementById("aseguradora-submit");
const aseguradoraCancel = document.getElementById("aseguradora-cancel");
const aseguradorasTable = document.getElementById("aseguradoras-table");

const aseguradoraEditForm = document.getElementById("aseguradora-edit-form");
const aseguradoraEditId = document.getElementById("aseguradora-edit-id");
const aseguradoraEditIdInput = document.getElementById("aseguradora-edit-id-input");
const aseguradoraEditNombre = document.getElementById("aseguradora-edit-nombre");
const aseguradoraEditCancel = document.getElementById("aseguradora-edit-cancel");
const aseguradoraEditDelete = document.getElementById("aseguradora-edit-delete");

const juzgadoForm = document.getElementById("juzgado-form");
const juzgadoId = document.getElementById("juzgado-id");
const juzgadoNombre = document.getElementById("juzgado-nombre");
const juzgadoSubmit = document.getElementById("juzgado-submit");
const juzgadoCancel = document.getElementById("juzgado-cancel");
const juzgadosTable = document.getElementById("juzgados-table");

const juzgadoEditForm = document.getElementById("juzgado-edit-form");
const juzgadoEditId = document.getElementById("juzgado-edit-id");
const juzgadoEditIdInput = document.getElementById("juzgado-edit-id-input");
const juzgadoEditNombre = document.getElementById("juzgado-edit-nombre");
const juzgadoEditCancel = document.getElementById("juzgado-edit-cancel");
const juzgadoEditDelete = document.getElementById("juzgado-edit-delete");

const fabBtn = document.getElementById("fab-btn");
const toastContainer = document.getElementById("toast-container");

const reportAseguradorasTable = document.getElementById("report-aseguradoras-table");
const reportJuzgadosTable = document.getElementById("report-juzgados-table");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarClose = document.getElementById("sidebar-close");
const sidebarOverlay = document.getElementById("sidebar-overlay");

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const DAYS = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

const state = {
  selected: new Date(),
  calendar: null,
  reportChart: null,
  expedientes: [],
  aseguradoras: [],
  juzgados: [],
  editingExpediente: null,
  editingAseguradora: null,
  editingJuzgado: null,
};

async function enforceSession() {
  if (!getAccessToken()) {
    window.location = "login.html";
    return false;
  }
  const profile = await getProfile();
  if (!profile || !profile.ok) {
    logout();
    return false;
  }
  if (profile.data && profile.data.user && profile.data.user.username) {
    userName.textContent = profile.data.user.username;
    localStorage.setItem("user_profile", JSON.stringify(profile.data.user));
  }
  return true;
}

function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDateLabel(date) {
  const dayName = capitalize(DAYS[date.getDay()]);
  const month = MONTHS[date.getMonth()];
  return `${dayName} ${date.getDate()} de ${month} de ${date.getFullYear()}`;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("is-open");
    const card = modal.querySelector(".modal-card");
    if (card) {
      card.classList.remove("animate__animated", "animate__fadeInUp");
      void card.offsetWidth;
      card.classList.add("animate__animated", "animate__fadeInUp");
    }
    if (id === "modal-expediente") {
      expedienteFecha.value = toIsoDate(state.selected);
    }
    if (id === "modal-reportes") {
      loadReportSummary();
    }
    const focusTarget = modal.querySelector("input, select, button");
    if (focusTarget) {
      focusTarget.focus();
    }
    if (window.innerWidth <= 780) {
      closeSidebar();
    }
  }
}

function closeModal(modal) {
  modal.classList.remove("is-open");
  if (!modal || !modal.id) return;
  if (modal.id === "modal-expediente-edit") {
    resetExpedienteEditForm();
  }
  if (modal.id === "modal-aseguradora-edit") {
    resetAseguradoraEditForm();
  }
  if (modal.id === "modal-juzgado-edit") {
    resetJuzgadoEditForm();
  }
}

function wireModals() {
  document.querySelectorAll(".modal-trigger").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.remove("is-active");
      });
      trigger.classList.add("is-active");
      const target = trigger.getAttribute("data-modal-target");
      if (target) {
        openModal(target);
      }
    });
  });

  document.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const modal = button.closest(".modal");
      if (modal) {
        closeModal(modal);
      }
      document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.remove("is-active");
      });
    });
  });

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(modal);
        document.querySelectorAll(".nav-item").forEach((item) => {
          item.classList.remove("is-active");
        });
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal.is-open").forEach((modal) => {
        closeModal(modal);
      });
      document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.remove("is-active");
      });
    }
  });
}

function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.add("is-open");
  if (sidebarOverlay) {
    sidebarOverlay.classList.add("is-open");
  }
}

function closeSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove("is-open");
  if (sidebarOverlay) {
    sidebarOverlay.classList.remove("is-open");
  }
}

function toggleDesktopSidebar() {
  if (!sidebar) return;
  sidebar.classList.toggle("is-collapsed");
  const layout = document.querySelector(".layout");
  if (layout) {
    layout.classList.toggle("is-collapsed");
  }
}

function renderAgenda(items) {
  agendaBody.innerHTML = "";
  if (!items || items.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan='4'>Sin registros para este dia</td>";
    agendaBody.appendChild(row);
    return;
  }
  items.forEach((item) => {
    const shortId = item.id ? item.id.slice(0, 8) : "-";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="id-cell" title="${item.id || ""}">${shortId}</td>
      <td>${item.aseguradora || "-"}</td>
      <td>${item.abogado || "-"}</td>
      <td>${item.juzgado || "-"}</td>
    `;
    agendaBody.appendChild(row);
  });
}

function showToast(message, type = "success") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
  }, 2400);
  setTimeout(() => toast.remove(), 2800);
}

function updateSummary(counts) {
  countPendiente.textContent = counts.Pendiente || 0;
  countCurso.textContent = counts["En curso"] || 0;
  countCerrado.textContent = counts.Cerrado || 0;
}


function computeStats(expedientes) {
  const counts = { Pendiente: 0, "En curso": 0, Cerrado: 0 };
  expedientes.forEach((item) => {
    if (counts[item.estado] === undefined) {
      counts[item.estado] = 0;
    }
    counts[item.estado] += 1;
  });
  return counts;
}

function renderExpedientesTable(items) {
  expedientesTable.innerHTML = "";
  if (!items || items.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan='5'>Sin expedientes</td>";
    expedientesTable.appendChild(row);
    return;
  }
  items.slice(0, 6).forEach((item) => {
    const shortId = item.id ? item.id.slice(0, 8) : "-";
    const row = document.createElement("tr");
    row.dataset.rowId = item.id;
    row.innerHTML = `
      <td class="id-cell" title="${item.id || ""}">${shortId}</td>
      <td>${item.abogado || "-"}</td>
      <td>${item.estado || "-"}</td>
      <td>${item.fecha || "-"}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-ghost" data-action="edit-exp" data-id="${item.id}">Editar</button>
          <button class="btn btn-danger" data-action="del-exp" data-id="${item.id}">Eliminar</button>
        </div>
      </td>
    `;
    expedientesTable.appendChild(row);
  });
}

function renderCatalogOptions(select, items) {
  select.innerHTML = "";
  if (!items || items.length === 0) {
    const option = document.createElement("option");
    option.textContent = "Sin datos";
    option.value = "";
    select.appendChild(option);
    return;
  }
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.nombre;
    select.appendChild(option);
  });
}

function renderCatalogTable(table, items) {
  table.innerHTML = "";
  if (!items || items.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan='3'>Sin registros</td>";
    table.appendChild(row);
    return;
  }
  items.forEach((item) => {
    const shortId = item.id ? item.id.slice(0, 8) : "-";
    const row = document.createElement("tr");
    row.dataset.rowId = item.id;
    row.innerHTML = `
      <td class="id-cell" title="${item.id || ""}">${shortId}</td>
      <td>${item.nombre}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-ghost" data-action="edit-${table.id}" data-id="${item.id}" data-name="${item.nombre}">Editar</button>
          <button class="btn btn-danger" data-action="del-${table.id}" data-id="${item.id}">Eliminar</button>
        </div>
      </td>
    `;
    table.appendChild(row);
  });
}

function renderReportTable(table, items, emptyLabel) {
  table.innerHTML = "";
  if (!items || items.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="2">${emptyLabel}</td>`;
    table.appendChild(row);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${item.nombre}</td><td>${item.total}</td>`;
    table.appendChild(row);
  });
}

function resetExpedienteForm() {
  expedienteId.value = "";
  expedienteForm.reset();
  expedienteFecha.value = toIsoDate(state.selected);
  expedienteSubmit.textContent = "Guardar expediente";
  state.editingExpediente = null;
}

function resetAseguradoraForm() {
  aseguradoraId.value = "";
  aseguradoraNombre.value = "";
  aseguradoraSubmit.textContent = "Agregar";
  state.editingAseguradora = null;
}

function resetJuzgadoForm() {
  juzgadoId.value = "";
  juzgadoNombre.value = "";
  juzgadoSubmit.textContent = "Agregar";
  state.editingJuzgado = null;
}

function resetExpedienteEditForm() {
  if (!expedienteEditForm) return;
  expedienteEditForm.reset();
  expedienteEditId.textContent = "";
  expedienteEditId.title = "";
  expedienteEditIdInput.value = "";
  state.editingExpediente = null;
}

function setExpedienteEdit(item) {
  if (!item) return;
  state.editingExpediente = item.id;
  const shortId = item.id ? item.id.slice(0, 8) : "";
  expedienteEditIdInput.value = item.id;
  expedienteEditId.textContent = shortId ? `ID ${shortId}` : "";
  expedienteEditId.title = item.id || "";
  expedienteEditAseguradora.value = item.aseguradora_id || "";
  expedienteEditJuzgado.value = item.juzgado_id || "";
  expedienteEditAbogado.value = item.abogado || "";
  expedienteEditEstado.value = item.estado || "Pendiente";
  expedienteEditFecha.value = item.fecha || toIsoDate(state.selected);
}

function resetAseguradoraEditForm() {
  if (!aseguradoraEditForm) return;
  aseguradoraEditForm.reset();
  aseguradoraEditId.textContent = "";
  aseguradoraEditId.title = "";
  aseguradoraEditIdInput.value = "";
  state.editingAseguradora = null;
}

function setAseguradoraEdit(item) {
  if (!item) return;
  state.editingAseguradora = item.id;
  const shortId = item.id ? item.id.slice(0, 8) : "";
  aseguradoraEditIdInput.value = item.id;
  aseguradoraEditId.textContent = shortId ? `ID ${shortId}` : "";
  aseguradoraEditId.title = item.id || "";
  aseguradoraEditNombre.value = item.nombre || "";
}

function resetJuzgadoEditForm() {
  if (!juzgadoEditForm) return;
  juzgadoEditForm.reset();
  juzgadoEditId.textContent = "";
  juzgadoEditId.title = "";
  juzgadoEditIdInput.value = "";
  state.editingJuzgado = null;
}

function setJuzgadoEdit(item) {
  if (!item) return;
  state.editingJuzgado = item.id;
  const shortId = item.id ? item.id.slice(0, 8) : "";
  juzgadoEditIdInput.value = item.id;
  juzgadoEditId.textContent = shortId ? `ID ${shortId}` : "";
  juzgadoEditId.title = item.id || "";
  juzgadoEditNombre.value = item.nombre || "";
}

function updateReportChart(byEstado) {
  const labels = byEstado.map((item) => item.estado);
  const values = byEstado.map((item) => item.total);
  if (!state.reportChart) {
    const ctx = document.getElementById("reportStatusChart");
    state.reportChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ["#9a7426", "#e0ad3c", "#6f6f6f"],
            borderRadius: 6,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  } else {
    state.reportChart.data.labels = labels;
    state.reportChart.data.datasets[0].data = values;
    state.reportChart.update();
  }
}

function findById(list, id) {
  return list.find((item) => item.id === id);
}

async function loadAgenda() {
  const dateIso = toIsoDate(state.selected);
  agendaDate.textContent = formatDateLabel(state.selected);
  const data = await apiFetch(`/api/agenda?date=${dateIso}`);
  if (!data) {
    renderAgenda([]);
    return;
  }
  renderAgenda(data.items);
}

async function loadExpedientes() {
  const data = await getExpedientes();
  const items = Array.isArray(data) ? data : [];
  state.expedientes = items;
  renderExpedientesTable(items);
  const counts = computeStats(items);
  updateSummary(counts);
  updateCalendarEvents(items);
}

async function loadCatalogs() {
  const aseguradoras = await getAseguradoras();
  const juzgados = await getJuzgados();
  state.aseguradoras = Array.isArray(aseguradoras) ? aseguradoras : [];
  state.juzgados = Array.isArray(juzgados) ? juzgados : [];
  renderCatalogOptions(expedienteAseguradora, state.aseguradoras);
  renderCatalogOptions(expedienteJuzgado, state.juzgados);
  if (expedienteEditAseguradora) {
    const selectedAseg = expedienteEditAseguradora.value;
    renderCatalogOptions(expedienteEditAseguradora, state.aseguradoras);
    if (selectedAseg) {
      expedienteEditAseguradora.value = selectedAseg;
    }
  }
  if (expedienteEditJuzgado) {
    const selectedJuz = expedienteEditJuzgado.value;
    renderCatalogOptions(expedienteEditJuzgado, state.juzgados);
    if (selectedJuz) {
      expedienteEditJuzgado.value = selectedJuz;
    }
  }
  renderCatalogTable(aseguradorasTable, state.aseguradoras);
  renderCatalogTable(juzgadosTable, state.juzgados);
}

function initCalendar() {
  const calendarEl = document.getElementById("fc-calendar");
  state.calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "es",
    height: "auto",
    contentHeight: 320,
    aspectRatio: 1.15,
    fixedWeekCount: false,
    headerToolbar: {
      left: "prev",
      center: "title",
      right: "next",
    },
    dayMaxEventRows: 1,
    eventDisplay: "dot",
    selectable: true,
    dateClick: (info) => {
      state.selected = info.date;
      updateCalendarSelection();
      loadAgenda();
    },
    eventDidMount: (info) => {
      if (window.tippy) {
        tippy(info.el, {
          content: info.event.title,
          theme: "light-border",
          placement: "top",
        });
      }
    },
  });
  state.calendar.render();
  updateCalendarSelection();
}

function updateCalendarEvents(items) {
  if (!state.calendar) return;
  const events = items.map((item) => ({
    title: item.abogado ? item.abogado : "Expediente",
    start: item.fecha,
    allDay: true,
  }));
  state.calendar.removeAllEvents();
  state.calendar.addEventSource(events);
}

function updateCalendarSelection() {
  const dateIso = toIsoDate(state.selected);
  document.querySelectorAll(".fc-daygrid-day").forEach((cell) => {
    cell.classList.toggle("is-selected", cell.getAttribute("data-date") === dateIso);
  });
}

async function loadReportSummary() {
  const data = await getReportSummary();
  if (!data || !data.ok) {
    if (data && data.status === 403) {
      showToast("No tienes permisos para reportes", "error");
    } else {
      showToast("No se pudo cargar el reporte", "error");
    }
    return;
  }
  updateReportChart(data.data.by_estado || []);
  renderReportTable(reportAseguradorasTable, data.data.top_aseguradoras || [], "Sin datos");
  renderReportTable(reportJuzgadosTable, data.data.top_juzgados || [], "Sin datos");
}

expedienteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    aseguradora_id: expedienteAseguradora.value,
    juzgado_id: expedienteJuzgado.value,
    abogado: expedienteAbogado.value.trim(),
    estado: expedienteEstado.value,
    fecha: expedienteFecha.value,
  };
  if (
    !payload.aseguradora_id ||
    !payload.juzgado_id ||
    !payload.abogado ||
    !payload.fecha
  ) {
    showToast("Completa todos los campos del expediente", "error");
    return;
  }
  const submitButton = expedienteForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  const result = await createExpediente(payload);
  submitButton.disabled = false;
  if (!result || !result.ok) {
    const errors =
      (result && result.data && result.data.errors && result.data.errors.join(", ")) ||
      (result && result.data && result.data.error);
    showToast(errors || "No se pudo crear el expediente", "error");
    return;
  }
  resetExpedienteForm();
  await loadExpedientes();
  await loadAgenda();
  showToast("Expediente creado", "success");
});

aseguradoraForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nombre = aseguradoraNombre.value.trim();
  if (!nombre) {
    return;
  }
  const button = aseguradoraForm.querySelector("button[type='submit']");
  button.disabled = true;
  const created = await createAseguradora(nombre);
  button.disabled = false;
  if (created && created.ok) {
    resetAseguradoraForm();
    await loadCatalogs();
    showToast("Aseguradora agregada", "success");
  } else if (created && created.data && created.data.error) {
    showToast(created.data.error, "error");
  }
});

juzgadoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nombre = juzgadoNombre.value.trim();
  if (!nombre) {
    return;
  }
  const button = juzgadoForm.querySelector("button[type='submit']");
  button.disabled = true;
  const created = await createJuzgado(nombre);
  button.disabled = false;
  if (created && created.ok) {
    resetJuzgadoForm();
    await loadCatalogs();
    showToast("Juzgado agregado", "success");
  } else if (created && created.data && created.data.error) {
    showToast(created.data.error, "error");
  }
});

expedienteCancel.addEventListener("click", () => {
  resetExpedienteForm();
});

aseguradoraCancel.addEventListener("click", () => {
  resetAseguradoraForm();
});

juzgadoCancel.addEventListener("click", () => {
  resetJuzgadoForm();
});

if (expedienteEditForm) {
  expedienteEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = expedienteEditIdInput.value;
    const payload = {
      aseguradora_id: expedienteEditAseguradora.value,
      juzgado_id: expedienteEditJuzgado.value,
      abogado: expedienteEditAbogado.value.trim(),
      estado: expedienteEditEstado.value,
      fecha: expedienteEditFecha.value,
    };
    if (
      !payload.aseguradora_id ||
      !payload.juzgado_id ||
      !payload.abogado ||
      !payload.fecha
    ) {
      showToast("Completa todos los campos del expediente", "error");
      return;
    }
    const result = await updateExpediente(id, payload);
    if (!result || !result.ok) {
      const errors =
        (result && result.data && result.data.errors && result.data.errors.join(", ")) ||
        (result && result.data && result.data.error);
      showToast(errors || "No se pudo actualizar el expediente", "error");
      return;
    }
    closeModal(document.getElementById("modal-expediente-edit"));
    resetExpedienteEditForm();
    await loadExpedientes();
    await loadAgenda();
    showToast("Expediente actualizado", "success");
  });
}

if (expedienteEditCancel) {
  expedienteEditCancel.addEventListener("click", () => {
    closeModal(document.getElementById("modal-expediente-edit"));
    resetExpedienteEditForm();
  });
}

if (expedienteEditDelete) {
  expedienteEditDelete.addEventListener("click", async () => {
    const id = expedienteEditIdInput.value;
    if (!id) return;
    const confirmDelete = window.confirm("Eliminar este expediente?");
    if (!confirmDelete) return;
    const result = await deleteExpediente(id);
    if (!result || !result.ok) {
      showToast("No se pudo eliminar el expediente", "error");
      return;
    }
    closeModal(document.getElementById("modal-expediente-edit"));
    resetExpedienteEditForm();
    await loadExpedientes();
    await loadAgenda();
    showToast("Expediente eliminado", "success");
  });
}

if (aseguradoraEditForm) {
  aseguradoraEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = aseguradoraEditIdInput.value;
    const nombre = aseguradoraEditNombre.value.trim();
    if (!nombre) {
      showToast("Completa el nombre", "error");
      return;
    }
    const result = await updateAseguradora(id, nombre);
    if (!result || !result.ok) {
      showToast("No se pudo actualizar la aseguradora", "error");
      return;
    }
    closeModal(document.getElementById("modal-aseguradora-edit"));
    resetAseguradoraEditForm();
    await loadCatalogs();
    showToast("Aseguradora actualizada", "success");
  });
}

if (aseguradoraEditCancel) {
  aseguradoraEditCancel.addEventListener("click", () => {
    closeModal(document.getElementById("modal-aseguradora-edit"));
    resetAseguradoraEditForm();
  });
}

if (aseguradoraEditDelete) {
  aseguradoraEditDelete.addEventListener("click", async () => {
    const id = aseguradoraEditIdInput.value;
    if (!id) return;
    const confirmDelete = window.confirm("Eliminar esta aseguradora?");
    if (!confirmDelete) return;
    const result = await deleteAseguradora(id);
    if (!result || !result.ok) {
      showToast("No se pudo eliminar la aseguradora", "error");
      return;
    }
    closeModal(document.getElementById("modal-aseguradora-edit"));
    resetAseguradoraEditForm();
    await loadCatalogs();
    showToast("Aseguradora eliminada", "success");
  });
}

if (juzgadoEditForm) {
  juzgadoEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = juzgadoEditIdInput.value;
    const nombre = juzgadoEditNombre.value.trim();
    if (!nombre) {
      showToast("Completa el nombre", "error");
      return;
    }
    const result = await updateJuzgado(id, nombre);
    if (!result || !result.ok) {
      showToast("No se pudo actualizar el juzgado", "error");
      return;
    }
    closeModal(document.getElementById("modal-juzgado-edit"));
    resetJuzgadoEditForm();
    await loadCatalogs();
    showToast("Juzgado actualizado", "success");
  });
}

if (juzgadoEditCancel) {
  juzgadoEditCancel.addEventListener("click", () => {
    closeModal(document.getElementById("modal-juzgado-edit"));
    resetJuzgadoEditForm();
  });
}

if (juzgadoEditDelete) {
  juzgadoEditDelete.addEventListener("click", async () => {
    const id = juzgadoEditIdInput.value;
    if (!id) return;
    const confirmDelete = window.confirm("Eliminar este juzgado?");
    if (!confirmDelete) return;
    const result = await deleteJuzgado(id);
    if (!result || !result.ok) {
      showToast("No se pudo eliminar el juzgado", "error");
      return;
    }
    closeModal(document.getElementById("modal-juzgado-edit"));
    resetJuzgadoEditForm();
    await loadCatalogs();
    showToast("Juzgado eliminado", "success");
  });
}

if (expedientesTable) {
  expedientesTable.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (!id) return;

    if (action === "edit-exp") {
      const item = findById(state.expedientes, id);
      if (!item) {
        showToast("No se encontro el expediente", "error");
        return;
      }
      setExpedienteEdit(item);
      openModal("modal-expediente-edit");
      return;
    }

    if (action === "del-exp") {
      const confirmDelete = window.confirm("Eliminar este expediente?");
      if (!confirmDelete) return;
      const result = await deleteExpediente(id);
      if (!result || !result.ok) {
        showToast("No se pudo eliminar el expediente", "error");
        return;
      }
      await loadExpedientes();
      await loadAgenda();
      showToast("Expediente eliminado", "success");
    }
  });
}

if (aseguradorasTable) {
  aseguradorasTable.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (!id) return;

    if (action === "edit-aseguradoras-table") {
      const item = findById(state.aseguradoras, id);
      if (!item) {
        showToast("No se encontro la aseguradora", "error");
        return;
      }
      setAseguradoraEdit(item);
      openModal("modal-aseguradora-edit");
      return;
    }

    if (action === "del-aseguradoras-table") {
      const confirmDelete = window.confirm("Eliminar esta aseguradora?");
      if (!confirmDelete) return;
      const result = await deleteAseguradora(id);
      if (!result || !result.ok) {
        showToast("No se pudo eliminar la aseguradora", "error");
        return;
      }
      await loadCatalogs();
      showToast("Aseguradora eliminada", "success");
    }
  });
}

if (juzgadosTable) {
  juzgadosTable.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (!id) return;

    if (action === "edit-juzgados-table") {
      const item = findById(state.juzgados, id);
      if (!item) {
        showToast("No se encontro el juzgado", "error");
        return;
      }
      setJuzgadoEdit(item);
      openModal("modal-juzgado-edit");
      return;
    }

    if (action === "del-juzgados-table") {
      const confirmDelete = window.confirm("Eliminar este juzgado?");
      if (!confirmDelete) return;
      const result = await deleteJuzgado(id);
      if (!result || !result.ok) {
        showToast("No se pudo eliminar el juzgado", "error");
        return;
      }
      await loadCatalogs();
      showToast("Juzgado eliminado", "success");
    }
  });
}

fabBtn.addEventListener("click", () => openModal("modal-expediente"));

logoutBtn.addEventListener("click", (event) => {
  event.preventDefault();
  logout();
});

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    if (window.innerWidth > 780) {
      toggleDesktopSidebar();
      return;
    }
    if (sidebar.classList.contains("is-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });
}

if (sidebarClose) {
  sidebarClose.addEventListener("click", () => {
    closeSidebar();
  });
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", () => {
    closeSidebar();
  });
}

async function boot() {
  const ok = await enforceSession();
  if (!ok) {
    return;
  }
  wireModals();
  resetExpedienteForm();
  resetAseguradoraForm();
  resetJuzgadoForm();
  resetExpedienteEditForm();
  resetAseguradoraEditForm();
  resetJuzgadoEditForm();
  const storedProfile = localStorage.getItem("user_profile");
  if (storedProfile) {
    try {
      const profile = JSON.parse(storedProfile);
      if (profile.username) {
        userName.textContent = profile.username;
      }
    } catch (err) {
      // ignore parse errors
    }
  }
  initCalendar();
  loadCatalogs();
  loadExpedientes();
  loadAgenda();
}

boot();
