export const mockSales = [
  { id: "V-001", client: "Empresa Alpha", amount: 1250, status: "Sin Cobrar", date: "2026-04-21" },
  { id: "V-002", client: "Juan Pérez", amount: 300, status: "Sin Cobrar", date: "2026-04-20" },
  { id: "V-003", client: "Estudio Creativo", amount: 4500, status: "Sin Cobrar", date: "2026-04-19" },
  { id: "V-004", client: "María Gómez", amount: 150, status: "Sin Cobrar", date: "2026-04-18" },
  { id: "V-005", client: "Tech Solutions", amount: 2100, status: "Sin Cobrar", date: "2026-04-17" },
];

export const mockIncomeData = [
  { date: "17/04", income: 1800 },
  { date: "18/04", income: 1400 },
  { date: "19/04", income: 0 },
  { date: "20/04", income: 600 },
  { date: "21/04", income: 2500 },
];

export const mockClientData = [
  { type: "Nuevos", count: 35, fill: "#86efac" }, // green-300
  { type: "Recurrentes", count: 65, fill: "#bbf7d0" }, // green-200
];

export const mockUser = {
  name: "Diogo Abregu",
};

export const mockClientsList = [
  { 
    id: "C-001", 
    name: "Manuel Rojas", 
    phone: "999-999-999", 
    description: "Tiene una tienda al costado de nosotros",
    totalSalesValue: 500,
    lastPurchaseDate: "2026-05-12",
    daysSinceLastPurchase: 13,
    hasDebt: true,
    history: [
      { id: "H-1", product: "Diseño A", amount: 150, date: "2026-05-10" },
      { id: "H-2", product: "Diseño B", amount: 350, date: "2026-05-12" }
    ]
  },
  { 
    id: "C-002", 
    name: "Lucía Fernández", 
    phone: "988-888-888", 
    description: "Cliente frecuente, pide posters A3",
    totalSalesValue: 1200,
    lastPurchaseDate: "2026-04-15",
    daysSinceLastPurchase: 6,
    hasDebt: false,
    history: [
      { id: "H-3", product: "Impresión A3 x100", amount: 1200, date: "2026-04-15" }
    ]
  },
  { 
    id: "C-003", 
    name: "Tech Corp SAC", 
    phone: "977-777-777", 
    description: "Empresa de tecnología, facturan mensualmente",
    totalSalesValue: 4500,
    lastPurchaseDate: "2026-04-20",
    daysSinceLastPurchase: 1,
    hasDebt: false,
    history: [
      { id: "H-4", product: "Papelería Corporativa", amount: 4500, date: "2026-04-20" }
    ]
  },
  { 
    id: "C-004", 
    name: "Andrea Soto", 
    phone: "966-666-666", 
    description: "Diseñadora freelance",
    totalSalesValue: 80,
    lastPurchaseDate: "2026-03-10",
    daysSinceLastPurchase: 42,
    hasDebt: true,
    history: [
      { id: "H-5", product: "Tarjetas de Presentación", amount: 80, date: "2026-03-10" }
    ]
  },
  { 
    id: "C-005", 
    name: "Carlos Mendoza", 
    phone: "955-555-555", 
    description: "Restaurante nuevo en la zona",
    totalSalesValue: 320,
    lastPurchaseDate: "2026-05-01",
    daysSinceLastPurchase: 5,
    hasDebt: false,
    history: [
      { id: "H-6", product: "Menús Laminados", amount: 320, date: "2026-05-01" }
    ]
  },
  { 
    id: "C-006", 
    name: "María López", 
    phone: "944-444-444", 
    description: "Agencia de publicidad",
    totalSalesValue: 2800,
    lastPurchaseDate: "2026-04-25",
    daysSinceLastPurchase: 10,
    hasDebt: true,
    history: [
      { id: "H-7", product: "Flyers A5 x500", amount: 800, date: "2026-04-20" },
      { id: "H-8", product: "Catálogos x200", amount: 2000, date: "2026-04-25" }
    ]
  },
  { 
    id: "C-007", 
    name: "Jorge Ramos", 
    phone: "933-333-333", 
    description: "Dueño de librería",
    totalSalesValue: 150,
    lastPurchaseDate: "2026-05-10",
    daysSinceLastPurchase: 2,
    hasDebt: false,
    history: [
      { id: "H-9", product: "Tarjetas de presentación", amount: 150, date: "2026-05-10" }
    ]
  },
  { 
    id: "C-008", 
    name: "Sandra Vega", 
    phone: "922-222-222", 
    description: "Fotógrafa de eventos",
    totalSalesValue: 650,
    lastPurchaseDate: "2026-04-30",
    daysSinceLastPurchase: 8,
    hasDebt: false,
    history: [
      { id: "H-10", product: "Photo Books x50", amount: 650, date: "2026-04-30" }
    ]
  },
  { 
    id: "C-009", 
    name: "Pedro Torres", 
    phone: "911-111-111", 
    description: "Gimnasio Fitness",
    totalSalesValue: 420,
    lastPurchaseDate: "2026-05-08",
    daysSinceLastPurchase: 4,
    hasDebt: false,
    history: [
      { id: "H-11", product: "Afiches Promocionales", amount: 420, date: "2026-05-08" }
    ]
  },
  { 
    id: "C-010", 
    name: "Ana Castillo", 
    phone: "900-000-000", 
    description: "Escuela de idiomas",
    totalSalesValue: 900,
    lastPurchaseDate: "2026-04-18",
    daysSinceLastPurchase: 15,
    hasDebt: true,
    history: [
      { id: "H-12", product: "Material Didáctico", amount: 900, date: "2026-04-18" }
    ]
  },
];

