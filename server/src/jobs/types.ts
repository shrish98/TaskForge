export interface JobContext {
  taskId: string;
  userId: string;
  payload: Record<string, any>;
  /** Aborted when the job runs past its time limit. Pass it to anything that can be cancelled. */
  signal: AbortSignal;
  /** Records progress on the BullMQ job, in the database and on the user's socket. */
  progress(percent: number, message?: string): Promise<void>;
}

export interface JobArtifact {
  fileName: string;
  mimeType: string;
  data: Buffer;
}

export interface JobOutcome {
  output: Record<string, unknown>;
  message: string;
  artifact?: JobArtifact;
}

export type JobHandler = (ctx: JobContext) => Promise<JobOutcome>;
