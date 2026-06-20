import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as bcrypt from 'bcrypt';
import { User } from './modules/users/entities/user.entity';
import { Folder } from './modules/folders/entities/folder.entity';
import { File } from './modules/files/entities/file.entity';
import { Note } from './modules/notes/entities/note.entity';
import { Group } from './modules/groups/entities/group.entity';
import { GroupMember } from './modules/groups/entities/group-member.entity';
import { Permission } from './modules/permissions/entities/permission.entity';
import { ShareLink } from './modules/share-links/entities/share-link.entity';
import {
  GroupMemberRole,
  PermissionLevel,
  ResourceType,
  SubjectType,
  UserRole,
} from './common/enums';

const BCRYPT_SALT_ROUNDS = 10;
const FILE_S3_KEY_PREFIX = 'files/';
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

const ID = {
  users: {
    admin: '00000000-0000-0000-0000-000000000001',
    alice: '00000000-0000-0000-0000-000000000002',
    bob: '00000000-0000-0000-0000-000000000003',
    carol: '00000000-0000-0000-0000-000000000004',
  },
  folders: {
    aliceProjects: '00000000-0000-0000-1000-000000000001',
    aliceBackend: '00000000-0000-0000-1000-000000000002',
    aliceFrontend: '00000000-0000-0000-1000-000000000003',
    alicePersonal: '00000000-0000-0000-1000-000000000004',
    bobMarketing: '00000000-0000-0000-1000-000000000005',
    bobCampaigns: '00000000-0000-0000-1000-000000000006',
    bobDesign: '00000000-0000-0000-1000-000000000007',
  },
  files: {
    apiOverview: '00000000-0000-0000-2000-000000000001',
    databaseSchema: '00000000-0000-0000-2000-000000000002',
    componentGuide: '00000000-0000-0000-2000-000000000003',
    diary: '00000000-0000-0000-2000-000000000004',
    q3Results: '00000000-0000-0000-2000-000000000005',
    summerCampaign: '00000000-0000-0000-2000-000000000006',
    brandGuidelines: '00000000-0000-0000-2000-000000000007',
  },
  groups: {
    engineering: '00000000-0000-0000-3000-000000000001',
    marketing: '00000000-0000-0000-3000-000000000002',
  },
  groupMembers: {
    engAlice: '00000000-0000-0000-3100-000000000001',
    engBob: '00000000-0000-0000-3100-000000000002',
    engCarol: '00000000-0000-0000-3100-000000000003',
    mktBob: '00000000-0000-0000-3100-000000000004',
    mktCarol: '00000000-0000-0000-3100-000000000005',
  },
  permissions: {
    bobEditBackend: '00000000-0000-0000-4000-000000000001',
    engCommentProjects: '00000000-0000-0000-4000-000000000002',
    aliceViewMarketing: '00000000-0000-0000-4000-000000000003',
    carolViewPersonal: '00000000-0000-0000-4000-000000000004',
  },
  notes: {
    aliceOnApi: '00000000-0000-0000-5000-000000000001',
    bobOnApi: '00000000-0000-0000-5000-000000000002',
    bobOnQ3: '00000000-0000-0000-5000-000000000003',
    carolOnQ3: '00000000-0000-0000-5000-000000000004',
    carolOnBrand: '00000000-0000-0000-5000-000000000005',
  },
  shareLinks: {
    apiPublic: '00000000-0000-0000-6000-000000000001',
    q3Protected: '00000000-0000-0000-6000-000000000002',
  },
};

