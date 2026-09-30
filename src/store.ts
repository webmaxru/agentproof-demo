export interface CreateExpenseInput {
  readonly submittedBy: string;
  readonly description: string;
  readonly amountCents: number;
  readonly currency: string;
}

export interface PendingExpense extends CreateExpenseInput {
  readonly id: string;
  readonly status: "pending";
  readonly createdAt: string;
}

export interface ApprovedExpense extends CreateExpenseInput {
  readonly id: string;
  readonly status: "approved";
  readonly createdAt: string;
  readonly approvedAt: string;
  readonly approvedBy: string;
}

export type Expense = PendingExpense | ApprovedExpense;

export type ApprovalResult =
  | { readonly outcome: "approved"; readonly expense: ApprovedExpense }
  | { readonly outcome: "already-approved"; readonly expense: ApprovedExpense }
  | { readonly outcome: "self-approval-forbidden" }
  | { readonly outcome: "not-found" };

const INITIAL_TIMESTAMP_MS = Date.parse("2026-01-01T00:00:00.000Z");

export class DeterministicExpenseStore {
  readonly #expenses = new Map<string, Expense>();
  #nextExpenseNumber = 1;
  #nextEventNumber = 0;

  create(input: CreateExpenseInput): PendingExpense {
    const expense: PendingExpense = {
      ...input,
      id: `expense-${String(this.#nextExpenseNumber).padStart(4, "0")}`,
      status: "pending",
      createdAt: this.#nextTimestamp(),
    };

    this.#nextExpenseNumber += 1;
    this.#expenses.set(expense.id, expense);
    return { ...expense };
  }

  get(id: string): Expense | undefined {
    const expense = this.#expenses.get(id);
    return expense === undefined ? undefined : { ...expense };
  }

  approve(id: string, approverId: string): ApprovalResult {
    const expense = this.#expenses.get(id);

    if (expense === undefined) {
      return { outcome: "not-found" };
    }

    if (expense.status === "approved") {
      return { outcome: "already-approved", expense: { ...expense } };
    }

    if (expense.submittedBy === approverId) {
      return { outcome: "self-approval-forbidden" };
    }

    const approvedExpense: ApprovedExpense = {
      ...expense,
      status: "approved",
      approvedAt: this.#nextTimestamp(),
      approvedBy: approverId,
    };

    this.#expenses.set(id, approvedExpense);
    return { outcome: "approved", expense: { ...approvedExpense } };
  }

  #nextTimestamp(): string {
    const timestamp = new Date(INITIAL_TIMESTAMP_MS + this.#nextEventNumber * 1_000).toISOString();
    this.#nextEventNumber += 1;
    return timestamp;
  }
}
