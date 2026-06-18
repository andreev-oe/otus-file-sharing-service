import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserUsername1750245000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(32) UNIQUE`,
    );
    await queryRunner.query(
      `UPDATE users SET username = LOWER(SPLIT_PART(email, '@', 1)) WHERE username IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE users ALTER COLUMN username SET NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS username`);
  }
}
