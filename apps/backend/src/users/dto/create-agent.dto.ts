import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateAgentDto {
  @ApiProperty({ example: 'agent.jane@supportdesk.local' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'Agent@123456' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#\-_.])[A-Za-z\d@$!%*?&^#\-_.]{8,}$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;
}
