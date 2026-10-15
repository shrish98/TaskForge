export interface JobContext {
  taskId: string;
  userId: string;
  payload: Record<string, any>;
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
