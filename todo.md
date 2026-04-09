# Life Solutions Dashboard - TODO

## Identidade Visual Life Solutions
- [x] Configurar tema claro com cores da marca Life Solutions (verde/azul-verde)
- [x] Criar logo Life Solutions (LS no sidebar)
- [x] Atualizar variáveis CSS com paleta de cores Life (OKLCH verde)
- [x] Configurar fontes e tipografia (Inter via Google Fonts)

## Banco de Dados (Schema)
- [x] Tabela users (estendida com avatarUrl, cargo, telefone)
- [x] Tabela consultores (closers/consultores com senha hash)
- [x] Tabela vendas (registros de vendas com comissão)
- [x] Tabela parcelas (parcelas de vendas com status)
- [x] Tabela agendamentos (reuniões/consultas com resultado)
- [x] Tabela metricas_trafego (métricas de tráfego)
- [x] Tabela despesas (despesas avulsas)
- [x] Tabela colaboradores (salários fixos)
- [x] Tabela leads (pipeline de vendas)
- [x] Tabela colunas_pipeline (colunas do kanban)
- [x] Tabela bloqueios_agenda (bloqueios de horário)
- [x] Tabela configuracoes (configurações do sistema)
- [x] Tabela rankings (histórico de rankings)

## Backend - tRPC Routers
- [x] Router auth (me, logout)
- [x] Router consultores (list, create, update, delete, setPassword, login)
- [x] Router vendas (listByPeriod, listByConsultor, create, update, delete)
- [x] Router parcelas (listByVenda, listPendentes, listByConsultor, create, markPaid)
- [x] Router agendamentos (listByPeriod, listByConsultor, create, update, delete, createPublico)
- [x] Router metricas (listByPeriod, create, update, delete)
- [x] Router despesas (listByPeriod, create, update, delete)
- [x] Router colaboradores (list, create, update, delete)
- [x] Router leads (list, create, update, delete, reorder)
- [x] Router pipeline (getColunas, createColuna, updateColuna, deleteColuna)
- [x] Router configuracoes (get, update)
- [x] Router dashboard (stats com métricas completas)
- [x] Router usuarios (list, updateRole - admin only)
- [x] Router system (notifyOwner)

## Frontend - Autenticação
- [x] Página de login com tabs Consultor/Administrador
- [x] Login de consultor com email/senha
- [x] Login de administrador via Manus OAuth
- [x] Proteção de rotas autenticadas (redirect para /login)
- [x] Redirecionamento pós-login

## Frontend - Layout
- [x] LifeDashboardLayout com sidebar navigation
- [x] Sidebar com logo Life Solutions (LS)
- [x] Navegação: Dashboard Geral, Tráfego, Consultores, Agendamentos, Pipeline, Vendas, Parcelas, Despesas, Configurações
- [x] Header com perfil do usuário e logout
- [x] Layout responsivo mobile (menu hambúrguer)

## Frontend - Dashboard Geral (Admin)
- [x] Cards de métricas principais (Coletado, Faturado, A Receber, Comissões, Lucro)
- [x] Resumo financeiro completo
- [x] Tabela de vendas recentes
- [x] Tabela de parcelas a receber
- [x] Filtros por mês/período
- [x] Ranking de consultores

## Frontend - Tráfego & Front-end
- [x] Métricas de tráfego (Investimento, ROAS, Diagnósticos, Upsell, Downsell)
- [x] Histórico de métricas em tabela
- [x] Formulário para adicionar métrica
- [x] Resumo de desempenho

## Frontend - Consultores
- [x] Lista de consultores com status ativo/inativo
- [x] CRUD completo (criar, editar, excluir)
- [x] Definição de senha de acesso
- [x] Métricas por consultor

## Frontend - Agendamentos
- [x] Lista de agendamentos com filtros por período
- [x] Modal de novo agendamento
- [x] Atualização de status (realizada, cancelada, etc.)
- [x] Página pública de agendamento (/agendar)

## Frontend - Pipeline de Vendas (Kanban)
- [x] Board Kanban com colunas
- [x] Cards de leads com detalhes
- [x] Adicionar/editar/remover leads
- [x] Adicionar/editar/remover colunas

## Frontend - Vendas
- [x] Lista de vendas por período com totais
- [x] Formulário de nova venda (cliente, valor, consultor, parcelas)
- [x] Visualização de parcelas por venda
- [x] Marcar parcela como paga

