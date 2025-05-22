/*
  Warnings:

  - The primary key for the `mesa` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `reserva` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `data` on the `reserva` table. All the data in the column will be lost.
  - You are about to drop the column `hora` on the `reserva` table. All the data in the column will be lost.
  - Added the required column `dataHoraFim` to the `Reserva` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dataHoraInicio` to the `Reserva` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Reserva` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `reserva` DROP FOREIGN KEY `Reserva_mesaId_fkey`;

-- DropIndex
DROP INDEX `Reserva_mesaId_fkey` ON `reserva`;

-- AlterTable
ALTER TABLE `mesa` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `reserva` DROP PRIMARY KEY,
    DROP COLUMN `data`,
    DROP COLUMN `hora`,
    ADD COLUMN `dataHoraFim` DATETIME(3) NOT NULL,
    ADD COLUMN `dataHoraInicio` DATETIME(3) NOT NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'confirmada',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `mesaId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `Reserva` ADD CONSTRAINT `Reserva_mesaId_fkey` FOREIGN KEY (`mesaId`) REFERENCES `Mesa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
