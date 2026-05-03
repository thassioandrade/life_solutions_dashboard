const m = require('mysql2/promise');
m.createConnection(process.env.DATABASE_URL).then(async c => {
  const [parc] = await c.query(
    'SELECT p.id, p.valor, p.dataPagamento, p.numeroParcela, v.clienteNome, v.dataVenda FROM parcelas p LEFT JOIN vendas v ON p.vendaId = v.id WHERE p.status = ? AND p.dataPagamento >= ? AND p.dataPagamento <= ?',
    ['pago','2026-04-01','2026-04-30']
  );
  console.log('Total parcelas pagas em abril:', parc.length);
  let cp = 0;
  for(const x of parc) {
    const dv = x.dataVenda ? new Date(x.dataVenda) : null;
    const dp = new Date(x.dataPagamento);
    if (!dv) {
      console.log('SEM VENDA: parcela id=' + x.id + ' valor=' + x.valor);
      continue;
    }
    const mesmomes = dv.getMonth() === dp.getMonth() && dv.getFullYear() === dp.getFullYear();
    if (!mesmomes) {
      cp += parseFloat(x.valor || 0);
      console.log('  PARCELA MES ANT: ' + x.clienteNome + ' R$' + x.valor + ' venda:' + dv.toLocaleDateString('pt-BR') + ' pago:' + dp.toLocaleDateString('pt-BR'));
    } else {
      console.log('  MESMO MES (excluido): ' + x.clienteNome + ' R$' + x.valor + ' venda:' + dv.toLocaleDateString('pt-BR') + ' pago:' + dp.toLocaleDateString('pt-BR'));
    }
  }
  console.log('COLETADO PARCELAS ABRIL:', cp.toFixed(2));
  await c.end();
}).catch(console.error);
