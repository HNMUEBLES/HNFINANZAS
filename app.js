/* =========================================================
   HN FINANZAS
   APP.JS
   V1
========================================================= */

"use strict";


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const STORAGE_KEY = "hn_finanzas_v1";


const DEFAULT_DISTRIBUTION = [
    {
        id: "obligaciones",
        name: "Obligaciones",
        description: "Pagos y compromisos necesarios",
        percentage: 35
    },
    {
        id: "familia",
        name: "Familia y gastos variables",
        description: "Comida y gastos familiares",
        percentage: 25
    },
    {
        id: "ahorro_familiar",
        name: "Ahorro familiar",
        description: "Construcción de ahorro familiar",
        percentage: 15
    },
    {
        id: "reserva",
        name: "Reserva / imprevistos",
        description: "Fondo para situaciones inesperadas",
        percentage: 10
    },
    {
        id: "ahorro_hn",
        name: "Ahorro HN",
        description: "Capital reservado para HN",
        percentage: 10
    },
    {
        id: "crecimiento_hn",
        name: "Crecimiento HN",
        description: "Herramientas, materiales y crecimiento",
        percentage: 5
    }
];


const INCOME_CATEGORIES = [
    "HN Muebles",
    "Sueldo",
    "Trabajo adicional",
    "Venta",
    "Otros ingresos"
];


const EXPENSE_CATEGORIES = [
    "Comida",
    "Luz",
    "Agua",
    "Colegio",
    "Maestra integradora",
    "Diezmo",
    "Vivienda",
    "Transporte",
    "Salud",
    "Ropa",
    "Familia",
    "HN Muebles",
    "Materiales HN",
    "Herramientas HN",
    "Combustible HN",
    "Mano de obra HN",
    "Publicidad HN",
    "Otros"
];


const SAVING_CATEGORIES = [
    "Fondo de emergencia",
    "Ahorro familiar",
    "Ahorro HN",
    "Crecimiento HN"
];


/* =========================================================
   ESTADO
========================================================= */

let state = loadState();

let selectedMonth = new Date();

let currentMovementType = "income";

let editingMovementId = null;

let toastTimer = null;


/* =========================================================
   INICIO
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeApp();

});


function initializeApp() {

    normalizeState();

    setupNavigation();

    setupButtons();

    setupForms();

    setupModals();

    setupFilters();

    setupMonthNavigation();

    renderAll();

    setCurrentDate();

}


/* =========================================================
   ESTADO INICIAL
========================================================= */

function createDefaultState() {

    return {

        settings: {
            name: "",
            currency: "BOB"
        },

        movements: [],

        savings: [],

        obligations: [],

        distribution: DEFAULT_DISTRIBUTION.map(item => ({
            ...item
        }))

    };

}


function normalizeState() {

    if (!state || typeof state !== "object") {
        state = createDefaultState();
    }

    if (!state.settings) {
        state.settings = {
            name: "",
            currency: "BOB"
        };
    }

    if (!Array.isArray(state.movements)) {
        state.movements = [];
    }

    if (!Array.isArray(state.savings)) {
        state.savings = [];
    }

    if (!Array.isArray(state.obligations)) {
        state.obligations = [];
    }

    if (!Array.isArray(state.distribution) || !state.distribution.length) {
        state.distribution = DEFAULT_DISTRIBUTION.map(item => ({
            ...item
        }));
    }

    saveState();

}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function loadState() {

    try {

        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return createDefaultState();
        }

        return JSON.parse(raw);

    } catch (error) {

        console.error("Error cargando datos:", error);

        return createDefaultState();

    }

}


function saveState() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

    } catch (error) {

        console.error("Error guardando datos:", error);

        showToast("No se pudieron guardar los datos.");

    }

}


/* =========================================================
   UTILIDADES
========================================================= */

function generateId(prefix = "id") {

    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).substring(2, 8)
    );

}


function todayISO() {

    const date = new Date();

    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
        .toISOString()
        .split("T")[0];

}


function formatMoney(value) {

    const number = Number(value) || 0;

    return "Bs " + number.toLocaleString("es-BO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

}


function formatMoneyShort(value) {

    const number = Number(value) || 0;

    if (Math.abs(number) >= 1000000) {
        return "Bs " + (number / 1000000).toFixed(1) + " M";
    }

    if (Math.abs(number) >= 1000) {
        return "Bs " + (number / 1000).toFixed(1) + " K";
    }

    return "Bs " + Math.round(number).toLocaleString("es-BO");

}


function formatDate(dateString) {

    if (!dateString) return "—";

    const date = new Date(dateString + "T12:00:00");

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

}


function monthKey(date) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    return `${year}-${month}`;

}


function monthLabel(date) {

    return date.toLocaleDateString("es-BO", {
        month: "long",
        year: "numeric"
    }).replace(/^./, char => char.toUpperCase());

}


function getMovementMonth(movement) {

    return movement.date
        ? movement.date.substring(0, 7)
        : "";

}


function getSelectedMonthMovements() {

    const key = monthKey(selectedMonth);

    return state.movements.filter(
        movement => getMovementMonth(movement) === key
    );

}


function getSelectedMonthIncome() {

    return getSelectedMonthMovements()
        .filter(item => item.type === "income")
        .reduce(
            (total, item) => total + Number(item.amount || 0),
            0
        );

}


function getSelectedMonthExpenses() {

    return getSelectedMonthMovements()
        .filter(item => item.type === "expense")
        .reduce(
            (total, item) => total + Number(item.amount || 0),
            0
        );

}


