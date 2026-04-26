-- CreateTable
CREATE TABLE "GuziItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "officialPrice" DOUBLE PRECISION,
    "purchasePrice" DOUBLE PRECISION,
    "marketPrice" DOUBLE PRECISION,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuziItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRecord" (
    "id" TEXT NOT NULL,
    "guziId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "officialPrice" DOUBLE PRECISION,
    "purchasePrice" DOUBLE PRECISION,
    "marketPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpatialNode" (
    "id" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "parentId" TEXT,
    "guziId" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpatialNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Showcase" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "nodes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Showcase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceRecord_guziId_idx" ON "PriceRecord"("guziId");

-- CreateIndex
CREATE INDEX "SpatialNode_parentId_idx" ON "SpatialNode"("parentId");

-- CreateIndex
CREATE INDEX "SpatialNode_guziId_idx" ON "SpatialNode"("guziId");

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_guziId_fkey" FOREIGN KEY ("guziId") REFERENCES "GuziItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
