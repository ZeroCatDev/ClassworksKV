-- AlterTable
CREATE SEQUENCE device_id_seq;
ALTER TABLE "Device" ALTER COLUMN "id" SET DEFAULT nextval('device_id_seq');
ALTER SEQUENCE device_id_seq OWNED BY "Device"."id";