function getSelectedMonthSavings() {

    const key = monthKey(selectedMonth);

    return state.savings
        .filter(item => item.date?.substring(0, 7) === key)
        .reduce(
            (total, item) => total + Number(item.amount || 0),
            0
        );

}


function sumBy(items, callback) {

    return items.reduce(
        (sum, item) => sum + Number(callback(item) || 0),
        0
    );

}


/* =========================================================
   NAVEGACIÓN
========================================================= */

const pageTitles = {

    dashboard: "Resumen financiero",
    movimientos: "Movimientos",
    ingresos: "Ingresos",
    gastos: "Gastos",
    distribucion: "Distribución",
    ahorros: "Ahorros",
    obligaciones: "Obligaciones",
    configuracion: "Configuración"

};


function setupNavigation() {

    document.querySelectorAll(".nav-item[data-view]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const view = button.dataset.view;

                showView(view);

                document
                    .getElementById("sidebar")
                    ?.classList.remove("open");

            });

        });


    document.querySelectorAll("[data-view-target]")
        .forEach(button => {

            button.addEventListener("click", () => {

                showView(button.dataset.viewTarget);

            });

        });


    document
        .getElementById("mobileMenu")
        ?.addEventListener("click", () => {

            document
                .getElementById("sidebar")
                ?.classList.toggle("open");

        });

}


function showView(viewName) {

    document.querySelectorAll(".view")
        .forEach(view => {

            view.classList.remove("active");

        });


    const target = document.getElementById(
        `view-${viewName}`
    );

    if (!target) return;

    target.classList.add("active");


    document.querySelectorAll(".nav-item[data-view]")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.view === viewName
            );

        });


    document.getElementById("pageTitle").textContent =
        pageTitles[viewName] || "HN Finanzas";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   BOTONES
========================================================= */

function setupButtons() {

    document
        .getElementById("quickAddIncome")
        ?.addEventListener("click", () => {

            openMovementModal("income");

        });


    document
        .getElementById("addIncome")
        ?.addEventListener("click", () => {

            openMovementModal("income");

        });


    document
        .getElementById("addExpense")
        ?.addEventListener("click", () => {

            openMovementModal("expense");

        });


    document
        .getElementById("addMovement")
        ?.addEventListener("click", () => {

            openMovementModal("income");

        });


    document
        .getElementById("addSaving")
        ?.addEventListener("click", openSavingModal);


    document
        .getElementById("addObligation")
        ?.addEventListener("click", openObligationModal);


    document
        .getElementById("refreshData")
        ?.addEventListener("click", () => {

            renderAll();

            showToast("Datos actualizados.");

        });


    document
        .getElementById("saveDistribution")
        ?.addEventListener("click", saveDistribution);


    document
        .getElementById("saveSettings")
        ?.addEventListener("click", saveSettings);


    document
        .getElementById("exportData")
        ?.addEventListener("click", exportData);


    document
        .getElementById("backupData")
        ?.addEventListener("click", exportData);


    document
        .getElementById("restoreData")
        ?.addEventListener("change", restoreData);


    document
        .getElementById("clearData")
        ?.addEventListener("click", clearAllData);

}


/* =========================================================
   MES
========================================================= */

function setupMonthNavigation() {

    document
        .getElementById("prevMonth")
        ?.addEventListener("click", () => {

            selectedMonth.setMonth(
                selectedMonth.getMonth() - 1
            );

            renderAll();

        });


    document
        .getElementById("nextMonth")
        ?.addEventListener("click", () => {

            selectedMonth.setMonth(
                selectedMonth.getMonth() + 1
            );

            renderAll();

        });

}


/* =========================================================
   FECHA ACTUAL
========================================================= */

function setCurrentDate() {

    const element =
        document.getElementById("currentDate");

    if (!element) return;

    element.textContent = new Date()
        .toLocaleDateString("es-BO", {
            weekday: "long",
            day: "numeric",
            month: "long"
        })
        .replace(/^./, char => char.toUpperCase());

}


/* =========================================================
   FORMULARIOS
========================================================= */

function setupForms() {

    document
        .getElementById("movementForm")
        ?.addEventListener("submit", handleMovementSubmit);


    document
        .getElementById("savingForm")
        ?.addEventListener("submit", handleSavingSubmit);


    document
        .getElementById("obligationForm")
        ?.addEventListener("submit", handleObligationSubmit);


    document
        .querySelectorAll(".type-option")
        .forEach(button => {

            button.addEventListener("click", () => {

                setMovementType(
                    button.dataset.type
                );

            });

        });

}


/* =========================================================
   MODALES
========================================================= */

function setupModals() {

    document
        .querySelectorAll("[data-close-modal]")
        .forEach(button => {

            button.addEventListener("click", () => {

                closeModal(
                    button.dataset.closeModal
                );

            });

        });


    document
        .querySelectorAll(".modal-overlay")
        .forEach(overlay => {

            overlay.addEventListener("click", event => {

                if (event.target === overlay) {

                    overlay.classList.add("hidden");

                }

            });

        });


    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            document
                .querySelectorAll(".modal-overlay")
                .forEach(modal => {

                    modal.classList.add("hidden");

                });

        }

    });

}


function openModal(id) {

    const modal = document.getElementById(id);

    if (modal) {

        modal.classList.remove("hidden");

    }

}


function closeModal(id) {

    const modal = document.getElementById(id);

    if (modal) {

        modal.classList.add("hidden");

    }

}


/* =========================================================
   MOVIMIENTOS
========================================================= */

