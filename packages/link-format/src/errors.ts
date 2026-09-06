export type LinkFormatErrorCode =
  | "INVALID_DOCUMENT"
  | "INVALID_PAYLOAD"
  | "INVALID_SNAPSHOT"
  | "INVALID_URL"
  | "UNSUPPORTED_VERSION";

export class LinkFormatError extends Error {
  readonly code: LinkFormatErrorCode;

  constructor(
    code: LinkFormatErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "LinkFormatError";
    this.code = code;
  }
}
