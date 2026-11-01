const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { getPlatformProxy } = require('wrangler');
const { build } = createRequire(require.resolve('wrangler'))('esbuild');

(async () => {
  await build({ entryPoints: ['src/index.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: '.wrangler/metrics-app.cjs' });
  await build({ entryPoints: ['src/metrics.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: '.wrangler/metrics-domain.cjs' });
  const domain = require(path.resolve('.wrangler/metrics-domain.cjs'));
  assert.equal(domain.limaToday(new Date('2026-11-01T03:00:00Z')), '2026-10-31');
  assert.equal(domain.limaToday(new Date('2026-11-01T05:00:00Z')), '2026-11-01');
  assert.equal(domain.validDate('2026-02-30'), false);
  assert.equal(domain.validDate('2028-02-29'), true);
  assert.equal(domain.periodRange('2028-01-01','2028-12-31').dias,366);
  assert.throws(()=>domain.periodRange('2026-01-01','2027-01-02'));
  fs.writeFileSync('.wrangler/metrics-local.jsonc',JSON.stringify({name:'metrics-local-test',main:path.resolve('src/index.ts'),compatibility_date:'2026-04-21',d1_databases:[{binding:'DB',database_name:'metrics-local-test',database_id:'local-metrics-test'}]}));
  const proxy=await getPlatformProxy({configPath:'.wrangler/metrics-local.jsonc',persist:false});
  try {
    const app=require(path.resolve('.wrangler/metrics-app.cjs')).default;
    const env={...proxy.env,API_KEY:'local-fixture-key'};
    const get=async(query='',status=200)=>{
      const res=await app.request('http://localhost/api/metricas'+query,{headers:{'X-API-Key':'local-fixture-key'}},env);
      const body=await res.json();assert.equal(res.status,status,JSON.stringify(body));return body;
    };
    await get('?desde=2026-10-30&hasta=2026-10-31'); // Create only the local schema.
    const db=env.DB;
    await db.batch([
      db.prepare("INSERT INTO clientes (id,nombre) VALUES (1,'Cliente fixture')"),
      db.prepare(`INSERT INTO ventas (id, "diseño", cliente_id, pago, estado, fecha, creado_el) VALUES
        (1,'A',1,1000,'Debe','2026-10-30','2026-10-30 15:00:00'),
        (2,'B',1,200,'Pagó','2026-10-31','2026-10-31 15:00:00'),
        (3,'C',1,100,'Debe',NULL,'2026-11-01 02:30:00'),
        (4,'D',1,300,'Debe',NULL,'2026-11-01 05:00:00'),
        (5,'E',1,100,'Debe','2026-10-29','2026-10-29 15:00:00')`),
      db.prepare("INSERT INTO pagos (cliente_id,pago,fecha) VALUES (1,400,'2026-10-31'),(1,600,'2026-10-28')"),
      db.prepare(`INSERT INTO compras (tipo,categoria,monto,creado_el) VALUES
        ('GASTO','Servicios',60,'2026-10-30 15:00:00'),
        ('GASTO','Servicios',40,'2026-11-01 02:00:00'),
        ('INSUMO','Tinta',300,'2026-10-31 16:00:00'),
        ('GASTO','Alquiler',999,'2026-11-01 05:00:00'),
        ('GASTO','Otros',20,'2026-10-29 18:00:00')`),
    ]);
    // Explicit dates are commercial dates. Remove auto-filled dates only for
    // these local fixtures to exercise the legacy UTC fallback independently.
    await db.prepare('UPDATE ventas SET fecha=NULL WHERE id IN (3,4)').run();
    const report=(await get('?desde=2026-10-30&hasta=2026-10-31')).data;
    assert.deepEqual(report.resumen,{ventas:1300,costo_estimado:650,gastos:100,utilidad:550,cobros:400,insumos:300,flujo_caja:0,cantidad:3,ticket_promedio:433.33,margen:42.31});
    assert.equal(report.anterior.utilidad,30);
    assert.equal(report.anterior.cobros,600);
    assert.equal(report.periodo.anterior_inicio,'2026-10-28');
    assert.equal(report.periodo.anterior_fin,'2026-10-29');
    assert.deepEqual(report.gastos_categorias,[{categoria:'Servicios',monto:100}]);
    assert.equal(report.clientes[0].ventas,1300);
    for(const grouping of ['dia','semana','mes']) {
      const grouped=(await get('?desde=2026-10-30&hasta=2026-10-31&agrupacion='+grouping)).data;
      for(const key of ['ventas','gastos','costo_estimado','utilidad','cobros','insumos','flujo_caja','cantidad'])
        assert.equal(grouped.serie.reduce((sum,row)=>sum+row[key],0),grouped.resumen[key]);
    }
    const loss=(await get('?desde=2026-11-01&hasta=2026-11-01')).data;
    assert.equal(loss.resumen.utilidad,-849);
    const empty=(await get('?desde=2026-12-01&hasta=2026-12-01')).data;
    assert.equal(empty.resumen.utilidad,0);assert.equal(empty.resumen.margen,null);assert.equal(empty.serie.length,1);
    for(const query of ['?desde=2026-02-30','?desde=2026-10-31&hasta=2026-10-30','?desde=2025-01-01&hasta=2026-12-31','?agrupacion=bad']) await get(query,400);
    await db.prepare("UPDATE variables_negocio SET valor='desconocido' WHERE clave='costo_venta_porcentaje'").run();
    await get('?desde=2026-10-30&hasta=2026-10-31',500);
    const counts=await db.prepare('SELECT (SELECT COUNT(*) FROM ventas) AS ventas,(SELECT COUNT(*) FROM pagos) AS pagos,(SELECT COUNT(*) FROM compras) AS compras').first();
    assert.deepEqual(counts,{ventas:5,pagos:2,compras:5});
    console.log('Metricas D1 local: utilidad/caja distintas, Lima, fechas inclusivas, comparacion, agrupacion consistente, perdidas, vacios, validacion y solo lectura OK.');
  } finally {await proxy.dispose();}
})().catch(error=>{console.error(error);process.exitCode=1;});