export const mockSalesList = [
  { 
    id: "V-001", 
    design: "Diseño A - Logo Corporativo", 
    client: "Manuel Rojas",
    amount: 150, 
    status: "Completado", 
    date: "2026-04-15" 
  },
  { 
    id: "V-002", 
    design: "Banner Navideño A4", 
    client: "Lucía Fernández",
    amount: 350, 
    status: "Sin Cobrar", 
    date: "2026-04-18" 
  },
  { 
    id: "V-003", 
    design: "Volantes Promo Verano x500", 
    client: "Tech Corp SAC",
    amount: 1200, 
    status: "En Producción", 
    date: "2026-04-20" 
  },
  { 
    id: "V-004", 
    design: "Tarjetas de Presentación VIP", 
    client: "Andrea Soto",
    amount: 80, 
    status: "Cancelado", 
    date: "2026-04-21" 
  },
  { 
    id: "V-005", 
    design: "Afiches 60x40cm x50", 
    client: "Estudio Creativo",
    amount: 2100, 
    status: "Sin Cobrar", 
    date: "2026-04-22" 
  },
  { 
    id: "V-006", 
    design: "Catálogos Corporativos x200", 
    client: "Carlos Mendoza",
    amount: 4500, 
    status: "Completado", 
    date: "2026-04-23" 
  },
  { 
    id: "V-007", 
    design: "Rollups Promocionales x5", 
    client: "María López",
    amount: 600, 
    status: "En Producción", 
    date: "2026-04-24" 
  },
  { 
    id: "V-008", 
    design: "Tarjetas de Visita x1000", 
    client: "Jorge Ramos",
    amount: 250, 
    status: "Sin Cobrar", 
    date: "2026-04-25" 
  },
  { 
    id: "V-009", 
    design: "Photo Books x20", 
    client: "Sandra Vega",
    amount: 1800, 
    status: "Completado", 
    date: "2026-04-26" 
  },
  { 
    id: "V-010", 
    design: "Afiches Gimnasio A2 x10", 
    client: "Pedro Torres",
    amount: 320, 
    status: "En Producción", 
    date: "2026-04-27" 
  },
  { 
    id: "V-011", 
    design: "Materiales Escuela x500", 
    client: "Ana Castillo",
    amount: 950, 
    status: "Sin Cobrar", 
    date: "2026-04-28" 
  },
];
