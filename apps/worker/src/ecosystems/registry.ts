import type { EcosystemStrategy } from './strategy';

const strategies = new Map<string, EcosystemStrategy>();

export function registerStrategy(strategy: EcosystemStrategy): void {
  if (strategies.has(strategy.platform)) {
    throw new Error(
      `Strategy already registered for platform "${strategy.platform}"`
    );
  }

  strategies.set(strategy.platform, strategy);
}

export function getStrategy(platform: string): EcosystemStrategy | undefined {
  return strategies.get(platform);
}

export function getSupportedPlatforms(): string[] {
  return [...strategies.keys()];
}

export function clearRegistry(): void {
  strategies.clear();
}
