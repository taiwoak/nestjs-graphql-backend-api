import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('Date', () => Date)
export class DateScalar implements CustomScalar<string | number, Date | null> {
  description = 'Custom Date scalar type (handles timestamps and ISO strings)';

  // Convert outgoing Date -> ISO string
  serialize(value: Date | string): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return '';
  }

  // Convert incoming ISO string or timestamp -> Date
  parseValue(value: string | number): Date | null {
    if (!value) return null;
    return new Date(value);
  }

  // Convert AST literal (client query literal)
  parseLiteral(ast: ValueNode): Date | null {
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value, 10));
    }
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  }
}
