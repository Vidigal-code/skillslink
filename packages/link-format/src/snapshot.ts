import {
  SNAPSHOT_SCHEMA_VERSION,
  type CreateSnapshotInput,
  type DocumentSnapshot,
} from "./model";
import { parseDocumentSnapshot } from "./validation";

export function createDocumentSnapshot(
  input: CreateSnapshotInput,
): DocumentSnapshot {
  return parseDocumentSnapshot({
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    id: input.id,
    publishedAt: input.publishedAt,
    document: input.document,
  });
}
