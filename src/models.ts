interface IdKeyedMigration {
  [migration: string]: number[];
}

interface UnsafeSqls {
  index: number;
  at: string;
  operation: string;
  operation_type: string;
}

interface SqlMigration {
  unsafeSqls: UnsafeSqls[];
  sql: string;
  isReverse: boolean;
}

export interface MigrationStatusObject {
  errors: {
    [app: string]: IdKeyedMigration;
  };
  warnings: {
    [app: string]: IdKeyedMigration;
  };

  forwardDowntimes: {
    [app: string]: {
      [migration: string]: SqlMigration;
    };
  };
  backwardDowntimes: {
    [app: string]: {
      [migration: string]: SqlMigration;
    };
  };
}

interface MigrationStatusObjectReturnElement<T> {
  app: string;
  migration: string;
  culprits: T[];
}

export interface MigrationStatusObjectReturn {
  errors: MigrationStatusObjectReturnElement<number>[];
  warnings: MigrationStatusObjectReturnElement<number>[];
  forwardDowntimes: MigrationStatusObjectReturnElement<SqlMigration>[];
  backwardDowntimes: MigrationStatusObjectReturnElement<SqlMigration>[];
}
