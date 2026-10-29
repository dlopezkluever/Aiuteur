import type { OperationClass, ProjectId, WorkflowOperation } from "@aiuteur/contract";
import type { ResolvedInputs } from "@aiuteur/compiler";
import type { OperationSettler } from "@aiuteur/generation";
import type { ReadTx, Scope } from "@aiuteur/store";

/**
 * Draft FC6 / EI2: the operation record (MODULE §3.1, §6). A workflow operation is declared once, as data and pure parts:
 * `scope` (code fixes the targets), `resolve` (the owners' Resolve functions, read-only), the operation class and Package
 * operation (the `propose` request the compiler builds), `validate` (the guards over the proposal) and `attach` (an
 * AttachPlan; never selects, approves or accepts). `execute(initiation, command)` runs every record through one path.
 */
export interface OperationRecord<Command, Target, Proposal> extends OperationSettler<Proposal> {
  readonly id: WorkflowOperation;
  readonly operationClass: OperationClass;
  /** The kind the output attaches as (an Option of this kind). */
  readonly outputKind: string;
  /** Parses the wire command; null when it is not this operation's shape. */
  parse(command: unknown): Command | null;
  scope(command: Command): { readonly projectId: ProjectId; readonly target: Target; readonly expectedDigest: string | null };
  resolve(tx: ReadTx, scope: Scope, projectId: ProjectId, target: Target): Promise<ResolvedInputs | null>;
}
// The registry holds records of different command shapes; each is used only through its own parts.
export type AnyOperationRecord = OperationRecord<any, any, any>;
