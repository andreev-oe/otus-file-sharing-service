import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotesFtsIndex1750244800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX notes_content_fts_idx ON notes USING GIN (to_tsvector('simple', content))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX notes_content_fts_idx`);
  }
}