const FILE_CONTENTS: Record<string, string> = {
  'api-overview.txt': `REST API Overview
=================

FileShare Pro exposes a RESTful HTTP API. All private endpoints require a
JWT Bearer token obtained via POST /auth/login (expires after 15 minutes).
Use POST /auth/refresh with a refresh token to renew access without
re-authenticating.

Endpoints
---------
POST /auth/register    Create a new user account
POST /auth/login       Authenticate, receive access + refresh tokens
POST /auth/refresh     Renew access token
POST /auth/logout      Invalidate refresh token

POST /files/upload     Upload file (multipart/form-data, max 100 MB)
GET  /files/:id        Retrieve file metadata
GET  /files/:id/download  Presigned S3 URL (valid 1 hour, cached 50 min)
GET  /files/:id/versions  List all versions of this file

GET  /folders/tree     Full folder hierarchy for the current user
POST /folders          Create a new folder
POST /share-links      Generate a public download link (optional TTL + password)

Rate Limiting
-------------
100 requests per minute per IP. Exceeds → HTTP 429.

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.
`,

  'database-schema.txt': `Database Schema — FileShare Pro
================================

Tables
------

users
  id            UUID  PRIMARY KEY
  email         VARCHAR(255) UNIQUE NOT NULL
  password_hash VARCHAR(255) NOT NULL
  name          VARCHAR(255) NOT NULL
  bio           TEXT
  avatar_url    VARCHAR(512)
  role          ENUM('user','admin') DEFAULT 'user'
  created_at    TIMESTAMPTZ DEFAULT NOW()
  updated_at    TIMESTAMPTZ DEFAULT NOW()

folders
  id          UUID PRIMARY KEY
  name        VARCHAR(255) NOT NULL
  parent_id   UUID REFERENCES folders(id)
  owner_id    UUID REFERENCES users(id) NOT NULL
  path        TEXT NOT NULL          -- materialised path e.g. /uuid1/uuid2
  is_deleted  BOOLEAN DEFAULT FALSE
  created_at  TIMESTAMPTZ DEFAULT NOW()
  updated_at  TIMESTAMPTZ DEFAULT NOW()

files
  id            UUID PRIMARY KEY
  name          VARCHAR(255) NOT NULL
  s3_key        TEXT NOT NULL UNIQUE
  mime_type     VARCHAR(128) NOT NULL
  size          BIGINT NOT NULL
  folder_id     UUID REFERENCES folders(id)
  uploaded_by_id UUID REFERENCES users(id) NOT NULL
  version       INTEGER NOT NULL DEFAULT 1
  is_deleted    BOOLEAN DEFAULT FALSE
  created_at    TIMESTAMPTZ DEFAULT NOW()
  updated_at    TIMESTAMPTZ DEFAULT NOW()

Indexes
-------
  files(uploaded_by_id), files(folder_id), files(s3_key)
  folders(owner_id), folders(path)
  permissions(resource_type, resource_id)

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque
habitant morbi tristique senectus et netus et malesuada fames ac turpis
egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor
sit amet, ante. Donec eu libero sit amet quam egestas semper.
`,

  'component-guide.txt': `Frontend Component Guide
========================

This guide documents the React component library used by the FileShare Pro
web client. All components follow Atomic Design principles.

Atoms
-----
Button   — variant: primary / secondary / danger; size: sm / md / lg
Input    — type: text / password / email; supports label and error props
Badge    — color: green / red / grey; used for status indicators
Spinner  — size: sm / md; shown during async operations

Molecules
---------
FileCard
  Displays file name, size, mime-type icon, and action buttons (download,
  delete, share). Accepts a FileDto object and three event callbacks.

FolderTree
  Recursive tree component that renders a user's folder hierarchy.
  Handles expand/collapse per node. Calls onSelect with the folder id.

NoteThread
  Paginated list of notes for a given fileId with an inline compose box.
  Parses @username mentions in note content and renders them as chips.

Organisms
---------
FileBrowser
  Combines FolderTree, FileCard list, and an upload drop-zone.
  Emits upload, rename, move, and delete events to the parent page.

ShareLinkModal
  Form to configure link TTL, optional password, and download limit.
  Displays the generated token URL with a copy-to-clipboard button.

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Nam libero tempore,
cum soluta nobis est eligendi optio cumque nihil impedit quo minus.
`,

  'diary.txt': `Personal Notes — Alice Ivanova
==============================

2024-01-15
----------
First day with the new team. The backend stack looks solid — NestJS + TypeORM
is a comfortable choice. Redis for caching and BullMQ for background jobs
should handle the scale we're targeting.

Todo this week:
- Finish the API overview doc (done ✓)
- Set up the local MinIO bucket for dev
- Draft folder hierarchy design

2024-01-22
----------
Shipped the folder module. Materialised path approach works well for tree
queries. Soft-delete cascade was tricky but the path LIKE prefix trick does
the job without recursive CTEs.

Reminder: update the README with the docker-compose quick-start steps.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur pretium
tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis molestie
dictum semper, eros nunc euismod lorem, pretium volutpat ligula eros eget.
`,

  'q3-results.txt': `Q3 2024 — Marketing Results Report
====================================

Executive Summary
-----------------
Q3 exceeded all primary KPIs. Revenue grew 23 % YoY driven by a strong
enterprise pipeline and two new product tier launches.

Key Metrics
-----------
  Total Revenue      $4.2M   (+23 % YoY)
  New Customers        312   (+41 % vs Q2)
  Churn Rate           1.8 % (-0.4 pp YoY)
  NPS Score             67   (+5 vs Q2)
  CAC                 $420   (-12 % YoY, efficiency gain)
  LTV/CAC Ratio        8.2

Channel Breakdown
-----------------
  Organic / SEO      38 %
  Paid Search        27 %
  Partner Referrals  22 %
  Direct / Brand     13 %

Top Campaigns
-------------
1. "Scale Without Limits" — enterprise webinar series  +$1.1M pipeline
2. Summer SMB promo (10 % off annual plans)            +214 conversions
3. G2 review campaign                                  +60 verified reviews

Next Steps
----------
- Finalise Q4 budget allocation by Oct 10
- Kick off annual contract renewal campaign (Nov)
- Present results to board on Oct 17

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin imperdiet
condimentum erat. Proin pharetra nonummy pede. Mauris et orci. Aenean nec
lorem. In porttitor. Donec laoreet nonummy augue.
`,

  'summer-campaign.txt': `Summer SMB Promo — Campaign Brief
===================================

Objective
---------
Drive annual plan conversions among SMB segment (1-50 seats) during
June–August 2024 with a 10 % discount on all annual subscriptions.

Target Audience
---------------
  Segment    : SMB — Tech & Creative agencies
  Geography  : US, UK, CA, AU
  Platform   : Google Ads, LinkedIn, email (existing trial users)

Messaging Pillars
-----------------
1. "Stop paying per month — lock in your rate and save."
2. Highlight collaboration features: groups, shared folders, RBAC.
3. Social proof: quote from top reviewer on G2.

Creative Assets
---------------
  Banner 300×250   — hero image + CTA "Get 10% off — Today only"
  Banner 728×90    — simplified logo lockup + promo code
  Email subject    — "Your files, your team — save 10% this summer"
  Landing page     — /promo/summer24

Budget
------
  Total              $28,000
  Google Ads         $14,000
  LinkedIn Sponsored  $8,000
  Email platform      $1,000
  Creative production $5,000

KPIs
----
  Target conversions : 200
  Target CPA         : $140
  Expected pipeline  : $280k ARR

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce commodo.
Suspendisse eget sem vitae erat convallis euismod. Cras et elit.
`,

  'brand-guidelines.txt': `Brand Guidelines — FileShare Pro
==================================

Version 2.1 — Updated colour palette & typography

Colours
-------
  Primary Blue      #2563EB   (buttons, links, active states)
  Primary Dark      #1D4ED8   (hover states)
  Accent Teal       #0D9488   (badges, highlights)
  Success Green     #16A34A
  Warning Amber     #D97706
  Danger Red        #DC2626
  Neutral-900       #111827   (body text)
  Neutral-500       #6B7280   (secondary text)
  Neutral-100       #F3F4F6   (backgrounds)
  White             #FFFFFF

Typography
----------
  Headings : Inter — Bold (700), sizes 36/30/24/20/16 px
  Body     : Inter — Regular (400), 16 px / line-height 1.6
  Mono     : JetBrains Mono — 14 px (code blocks, file names)
  Scale    : Major Third (1.250)

Logo Usage
----------
  Minimum clear space : equal to the height of the "F" glyph on all sides
  Minimum size        : 24 px height (digital), 10 mm (print)
  Prohibited          : do not recolour, skew, or place on busy backgrounds

Tone of Voice
-------------
  Confident, clear, and concise. We write for busy professionals.
  Avoid jargon. Use active voice. Oxford comma always.

Print Specifications
--------------------
  CMYK equivalents for offset printing provided in the brand_cmyk.pdf asset.
  Contact the design team before using the logo in any print collateral.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis
unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
`,
};

