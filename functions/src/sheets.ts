import { JWT } from "google-auth-library";

interface Env {
	GOOGLE_CLIENT_EMAIL: string;
	GOOGLE_PRIVATE_KEY: string;
	GOOGLE_SPREADSHEET_ID: string;
}

async function getAccessToken(env: Env) {
	let rawKey = env.GOOGLE_PRIVATE_KEY
		.replace(/-----BEGIN PRIVATE KEY-----/g, "")
		.replace(/-----END PRIVATE KEY-----/g, "")
		.replace(/\\n/g, "")
		.replace(/\n/g, "")
		.replace(/\r/g, "")
		.replace(/\s/g, "");

	const chunks = [];
	for (let i = 0; i < rawKey.length; i += 64) {
		chunks.push(rawKey.substring(i, i + 64));
	}
	const privateKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join("\n")}\n-----END PRIVATE KEY-----\n`;

	const client = new JWT({
		email: env.GOOGLE_CLIENT_EMAIL,
		key: privateKey,
		scopes: ["https://www.googleapis.com/auth/spreadsheets"],
	});

	const token = await client.getAccessToken();
	return token.token;
}

async function getSheets(env: Env, token: string) {
	const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	const data: any = await res.json();
	return data.sheets.map((s: any) => s.properties);
}

async function addSheet(env: Env, token: string, title: string) {
	await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}:batchUpdate`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify({
			requests: [{ addSheet: { properties: { title } } }]
		})
	});
}

async function appendRow(env: Env, token: string, sheetName: string, values: any[]) {
	await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify({ values: [values] })
	});
}

async function updateRow(env: Env, token: string, sheetName: string, rowIndex: number, values: any[]) {
	await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A${rowIndex}?valueInputOption=USER_ENTERED`, {
		method: "PUT",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify({ values: [values] })
	});
}

async function deleteRow(env: Env, token: string, sheetId: number, rowIndex: number) {
	await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}:batchUpdate`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify({
			requests: [{
				deleteDimension: {
					range: { sheetId, dimension: "ROWS", startIndex: rowIndex - 1, endIndex: rowIndex }
				}
			}]
		})
	});
}

export async function syncCompraToSheets(
	compra: {
		id: number;
		tipo: string;
		categoria: string;
		monto: number;
		notas?: string;
		creado_el: string;
	},
	isUpdate: boolean = false,
	env?: Env
) {
	if (!env) return;
	const token = await getAccessToken(env);
	if (!token) return;

	const sheets = await getSheets(env, token);
	const sheetName = compra.tipo === "INSUMO" ? "INSUMOS" : "GASTOS";

	if (!sheets.find((s: any) => s.title === sheetName)) {
		await addSheet(env, token, sheetName);
		await appendRow(env, token, sheetName, ["ID", "CATEGORIA", "MONTO", "NOTAS", "CREADO_EL"]);
	}

	const compraData = [
		compra.id.toString(),
		compra.categoria,
		compra.monto.toString(),
		compra.notas || "",
		compra.creado_el,
	];

	if (isUpdate) {
		const rows = await getRows(env, token, sheetName);
		const index = rows.findIndex((r: any) => r[0] === compra.id.toString());
		if (index > 0) {
			await updateRow(env, token, sheetName, index + 1, compraData);
		} else if (index === -1) {
			await appendRow(env, token, sheetName, compraData);
		}
	} else {
		await appendRow(env, token, sheetName, compraData);
	}
}

export async function deleteCompraFromSheets(compraId: number, tipo: string, env: Env) {
	const token = await getAccessToken(env);
	if (!token) return;

	const sheets = await getSheets(env, token);
	const sheetName = tipo === "INSUMO" ? "INSUMOS" : "GASTOS";

	const sheet = sheets.find((s: any) => s.title === sheetName);
	if (sheet) {
		const rows = await getRows(env, token, sheetName);
		const index = rows.findIndex((r: any) => r[0] === compraId.toString());
		if (index > 0) {
			await deleteRow(env, token, sheet.sheetId, index + 1);
		}
	}
}

