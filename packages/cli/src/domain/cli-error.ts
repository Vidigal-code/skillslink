export type CliErrorCode =
  "CONFIGURATION_ERROR" | "DOCUMENT_ERROR" | "REGISTRY_ERROR";

export class CliError extends Error {
  readonly code: CliErrorCode;

  constructor(code: CliErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CliError";
    this.code = code;
  }
}
