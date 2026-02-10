export interface Ecosystem {
  id: string;
  label: string;
  example: string;
  repo: string;
  placeholder: string;
}

export const ECOSYSTEMS: Ecosystem[] = [
  {
    id: 'npm',
    label: 'npm',
    example: 'dinero.js',
    repo: 'dinerojs/dinero.js',
    placeholder: 'e.g. react, @scope/package',
  },
  {
    id: 'rubygems',
    label: 'RubyGems',
    example: 'rails',
    repo: 'rails/rails',
    placeholder: 'e.g. rails, devise',
  },
  {
    id: 'pypi',
    label: 'PyPI',
    example: 'requests',
    repo: 'psf/requests',
    placeholder: 'e.g. requests, django',
  },
  {
    id: 'cargo',
    label: 'Cargo',
    example: 'serde',
    repo: 'serde-rs/serde',
    placeholder: 'e.g. serde, tokio',
  },
  {
    id: 'composer',
    label: 'Composer',
    example: 'laravel/framework',
    repo: 'laravel/framework',
    placeholder: 'e.g. laravel/framework',
  },
];

export function getEcosystem(id: string): Ecosystem {
  return ECOSYSTEMS.find((e) => e.id === id) ?? ECOSYSTEMS[0]!;
}