async function ensureBucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`  Created S3 bucket "${bucket}"`);
  }
}

async function upsertUser(
  repository: Repository<User>,
  data: {
    id: string;
    email: string;
    password: string;
    name: string;
    username: string;
    role: UserRole;
    bio?: string;
  },
): Promise<User> {
  const existing = await repository.findOne({ where: { id: data.id } });
  if (existing) {
    return existing;
  }
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);
  return repository.save(
    repository.create({
      id: data.id,
      email: data.email,
      passwordHash,
      name: data.name,
      username: data.username,
      role: data.role,
      bio: data.bio ?? null,
    }),
  );
}

async function upsertFolder(
  repository: Repository<Folder>,
  data: {
    id: string;
    name: string;
    parentId: string | null;
    ownerId: string;
    path: string;
  },
): Promise<Folder> {
  const existing = await repository.findOne({ where: { id: data.id } });
  if (existing) {
    return existing;
  }
  return repository.save(repository.create({ ...data, isDeleted: false }));
}

async function upsertFile(
  repository: Repository<File>,
  s3Client: S3Client,
  bucket: string,
  data: {
    id: string;
    name: string;
    folderId: string | null;
    uploadedById: string;
  },
): Promise<File> {
  const existing = await repository.findOne({ where: { id: data.id } });
  if (existing) {
    return existing;
  }
  const s3Key = `${FILE_S3_KEY_PREFIX}${data.uploadedById}/${data.id}/${data.name}`;
  const content = FILE_CONTENTS[data.name] ?? `Lorem ipsum — ${data.name}\n`;
  const buffer = Buffer.from(content, 'utf-8');

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: 'text/plain',
    }),
  );

  return repository.save(
    repository.create({
      id: data.id,
      name: data.name,
      s3Key,
      mimeType: 'text/plain',
      size: buffer.byteLength,
      folderId: data.folderId,
      uploadedById: data.uploadedById,
      version: 1,
      isDeleted: false,
    }),
  );
}