function openMovementModal(type = "income", movement = null) {

    editingMovementId = movement?.id || null;

    const form = document.getElementById("movementForm");

    form.reset();

    document.getElementById("movementId").value =
        movement?.id || "";


    document.getElementById("movementDate").value =
        movement?.date || todayISO();


    document.getElementById("movementAmount").value =
        movement?.amount || "";


    document.getElementById("movementDescription").value =
        movement?.description || "";


    document.getElementById("movementNote").value =
        movement?.note || "";


    document.getElementById("movementAccount").value =
        movement?.account || "Efectivo";


    setMovementType(
        movement?.type || type
    );


    populateMovementCategories(
        movement?.type || type,
        movement?.category
    );


    document.getElementById("movementModalTitle").textContent =
        movement
            ? "Editar movimiento"
            : "Nuevo movimiento";


    openModal("movementModal");

}


function setMovementType(type) {

    currentMovementType = type;

    document
        .querySelectorAll(".type-option")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.type === type
            );

        });


    const selectedCategory =
        document.getElementById("movementCategory")?.value;

    populateMovementCategories(
        type,
        selectedCategory
    );

}


function populateMovementCategories(type, selected = null) {

    const select =
        document.getElementById("movementCategory");

    if (!select) return;

    const categories =
        type === "income"
            ? INCOME_CATEGORIES
            : EXPENSE_CATEGORIES;


    select.innerHTML = categories
        .map(category => {

            const isSelected =
                category === selected
                    ? "selected"
                    : "";

            return `
                <option value="${escapeHTML(category)}" ${isSelected}>
                    ${escapeHTML(category)}
                </option>
            `;

        })
        .join("");

}


function handleMovementSubmit(event) {

    event.preventDefault();


    const description =
        document
            .getElementById("movementDescription")
            .value
            .trim();


    const amount =
        Number(
            document.getElementById("movementAmount").value
        );


    const date =
        document.getElementById("movementDate").value;


    const category =
        document.getElementById("movementCategory").value;


    if (!description || !amount || amount <= 0 || !date) {

        showToast("Completá los campos obligatorios.");

        return;

    }


    const movement = {

        id:
            editingMovementId ||
            generateId("mov"),

        type: currentMovementType,

        description,

        amount,

        date,

        category,

        account:
            document.getElementById("movementAccount").value,

        note:
            document.getElementById("movementNote").value.trim(),

        updatedAt:
            new Date().toISOString()

    };


    if (editingMovementId) {

        const index =
            state.movements.findIndex(
                item => item.id === editingMovementId
            );

        if (index !== -1) {

            state.movements[index] = movement;

        }

        showToast("Movimiento actualizado.");

    } else {

        movement.createdAt =
            new Date().toISOString();

        state.movements.push(movement);

        showToast(
            currentMovementType === "income"
                ? "Ingreso registrado."
                : "Gasto registrado."
        );

    }


    saveState();

    closeModal("movementModal");

    renderAll();

    editingMovementId = null;

}


/* =========================================================
   INGRESOS
========================================================= */

function renderIncomeView() {

    const movements =
        getSelectedMonthMovements()
            .filter(item => item.type === "income");


    const total =
        sumBy(
            movements,
            item => item.amount
        );


    const business =
        sumBy(
            movements.filter(
                item => item.category === "HN Muebles"
            ),
            item => item.amount
        );


    const other = total - business;


    setText(
        "incomeViewTotal",
        formatMoney(total)
    );

    setText(
        "incomeBusinessTotal",
        formatMoney(business)
    );

    setText(
        "incomeOtherTotal",
        formatMoney(other)
    );


    renderIncomeSources(movements);

    renderIncomeCards(movements);

}


function renderIncomeSources(movements) {

    const container =
        document.getElementById("incomeSourcesList");

    if (!container) return;


    const grouped = groupByCategory(movements);

    const total =
        sumBy(
            movements,
            item => item.amount
        );


    const entries =
        Object.entries(grouped)
            .sort(
                (a, b) => b[1] - a[1]
            );


    if (!entries.length) {

        container.innerHTML =
            emptyInline("No hay ingresos registrados este mes.");

        return;

    }


    container.innerHTML =
        entries.map(([name, amount]) => {

            const percent =
                total > 0
                    ? (amount / total) * 100
                    : 0;

            return `
                <div class="category-bar-row">

                    <span class="category-name">
                        ${escapeHTML(name)}
                    </span>

                    <div class="bar-container">
                        <div
                            class="bar-fill"
                            style="width:${Math.min(percent, 100)}%"
                        ></div>
                    </div>

                    <span class="category-value">
                        ${formatMoney(amount)}
                    </span>

                </div>
            `;

        })
        .join("");

}


function renderIncomeCards(movements) {

    const container =
        document.getElementById("incomeCards");

    if (!container) return;


    const sorted =
        [...movements]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );


    if (!sorted.length) {

        container.innerHTML =
            emptyInline("Todavía no registraste ingresos.");

        return;

    }


    container.innerHTML =
        sorted.map(item => financialCardHTML(item))
            .join("");

}


/* =========================================================
   GASTOS
========================================================= */

function renderExpenseView() {

    const movements =
        getSelectedMonthMovements()
            .filter(item => item.type === "expense");


    const total =
        sumBy(
            movements,
            item => item.amount
        );


    const familyCategories = [
        "Comida",
        "Luz",
        "Agua",
        "Colegio",
        "Maestra integradora",
        "Diezmo",
        "Vivienda",
        "Transporte",
        "Salud",
        "Ropa",
        "Familia"
    ];


    const businessCategories = [
        "HN Muebles",
        "Materiales HN",
        "Herramientas HN",
        "Combustible HN",
        "Mano de obra HN",
        "Publicidad HN"
    ];


    const familyTotal =
        sumBy(
            movements.filter(
                item => familyCategories.includes(item.category)
            ),
            item => item.amount
        );


    const businessTotal =
        sumBy(
            movements.filter(
                item => businessCategories.includes(item.category)
            ),
            item => item.amount
        );


    setText(
        "expenseViewTotal",
        formatMoney(total)
    );

    setText(
        "expenseFamilyTotal",
        formatMoney(familyTotal)
    );

    setText(
        "expenseBusinessTotal",
        formatMoney(businessTotal)
    );


    renderExpenseCategories(movements);

    renderExpenseCards(movements);

}