## Frontend - Parcelas Pendentes
- [x] Lista de parcelas pendentes e atrasadas
- [x] Marcação de pagamento
- [x] Resumo de valores a receber

## Frontend - Despesas
- [x] Lista de despesas com filtros por período
- [x] Formulário de nova despesa
- [x] Colaboradores com salários fixos
- [x] Custo total do mês

## Frontend - Configurações (Admin)
- [x] Gestão de usuários e permissões (admin only)
- [x] Perfil do usuário editável
- [x] Upload de avatar
- [x] Meta mensal de coletado

## Frontend - Painel Consultor
- [x] Visão pessoal do consultor
- [x] Métricas pessoais (agendamentos, vendas, comissões)
- [x] Tabela de vendas pessoais

## Testes
- [x] Testes vitest: auth.logout, auth.me, RBAC, dashboard.stats, consultores, agendamentos, vendas, pipeline (11 testes passando)

## Configuração de Domínio
- [ ] Configurar domínio sistemalifesolutions.manus.space (via painel Settings > Domains após publicar)

## Rebranding com Identidade Visual Oficial
- [x] Upload da logomarca para CDN
- [x] Atualizar CSS com cores oficiais (preto #1a1a1a, azul #0055FF, branco)
- [x] Inserir logo no sidebar (substituir LS)
- [x] Inserir logo na tela de login
- [x] Inserir logo no header do dashboard
- [x] Aplicar cores da marca em todos os componentes e botões

## Configurações Completas (igual Exodus)
- [x] Seção de Consultoras com CRUD completo (adicionar, editar, excluir, ativar/bloquear)
- [x] Upload de foto da consultora via S3
- [x] Definição de senha da consultora com gerador aleatório
- [x] Seção de Usuários do Sistema com toggle de role (Admin/Usuário)
- [x] Meta Mensal de Coletado por mês/ano
- [x] Histórico de Rankings (salvar snapshot com notificação)
- [x] Notificações ao Proprietário (Relatório Mensal + Teste)
- [x] Backend: router metaColetado.buscar e metaColetado.salvar
- [x] Backend: router rankingHistorico.salvarSnapshot

## Integração Agendamento Público → Sistema
- [x] Auto-criar lead no pipeline quando cliente agenda pela página pública
- [x] Agendamento público aparece na lista de agendamentos dos vendedores e admin
- [x] Notificação ao dono quando novo agendamento público é feito
- [x] Criar coluna padrão "Novos Agendamentos" no pipeline se não existir

## Painel Consultor Completo (igual Exodus PainelVendedora)
- [x] Modal de atualização de status do agendamento (Realizado/No-Show/Cancelado/Remarcado)
- [x] Formulário de registro de venda no painel do consultor (coletado, faturado, parcelas)
- [x] Seleção de serviços contratados (Limpa Nome, Rating Bancário, etc.)
- [x] Forma de pagamento (PIX, Boleto, Cartão, Transferência, Dinheiro)
- [x] Sistema de parcelas com datas de vencimento editáveis
- [x] Upload de comprovante de pagamento (S3)
- [x] Meta do mês com barra de progresso
- [x] Ranking entre consultores no painel
- [x] Calendário visual de reuniões (clicável por dia)
- [x] Backend: router de upload de comprovante
- [x] Backend: router de atualização de status do agendamento pelo consultor
- [x] Backend: router de meta mensal do consultor

## Links de Agendamento para Plataformas de Venda
- [x] Suporte a parâmetro ?consultora=ID na URL de agendamento (pré-seleciona a consultora)
- [x] Suporte a parâmetro ?c=SLUG na URL (pré-seleciona por slug do nome)
- [x] Página de agendamento oculta o seletor quando consultora já está na URL

## Bug: Login não funciona
- [x] Corrigir bug de login: loginConsultor agora cria cookie JWT de sessão corretamente

## Bug: Login Administrador OAuth não funciona
- [x] Corrigido: página de login agora detecta sessão ativa e redireciona para /dashboard (admin) ou /painel (consultor). OAuth callback redireciona direto para /dashboard.

## Pipeline e Vendas - Melhorias
- [x] Pipeline: CRUD livre de colunas (criar, renomear, excluir qualquer coluna)
- [x] Pipeline: drag-and-drop para mover lead entre colunas
- [x] Pipeline: coluna fixa "Venda Realizada" sempre presente (badge + protegida)
- [x] Pipeline: venda manual cria lead automaticamente na coluna "Venda Realizada"
- [x] Pipeline: admin vê pipeline de todos os vendedores (filtro por vendedor)
- [x] Backend: router pipeline.moverLead (mover lead para outra coluna)
- [x] Backend: garantir coluna "Venda Realizada" ao criar venda manual

## Sistema de Parcelas com Datas, Comissões e Alertas
- [x] Schema: campo dataVencimento nas parcelas (já existia como vencimento)
- [x] Schema: campos clienteNome, clienteCpfCnpj, clienteTelefone nas vendas e parcelas
- [x] Schema: tabela configuracoes reutilizada para custos (custo_limpa_nome, custo_rating, salario_fixo)
- [x] Backend: router custosServicos (get, set) para admin configurar
- [x] Backend: cálculo de comissão líquida (coletado * % - custos dos serviços)
- [x] Backend: router parcelas com vencendoHoje, devedores, okConsultor
- [x] Backend: router servicosVendidos (listar por mês com dados do cliente)
- [x] Backend: router devedores (parcelas vencidas com dias de atraso)
- [x] Formulário de venda: campo data 1ª parcela (auto-calcula datas seguintes) + datas individuais editáveis
- [x] Formulário de venda: campos nome completo, CPF e telefone do cliente
- [x] Formulário de venda: seleção de serviços (Limpa Nome R$70 / Rating R$110) com custo visível
- [x] Painel Consultor: exibir comissão mensal líquida (coletado - custos serviços)
- [x] Painel Consultor: contador de Limpa Nome e Rating vendidos no mês
- [x] Painel Consultor: checkbox OK de recebimento de parcela pelo consultor
- [x] Painel Consultor: alertas de parcelas vencendo hoje
- [x] Painel Consultor: lista de devedores em vermelho com dias de atraso
- [x] Dashboard Admin: visão de comissões por mês (atual + futuros)
- [x] Dashboard Admin: contador de Limpa Nome e Rating do mês
- [x] Dashboard Admin: lista de devedores em destaque vermelho
- [x] Dashboard Admin: alertas de vencimento de parcelas
- [x] Página Serviços Vendidos: lista de clientes com nome, CPF, telefone, serviço
- [x] Página Serviços Vendidos: exportar para Excel (.xlsx)
- [x] Configurações Admin: custos editáveis (Limpa Nome, Rating, Salário base)
- [x] Configurações Admin: visão financeira completa (coletado, faturado, custos, salário, líquido)

## Promessas de Pagamento (Follow-up de Interessados)
- [x] Schema: tabela promessas_pagamento (clienteNome, clienteTelefone, dataPromessa, valor, observacoes, consultorId, status, agendamentoId)
- [x] Backend: router promessas (list, create, update, delete, listHoje, listByConsultor)
- [x] Página Promessas: quadro com CRUD completo (criar, editar, excluir, marcar como concluído)
- [x] Página Promessas: filtros por status (pendente, concluído, cancelado) e por consultora
- [x] Alerta no Painel Consultor: badge de promessas vencendo hoje com nome e telefone
- [x] Alerta no Dashboard Admin: banner roxo de promessas vencendo hoje com nome, telefone e consultora
- [ ] Integração com agendamento: botão "Registrar Promessa" no modal de agendamento
- [x] Navegação: "Promessas de Pgto" no sidebar para Admin e Consultor

## Botão Vai Fechar e Exportação Excel de Serviços
- [x] Schema: adicionar campo horarioPromessa (varchar HH:MM) na tabela promessas_pagamento
- [x] Backend: atualizar router promessas.create e update para aceitar horarioPromessa
- [x] Backend: hook usePromessaAlarm verifica a cada 30s se há promessa no horário atual
- [x] PainelConsultor: botão "Vai Fechar" no modal de agendamento com campo data+horário
- [x] PainelConsultor: ao clicar em Vai Fechar, cria promessa automaticamente e fecha modal
- [x] Alarme em tempo real: overlay pulsante com nome, telefone e valor + som ao disparar
- [x] Painel Consultor: botão exportar Excel de Limpa Nome (nome, CPF, telefone)
- [x] Painel Consultor: botão exportar Excel de Rating Bancário (nome, CPF, telefone)
- [x] Dashboard Admin: botão exportar Excel de Limpa Nome (nome, CPF, telefone, consultora)
- [x] Dashboard Admin: botão exportar Excel de Rating Bancário (nome, CPF, telefone, consultora)

## Correções e Novas Funcionalidades (Mar 2026)
- [x] Pipeline: corrigir drag-and-drop para todas as colunas (useDroppable em cada coluna)
- [x] Parcelas: botão "Recebi" da consultora move parcela para status "pago" (visível no Admin)
- [x] Dados de teste: limpar todos os registros de teste do banco
- [x] Painel Consultor: seção de comissões futuras mês a mês (cards por mês com comissão projetada)
- [x] Barra lateral: bloco de anotações persistente (auto-save 1.5s, salvar manual, apagar)
- [x] Barra lateral: calendário pessoal com eventos, alarmes sonoros e notificações do sistema

## Bug: Anotações travando digitação
- [x] Corrigido: textarea agora é uncontrolled (ref), sem re-render a cada tecla; auto-save dispara 2s após parar de digitar

## Bug: Botão Vai Fechar e Pipeline
- [x] Corrigido: fechar modal de agendamento antes de abrir modal de promessa (evita conflito Radix)
- [x] Ao registrar promessa, redirecionar automaticamente para /promessas
- [x] Coluna fixa "Vai Fechar" criada no Pipeline (exibe promessas pendentes com data, telefone e valor)
- [x] Admin vê o Pipeline com a coluna Vai Fechar e todas as promessas (mesmo router)

## Comissão Líquida, Despesas e Ranking (Mar 2026)
- [x] Corrigido cálculo comissão líquida: coletado - custos dos serviços da venda
- [x] Painel Consultor: comissão líquida correta exibida nos cards
- [x] Dashboard Admin: comissão líquida correta por consultora
- [x] Despesas Admin: resumo financeiro completo com gráficos recharts
- [x] Despesas Admin: aba de custos avulsos (tráfego, consultas, investimentos) com CRUD
- [x] Despesas Admin: gráficos de desempenho financeiro e por consultora (barras + pizza)
- [x] Ranking: página visível para Admin e Consultoras (/ranking)
- [x] Ranking: campos — valor faturado, reuniões feitas, vendas fechadas, % fechamento, coletado
- [x] Ranking: calcula em tempo real do banco (zera automaticamente na virada do mês)
- [x] Ranking: confetes + pódio animado + banner de celebração no último dia do mês

## Correção Cálculo Comissão e Ocultação de Custos (Mar 2026)
- [x] Backend: comissão = (coletado - custoServico) × 10%; custoServico salvo por venda
- [x] Backend: salvar numeroParcela em cada parcela ao criar (1, 2, 3...)
- [x] Backend: getParcelasFuturasConsultor e getParcelasCompletasByConsultor retornam numeroParcela e custoServico
- [x] PainelConsultor: ocultar valores R$70/R$110 de custos — mostrar apenas comissão líquida final
- [x] PainelConsultor: projeção mês a mês com cálculo correto (1ª parcela desconta custo, demais não)
- [x] PainelConsultor: card de Comissão mostra (coletado - custos) × 10%
- [x] PainelConsultor: lista de vendas mostra comissão correta por venda
- [x] PainelConsultor: modal de venda mostra base de cálculo sem revelar custo unitário

## Correção Definitiva Cálculo Comissão (Mar 2026 - v2)
- [x] PainelConsultor: projeção parcelas futuras — 10% direto, SEM descontar custo
- [x] PainelConsultor: comissaoTotal do mês — (coletado - custoServico) × 10% (correto)
- [x] Admin Dashboard (routers.ts): comissão = (coletado - custoServico) × 10%
- [x] Admin Dashboard (db.ts getDashboardFinanceiro): comissão = (coletado - custoServico) × 10%
- [x] Admin Vendas.tsx: comissão total e por venda = (coletado - custoServico) × 10%
- [x] Admin Dashboard.tsx: comissão por venda na tabela = (coletado - custoServico) × 10%
- [x] Admin Despesas.tsx: usa totalComissoes do backend (já corrigido)
- [x] Auditoria completa: nenhum outro cálculo de comissão incorreto encontrado

## Botão Vai Fechar nos Agendamentos e Pipeline (Mar 2026)
- [x] Schema: campo vaiFechar na tabela agendamentos (migração aplicada)
- [x] Backend: getAgendamentoById adicionado ao db.ts
- [x] Backend: router agendamentos.update aceita campo vaiFechar
- [x] Backend: ao marcar vaiFechar=true, move lead para coluna "Vai Fechar" no pipeline
- [x] Backend: ao marcar resultouVenda=true, move lead para coluna "Venda Realizada" no pipeline
- [x] Frontend Agendamentos: checkbox "Vai Fechar" no modal de edição (mutuamente exclusivo com Resultou em Venda)
- [x] Frontend Agendamentos: badge visual "🤝 Vai fechar" no card do agendamento
- [x] Pipeline: lead sai automaticamente de "Novos Agendamentos" ao marcar Vai Fechar ou Venda Realizada

## Promessa de Pagamento = Venda Completa (Mar 2026)
- [x] Schema: adicionar campos valorColetado, valorFaturado, servicos, formaPagamento, comprovanteUrl, parcelasQtd, vendaId à tabela promessas (migração aplicada)
- [x] Backend: getPromessaById adicionado ao db.ts
- [x] Backend: updatePromessa aceita novos campos de pagamento
- [x] Backend: ao marcar promessa como paga, criar venda automaticamente com todos os campos
- [x] Backend: ao criar venda via promessa, mover lead para "Venda Realizada" no pipeline
- [x] Backend: ao criar venda via promessa, atualizar agendamento de origem (resultouVenda=true)
- [x] Backend: venda criada via promessa conta em comissão, ranking, serviços vendidos, Excel (pois é uma venda normal)
- [x] Frontend Promessas: modal de pagamento com valorColetado, valorFaturado, serviços, formaPagamento, parcelas, comprovante
- [x] Frontend Promessas: botão "Pago" abre modal de confirmação com todos os campos
- [x] Frontend Promessas: resumo de comissão líquida em tempo real no modal
- [x] Frontend Promessas: badge "Venda criada" após concluir pagamento

## Cancelamento/Estorno de Vendas e Exclusão no Pipeline (Mar 2026)
- [x] Schema: adicionar campos cancelada, motivoCancelamento, canceladaEm na tabela vendas (migração aplicada)
- [x] Backend: getVendaById e cancelarVenda adicionados ao db.ts
- [x] Backend: procedure vendas.cancelar — marca venda como cancelada, cancela parcelas pendentes, cria lead na coluna "Estorno" (cria coluna se não existir)
- [x] Backend: procedure vendas.listCanceladas para listar vendas canceladas
- [x] Backend: getVendasByPeriod, getVendasByConsultor, getDashboardFinanceiro, getServicosVendidos, getRankingAutomatico excluem vendas canceladas
- [x] Backend: getParcelasByPeriodo, getParcelasFuturasConsultor, getParcelasCompletasByConsultor, getParcelasByConsultor excluem parcelas de vendas canceladas
- [x] Frontend Admin Vendas: botão "Estorno" com modal de confirmação e campo de motivo
- [x] Frontend Consultor PainelConsultor: botão de estorno (XCircle) na lista de vendas com modal
- [x] Pipeline: coluna "Estorno" criada automaticamente ao cancelar primeira venda
- [x] Pipeline: botão de exclusão de lead já existia para todos os usuários (protectedProcedure)

## Correção Serviços Vendidos e Edição de Venda (Mar 2026)
- [x] Corrigido: formulário Nova Venda agora usa checkboxes de serviços (limpa_nome/rating) em vez de texto livre
- [x] Corrigido: custo do serviço calculado automaticamente com base nos serviços selecionados
- [x] Adicionado botão "Editar" (Edit2) na lista de vendas do Admin (Vendas.tsx)
- [x] Adicionado modal de edição completo no Admin com todos os campos
- [x] Adicionado botão de edição (Edit2) na lista de vendas do Consultor (PainelConsultor.tsx)
- [x] Adicionado modal de edição completo no Consultor com todos os campos
- [x] Backend: procedure vendas.update expandido para aceitar todos os campos (servicos, consultorId, custoServico, comissaoPercent, dataVenda, tipo)

## Migração de Dados: Preencher campo servicos nas vendas existentes (Mar 2026)
- [ ] Atualizar campo servicos de todas as vendas com base no custoServico já salvo (70=limpa_nome, 110=rating, 180=ambos)

## Aba Prazo de Serviços (Mar 2026)
- [x] Backend: procedure vendas.listPrazos — lista vendas ativas com dataVenda e dias decorridos
- [x] Frontend: página PrazoServicos.tsx com lista de clientes, data início, dias decorridos, status
- [x] Frontend: alerta visual por cor (verde ok, amarelo 5 dias restantes, vermelho atrasado)
- [x] Frontend: barra de progresso visual por cliente
- [x] Frontend: cards de resumo (fora do prazo, vencendo em breve, no prazo)
- [x] Frontend: busca por cliente ou consultora
- [x] Frontend: atualiza automaticamente a cada 1 minuto
- [x] Menu lateral: aba "Prazo de Serviços" (Timer) para Admin e Consultoras

## Correção Fluxos Portal Vendedor (Mar 2026)
- [x] Backend: vendas.create agora retorna vendaId para criar parcelas sem busca extra
- [x] Frontend: handleSalvar usa vendaId retornado diretamente para criar parcelas (robusto)
- [x] Frontend: createVenda.onSuccess invalida vendas.listByPeriod, rankings, servicosVendidos
- [x] Frontend: updateAgendamento.onSuccess invalida agendamentos.listByPeriod, vendas.listByPeriod, rankings, servicosVendidos
- [x] Modal de promessa: aviso visual quando data não está preenchida (⊠ Preencha a data do retorno)
- [x] Botão "Registrar Promessa" com tooltip explicando que data é obrigatória

## Aba Prazo das Vendas com Entrega (Mar 2026)
- [x] Schema: adicionar campos entregue (boolean), dataEntrega (datetime), entregueConsultorId, movidoParaEntrega na tabela vendas
- [x] Backend: procedure vendas.marcarEntregue — marca venda como entregue com data e consultora
- [x] Backend: procedure vendas.marcarEntregueViaLead — marca entrega via leadId do Pipeline (remove lead após marcar)
- [x] Backend: procedure vendas.listPrazos retorna campos entregue, dataEntrega, movidoParaEntrega
- [x] Backend: procedure vendas.moverParaEntregaSeNecessario — cria lead na coluna "Entregar Serviço Feito" quando >= 25 dias
- [x] Frontend PrazoServicos: check de entrega em cada card de cliente (botão verde "Marcar Entregue")
- [x] Frontend PrazoServicos: alarme visual/sonoro ao atingir 25 dias (toast de alerta)
- [x] Frontend PrazoServicos: filtro por vendedora (Admin) com Select
- [x] Frontend PrazoServicos: filtro por status (todos / ativos / atrasado / alerta / ok / entregue)
- [x] Frontend PrazoServicos: badge de status (entregue / atrasado / atenção / no prazo)
- [x] Frontend PrazoServicos: cards de resumo clicáveis (fora do prazo, em alerta, no prazo, entregues)
- [x] Pipeline: coluna fixa "Entregar Serviço Feito" criada automaticamente ao atingir 25 dias
- [x] Pipeline: ao atingir 25 dias, cliente vai automaticamente para coluna "Entregar Serviço Feito"
- [x] Pipeline: card especial na coluna de entrega com botão "Entregue" verde
- [x] Pipeline: ao clicar em "Entregue" no Pipeline, marca venda no banco e remove o lead
- [x] Admin: painel PrazoServicos com filtro por vendedora mostrando entregas feitas/atrasadas

## Correções de Bugs e Melhorias (Mar 2026 - v3)
- [x] Pipeline: textos em inglês ao criar lead via agendamento — substituir datetime-local por campos date+time separados no Agendar.tsx e Agendamentos.tsx
- [x] Venda: erro ao anexar comprovante de pagamento — corrigir FileReader com Promise para capturar erros async
- [x] Promessas: erro ao subir comprovante no modal de pagamento — corrigir para usar trpc.upload.comprovante
- [x] Editar venda: duplica em vez de substituir — adicionar campo vendaId na tabela agendamentos + verificação jaTemVenda no handleSalvar
- [x] Painel Consultor: parcelas de vendas parceladas não aparecem — corrigir lógica (faturado - coletado) / parcelasQtd + criar parcelas retroativas
- [x] Painel Consultor: devedores não aparecem — agora funcionam com parcelas criadas
- [x] Dashboard Admin: seção Controle de Parcelas e Devedores com filtro por vendedora, cards de resumo, lista de devedores em vermelho, tabela de parcelas pendentes
- [x] Configurações: salário individual por consultora — campos salario e receberSalario na tabela consultores + UI no Configuracoes.tsx
- [x] Dashboard Admin: totalSalarios inclui salários das consultoras com receberSalario=true

## Sistema Coletado Parcelas Separado (Mar 2026)
- [x] Backend: procedure parcelas.coletadoByConsultor — soma valor das parcelas pagas no mês por consultora com comissão
- [x] Backend: procedure parcelas.coletadoAdmin — soma total de parcelas pagas no mês (todos consultores) com comissão por consultora
- [x] Painel Consultor: card "Coletado Parcelas" separado (não soma ao coletado normal, não entra no ranking)
- [x] Painel Consultor: card "Sua Comissão" sobre parcelas recebidas com lista detalhada por cliente
- [x] Dashboard Admin: cards "Coletado Parcelas" e "Comissão a Pagar (Parcelas)" com breakdown por consultora
- [x] Dashboard Admin: Resumo Financeiro inclui linhas "(+) Coletado Parcelas" e "(-) Comissão Parcelas"
- [x] Garantir que parcelas pagas NÃO entram no coletado normal nem no ranking (são campos separados)

## Correções de Bugs v4 (Mar 2026)
- [x] Modal agendamento (Agendamentos.tsx admin): botão "Vai Fechar" adicionado — cria promessa e move lead para coluna "Vai Fechar" no pipeline
- [x] Modal agendamento: upload de comprovante corrigido (usa trpc.upload.comprovante via FileReader Promise)
- [x] Aba Anotações: convertida para useState controlado — carrega e salva corretamente
- [x] Estorno: procedure vendas.cancelar agora remove lead da coluna "Venda Realizada" ao estornar (além de criar na coluna Estorno)
- [x] Parcelas: campo formaPagamento adicionado na tabela parcelas (migração aplicada)
- [x] Parcelas: botão "Recebi" abre modal com seleção de forma de pagamento (obrigatório) + upload de comprovante (opcional)
- [x] Parcelas: ao confirmar recebimento, salva formaPagamento e comprovanteUrl na parcela
- [x] Backend: procedure parcelas.okConsultor atualizada para aceitar formaPagamento e comprovanteUrl

## Correções de Bugs v5 (Mar 2026) - Fluxo de Parcelas
- [x] Bug crítico: vendas.create retornava vendaId=0 (corrigido com $returningId)
- [x] Bug crítico: handleSalvar não criava parcelas quando datesVencimento estava vazio (corrigido com geração automática de datas)
- [x] Bug: botões sem type="button" no modal do PainelConsultor causavam submit acidental
- [x] Teste completo do fluxo parcelado: venda 3x criada → parcelas na grade → botão Recebi → modal com forma/comprovante → painel consultor atualizado → painel admin atualizado

## Correções de Bugs v6 (Mar 2026)
- [x] Promessas de Pagamento: botão de exclusão corrigido — agora aparece em todos os status (pendente, concluído, cancelado) com confirmação antes de excluir
- [x] Bug crítico: página /agendar redireciona clientes para login — corrigido criando consultores.listPublico (publicProcedure) que retorna apenas id/nome/fotoUrl dos consultores ativos, sem expor senhaHash
- [x] Configurações: botão Excluir adicionado para usuários (vermelho, com confirmação) — admin não pode excluir a si mesmo

## Gestão de Parcelas nas Abas Vendas e Serviços Vendidos
- [x] Modal de gestão de parcelas na aba Vendas (Admin) — visualizar, adicionar, editar, excluir parcelas com datas de vencimento
- [x] Modal de gestão de parcelas na aba Serviços Vendidos — mesma funcionalidade
- [x] Parcelas refletindo em todo o dashboard (coletado parcelas, a receber, comissão parcelas)

## Correções de Bugs v7 (Abr 2026) - Fluxo de Confirmação de Parcelas e Isolamento de Dados

### Fluxo de Confirmação de Parcelas (okConsultor → aguardando_confirmacao → admin confirma → pago)
- [x] Backend: okConsultor agora muda status para 'aguardando_confirmacao' em vez de 'pago'
- [x] Backend: pendentesConsultor inclui status 'aguardando_confirmacao' (consultor vê ambos)
- [x] Backend: getParcelasPendentes (admin) inclui 'aguardando_confirmacao' na listagem
- [x] Backend: getParcelasVencidas inclui 'aguardando_confirmacao' na listagem de devedores
- [x] Frontend Parcelas.tsx: badge "⏳ Aguardando Baixa" (azul) para parcelas aguardando confirmação
- [x] Frontend Parcelas.tsx: botão "Confirmar Baixa" (azul) para admin confirmar parcelas aguardando
- [x] Frontend Parcelas.tsx: filtros de pendentes/atrasadas incluem 'aguardando_confirmacao'
- [x] Frontend PainelConsultor.tsx: badge "⏳ Aguardando" para parcelas aguardando confirmação
- [x] Frontend PainelConsultor.tsx: botão "Recebi" só aparece para status 'pendente' (não para 'aguardando')
- [x] Frontend PainelConsultor.tsx: mensagem toast atualizada para informar que aguarda confirmação do admin
- [x] Frontend PainelConsultor.tsx: okConsultorMutation invalida pendentesConsultor
- [x] Frontend Parcelas.tsx: baixarMutation invalida coletadoAdmin e listAll após dar baixa
- [x] Frontend Dashboard.tsx: card "Aguardando Confirmação de Baixa" com lista de parcelas pendentes de confirmação
- [x] Frontend Dashboard.tsx: filtros de devedores e parcelas pendentes incluem 'aguardando_confirmacao'

### Isolamento de Dados por Consultor (Pipeline e Promessas)
- [x] Frontend Pipeline.tsx: promessas filtradas por consultor logado (não-admin vê apenas as próprias)
- [x] Frontend Promessas.tsx: mutations invalidam listByConsultor e hojeByConsultor após criar/editar/excluir

## Dashboard Admin - Botão Confirmar Baixa e Cards de Coletado (Abr 2026)
- [x] Dashboard Admin: adicionar botão "Confirmar Baixa" em cada parcela do card "Aguardando Confirmação"
- [x] Dashboard Admin: ao confirmar baixa, abrir modal com valor pago e forma de pagamento (igual ao Parcelas.tsx)
- [x] Dashboard Admin: após confirmar, atualizar cards "Coletado Parcelas" e "Comissão a Pagar" do mês
- [x] Dashboard Admin: garantir que os 3 cards (Aguardando, Coletado Parcelas, Comissão a Pagar) aparecem juntos — sempre visíveis em grid de 3 colunas

## Bug: Salário de Consultora não aparece em Despesas (Abr 2026)
- [x] Investigar por que salário de consultora (receberSalario=true, R$1.600) aparece como R$0,00 em Salários no Despesas
- [x] Corrigir cálculo de totalSalarios no Despesas.tsx para incluir consultoras com receberSalario=true (soma colaboradores + consultoras)

## Bug: Cancelar marcação de parcela como paga (Abr 2026)
- [x] Adicionar procedure `parcelas.cancelarOkConsultor` no backend que reverte status para `pendente` e limpa `dataPagamento`, `okConsultor`, `valorPago`, `formaPagamento` (reutilizado o okConsultor com ok=false)
- [x] Adicionar botão "✕ Cancelar" no PainelConsultor.tsx para parcelas com status `aguardando_confirmacao` (aba Parcelas e aba Cobranças)
- [x] Ao cancelar, invalidar queries de parcelas e dashboard para atualizar os dados. Toast diferenciado para marcar vs cancelar

## Bug: Botão cancelar parcela ausente na aba Serviços Vendidos (Abr 2026)
- [x] Adicionar botão "✕ Cancelar" no modal de parcelas da aba Serviços Vendidos (ModalGerenciarParcelas com modoConsultor={!isAdmin})
- [x] Garantir que ao cancelar, todas as queries do painel admin e consultor sejam invalidadas (coletadoAdmin, listAll, listPendentes, dashboard.stats, dashboardFinanceiro, rankings)

## Bug: Parcelas não atualizam após adicionar/editar na aba Vendas (Abr 2026)
- [x] Investigar mutations de criar/editar parcelas no PainelConsultor e ModalGerenciarParcelas — problema estava no Vendas.tsx (createParcelasMut sem onSuccess) e ServicosVendidos.tsx (sem onUpdate)
- [x] Corrigir invalidações: Vendas.tsx e ServicosVendidos.tsx agora chamam invalidarTudo() em todas as mutations (criar, editar, deletar, cancelar, pagar parcela)

## Bug: Editar venda não cria parcelas (Abr 2026)
- [x] Investigar ModalEditarVenda — ao editar venda com parcelas, as parcelas não são criadas (problema: onSave só chamava updateMutation sem criar parcelas)
- [x] Corrigir fluxo de edição: Vendas.tsx e PainelConsultor.tsx agora criam parcelas após update (mutateAsync + createParcelas + invalidarTudo)
