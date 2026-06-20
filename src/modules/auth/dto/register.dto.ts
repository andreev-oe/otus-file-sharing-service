import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/;

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'ivan_ivanov',
    description: 'Уникальный никнейм (3–32 символа, латиница, цифры, _)',
  })
  @IsString()
  @Matches(USERNAME_PATTERN, {
    message:
      'username may only contain letters, numbers and underscores (3–32 chars)',
  })
  username: string;
}