function renderExpenseCategories(movements) {

    const container =
        document.getElementById("expenseCategoriesList");

    if (!container) return;


    const grouped =
        groupByCategory(movements);


    const total =
        sumBy(
            movements,
            item => item.amount
        );


    const entries =
        Object.entries(grouped)
            .sort(
                (a, b) => b[1] - a[1]
            );


    if (!entries.length) {

        container.innerHTML =
            emptyInline("No hay gastos registrados este mes.");

        return;

    }


    container.innerHTML =
        entries.map(([name, amount]) => {

            const percent =
                total > 0
                    ? amount / total * 100
                    : 0;

            return `
                <div class="category-bar-row">

                    <span class="category-name">
                        ${escapeHTML(name)}
                    </span>

                    <div class="bar-container">
                        <div
                            class="bar-fill"
                            style="width:${Math.min(percent, 100)}%"
                        ></div>
                    </div>

                    <span class="category-value">
                        ${formatMoney(amount)}
                    </span>

                </div>
            `;

        })
        .join("");

}


function renderExpenseCards(movements) {

    const container =
        document.getElementById("expenseCards");

    if (!container) return;


    const sorted =
        [...movements]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );


    if (!sorted.length) {

        container.innerHTML =
            emptyInline("Todavía no registraste gastos.");

        return;

    }


    container.innerHTML =
        sorted.map(item => financialCardHTML(item))
            .join("");

}


/* =========================================================
   MOVIMIENTOS
========================================================= */

function setupFilters() {

    document
        .getElementById("movementMonthFilter")
        ?.addEventListener("change", event => {

            const value = event.target.value;

            if (!value) return;

            const [year, month] =
                value.split("-").map(Number);

            selectedMonth =
                new Date(year, month - 1, 1);

            renderAll();

        });


    document
        .getElementById("movementTypeFilter")
        ?.addEventListener(
            "change",
            renderMovementsTable
        );


    document
        .getElementById("movementSearch")
        ?.addEventListener(
            "input",
            renderMovementsTable
        );

}


function renderMovementMonthFilter() {

    const select =
        document.getElementById("movementMonthFilter");

    if (!select) return;


    const current =
        monthKey(selectedMonth);


    const keys = new Set();

    state.movements.forEach(item => {

        if (item.date) {

            keys.add(
                item.date.substring(0, 7)
            );

        }

    });


    keys.add(current);


    const sorted =
        [...keys].sort().reverse();


    select.innerHTML =
        sorted.map(key => {

            const [year, month] =
                key.split("-").map(Number);

            const label =
                new Date(
                    year,
                    month - 1,
                    1
                )
                .toLocaleDateString(
                    "es-BO",
                    {
                        month: "long",
                        year: "numeric"
                    }
                )
                .replace(
                    /^./,
                    char => char.toUpperCase()
                );


            return `
                <option
                    value="${key}"
                    ${key === current ? "selected" : ""}
                >
                    ${label}
                </option>
            `;

        })
        .join("");

}


function renderMovementsTable() {

    const tbody =
        document.getElementById("movementsTableBody");

    const empty =
        document.getElementById("movementsEmpty");

    if (!tbody || !empty) return;


    const monthFilter =
        document.getElementById(
            "movementMonthFilter"
        )?.value || monthKey(selectedMonth);


    const typeFilter =
        document.getElementById(
            "movementTypeFilter"
        )?.value || "all";


    const search =
        document.getElementById(
            "movementSearch"
        )?.value
            .trim()
            .toLowerCase() || "";


    let movements =
        state.movements.filter(
            item =>
                getMovementMonth(item) === monthFilter
        );


    if (typeFilter !== "all") {

        movements =
            movements.filter(
                item => item.type === typeFilter
            );

    }


    if (search) {

        movements =
            movements.filter(item => {

                const text = [
                    item.description,
                    item.category,
                    item.account,
                    item.note
                ]
                    .join(" ")
                    .toLowerCase();

                return text.includes(search);

            });

    }


    movements.sort(
        (a, b) =>
            new Date(b.date) -
            new Date(a.date)
    );


    if (!movements.length) {

        tbody.innerHTML = "";

        empty.classList.remove("hidden");

        return;

    }


    empty.classList.add("hidden");


    tbody.innerHTML =
        movements.map(item => {

            const sign =
                item.type === "income"
                    ? "+"
                    : "−";


            return `
                <tr>

                    <td>
                        ${formatDate(item.date)}
                    </td>

                    <td>
                        <div class="table-description">
                            <strong>
                                ${escapeHTML(item.description)}
                            </strong>

                            ${
                                item.note
                                    ? `<small>${escapeHTML(item.note)}</small>`
                                    : ""
                            }
                        </div>
                    </td>

                    <td>
                        ${escapeHTML(item.category)}
                    </td>

                    <td>
                        <span class="type-pill ${item.type}">
                            ${
                                item.type === "income"
                                    ? "Ingreso"
                                    : "Gasto"
                            }
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(item.account || "—")}
                    </td>

                    <td class="align-right ${
                        item.type === "income"
                            ? "amount-income"
                            : "amount-expense"
                    }">
                        ${sign}${formatMoney(item.amount)}
                    </td>

                    <td>

                        <div class="table-actions">

                            <button
                                class="small-action"
                                title="Editar"
                                onclick="editMovement('${item.id}')"
                            >
                                ✎
                            </button>

                            <button
                                class="small-action"
                                title="Eliminar"
                                onclick="deleteMovement('${item.id}')"
                            >
                                ×
                            </button>

                        </div>

                    </td>

                </tr>
            `;

        })
        .join("");

}


