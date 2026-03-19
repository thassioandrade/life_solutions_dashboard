ALTER TABLE `parcelas` ADD `okConsultor` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `parcelas` ADD `dataOkConsultor` timestamp;--> statement-breakpoint
ALTER TABLE `parcelas` ADD `notificacaoEnviada` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `vendas` ADD `clienteTelefone` varchar(30);