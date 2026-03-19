CREATE TABLE `promessas_pagamento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clienteNome` varchar(200) NOT NULL,
	`clienteTelefone` varchar(30),
	`clienteCpfCnpj` varchar(20),
	`dataPromessa` date NOT NULL,
	`valor` decimal(10,2),
	`observacoes` text,
	`consultorId` int,
	`agendamentoId` int,
	`status` varchar(20) NOT NULL DEFAULT 'pendente',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promessas_pagamento_id` PRIMARY KEY(`id`)
);
