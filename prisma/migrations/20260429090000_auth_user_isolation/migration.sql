CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "openId" TEXT NOT NULL,
    "nickname" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_provider_openId_key" ON "User"("provider", "openId");

INSERT INTO "User" ("id", "provider", "openId", "nickname", "createdAt", "updatedAt")
VALUES ('local-user', 'dev', 'dev-guest', '开发访客', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "GuziItem" ADD COLUMN "ownerId" TEXT NOT NULL DEFAULT 'local-user';
CREATE INDEX "GuziItem_ownerId_idx" ON "GuziItem"("ownerId");
