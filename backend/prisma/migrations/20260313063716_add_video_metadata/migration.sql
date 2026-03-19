-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "bitrate" INTEGER,
ADD COLUMN     "codec" TEXT,
ADD COLUMN     "duration" DOUBLE PRECISION,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "width" INTEGER;
