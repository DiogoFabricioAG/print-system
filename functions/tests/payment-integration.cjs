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
      const body=await res.text();assert.equal(res.status,status,body);
      if (status === 500) return body;
      const data=JSON.parse(body);return status === 409 ? data.details : data.data;
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
    const generalClient=await request('POST','/clientes',{nombre:'Pago registrado primero'},201);
    const generalPayload={...salePayload,cliente_id:generalClient.id,estado:'Debe'};
    const generalSale=await request('POST','/ventas',generalPayload,201);
    const generalPayment=await request('POST','/pagos',{cliente_id:generalClient.id,pago:100.1,nota:'Yape'},201);
    assert.equal(generalPayment.venta_id,null);
    const review=await request('PUT','/ventas/'+generalSale.id,{...generalPayload,estado:'Pagó'},409);
    assert.equal(review.code,'SALE_PAYMENT_REVIEW');
    assert.equal(review.pending_amount,100.1);
    assert.equal(review.payments[0].id,generalPayment.id);
    assert.equal((await request('GET','/ventas/'+generalSale.id)).estado,'Debe');
    assert.equal((await request('GET','/pagos')).filter(p=>p.cliente_id===generalClient.id).length,1);
    const resolve=(sale,payload,review,ids,amount,status=200)=>request('PUT','/ventas/'+sale.id,{
      ...payload,estado:'Pagó',payment_resolution:{version:review.version,existing_payment_ids:ids,new_payment_amount:amount}
    },status);
    await resolve(generalSale,generalPayload,review,[generalPayment.id],0);
    assert.equal((await request('GET','/pagos')).filter(p=>p.cliente_id===generalClient.id).length,1);
    const reconciled=await request('GET','/clientes/'+generalClient.id+'/detalle');
    assert.equal(reconciled.historial.find(row=>row.tipo==='pago').venta_id,generalSale.id);
    assert.equal(reconciled.historial.find(row=>row.tipo==='venta').pendiente,0);
    const preserved=(await request('GET','/pagos')).find(p=>p.id===generalPayment.id);
    assert.equal(preserved.nota,'Yape');
    assert.equal(preserved.fecha,generalPayment.fecha);
    await resolve(generalSale,generalPayload,review,[generalPayment.id],0,409);
    assert.equal((await request('GET','/pagos')).filter(p=>p.cliente_id===generalClient.id).length,1);

    const newPayload={...generalPayload,diseno:'Otro trabajo'};
    const newSale=await request('POST','/ventas',newPayload,201);
    const unrelated=await request('POST','/pagos',{cliente_id:generalClient.id,pago:20,nota:'Otro cobro'},201);
    const newReview=await request('PUT','/ventas/'+newSale.id,{...newPayload,estado:'Pagó'},409);
    await resolve(newSale,newPayload,newReview,[],100.1);
    let generalPayments=(await request('GET','/pagos')).filter(p=>p.cliente_id===generalClient.id);
    assert.equal(generalPayments.filter(p=>p.venta_id===newSale.id).length,1);
    assert.equal(generalPayments.find(p=>p.id===unrelated.id).venta_id,null);
    await request('PUT','/ventas/'+newSale.id,{...newPayload,estado:'Debe'});
    await request('PUT','/ventas/'+newSale.id,{...newPayload,estado:'Pagó'});
    assert.equal((await request('GET','/pagos')).filter(p=>p.cliente_id===generalClient.id).length,3);

    const partialSale=await request('POST','/ventas',newPayload,201);
    const partial=await request('POST','/pagos',{cliente_id:generalClient.id,pago:30,nota:'Abono parcial',fecha:'2026-09-20'},201);
    const second=await request('POST','/pagos',{cliente_id:generalClient.id,pago:15,nota:'Segundo abono'},201);
    await request('POST','/pagos',{cliente_id:generalClient.id,venta_id:partialSale.id,pago:10},201);
    const partialReview=await request('PUT','/ventas/'+partialSale.id,{...newPayload,estado:'Pagó'},409);
    assert.equal(partialReview.pending_amount,90.1);
    await resolve(partialSale,newPayload,partialReview,[partial.id,second.id],0,409); // no hidden extra cash
    await resolve(partialSale,newPayload,partialReview,[partial.id,partial.id],30.1,409);
    await resolve(partialSale,newPayload,partialReview,[generalPayment.id],0,409); // already claimed
    await resolve(partialSale,{...newPayload,cliente_id:other.id},partialReview,[partial.id],60.1,409);
    await resolve(partialSale,newPayload,partialReview,[partial.id,second.id],45.1);
    const partialPayments=(await request('GET','/pagos')).filter(p=>p.venta_id===partialSale.id);
    assert.equal(partialPayments.length,4);
    assert.equal(Math.round(partialPayments.reduce((sum,p)=>sum+p.pago,0)*100),10010);
    assert.equal(partialPayments.find(p=>p.id===partial.id).fecha,'2026-09-20');

    const staleSale=await request('POST','/ventas',newPayload,201);
    const staleReview=await request('PUT','/ventas/'+staleSale.id,{...newPayload,estado:'Pagó'},409);
    await request('PUT','/pagos/'+unrelated.id,{cliente_id:generalClient.id,pago:21});
    await resolve(staleSale,newPayload,staleReview,[unrelated.id],80.1,409);
    assert.equal((await request('GET','/ventas/'+staleSale.id)).estado,'Debe');

    // Simulate a race AFTER the route reads its snapshot but BEFORE its atomic batch.
    const raceReview=await request('PUT','/ventas/'+staleSale.id,{...newPayload,estado:'Pagó'},409);
    const racedDb={prepare:proxy.env.DB.prepare.bind(proxy.env.DB),batch:async statements=>{
      await proxy.env.DB.prepare('UPDATE pagos SET pago=22 WHERE id=?').bind(unrelated.id).run();
      return proxy.env.DB.batch(statements);
    }};
    const racedResponse=await app.request('http://localhost/api/ventas/'+staleSale.id,{
      method:'PUT',headers:{'Content-Type':'application/json','X-API-Key':'local-fixture-key'},
      body:JSON.stringify({...newPayload,estado:'Pagó',payment_resolution:{version:raceReview.version,existing_payment_ids:[unrelated.id],new_payment_amount:79.1}})
    },{...env,DB:racedDb});
    assert.equal(racedResponse.status,409,JSON.stringify(await racedResponse.json()));
    assert.equal((await request('GET','/pagos')).find(p=>p.id===unrelated.id).venta_id,null);
    assert.equal((await request('GET','/pagos')).filter(p=>p.venta_id===staleSale.id).length,0);
    assert.equal((await request('GET','/ventas/'+staleSale.id)).estado,'Debe');

    // Linking the old payment and inserting the difference must both roll back on a failed sale update.
    const rollbackReview=await request('PUT','/ventas/'+staleSale.id,{...newPayload,estado:'Pagó'},409);
    await proxy.env.DB.prepare(`CREATE TRIGGER fixture_failed_update BEFORE UPDATE ON ventas WHEN NEW.id=${staleSale.id} BEGIN SELECT RAISE(ABORT,'FIXTURE_UPDATE_FAILURE'); END`).run();
    const originalConsoleError=console.error;
    try {
      console.error=()=>{}; // expected fixture failure; assert the rollback below
      await resolve(staleSale,newPayload,rollbackReview,[unrelated.id],78.1,500);
    } finally {console.error=originalConsoleError;}
    assert.equal((await request('GET','/pagos')).find(p=>p.id===unrelated.id).venta_id,null);
    assert.equal((await request('GET','/pagos')).filter(p=>p.venta_id===staleSale.id).length,0);
    await proxy.env.DB.prepare('DROP TRIGGER fixture_failed_update').run();
    const competingSale=await request('POST','/ventas',newPayload,201);
    const competingReviews=await Promise.all([staleSale,competingSale].map(sale=>request('PUT','/ventas/'+sale.id,{...newPayload,estado:'Pagó'},409)));
    const competingResults=await Promise.all([staleSale,competingSale].map((sale,index)=>app.request('http://localhost/api/ventas/'+sale.id,{
      method:'PUT',headers:{'Content-Type':'application/json','X-API-Key':'local-fixture-key'},
      body:JSON.stringify({...newPayload,estado:'Pagó',payment_resolution:{version:competingReviews[index].version,existing_payment_ids:[unrelated.id],new_payment_amount:78.1}})
    },env)));
    assert.deepEqual(competingResults.map(r=>r.status).sort(),[200,409]);
    const competingPayments=(await request('GET','/pagos')).filter(p=>[staleSale.id,competingSale.id].includes(p.venta_id));
    assert.equal(competingPayments.length,2);
    assert.equal(Math.round(competingPayments.reduce((sum,p)=>sum+p.pago,0)*100),10010);
    assert.equal(new Set(competingPayments.map(p=>p.venta_id)).size,1);

    console.log('D1 local + API: revision integrada, pagos existentes, cobro nuevo, diferencias, reintentos, concurrencia, datos obsoletos y rollback atomico OK.');
  } finally {await proxy.dispose();}
})().catch(error=>{console.error(error);process.exitCode=1;});
