ALTER TABLE `vendas` ADD `cancelada` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendas` ADD `motivoCancelamento` text;--> statement-breakpoint
ALTER TABLE `vendas` ADD `canceladaEm` timestamp;