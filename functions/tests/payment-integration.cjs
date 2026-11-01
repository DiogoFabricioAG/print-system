const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { getPlatformProxy } = require('wrangler');
const { build } = createRequire(require.resolve('wrangler'))('esbuild');

(async () => {
  const sheets = fs.readFileSync('src/sheets.ts', 'utf8');
  const names = [...sheets.matchAll(/export async function (\w+)/g)].map(x => x[1]);
  await build({ entryPoints: ['src/index.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: '.wrangler/payment-app.cjs', plugins: [{
    name:'no-external-sheets',setup(build){
      build.onResolve({filter:/\/sheets(?:\.js)?$/},args=>({path:args.path,namespace:'mock-sheets'}));
      build.onLoad({filter:/.*/,namespace:'mock-sheets'},()=>({contents:names.map(name=>`export async function ${name}(){}`).join('\n'),loader:'js'}));
    }
  }] });
  fs.writeFileSync('.wrangler/payment-local.jsonc',JSON.stringify({name:'payment-local-test',main:path.resolve('src/index.ts'),compatibility_date:'2026-04-21',d1_databases:[{binding:'DB',database_name:'payment-local-test',database_id:'local-payment-test'}]}));
  const proxy=await getPlatformProxy({configPath:'.wrangler/payment-local.jsonc',persist:false});
  try {
    const app=require(path.resolve('.wrangler/payment-app.cjs')).default;
    const env={...proxy.env,API_KEY:'local-fixture-key',GOOGLE_PRIVATE_KEY:'',GOOGLE_CLIENT_EMAIL:'',GOOGLE_SPREADSHEET_ID:''};
    const request=async(method,route,payload,status=200)=>{
      const res=await app.request('http://localhost/api'+route,{method,headers:{'Content-Type':'application/json','X-API-Key':'local-fixture-key'},body:payload?JSON.stringify(payload):undefined},env);
      const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));return data.data;
    };
    const client=await request('POST','/clientes',{nombre:'Fixture principal'},201);
    const other=await request('POST','/clientes',{nombre:'Fixture otro'},201);
    const salePayload={cliente_id:client.id,diseno:'Trabajo local',pago:100.1,estado:'Crédito',fecha:'2026-10-01'};
    const sale=await request('POST','/ventas',salePayload,201);
    const advance=await request('POST','/pagos',{cliente_id:client.id,venta_id:sale.id,pago:35.35,nota:'Anticipo'},201);
    assert.equal(advance.venta_id,sale.id);
    await request('PUT','/ventas/'+sale.id,{...salePayload,estado:'Pagó'});
    let payments=await request('GET','/pagos');
    assert.equal(payments.length,2);assert.equal(payments[0].pago,64.75);assert.equal(payments[0].fecha,'2026-10-01');
    await request('PUT','/ventas/'+sale.id,{...salePayload,estado:'Pagó'});
    await request('PUT','/ventas/'+sale.id,{...salePayload,estado:'Debe'});
    await request('PUT','/ventas/'+sale.id,{...salePayload,estado:'Pagó'});
    assert.equal((await request('GET','/pagos')).length,2);
    const detail=await request('GET','/clientes/'+client.id+'/detalle');
    assert.equal(detail.metricas.total_pagos,100.1);assert.equal(detail.metricas.debe,false);
    assert.equal(detail.historial.find(row=>row.tipo==='venta').pendiente,0);
    await request('POST','/pagos',{cliente_id:other.id,venta_id:sale.id,pago:10},400);
    await request('PUT','/pagos/'+advance.id,{cliente_id:other.id,pago:10},400);
    const legacySale=await request('POST','/ventas',{...salePayload,diseno:'Listener',estado:'Debe'},201);
    const legacy=await request('POST','/pagos',{cliente_id:client.id,pago:100.1,nota:`Pago total venta #${legacySale.id}`},201);
    assert.equal(legacy.venta_id,legacySale.id);
    await request('PUT','/pagos/'+legacy.id,{cliente_id:client.id,pago:100.1,nota:'Nota editada'});
    assert.equal((await request('GET','/pagos')).find(p=>p.id===legacy.id).venta_id,legacySale.id);
    console.log('D1 local + API: credito/liquidacion, idempotencia, saldos, fechas, compatibilidad listener y cliente incorrecto OK.');
  } finally {await proxy.dispose();}
})().catch(error=>{console.error(error);process.exitCode=1;});
