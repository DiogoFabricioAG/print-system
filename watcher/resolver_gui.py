"""Diálogos Tkinter para resolver archivos dudosos.

- kind="cliente": el nombre parseó pero el cliente no existe → elegir entre
  clientes similares, crear uno nuevo o ignorar el archivo.
- kind="form": el nombre no cumple la convención → formulario completo para
  registrar la venta a mano (o ignorar).

El hilo de GUI es el único que toca Tkinter; el worker se comunica por colas.
Diseño: tema claro estilo webapp (slate + acento azul), header oscuro,
tarjetas con borde y botones planos con hover.
"""

from __future__ import annotations

import logging
import queue
import threading

from config import ESTADOS_VALIDOS, Config
from parser import normalize_text, parse_metros

log = logging.getLogger("watcher.gui")

# ── paleta (alineada con la webapp) ─────────────────────────────────────────
C = {
    "bg": "#F1F5F9",
    "card": "#FFFFFF",
    "border": "#E2E8F0",
    "header": "#0F172A",
    "header_muted": "#94A3B8",
    "text": "#0F172A",
    "muted": "#64748B",
    "section": "#94A3B8",
    "accent": "#0284C7",
    "accent_dark": "#0369A1",
    "accent_soft": "#E0F2FE",
    "accent_text": "#0369A1",
    "success": "#059669",
    "success_dark": "#047857",
    "success_soft": "#ECFDF5",
    "success_text": "#047857",
    "warning_soft": "#FFFBEB",
    "warning_border": "#FDE68A",
    "warning_text": "#B45309",
    "danger": "#E11D48",
    "danger_soft": "#FFF1F2",
    "chip_error_bg": "#7F1D1D",
    "chip_error_text": "#FECACA",
    "hover": "#F8FAFC",
    "scroll": "#CBD5E1",
}

FONT_TITLE = ("Segoe UI", 15, "bold")
FONT_SUBTITLE = ("Segoe UI", 9)
FONT_SECTION = ("Segoe UI", 8, "bold")
FONT_BODY = ("Segoe UI", 10)
FONT_BODY_BOLD = ("Segoe UI", 10, "bold")
FONT_SMALL = ("Segoe UI", 9)
FONT_CHIP = ("Segoe UI", 9, "bold")


