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
  "generation_id": string | null;
  "body": unknown;
  "created_at": Date;
}

export interface accounts_capture {
  "generation_id": string;
  "object_id": string;
  "slice": string;
  "account_id": string;
  "project_id": string;
  "sequence": number;
  "fingerprint": string;
  "created_at": Date;
}

export interface accounts_decision {
  "object_id": string;
  "sequence": number;
  "account_id": string;
  "project_id": string;
  "type": string;
  "payload": unknown;
  "actor": string;
  "action_group": string;
  "created_at": Date;
}

export interface accounts_event {
  "account_id": string;
  "sequence": number;
  "type": string;
  "payload": unknown;
  "occurred_at": Date;
}

export interface accounts_event_counter {
  "account_id": string;
  "next": number;
}

export interface accounts_generation {
  "generation_id": string;
  "account_id": string;
  "project_id": string;
  "operation": string;
  "operation_class": string;
  "initiation": unknown;
  "effective_model": unknown;
  "versions": unknown;
  "test_provider": boolean;
  "resolved_inputs": unknown;
  "captured": unknown;
  "package": unknown;
  "fit_report": unknown;
  "rendered_request": unknown;
  "request_digest": string;
  "expected_digest": string | null;
  "estimate": unknown;
  "target": unknown;
  "created_at": Date;
  "input_fingerprint": string | null;
}

export interface accounts_generation_call {
  "generation_id": string;
  "index": number;
  "account_id": string;
  "project_id": string;
  "role": string;
  "job_id": string;
  "request_digest": string;
  "operation_ref": string | null;
  "response": string | null;
  "verdict": unknown | null;
  "reported_cost": unknown | null;
  "created_at": Date;
  "rendered_request": unknown | null;
}

export interface accounts_generation_run {
  "generation_id": string;
  "job_id": string;
  "account_id": string;
  "project_id": string;
  "run": number;
  "state": string;
  "operation_ref": string | null;
  "failure_class": string | null;
  "billed": string | null;
  "reason": string | null;
  "created_at": Date;
  "counted_micros": number | null;
}

export interface accounts_generation_settlement {
  "generation_id": string;
  "account_id": string;
  "project_id": string;
  "outcome": string;
  "reason": string | null;
  "actual": unknown;
  "outputs": unknown;
  "settled_at": Date;
}

export interface accounts_idempotency {
  "account_id": string;
  "operation": string;
  "key": string;
  "fingerprint": string;
  "result": unknown;
  "created_at": Date;
}

export interface accounts_job {
  "job_id": string;
  "account_id": string;
  "project_id": string;
  "generation_id": string;
  "run": number;
  "class": string;
  "provider": string | null;
  "state": string;
  "due_at": Date | null;
  "deadline_at": Date | null;
  "lease_token": string | null;
  "lease_expires_at": Date | null;
  "operation_ref": string | null;
  "failure_class": string | null;
  "billed": string | null;
  "reason": string | null;
  "created_at": Date;
  "updated_at": Date;
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
  "generation_id": string | null;
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