async function getRows(env: Env, token: string, sheetName: string) {
	const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A:Z`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	const data: any = await res.json();
	return data.values || [];
}

export async function createClientSheet(clientName: string, env: Env) {
	const token = await getAccessToken(env);
	if (!token) throw new Error("No token");

	const sheets = await getSheets(env, token);
	const sheetName = clientName.toUpperCase().replace(/[^A-Z0-9]/g, "_");

	if (!sheets.find((s: any) => s.title === sheetName)) {
		await addSheet(env, token, sheetName);
		await appendRow(env, token, sheetName, [
			"ID", "DISEÑO", "CANTIDAD", "METRO_TOTAL", "MAQUINA", "PAGO", "ESTADO", "NOTA", "CREADO_EL"
		]);
	}
}

export async function syncSaleToSheets(
	clienteNombre: string,
	venta: {
		id: number;
		diseno: string;
		cantidad?: string;
		metro_total?: number;
		maquina?: string;
		pago: number;
		estado?: string;
		nota?: string;
		creado_el: string;
	},
	isUpdate: boolean = false,
	env?: Env
) {
	if (!env) return;
	const token = await getAccessToken(env);
	if (!token) return;

	const sheets = await getSheets(env, token);
	const clientSheetName = clienteNombre.toUpperCase().replace(/[^A-Z0-9]/g, "_");

	if (!sheets.find((s: any) => s.title === "DATOS")) {
		await addSheet(env, token, "DATOS");
		await appendRow(env, token, "DATOS", [
			"ID", "CLIENTE", "DISEÑO", "CANTIDAD", "METRO_TOTAL", "MAQUINA", "PAGO", "ESTADO", "NOTA", "CREADO_EL"
		]);
	}

	if (!sheets.find((s: any) => s.title === clientSheetName)) {
		await addSheet(env, token, clientSheetName);
		await appendRow(env, token, clientSheetName, [
			"ID", "DISEÑO", "CANTIDAD", "METRO_TOTAL", "MAQUINA", "PAGO", "ESTADO", "NOTA", "CREADO_EL"
		]);
	}

	const ventaData = [
		venta.id.toString(),
		venta.diseno,
		venta.cantidad || "",
		venta.metro_total?.toString() || "",
		venta.maquina || "",
		venta.pago.toString(),
		venta.estado || "",
		venta.nota || "",
		venta.creado_el
	];

	if (isUpdate) {
		const clientRows = await getRows(env, token, clientSheetName);
		const cIndex = clientRows.findIndex((r: any) => r[0] === venta.id.toString());
		if (cIndex > 0) {
			await updateRow(env, token, clientSheetName, cIndex + 1, ventaData);
		} else if (cIndex === -1) {
			await appendRow(env, token, clientSheetName, ventaData);
		}

		const datosRows = await getRows(env, token, "DATOS");
		const dIndex = datosRows.findIndex((r: any) => r[0] === venta.id.toString());
		const datosData = [venta.id.toString(), clienteNombre, ...ventaData.slice(1)];
		if (dIndex > 0) {
			await updateRow(env, token, "DATOS", dIndex + 1, datosData);
		} else if (dIndex === -1) {
			await appendRow(env, token, "DATOS", datosData);
		}
	} else {
		await appendRow(env, token, clientSheetName, ventaData);
		await appendRow(env, token, "DATOS", [venta.id.toString(), clienteNombre, ...ventaData.slice(1)]);
	}
}

export async function deleteSaleFromSheets(clienteNombre: string, ventaId: number, env: Env) {
	const token = await getAccessToken(env);
	if (!token) return;

	const sheets = await getSheets(env, token);
	const clientSheetName = clienteNombre.toUpperCase().replace(/[^A-Z0-9]/g, "_");

	const clientSheet = sheets.find((s: any) => s.title === clientSheetName);
	if (clientSheet) {
		const rows = await getRows(env, token, clientSheetName);
		const index = rows.findIndex((r: any) => r[0] === ventaId.toString());
		if (index > 0) {
			await deleteRow(env, token, clientSheet.sheetId, index + 1);
		}
	}

	const datosSheet = sheets.find((s: any) => s.title === "DATOS");
	if (datosSheet) {
		const rows = await getRows(env, token, "DATOS");
		const index = rows.findIndex((r: any) => r[0] === ventaId.toString());
		if (index > 0) {
			await deleteRow(env, token, datosSheet.sheetId, index + 1);
		}
	}
}