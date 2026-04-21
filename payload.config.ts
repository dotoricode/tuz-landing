import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { Users } from "./payload/collections/Users.ts";
import { Media } from "./payload/collections/Media.ts";
import { Notices } from "./payload/collections/Notices.ts";
import { MenuItems } from "./payload/collections/MenuItems.ts";
import { TodayPicks } from "./payload/collections/TodayPicks.ts";
import { Winners } from "./payload/collections/Winners.ts";
import { Gallery } from "./payload/collections/Gallery.ts";
import { Faqs } from "./payload/collections/Faqs.ts";

import { Settings } from "./payload/globals/Settings.ts";
import { StoreHours } from "./payload/globals/StoreHours.ts";
import { Location } from "./payload/globals/Location.ts";
import { AboutStory } from "./payload/globals/AboutStory.ts";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const useS3 =
  Boolean(process.env.S3_BUCKET) &&
  Boolean(process.env.S3_ENDPOINT) &&
  Boolean(process.env.S3_ACCESS_KEY) &&
  Boolean(process.env.S3_SECRET_KEY);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: dirname },
    meta: {
      titleSuffix: " — Tuz Admin",
    },
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? "dev-secret-change-me",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    schemaName: "payload",
    pool: {
      connectionString: process.env.DATABASE_URI ?? "",
    },
  }),
  sharp,
  collections: [Users, Media, Notices, MenuItems, TodayPicks, Winners, Gallery, Faqs],
  globals: [Settings, StoreHours, Location, AboutStory],
  localization: {
    locales: [
      { label: "한국어", code: "ko" },
      { label: "English", code: "en" },
    ],
    defaultLocale: "ko",
    fallback: true,
  },
  plugins: useS3
    ? [
        s3Storage({
          collections: { media: true },
          bucket: process.env.S3_BUCKET!,
          config: {
            endpoint: process.env.S3_ENDPOINT,
            region: process.env.S3_REGION ?? "auto",
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY!,
              secretAccessKey: process.env.S3_SECRET_KEY!,
            },
            forcePathStyle: true,
          },
        }),
      ]
    : [],
  cors: [process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"].filter(Boolean),
});