class ResolverGUI:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.requests: queue.Queue = queue.Queue()
        self.available = False
        self._root = None
        self._tk = None
        self._ttk = None
        self._messagebox = None
        self._thread = threading.Thread(target=self._run, name="gui", daemon=True)

    def start(self) -> None:
        self._thread.start()

    def request(self, payload: dict) -> dict | None:
        if not self._thread.is_alive():
            return None

        response_queue: queue.Queue = queue.Queue(1)
        payload["expired"] = False
        self.requests.put((payload, response_queue))
        try:
            return response_queue.get(timeout=self.cfg.gui_timeout)
        except queue.Empty:
            payload["expired"] = True
            log.warning(
                "El diálogo para %s expiró sin respuesta", payload.get("filename")
            )
            return None

    # ── hilo GUI ────────────────────────────────────────────────────────────

    def _run(self) -> None:
        try:
            import tkinter as tk
            from tkinter import messagebox, ttk
        except Exception as exc:  # noqa: BLE001
            log.error("Tkinter no disponible: %s", exc)
            return

        try:
            root = tk.Tk()
        except Exception as exc:  # noqa: BLE001
            log.error(
                "No se pudo crear la ventana Tkinter (¿sin sesión interactiva?): %s", exc
            )
            return

        self._tk = tk
        self._ttk = ttk
        self._messagebox = messagebox
        self._root = root
        root.withdraw()
        self._configure_style()
        self.available = True
        root.after(200, self._poll)
        root.mainloop()

    def _configure_style(self) -> None:
        style = self._ttk.Style(self._root)
        try:
            style.theme_use("clam")
        except Exception:  # noqa: BLE001
            pass

        style.configure(
            "TCombobox",
            padding=4,
            fieldbackground=C["card"],
            background=C["card"],
            foreground=C["text"],
            bordercolor=C["border"],
            lightcolor=C["border"],
            darkcolor=C["border"],
            arrowcolor=C["muted"],
        )
        style.map(
            "TCombobox",
            bordercolor=[("focus", C["accent"])],
            fieldbackground=[("readonly", C["card"])],
            arrowcolor=[("active", C["accent"])],
        )
        style.configure(
            "Vertical.TScrollbar",
            background=C["scroll"],
            troughcolor=C["bg"],
            bordercolor=C["bg"],
            arrowcolor=C["muted"],
            relief="flat",
        )
        style.map("Vertical.TScrollbar", background=[("active", C["muted"])])

    def _poll(self) -> None:
        try:
            while True:
                payload, response_queue = self.requests.get_nowait()
                if payload.get("expired"):
                    continue
                try:
                    self._show_dialog(payload, response_queue)
                except Exception:  # noqa: BLE001
                    log.exception("Error mostrando el diálogo; se envía a pendientes")
                    self._respond(response_queue, {"accion": "pendiente"})
        except queue.Empty:
            pass
        if self._root is not None:
            self._root.after(200, self._poll)

    @staticmethod
    def _respond(response_queue: queue.Queue, value: dict) -> None:
        try:
            response_queue.put_nowait(value)
        except queue.Full:
            pass

    # ── helpers visuales ────────────────────────────────────────────────────

    def _flat_button(self, parent, text, command, kind="secondary", padx=16, pady=8):
        palette = {
            "primary": (C["accent"], "#FFFFFF", C["accent_dark"], C["accent"]),
            "success": (C["success"], "#FFFFFF", C["success_dark"], C["success"]),
            "ghost": (C["card"], C["muted"], C["hover"], C["border"]),
            "danger_ghost": (C["card"], C["danger"], C["danger_soft"], C["border"]),
        }[kind]
        bg, fg, hover, border = palette

        button = self._tk.Button(
            parent,
            text=text,
            command=command,
            font=FONT_BODY_BOLD,
            bg=bg,
            fg=fg,
            activebackground=hover,
            activeforeground=fg,
            relief="flat",
            bd=0,
            cursor="hand2",
            padx=padx,
            pady=pady,
            highlightthickness=1,
            highlightbackground=border,
            highlightcolor=border,
        )
        button.bind(
            "<Enter>",
            lambda _e: button.configure(bg=hover)
            if str(button.cget("state")) != "disabled"
            else None,
        )
        button.bind(
            "<Leave>",
            lambda _e: button.configure(bg=bg)
            if str(button.cget("state")) != "disabled"
            else None,
        )
        return button

    def _entry(self, parent, **entry_kwargs):
        box = self._tk.Frame(
            parent,
            bg=C["card"],
            highlightthickness=1,
            highlightbackground=C["border"],
            highlightcolor=C["accent"],
        )
        entry = self._tk.Entry(
            box,
            bd=0,
            relief="flat",
            bg=C["card"],
            fg=C["text"],
            insertbackground=C["text"],
            font=FONT_BODY,
            highlightthickness=0,
            **entry_kwargs,
        )
        entry.pack(fill="x", padx=8, pady=5, ipady=2)
        return box, entry

    def _field(self, parent, row, label, required=False):
        text = f"{label} *" if required else label
        self._tk.Label(
            parent, text=text, font=FONT_SMALL, bg=C["card"], fg=C["muted"], anchor="e"
        ).grid(row=row, column=0, sticky="e", padx=(0, 10), pady=4)
        box, entry = self._entry(parent)
        box.grid(row=row, column=1, sticky="we", pady=4)
        return entry

    def _header(self, parent, title, subtitle, chip=None, chip_bg=None, chip_fg=None):
        header = self._tk.Frame(parent, bg=C["header"], padx=22, pady=16)
        header.pack(fill="x")
        self._tk.Label(
            header, text=title, font=FONT_TITLE, bg=C["header"], fg="#FFFFFF", anchor="w"
        ).pack(fill="x")
        self._tk.Label(
            header,
            text=subtitle,
            font=FONT_SUBTITLE,
            bg=C["header"],
            fg=C["header_muted"],
            anchor="w",
            wraplength=640,
            justify="left",
        ).pack(fill="x", pady=(4, 0))
        if chip:
            chip_box = self._tk.Frame(
                header, bg=chip_bg or C["accent_soft"], padx=10, pady=3
            )
            chip_box.pack(anchor="w", pady=(10, 0))
            self._tk.Label(
                chip_box,
                text=chip,
                font=FONT_CHIP,
                bg=chip_bg or C["accent_soft"],
                fg=chip_fg or C["accent_text"],
            ).pack()
        return header

    def _center(self, window, width: int, height: int, offset_y: int = -40) -> None:
        window.update_idletasks()
        screen_w = window.winfo_screenwidth()
        screen_h = window.winfo_screenheight()
        x = max((screen_w - width) // 2, 0)
        y = max((screen_h - height) // 2 + offset_y, 0)
        window.geometry(f"{width}x{height}+{x}+{y}")

    # ── diálogo principal ───────────────────────────────────────────────────

    def _show_dialog(self, payload: dict, response_queue: queue.Queue) -> None:
        tk = self._tk
        is_form = payload["kind"] in ("form", "review")
        has_parse_error = bool(payload.get("error"))

        top = tk.Toplevel(self._root)
        top.withdraw()
        if is_form:
            window_title = "Confirmar venta" if not has_parse_error else "Completar venta"
        else:
            window_title = "Cliente no encontrado"
        top.title(f"Print System · {window_title}")
        top.configure(bg=C["bg"])
        top.resizable(False, False)
        top.attributes("-topmost", True)

        state = {"done": False}

        def finish(value: dict) -> None:
            if state["done"] or payload.get("expired"):
                top.destroy()
                return
            state["done"] = True
            self._respond(response_queue, value)
            top.destroy()

        top.protocol("WM_DELETE_WINDOW", lambda: finish({"accion": "pendiente"}))

        # ── header ──
        if is_form and has_parse_error:
            header = self._header(
                top,
                "Nombre fuera de convención",
                payload.get("filename", ""),
                chip="Formato inválido",
                chip_bg=C["chip_error_bg"],
                chip_fg=C["chip_error_text"],
            )
        elif is_form:
            header = self._header(
                top,
                "Confirmar venta",
                payload.get("filename", ""),
                chip="Revisa los datos antes de guardar",
            )
        else:
            header = self._header(
                top,
                "Cliente no encontrado",
                payload.get("filename", ""),
                chip=f"Detectado: {payload.get('nombre', '')}",
            )

        # ── pie de página y separador (primero, para reservar espacio) ──
        footer = tk.Frame(top, bg=C["bg"], padx=22, pady=14)
        footer.pack(fill="x", side="bottom")
        tk.Frame(top, bg=C["border"], height=1).pack(fill="x", side="bottom")

        # ── cuerpo scrollable (el contenido puede exceder la pantalla) ──
        content = tk.Frame(top, bg=C["bg"])
        content.pack(fill="both", expand=True)

        canvas = tk.Canvas(content, bg=C["bg"], highlightthickness=0, bd=0)
        scrollbar = self._ttk.Scrollbar(content, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)

        body = tk.Frame(canvas, bg=C["bg"], padx=22, pady=16)
        body_window = canvas.create_window((0, 0), window=body, anchor="nw")

        def _sync_scroll() -> None:
            canvas.configure(scrollregion=canvas.bbox("all"))
            if body.winfo_reqheight() <= canvas.winfo_height():
                scrollbar.pack_forget()
            else:
                scrollbar.pack(side="right", fill="y")

        def _on_body_configure(_event) -> None:
            _sync_scroll()

        def _on_canvas_configure(event) -> None:
            canvas.itemconfigure(body_window, width=event.width)
            _sync_scroll()

        def _on_wheel(event) -> None:
            canvas.yview_scroll(int(-event.delta / 120), "units")

        def _on_destroy(event) -> None:
            if event.widget is top:
                top.unbind_all("<MouseWheel>")

        body.bind("<Configure>", _on_body_configure)
        canvas.bind("<Configure>", _on_canvas_configure)
        top.bind_all("<MouseWheel>", _on_wheel)
        top.bind("<Destroy>", _on_destroy)

        if is_form and has_parse_error:
            tk.Label(
                body,
                text=f"No se pudo parsear el nombre: {payload.get('error', '')}",
                font=FONT_SMALL,
                bg=C["bg"],
                fg=C["danger"],
                anchor="w",
                wraplength=650,
                justify="left",
            ).pack(fill="x", pady=(0, 10))
        elif is_form:
            tk.Label(
                body,
                text="Confirma o edita los datos. El nombre original del archivo no se modificará.",
                font=FONT_SMALL,
                bg=C["bg"],
                fg=C["muted"],
                anchor="w",
                wraplength=650,
                justify="left",
            ).pack(fill="x", pady=(0, 10))

        tk.Label(
            body,
            text=f"{'CLIENTE' if not is_form else 'SELECCIONA EL CLIENTE'}",
            font=FONT_SECTION,
            bg=C["bg"],
            fg=C["section"],
            anchor="w",
        ).pack(fill="x")

        # buscador
        search_box = tk.Frame(
            body,
            bg=C["card"],
            highlightthickness=1,
            highlightbackground=C["border"],
            highlightcolor=C["accent"],
        )
        search_box.pack(fill="x", pady=(8, 8))
        tk.Label(
            search_box, text="Buscar", font=FONT_SMALL, bg=C["card"], fg=C["section"]
        ).pack(side="left", padx=(10, 0))
        search_entry = tk.Entry(
            search_box,
            bd=0,
            bg=C["card"],
            fg=C["text"],
            font=FONT_BODY,
            insertbackground=C["text"],
            highlightthickness=0,
        )
        search_entry.pack(side="left", fill="x", expand=True, padx=(8, 10), pady=7)

        # lista de clientes
        list_card = tk.Frame(
            body, bg=C["card"], highlightthickness=1, highlightbackground=C["border"]
        )
        list_card.pack(fill="both", expand=not is_form)
        scrollbar = self._ttk.Scrollbar(list_card, orient="vertical")
        scrollbar.pack(side="right", fill="y", pady=4)
        listbox = tk.Listbox(
            list_card,
            yscrollcommand=scrollbar.set,
            font=FONT_BODY,
            bg=C["card"],
            fg=C["text"],
            selectbackground=C["accent"],
            selectforeground="#FFFFFF",
            activestyle="none",
            bd=0,
            relief="flat",
            highlightthickness=0,
            selectborderwidth=0,
            height=8 if not is_form else 4,
            exportselection=False,
        )
        listbox.pack(side="left", fill="both", expand=True, padx=(6, 0), pady=4)
        scrollbar.config(command=listbox.yview)

        count_label = tk.Label(
            body, text="", font=FONT_SMALL, bg=C["bg"], fg=C["section"], anchor="w"
        )
        count_label.pack(fill="x", pady=(6, 0))

        client_status_box = tk.Frame(
            body,
            bg=C["warning_soft"],
            highlightthickness=1,
            highlightbackground=C["warning_border"],
        )
        client_status_box.pack(fill="x", pady=(6, 0))
        client_status_label = tk.Label(
            client_status_box,
            text="",
            font=FONT_BODY_BOLD,
            bg=C["warning_soft"],
            fg=C["warning_text"],
            anchor="w",
            justify="left",
            wraplength=640,
            padx=10,
            pady=8,
        )
        client_status_label.pack(fill="x")
        primary_button_holder: dict = {"widget": None}

        # ── formulario (solo kind=form) ──
        form_widgets: dict = {}
        estado_var = None
        adelanto_entry = None
        if is_form:
            fields_card = tk.Frame(
                body,
                bg=C["card"],
                highlightthickness=1,
                highlightbackground=C["border"],
                padx=14,
                pady=10,
            )
            fields_card.pack(fill="x", pady=(12, 0))
            fields_card.grid_columnconfigure(1, weight=1)

            form_widgets["diseno"] = self._field(fields_card, 0, "Diseño", required=True)
            form_widgets["cantidad"] = self._field(fields_card, 1, "Cantidad (ej: 10uni)")
            form_widgets["metros"] = self._field(fields_card, 2, "Metros (ej: 1.5mts / 150cm)")
            form_widgets["maquina"] = self._field(fields_card, 3, "Máquina (ej: DTF)", required=True)
            form_widgets["monto"] = self._field(fields_card, 4, "Monto S/", required=True)

            tk.Label(
                fields_card,
                text="Estado",
                font=FONT_SMALL,
                bg=C["card"],
                fg=C["muted"],
                anchor="e",
            ).grid(row=5, column=0, sticky="e", padx=(0, 10), pady=4)
            estado_var = tk.StringVar(value=(payload.get("prefill") or {}).get("estado", "Debe"))
            estado_combo = self._ttk.Combobox(
                fields_card,
                textvariable=estado_var,
                values=ESTADOS_VALIDOS,
                state="readonly",
                font=FONT_BODY,
            )
            estado_combo.grid(row=5, column=1, sticky="we", pady=4)

            adelanto_label = tk.Label(
                fields_card,
                text="Adelanto S/ *",
                font=FONT_SMALL,
                bg=C["card"],
                fg=C["muted"],
                anchor="e",
            )
            adelanto_label.grid(row=6, column=0, sticky="e", padx=(0, 10), pady=4)
            adelanto_box, adelanto_entry = self._entry(fields_card)
            adelanto_box.grid(row=6, column=1, sticky="we", pady=4)
            adelanto_box.grid_remove()
            adelanto_label.grid_remove()

            def update_adelanto(_event=None) -> None:
                if estado_var.get() == "Crédito":
                    adelanto_label.grid()
                    adelanto_box.grid()
                else:
                    adelanto_label.grid_remove()
                    adelanto_box.grid_remove()

            estado_combo.bind("<<ComboboxSelected>>", update_adelanto)

            prefill = payload.get("prefill") or {}
            for key in ("diseno", "cantidad", "metro_total", "maquina", "pago"):
                value = prefill.get(key)
                if value is not None:
                    text = f"{value:g}" if isinstance(value, float) else str(value)
                    target_key = {
                        "metro_total": "metros",
                        "pago": "monto",
                    }.get(key, key)
                    form_widgets[target_key].insert(0, text)
            if prefill.get("adelanto") is not None:
                adelanto_entry.insert(0, str(prefill["adelanto"]))
            update_adelanto()

        # ── datos y filtrado ──
        clients = payload.get("clientes") or []
        suggestions = payload.get("sugerencias") or []
        row_clients: list[dict] = []
        new_client_holder: dict = {"value": None}

        def fill_list(filter_text: str = "") -> None:
            listbox.delete(0, tk.END)
            row_clients.clear()
            needle = normalize_text(filter_text) if filter_text else ""

            for cliente, ratio in suggestions:
                if needle and needle not in normalize_text(cliente.get("nombre", "")):
                    continue
                listbox.insert(tk.END, f"★  {cliente.get('nombre')}   ·   {ratio * 100:.0f}%")
                row_clients.append(cliente)

            chosen_ids = {cliente.get("id") for cliente in row_clients}
            for cliente in sorted(clients, key=lambda c: normalize_text(c.get("nombre", ""))):
                if cliente.get("id") in chosen_ids:
                    continue
                if needle and needle not in normalize_text(cliente.get("nombre", "")):
                    continue
                listbox.insert(tk.END, f"    {cliente.get('nombre')}")
                row_clients.append(cliente)

            count_label.config(text=f"{len(row_clients)} cliente(s)")
            if is_form:
                selected_id = payload.get("selected_client_id")
                if selected_id is not None:
                    for index, cliente in enumerate(row_clients):
                        if cliente.get("id") == selected_id:
                            listbox.selection_set(index)
                            listbox.see(index)
                            break
            elif row_clients:
                listbox.selection_set(0)

        def selected_client() -> dict | None:
            selection = listbox.curselection()
            if not selection:
                return None
            index = selection[0]
            if index >= len(row_clients):
                return None
            return row_clients[index]

        def refresh_primary_state() -> None:
            button = primary_button_holder["widget"]
            if button is None or not is_form:
                return
            enabled = selected_client() is not None or new_client_holder["value"] is not None
            if enabled:
                button.configure(state="normal")
            else:
                button.configure(state="disabled")

        def refresh_client_status() -> None:
            selected = selected_client()
            nuevo = new_client_holder["value"]
            if nuevo:
                client_status_box.configure(
                    bg=C["success_soft"], highlightbackground="#A7F3D0"
                )
                client_status_label.configure(
                    bg=C["success_soft"],
                    fg=C["success_text"],
                    text=f"✓ Se creará el cliente: {nuevo['nombre']}",
                )
            elif selected:
                client_status_box.configure(
                    bg=C["success_soft"], highlightbackground="#A7F3D0"
                )
                client_status_label.configure(
                    bg=C["success_soft"],
                    fg=C["success_text"],
                    text=f"✓ Cliente seleccionado: {selected.get('nombre', '')}",
                )
            else:
                client_status_box.configure(
                    bg=C["warning_soft"], highlightbackground=C["warning_border"]
                )
                message = (
                    "⚠ Falta seleccionar un cliente. Elige uno de la lista o pulsa «Crear nuevo cliente…»."
                    if clients
                    else "⚠ No hay clientes para seleccionar. Pulsa «Crear nuevo cliente…» para continuar."
                )
                client_status_label.configure(
                    bg=C["warning_soft"], fg=C["warning_text"], text=message
                )
            refresh_primary_state()

        def clear_new_client(_event=None) -> None:
            if new_client_holder["value"]:
                new_client_holder["value"] = None
            refresh_client_status()

        listbox.bind("<<ListboxSelect>>", clear_new_client)
        fill_list()
        refresh_client_status()
        def search_clients(_event=None) -> None:
            fill_list(search_entry.get())
            refresh_client_status()

        search_entry.bind("<KeyRelease>", search_clients)

        # ── diálogo "nuevo cliente" ──
        def ask_new_client() -> dict | None:
            dialog = tk.Toplevel(top)
            dialog.withdraw()
            dialog.title("Print System · Nuevo cliente")
            dialog.configure(bg=C["bg"])
            dialog.resizable(False, False)
            dialog.transient(top)

            self._header(dialog, "Nuevo cliente", "Se creará en Print System al confirmar")
            dialog_footer = tk.Frame(dialog, bg=C["bg"], padx=22, pady=14)
            dialog_footer.pack(fill="x", side="bottom")
            tk.Frame(dialog, bg=C["border"], height=1).pack(fill="x", side="bottom")

            dialog_body = tk.Frame(dialog, bg=C["bg"], padx=22, pady=16)
            dialog_body.pack(fill="both", expand=True)
            card = tk.Frame(
                dialog_body,
                bg=C["card"],
                highlightthickness=1,
                highlightbackground=C["border"],
                padx=14,
                pady=10,
            )
            card.pack(fill="x")
            card.grid_columnconfigure(1, weight=1)

            entry_nombre = self._field(card, 0, "Nombre", required=True)
            entry_numero = self._field(card, 1, "Número")
            entry_desc = self._field(card, 2, "Descripción")
            entry_nombre.insert(0, payload.get("nombre") or "")

            result: dict = {"value": None}

            def accept() -> None:
                nombre = entry_nombre.get().strip()
                if not nombre:
                    self._messagebox.showwarning(
                        "Nuevo cliente", "El nombre es obligatorio.", parent=dialog
                    )
                    return
                numero_raw = entry_numero.get().strip()
                numero = None
                if numero_raw:
                    try:
                        numero = int(numero_raw)
                    except ValueError:
                        self._messagebox.showwarning(
                            "Nuevo cliente", "El número debe ser entero.", parent=dialog
                        )
                        return
                result["value"] = {
                    "nombre": nombre,
                    "numero": numero,
                    "descripcion": entry_desc.get().strip() or None,
                }
                dialog.destroy()

            self._flat_button(dialog_footer, "Crear cliente", accept, kind="primary").pack(
                side="right"
            )
            self._flat_button(
                dialog_footer, "Cancelar", dialog.destroy, kind="ghost"
            ).pack(side="right", padx=(0, 8))

            dialog.bind("<Return>", lambda _e: accept())
            dialog.bind("<Escape>", lambda _e: dialog.destroy())

            self._center(dialog, 500, 320, offset_y=0)
            dialog.deiconify()
            dialog.lift()
            dialog.focus_force()
            entry_nombre.focus_set()
            dialog.grab_set()
            dialog.wait_window()
            return result["value"]

        def choose_new_client() -> None:
            datos = ask_new_client()
            if not datos:
                return
            if not is_form:
                finish({"accion": "crear", "datos": datos})
            else:
                new_client_holder["value"] = datos
                refresh_client_status()

        # ── acción principal ──
        def read_optional_float(entry) -> tuple[float | None, bool]:
            raw = entry.get().strip()
            if not raw:
                return None, True
            value = parse_metros(raw)
            if value is None:
                return None, False
            return value, True

        def primary_action() -> None:
            selected = selected_client()
            nuevo = new_client_holder["value"]

            if not is_form:
                if not selected:
                    self._messagebox.showwarning(
                        "Selecciona un cliente",
                        "Elige un cliente de la lista o crea uno nuevo.",
                        parent=top,
                    )
                    return
                finish({"accion": "usar", "cliente": selected})
                return

            # kind == "form"
            if not selected and not nuevo:
                self._messagebox.showwarning(
                    "Faltan datos",
                    "Selecciona un cliente de la lista o crea uno nuevo.",
                    parent=top,
                )
                return

            diseno = form_widgets["diseno"].get().strip()
            if not diseno:
                self._messagebox.showwarning(
                    "Faltan datos", "El diseño es obligatorio.", parent=top
                )
                return

            maquina = form_widgets["maquina"].get().strip()
            if not maquina:
                self._messagebox.showwarning(
                    "Faltan datos", "La máquina es obligatoria.", parent=top
                )
                return

            monto_raw = form_widgets["monto"].get().strip()
            try:
                pago = float(monto_raw.replace(",", "."))
            except ValueError:
                pago = 0.0
            if pago <= 0:
                self._messagebox.showwarning(
                    "Faltan datos", "Ingresa un monto válido mayor a 0.", parent=top
                )
                return

            metro_total, metros_ok = read_optional_float(form_widgets["metros"])
            if not metros_ok:
                self._messagebox.showwarning(
                    "Datos inválidos",
                    "Metros inválidos. Usa formatos como 1.5mts o 150cm.",
                    parent=top,
                )
                return

            estado = estado_var.get()
            adelanto = None
            if estado == "Crédito":
                adelanto_raw = adelanto_entry.get().strip()
                try:
                    adelanto = float(adelanto_raw.replace(",", "."))
                except ValueError:
                    adelanto = 0.0
                if adelanto <= 0:
                    self._messagebox.showwarning(
                        "Falta el adelanto",
                        "Para una venta a Crédito, ingresa el adelanto recibido.",
                        parent=top,
                    )
                    return
                if adelanto > pago:
                    self._messagebox.showwarning(
                        "Adelanto inválido",
                        "El adelanto no puede ser mayor que el costo total.",
                        parent=top,
                    )
                    return

            venta = {
                "diseno": diseno,
                "cantidad": form_widgets["cantidad"].get().strip() or None,
                "metro_total": metro_total,
                "maquina": maquina,
                "pago": pago,
                "estado": estado,
                "adelanto": adelanto,
            }
            finish(
                {
                    "accion": "registrar",
                    "cliente": selected,
                    "nuevo_cliente": nuevo,
                    "venta": venta,
                }
            )

        # ── botones del pie ──
        tk.Label(
            footer,
            text="El archivo conserva su nombre  ·  Enter confirma  ·  Esc: pendientes",
            font=FONT_SMALL,
            bg=C["bg"],
            fg=C["section"],
        ).pack(side="left")

        primary_text = (
            "Confirmar dry-run"
            if is_form and payload.get("dry_run")
            else "Confirmar y registrar"
            if is_form
            else "Usar seleccionado"
        )
        primary_kind = "success" if is_form else "primary"
        primary_button = self._flat_button(
            footer, primary_text, primary_action, kind=primary_kind
        )
        primary_button.pack(side="right")
        primary_button_holder["widget"] = primary_button
        refresh_primary_state()
        self._flat_button(
            footer, "Crear nuevo cliente…", choose_new_client, kind="ghost", padx=14
        ).pack(side="right", padx=(0, 8))
        self._flat_button(
            footer,
            "Ignorar archivo",
            lambda: finish({"accion": "ignorar"}),
            kind="danger_ghost",
            padx=14,
        ).pack(side="right", padx=(0, 8))

        # ── mostrar (alto ajustado al contenido, con tope de pantalla) ──
        top.update_idletasks()
        width = 720 if is_form else 680
        desired_height = (
            header.winfo_reqheight()
            + body.winfo_reqheight()
            + footer.winfo_reqheight()
            + 12
        )
        screen_height = top.winfo_screenheight()
        height = max(min(desired_height, screen_height - 80), 420)
        self._center(top, width, height)
        top.deiconify()
        top.lift()
        top.focus_force()
        top.bind("<Return>", lambda _e: primary_action())
        top.bind("<Escape>", lambda _e: finish({"accion": "pendiente"}))
        if is_form:
            form_widgets["diseno"].focus_set()
        else:
            search_entry.focus_set()
        top.grab_set()
        top.wait_window()