async function upsertGroup(
  repository: Repository<Group>,
  data: { id: string; name: string; description: string; ownerId: string },
): Promise<Group> {
  const existing = await repository.findOne({ where: { id: data.id } });
  if (existing) {
    return existing;
  }
  return repository.save(repository.create(data));
}

async function upsertGroupMember(
  repository: Repository<GroupMember>,
  data: { id: string; groupId: string; userId: string; role: GroupMemberRole },
): Promise<GroupMember> {
  const existing = await repository.findOne({ where: { id: data.id } });
  if (existing) {
    return existing;
  }
  return repository.save(repository.create(data));
}

async function upsertPermission(
  repository: Repository<Permission>,
  data: {
    id: string;
    subjectType: SubjectType;
    subjectId: string;
    resourceType: ResourceType;
    resourceId: string;
    permission: PermissionLevel;
  },
): Promise<Permission> {
  const existing = await repository.findOne({ where: { id: data.id } });
  if (existing) {
    return existing;
  }
  return repository.save(repository.create(data));
}

async function upsertNote(
  repository: Repository<Note>,
  data: {
    id: string;
    fileId: string;
    authorId: string;
    content: string;
    mentions: string[];
  },
): Promise<Note> {
  const existing = await repository.findOne({ where: { id: data.id } });
  if (existing) {
    return existing;
  }
  return repository.save(repository.create(data));
}

async function upsertShareLink(
  repository: Repository<ShareLink>,
  data: {
    token: string;
    fileId: string;
    createdById: string;
    expiresAt: Date | null;
    passwordHash: string | null;
    maxDownloads: number | null;
  },
): Promise<ShareLink> {
  const existing = await repository.findOne({ where: { token: data.token } });
  if (existing) {
    return existing;
  }
  return repository.save(
    repository.create({ ...data, downloadCount: 0, isActive: true }),
  );
}

