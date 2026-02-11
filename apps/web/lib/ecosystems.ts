export interface Ecosystem {
  id: string;
  label: string;
  example: string;
  repo: string;
  placeholder: string;
  packageNamePattern: RegExp;
  registryUrlPattern: RegExp;
}

export const ECOSYSTEMS: Ecosystem[] = [
  {
    id: 'npm',
    label: 'npm',
    example: 'dinero.js',
    repo: 'dinerojs/dinero.js',
    placeholder: 'e.g. react, @scope/package',
    packageNamePattern: /^(@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+$/,
    registryUrlPattern: /^https?:\/\/(?:www\.)?npmjs\.com\/package\/(.+)$/,
  },
  {
    id: 'rubygems',
    label: 'RubyGems',
    example: 'rails',
    repo: 'rails/rails',
    placeholder: 'e.g. rails, devise',
    packageNamePattern: /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    registryUrlPattern: /^https?:\/\/(?:www\.)?rubygems\.org\/gems\/([^/]+)$/,
  },
  {
    id: 'pypi',
    label: 'PyPI',
    example: 'requests',
    repo: 'psf/requests',
    placeholder: 'e.g. requests, django',
    packageNamePattern: /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/,
    registryUrlPattern: /^https?:\/\/(?:www\.)?pypi\.org\/project\/([^/]+)\/?$/,
  },
  {
    id: 'cargo',
    label: 'Cargo',
    example: 'serde',
    repo: 'serde-rs/serde',
    placeholder: 'e.g. serde, tokio',
    packageNamePattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
    registryUrlPattern: /^https?:\/\/(?:www\.)?crates\.io\/crates\/([^/]+)$/,
  },
  {
    id: 'composer',
    label: 'Composer',
    example: 'laravel/framework',
    repo: 'laravel/framework',
    placeholder: 'e.g. laravel/framework',
    packageNamePattern:
      /^[a-z0-9]([a-z0-9_.-]*[a-z0-9])?\/[a-z0-9]([a-z0-9_.-]*[a-z0-9])?$/,
    registryUrlPattern:
      /^https?:\/\/(?:www\.)?packagist\.org\/packages\/([^/]+\/[^/]+)$/,
  },
  {
    id: 'go',
    label: 'Go',
    example: 'gin-gonic/gin',
    repo: 'gin-gonic/gin',
    placeholder: 'e.g. gin-gonic/gin',
    packageNamePattern: /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/,
    registryUrlPattern: /^(?:https?:\/\/)?github\.com\/([^/]+\/[^/]+)$/,
  },
];

export function getEcosystem(id: string): Ecosystem {
  return ECOSYSTEMS.find((e) => e.id === id) ?? ECOSYSTEMS[0]!;
}

export function stripRegistryUrl(ecosystem: Ecosystem, value: string): string {
  const match = value.match(ecosystem.registryUrlPattern);

  return match ? match[1]! : value;
}
