import type { EcosystemStrategy } from './strategy';

/**
 * Lightweight registry check to verify a package exists before
 * triggering a full pipeline run. Uses HEAD requests where possible
 * to minimize bandwidth.
 */
export async function checkPackageExists(
  strategy: EcosystemStrategy,
  packageName: string
): Promise<boolean> {
  const checker = REGISTRY_CHECKS[strategy.platform];

  if (!checker) {
    // Unknown platform — skip the guard and let the pipeline decide
    return true;
  }

  try {
    return await checker(packageName);
  } catch {
    // Network error — be permissive, let the pipeline run
    return true;
  }
}

const REGISTRY_CHECKS: Record<
  string,
  (packageName: string) => Promise<boolean>
> = {
  npm: async (packageName) => {
    const res = await fetch(`https://registry.npmjs.org/${packageName}`, {
      method: 'HEAD',
    });
    return res.ok;
  },

  pypi: async (packageName) => {
    const res = await fetch(`https://pypi.org/pypi/${packageName}/json`, {
      method: 'HEAD',
    });
    return res.ok;
  },

  cargo: async (packageName) => {
    const res = await fetch(`https://crates.io/api/v1/crates/${packageName}`, {
      method: 'HEAD',
      headers: { 'User-Agent': 'usedby.dev' },
    });
    return res.ok;
  },

  composer: async (packageName) => {
    const [vendor, pkg] = packageName.split('/');
    const res = await fetch(
      `https://repo.packagist.org/p2/${vendor}/${pkg}.json`,
      { method: 'HEAD' }
    );
    return res.ok;
  },

  rubygems: async (packageName) => {
    const res = await fetch(
      `https://rubygems.org/api/v1/gems/${packageName}.json`,
      { method: 'HEAD' }
    );
    return res.ok;
  },

  go: async (packageName) => {
    const res = await fetch(
      `https://proxy.golang.org/github.com/${packageName}/@v/list`
    );
    return res.ok;
  },
};
