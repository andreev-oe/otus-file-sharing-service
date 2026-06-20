import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFolderTotalSize1750244900000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE folders ADD COLUMN IF NOT EXISTS total_size bigint NOT NULL DEFAULT 0`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE folders DROP COLUMN IF EXISTS total_size`,
    );
  }
}
