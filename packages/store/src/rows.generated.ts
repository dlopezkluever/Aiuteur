// Generated from schema.json by scripts/schema.ts; adapter-private. Do not edit.
export interface accounts_account {
  "account_id": string;
  "created_at": Date;
}

export interface accounts_attempt {
  "attempt_id": string;
  "position": number;
  "object_id": string;
  "account_id": string;
  "project_id": string;
  "based_on": number;
  "origin": string;
  "body": unknown;
  "created_at": Date;
}

export interface accounts_lock {
  "object_id": string;
  "sequence": number;
  "account_id": string;
  "project_id": string;
  "locked": boolean;
  "actor": string;
  "created_at": Date;
}

export interface accounts_object {
  "object_id": string;
  "account_id": string;
  "project_id": string;
  "kind": string;
  "created_at": Date;
}

export interface accounts_project {
  "project_id": string;
  "account_id": string;
  "created_at": Date;
}

export interface accounts_revision {
  "object_id": string;
  "sequence": number;
  "account_id": string;
  "project_id": string;
  "parent": number;
  "cause": string;
  "actor_kind": string;
  "action_group": string;
  "schema_version": number;
  "body": unknown;
  "body_hash": string;
  "fingerprints": unknown;
  "created_at": Date;
}

export interface accounts_settings {
  "account_id": string;
  "key": string;
  "schema_version": number;
  "payload": unknown;
}
