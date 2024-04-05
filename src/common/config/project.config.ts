import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

const YAML_CONFIG_FILENAME = 'config.yaml';

export function projectConfig() {
  return yaml.load(
    readFileSync(join('src', YAML_CONFIG_FILENAME), 'utf8'),
  ) as Record<string, any>;
}
