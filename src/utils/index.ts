// Exportar as funções utilitárias existentes
export * from './apiKeys';
export * from './apiUtils';
export * from './chat';
export * from './dailyReset';

// Exportações com nomes explícitos para evitar ambiguidade
import * as dailyStatsUtils from './dailyStats';
export { dailyStatsUtils };
export { updateDailyStats as updateLegacyDailyStats } from './dailyStats';

import * as errorHandlingUtils from './errorHandling';
export { errorHandlingUtils };
export { reportError as reportErrorToService } from './errorReporting';
export { categorizeError as categorizeLegacyError } from './errorReporting';

export * from './errorUtils';
export * from './imageService';
export * from './mealUtils';
export * from './modalUtils';
export * from './network';
export * from './dietGenerator';
export * from './imageUtils';
export * from './planLimits';
export * from './subscription';

// Novas funções utilitárias
export * from './timeoutUtils';
export * from './profileValidator';
export * from './dietStatsUtils';