function editMovement(id) {

    const movement =
        state.movements.find(
            item => item.id === id
        );

    if (!movement) return;

    openMovementModal(
        movement.type,
        movement
    );

}


function deleteMovement(id) {

    const movement =
        state.movements.find(
            item => item.id === id
        );

    if (!movement) return;


    const confirmed =
        confirm(
            `¿Eliminar "${movement.description}"?`
        );


    if (!confirmed) return;


    state.movements =
        state.movements.filter(
            item => item.id !== id
        );


    saveState();

    renderAll();

    showToast("Movimiento eliminado.");

}


/* =========================================================
   FINANCIAL CARD
========================================================= */

function financialCardHTML(item) {

    return `
        <div class="financial-card">

            <div class="financial-card-main">

                <strong>
                    ${escapeHTML(item.description)}
                </strong>

                <small>
                    ${escapeHTML(item.category)}
                    ·
                    ${formatDate(item.date)}
                    ${
                        item.account
                            ? ` · ${escapeHTML(item.account)}`
                            : ""
                    }
                </small>

            </div>


            <div class="financial-card-amount ${
                item.type === "income"
                    ? "amount-income"
                    : "amount-expense"
            }">

                ${
                    item.type === "income"
                        ? "+"
                        : "−"
                }

                ${formatMoney(item.amount)}

            </div>


            <div class="card-actions">

                <button
                    class="small-action"
                    onclick="editMovement('${item.id}')"
                    title="Editar"
                >
                    ✎
                </button>

                <button
                    class="small-action"
                    onclick="deleteMovement('${item.id}')"
                    title="Eliminar"
                >
                    ×
                </button>

            </div>

        </div>
    `;

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

    const movements =
        getSelectedMonthMovements();


    const income =
        sumBy(
            movements.filter(
                item => item.type === "income"
            ),
            item => item.amount
        );


    const expenses =
        sumBy(
            movements.filter(
                item => item.type === "expense"
            ),
            item => item.amount
        );


    const savings =
        getSelectedMonthSavings();


    const balance =
        income - expenses - savings;


    setText(
        "selectedMonthLabel",
        monthLabel(selectedMonth)
    );


    setText(
        "dashboardIncome",
        formatMoney(income)
    );


    setText(
        "dashboardExpenses",
        formatMoney(expenses)
    );


    setText(
        "dashboardBalance",
        formatMoney(balance)
    );


    setText(
        "dashboardSavings",
        formatMoney(savings)
    );


    const incomeCount =
        movements.filter(
            item => item.type === "income"
        ).length;


    const expenseCount =
        movements.filter(
            item => item.type === "expense"
        ).length;


    setText(
        "dashboardIncomeCount",
        `${incomeCount} movimiento${incomeCount === 1 ? "" : "s"}`
    );


    setText(
        "dashboardExpenseCount",
        `${expenseCount} movimiento${expenseCount === 1 ? "" : "s"}`
    );


    renderDashboardDistribution(income);

    renderDashboardObligations();

    renderDashboardMovements();

}


function renderDashboardDistribution(income) {

    const container =
        document.getElementById(
            "dashboardDistributionList"
        );

    const donut =
        document.getElementById(
            "dashboardDonut"
        );


    if (!container || !donut) return;


    const distributions =
        state.distribution;


    const totalPercentage =
        sumBy(
            distributions,
            item => item.percentage
        );


    const totalMoney =
        income;


    setText(
        "donutTotal",
        formatMoneyShort(totalMoney)
    );


    if (!totalMoney || !totalPercentage) {

        donut.style.background =
            "conic-gradient(#e5e5e5 0deg 360deg)";

    } else {

        const stops = [];

        let currentDegree = 0;

        const shades = [
            "#171717",
            "#525252",
            "#737373",
            "#a3a3a3",
            "#d4d4d4",
            "#e5e5e5"
        ];


        distributions.forEach(
            (item, index) => {

                const degree =
                    item.percentage /
                    totalPercentage *
                    360;

                const end =
                    currentDegree + degree;

                stops.push(
                    `${shades[index % shades.length]} ${currentDegree}deg ${end}deg`
                );

                currentDegree = end;

            }
        );


        donut.style.background =
            `conic-gradient(${stops.join(",")})`;

    }


    container.innerHTML =
        distributions
            .slice(0, 4)
            .map((item, index) => {

                const amount =
                    income *
                    Number(item.percentage) /
                    100;

                return `
                    <div class="distribution-row">

                        <span
                            class="distribution-dot"
                            style="background:${[
                                "#171717",
                                "#737373",
                                "#a3a3a3",
                                "#d4d4d4"
                            ][index]}"
                        ></span>

                        <span>
                            ${escapeHTML(item.name)}
                        </span>

                        <strong>
                            ${formatMoney(amount)}
                        </strong>

                    </div>
                `;

            })
            .join("");

}


