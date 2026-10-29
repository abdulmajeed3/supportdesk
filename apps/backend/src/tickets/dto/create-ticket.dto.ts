import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ example: 'Cannot log into my account' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(255)
  subject: string;

  @ApiProperty({ example: 'I keep getting Invalid credentials...' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(10000)
  description: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
