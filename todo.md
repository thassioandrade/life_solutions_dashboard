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
