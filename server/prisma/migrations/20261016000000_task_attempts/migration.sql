-- CreateTable
CREATE TABLE "TaskAttempt" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "worker" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'RUNNING',
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "TaskAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskAttempt_startedAt_idx" ON "TaskAttempt"("startedAt");

-- CreateIndex
CREATE INDEX "TaskAttempt_taskId_idx" ON "TaskAttempt"("taskId");

-- AddForeignKey
ALTER TABLE "TaskAttempt" ADD CONSTRAINT "TaskAttempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
