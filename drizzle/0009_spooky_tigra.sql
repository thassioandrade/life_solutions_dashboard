ALTER TABLE `vendas` ADD `entregue` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendas` ADD `dataEntrega` timestamp;--> statement-breakpoint
ALTER TABLE `vendas` ADD `entregueConsultorId` int;--> statement-breakpoint
ALTER TABLE `vendas` ADD `movidoParaEntrega` boolean DEFAULT false NOT NULL;