function renderDashboardObligations() {

    const container =
        document.getElementById(
            "dashboardObligations"
        );

    if (!container) return;


    if (!state.obligations.length) {

        container.innerHTML =
            emptyInline(
                "Todavía no registraste obligaciones."
            );

        return;

    }


    const currentMonth =
        monthKey(selectedMonth);


    const items =
        state.obligations
            .map(item => {

                const payment =
                    state.movements.find(
                        movement =>
                            movement.type === "expense" &&
                            movement.category === item.category &&
                            movement.description === item.name &&
                            movement.date?.startsWith(currentMonth)
                    );


                return {
                    ...item,
                    paid: Boolean(payment)
                };

            })
            .slice(0, 5);


    container.innerHTML =
        items.map(item => {

            return `
                <div class="obligation-mini">

                    <div class="obligation-mini-main">

                        <strong>
                            ${escapeHTML(item.name)}
                        </strong>

                        <small>
                            Día ${item.dueDay || "—"}
                            ·
                            ${
                                item.paid
                                    ? "Pagado"
                                    : "Pendiente"
                            }
                        </small>

                    </div>

                    <span class="obligation-mini-amount">
                        ${formatMoney(item.amount)}
                    </span>

                </div>
            `;

        })
        .join("");

}


function renderDashboardMovements() {

    const container =
        document.getElementById(
            "dashboardMovements"
        );

    if (!container) return;


    const movements =
        [...getSelectedMonthMovements()]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            )
            .slice(0, 6);


    if (!movements.length) {

        container.innerHTML =
            emptyInline(
                "Todavía no hay movimientos este mes."
            );

        return;

    }


    container.innerHTML =
        movements
            .map(item => {

                return `
                    <div class="movement-item">

                        <div class="movement-icon ${item.type}">
                            ${
                                item.type === "income"
                                    ? "+"
                                    : "−"
                            }
                        </div>

                        <div class="movement-main">

                            <strong>
                                ${escapeHTML(item.description)}
                            </strong>

                            <small>
                                ${escapeHTML(item.category)}
                            </small>

                        </div>

                        <div class="movement-date">
                            ${formatDate(item.date)}
                        </div>

                        <div class="movement-amount ${item.type}">
                            ${
                                item.type === "income"
                                    ? "+"
                                    : "−"
                            }
                            ${formatMoney(item.amount)}
                        </div>

                    </div>
                `;

            })
            .join("");

}


/* =========================================================
   DISTRIBUCIÓN
========================================================= */

function renderDistribution() {

    const container =
        document.getElementById(
            "distributionInputs"
        );

    const example =
        document.getElementById(
            "distributionExample"
        );


    if (!container || !example) return;


    container.innerHTML =
        state.distribution
            .map(item => {

                return `
                    <div class="distribution-input-row">

                        <div class="distribution-input-info">

                            <strong>
                                ${escapeHTML(item.name)}
                            </strong>

                            <small>
                                ${escapeHTML(item.description)}
                            </small>

                        </div>

                        <div class="percentage-input">

                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value="${Number(item.percentage)}"
                                data-distribution-id="${item.id}"
                            >

                            <span>%</span>

                        </div>

                    </div>
                `;

            })
            .join("");


    document
        .querySelectorAll(
            "[data-distribution-id]"
        )
        .forEach(input => {

            input.addEventListener(
                "input",
                updateDistributionPreview
            );

        });


    updateDistributionPreview();

}


function updateDistributionPreview() {

    const inputs =
        document.querySelectorAll(
            "[data-distribution-id]"
        );


    let total = 0;

    const values = [];


    inputs.forEach(input => {

        const value =
            Math.max(
                0,
                Number(input.value) || 0
            );

        total += value;

        values.push({
            id: input.dataset.distributionId,
            value
        });

    });


    setText(
        "distributionPercentageTotal",
        `${total}%`
    );


    const warning =
        document.getElementById(
            "distributionWarning"
        );


    if (warning) {

        warning.classList.toggle(
            "hidden",
            total === 100
        );

    }


    const example =
        document.getElementById(
            "distributionExample"
        );


    if (!example) return;


    example.innerHTML =
        values.map(item => {

            const distribution =
                state.distribution.find(
                    element =>
                        element.id === item.id
                );


            if (!distribution) return "";


            return `
                <div class="example-row">

                    <span>
                        ${escapeHTML(distribution.name)}
                        (${item.value}%)
                    </span>

                    <strong>
                        ${formatMoney(
                            10000 * item.value / 100
                        )}
                    </strong>

                </div>
            `;

        })
        .join("");

}


function saveDistribution() {

    const inputs =
        document.querySelectorAll(
            "[data-distribution-id]"
        );


    let total = 0;


    inputs.forEach(input => {

        const value =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(input.value) || 0
                )
            );


        total += value;


        const item =
            state.distribution.find(
                element =>
                    element.id ===
                    input.dataset.distributionId
            );


        if (item) {

            item.percentage = value;

        }

    });


    if (total !== 100) {

        showToast(
            "La distribución debe sumar exactamente 100%."
        );

        renderDistribution();

        return;

    }


    saveState();

    renderAll();

    showToast("Distribución guardada.");

}


/* =========================================================
   AHORROS
========================================================= */

function openSavingModal() {

    const form =
        document.getElementById("savingForm");

    form.reset();

    document.getElementById("savingDate").value =
        todayISO();

    openModal("savingModal");

}


