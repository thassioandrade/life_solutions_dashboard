CREATE TABLE `agendamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clienteNome` varchar(255) NOT NULL,
	`clienteEmail` varchar(320),
	`clienteTelefone` varchar(30),
	`clienteCpfCnpj` varchar(20),
	`consultorId` int,
	`dataHora` timestamp NOT NULL,
	`status` enum('confirmado','realizado','noshow','cancelado','remarcado') NOT NULL DEFAULT 'confirmado',
	`valorColetado` decimal(10,2),
	`valorFaturado` decimal(10,2),
	`parcelasQtd` int DEFAULT 0,
	`servicos` json,
	`formaPagamento` varchar(50),
	`resultouVenda` boolean DEFAULT false,
	`comprovanteUrl` text,
	`observacoes` text,
	`origem` enum('admin','publico') NOT NULL DEFAULT 'admin',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agendamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bloqueios_agenda` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consultorId` int NOT NULL,
	`data` timestamp NOT NULL,
	`diaInteiro` boolean DEFAULT false,
	`horaInicio` varchar(10),
	`horaFim` varchar(10),
	`motivo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bloqueios_agenda_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `colaboradores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cargo` varchar(100),
	`salario` decimal(10,2) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `colaboradores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `colunas_pipeline` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`cor` varchar(20) DEFAULT '#16a34a',
	`ordem` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `colunas_pipeline_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `configuracoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chave` varchar(100) NOT NULL,
	`valor` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configuracoes_id` PRIMARY KEY(`id`),
	CONSTRAINT `configuracoes_chave_unique` UNIQUE(`chave`)
);
--> statement-breakpoint
CREATE TABLE `consultores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`email` varchar(320),
	`senhaHash` text,
	`fotoUrl` text,
	`linkAgenda` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consultores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `despesas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`data` timestamp NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`valor` decimal(10,2) NOT NULL,
	`categoria` varchar(100),
	`formaPagamento` varchar(50),
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `despesas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`colunaId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`telefone` varchar(30),
	`email` varchar(320),
	`valor` decimal(10,2),
	`dataReuniao` timestamp,
	`horario` varchar(10),
	`observacoes` text,
	`ordem` int DEFAULT 0,
	`consultorId` int,
	`mes` int,
	`ano` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metricas_trafego` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`investimento` decimal(10,2) DEFAULT '0',
	`qtdDiagnosticos` int DEFAULT 0,
	`valorUnitarioDiagnostico` decimal(10,2) DEFAULT '0',
	`qtdUpsell` int DEFAULT 0,
	`valorUnitarioUpsell` decimal(10,2) DEFAULT '0',
	`qtdDownsell` int DEFAULT 0,
	`valorUnitarioDownsell` decimal(10,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metricas_trafego_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parcelas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendaId` int NOT NULL,
	`valor` decimal(10,2) NOT NULL,
	`vencimento` timestamp NOT NULL,
	`status` enum('pendente','pago','atrasado') NOT NULL DEFAULT 'pendente',
	`dataPagamento` timestamp,
	`comprovanteUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parcelas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rankings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`consultorId` int NOT NULL,
	`posicao` int NOT NULL,
	`valorColetado` decimal(10,2) DEFAULT '0',
	`totalVendas` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rankings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clienteNome` varchar(255) NOT NULL,
	`clienteCpfCnpj` varchar(20),
	`tipo` enum('PF','PJ') NOT NULL DEFAULT 'PF',
	`consultorId` int,
	`dataVenda` timestamp NOT NULL,
	`valorFaturado` decimal(10,2) NOT NULL,
	`valorColetado` decimal(10,2) DEFAULT '0',
	`parcelasRestantes` int DEFAULT 0,
	`servicos` json,
	`observacoes` text,
	`comprovanteUrl` text,
	`comissaoPercent` decimal(5,2) DEFAULT '10',
	`custoServico` decimal(10,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;