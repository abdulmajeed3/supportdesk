import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ example: 'Could you please provide more details about the error message?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10000)
  body: string;

  @ApiPropertyOptional({ description: 'Internal note (agents/admins only)', default: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