function handleSavingSubmit(event) {

    event.preventDefault();


    const amount =
        Number(
            document.getElementById(
                "savingAmount"
            ).value
        );


    const category =
        document.getElementById(
            "savingCategory"
        ).value;


    const date =
        document.getElementById(
            "savingDate"
        ).value;


    const note =
        document.getElementById(
            "savingNote"
        ).value.trim();


    if (!amount || amount <= 0 || !date) {

        showToast(
            "Completá el monto y la fecha."
        );

        return;

    }


    state.savings.push({

        id: generateId("sav"),

        category,

        amount,

        date,

        note,

        createdAt:
            new Date().toISOString()

    });


    saveState();

    closeModal("savingModal");

    renderAll();

    showToast("Ahorro registrado.");

}


function renderSavings() {

    const container =
        document.getElementById(
            "savingCards"
        );


    const movements =
        state.savings;


    if (!container) return;


    const categories = SAVING_CATEGORIES;


    container.innerHTML =
        categories.map(category => {

            const total =
                sumBy(
                    movements.filter(
                        item =>
                            item.category === category
                    ),
                    item => item.amount
                );


            return `
                <div class="saving-card">

                    <div class="saving-card-icon">
                        ▣
                    </div>

                    <h4>
                        ${escapeHTML(category)}
                    </h4>

                    <strong>
                        ${formatMoney(total)}
                    </strong>

                    <small>
                        Acumulado registrado
                    </small>

                </div>
            `;

        })
        .join("");


    const monthKeyValue =
        monthKey(selectedMonth);


    const recent =
        [...movements]
            .filter(
                item =>
                    item.date?.startsWith(
                        monthKeyValue
                    )
            )
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );


    const list =
        document.getElementById(
            "savingMovements"
        );


    if (!list) return;


    if (!recent.length) {

        list.innerHTML =
            emptyInline(
                "No hay ahorros registrados este mes."
            );

        return;

    }


    list.innerHTML =
        recent.map(item => {

            return `
                <div class="financial-card">

                    <div class="financial-card-main">

                        <strong>
                            ${escapeHTML(item.category)}
                        </strong>

                        <small>
                            ${formatDate(item.date)}
                            ${
                                item.note
                                    ? ` · ${escapeHTML(item.note)}`
                                    : ""
                            }
                        </small>

                    </div>

                    <div class="financial-card-amount">
                        ${formatMoney(item.amount)}
                    </div>

                    <div class="card-actions">

                        <button
                            class="small-action"
                            onclick="deleteSaving('${item.id}')"
                            title="Eliminar"
                        >
                            ×
                        </button>

                    </div>

                </div>
            `;

        })
        .join("");

}


function deleteSaving(id) {

    const confirmed =
        confirm(
            "¿Eliminar este registro de ahorro?"
        );


    if (!confirmed) return;


    state.savings =
        state.savings.filter(
            item => item.id !== id
        );


    saveState();

    renderAll();

    showToast("Ahorro eliminado.");

}


/* =========================================================
   OBLIGACIONES
========================================================= */

function openObligationModal() {

    const form =
        document.getElementById(
            "obligationForm"
        );

    form.reset();

    document.getElementById(
        "obligationDueDay"
    ).value = 5;

    openModal("obligationModal");

}


function handleObligationSubmit(event) {

    event.preventDefault();


    const name =
        document.getElementById(
            "obligationName"
        ).value.trim();


    const amount =
        Number(
            document.getElementById(
                "obligationAmount"
            ).value
        );


    const dueDay =
        Number(
            document.getElementById(
                "obligationDueDay"
            ).value
        ) || 1;


    const category =
        document.getElementById(
            "obligationCategory"
        ).value;


    if (!name || !amount || amount <= 0) {

        showToast(
            "Completá el nombre y monto."
        );

        return;

    }


    state.obligations.push({

        id: generateId("obl"),

        name,

        amount,

        dueDay,

        category,

        active: true,

        createdAt:
            new Date().toISOString()

    });


    saveState();

    closeModal("obligationModal");

    renderAll();

    showToast("Obligación registrada.");

}


function renderObligations() {

    const container =
        document.getElementById(
            "obligationList"
        );


    if (!container) return;


    const currentMonth =
        monthKey(selectedMonth);


    let total = 0;

    let paid = 0;


    const rows =
        state.obligations.map(item => {

            total += Number(item.amount || 0);


            const payment =
                state.movements.find(
                    movement =>
                        movement.type === "expense" &&
                        movement.description === item.name &&
                        movement.category === item.category &&
                        movement.date?.startsWith(
                            currentMonth
                        )
                );


            if (payment) {

                paid += Number(item.amount || 0);

            }


            return {
                ...item,
                isPaid: Boolean(payment)
            };

        });


    const pending =
        Math.max(
            total - paid,
            0
        );


    setText(
        "obligationTotal",
        formatMoney(total)
    );


    setText(
        "obligationPaid",
        formatMoney(paid)
    );


    setText(
        "obligationPending",
        formatMoney(pending)
    );


    if (!rows.length) {

        container.innerHTML =
            emptyInline(
                "No hay obligaciones registradas."
            );

        return;

    }


    container.innerHTML =
        rows.map(item => {

            const status =
                item.isPaid
                    ? "paid"
                    : "pending";


            return `
                <div class="obligation-item">

                    <div class="obligation-name">

                        <strong>
                            ${escapeHTML(item.name)}
                        </strong>

                        <small>
                            ${escapeHTML(item.category)}
                            · vence día ${item.dueDay}
                        </small>

                    </div>


                    <div class="obligation-amount">
                        ${formatMoney(item.amount)}
                    </div>


                    <div class="obligation-status ${status}">
                        ${
                            item.isPaid
                                ? "Pagado"
                                : "Pendiente"
                        }
                    </div>


                    <div class="obligation-actions">

                        ${
                            !item.isPaid
                                ? `
                                    <button
                                        class="small-action"
                                        title="Registrar pago"
                                        onclick="payObligation('${item.id}')"
                                    >
                                        ✓
                                    </button>
                                `
                                : ""
                        }

                        <button
                            class="small-action"
                            title="Eliminar"
                            onclick="deleteObligation('${item.id}')"
                        >
                            ×
                        </button>

                    </div>

                </div>
            `;

        })
        .join("");

}


