ALTER TABLE `promessas_pagamento` ADD `valorColetado` decimal(10,2);--> statement-breakpoint
ALTER TABLE `promessas_pagamento` ADD `valorFaturado` decimal(10,2);--> statement-breakpoint
ALTER TABLE `promessas_pagamento` ADD `servicos` json;--> statement-breakpoint
ALTER TABLE `promessas_pagamento` ADD `formaPagamento` varchar(50);--> statement-breakpoint
ALTER TABLE `promessas_pagamento` ADD `parcelasQtd` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `promessas_pagamento` ADD `comprovanteUrl` text;--> statement-breakpoint
ALTER TABLE `promessas_pagamento` ADD `vendaId` int;