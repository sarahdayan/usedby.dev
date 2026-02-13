export interface PipelineMessage {
  platform: string;
  packageName: string;
  enqueuedAt: string;
}

export function isPipelineMessage(value: unknown): value is PipelineMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PipelineMessage).platform === 'string' &&
    typeof (value as PipelineMessage).packageName === 'string'
  );
}