function payObligation(id) {

    const obligation =
        state.obligations.find(
            item => item.id === id
        );


    if (!obligation) return;


    const date =
        todayISO();


    const currentMonth =
        monthKey(selectedMonth);


    const paymentDate =
        date.startsWith(currentMonth)
            ? date
            : `${currentMonth}-01`;


    state.movements.push({

        id: generateId("mov"),

        type: "expense",

        description: obligation.name,

        amount: Number(obligation.amount),

        date: paymentDate,

        category: obligation.category,

        account: "Banco",

        note: "Pago de obligación",

        createdAt:
            new Date().toISOString()

    });


    saveState();

    renderAll();

    showToast(
        `${obligation.name} marcado como pagado.`
    );

}


function deleteObligation(id) {

    const obligation =
        state.obligations.find(
            item => item.id === id
        );


    if (!obligation) return;


    const confirmed =
        confirm(
            `¿Eliminar la obligación "${obligation.name}"?`
        );


    if (!confirmed) return;


    state.obligations =
        state.obligations.filter(
            item => item.id !== id
        );


    saveState();

    renderAll();

    showToast("Obligación eliminada.");

}


/* =========================================================
   CONFIGURACIÓN
========================================================= */

function renderSettings() {

    const name =
        document.getElementById(
            "settingsName"
        );


    const currency =
        document.getElementById(
            "settingsCurrency"
        );


    if (name) {

        name.value =
            state.settings.name || "";

    }


    if (currency) {

        currency.value =
            state.settings.currency || "BOB";

    }

}


function saveSettings() {

    state.settings.name =
        document.getElementById(
            "settingsName"
        ).value.trim();


    state.settings.currency =
        document.getElementById(
            "settingsCurrency"
        ).value;


    saveState();

    showToast("Configuración guardada.");

}


/* =========================================================
   EXPORTAR / IMPORTAR
========================================================= */

function exportData() {

    const backup = {

        app: "HN Finanzas",

        version: 1,

        exportedAt:
            new Date().toISOString(),

        data: state

    };


    const blob =
        new Blob(
            [
                JSON.stringify(
                    backup,
                    null,
                    2
                )
            ],
            {
                type: "application/json"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        `HN-Finanzas-respaldo-${todayISO()}.json`;


    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);


    showToast("Respaldo descargado.");

}


function restoreData(event) {

    const file =
        event.target.files?.[0];


    if (!file) return;


    const reader =
        new FileReader();


    reader.onload = () => {

        try {

            const imported =
                JSON.parse(
                    reader.result
                );


            const importedState =
                imported.data ||
                imported;


            if (
                !importedState ||
                typeof importedState !== "object"
            ) {

                throw new Error(
                    "Formato inválido"
                );

            }


            const confirmed =
                confirm(
                    "Esto reemplazará los datos actuales. ¿Continuar?"
                );


            if (!confirmed) {

                event.target.value = "";

                return;

            }


            state = importedState;

            normalizeState();

            renderAll();

            showToast(
                "Respaldo restaurado correctamente."
            );


        } catch (error) {

            console.error(error);

            showToast(
                "El archivo de respaldo no es válido."
            );

        }


        event.target.value = "";

    };


    reader.readAsText(file);

}


function clearAllData() {

    const confirmation =
        prompt(
            'Escribí BORRAR para eliminar todos los datos.'
        );


    if (confirmation !== "BORRAR") {

        showToast("Operación cancelada.");

        return;

    }


    state =
        createDefaultState();


    saveState();

    renderAll();

    showToast(
        "Todos los datos fueron eliminados."
    );

}


/* =========================================================
   RENDER GENERAL
========================================================= */

function renderAll() {

    renderDashboard();

    renderMovementsTable();

    renderMovementMonthFilter();

    renderIncomeView();

    renderExpenseView();

    renderDistribution();

    renderSavings();

    renderObligations();

    renderSettings();

}


/* =========================================================
   AGRUPACIONES
========================================================= */

function groupByCategory(items) {

    return items.reduce(
        (groups, item) => {

            const category =
                item.category ||
                "Sin categoría";


            if (!groups[category]) {

                groups[category] = 0;

            }


            groups[category] +=
                Number(item.amount || 0);


            return groups;

        },
        {}
    );

}


/* =========================================================
   HTML UTILITIES
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent = value;

    }

}


function emptyInline(message) {

    return `
        <div
            style="
                padding:25px;
                text-align:center;
                color:#737373;
                font-size:12px;
            "
        >
            ${escapeHTML(message)}
        </div>
    `;

}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    const toast =
        document.getElementById("toast");


    const text =
        document.getElementById(
            "toastMessage"
        );


    if (!toast || !text) return;


    text.textContent = message;


    toast.classList.add("show");


    clearTimeout(toastTimer);


    toastTimer =
        setTimeout(() => {

            toast.classList.remove("show");

        }, 2600);

}


/* =========================================================
   EXPOSICIÓN GLOBAL
   Necesario para botones generados dinámicamente.
========================================================= */

window.editMovement = editMovement;

window.deleteMovement = deleteMovement;

window.deleteSaving = deleteSaving;

window.payObligation = payObligation;

window.deleteObligation = deleteObligation;