async function clearDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.getRepository(ShareLink).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Note).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Permission).createQueryBuilder().delete().execute();
  await dataSource.getRepository(GroupMember).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Group).createQueryBuilder().delete().execute();
  await dataSource.getRepository(File).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Folder).createQueryBuilder().update(Folder).set({ parentId: null }).execute();
  await dataSource.getRepository(Folder).createQueryBuilder().delete().execute();
  await dataSource.getRepository(User).createQueryBuilder().delete().execute();
}

async function main(): Promise<void> {
  console.log('Connecting to database...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'fileshare',
    entities: [
      User,
      Folder,
      File,
      Note,
      Group,
      GroupMember,
      Permission,
      ShareLink,
    ],
    synchronize: false,
  });

  await dataSource.initialize();

  const s3Client = new S3Client({
    region: process.env.S3_REGION ?? 'us-east-1',
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'minioadmin',
    },
    forcePathStyle: true,
  });

  const bucket = process.env.S3_BUCKET ?? 'fileshare';

  try {
    console.log('Clearing database...');
    await clearDatabase(dataSource);

    console.log('Ensuring S3 bucket exists...');
    await ensureBucket(s3Client, bucket);

    const userRepository = dataSource.getRepository(User);
    const folderRepository = dataSource.getRepository(Folder);
    const fileRepository = dataSource.getRepository(File);
    const noteRepository = dataSource.getRepository(Note);
    const groupRepository = dataSource.getRepository(Group);
    const groupMemberRepository = dataSource.getRepository(GroupMember);
    const permissionRepository = dataSource.getRepository(Permission);
    const shareLinkRepository = dataSource.getRepository(ShareLink);

    console.log('Seeding users...');
    await upsertUser(userRepository, {
      id: ID.users.admin,
      email: 'admin@fileshare.pro',
      password: 'Admin1234!',
      name: 'Administrator',
      username: 'admin',
      role: UserRole.ADMIN,
      bio: 'Platform administrator.',
    });
    await upsertUser(userRepository, {
      id: ID.users.alice,
      email: 'alice@fileshare.pro',
      password: 'Alice1234!',
      name: 'Alice Ivanova',
      username: 'alice',
      role: UserRole.USER,
      bio: 'Backend engineer, loves clean code.',
    });
    await upsertUser(userRepository, {
      id: ID.users.bob,
      email: 'bob@fileshare.pro',
      password: 'Bob1234!',
      name: 'Bob Petrov',
      username: 'bob',
      role: UserRole.USER,
      bio: 'Marketing lead, data-driven.',
    });
    await upsertUser(userRepository, {
      id: ID.users.carol,
      email: 'carol@fileshare.pro',
      password: 'Carol1234!',
      name: 'Carol Sidorova',
      username: 'carol',
      role: UserRole.USER,
      bio: 'Designer & brand manager.',
    });

    console.log('Seeding folders...');
    const aliceProjectsPath = `/${ID.folders.aliceProjects}`;
    const bobMarketingPath = `/${ID.folders.bobMarketing}`;

    await upsertFolder(folderRepository, {
      id: ID.folders.aliceProjects,
      name: 'Projects',
      parentId: null,
      ownerId: ID.users.alice,
      path: aliceProjectsPath,
    });
    await upsertFolder(folderRepository, {
      id: ID.folders.aliceBackend,
      name: 'Backend',
      parentId: ID.folders.aliceProjects,
      ownerId: ID.users.alice,
      path: `${aliceProjectsPath}/${ID.folders.aliceBackend}`,
    });
    await upsertFolder(folderRepository, {
      id: ID.folders.aliceFrontend,
      name: 'Frontend',
      parentId: ID.folders.aliceProjects,
      ownerId: ID.users.alice,
      path: `${aliceProjectsPath}/${ID.folders.aliceFrontend}`,
    });
    await upsertFolder(folderRepository, {
      id: ID.folders.alicePersonal,
      name: 'Personal',
      parentId: null,
      ownerId: ID.users.alice,
      path: `/${ID.folders.alicePersonal}`,
    });
    await upsertFolder(folderRepository, {
      id: ID.folders.bobMarketing,
      name: 'Marketing',
      parentId: null,
      ownerId: ID.users.bob,
      path: bobMarketingPath,
    });
    await upsertFolder(folderRepository, {
      id: ID.folders.bobCampaigns,
      name: 'Campaigns',
      parentId: ID.folders.bobMarketing,
      ownerId: ID.users.bob,
      path: `${bobMarketingPath}/${ID.folders.bobCampaigns}`,
    });
    await upsertFolder(folderRepository, {
      id: ID.folders.bobDesign,
      name: 'Design',
      parentId: null,
      ownerId: ID.users.bob,
      path: `/${ID.folders.bobDesign}`,
    });

    console.log('Seeding files and uploading to S3...');
    await upsertFile(fileRepository, s3Client, bucket, {
      id: ID.files.apiOverview,
      name: 'api-overview.txt',
      folderId: ID.folders.aliceBackend,
      uploadedById: ID.users.alice,
    });
    await upsertFile(fileRepository, s3Client, bucket, {
      id: ID.files.databaseSchema,
      name: 'database-schema.txt',
      folderId: ID.folders.aliceBackend,
      uploadedById: ID.users.alice,
    });
    await upsertFile(fileRepository, s3Client, bucket, {
      id: ID.files.componentGuide,
      name: 'component-guide.txt',
      folderId: ID.folders.aliceFrontend,
      uploadedById: ID.users.alice,
    });
    await upsertFile(fileRepository, s3Client, bucket, {
      id: ID.files.diary,
      name: 'diary.txt',
      folderId: ID.folders.alicePersonal,
      uploadedById: ID.users.alice,
    });
    await upsertFile(fileRepository, s3Client, bucket, {
      id: ID.files.q3Results,
      name: 'q3-results.txt',
      folderId: ID.folders.bobMarketing,
      uploadedById: ID.users.bob,
    });
    await upsertFile(fileRepository, s3Client, bucket, {
      id: ID.files.summerCampaign,
      name: 'summer-campaign.txt',
      folderId: ID.folders.bobCampaigns,
      uploadedById: ID.users.bob,
    });
    await upsertFile(fileRepository, s3Client, bucket, {
      id: ID.files.brandGuidelines,
      name: 'brand-guidelines.txt',
      folderId: ID.folders.bobDesign,
      uploadedById: ID.users.bob,
    });

    console.log('Seeding groups...');
    await upsertGroup(groupRepository, {
      id: ID.groups.engineering,
      name: 'Engineering',
      description: 'Backend & frontend engineers.',
      ownerId: ID.users.alice,
    });
    await upsertGroup(groupRepository, {
      id: ID.groups.marketing,
      name: 'Marketing',
      description: 'Marketing and brand team.',
      ownerId: ID.users.bob,
    });

    await upsertGroupMember(groupMemberRepository, {
      id: ID.groupMembers.engAlice,
      groupId: ID.groups.engineering,
      userId: ID.users.alice,
      role: GroupMemberRole.OWNER,
    });
    await upsertGroupMember(groupMemberRepository, {
      id: ID.groupMembers.engBob,
      groupId: ID.groups.engineering,
      userId: ID.users.bob,
      role: GroupMemberRole.ADMIN,
    });
    await upsertGroupMember(groupMemberRepository, {
      id: ID.groupMembers.engCarol,
      groupId: ID.groups.engineering,
      userId: ID.users.carol,
      role: GroupMemberRole.MEMBER,
    });
    await upsertGroupMember(groupMemberRepository, {
      id: ID.groupMembers.mktBob,
      groupId: ID.groups.marketing,
      userId: ID.users.bob,
      role: GroupMemberRole.OWNER,
    });
    await upsertGroupMember(groupMemberRepository, {
      id: ID.groupMembers.mktCarol,
      groupId: ID.groups.marketing,
      userId: ID.users.carol,
      role: GroupMemberRole.ADMIN,
    });

    console.log('Seeding permissions...');
    await upsertPermission(permissionRepository, {
      id: ID.permissions.bobEditBackend,
      subjectType: SubjectType.USER,
      subjectId: ID.users.bob,
      resourceType: ResourceType.FOLDER,
      resourceId: ID.folders.aliceBackend,
      permission: PermissionLevel.EDIT,
    });
    await upsertPermission(permissionRepository, {
      id: ID.permissions.engCommentProjects,
      subjectType: SubjectType.GROUP,
      subjectId: ID.groups.engineering,
      resourceType: ResourceType.FOLDER,
      resourceId: ID.folders.aliceProjects,
      permission: PermissionLevel.COMMENT,
    });
    await upsertPermission(permissionRepository, {
      id: ID.permissions.aliceViewMarketing,
      subjectType: SubjectType.USER,
      subjectId: ID.users.alice,
      resourceType: ResourceType.FOLDER,
      resourceId: ID.folders.bobMarketing,
      permission: PermissionLevel.VIEW,
    });
    await upsertPermission(permissionRepository, {
      id: ID.permissions.carolViewPersonal,
      subjectType: SubjectType.USER,
      subjectId: ID.users.carol,
      resourceType: ResourceType.FOLDER,
      resourceId: ID.folders.alicePersonal,
      permission: PermissionLevel.VIEW,
    });

    console.log('Seeding notes...');
    await upsertNote(noteRepository, {
      id: ID.notes.aliceOnApi,
      fileId: ID.files.apiOverview,
      authorId: ID.users.alice,
      content:
        'First draft of the API overview. @bob please review the auth section, and @carol check if the rate limiting policy makes sense.',
      mentions: ['bob', 'carol'],
    });
    await upsertNote(noteRepository, {
      id: ID.notes.bobOnApi,
      fileId: ID.files.apiOverview,
      authorId: ID.users.bob,
      content:
        "@alice looks solid! I'd suggest adding retry logic examples in the rate limiting section. @carol FYI — the 100 req/min limit applies per IP.",
      mentions: ['alice', 'carol'],
    });
    await upsertNote(noteRepository, {
      id: ID.notes.bobOnQ3,
      fileId: ID.files.q3Results,
      authorId: ID.users.bob,
      content:
        'Q3 numbers are in. @alice @carol please review before we share with stakeholders. Especially check the revenue projection on page 3.',
      mentions: ['alice', 'carol'],
    });
    await upsertNote(noteRepository, {
      id: ID.notes.carolOnQ3,
      fileId: ID.files.q3Results,
      authorId: ID.users.carol,
      content:
        'Numbers verified. Great quarter @bob! Revenue is up 23% YoY. Sharing the summary with the broader team.',
      mentions: ['bob'],
    });
    await upsertNote(noteRepository, {
      id: ID.notes.carolOnBrand,
      fileId: ID.files.brandGuidelines,
      authorId: ID.users.carol,
      content:
        "@bob I've updated the colour palette and typography sections to v2.1. Please approve so we can send assets to the print vendor.",
      mentions: ['bob'],
    });

    console.log('Seeding share links...');
    await upsertShareLink(shareLinkRepository, {
      token: ID.shareLinks.apiPublic,
      fileId: ID.files.apiOverview,
      createdById: ID.users.alice,
      expiresAt: new Date(Date.now() + SEVEN_DAYS_SECONDS * 1000),
      passwordHash: null,
      maxDownloads: null,
    });
    const q3PasswordHash = await bcrypt.hash('qwerty123', BCRYPT_SALT_ROUNDS);
    await upsertShareLink(shareLinkRepository, {
      token: ID.shareLinks.q3Protected,
      fileId: ID.files.q3Results,
      createdById: ID.users.bob,
      expiresAt: null,
      passwordHash: q3PasswordHash,
      maxDownloads: 50,
    });

    console.log('');
    console.log('Seed completed successfully!');
    console.log('');
    console.log('Users:');
    console.log('  admin@fileshare.pro  / Admin1234!  (admin)');
    console.log('  alice@fileshare.pro  / Alice1234!  (user)');
    console.log('  bob@fileshare.pro    / Bob1234!    (user)');
    console.log('  carol@fileshare.pro  / Carol1234!  (user)');
    console.log('');
    console.log('Share links:');
    console.log(
      `  Public (api-overview.txt, 7d TTL): GET /share-links/${ID.shareLinks.apiPublic}`,
    );
    console.log(
      `  Protected (q3-results.txt, password: qwerty123): GET /share-links/${ID.shareLinks.q3Protected}?password=qwerty123`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
