import path from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";

let cachedSpec: Record<string, unknown> | null = null;

export const loadOpenApiSpec = async (): Promise<Record<string, unknown>> => {
  if (cachedSpec) {
    return cachedSpec;
  }

  const openApiPath = path.join(__dirname, "openapi.yaml");
  const bundled = await SwaggerParser.bundle(openApiPath);

  cachedSpec = bundled as Record<string, unknown>;
  return cachedSpec;
};
