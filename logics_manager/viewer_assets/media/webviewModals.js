(() => {
  function removeExistingModal() {
    document.querySelector(".logics-modal")?.remove();
  }

  function createModal({ title, message, submitLabel = "Continue", cancelLabel = "Cancel", fields = [] }) {
    removeExistingModal();
    const overlay = document.createElement("div");
    overlay.className = "logics-modal";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("div");
    dialog.className = "logics-modal__dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "logics-modal-title");

    const heading = document.createElement("div");
    heading.id = "logics-modal-title";
    heading.className = "logics-modal__title";
    heading.textContent = title || "Logics";
    dialog.appendChild(heading);

    if (message) {
      const copy = document.createElement("div");
      copy.className = "logics-modal__message";
      copy.textContent = message;
      dialog.appendChild(copy);
    }

    const form = document.createElement("form");
    form.className = "logics-modal__form";

    const controls = new Map();
    fields.forEach((field) => {
      const row = document.createElement("label");
      row.className = "logics-modal__field";

      const label = document.createElement("span");
      label.className = "logics-modal__label";
      label.textContent = field.label || field.id;
      row.appendChild(label);

      const control = field.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
      control.className = field.type === "textarea" ? "logics-modal__textarea" : "logics-modal__input";
      control.name = field.id;
      control.placeholder = field.placeholder || "";
      control.value = field.defaultValue || "";
      if (field.required) {
        control.required = true;
      }
      if (field.type !== "textarea") {
        control.type = field.type || "text";
      }
      row.appendChild(control);
      controls.set(field.id, control);
      form.appendChild(row);
    });

    const actions = document.createElement("div");
    actions.className = "logics-modal__actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "logics-modal__button logics-modal__button--secondary";
    cancel.textContent = cancelLabel;
    actions.appendChild(cancel);

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "logics-modal__button logics-modal__button--primary";
    submit.textContent = submitLabel;
    actions.appendChild(submit);

    form.appendChild(actions);
    dialog.appendChild(form);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    return new Promise((resolve) => {
      let settled = false;
      const settle = (value) => {
        if (settled) {
          return;
        }
        settled = true;
        document.removeEventListener("keydown", onKeydown);
        overlay.remove();
        resolve(value);
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          settle(null);
        }
      };
      document.addEventListener("keydown", onKeydown);
      cancel.addEventListener("click", () => settle(null));
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = {};
        controls.forEach((control, id) => {
          values[id] = String(control.value || "").trim();
        });
        settle(values);
      });

      const firstControl = controls.values().next().value || submit;
      firstControl.focus();
    });
  }

  window.logicsViewerModals = {
    async confirm({ title, message, submitLabel, cancelLabel } = {}) {
      const result = await createModal({
        title: title || "Confirm",
        message: message || "",
        submitLabel: submitLabel || "Confirm",
        cancelLabel: cancelLabel || "Cancel"
      });
      return Boolean(result);
    },
    async prompt({ title, message, defaultValue, placeholder, submitLabel } = {}) {
      const result = await createModal({
        title: title || "Input",
        message: message || "",
        submitLabel: submitLabel || "Continue",
        fields: [{ id: "value", label: title || "Value", defaultValue, placeholder }]
      });
      return result ? result.value : "";
    },
    async requestDraft() {
      return createModal({
        title: "New request",
        submitLabel: "Prepare request",
        fields: [
          {
            id: "title",
            label: "Title",
            placeholder: "Short request title"
          },
          {
            id: "intent",
            label: "Need",
            type: "textarea",
            required: true,
            placeholder: "What should change, and why?"
          },
          {
            id: "context",
            label: "Context",
            type: "textarea",
            placeholder: "Constraints, links, scope notes, or acceptance hints"
          }
        ]
      });
    }
  };
})();
