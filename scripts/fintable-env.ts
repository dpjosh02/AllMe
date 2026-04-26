import nextEnv from "@next/env";

export { getFintableSheetConfig } from "@/features/finance/integrations/fintable/config";

nextEnv.loadEnvConfig(process.cwd());
