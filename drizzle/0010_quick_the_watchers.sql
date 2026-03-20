ALTER TABLE `agendamentos` ADD `vendaId` int;--> statement-breakpoint
ALTER TABLE `consultores` ADD `salario` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `consultores` ADD `receberSalario` boolean DEFAULT false;